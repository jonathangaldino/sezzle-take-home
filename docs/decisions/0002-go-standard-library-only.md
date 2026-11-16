# 0002. Go standard library only, no web framework or router

Status: Accepted

## Context

The API has one business endpoint (`POST /api/v1/calculations`) and a health check. It needs method-aware routing, JSON decoding with strict validation, a body size limit, timeouts, graceful shutdown and consistent JSON errors.

## Decision

Use only the Go standard library. `go.mod` has no `require` block.

- Routing: `http.ServeMux` with method patterns (`"POST /api/v1/calculations"`, `"GET /healthz"`), available since Go 1.22.
- 404/405: the mux still decides the status and sets `Allow`; a small wrapper (`jsonMuxErrors` in `backend/internal/http/errors.go`) rewrites its plain-text bodies into the API's JSON error envelope.
- Decoding: `encoding/json` with `DisallowUnknownFields`, `http.MaxBytesReader` (1 MB), and a check that the body holds exactly one JSON value.
- Panics: a `recoverPanics` middleware returns a generic 500 without leaking internals.
- Server: `http.Server` with read-header/read/write/idle timeouts and `signal.NotifyContext` for graceful shutdown on SIGINT/SIGTERM.
- Tests: `testing` + `net/http/httptest`, table-driven.

## Consequences

- Zero third-party supply chain on the backend; builds and CI need nothing beyond the Go toolchain.
- Some code that a framework would provide is hand-written (the 404/405 rewrite, the unknown-field error mapping, which has to match on `encoding/json`'s error text because it exports no typed error). Both are covered by tests.
- If the API grew to many resources with path parameters, middleware chains and request validation schemas, a router such as chi would become worth its weight. That is not the case here.
