# Build a static binary.
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# Alpine (not distroless) so busybox wget is available for the healthcheck.
FROM alpine:3.22
COPY --from=build /out/api /usr/local/bin/api
USER nobody:nobody
ENV PORT=8080
# The working directory (/) is not writable by nobody; /tmp is.
ENV CALC_LOG_FILE=/tmp/calculations.log
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
ENTRYPOINT ["/usr/local/bin/api"]
