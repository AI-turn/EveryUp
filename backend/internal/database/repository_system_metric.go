package database

import (
	"database/sql"
	"time"

	"github.com/mt-monitoring/api/internal/models"
)

// SystemMetricRepository handles system metric data operations
type SystemMetricRepository struct{}

// NewSystemMetricRepository creates a new system metric repository
func NewSystemMetricRepository() *SystemMetricRepository {
	return &SystemMetricRepository{}
}

// Create stores a 1-minute aggregate system metric
func (r *SystemMetricRepository) Create(m *models.SystemMetric) error {
	result, err := DB.Exec(`
		INSERT INTO system_metrics (host_id, cpu_usage, mem_total, mem_used, mem_usage,
		                            disk_total, disk_used, disk_usage,
		                            disk_read, disk_write, net_in, net_out, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, m.HostID, m.CPUUsage, m.MemTotal, m.MemUsed, m.MemUsage,
		m.DiskTotal, m.DiskUsed, m.DiskUsage,
		m.DiskRead, m.DiskWrite, m.NetIn, m.NetOut, m.CreatedAt)
	if err != nil {
		return err
	}

	id, _ := result.LastInsertId()
	m.ID = id
	return nil
}

// GetHistory returns system metrics for a given host and time range
func (r *SystemMetricRepository) GetHistory(hostID string, since time.Time) ([]models.SystemMetricPoint, error) {
	rows, err := DB.Query(`
		SELECT created_at, cpu_usage, mem_used, disk_read, disk_write
		FROM system_metrics
		WHERE host_id = ? AND created_at >= ?
		ORDER BY created_at ASC
	`, hostID, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []models.SystemMetricPoint
	for rows.Next() {
		var p models.SystemMetricPoint
		var ts time.Time
		if err := rows.Scan(&ts, &p.CPU, &p.MemUsed, &p.DiskRead, &p.DiskWrite); err != nil {
			return nil, err
		}
		p.Timestamp = ts.Format(time.RFC3339)
		points = append(points, p)
	}
	return points, nil
}

// GetLatestByHost returns the most recent metric for a host
func (r *SystemMetricRepository) GetLatestByHost(hostID string) (*models.SystemMetric, error) {
	var m models.SystemMetric
	var ts time.Time
	err := DB.QueryRow(`
		SELECT id, host_id, cpu_usage, mem_total, mem_used, mem_usage,
		       disk_total, disk_used, disk_usage, disk_read, disk_write,
		       net_in, net_out, created_at
		FROM system_metrics
		WHERE host_id = ?
		ORDER BY created_at DESC
		LIMIT 1
	`, hostID).Scan(&m.ID, &m.HostID, &m.CPUUsage, &m.MemTotal, &m.MemUsed, &m.MemUsage,
		&m.DiskTotal, &m.DiskUsed, &m.DiskUsage, &m.DiskRead, &m.DiskWrite,
		&m.NetIn, &m.NetOut, &ts)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	m.CreatedAt = ts
	return &m, nil
}

// DeleteOld deletes system metrics older than the specified duration
func (r *SystemMetricRepository) DeleteOld(retention time.Duration) (int64, error) {
	result, err := DB.Exec(`
		DELETE FROM system_metrics WHERE created_at < ?
	`, time.Now().Add(-retention))
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}
