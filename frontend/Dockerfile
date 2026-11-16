# jsdom 31 / Vitest 5 / Vite 8 together require Node ^22.22.2 || ^24.15 || >=26.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Empty base URL: the browser calls same-origin /api, which nginx proxies.
ENV VITE_API_BASE_URL=
RUN npm run build

# Runs as non-root (uid 101) and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
