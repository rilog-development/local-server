# Stage 1: Build dashboard
FROM node:20-alpine AS dashboard-build
WORKDIR /app/dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=server-build /app/dist ./dist
COPY --from=dashboard-build /app/dashboard/dist ./dashboard/dist

EXPOSE 3030
VOLUME ["/app/logs"]

ENV RILOG_HOST=0.0.0.0 \
    RILOG_PORT=3030 \
    RILOG_LOGS_DIR=/app/logs \
    RILOG_FORMAT=ndjson \
    RILOG_MAX_FILE_SIZE_MB=10 \
    RILOG_TIMEZONE=UTC \
    RILOG_AUTH_ENABLED=false \
    RILOG_AUTH_PASSWORD=

CMD ["node", "dist/server.js"]
