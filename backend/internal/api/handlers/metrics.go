package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/mt-monitoring/api/internal/database"
)

// MetricHandler handles metric-related requests
type MetricHandler struct {
	repo        *database.MetricRepository
	serviceRepo *database.ServiceRepository
}

// NewMetricHandler creates a new metric handler
func NewMetricHandler() *MetricHandler {
	return &MetricHandler{
		repo:        database.NewMetricRepository(),
		serviceRepo: database.NewServiceRepository(),
	}
}

// GetByServiceID returns metrics for a specific service
func (h *MetricHandler) GetByServiceID(c *fiber.Ctx) error {
	serviceID := c.Params("id")

	// Check if service exists
	service, err := h.serviceRepo.GetByID(serviceID)
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

	// Get limit from query params
	limit := 100
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	metrics, err := h.repo.GetByServiceID(serviceID, limit)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    metrics,
	})
}

// GetSummary returns metric summary for a service
func (h *MetricHandler) GetSummary(c *fiber.Ctx) error {
	serviceID := c.Params("id")

	// Get duration from query params (default 24h)
	duration := 24 * time.Hour
	if d := c.Query("duration"); d != "" {
		switch d {
		case "1h":
			duration = time.Hour
		case "6h":
			duration = 6 * time.Hour
		case "24h":
			duration = 24 * time.Hour
		case "7d":
			duration = 7 * 24 * time.Hour
		case "30d":
			duration = 30 * 24 * time.Hour
		}
	}

	summary, err := h.repo.GetSummary(serviceID, duration)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    summary,
	})
}

// GetUptime returns uptime data for calendar view
func (h *MetricHandler) GetUptime(c *fiber.Ctx) error {
	serviceID := c.Params("id")

	// Get days from query params (default 30)
	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	data, err := h.repo.GetUptimeData(serviceID, days)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	// Transform to frontend expected format
	var totalUptime float64
	uptimeDays := make([]fiber.Map, 0, len(data))

	for _, d := range data {
		totalUptime += d.Uptime

		// Determine status based on uptime percentage
		status := "up"
		if d.Uptime < 50 {
			status = "down"
		} else if d.Uptime < 100 {
			status = "partial"
		}

		uptimeDays = append(uptimeDays, fiber.Map{
			"date":   d.Date,
			"status": status,
			"uptime": d.Uptime,
		})
	}

	// Calculate overall percentage
	percentage := 100.0
	if len(data) > 0 {
		percentage = totalUptime / float64(len(data))
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"percentage": percentage,
			"days":       uptimeDays,
		},
	})
}
