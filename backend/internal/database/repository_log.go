package database

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/mt-monitoring/api/internal/models"
)

// LogRepository handles log data operations
type LogRepository struct{}

// NewLogRepository creates a new log repository
func NewLogRepository() *LogRepository {
	return &LogRepository{}
}

// Create creates a new log entry
func (r *LogRepository) Create(l *models.Log) error {
	if l.Source == "" {
		l.Source = models.LogSourceInternal
	}

	result, err := DB.Exec(`
		INSERT INTO logs (service_id, level, message, metadata, source, fingerprint, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, l.ServiceID, l.Level, l.Message, l.Metadata, l.Source, l.Fingerprint, l.CreatedAt)
	if err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	l.ID = id
	return nil
}

// GetAll returns logs with optional filters
func (r *LogRepository) GetAll(filter models.LogFilter) ([]models.Log, int, error) {
	// Build query
	query := "SELECT id, service_id, level, message, metadata, created_at FROM logs WHERE 1=1"
	countQuery := "SELECT COUNT(*) FROM logs WHERE 1=1"
	args := []interface{}{}

	if filter.ServiceID != "" {
		query += " AND service_id = ?"
		countQuery += " AND service_id = ?"
		args = append(args, filter.ServiceID)
	}
	if filter.Level != "" {
		query += " AND level = ?"
		countQuery += " AND level = ?"
		args = append(args, filter.Level)
	}
	if filter.Search != "" {
		query += " AND message LIKE ?"
		countQuery += " AND message LIKE ?"
		args = append(args, "%"+filter.Search+"%")
	}
	if !filter.From.IsZero() {
		query += " AND created_at >= ?"
		countQuery += " AND created_at >= ?"
		args = append(args, filter.From)
	}
	if !filter.To.IsZero() {
		query += " AND created_at <= ?"
		countQuery += " AND created_at <= ?"
		args = append(args, filter.To)
	}

	// Get total count
	var total int
	if err := DB.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Add pagination
	query += " ORDER BY created_at DESC"
	if filter.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", filter.Limit)
	}
	if filter.Offset > 0 {
		query += fmt.Sprintf(" OFFSET %d", filter.Offset)
	}

	rows, err := DB.Query(query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []models.Log
	for rows.Next() {
		var l models.Log
		var serviceID, metadata sql.NullString
		if err := rows.Scan(&l.ID, &serviceID, &l.Level, &l.Message, &metadata, &l.CreatedAt); err != nil {
			return nil, 0, err
		}
		if serviceID.Valid {
			l.ServiceID = serviceID.String
		}
		if metadata.Valid {
			l.Metadata = json.RawMessage(metadata.String)
		}
		logs = append(logs, l)
	}
	return logs, total, nil
}

// DeleteOld deletes logs older than the specified duration
func (r *LogRepository) DeleteOld(retention time.Duration) (int64, error) {
	result, err := DB.Exec(`
		DELETE FROM logs WHERE created_at < ?
	`, time.Now().Add(-retention))
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
