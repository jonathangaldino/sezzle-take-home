package httpapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
)

func do(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(method, path, strings.NewReader(body)))
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	return rec
}

func assertError(t *testing.T, rec *httptest.ResponseRecorder, status int, code string) errorDetail {
	t.Helper()
	if rec.Code != status {
		t.Errorf("status = %d, want %d (body %s)", rec.Code, status, rec.Body)
	}
	var body errorBody
	dec := json.NewDecoder(rec.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&body); err != nil {
		t.Fatalf("decode error body: %v", err)
	}
	if body.Error.Code != code {
		t.Errorf("code = %q, want %q", body.Error.Code, code)
	}
	if body.Error.Message == "" {
		t.Error("message is empty")
	}
	return body.Error
}

func TestCalculationSuccess(t *testing.T) {
	tests := []struct {
		body string
		want calculationResponse
	}{
		{`{"operation":"add","operands":[10,5]}`, calculationResponse{"add", []float64{10, 5}, 15}},
		{`{"operation":"subtract","operands":[10,5]}`, calculationResponse{"subtract", []float64{10, 5}, 5}},
		{`{"operation":"multiply","operands":[-2.5,4]}`, calculationResponse{"multiply", []float64{-2.5, 4}, -10}},
		{`{"operation":"divide","operands":[10,4]}`, calculationResponse{"divide", []float64{10, 4}, 2.5}},
		{`{"operation":"power","operands":[2,10]}`, calculationResponse{"power", []float64{2, 10}, 1024}},
		{`{"operation":"sqrt","operands":[16]}`, calculationResponse{"sqrt", []float64{16}, 4}},
		{`{"operation":"percentage","operands":[200,10]}`, calculationResponse{"percentage", []float64{200, 10}, 20}},
	}
	h := NewRouter()
	for _, tt := range tests {
		t.Run(tt.want.Operation, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, "/api/v1/calculations", tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200 (body %s)", rec.Code, rec.Body)
			}
			var got calculationResponse
			dec := json.NewDecoder(rec.Body)
			dec.DisallowUnknownFields()
			if err := dec.Decode(&got); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("body = %+v, want %+v", got, tt.want)
			}
		})
	}
}

func TestCalculationErrors(t *testing.T) {
	tests := []struct {
		name   string
		body   string
		status int
		code   string
	}{
		{"empty body", ``, 400, codeInvalidJSON},
		{"malformed JSON", `{"operation":"add",`, 400, codeInvalidJSON},
		{"not an object", `[1,2]`, 400, codeInvalidJSON},
		{"operand wrong type", `{"operation":"add","operands":["1",2]}`, 400, codeInvalidJSON},
		{"operation wrong type", `{"operation":1,"operands":[1,2]}`, 400, codeInvalidJSON},
		{"number out of range", `{"operation":"add","operands":[1e999,1]}`, 400, codeInvalidJSON},
		{"trailing data", `{"operation":"add","operands":[1,2]} {}`, 400, codeInvalidJSON},
		{"trailing garbage", `{"operation":"add","operands":[1,2]}x`, 400, codeInvalidJSON},
		{"unknown field", `{"operation":"add","operands":[1,2],"extra":true}`, 400, codeInvalidRequest},
		{"missing operation", `{"operands":[1,2]}`, 400, codeInvalidRequest},
		{"empty operation", `{"operation":"","operands":[1,2]}`, 400, codeInvalidRequest},
		{"missing operands", `{"operation":"add"}`, 400, codeInvalidRequest},
		{"null operands", `{"operation":"add","operands":null}`, 400, codeInvalidRequest},
		{"null operand element", `{"operation":"add","operands":[1,null]}`, 400, codeInvalidRequest},
		{"empty operands", `{"operation":"add","operands":[]}`, 400, codeInvalidOperandCount},
		{"too many operands", `{"operation":"sqrt","operands":[4,2]}`, 400, codeInvalidOperandCount},
		{"unsupported operation", `{"operation":"modulo","operands":[1,2]}`, 400, codeUnsupportedOperation},
		{"division by zero", `{"operation":"divide","operands":[1,0]}`, 422, codeDivisionByZero},
		{"negative square root", `{"operation":"sqrt","operands":[-4]}`, 422, codeNegativeSquareRoot},
		{"overflow", `{"operation":"multiply","operands":[1e308,10]}`, 422, codeResultNotFinite},
		{"NaN result", `{"operation":"power","operands":[-8,0.5]}`, 422, codeResultNotFinite},
	}
	h := NewRouter()
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertError(t, do(t, h, http.MethodPost, "/api/v1/calculations", tt.body), tt.status, tt.code)
		})
	}
}

func TestDomainErrorMessage(t *testing.T) {
	rec := do(t, NewRouter(), http.MethodPost, "/api/v1/calculations", `{"operation":"divide","operands":[1,0]}`)
	if got := assertError(t, rec, 422, codeDivisionByZero).Message; got != "Cannot divide by zero" {
		t.Errorf("message = %q, want %q", got, "Cannot divide by zero")
	}
}

func TestCalculationBodyTooLarge(t *testing.T) {
	body := `{"operation":"add","operands":[1,2],"pad":"` + strings.Repeat("a", maxBodyBytes) + `"}`
	assertError(t, do(t, NewRouter(), http.MethodPost, "/api/v1/calculations", body), 413, codeRequestTooLarge)
}

func TestMethodNotAllowed(t *testing.T) {
	for _, method := range []string{http.MethodGet, http.MethodPut, http.MethodDelete} {
		t.Run(method, func(t *testing.T) {
			rec := do(t, NewRouter(), method, "/api/v1/calculations", "")
			assertError(t, rec, 405, codeMethodNotAllowed)
			if allow := rec.Header().Get("Allow"); allow != "POST" {
				t.Errorf("Allow = %q, want POST", allow)
			}
		})
	}
}

func TestNotFound(t *testing.T) {
	for _, path := range []string{"/", "/api/v1/unknown", "/api/v2/calculations"} {
		t.Run(path, func(t *testing.T) {
			assertError(t, do(t, NewRouter(), http.MethodPost, path, "{}"), 404, codeNotFound)
		})
	}
}

func TestInternalErrors(t *testing.T) {
	const secret = "db password is hunter2"
	tests := map[string]calculateFunc{
		"unknown error": func(string, []float64) (float64, error) { return 0, errors.New(secret) },
		"panic":         func(string, []float64) (float64, error) { panic(secret) },
	}
	for name, calc := range tests {
		t.Run(name, func(t *testing.T) {
			rec := do(t, newRouter(calc), http.MethodPost, "/api/v1/calculations", `{"operation":"add","operands":[1,2]}`)
			detail := assertError(t, rec, 500, codeInternal)
			if strings.Contains(detail.Message, secret) {
				t.Errorf("internal error leaked to client: %q", detail.Message)
			}
		})
	}
}
