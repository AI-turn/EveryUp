package database

import (
	"database/sql"
	"encoding/json"
	"strings"
	"time"

	"github.com/aiturn/everyup/internal/crypto"
	"github.com/aiturn/everyup/internal/models"
)

// ServiceRepository handles service data operations
type ServiceRepository struct{}

// NewServiceRepository creates a new service repository
func NewServiceRepository() *ServiceRepository {
	return &ServiceRepository{}
}

// GetAll returns all services, optionally filtered by type.
// Example: GetAll("http", "tcp") returns only http and tcp services.
// Call with no arguments to return all services.
func (r *ServiceRepository) GetAll(typeFilter ...string) ([]models.Service, error) {
	query := `SELECT id, name, type, is_active, url, port, method, headers, body,
		       expected_status, interval, timeout, tags, schedule_type, cron_expression,
		       api_key_masked, created_at, updated_at
		FROM services`

	var args []interface{}
	if len(typeFilter) > 0 {
		placeholders := make([]string, len(typeFilter))
		for i, t := range typeFilter {
			placeholders[i] = "?"
			args = append(args, t)
		}
		query += " WHERE type IN (" + strings.Join(placeholders, ",") + ")"
	}
	query += " ORDER BY name"

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		var isActive int
		var url, method, headers, body, tags, scheduleType, cronExpression sql.NullString
		var port, expectedStatus, interval, timeout sql.NullInt64
		var apiKeyMasked sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &isActive, &url, &port, &method, &headers, &body,
			&expectedStatus, &interval, &timeout, &tags, &scheduleType, &cronExpression,
			&apiKeyMasked, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.IsActive = isActive == 1
		if url.Valid {
			s.URL = url.String
		}
		if port.Valid {
			s.Port = int(port.Int64)
		}
		if method.Valid {
			s.Method = method.String
		}
		if headers.Valid && headers.String != "" {
			json.Unmarshal([]byte(headers.String), &s.Headers)
		}
		if body.Valid {
			s.Body = body.String
		}
		if expectedStatus.Valid {
			s.ExpectedStatus = int(expectedStatus.Int64)
		}
		if interval.Valid {
			s.Interval = int(interval.Int64)
		}
		if timeout.Valid {
			s.Timeout = int(timeout.Int64)
		}
		if tags.Valid && tags.String != "" {
			json.Unmarshal([]byte(tags.String), &s.Tags)
		}
		if scheduleType.Valid {
			s.ScheduleType = models.ScheduleType(scheduleType.String)
		} else {
			s.ScheduleType = models.ScheduleTypeInterval
		}
		if cronExpression.Valid {
			s.CronExpression = cronExpression.String
		}
		if apiKeyMasked.Valid {
			s.ApiKeyMasked = apiKeyMasked.String
		}
		s.Status = models.StatusUnknown
		services = append(services, s)
	}
	return services, nil
}

