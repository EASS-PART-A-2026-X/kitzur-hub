# Kitzur Hub frontend: build the React app, then serve it with an unprivileged nginx.

FROM node:22-alpine AS build
WORKDIR /app
# Dependencies first: this layer is cached until package.json or the lockfile change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# The base image already runs as a non-root user and listens on 8080.
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
