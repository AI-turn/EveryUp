package handlers

import (
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/aiturn/everyup/internal/api/middleware"
	"github.com/aiturn/everyup/internal/checker"
	"github.com/aiturn/everyup/internal/crypto"
	"github.com/aiturn/everyup/internal/database"
	"github.com/aiturn/everyup/internal/models"
)

// ServiceHandler handles service-related requests
type ServiceHandler struct {
	repo       *database.ServiceRepository
	metricRepo *database.MetricRepository
	scheduler  *checker.Scheduler
}

// NewServiceHandler creates a new service handler
func NewServiceHandler(scheduler *checker.Scheduler) *ServiceHandler {
	return &ServiceHandler{
		repo:       database.NewServiceRepository(),
		metricRepo: database.NewMetricRepository(),
		scheduler:  scheduler,
	}
}

// GetAll returns all services, optionally filtered by ?type=http,tcp
func (h *ServiceHandler) GetAll(c *fiber.Ctx) error {
	var typeFilter []string
	if typeParam := c.Query("type"); typeParam != "" {
		typeFilter = strings.Split(typeParam, ",")
	}

	services, err := h.repo.GetAll(typeFilter...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	// Enrich with metrics and compute status
	for i := range services {
		// Get latest metric for status
		metrics, _ := h.metricRepo.GetByServiceID(services[i].ID, 1)
		if len(metrics) > 0 {
			if metrics[0].Status == "success" {
				services[i].Status = models.StatusHealthy
			} else {
				services[i].Status = models.StatusUnhealthy
			}
			services[i].LastCheckAt = &metrics[0].CheckedAt
		} else {
			services[i].Status = models.StatusUnknown
		}

		// Get summary for uptime and response time
		summary, _ := h.metricRepo.GetSummary(services[i].ID, 24*time.Hour)
		if summary != nil {
			services[i].Uptime = summary.Uptime
			services[i].ResponseTime = int(summary.AvgResponseTime)
		}
	}

	// Clear hash from response — frontend uses apiKeyMasked instead
	for i := range services {
		services[i].ApiKey = ""
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    services,
	})
}

// GetByID returns a service by ID
func (h *ServiceHandler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")

	service, err := h.repo.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	if service == nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "SERVICE_NOT_FOUND",
				"message": "Service not found",
			},
		})
	}

	// Get latest metric for status
	metrics, _ := h.metricRepo.GetByServiceID(service.ID, 1)
	if len(metrics) > 0 {
		if metrics[0].Status == "success" {
			service.Status = models.StatusHealthy
		} else {
			service.Status = models.StatusUnhealthy
		}
		service.LastCheckAt = &metrics[0].CheckedAt
	} else {
		service.Status = models.StatusUnknown
	}

	// Enrich with metrics summary
	summary, _ := h.metricRepo.GetSummary(service.ID, 24*time.Hour)
	if summary != nil {
		service.Uptime = summary.Uptime
		service.ResponseTime = int(summary.AvgResponseTime)
	}

	// Clear hash from response — frontend uses apiKeyMasked instead
	service.ApiKey = ""

	return c.JSON(fiber.Map{
		"success": true,
		"data":    service,
	})
}

// Create creates a new service
func (h *ServiceHandler) Create(c *fiber.Ctx) error {
	var req models.ServiceCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "INVALID_REQUEST",
				"message": err.Error(),
			},
		})
	}

	// Validate required fields
	if req.ID == "" || req.Name == "" || req.Type == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": "id, name, and type are required",
			},
		})
	}

	// Log type services don't require URL/Host — they only receive SDK metrics
	if req.Type == models.ServiceTypeLog {
		// No URL/Host validation needed
	} else if req.Type == models.ServiceTypeHTTP && req.URL == "" {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": "url is required for HTTP services",
			},
		})
	}
	if req.Type == models.ServiceTypeTCP && (req.URL == "" && req.Host == "") {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": "host or url is required for TCP services",
			},
		})
	}
	if req.Type == models.ServiceTypeICMP && (req.URL == "" && req.Host == "") {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "VALIDATION_ERROR",
				"message": "host or url is required for ICMP services",
			},
		})
	}

	// Check if service already exists
	existing, _ := h.repo.GetByID(req.ID)
	if existing != nil {
		return c.Status(409).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "SERVICE_EXISTS",
				"message": "Service with this ID already exists",
			},
		})
	}

	service := req.ToService()
	plainKey := crypto.GenerateApiKey()
	service.ApiKey = plainKey                        // repo.Create will hash this
	service.ApiKeyMasked = crypto.MaskApiKey(plainKey)

	if err := h.repo.Create(service); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	// Register in API key cache
	middleware.PutApiKeyCache(crypto.HashApiKey(plainKey), service)

	// Add to scheduler (skip for log-only services — they don't need health checks)
	if service.Type != models.ServiceTypeLog {
		h.scheduler.AddService(service)
	}

	// Return plaintext key only in creation response (one-time)
	service.ApiKey = plainKey

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"data":    service,
	})
}

