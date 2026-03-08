package middleware

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// CORS returns CORS middleware configuration.
// allowOrigins: comma-separated list of allowed origins (e.g. "https://app.example.com").
// In production mode, wildcard "*" is rejected to prevent cross-origin abuse.
func CORS(allowOrigins string, mode string) fiber.Handler {
	if allowOrigins == "" || allowOrigins == "*" {
		if mode == "production" {
			log.Fatalf("[SECURITY] CORS wildcard '*' is not allowed in production mode. " +
				"Set MT_SERVER_ALLOWORIGINS to your frontend domain (e.g. https://app.example.com).")
		}
		allowOrigins = "*"
	}
	// AllowCredentials requires a specific origin (not wildcard).
	// httpOnly cookies won't be sent cross-origin unless this is true + origin is explicit.
	allowCredentials := allowOrigins != "*"
	return cors.New(cors.Config{
		AllowOrigins:     allowOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Requested-With",
		AllowCredentials: allowCredentials,
		ExposeHeaders:    "Content-Length,Content-Type",
		MaxAge:           86400, // 24 hours
	})
}
