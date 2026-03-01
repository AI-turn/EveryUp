package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/mt-monitoring/api/internal/alerter"
	"github.com/mt-monitoring/api/internal/config"
	"github.com/mt-monitoring/api/internal/database"
	"github.com/mt-monitoring/api/internal/models"
)

const maxMessageBytes = 10 * 1024  // 10 KB
const maxMetadataBytes = 50 * 1024 // 50 KB
const maxBatchSize = 100

// LogIngestHandler handles external log ingestion via API key
type LogIngestHandler struct {
	logRepo      *database.LogRepository
	alertManager *alerter.Manager
}

// NewLogIngestHandler creates a new log ingest handler
func NewLogIngestHandler() *LogIngestHandler {
	return &LogIngestHandler{
		logRepo:      database.NewLogRepository(),
		alertManager: alerter.NewManager(),
	}
}

// getAllowedLevels returns the configured allowed log levels
func getAllowedLevels() map[models.LogLevel]bool {
	cfg := config.Get()
	allowed := make(map[models.LogLevel]bool)
	if cfg != nil && len(cfg.System.Logging.AllowedLevels) > 0 {
		for _, l := range cfg.System.Logging.AllowedLevels {
			allowed[models.LogLevel(strings.ToLower(l))] = true
		}
	} else {
		// Default: error and warn only
		allowed[models.LogLevelError] = true
		allowed[models.LogLevelWarn] = true
	}
	return allowed
}

// Ingest receives logs from external services authenticated by API key.
// Auto-detects format from various logging libraries:
//   - MT native:    { "level":"error", "message":"..." } or { "logs":[...] }
//   - Winston:      { "level":"error", "message":"...", "timestamp":"..." }
//   - Serilog:      { "events":[{ "@t":"...", "@mt":"...", "@l":"Error" }] }
//   - Logstash:     { "@timestamp":"...", "level":"ERROR", "message":"..." }
//   - Python dict:  { "levelname":"ERROR", "msg":"..." }
//   - Form-encoded: levelname=ERROR&msg=... (Python HTTPHandler)
func (h *LogIngestHandler) Ingest(c *fiber.Ctx) error {
	service, ok := c.Locals("service").(*models.Service)
	if !ok || service == nil {
		return c.Status(401).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "UNAUTHORIZED",
				"message": "Service not found in context",
			},
		})
	}

	contentType := strings.ToLower(c.Get("Content-Type"))
	body := c.Body()

	var entries []models.LogIngestEntry

	if strings.Contains(contentType, "application/x-www-form-urlencoded") {
		// Python HTTPHandler sends form-encoded data
		entry, err := normalizeFormEncoded(string(body))
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "INVALID_REQUEST",
					"message": "Failed to parse form data: " + err.Error(),
				},
			})
		}
		entries = []models.LogIngestEntry{entry}
	} else {
		// JSON body — auto-detect format
		var err error
		entries, err = normalizeRawLogs(body)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "INVALID_REQUEST",
					"message": "Invalid request body: " + err.Error(),
				},
			})
		}
	}

	if len(entries) == 0 {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": "No log entries found in request body",
			},
		})
	}

	if len(entries) > maxBatchSize {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": fmt.Sprintf("batch size exceeds maximum of %d logs", maxBatchSize),
			},
		})
	}

	// Determine source from X-MT-Source header
	source := models.LogSourceExternal
	if c.Get("X-MT-Source") == "agent" {
		source = models.LogSourceAgent
	}

	// Single log — return single response
	if len(entries) == 1 {
		logEntry, err := h.processEntry(service, &entries[0], source)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "VALIDATION_ERROR",
					"message": err.Error(),
				},
			})
		}

		if err := h.logRepo.Create(logEntry); err != nil {
			log.Printf("Failed to create log entry: %v", err)
			return c.Status(500).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "DATABASE_ERROR",
					"message": "Failed to store log entry",
				},
			})
		}

		h.triggerAlertIfNeeded(service, logEntry, entries[0].Metadata)

		return c.Status(201).JSON(fiber.Map{
			"success": true,
			"data": fiber.Map{
				"id":          logEntry.ID,
				"fingerprint": logEntry.Fingerprint,
			},
		})
	}

	// Batch — process all entries
	return h.ingestBatch(c, service, entries, source)
}

