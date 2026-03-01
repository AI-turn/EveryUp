package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/mt-monitoring/api/internal/database"
	"github.com/mt-monitoring/api/internal/models"
)

// DashboardHandler handles dashboard-related requests
type DashboardHandler struct {
	serviceRepo  *database.ServiceRepository
	metricRepo   *database.MetricRepository
	incidentRepo *database.IncidentRepository
}

// NewDashboardHandler creates a new dashboard handler
func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{
		serviceRepo:  database.NewServiceRepository(),
		metricRepo:   database.NewMetricRepository(),
		incidentRepo: database.NewIncidentRepository(),
	}
}

// GetSummary returns dashboard KPI summary
func (h *DashboardHandler) GetSummary(c *fiber.Ctx) error {
	services, err := h.serviceRepo.GetAll()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error": fiber.Map{
				"code":    "DATABASE_ERROR",
				"message": err.Error(),
			},
		})
	}

	summary := models.DashboardSummary{
		TotalServices: len(services),
	}

	var totalResponseTime float64
	var totalUptime float64
	validMetrics := 0

	for _, service := range services {
		// Get metrics summary for last 24h
		metricSummary, err := h.metricRepo.GetSummary(service.ID, 24*time.Hour)
		if err == nil && metricSummary.TotalChecks > 0 {
			// Determine health from actual check results (service.Status from GetAll is always unknown)
			if metricSummary.SuccessfulChecks > 0 {
				summary.HealthyServices++
			} else {
				summary.UnhealthyServices++
			}
			totalResponseTime += metricSummary.AvgResponseTime
			totalUptime += metricSummary.Uptime
			validMetrics++
		}
	}

	if validMetrics > 0 {
		summary.AvgResponseTime = totalResponseTime / float64(validMetrics)
		summary.OverallUptime = totalUptime / float64(validMetrics)
	}

	// Get active incidents count
	incidents, _ := h.incidentRepo.GetActive()
	summary.CriticalAlerts = len(incidents)
	// When exactly one incident is active, surface its service ID so the
	// frontend can navigate directly to that service's detail page.
	if len(incidents) == 1 {
		summary.CriticalServiceID = incidents[0].ServiceID
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    summary,
	})
}

// GetTimeline returns recent events timeline
func (h *DashboardHandler) GetTimeline(c *fiber.Ctx) error {
	limit := 20

	events, err := h.incidentRepo.GetTimeline(limit)
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
		"data":    events,
	})
}

// GetIncidents returns all incidents
func (h *DashboardHandler) GetIncidents(c *fiber.Ctx) error {
	incidents, err := h.incidentRepo.GetActive()
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
		"data":    incidents,
	})
}
