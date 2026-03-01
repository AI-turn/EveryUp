package checker

import (
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/aiturn/everyup/internal/alerter"
	"github.com/aiturn/everyup/internal/config"
	"github.com/aiturn/everyup/internal/database"
	"github.com/aiturn/everyup/internal/models"
	"github.com/robfig/cron/v3"
)

// Scheduler manages periodic health checks
type Scheduler struct {
	cron         *cron.Cron
	entries      map[string]cron.EntryID
	httpChecker  *HTTPChecker
	tcpChecker   *TCPChecker
	serviceRepo  *database.ServiceRepository
	metricRepo   *database.MetricRepository
	incidentRepo *database.IncidentRepository
	logRepo      *database.LogRepository

	// Track consecutive failures
	failureCounts map[string]int
	mu            sync.Mutex

	// Service rule evaluator for endpoint alert rules
	serviceEvaluator *alerter.ServiceRuleEvaluator

	// Broadcast function for WebSocket
	broadcast func(interface{})
}

// NewScheduler creates a new scheduler
func NewScheduler() *Scheduler {
	return &Scheduler{
		cron:          cron.New(cron.WithSeconds()),
		entries:       make(map[string]cron.EntryID),
		httpChecker:   NewHTTPChecker(),
		tcpChecker:    NewTCPChecker(),
		serviceRepo:   database.NewServiceRepository(),
		metricRepo:    database.NewMetricRepository(),
		incidentRepo:  database.NewIncidentRepository(),
		logRepo:       database.NewLogRepository(),
		failureCounts: make(map[string]int),
	}
}

// SetServiceEvaluator sets the evaluator for endpoint-based alert rules
func (s *Scheduler) SetServiceEvaluator(e *alerter.ServiceRuleEvaluator) {
	s.serviceEvaluator = e
}

// SetBroadcast sets the broadcast function for WebSocket notifications
func (s *Scheduler) SetBroadcast(fn func(interface{})) {
	s.broadcast = fn
}

// Start starts the scheduler with configured services
func (s *Scheduler) Start(services []config.ServiceConfig) error {
	// Sync services to database
	if err := s.syncServices(services); err != nil {
		return err
	}

	// Schedule checks for each service from DB
	allServices, err := s.serviceRepo.GetAll()
	if err != nil {
		return err
	}

	for _, svc := range allServices {
		if svc.IsActive {
			service := svc // Create local copy
			s.AddService(&service)
		}
	}

	// Schedule cleanup job (run daily at midnight)
	s.cron.AddFunc("0 0 0 * * *", s.cleanup)

	s.cron.Start()
	log.Printf("Scheduler started with %d services", len(allServices))

	return nil
}

// AddService adds a service to the scheduler
func (s *Scheduler) AddService(svc *models.Service) {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Remove existing if any
	if entryID, ok := s.entries[svc.ID]; ok {
		s.cron.Remove(entryID)
	}

	if !svc.IsActive {
		return
	}

	var spec string
	var scheduleDesc string

	// Determine schedule specification based on type
	if svc.ScheduleType == models.ScheduleTypeCron && svc.CronExpression != "" {
		// Use cron expression
		spec = svc.CronExpression
		scheduleDesc = fmt.Sprintf("cron: %s", svc.CronExpression)
	} else {
		// Default to interval-based scheduling
		spec = fmt.Sprintf("@every %ds", svc.Interval)
		scheduleDesc = fmt.Sprintf("interval: %ds", svc.Interval)
	}

	entryID, err := s.cron.AddFunc(spec, func() {
		s.checkService(svc)
	})

	if err != nil {
		log.Printf("Failed to schedule service %s: %v", svc.ID, err)
		return
	}

	s.entries[svc.ID] = entryID
	log.Printf("Scheduled service %s (%s)", svc.ID, scheduleDesc)

	// Run initial check immediately in a goroutine
	go s.checkService(svc)
}