// ingestBatch processes a batch of log entries
func (h *LogIngestHandler) ingestBatch(c *fiber.Ctx, service *models.Service, logs []models.LogIngestEntry, source string) error {
	processed := 0
	errors := 0

	for i := range logs {
		logEntry, err := h.processEntry(service, &logs[i], source)
		if err != nil {
			log.Printf("Batch log #%d validation failed: %v", i, err)
			errors++
			continue
		}

		if err := h.logRepo.Create(logEntry); err != nil {
			log.Printf("Batch log #%d DB failed: %v", i, err)
			errors++
			continue
		}

		h.triggerAlertIfNeeded(service, logEntry, logs[i].Metadata)
		processed++
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"processed": processed,
			"errors":    errors,
			"total":     len(logs),
		},
	})
}

// processEntry validates and converts a single log entry
func (h *LogIngestHandler) processEntry(service *models.Service, entry *models.LogIngestEntry, source string) (*models.Log, error) {
	if entry.Message == "" {
		return nil, fmt.Errorf("message is required")
	}

	if len(entry.Message) > maxMessageBytes {
		return nil, fmt.Errorf("message exceeds maximum size of 10 KB")
	}

	// Default level to error if not specified
	if entry.Level == "" {
		entry.Level = models.LogLevelError
	}

	// Validate against allowed levels
	allowed := getAllowedLevels()
	if !allowed[entry.Level] {
		keys := make([]string, 0, len(allowed))
		for k := range allowed {
			keys = append(keys, string(k))
		}
		return nil, fmt.Errorf("level '%s' is not allowed. Allowed levels: %s", entry.Level, strings.Join(keys, ", "))
	}

	// Generate fingerprint
	fingerprint := alerter.GenerateFingerprint(service.ID, string(entry.Level), entry.Message)

	// Marshal metadata
	var metadataJSON json.RawMessage
	if entry.Metadata != nil {
		data, err := json.Marshal(entry.Metadata)
		if err != nil {
			return nil, fmt.Errorf("invalid metadata format")
		}
		if len(data) > maxMetadataBytes {
			return nil, fmt.Errorf("metadata exceeds maximum size of 50 KB")
		}
		metadataJSON = data
	}

	return &models.Log{
		ServiceID:   service.ID,
		Level:       entry.Level,
		Message:     entry.Message,
		Metadata:    metadataJSON,
		Source:      source,
		Fingerprint: fingerprint,
		CreatedAt:   time.Now(),
	}, nil
}

// triggerAlertIfNeeded dispatches alert for error/warn level logs
func (h *LogIngestHandler) triggerAlertIfNeeded(service *models.Service, logEntry *models.Log, metadata map[string]interface{}) {
	if logEntry.Level == models.LogLevelError || logEntry.Level == models.LogLevelWarn {
		go h.alertManager.DispatchLogAlert(
			service.ID,
			service.Name,
			string(logEntry.Level),
			logEntry.Message,
			metadata,
		)
	}
}

// normalizeFormEncoded handles Python HTTPHandler's form-encoded format
// Fields: levelname, msg, name, pathname, lineno, funcName, etc.
func normalizeFormEncoded(body string) (models.LogIngestEntry, error) {
	values, err := url.ParseQuery(body)
	if err != nil {
		return models.LogIngestEntry{}, err
	}

	entry := models.LogIngestEntry{
		Metadata: make(map[string]interface{}),
	}

	// Message
	if msg := values.Get("msg"); msg != "" {
		entry.Message = msg
	} else if msg := values.Get("message"); msg != "" {
		entry.Message = msg
	}

	// Level
	if lvl := values.Get("levelname"); lvl != "" {
		entry.Level = mapGenericLevel(lvl)
	} else if lvl := values.Get("level"); lvl != "" {
		entry.Level = mapGenericLevel(lvl)
	} else {
		entry.Level = models.LogLevelError
	}

	// Collect useful Python fields as metadata
	pyFields := []string{"name", "pathname", "lineno", "funcName", "exc_text", "process", "thread", "created"}
	for _, f := range pyFields {
		if v := values.Get(f); v != "" {
			entry.Metadata[f] = v
		}
	}

	if len(entry.Metadata) == 0 {
		entry.Metadata = nil
	}
	return entry, nil
}
