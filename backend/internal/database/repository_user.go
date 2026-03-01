package database

import (
	"database/sql"
	"fmt"

	"github.com/mt-monitoring/api/internal/models"
)

// UserRepository handles all user DB operations.
type UserRepository struct{}

func NewUserRepository() *UserRepository { return &UserRepository{} }

// Count returns the total number of users.
func (r *UserRepository) Count() (int, error) {
	var n int
	err := DB.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n)
	return n, err
}

// Create inserts a new user and returns it.
func (r *UserRepository) Create(username, passwordHash, role string) (*models.User, error) {
	res, err := DB.Exec(
		`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
		username, passwordHash, role,
	)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	id, _ := res.LastInsertId()
	return r.FindByID(id)
}

// FindByUsername returns a user by username, or sql.ErrNoRows if not found.
func (r *UserRepository) FindByUsername(username string) (*models.User, error) {
	u := &models.User{}
	err := DB.QueryRow(
		`SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?`,
		username,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}
	return u, nil
}

// FindByID returns a user by ID.
func (r *UserRepository) FindByID(id int64) (*models.User, error) {
	u := &models.User{}
	err := DB.QueryRow(
		`SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?`,
		id,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.Role, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}
