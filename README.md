# Calculator

Full-stack calculator: a React + TypeScript frontend (Vite) and a Go REST API (standard library only).

```
frontend/   React + TypeScript app (Vite, Vitest, React Testing Library)
backend/    Go HTTP API (net/http, no third-party dependencies)
```

## Requirements

- Go 1.26+
- Node.js 20.19+ or 22.12+ and npm

## Running locally

Backend (listens on `PORT`, default `8080`):

```sh
make backend-run          # or: cd backend && go run ./cmd/api
curl localhost:8080/healthz
```

Frontend (Vite dev server; proxies `/api` to `http://localhost:8080`):

```sh
make install              # or: cd frontend && npm ci
make frontend-dev         # or: cd frontend && npm run dev
```

Copy `frontend/.env.example` to `frontend/.env.local` to point the frontend at a different API base URL.

## Common commands

| Command         | What it does                                      |
| --------------- | ------------------------------------------------- |
| `make test`     | Run backend and frontend tests                    |
| `make lint`     | `gofmt` + `go vet`, and the frontend linter       |
| `make build`    | Build the backend binary and the frontend bundle  |
| `make coverage` | Run both test suites with coverage                |

Full documentation will follow as the project progresses.
