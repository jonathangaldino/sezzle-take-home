# 0005. Same-origin API access instead of CORS

Status: Accepted

## Context

In development the frontend is served by Vite (port 5173) and the API by Go (port 8080): two origins. A browser calling the API directly would need the backend to send CORS headers and answer preflight `OPTIONS` requests (a JSON `POST` triggers a preflight).

## Decision

The browser always talks to its own origin, and something in front forwards `/api` to the backend:

- Development: `server.proxy` in `frontend/vite.config.ts` forwards `/api` to `http://localhost:8080`.
- Docker: nginx serves the production build and proxies `/api/` to the `backend` service (`frontend/nginx.conf`).

The frontend's base URL comes from `VITE_API_BASE_URL` (build-time). Empty (the default) means same origin, so requests go to `/api/v1/calculations`. The backend has no CORS middleware, and `OPTIONS` on the calculations route returns 405.

## Consequences

- No CORS configuration to get wrong, no preflight round trip, and the backend stays unaware of where the UI is hosted.
- Setting `VITE_API_BASE_URL` to a different origin will not work from a browser until CORS is added to the backend. As shipped, any value must resolve to the page's own origin.
- A proxy sits in the request path. When the backend is down the proxy answers 502/503/504 without the API's error envelope; the frontend API client treats those as "service unreachable" rather than an unexpected response.
