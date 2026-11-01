package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const SessionCookieName = "podsync_session"

func getAdminUsername() string {
	if u := os.Getenv("ADMIN_USERNAME"); u != "" {
		return u
	}
	return "admin"
}

func getAdminPassword() string {
	if p := os.Getenv("ADMIN_PASSWORD"); p != "" {
		return p
	}
	return "admin"
}

func getSecretKey() []byte {
	if s := os.Getenv("SESSION_SECRET"); s != "" {
		return []byte(s)
	}
	return []byte("podsync-default-secret-key-change-in-prod")
}

// VerifyCredentials checks username and password against configured admin credentials.
func VerifyCredentials(username, password string) bool {
	uMatch := subtle.ConstantTimeCompare([]byte(username), []byte(getAdminUsername())) == 1
	pMatch := subtle.ConstantTimeCompare([]byte(password), []byte(getAdminPassword())) == 1
	return uMatch && pMatch
}

// CreateSessionToken generates a base64 encoded token: username:expiresAt:hmacSignature.
func CreateSessionToken(username string) string {
	expiresAt := time.Now().Add(7 * 24 * time.Hour).UnixMilli()
	payload := username + ":" + strconv.FormatInt(expiresAt, 10)

	mac := hmac.New(sha256.New, getSecretKey())
	mac.Write([]byte(payload))
	signature := hex.EncodeToString(mac.Sum(nil))

	fullToken := payload + ":" + signature
	return base64.StdEncoding.EncodeToString([]byte(fullToken))
}

// ValidateSessionToken decodes and verifies token signature and expiration.
func ValidateSessionToken(token string) (bool, string) {
	decodedBytes, err := base64.StdEncoding.DecodeString(token)
	if err != nil {
		return false, ""
	}

	parts := strings.Split(string(decodedBytes), ":")
	if len(parts) != 3 {
		return false, ""
	}

	username := parts[0]
	expiresAtStr := parts[1]
	signature := parts[2]

	expiresAt, err := strconv.ParseInt(expiresAtStr, 10, 64)
	if err != nil || time.Now().UnixMilli() > expiresAt {
		return false, ""
	}

	payload := username + ":" + expiresAtStr
	mac := hmac.New(sha256.New, getSecretKey())
	mac.Write([]byte(payload))
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	if subtle.ConstantTimeCompare([]byte(signature), []byte(expectedSignature)) == 1 {
		return true, username
	}

	return false, ""
}

// GetSessionUser retrieves the authenticated username from the request cookie, if valid.
func GetSessionUser(r *http.Request) (string, bool) {
	cookie, err := r.Cookie(SessionCookieName)
	if err != nil || cookie.Value == "" {
		return "", false
	}
	valid, username := ValidateSessionToken(cookie.Value)
	if !valid {
		return "", false
	}
	return username, true
}

// RequireAuth middleware ensures the incoming request has a valid session token.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		username, valid := GetSessionUser(r)
		if !valid {
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}
		_ = username
		next.ServeHTTP(w, r)
	})
}
