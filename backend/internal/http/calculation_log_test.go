package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"reflect"
	"strings"
	"sync"
	"testing"
)

// logOne sends body to the calculations endpoint and returns the single
// calculation log line it produced, decoded, without the "time" field.
func logOne(t *testing.T, body string) map[string]any {
	t.Helper()
	var buf bytes.Buffer
	do(t, NewRouter(slog.New(slog.NewJSONHandler(&buf, nil))), http.MethodPost, "/api/v1/calculations", body)

	lines := strings.Split(strings.TrimSuffix(buf.String(), "\n"), "\n")
	if len(lines) != 1 {
		t.Fatalf("got %d log lines, want 1:\n%s", len(lines), buf.String())
	}
	var entry map[string]any
	if err := json.Unmarshal([]byte(lines[0]), &entry); err != nil {
		t.Fatalf("log line is not JSON: %v\n%s", err, lines[0])
	}
	if _, ok := entry["time"]; !ok {
		t.Error(`log line has no "time"`)
	}
	delete(entry, "time")
	return entry
}

func TestCalculationLog(t *testing.T) {
	errorEntry := func(code, msg string) map[string]any { return map[string]any{"code": code, "message": msg} }
	tests := []struct {
		name string
		body string
		// Fields beyond level, msg and time.
		want map[string]any
	}{
		{
			name: "success",
			body: `{"operation":"add","operands":[10,5]}`,
			want: map[string]any{"operation": "add", "operands": []any{10.0, 5.0}, "result": 15.0},
		},
		{
			name: "domain error",
			body: `{"operation":"divide","operands":[1,0]}`,
			want: map[string]any{"operation": "divide", "operands": []any{1.0, 0.0}, "error": errorEntry(codeDivisionByZero, "Cannot divide by zero")},
		},
		{
			name: "unsupported operation",
			body: `{"operation":"modulo","operands":[1,2]}`,
			want: map[string]any{"operation": "modulo", "operands": []any{1.0, 2.0}, "error": errorEntry(codeUnsupportedOperation, `Unsupported operation: "modulo"`)},
		},
		{
			name: "malformed JSON logs no request values",
			body: `{"operation":"add",`,
			want: map[string]any{"error": errorEntry(codeInvalidJSON, "Request body must be valid JSON matching the documented schema")},
		},
		{
			name: "mistyped operand is not logged as an invented 0",
			body: `{"operation":"add","operands":["1",2]}`,
			want: map[string]any{"error": errorEntry(codeInvalidJSON, "Request body must be valid JSON matching the documented schema")},
		},
		{
			name: "null operand logged as null",
			body: `{"operation":"add","operands":[1,null]}`,
			want: map[string]any{"operation": "add", "operands": []any{1.0, nil}, "error": errorEntry(codeInvalidRequest, `"operands" must contain only numbers`)},
		},
		{
			name: "missing operation",
			body: `{"operands":[1,2]}`,
			want: map[string]any{"operands": []any{1.0, 2.0}, "error": errorEntry(codeInvalidRequest, `"operation" is required`)},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.want["level"] = "INFO"
			tt.want["msg"] = "calculation"
			if got := logOne(t, tt.body); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("log entry = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestCalculationLogInternalErrorIsGeneric(t *testing.T) {
	var buf bytes.Buffer
	calc := func(string, []float64) (float64, error) { return 0, errors.New("db password is hunter2") }
	do(t, newRouter(calc, slog.New(slog.NewJSONHandler(&buf, nil))), http.MethodPost, "/api/v1/calculations", `{"operation":"add","operands":[1,2]}`)
	if strings.Contains(buf.String(), "hunter2") || !strings.Contains(buf.String(), codeInternal) {
		t.Errorf("log = %s, want INTERNAL_ERROR without internal details", buf.String())
	}
}

// A crafted operation name must stay inside its JSON string, on one line.
func TestCalculationLogInjection(t *testing.T) {
	op := "add\"}\n{\"operation\":\"forged\",\"result\":1}\r\n"
	body, _ := json.Marshal(map[string]any{"operation": op, "operands": []float64{1, 2}})

	got := logOne(t, string(body))
	if got["operation"] != op {
		t.Errorf("operation = %q, want %q", got["operation"], op)
	}
	if _, ok := got["result"]; ok {
		t.Error("forged result field reached the log entry")
	}
}

func TestCalculationLogLimits(t *testing.T) {
	operands := make([]float64, 1000)
	body, _ := json.Marshal(map[string]any{"operation": strings.Repeat("x", 100_000), "operands": operands})

	got := logOne(t, string(body))
	if want := strings.Repeat("x", maxLoggedOperationBytes) + "..."; got["operation"] != want {
		t.Errorf("operation has %d bytes, want %d", len(got["operation"].(string)), len(want))
	}
	if n := len(got["operands"].([]any)); n != maxLoggedOperands {
		t.Errorf("logged %d operands, want %d", n, maxLoggedOperands)
	}
	if got["operand_count"] != 1000.0 {
		t.Errorf("operand_count = %v, want 1000", got["operand_count"])
	}
	// The unsupported-operation message echoes the operation name.
	if msg := got["error"].(map[string]any)["message"].(string); len(msg) != maxLoggedMessageBytes+len("...") {
		t.Errorf("error message has %d bytes, want %d", len(msg), maxLoggedMessageBytes+len("..."))
	}
}

// The slog handler serializes writes, so concurrent requests produce whole lines.
func TestCalculationLogConcurrent(t *testing.T) {
	var buf bytes.Buffer
	h := NewRouter(slog.New(slog.NewJSONHandler(&buf, nil)))
	const n = 50
	var wg sync.WaitGroup
	for range n {
		wg.Go(func() {
			do(t, h, http.MethodPost, "/api/v1/calculations", `{"operation":"multiply","operands":[3,4]}`)
		})
	}
	wg.Wait()

	lines := strings.Split(strings.TrimSuffix(buf.String(), "\n"), "\n")
	if len(lines) != n {
		t.Fatalf("got %d lines, want %d", len(lines), n)
	}
	for _, line := range lines {
		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil || entry["result"] != 12.0 {
			t.Fatalf("bad line %q: %v", line, err)
		}
	}
}
