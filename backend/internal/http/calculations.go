package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"log/slog"
	"net/http"
	"strings"

	"calculator/backend/internal/calculator"
)

const maxBodyBytes = 1 << 20 // 1 MB

// calculateFunc is the domain entry point; a parameter so tests can inject failures.
type calculateFunc func(op string, operands []float64) (float64, error)

type calculationRequest struct {
	Operation string `json:"operation"`
	// Pointers so that a null element is distinguishable from 0.
	Operands []*float64 `json:"operands"`
}

type calculationResponse struct {
	Operation string    `json:"operation"`
	Operands  []float64 `json:"operands"`
	Result    float64   `json:"result"`
}

func handleCalculate(calc calculateFunc, calcLog *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req calculationRequest
		fail := func(status int, code, msg string) {
			logCalculation(calcLog, req, slog.Group("error", "code", code, "message", truncate(msg, maxLoggedMessageBytes)))
			writeError(w, status, code, msg)
		}

		if status, code, msg := decodeJSON(w, r, &req); status != 0 {
			// The body was rejected and encoding/json leaves partial values behind
			// (a mistyped operand decodes as 0), so log none of them.
			req = calculationRequest{}
			fail(status, code, msg)
			return
		}

		if req.Operation == "" {
			fail(http.StatusBadRequest, codeInvalidRequest, `"operation" is required`)
			return
		}
		if req.Operands == nil {
			fail(http.StatusBadRequest, codeInvalidRequest, `"operands" is required`)
			return
		}
		operands := make([]float64, len(req.Operands))
		for i, v := range req.Operands {
			if v == nil {
				fail(http.StatusBadRequest, codeInvalidRequest, `"operands" must contain only numbers`)
				return
			}
			operands[i] = *v
		}

		result, err := calc(req.Operation, operands)
		if err != nil {
			fail(calculationError(err))
			return
		}
		logCalculation(calcLog, req, slog.Float64("result", result))
		writeJSON(w, http.StatusOK, calculationResponse{Operation: req.Operation, Operands: operands, Result: result})
	}
}

// decodeJSON decodes exactly one JSON object from the body into dst. On
// failure it returns the status, code and client-safe message to respond with.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) (status int, code, msg string) {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()

	err := dec.Decode(dst)
	if err == nil && dec.Decode(&struct{}{}) != io.EOF {
		return http.StatusBadRequest, codeInvalidJSON, "Request body must contain a single JSON object"
	}

	var maxErr *http.MaxBytesError
	switch {
	case err == nil:
		return 0, "", ""
	case errors.As(err, &maxErr):
		return http.StatusRequestEntityTooLarge, codeRequestTooLarge, "Request body must not exceed 1 MB"
	// encoding/json has no typed error for unknown fields.
	case strings.HasPrefix(err.Error(), "json: unknown field "):
		return http.StatusBadRequest, codeInvalidRequest, "Request body contains unknown field " + strings.TrimPrefix(err.Error(), "json: unknown field ")
	default:
		return http.StatusBadRequest, codeInvalidJSON, "Request body must be valid JSON matching the documented schema"
	}
}

// calculationError maps a domain error to the status, code and client-safe
// message to respond with.
func calculationError(err error) (status int, code, msg string) {
	switch {
	case errors.Is(err, calculator.ErrUnsupportedOperation):
		status, code = http.StatusBadRequest, codeUnsupportedOperation
	case errors.Is(err, calculator.ErrInvalidOperandCount):
		status, code = http.StatusBadRequest, codeInvalidOperandCount
	case errors.Is(err, calculator.ErrNonFiniteOperand):
		status, code = http.StatusBadRequest, codeInvalidRequest
	case errors.Is(err, calculator.ErrDivisionByZero):
		status, code = http.StatusUnprocessableEntity, codeDivisionByZero
	case errors.Is(err, calculator.ErrNegativeSquareRoot):
		status, code = http.StatusUnprocessableEntity, codeNegativeSquareRoot
	case errors.Is(err, calculator.ErrResultNotFinite):
		status, code = http.StatusUnprocessableEntity, codeResultNotFinite
	default:
		log.Printf("calculate: unexpected error: %v", err)
		return http.StatusInternalServerError, codeInternal, internalErrorMessage
	}
	// Domain error messages are written for end users and contain no internals;
	// capitalise them to match the API's message style ("Cannot divide by zero").
	msg = err.Error()
	return status, code, strings.ToUpper(msg[:1]) + msg[1:]
}
