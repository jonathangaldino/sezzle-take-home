// Command api runs the calculator REST API server.
package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"calculator/backend/internal/config"
	httpapi "calculator/backend/internal/http"
)

func main() {
	cfg := config.Load()

	var calcLog *slog.Logger
	if f := openCalcLog(cfg.CalcLogFile); f != nil {
		defer f.Close()
		calcLog = slog.New(slog.NewJSONHandler(f, nil))
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpapi.NewRouter(calcLog),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		log.Printf("listening on %s", srv.Addr)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server error: %v", err)
		}
	case <-ctx.Done():
		log.Print("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Fatalf("graceful shutdown failed: %v", err)
		}
	}
}

// openCalcLog opens the calculation log for appending, creating it if needed.
// An empty path disables the log. If the file cannot be opened the server still
// starts: a warning goes to stderr and nil is returned.
func openCalcLog(path string) *os.File {
	if path == "" {
		return nil
	}
	f, err := os.OpenFile(path, os.O_WRONLY|os.O_APPEND|os.O_CREATE, 0o644)
	if err != nil {
		log.Printf("warning: calculation log disabled: %v", err)
		return nil
	}
	return f
}
