package alerter

import (
	"time"

	"github.com/mt-monitoring/api/internal/models"
)

// AlertProvider defines the interface for sending notifications
type AlertProvider interface {
	Send(notification Notification) error
}

// Alert types
const (
	AlertTypeHealthCheck = "healthcheck"
	AlertTypeLog         = "log"
	AlertTypeResource    = "resource"
	AlertTypeEndpoint    = "endpoint"
	AlertTypeSystem      = "system"
)

// Notification represents an alert notification
type Notification struct {
	RuleID      string // alert rule ID that triggered this notification (empty for non-rule alerts)
	ServiceID   string
	ServiceName string
	Status      models.ServiceStatus // "healthy" | "unhealthy"
	Message     string
	Time        time.Time

	// Log alert fields
	AlertType string // "healthcheck" | "log" | "resource" | "endpoint"
	LogLevel  string // "error" | "warn"
	Metadata  map[string]interface{}

	// Resource alert fields
	HostID    string
	HostName  string
	Metric    string  // "cpu" | "memory" | "disk" | "http_status" | "response_time"
	Value     float64
	Threshold float64
	Severity  string // "critical" | "warning" | "info"

	// Endpoint alert fields
	StatusCode int // HTTP status code (endpoint rules)
}
