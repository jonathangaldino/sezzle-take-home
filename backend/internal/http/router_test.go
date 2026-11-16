package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// The 404/405 rewriter must leave the mux's path-cleaning redirect untouched.
func TestUncleanPathRedirects(t *testing.T) {
	rec := httptest.NewRecorder()
	NewRouter(nil).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/v1/./calculations", nil))

	if rec.Code != http.StatusTemporaryRedirect {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusTemporaryRedirect)
	}
	if loc := rec.Header().Get("Location"); loc != "/api/v1/calculations" {
		t.Errorf("Location = %q, want /api/v1/calculations", loc)
	}
}

func TestHealth(t *testing.T) {
	rec := httptest.NewRecorder()
	NewRouter(nil).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("decode body: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf(`body["status"] = %q, want "ok"`, body["status"])
	}
}
