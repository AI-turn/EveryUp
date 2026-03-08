package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

// internalError logs the full error server-side and returns a generic message to the client.
// This prevents leaking internal details (DB structure, file paths, SQL errors) to API consumers.
func internalError(c *fiber.Ctx, code string, err error) error {
	log.Printf("[ERROR] %s: %v", code, err)
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"success": false,
		"error": fiber.Map{
			"code":    code,
			"message": genericMessage(code),
		},
	})
}

// genericMessage returns a user-safe message for the given error code.
func genericMessage(code string) string {
	switch code {
	case "DB_ERROR", "DATABASE_ERROR":
		return "A database error occurred"
	case "FETCH_ERROR":
		return "Failed to fetch the requested resource"
	case "CREATE_ERROR":
		return "Failed to create the resource"
	case "UPDATE_ERROR":
		return "Failed to update the resource"
	case "DELETE_ERROR":
		return "Failed to delete the resource"
	case "TOGGLE_ERROR":
		return "Failed to toggle the resource state"
	case "SECRET_ERROR":
		return "A security operation failed"
	case "HASH_ERROR":
		return "Failed to process credentials"
	case "TOKEN_ERROR":
		return "Failed to generate authentication token"
	case "SEND_ERROR":
		return "Failed to send the notification"
	case "QUERY_ERROR":
		return "Failed to query data"
	default:
		return "An internal error occurred"
	}
}
