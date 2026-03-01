package database

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/mt-monitoring/api/internal/models"
)

// MetricRepository handles metric data operations
type MetricRepository struct{}

// NewMetricRepository creates a new metric repository
func NewMetricRepository() *MetricRepository {
	return &MetricRepository{}
}

// Create creates a new metric
func (r *MetricRepository) Create(m *models.Metric) error {
	result, err := DB.Exec(`
		INSERT INTO metrics (service_id, status, response_time, status_code, error_message, checked_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, m.ServiceID, m.Status, m.ResponseTime, m.StatusCode, m.ErrorMessage, m.CheckedAt)
	if err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	m.ID = id
	return nil
}

// GetByServiceID returns metrics for a service
func (r *MetricRepository) GetByServiceID(serviceID string, limit int) ([]models.Metric, error) {
	if limit <= 0 {
		limit = 100
	}

	rows, err := DB.Query(`
		SELECT id, service_id, status, response_time, status_code, error_message, checked_at
		FROM metrics
		WHERE service_id = ?
		ORDER BY checked_at DESC
		LIMIT ?
	`, serviceID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []models.Metric
	for rows.Next() {
		var m models.Metric
		var statusCode, responseTime sql.NullInt64
		var errorMsg sql.NullString
		if err := rows.Scan(&m.ID, &m.ServiceID, &m.Status, &responseTime, &statusCode, &errorMsg, &m.CheckedAt); err != nil {
			return nil, err
		}
		if statusCode.Valid {
			m.StatusCode = int(statusCode.Int64)
		}
		if responseTime.Valid {
			m.ResponseTime = int(responseTime.Int64)
		}
		if errorMsg.Valid {
			m.ErrorMessage = errorMsg.String
		}
		metrics = append(metrics, m)
	}
	return metrics, nil
}

// GetSummary returns metric summary for a service
func (r *MetricRepository) GetSummary(serviceID string, duration time.Duration) (*models.MetricSummary, error) {
	since := time.Now().Add(-duration)

	var summary models.MetricSummary
	summary.ServiceID = serviceID

	err := DB.QueryRow(`
		SELECT
			COUNT(*) as total,
			SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
			AVG(CASE WHEN response_time > 0 THEN response_time END) as avg_rt,
			MIN(CASE WHEN response_time > 0 THEN response_time END) as min_rt,
			MAX(response_time) as max_rt
		FROM metrics
		WHERE service_id = ? AND checked_at >= ?
	`, serviceID, since).Scan(
		&summary.TotalChecks,
		&summary.SuccessfulChecks,
		&summary.AvgResponseTime,
		&summary.MinResponseTime,
		&summary.MaxResponseTime,
	)
	if err != nil {
		return nil, err
	}

	summary.FailedChecks = summary.TotalChecks - summary.SuccessfulChecks
	if summary.TotalChecks > 0 {
		summary.Uptime = float64(summary.SuccessfulChecks) / float64(summary.TotalChecks) * 100
	}

	return &summary, nil
}

// GetUptimeData returns daily uptime data for calendar view
func (r *MetricRepository) GetUptimeData(serviceID string, days int) ([]models.UptimeData, error) {
	rows, err := DB.Query(`
		SELECT
			COALESCE(DATE(checked_at), '') as date,
			COUNT(*) as total,
			SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
		FROM metrics
		WHERE service_id = ? AND checked_at >= DATE('now', ?)
		GROUP BY DATE(checked_at)
		HAVING date != ''
		ORDER BY date DESC
	`, serviceID, fmt.Sprintf("-%d days", days))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []models.UptimeData
	for rows.Next() {
		var d models.UptimeData
		var date sql.NullString
		if err := rows.Scan(&date, &d.Checks, &d.Success); err != nil {
			return nil, err
		}
		if date.Valid {
			d.Date = date.String
		}
		d.Failure = d.Checks - d.Success
		if d.Checks > 0 {
			d.Uptime = float64(d.Success) / float64(d.Checks) * 100
		}
		data = append(data, d)
	}
	return data, nil
}

// DeleteOld deletes metrics older than the specified duration
func (r *MetricRepository) DeleteOld(retention time.Duration) (int64, error) {
	result, err := DB.Exec(`
		DELETE FROM metrics WHERE checked_at < ?
	`, time.Now().Add(-retention))
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
