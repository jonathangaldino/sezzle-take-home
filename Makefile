.PHONY: install backend-run backend-test backend-lint backend-build backend-coverage \
	frontend-dev frontend-test frontend-lint frontend-build frontend-coverage \
	test lint build coverage docker-up docker-down

install:
	cd frontend && npm ci

backend-run:
	cd backend && go run ./cmd/api

backend-test:
	cd backend && go test ./...

backend-lint:
	cd backend && test -z "$$(gofmt -l .)" || (gofmt -l . && exit 1)
	cd backend && go vet ./...

backend-build:
	cd backend && go build -o bin/api ./cmd/api

backend-coverage:
	cd backend && go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out

frontend-dev:
	cd frontend && npm run dev

frontend-test:
	cd frontend && npm run test

frontend-lint:
	cd frontend && npm run lint

frontend-build:
	cd frontend && npm run build

frontend-coverage:
	cd frontend && npm run test:coverage

test: backend-test frontend-test
lint: backend-lint frontend-lint
build: backend-build frontend-build
coverage: backend-coverage frontend-coverage

docker-up:
	docker compose up --build

docker-down:
	docker compose down