// Update updates a service
func (h *ServiceHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")

	service, err := h.repo.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	if service == nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "SERVICE_NOT_FOUND",
				"message": "Service not found",
			},
		})
	}

	var req models.ServiceCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "INVALID_REQUEST",
				"message": err.Error(),
			},
		})
	}

	// Update fields if provided
	if req.Name != "" {
		service.Name = req.Name
	}
	if req.Type != "" {
		service.Type = req.Type
	}
	if req.IsActive != nil {
		service.IsActive = *req.IsActive
	}
	if req.URL != "" {
		service.URL = req.URL
	}
	if req.Host != "" && service.URL == "" {
		service.URL = req.Host
	}
	if req.Port != 0 {
		service.Port = req.Port
	}
	if req.Method != "" {
		service.Method = req.Method
	}
	if req.Headers != nil {
		service.Headers = req.Headers
	}
	if req.Body != "" {
		service.Body = req.Body
	}
	if req.ExpectedStatus != 0 {
		service.ExpectedStatus = req.ExpectedStatus
	}
	if req.Interval != 0 {
		service.Interval = req.Interval
	}
	if req.Timeout != 0 {
		service.Timeout = req.Timeout
	}
	if req.Tags != nil {
		service.Tags = req.Tags
	}

	if err := h.repo.Update(service); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	// Update in scheduler
	h.scheduler.UpdateService(service)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    service,
	})
}

// Delete deletes a service
func (h *ServiceHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")

	service, err := h.repo.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	if service == nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "SERVICE_NOT_FOUND",
				"message": "Service not found",
			},
		})
	}

	// Invalidate API key cache before deleting
	if service.ApiKey != "" {
		middleware.InvalidateApiKeyCache(service.ApiKey)
	}

	if err := h.repo.Delete(id); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	// Remove from scheduler
	h.scheduler.RemoveService(id)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Service deleted successfully",
	})
}

// Pause pauses monitoring for a service
func (h *ServiceHandler) Pause(c *fiber.Ctx) error {
	id := c.Params("id")

	service, err := h.repo.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	if service == nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "SERVICE_NOT_FOUND",
				"message": "Service not found",
			},
		})
	}

	if err := h.repo.SetActive(id, false); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	// Update scheduler (will remove the entry)
	service.IsActive = false
	h.scheduler.UpdateService(service)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Service monitoring paused",
	})
}

// Resume resumes monitoring for a service
func (h *ServiceHandler) Resume(c *fiber.Ctx) error {
	id := c.Params("id")

	service, err := h.repo.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	if service == nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "SERVICE_NOT_FOUND",
				"message": "Service not found",
			},
		})
	}

	if err := h.repo.SetActive(id, true); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	// Update scheduler (will add the entry)
	service.IsActive = true
	h.scheduler.UpdateService(service)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Service monitoring resumed",
	})
}

// RegenerateKey generates a new API key for a service
func (h *ServiceHandler) RegenerateKey(c *fiber.Ctx) error {
	id := c.Params("id")

	service, err := h.repo.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	if service == nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "SERVICE_NOT_FOUND",
				"message": "Service not found",
			},
		})
	}

	// Invalidate old cache entry (service.ApiKey contains the old hash from DB)
	if service.ApiKey != "" {
		middleware.InvalidateApiKeyCache(service.ApiKey)
	}

	newKey := crypto.GenerateApiKey()
	newHash := crypto.HashApiKey(newKey)
	newMasked := crypto.MaskApiKey(newKey)

	if err := h.repo.UpdateApiKey(id, newHash, newMasked); err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": "Failed to regenerate API key",
			},
		})
	}

	// Register new cache entry
	middleware.PutApiKeyCache(newHash, service)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"apiKey":       newKey,
			"apiKeyMasked": newMasked,
		},
	})
}
