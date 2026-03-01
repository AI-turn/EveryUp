package database

import (
	"database/sql"
	"log"

	"github.com/aiturn/everyup/internal/crypto"
	"github.com/aiturn/everyup/internal/models"
)

// NotificationRepository handles notification channel data operations
type NotificationRepository struct{}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository() *NotificationRepository {
	return &NotificationRepository{}
}

// decryptConfig decrypts a channel's config field, falling back to plaintext on error.
func decryptConfig(encConfig string) string {
	dec, err := crypto.Decrypt(encConfig)
	if err != nil {
		log.Printf("[notification] config decryption failed, using raw value: %v", err)
		return encConfig
	}
	return dec
}

// GetAll returns all notification channels
func (r *NotificationRepository) GetAll() ([]models.NotificationChannel, error) {
	rows, err := DB.Query(`
		SELECT id, name, type, config, is_enabled, created_at
		FROM notification_channels
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.NotificationChannel
	for rows.Next() {
		var ch models.NotificationChannel
		var isEnabled int
		var encConfig string
		if err := rows.Scan(&ch.ID, &ch.Name, &ch.Type, &encConfig, &isEnabled, &ch.CreatedAt); err != nil {
			return nil, err
		}
		ch.Config = decryptConfig(encConfig)
		ch.IsEnabled = isEnabled == 1
		channels = append(channels, ch)
	}
	return channels, nil
}

// GetByID returns a notification channel by ID
func (r *NotificationRepository) GetByID(id string) (*models.NotificationChannel, error) {
	var ch models.NotificationChannel
	var isEnabled int
	var encConfig string

	err := DB.QueryRow(`
		SELECT id, name, type, config, is_enabled, created_at
		FROM notification_channels WHERE id = ?
	`, id).Scan(&ch.ID, &ch.Name, &ch.Type, &encConfig, &isEnabled, &ch.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	ch.Config = decryptConfig(encConfig)
	ch.IsEnabled = isEnabled == 1
	return &ch, nil
}

// Create creates a new notification channel
func (r *NotificationRepository) Create(ch *models.NotificationChannel) error {
	isEnabled := 0
	if ch.IsEnabled {
		isEnabled = 1
	}

	encConfig, err := crypto.Encrypt(ch.Config)
	if err != nil {
		return err
	}

	_, err = DB.Exec(`
		INSERT INTO notification_channels (id, name, type, config, is_enabled, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, ch.ID, ch.Name, ch.Type, encConfig, isEnabled, ch.CreatedAt)
	return err
}

// Delete deletes a notification channel
func (r *NotificationRepository) Delete(id string) error {
	_, err := DB.Exec("DELETE FROM notification_channels WHERE id = ?", id)
	return err
}

// Update updates a notification channel
func (r *NotificationRepository) Update(ch *models.NotificationChannel) error {
	isEnabled := 0
	if ch.IsEnabled {
		isEnabled = 1
	}

	encConfig, err := crypto.Encrypt(ch.Config)
	if err != nil {
		return err
	}

	_, err = DB.Exec(`
		UPDATE notification_channels SET name = ?, type = ?, config = ?, is_enabled = ?
		WHERE id = ?
	`, ch.Name, ch.Type, encConfig, isEnabled, ch.ID)
	return err
}

// SetEnabled updates the is_enabled flag of a notification channel
func (r *NotificationRepository) SetEnabled(id string, isEnabled bool) error {
	enabled := 0
	if isEnabled {
		enabled = 1
	}

	_, err := DB.Exec(`UPDATE notification_channels SET is_enabled = ? WHERE id = ?`, enabled, id)
	return err
}

// GetEnabled returns all enabled notification channels
func (r *NotificationRepository) GetEnabled() ([]models.NotificationChannel, error) {
	rows, err := DB.Query(`
		SELECT id, name, type, config, is_enabled, created_at
		FROM notification_channels
		WHERE is_enabled = 1
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.NotificationChannel
	for rows.Next() {
		var ch models.NotificationChannel
		var isEnabled int
		var encConfig string
		if err := rows.Scan(&ch.ID, &ch.Name, &ch.Type, &encConfig, &isEnabled, &ch.CreatedAt); err != nil {
			return nil, err
		}
		ch.Config = decryptConfig(encConfig)
		ch.IsEnabled = isEnabled == 1
		channels = append(channels, ch)
	}
	return channels, nil
}