// RemoveService removes a service from the scheduler
func (s *Scheduler) RemoveService(serviceID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if entryID, ok := s.entries[serviceID]; ok {
		s.cron.Remove(entryID)
		delete(s.entries, serviceID)
		log.Printf("Removed service %s from scheduler", serviceID)
	}
}

// UpdateService updates a service in the scheduler
func (s *Scheduler) UpdateService(svc *models.Service) {
	// AddService handles updates by removing existing entry
	s.AddService(svc)
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	s.cron.Stop()
	log.Println("Scheduler stopped")
}

// syncServices syncs configured services to database
func (s *Scheduler) syncServices(services []config.ServiceConfig) error {
	for _, svc := range services {
		existing, err := s.serviceRepo.GetByID(svc.ID)
		if err != nil {
			return err
		}

		req := &models.ServiceCreateRequest{
			ID:             svc.ID,
			Name:           svc.Name,
			Type:           models.ServiceType(svc.Type),
			URL:            svc.URL,
			Method:         svc.Method,
			Host:           svc.Host,
			Port:           svc.Port,
			Headers:        svc.Headers,
			ExpectedStatus: svc.ExpectedStatus,
			Timeout:        svc.Timeout,
			Interval:       svc.Interval,
			Tags:           svc.Tags,
		}

		service := req.ToService()

		if existing == nil {
			if err := s.serviceRepo.Create(service); err != nil {
				log.Printf("Failed to create service %s: %v", svc.ID, err)
			}
		} else {
			// Update existing service fields
			existing.Name = service.Name
			existing.Type = service.Type
			existing.URL = service.URL
			existing.Port = service.Port
			existing.Method = service.Method
			existing.Headers = service.Headers
			existing.ExpectedStatus = service.ExpectedStatus
			existing.Interval = service.Interval
			existing.Timeout = service.Timeout
			existing.Tags = service.Tags
			if err := s.serviceRepo.Update(existing); err != nil {
				log.Printf("Failed to update service %s: %v", svc.ID, err)
			}
		}
	}
	return nil
}

// checkService performs a health check for a service
func (s *Scheduler) checkService(svc *models.Service) {
	// Re-fetch from DB to ensure we have latest IsActive status
	service, err := s.serviceRepo.GetByID(svc.ID)
	if err != nil {
		log.Printf("Failed to get service %s: %v", svc.ID, err)
		return
	}
	if service == nil || !service.IsActive {
		return
	}

	var result *CheckResult

	switch service.Type {
	case models.ServiceTypeHTTP:
		result = s.httpChecker.Check(service.GetHTTPConfig())
	case models.ServiceTypeTCP:
		result = s.tcpChecker.Check(service.GetTCPConfig())
	default:
		log.Printf("Unknown service type: %s", service.Type)
		return
	}

	// Save metric
	metric := result.ToMetric(service.ID)
	if err := s.metricRepo.Create(metric); err != nil {
		log.Printf("Failed to save metric for %s: %v", service.ID, err)
	}

	// Evaluate endpoint alert rules
	if s.serviceEvaluator != nil {
		s.serviceEvaluator.Evaluate(service.ID, service.Name, result.StatusCode, result.ResponseTime)
	}

	// Determine status for incident handling and broadcast
	var status models.ServiceStatus
	if result.Status == models.CheckStatusSuccess {
		status = models.StatusHealthy
		s.handleRecovery(service.ID)
	} else {
		status = models.StatusUnhealthy
		s.handleFailure(service.ID, result.ErrorMessage)
	}

	// Broadcast update
	if s.broadcast != nil {
		s.broadcast(map[string]interface{}{
			"type": "metric",
			"data": map[string]interface{}{
				"serviceId":    service.ID,
				"status":       string(status),
				"responseTime": result.ResponseTime,
				"checkedAt":    result.CheckedAt,
			},
		})
	}
}

