package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/url"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/aiturn/everyup/internal/alerter"
	"github.com/aiturn/everyup/internal/database"
	"github.com/aiturn/everyup/internal/models"
)

// errLogFiltered is returned by processEntry when the log level is filtered out by the service config.
var errLogFiltered = errors.New("log level filtered")

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
		if errors.Is(err, errLogFiltered) {
			// Level filtered out — acknowledge silently so agents don't retry
			return c.Status(200).JSON(fiber.Map{
				"success": true,
				"data":    fiber.Map{"filtered": true},
			})
		}
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
	filtered := 0
	errs := 0

	for i := range logs {
		logEntry, err := h.processEntry(service, &logs[i], source)
		if errors.Is(err, errLogFiltered) {
			filtered++
			continue
		}
		if err != nil {
			log.Printf("Batch log #%d validation failed: %v", i, err)
			errs++
			continue
		}

		if err := h.logRepo.Create(logEntry); err != nil {
			log.Printf("Batch log #%d DB failed: %v", i, err)
			errs++
			continue
		}

		h.triggerAlertIfNeeded(service, logEntry, logs[i].Metadata)
		processed++
	}

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"processed": processed,
			"filtered":  filtered,
			"errors":    errs,
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

	// Apply per-service log level filter. Empty filter = accept all levels.
	if len(service.LogLevelFilter) > 0 {
		allowed := make(map[models.LogLevel]bool, len(service.LogLevelFilter))
		for _, l := range service.LogLevelFilter {
			allowed[l] = true
		}
		if !allowed[entry.Level] {
			return nil, errLogFiltered
		}
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

// normalizeRawLogs detects the format of the incoming JSON body and converts it
// into a slice of LogIngestEntry. Supported formats:
//
//   - JSON array:  [{ "level":"error", "message":"..." }, ...] (Fluent Bit)
//   - MT native:   { "level":"error", "message":"..." } or { "logs":[...] }
//   - Winston:     { "level":"error", "message":"...", "timestamp":"..." }
//   - Serilog:     { "events":[{ "@t":"...", "@mt":"...", "@l":"Error" }] }
//   - Logstash:    { "@timestamp":"...", "level":"ERROR", "message":"..." }
//   - Python dict: { "levelname":"ERROR", "msg":"...", "name":"root" }
func normalizeRawLogs(body []byte) ([]models.LogIngestEntry, error) {
	// Try JSON array first (Fluent Bit HTTP output sends bare arrays)
	body = bytes.TrimSpace(body)
	if len(body) > 0 && body[0] == '[' {
		var arr []interface{}
		if err := json.Unmarshal(body, &arr); err == nil {
			return normalizeNativeArray(arr), nil
		}
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}

	// 1) Serilog batch — has "events" array
	if events, ok := raw["events"]; ok {
		if arr, ok := events.([]interface{}); ok {
			return normalizeSerilogEvents(arr), nil
		}
	}

	// 2) MT native batch — has "logs" array
	if logs, ok := raw["logs"]; ok {
		if arr, ok := logs.([]interface{}); ok {
			return normalizeNativeArray(arr), nil
		}
	}

	// 3) Single log — detect format
	entry := normalizeSingleRaw(raw)
	if entry.Message != "" {
		return []models.LogIngestEntry{entry}, nil
	}

	// Fallback: treat entire body as message
	return []models.LogIngestEntry{{
		Level:   models.LogLevelError,
		Message: string(body),
	}}, nil
}

// normalizeSerilogEvents converts Serilog Compact JSON / Default JSON events
func normalizeSerilogEvents(events []interface{}) []models.LogIngestEntry {
	entries := make([]models.LogIngestEntry, 0, len(events))
	for _, ev := range events {
		obj, ok := ev.(map[string]interface{})
		if !ok {
			continue
		}
		entry := normalizeSerilogEvent(obj)
		if entry.Message != "" {
			entries = append(entries, entry)
		}
	}
	return entries
}

func normalizeSerilogEvent(obj map[string]interface{}) models.LogIngestEntry {
	entry := models.LogIngestEntry{
		Metadata: make(map[string]interface{}),
	}

	// Message: @mt (message template) or RenderedMessage or MessageTemplate
	if mt, ok := getString(obj, "@mt"); ok {
		entry.Message = mt
	} else if rm, ok := getString(obj, "RenderedMessage"); ok {
		entry.Message = rm
	} else if mt2, ok := getString(obj, "MessageTemplate"); ok {
		entry.Message = mt2
	}

	// Level: @l or Level
	if l, ok := getString(obj, "@l"); ok {
		entry.Level = mapSerilogLevel(l)
	} else if l2, ok := getString(obj, "Level"); ok {
		entry.Level = mapSerilogLevel(l2)
	} else {
		entry.Level = models.LogLevelInfo // Serilog omits @l when Information
	}

	// Exception: @x or Exception
	if x, ok := getString(obj, "@x"); ok {
		entry.Metadata["exception"] = x
	} else if x2, ok := getString(obj, "Exception"); ok {
		entry.Metadata["exception"] = x2
	}

	// Timestamp: @t or Timestamp → metadata
	if t, ok := getString(obj, "@t"); ok {
		entry.Metadata["originalTimestamp"] = t
	} else if t2, ok := getString(obj, "Timestamp"); ok {
		entry.Metadata["originalTimestamp"] = t2
	}

	// Properties (Default JSON format)
	if props, ok := obj["Properties"].(map[string]interface{}); ok {
		for k, v := range props {
			entry.Metadata[k] = v
		}
	}

	// Remaining fields as metadata (Compact JSON — props are at top level)
	for k, v := range obj {
		switch k {
		case "@t", "@mt", "@l", "@x", "@i", "@r",
			"Timestamp", "Level", "MessageTemplate", "RenderedMessage",
			"Exception", "Properties":
			continue
		default:
			entry.Metadata[k] = v
		}
	}

	if len(entry.Metadata) == 0 {
		entry.Metadata = nil
	}
	return entry
}

// mapSerilogLevel converts Serilog level names to our LogLevel
func mapSerilogLevel(level string) models.LogLevel {
	switch strings.ToLower(level) {
	case "fatal", "error":
		return models.LogLevelError
	case "warning":
		return models.LogLevelWarn
	case "information", "debug", "verbose":
		return models.LogLevelInfo
	default:
		return models.LogLevel(strings.ToLower(level))
	}
}

// normalizeNativeArray converts our native { "logs": [...] } format
func normalizeNativeArray(arr []interface{}) []models.LogIngestEntry {
	entries := make([]models.LogIngestEntry, 0, len(arr))
	for _, item := range arr {
		obj, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		entry := normalizeSingleRaw(obj)
		if entry.Message != "" {
			entries = append(entries, entry)
		}
	}
	return entries
}

// normalizeSingleRaw auto-detects a single log object format
func normalizeSingleRaw(obj map[string]interface{}) models.LogIngestEntry {
	// Serilog single event (has @mt or @t)
	if _, ok := obj["@mt"]; ok {
		return normalizeSerilogEvent(obj)
	}
	if _, ok := obj["@t"]; ok {
		return normalizeSerilogEvent(obj)
	}

	// Python HTTPHandler format (has "levelname" + "msg")
	if _, ok := obj["levelname"]; ok {
		return normalizePythonLog(obj)
	}

	// Logstash/Logback format (has "@timestamp" or "logger_name")
	if _, ok := obj["@timestamp"]; ok {
		return normalizeLogstashLog(obj)
	}
	if _, ok := obj["logger_name"]; ok {
		return normalizeLogstashLog(obj)
	}

	// Winston / MT native format (has "level" + "message")
	return normalizeWinstonLog(obj)
}

// normalizeWinstonLog handles Winston and MT native format
// Winston sends: { level, message, timestamp, ...extraMetadata }
func normalizeWinstonLog(obj map[string]interface{}) models.LogIngestEntry {
	entry := models.LogIngestEntry{}

	if msg, ok := getString(obj, "message"); ok {
		entry.Message = msg
	}
	if lvl, ok := getString(obj, "level"); ok {
		entry.Level = mapGenericLevel(lvl)
	}

	// Collect remaining fields as metadata
	meta := make(map[string]interface{})
	for k, v := range obj {
		switch k {
		case "level", "message", "logs":
			continue
		default:
			meta[k] = v
		}
	}

	// If there's a nested "metadata" object, merge it
	if nested, ok := obj["metadata"].(map[string]interface{}); ok {
		delete(meta, "metadata")
		for k, v := range nested {
			meta[k] = v
		}
	}

	if len(meta) > 0 {
		entry.Metadata = meta
	}
	return entry
}

// normalizePythonLog handles Python logging HTTPHandler / dict format
// Fields: levelname, msg, name, pathname, lineno, funcName, exc_text, etc.
func normalizePythonLog(obj map[string]interface{}) models.LogIngestEntry {
	entry := models.LogIngestEntry{
		Metadata: make(map[string]interface{}),
	}

	if msg, ok := getString(obj, "msg"); ok {
		entry.Message = msg
	} else if msg2, ok := getString(obj, "message"); ok {
		entry.Message = msg2
	}

	if lvl, ok := getString(obj, "levelname"); ok {
		entry.Level = mapGenericLevel(lvl)
	} else if lvl2, ok := getString(obj, "level"); ok {
		entry.Level = mapGenericLevel(lvl2)
	}

	// Map useful Python fields
	pyFields := []string{"name", "pathname", "lineno", "funcName", "exc_text", "exc_info", "stack_info", "created", "process", "thread"}
	for _, f := range pyFields {
		if v, ok := obj[f]; ok {
			entry.Metadata[f] = v
		}
	}

	if len(entry.Metadata) == 0 {
		entry.Metadata = nil
	}
	return entry
}

// normalizeLogstashLog handles Logstash/Logback encoder format
// Fields: @timestamp, level, message, logger_name, thread_name, stack_trace, etc.
func normalizeLogstashLog(obj map[string]interface{}) models.LogIngestEntry {
	entry := models.LogIngestEntry{
		Metadata: make(map[string]interface{}),
	}

	if msg, ok := getString(obj, "message"); ok {
		entry.Message = msg
	}
	if lvl, ok := getString(obj, "level"); ok {
		entry.Level = mapGenericLevel(lvl)
	}

	// Map useful Logstash fields
	for k, v := range obj {
		switch k {
		case "level", "message":
			continue
		case "@timestamp":
			entry.Metadata["originalTimestamp"] = v
		case "stack_trace":
			entry.Metadata["exception"] = v
		default:
			entry.Metadata[k] = v
		}
	}

	if len(entry.Metadata) == 0 {
		entry.Metadata = nil
	}
	return entry
}

// mapGenericLevel normalizes common level strings to our LogLevel
func mapGenericLevel(level string) models.LogLevel {
	switch strings.ToUpper(level) {
	case "FATAL", "CRITICAL", "ERROR", "ERR":
		return models.LogLevelError
	case "WARN", "WARNING":
		return models.LogLevelWarn
	case "INFO", "INFORMATION", "DEBUG", "TRACE", "VERBOSE":
		return models.LogLevelInfo
	default:
		return models.LogLevel(strings.ToLower(level))
	}
}

// getString safely extracts a string value from a map
func getString(obj map[string]interface{}, key string) (string, bool) {
	v, ok := obj[key]
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok
}
