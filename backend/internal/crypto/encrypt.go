package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
)

var masterKey []byte

// InitFromDB loads or auto-generates the master encryption key from the app_settings table.
// On first run, a random 32-byte key is generated and persisted to DB.
// Subsequent runs load the same key — encryption is always enabled.
func InitFromDB(db *sql.DB) error {
	const keyName = "encryption_key"

	var keyHex string
	err := db.QueryRow(`SELECT value FROM app_settings WHERE key = ?`, keyName).Scan(&keyHex)
	if err != nil && err != sql.ErrNoRows {
		return fmt.Errorf("failed to load encryption key: %w", err)
	}

	if keyHex == "" {
		// First run — generate and persist a new key
		key := make([]byte, 32)
		if _, err := io.ReadFull(rand.Reader, key); err != nil {
			return fmt.Errorf("failed to generate encryption key: %w", err)
		}
		keyHex = hex.EncodeToString(key)
		if _, err := db.Exec(
			`INSERT INTO app_settings (key, value) VALUES (?, ?)`, keyName, keyHex,
		); err != nil {
			return fmt.Errorf("failed to persist encryption key: %w", err)
		}
	}

	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return fmt.Errorf("invalid encryption key in DB: %w", err)
	}
	masterKey = key
	return nil
}

// Encrypt encrypts plaintext using AES-256-GCM.
// Returns hex-encoded ciphertext.
func Encrypt(plaintext string) (string, error) {
	if plaintext == "" {
		return plaintext, nil
	}

	block, err := aes.NewCipher(masterKey)
	if err != nil {
		return "", fmt.Errorf("cipher creation failed: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("GCM creation failed: %w", err)
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce generation failed: %w", err)
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return hex.EncodeToString(ciphertext), nil
}

// Decrypt decrypts hex-encoded AES-256-GCM ciphertext.
// Falls back to returning the input as-is for pre-encryption plaintext data.
func Decrypt(ciphertextHex string) (string, error) {
	if ciphertextHex == "" {
		return ciphertextHex, nil
	}

	ciphertext, err := hex.DecodeString(ciphertextHex)
	if err != nil {
		// Not hex — pre-encryption plaintext, return as-is
		return ciphertextHex, nil
	}

	block, err := aes.NewCipher(masterKey)
	if err != nil {
		return "", fmt.Errorf("cipher creation failed: %w", err)
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("GCM creation failed: %w", err)
	}

	nonceSize := aesGCM.NonceSize()
	if len(ciphertext) < nonceSize {
		// Too short to be valid ciphertext — return as-is
		return ciphertextHex, nil
	}

	nonce, ciphertextBytes := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := aesGCM.Open(nil, nonce, ciphertextBytes, nil)
	if err != nil {
		// Decryption failed — data was stored before encryption was introduced
		return ciphertextHex, errors.New("decryption failed, data may not be encrypted")
	}

	return string(plaintext), nil
}