// handleFailure handles service failure
func (s *Scheduler) handleFailure(serviceID, errorMessage string) {
	s.mu.Lock()
	s.failureCounts[serviceID]++
	count := s.failureCounts[serviceID]
	s.mu.Unlock()

	cfg := config.Get()
	threshold := 3
	if cfg != nil && cfg.Alerts.ConsecutiveFailures > 0 {
		threshold = cfg.Alerts.ConsecutiveFailures
	}

	// Create incident after consecutive failures
	if count == threshold {
		incident := &models.Incident{
			ServiceID: serviceID,
			Type:      models.IncidentTypeDown,
			Message:   errorMessage,
			StartedAt: time.Now(),
		}
		if err := s.incidentRepo.Create(incident); err != nil {
			log.Printf("Failed to create incident for %s: %v", serviceID, err)
		}

		// Log error
		logEntry := &models.Log{
			ServiceID: serviceID,
			Level:     models.LogLevelError,
			Message:   fmt.Sprintf("Service down: %s", errorMessage),
			CreatedAt: time.Now(),
		}
		s.logRepo.Create(logEntry)

		// Broadcast incident
		if s.broadcast != nil {
			s.broadcast(map[string]interface{}{
				"type": "incident",
				"data": incident,
			})
		}

		log.Printf("Incident created for service %s: %s", serviceID, errorMessage)
	}
}

// handleRecovery handles service recovery
func (s *Scheduler) handleRecovery(serviceID string) {
	s.mu.Lock()
	previousCount := s.failureCounts[serviceID]
	s.failureCounts[serviceID] = 0
	s.mu.Unlock()

	cfg := config.Get()
	threshold := 3
	if cfg != nil && cfg.Alerts.ConsecutiveFailures > 0 {
		threshold = cfg.Alerts.ConsecutiveFailures
	}

	// Resolve incident if there was one
	if previousCount >= threshold {
		if err := s.incidentRepo.Resolve(serviceID); err != nil {
			log.Printf("Failed to resolve incident for %s: %v", serviceID, err)
		}

		// Log recovery
		logEntry := &models.Log{
			ServiceID: serviceID,
			Level:     models.LogLevelInfo,
			Message:   "Service recovered",
			CreatedAt: time.Now(),
		}
		s.logRepo.Create(logEntry)

		log.Printf("Service %s recovered", serviceID)
	}
}

// cleanup removes old data based on retention settings
func (s *Scheduler) cleanup() {
	cfg := config.Get()
	if cfg == nil {
		return
	}

	// Delete old metrics
	metricRetention := config.GetRetentionDuration(cfg.Retention.Metrics)
	if deleted, err := s.metricRepo.DeleteOld(metricRetention); err == nil {
		log.Printf("Cleaned up %d old metrics", deleted)
	}

	// Delete old logs
	logRetention := config.GetRetentionDuration(cfg.Retention.Logs)
	if deleted, err := s.logRepo.DeleteOld(logRetention); err == nil {
		log.Printf("Cleaned up %d old logs", deleted)
	}

	// Delete old system metrics
	if cfg.Retention.SystemMetrics != "" {
		sysRetention := config.GetRetentionDuration(cfg.Retention.SystemMetrics)
		sysRepo := database.NewSystemMetricRepository()
		if deleted, err := sysRepo.DeleteOld(sysRetention); err == nil {
			log.Printf("Cleaned up %d old system metrics", deleted)
		}
	}
}

// CheckNow performs an immediate check for a service
func (s *Scheduler) CheckNow(serviceID string) (*CheckResult, error) {
	service, err := s.serviceRepo.GetByID(serviceID)
	if err != nil {
		return nil, err
	}
	if service == nil {
		return nil, fmt.Errorf("service not found: %s", serviceID)
	}

	s.checkService(service)

	// Return the latest result
	metrics, err := s.metricRepo.GetByServiceID(serviceID, 1)
	if err != nil || len(metrics) == 0 {
		return nil, fmt.Errorf("failed to get check result")
	}

	return &CheckResult{
		Status:       metrics[0].Status,
		ResponseTime: metrics[0].ResponseTime,
		StatusCode:   metrics[0].StatusCode,
		ErrorMessage: metrics[0].ErrorMessage,
		CheckedAt:    metrics[0].CheckedAt,
	}, nil
}