// GetByID returns a service by ID
func (r *ServiceRepository) GetByID(id string) (*models.Service, error) {
	var s models.Service
	var isActive int
	var url, method, headers, body, tags, scheduleType, cronExpression sql.NullString
	var port, expectedStatus, interval, timeout sql.NullInt64

	var apiKeyHash, apiKeyMasked sql.NullString
	err := DB.QueryRow(`
		SELECT id, name, type, is_active, url, port, method, headers, body,
		       expected_status, interval, timeout, tags, schedule_type, cron_expression,
		       api_key, api_key_masked, created_at, updated_at
		FROM services WHERE id = ?
	`, id).Scan(&s.ID, &s.Name, &s.Type, &isActive, &url, &port, &method, &headers, &body,
		&expectedStatus, &interval, &timeout, &tags, &scheduleType, &cronExpression,
		&apiKeyHash, &apiKeyMasked, &s.CreatedAt, &s.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	s.IsActive = isActive == 1
	if url.Valid {
		s.URL = url.String
	}
	if port.Valid {
		s.Port = int(port.Int64)
	}
	if method.Valid {
		s.Method = method.String
	}
	if headers.Valid && headers.String != "" {
		json.Unmarshal([]byte(headers.String), &s.Headers)
	}
	if body.Valid {
		s.Body = body.String
	}
	if expectedStatus.Valid {
		s.ExpectedStatus = int(expectedStatus.Int64)
	}
	if interval.Valid {
		s.Interval = int(interval.Int64)
	}
	if timeout.Valid {
		s.Timeout = int(timeout.Int64)
	}
	if tags.Valid && tags.String != "" {
		json.Unmarshal([]byte(tags.String), &s.Tags)
	}
	if scheduleType.Valid {
		s.ScheduleType = models.ScheduleType(scheduleType.String)
	} else {
		s.ScheduleType = models.ScheduleTypeInterval
	}
	if cronExpression.Valid {
		s.CronExpression = cronExpression.String
	}
	if apiKeyHash.Valid {
		s.ApiKey = apiKeyHash.String // hash — used internally for cache invalidation
	}
	if apiKeyMasked.Valid {
		s.ApiKeyMasked = apiKeyMasked.String
	}
	s.Status = models.StatusUnknown

	return &s, nil
}

// Create creates a new service
func (r *ServiceRepository) Create(s *models.Service) error {
	var headersJSON, tagsJSON []byte
	var err error

	if s.Headers != nil {
		headersJSON, err = json.Marshal(s.Headers)
		if err != nil {
			return err
		}
	}
	if s.Tags != nil {
		tagsJSON, err = json.Marshal(s.Tags)
		if err != nil {
			return err
		}
	}

	isActive := 0
	if s.IsActive {
		isActive = 1
	}

	// Default to "interval" if not set
	scheduleType := string(s.ScheduleType)
	if scheduleType == "" {
		scheduleType = string(models.ScheduleTypeInterval)
	}

	_, err = DB.Exec(`
		INSERT INTO services (id, name, type, is_active, url, port, method, headers, body,
		                      expected_status, interval, timeout, tags, schedule_type, cron_expression,
		                      api_key, api_key_masked, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, s.ID, s.Name, s.Type, isActive, s.URL, s.Port, s.Method, string(headersJSON), s.Body,
		s.ExpectedStatus, s.Interval, s.Timeout, string(tagsJSON), scheduleType, s.CronExpression,
		crypto.HashApiKey(s.ApiKey), s.ApiKeyMasked, s.CreatedAt, s.UpdatedAt)
	return err
}

// UpdateApiKey updates the api_key (SHA-256 hash) and api_key_masked fields of a service.
func (r *ServiceRepository) UpdateApiKey(id, apiKeyHash, apiKeyMasked string) error {
	_, err := DB.Exec(`UPDATE services SET api_key = ?, api_key_masked = ?, updated_at = ? WHERE id = ?`,
		apiKeyHash, apiKeyMasked, time.Now(), id)
	return err
}

// Update updates a service
func (r *ServiceRepository) Update(s *models.Service) error {
	var headersJSON, tagsJSON []byte
	var err error

	if s.Headers != nil {
		headersJSON, err = json.Marshal(s.Headers)
		if err != nil {
			return err
		}
	}
	if s.Tags != nil {
		tagsJSON, err = json.Marshal(s.Tags)
		if err != nil {
			return err
		}
	}

	isActive := 0
	if s.IsActive {
		isActive = 1
	}

	// Default to "interval" if not set
	scheduleType := string(s.ScheduleType)
	if scheduleType == "" {
		scheduleType = string(models.ScheduleTypeInterval)
	}

	s.UpdatedAt = time.Now()
	_, err = DB.Exec(`
		UPDATE services SET name = ?, type = ?, is_active = ?, url = ?, port = ?, method = ?,
		                    headers = ?, body = ?, expected_status = ?, interval = ?, timeout = ?,
		                    tags = ?, schedule_type = ?, cron_expression = ?, updated_at = ?
		WHERE id = ?
	`, s.Name, s.Type, isActive, s.URL, s.Port, s.Method, string(headersJSON), s.Body,
		s.ExpectedStatus, s.Interval, s.Timeout, string(tagsJSON), scheduleType, s.CronExpression,
		s.UpdatedAt, s.ID)
	return err
}

// GetActive returns all active services (is_active = 1)
func (r *ServiceRepository) GetActive() ([]models.Service, error) {
	rows, err := DB.Query(`
		SELECT id, name, type, is_active, url, port, method, headers, body,
		       expected_status, interval, timeout, tags, schedule_type, cron_expression,
		       created_at, updated_at
		FROM services
		WHERE is_active = 1
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var services []models.Service
	for rows.Next() {
		var s models.Service
		var isActive int
		var url, method, headers, body, tags, scheduleType, cronExpression sql.NullString
		var port, expectedStatus, interval, timeout sql.NullInt64
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &isActive, &url, &port, &method, &headers, &body,
			&expectedStatus, &interval, &timeout, &tags, &scheduleType, &cronExpression,
			&s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.IsActive = isActive == 1
		if url.Valid {
			s.URL = url.String
		}
		if port.Valid {
			s.Port = int(port.Int64)
		}
		if method.Valid {
			s.Method = method.String
		}
		if headers.Valid && headers.String != "" {
			json.Unmarshal([]byte(headers.String), &s.Headers)
		}
		if body.Valid {
			s.Body = body.String
		}
		if expectedStatus.Valid {
			s.ExpectedStatus = int(expectedStatus.Int64)
		}
		if interval.Valid {
			s.Interval = int(interval.Int64)
		}
		if timeout.Valid {
			s.Timeout = int(timeout.Int64)
		}
		if tags.Valid && tags.String != "" {
			json.Unmarshal([]byte(tags.String), &s.Tags)
		}
		if scheduleType.Valid {
			s.ScheduleType = models.ScheduleType(scheduleType.String)
		} else {
			s.ScheduleType = models.ScheduleTypeInterval
		}
		if cronExpression.Valid {
			s.CronExpression = cronExpression.String
		}
		s.Status = models.StatusUnknown
		services = append(services, s)
	}
	return services, nil
}

// SetActive sets the is_active flag for a service
func (r *ServiceRepository) SetActive(id string, isActive bool) error {
	active := 0
	if isActive {
		active = 1
	}
	_, err := DB.Exec(`UPDATE services SET is_active = ?, updated_at = ? WHERE id = ?`,
		active, time.Now(), id)
	return err
}

// GetByApiKeyHash returns a service by its pre-hashed API key.
func (r *ServiceRepository) GetByApiKeyHash(apiKeyHash string) (*models.Service, error) {
	if apiKeyHash == "" {
		return nil, nil
	}
	var s models.Service
	var isActive int
	var headersJSON, tagsJSON sql.NullString

	err := DB.QueryRow(`
		SELECT id, name, type, is_active, url, port, method, headers, body,
		       expected_status, interval, timeout, tags, created_at, updated_at
		FROM services WHERE api_key = ?
	`, apiKeyHash).Scan(&s.ID, &s.Name, &s.Type, &isActive, &s.URL, &s.Port, &s.Method,
		&headersJSON, &s.Body, &s.ExpectedStatus, &s.Interval, &s.Timeout,
		&tagsJSON, &s.CreatedAt, &s.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	s.IsActive = isActive == 1
	if headersJSON.Valid && headersJSON.String != "" {
		json.Unmarshal([]byte(headersJSON.String), &s.Headers)
	}
	if tagsJSON.Valid && tagsJSON.String != "" {
		json.Unmarshal([]byte(tagsJSON.String), &s.Tags)
	}

	return &s, nil
}

// GetAllApiKeyMappings returns a map of api_key hash → service for cache warm-up.
func (r *ServiceRepository) GetAllApiKeyMappings() (map[string]*models.Service, error) {
	rows, err := DB.Query(`
		SELECT id, name, type, is_active, api_key
		FROM services WHERE api_key != ''
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]*models.Service)
	for rows.Next() {
		var s models.Service
		var isActive int
		var apiKeyHash string
		if err := rows.Scan(&s.ID, &s.Name, &s.Type, &isActive, &apiKeyHash); err != nil {
			return nil, err
		}
		s.IsActive = isActive == 1
		svc := s
		result[apiKeyHash] = &svc
	}
	return result, nil
}

// Delete deletes a service
func (r *ServiceRepository) Delete(id string) error {
	_, err := DB.Exec("DELETE FROM services WHERE id = ?", id)
	return err
}
