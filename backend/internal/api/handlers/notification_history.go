package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/mt-monitoring/api/internal/database"
	"github.com/mt-monitoring/api/internal/models"
)

// NotificationHistoryHandler handles notification history endpoints
type NotificationHistoryHandler struct {
	repo *database.NotificationHistoryRepository
}

// NewNotificationHistoryHandler creates a new handler
func NewNotificationHistoryHandler() *NotificationHistoryHandler {
	return &NotificationHistoryHandler{
		repo: database.NewNotificationHistoryRepository(),
	}
}

// GetAll returns paginated notification history
// GET /notification-history?channel_id=xxx&alert_type=xxx&status=xxx&from=xxx&to=xxx&limit=50&offset=0
func (h *NotificationHistoryHandler) GetAll(c *fiber.Ctx) error {
	filter := &models.NotificationHistoryFilter{}

	// Parse query parameters
	if channelID := c.Query("channel_id"); channelID != "" {
		filter.ChannelID = &channelID
	}
	if alertType := c.Query("alert_type"); alertType != "" {
		filter.AlertType = &alertType
	}
	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}
	if fromStr := c.Query("from"); fromStr != "" {
		if from, err := time.Parse(time.RFC3339, fromStr); err == nil {
			filter.FromDate = &from
		}
	}
	if toStr := c.Query("to"); toStr != "" {
		if to, err := time.Parse(time.RFC3339, toStr); err == nil {
			filter.ToDate = &to
		}
	}

	// Parse pagination
	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}
	filter.Limit = limit

	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}
	filter.Offset = offset

	// Get history
	histories, err := h.repo.GetAll(filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch notification history",
		})
	}

	// Get total count
	total, err := h.repo.GetCount(filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to count notifications",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"items":  histories,
			"total":  total,
			"limit":  limit,
			"offset": offset,
		},
	})
}

// GetByID returns a single notification history by ID
// GET /notification-history/:id
func (h *NotificationHistoryHandler) GetByID(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"error":   "Invalid ID",
		})
	}

	history, err := h.repo.GetByID(id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch notification",
		})
	}

	if history == nil {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"error":   "Notification not found",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    history,
	})
}

// GetStats returns aggregated statistics
// GET /notification-history/stats?days=7
func (h *NotificationHistoryHandler) GetStats(c *fiber.Ctx) error {
	days := 7
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}

	stats, err := h.repo.GetStats(days)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch statistics",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}

// Cleanup deletes old notification history
// DELETE /notification-history/cleanup?days=30
func (h *NotificationHistoryHandler) Cleanup(c *fiber.Ctx) error {
	days := 30
	if daysStr := c.Query("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			days = d
		}
	}

	deleted, err := h.repo.DeleteOlderThan(days)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to cleanup history",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"deleted": deleted,
		},
	})
}
