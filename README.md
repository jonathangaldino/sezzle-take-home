# Calculator

A full-stack calculator: a React + TypeScript single-page app that sends every calculation to a Go REST API. The backend owns all arithmetic and validation; the frontend validates input shape, calls the API and formats the result.

- Assignment: [TASK.md](TASK.md)
- Development playbook and prompts used: [PROMPTS.md](PROMPTS.md)
- How AI was used: [AI_USAGE.md](AI_USAGE.md)
- Architecture decision records: [docs/decisions/](docs/decisions/)

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Directory structure](#directory-structure)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Tests and coverage](#tests-and-coverage)
- [API reference](#api-reference)
- [Calculation log](#calculation-log)
- [Docker](#docker)
- [CI](#ci)
- [Design decisions](#design-decisions)
- [Known limitations](#known-limitations)

## Features

- Operations: add, subtract, multiply, divide, power, square root, percentage.
- One versioned endpoint, `POST /api/v1/calculations`, with strict request validation and a uniform JSON error envelope (including 404/405).
- Handles division by zero, negative square roots, overflow and other non-finite results, wrong operand counts, unknown operations and fields, `null` operands, malformed or oversized bodies.
- UI: operation selector that adjusts the number of inputs, inline per-field validation with focus on the first invalid field, loading state, stale-request cancellation when inputs change, API errors shown verbatim, `aria-live` result region, light/dark theme via `prefers-color-scheme`, layout checked down to 320 px.
- Graceful shutdown and server timeouts on the backend; health check at `GET /healthz`.
- Every calculation request is appended to a local log file as one JSON line: operation, operands, and the result or the error ([Calculation log](#calculation-log)).

## Technology stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, CSS Modules |
| Frontend tests | Vitest 5, React Testing Library, jsdom, `@vitest/coverage-v8` |
| End-to-end tests | Playwright (Chromium only) against the real Go server and Vite dev server |
| Frontend lint | oxlint (what the current Vite `react-ts` template ships, not ESLint) |
| Backend | Go 1.26, standard library only (`net/http`, `encoding/json`); `go.mod` has no dependencies |
| Backend tests | `testing`, `net/http/httptest`, table-driven |
| Tooling | Makefile, Docker + Docker Compose, GitHub Actions |

## Architecture

```
Browser ──> same-origin /api/* ──> Vite dev proxy (dev) or nginx (Docker) ──> Go API :8080
                                                                              │
                                     internal/http  (decode, validate, map errors to HTTP)
                                                                              │
                                     internal/calculator  (pure function, no HTTP/JSON)
```

Backend (`backend/`):

- `internal/calculator`: `Calculate(op string, operands []float64) (float64, error)` backed by a table of operation name to arity and function. Returns sentinel errors (`ErrDivisionByZero`, `ErrResultNotFinite`, ...). No HTTP or JSON imports.
- `internal/http`: routes on `http.ServeMux` method patterns, strict JSON decoding, maps domain errors to status codes, rewrites the mux's plain-text 404/405 into JSON, recovers panics into a generic 500.
- `internal/config`: reads `PORT` (default `8080`).
- `cmd/api`: wires the server with read/write/idle timeouts and graceful shutdown on SIGINT/SIGTERM.

Frontend (`frontend/src/`):

- `services/calculatorApi.ts`: typed `fetch` client. Classifies failures as `network` (no response, or a 502/503/504 from a proxy without the API envelope), `api` (documented error body) or `unexpected`.
- `features/calculator/useCalculator.ts`: form state, validation, request lifecycle with `AbortController`.
- `features/calculator/numbers.ts`: input parsing (plain decimal literals only) and display formatting (up to 15 significant digits). No arithmetic.
- `features/calculator/operations.ts`: operation labels, symbols and operand labels (whose count matches the backend's arity).
- `Calculator.tsx`, `OperandField.tsx`, `ResultPanel.tsx`: presentation.

## Directory structure

```
.
├── .github/workflows/ci.yml          CI: Go, frontend and end-to-end checks
├── backend/
│   ├── cmd/api/main.go               server entry point + test
│   ├── internal/
│   │   ├── calculator/               domain logic + tests
│   │   ├── config/                   env configuration + test
│   │   └── http/                     router, handler, errors, calculation log + tests
│   ├── Dockerfile
│   └── go.mod
├── frontend/
│   ├── e2e/                          Playwright end-to-end tests
│   ├── src/
│   │   ├── features/calculator/      UI, hook, number parsing/formatting + tests
│   │   ├── services/                 API client + tests
│   │   ├── test/setup.ts
│   │   └── App.tsx, main.tsx, index.css
│   ├── .env.example
│   ├── Dockerfile
│   ├── nginx.conf                    serves the build, proxies /api/
│   ├── package.json
│   ├── playwright.config.ts          starts both servers for the e2e tests
│   └── vite.config.ts                dev proxy + Vitest config
├── docs/decisions/                   ADRs 0001–0006
├── docker-compose.yml
├── Makefile
├── AI_USAGE.md
├── PROMPTS.md
├── TASK.md
└── README.md
```

The playbook's suggested `components/`, `hooks/` and `types/` directories were not created: with one feature, they would only hold re-exports.

## Prerequisites

| Tool | Version | Source of the requirement |
|---|---|---|
| Go | 1.26.5 or newer | `go` directive in `backend/go.mod` (with the default `GOTOOLCHAIN=auto`, an older Go 1.21+ downloads it) |
| Node.js | 22.22.2+, 24.15+, or 26+ | intersection of the `engines` ranges of jsdom, Vitest and Vite |
| npm | bundled with Node | lockfile install via `npm ci` |
| make | any | optional; every target wraps a plain command shown below |
| Chromium for Playwright | the build pinned by `@playwright/test` | end-to-end tests only; install once with `cd frontend && npx playwright install chromium` |

Verified with Go 1.26.5, Node 26.13.0 and npm 11.20.0 on macOS.

## Quick start

```sh
make install        # cd frontend && npm ci   (backend has no dependencies to install)

# terminal 1
make backend-run    # cd backend && go run ./cmd/api        -> http://localhost:8080

# terminal 2
make frontend-dev   # cd frontend && npm run dev            -> http://localhost:5173
```

Open http://localhost:5173. The backend listens on `PORT` (default `8080`): `PORT=8081 make backend-run`.

Backend environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8080` | Listening port. Empty means the default. |
| `CALC_LOG_FILE` | `calculations.log` (relative to the working directory, so `backend/calculations.log` with `make backend-run`) | [Calculation log](#calculation-log) path. Set to an empty value to disable the log. |

### How the frontend reaches the API

The browser only ever calls its own origin. In development, `frontend/vite.config.ts` proxies `/api` to `http://localhost:8080`, so a request to `http://localhost:5173/api/v1/calculations` is forwarded to the Go server. The backend therefore needs no CORS ([ADR 0005](docs/decisions/0005-same-origin-api-no-cors.md)).

`VITE_API_BASE_URL` (see `frontend/.env.example`; copy it to `frontend/.env.local` to set it) is prepended to `/api/v1/calculations` at build time. Empty, the default, means same origin. Pointing it at a different origin will not work in a browser unless CORS is added to the backend. If the backend runs on a port other than 8080, change the proxy target in `vite.config.ts`.

If the backend is down, the dev proxy answers 502 and the UI reports the service as unreachable.

### Make targets

| Target | Runs |
|---|---|
| `make install` | `cd frontend && npm ci` |
| `make backend-run` | `cd backend && go run ./cmd/api` |
| `make frontend-dev` | `cd frontend && npm run dev` |
| `make test` | `go test ./...` and `npm run test` (`vitest run`) |
| `make lint` | `gofmt -l` (fails on any output) + `go vet ./...`, and `npm run lint` (`oxlint`) |
| `make build` | `go build -o bin/api ./cmd/api` and `npm run build` (`tsc -b && vite build`, output in `frontend/dist/`) |
| `make coverage` | `go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out`, and `npm run test:coverage` |
| `make e2e` | `cd frontend && npm run test:e2e` (`playwright test`); not part of `make test` |
| `make docker-up` / `make docker-down` | `docker compose up --build` / `docker compose down` |

Each `backend-*` / `frontend-*` target also exists on its own (`make backend-test`, `make frontend-lint`, ...).

## Tests and coverage

```sh
make test       # both suites
make lint
make coverage
```

| Suite | What it covers |
|---|---|
| `backend/internal/calculator` | every operation, arity checks, non-finite operands, division by zero, negative sqrt, overflow, `power` edge cases, `-0` normalisation |
| `backend/internal/http` | status codes and error codes for every error path via `httptest`, unknown fields, `null` operands, trailing data, 1 MB limit, JSON 404/405 with `Allow` (incl. HEAD/OPTIONS), unclean-path redirects, panic recovery, unexpected domain errors |
| `frontend/src/services` | API client: success, envelope errors, network failure, proxy 502/503/504, malformed responses, abort, base URL handling |
| `frontend/src/features/calculator`, `App` | parsing/formatting rules, form behaviour, validation and focus, loading, error display, clearing stale results |
| `backend/internal/config` | default port, `PORT` override |
| `frontend/e2e` (Playwright) | the browser against the real Go server through the Vite proxy, no mocking: a binary operation, square root with one operand, percentage, the division-by-zero message from the backend, invalid input blocked with no request sent, `0.1 + 0.2` displayed as `0.3`, Clear, and a 375 px viewport with no horizontal scroll |

Totals at the time of writing: backend 12 test functions (105 passing tests including subtests); frontend 77 unit tests in 4 files; 8 end-to-end tests.

### End-to-end tests

```sh
cd frontend && npx playwright install chromium   # once
make e2e                                         # or: cd frontend && npm run test:e2e
```

Needs Go and Node, and ports 8080 and 5173 free: Playwright starts `go run ./cmd/api` and the Vite dev server itself and stops them afterwards. Outside CI it reuses servers already running on those ports. Only Chromium is configured. The run takes a few seconds once the Go build cache is warm. `make test` does not run these tests, so the unit suites stay fast and browser-free. On failure, `frontend/playwright-report/` holds the HTML report.

### Coverage

Captured on 2026-11-16 by running `make coverage` (Go 1.26.5 `go test -cover`; Vitest 5.1.0 with the v8 provider).

Backend (statement coverage):

| Package | Coverage |
|---|---|
| `internal/calculator` | 100.0% |
| `internal/http` | 94.9% |
| `internal/config` | 100.0% |
| `cmd/api` | 25.9% (opening the log file is tested; process wiring is not) |
| **total** | **83.2%** |

The total is pulled down by `main`, which has no tests beyond opening the log file; the packages with logic are at 100% and 94.9%. The uncovered blocks in `internal/http` are defensive: logging a failed response write, re-panicking `http.ErrAbortHandler`, the mapping for non-finite operands (unreachable through JSON), and the 404/405 rewriter's pass-through branches for other statuses (unclean-path redirects are tested, but `ServeMux` routes them through the matched-pattern path, not the rewriter).

Frontend (all of `src/` except `main.tsx` and test setup):

| Statements | Branches | Functions | Lines |
|---|---|---|---|
| 98.75% (159/161) | 93.81% (91/97) | 100% (47/47) | 100% (133/133) |

The end-to-end tests are not part of these figures.

Reports:

- Backend: `backend/coverage.out` (profile). For an HTML view: `cd backend && go tool cover -html=coverage.out -o coverage.html`.
- Frontend: `frontend/coverage/index.html` (HTML), plus `clover.xml` and `coverage-final.json` in the same directory. No lcov file is generated.

Both report locations are git-ignored; rerun `make coverage` to regenerate.

## API reference

Base URL in development: `http://localhost:8080` (direct) or `http://localhost:5173` (through the Vite proxy).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/calculations` | Perform one calculation |
| `GET` | `/healthz` | Liveness check, returns `{"status":"ok"}` |

### Request

```json
{ "operation": "add", "operands": [10, 5] }
```

- `operation`: required string; lowercase and case-sensitive (`"Add"` is unsupported).
- `operands`: required array of JSON numbers, length must match the operation.
- Unknown fields are rejected. The body must be a single JSON object, at most 1 MB. The `Content-Type` header is not checked.

### Operations

| `operation` | Operands | Result | Notes |
|---|---|---|---|
| `add` | 2 | a + b | |
| `subtract` | 2 | a − b | |
| `multiply` | 2 | a × b | |
| `divide` | 2 | a ÷ b | b = 0 → 422 `DIVISION_BY_ZERO` |
| `power` | 2 | a ^ b | `math.Pow` semantics: `power(0, 0) = 1`; `power(0, -1)` and negative base with fractional exponent → 422 `RESULT_NOT_FINITE` |
| `sqrt` | 1 | √a | a < 0 → 422 `NEGATIVE_SQUARE_ROOT` |
| `percentage` | 2 | b% of a, computed as a × b / 100 | `percentage(200, 10) = 20` |

Any result that is NaN or ±Infinity (overflow) → 422 `RESULT_NOT_FINITE`. A result of `-0` is returned as `0`.

### Response (200)

```json
{ "operation": "add", "operands": [10, 5], "result": 15 }
```

### Errors

Every error, including 404 and 405, has the same shape:

```json
{ "error": { "code": "DIVISION_BY_ZERO", "message": "Cannot divide by zero" } }
```

| Status | `code` | When |
|---|---|---|
| 400 | `INVALID_JSON` | Body is not valid JSON; wrong JSON types (e.g. a string operand, a top-level array); a number outside float64 range (e.g. `1e999`); more than one JSON value in the body |
| 400 | `INVALID_REQUEST` | `operation` missing or empty; `operands` missing or `null`; a `null` element in `operands`; an unknown field |
| 400 | `UNSUPPORTED_OPERATION` | `operation` is not one of the seven names above (case-sensitive) |
| 400 | `INVALID_OPERAND_COUNT` | Wrong number of operands, including `[]` |
| 413 | `REQUEST_TOO_LARGE` | Body larger than 1 MB |
| 422 | `DIVISION_BY_ZERO` | `divide` with divisor 0 |
| 422 | `NEGATIVE_SQUARE_ROOT` | `sqrt` of a negative number |
| 422 | `RESULT_NOT_FINITE` | Result would be NaN or ±Infinity |
| 404 | `NOT_FOUND` | Unknown path |
| 405 | `METHOD_NOT_ALLOWED` | Known path, wrong method (including HEAD and OPTIONS); response carries `Allow` |
| 500 | `INTERNAL_ERROR` | Unexpected error or recovered panic; generic message, details only in server logs |

400 means the request is malformed; 422 means it is well-formed but has no finite real answer. 413 is an addition to the status codes suggested in the playbook ([ADR 0003](docs/decisions/0003-error-envelope-and-status-mapping.md)).

### Examples

Captured from the running server (`make backend-run`); `Date` and `Content-Length` headers omitted.

```console
$ curl -i -X POST localhost:8080/api/v1/calculations \
    -H 'Content-Type: application/json' -d '{"operation":"add","operands":[10,5]}'
HTTP/1.1 200 OK
Content-Type: application/json

{"operation":"add","operands":[10,5],"result":15}
```

```console
$ curl -X POST localhost:8080/api/v1/calculations -d '{"operation":"sqrt","operands":[16]}'
{"operation":"sqrt","operands":[16],"result":4}

$ curl -X POST localhost:8080/api/v1/calculations -d '{"operation":"percentage","operands":[200,10]}'
{"operation":"percentage","operands":[200,10],"result":20}

$ curl -X POST localhost:8080/api/v1/calculations -d '{"operation":"power","operands":[2,10]}'
{"operation":"power","operands":[2,10],"result":1024}

$ curl -X POST localhost:8080/api/v1/calculations -d '{"operation":"add","operands":[0.1,0.2]}'
{"operation":"add","operands":[0.1,0.2],"result":0.30000000000000004}
```

Errors:

```console
$ curl -i -X POST localhost:8080/api/v1/calculations -d '{"operation":"divide","operands":[10,0]}'
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{"error":{"code":"DIVISION_BY_ZERO","message":"Cannot divide by zero"}}

$ curl -i -X POST localhost:8080/api/v1/calculations -d '{"operation":"add","operands":[1'
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error":{"code":"INVALID_JSON","message":"Request body must be valid JSON matching the documented schema"}}

$ curl -i -X POST localhost:8080/api/v1/calculations -d '{"operation":"modulo","operands":[1,2]}'
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"error":{"code":"UNSUPPORTED_OPERATION","message":"Unsupported operation: \"modulo\""}}

$ curl -X POST localhost:8080/api/v1/calculations -d '{"operation":"add","operands":[1]}'
{"error":{"code":"INVALID_OPERAND_COUNT","message":"Invalid operand count: add expects 2 operand(s), got 1"}}

$ curl -X POST localhost:8080/api/v1/calculations -d '{"operation":"sqrt","operands":[-4]}'
{"error":{"code":"NEGATIVE_SQUARE_ROOT","message":"Cannot take the square root of a negative number"}}

$ curl -X POST localhost:8080/api/v1/calculations -d '{"operation":"add","operands":[1,null]}'
{"error":{"code":"INVALID_REQUEST","message":"\"operands\" must contain only numbers"}}

$ curl -X POST localhost:8080/api/v1/calculations -d '{"operation":"multiply","operands":[1e308,10]}'
{"error":{"code":"RESULT_NOT_FINITE","message":"Result is not a finite number"}}

$ curl -i localhost:8080/api/v1/calculations
HTTP/1.1 405 Method Not Allowed
Allow: POST
Content-Type: application/json
X-Content-Type-Options: nosniff

{"error":{"code":"METHOD_NOT_ALLOWED","message":"Method not allowed"}}

$ curl -i localhost:8080/nope
HTTP/1.1 404 Not Found
Content-Type: application/json
X-Content-Type-Options: nosniff

{"error":{"code":"NOT_FOUND","message":"Route not found"}}
```

## Calculation log

The backend appends one JSON line per `POST /api/v1/calculations` request to `CALC_LOG_FILE` (see [Quick start](#quick-start)), written with the standard library's `log/slog` JSON handler. The file is opened in append mode, created with permissions `0644` if missing, and closed on shutdown. If it cannot be opened, the server prints a warning to stderr and runs without the log. Lines from concurrent requests do not interleave: the slog handler writes each record with a single `Write` under a mutex.

Captured from a local run (`divide 10 4`, `divide 1 0`, then a truncated body):

```
{"time":"2026-11-16T18:19:51.452988-03:00","level":"INFO","msg":"calculation","operation":"divide","operands":[10,4],"result":2.5}
{"time":"2026-11-16T18:19:51.457091-03:00","level":"INFO","msg":"calculation","operation":"divide","operands":[1,0],"error":{"code":"DIVISION_BY_ZERO","message":"Cannot divide by zero"}}
{"time":"2026-11-16T18:19:51.459558-03:00","level":"INFO","msg":"calculation","error":{"code":"INVALID_JSON","message":"Request body must be valid JSON matching the documented schema"}}
```

What each line contains:

- **Success:** `operation`, `operands`, `result`.
- **Rejected after the body was parsed** (missing operation or operands, `null` operand, unsupported operation, wrong operand count, division by zero, negative square root, non-finite result, internal error): the `operation` and `operands` that were received, each omitted if absent (`null` operands stay `null`), and `error` with the same `code` and `message` as the response.
- **Body not accepted** (malformed JSON, wrong field type, unknown field, trailing data, body over 1 MB): only `error`. No request values are logged, because a partially decoded body is unreliable (a mistyped operand decodes as `0`).
- Nothing else: no headers, client addresses or request IDs. Requests to other routes, and handler panics (which go to stderr), are not in this log.

Request values are untrusted, so:

- Strings are JSON-escaped by slog; a quote or newline in an operation name stays inside its field on one line.
- An operation name is cut to 64 bytes and an error message to 256 bytes (the unsupported-operation message echoes the name), each marked with `...`.
- At most 16 operands are logged; when there are more, `operand_count` holds the real number.


```sh
docker compose up --build     # or: make docker-up
docker compose down           # or: make docker-down
```

- Web UI: http://localhost:3000 (nginx serving the production build and proxying `/api/` to the backend).
- API directly: http://localhost:8080.
- Calculation log: the image sets `CALC_LOG_FILE=/tmp/calculations.log`, because the container runs as `nobody` and cannot write to its working directory. The file lives in the container only (no volume): it survives a container restart but not `docker compose down`. Read it with `docker compose exec backend cat /tmp/calculations.log`.

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

- Backend: `gofmt` check, `go vet`, `go test -race -cover`.
- Frontend: `npm ci`, lint, test, build.
- End-to-end: installs Go, Node and Chromium, runs `npm run test:e2e` (Playwright starts both servers), and uploads `frontend/playwright-report/` as an artifact if it fails.

## Design decisions

Each decision has a short ADR with context and consequences in [docs/decisions/](docs/decisions/).

| Decision | Trade-off | ADR |
|---|---|---|
| The backend owns all arithmetic; the frontend only validates input shape and formats output | Single source of truth for semantics, at the cost of a round trip per calculation | [0001](docs/decisions/0001-backend-owns-calculation-logic.md) |
| Go standard library only (`ServeMux` method patterns, `encoding/json`), no framework or router | No dependencies; a little hand-written plumbing (JSON 404/405, unknown-field mapping) | [0002](docs/decisions/0002-go-standard-library-only.md) |
| One error envelope with stable codes; 400 for malformed, 422 for mathematically invalid, 413 for oversized | Codes become part of the public contract | [0003](docs/decisions/0003-error-envelope-and-status-mapping.md) |
| float64 end to end | Native in Go, JSON and JS; not decimal-exact | [0004](docs/decisions/0004-float64-numeric-model.md) |
| Same-origin `/api` via the Vite proxy (dev) or nginx (Docker); no CORS | Nothing to misconfigure; a cross-origin frontend would need CORS added | [0005](docs/decisions/0005-same-origin-api-no-cors.md) |
| No database, auth, rate limiting, history, expression parser or extra frontend libraries | Small surface area; those features would each need their own design | [0006](docs/decisions/0006-no-persistence-or-extra-infrastructure.md) |

Language choices: Go for the backend and React with TypeScript for the frontend are the assignment's stated preferences. Go's standard library covers an HTTP JSON service completely ([ADR 0002](docs/decisions/0002-go-standard-library-only.md)); TypeScript types the API contract on the client (`CalculationRequest`, `CalculationResponse`, the error envelope) and the response is checked at runtime before use.

Semantics chosen where the assignment is silent:

- `percentage(a, b)` is b% of a. Computed as `a * b / 100` rather than `a * (b / 100)` because it is exact more often on ordinary inputs (`300 * 7 / 100 = 21`, versus `21.000000000000004`).
- `power` follows `math.Pow` (`power(0, 0) = 1`), but any non-finite result is an error instead of being returned.
- The UI rounds to 15 significant digits for display, the most float64 always round-trips: `0.1 + 0.2` shows `0.3`, while `1.0000000000001 + 1` still shows `2.0000000000001`.

## Known limitations

- **Precision.** All maths is IEEE 754 float64: not decimal-exact and not suitable for money. The raw API returns `0.30000000000000004` for `0.1 + 0.2`; integers above 2^53 lose precision.
- **Range.** JSON cannot carry NaN or Infinity. Numbers outside float64 range (e.g. `1e999`) are rejected by the JSON decoder as 400 `INVALID_JSON`, not a more specific code. Underflow returns `0` without an error.
- **Percentage overflow.** Because `a * b` is computed first, `percentage` can return 422 `RESULT_NOT_FINITE` when the product exceeds the float64 maximum even though the true answer fits (e.g. `a = 1e308, b = 50`). Chosen to keep precision on ordinary inputs.
- **`power` edge cases.** `power(0, -1)` (mathematically ±∞) and a negative base with a fractional exponent (complex result) both return 422 `RESULT_NOT_FINITE`, not a dedicated code.
- **No CORS.** The frontend must reach the API same-origin. `VITE_API_BASE_URL` pointed at another origin fails in the browser until CORS is added.
- **Request handling.** `Content-Type` is not enforced. Operation names are case-sensitive.
- **No client-side timeout.** The frontend does not time out requests itself; the backend's 10 s write timeout bounds them.
- **Not built, on purpose:** database, authentication, rate limiting, calculation history, expression parsing, frontend state/query/UI libraries.
- **Calculation log.** A plain local file with no rotation or size limit; it grows until removed. Not shared between instances.
- **Verification gaps.** No screen-reader testing; colour contrast was not measured with a tool; only Chromium was driven in browser checks, and the end-to-end suite runs only in Chromium. `main` itself has no tests.
