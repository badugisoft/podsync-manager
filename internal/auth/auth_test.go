package auth

import (
	"testing"
)

func TestAuth(t *testing.T) {
	if !VerifyCredentials("admin", "admin") {
		t.Fatal("Default credentials should be valid")
	}

	if VerifyCredentials("admin", "wrongpassword") {
		t.Fatal("Wrong password should be invalid")
	}

	token := CreateSessionToken("admin")
	valid, username := ValidateSessionToken(token)
	if !valid || username != "admin" {
		t.Fatalf("Token validation failed: valid=%v, user=%s", valid, username)
	}

	// Tampered token test
	tampered := token[:len(token)-4] + "AAAA"
	if valid, _ := ValidateSessionToken(tampered); valid {
		t.Fatal("Tampered token should not validate")
	}
}
