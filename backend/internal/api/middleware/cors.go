package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// CORS returns CORS middleware configuration.
// allowOrigins: comma-separated list of allowed origins (e.g. "https://app.example.com").
// Pass "*" or empty string to allow all origins (development default).
func CORS(allowOrigins string) fiber.Handler {
	if allowOrigins == "" {
		allowOrigins = "*"
	}
	return cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Requested-With",
		AllowCredentials: false,
		ExposeHeaders:    "Content-Length,Content-Type",
		MaxAge:           86400, // 24 hours
	})
}
