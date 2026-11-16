package httpapi

import (
	"errors"
	"log"
	"net/http"
	"runtime/debug"
)

// Error codes returned in the "code" field of error responses.
const (
	codeInvalidJSON          = "INVALID_JSON"
	codeInvalidRequest       = "INVALID_REQUEST"
	codeInvalidOperandCount  = "INVALID_OPERAND_COUNT"
	codeUnsupportedOperation = "UNSUPPORTED_OPERATION"
	codeRequestTooLarge      = "REQUEST_TOO_LARGE"
	codeDivisionByZero       = "DIVISION_BY_ZERO"
	codeNegativeSquareRoot   = "NEGATIVE_SQUARE_ROOT"
	codeResultNotFinite      = "RESULT_NOT_FINITE"
	codeNotFound             = "NOT_FOUND"
	codeMethodNotAllowed     = "METHOD_NOT_ALLOWED"
	codeInternal             = "INTERNAL_ERROR"
)

type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorBody{errorDetail{Code: code, Message: message}})
}

func writeInternalError(w http.ResponseWriter) {
	writeError(w, http.StatusInternalServerError, codeInternal, "An unexpected error occurred")
}

// recoverPanics turns a handler panic into a generic 500 so internal details
// never reach the client.
func recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			v := recover()
			if v == nil {
				return
			}
			if err, ok := v.(error); ok && errors.Is(err, http.ErrAbortHandler) {
				panic(v)
			}
			log.Printf("panic serving %s %s: %v\n%s", r.Method, r.URL.Path, v, debug.Stack())
			writeInternalError(w)
		}()
		next.ServeHTTP(w, r)
	})
}

// jsonMuxErrors replaces ServeMux's plain-text 404 and 405 responses with the
// API's JSON error format. The mux still decides the status and sets Allow.
func jsonMuxErrors(mux *http.ServeMux) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h, pattern := mux.Handler(r)
		if pattern != "" {
			h.ServeHTTP(w, r)
			return
		}
		h.ServeHTTP(&muxErrorWriter{ResponseWriter: w}, r)
	})
}

// muxErrorWriter intercepts 404/405 written by the mux's fallback handlers and
// passes anything else (e.g. path-cleaning redirects) through unchanged.
type muxErrorWriter struct {
	http.ResponseWriter
	rewritten bool
}

func (m *muxErrorWriter) WriteHeader(status int) {
	switch status {
	case http.StatusNotFound:
		m.rewritten = true
		writeError(m.ResponseWriter, status, codeNotFound, "Route not found")
	case http.StatusMethodNotAllowed:
		m.rewritten = true
		writeError(m.ResponseWriter, status, codeMethodNotAllowed, "Method not allowed")
	default:
		m.ResponseWriter.WriteHeader(status)
	}
}

func (m *muxErrorWriter) Write(b []byte) (int, error) {
	if m.rewritten {
		return len(b), nil
	}
	return m.ResponseWriter.Write(b)
}
