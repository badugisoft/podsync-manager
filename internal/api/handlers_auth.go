package api

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/badugisoft/podsync-manager/internal/auth"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success  bool   `json:"success"`
	Username string `json:"username,omitempty"`
}

type AuthMeResponse struct {
	Authenticated bool   `json:"authenticated"`
	Username      string `json:"username,omitempty"`
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		JSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if !auth.VerifyCredentials(req.Username, req.Password) {
		JSONError(w, http.StatusUnauthorized, "Invalid username or password")
		return
	}

	token := auth.CreateSessionToken(req.Username)
	http.SetCookie(w, &http.Cookie{
		Name:     auth.SessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   r.TLS != nil,
	})

	JSON(w, http.StatusOK, LoginResponse{
		Success:  true,
		Username: req.Username,
	})
}

func HandleLogout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     auth.SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   r.TLS != nil,
	})

	JSON(w, http.StatusOK, map[string]any{"success": true})
}

func HandleAuthMe(w http.ResponseWriter, r *http.Request) {
	username, valid := auth.GetSessionUser(r)
	if !valid {
		JSON(w, http.StatusOK, AuthMeResponse{Authenticated: false})
		return
	}
	JSON(w, http.StatusOK, AuthMeResponse{
		Authenticated: true,
		Username:      username,
	})
}
