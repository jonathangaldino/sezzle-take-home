// Package httpapi wires the HTTP transport layer: routes, handlers and JSON encoding.
package httpapi

import (
	"encoding/json"
	"log"
	"log/slog"
	"net/http"

	"calculator/backend/internal/calculator"
)

// NewRouter returns the application's HTTP handler. Every calculation request
// is recorded on calcLog; nil disables the calculation log.
func NewRouter(calcLog *slog.Logger) http.Handler {
	return newRouter(calculator.Calculate, calcLog)
}

func newRouter(calc calculateFunc, calcLog *slog.Logger) http.Handler {
	if calcLog == nil {
		calcLog = slog.New(slog.DiscardHandler)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", handleHealth)
	mux.Handle("POST /api/v1/calculations", handleCalculate(calc, calcLog))
	return recoverPanics(jsonMuxErrors(mux))
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		log.Printf("write json response: %v", err)
	}
}
