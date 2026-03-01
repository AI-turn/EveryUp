package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/mt-monitoring/api/internal/crypto"
)

// JWTAuth validates the JWT from the Authorization: Bearer <token> header.
// On success, stores parsed claims in c.Locals("claims").
func JWTAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var tokenStr string

		auth := c.Get("Authorization")
		if strings.HasPrefix(auth, "Bearer ") {
			tokenStr = auth[7:]
		}

		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "UNAUTHORIZED",
					"message": "Missing or invalid authorization token",
				},
			})
		}

		claims, err := crypto.VerifyToken(tokenStr)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "UNAUTHORIZED",
					"message": "Token is expired or invalid",
				},
			})
		}

		c.Locals("claims", claims) // *crypto.UserClaims
		return c.Next()
	}
}
