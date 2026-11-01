# Stage 1: Frontend SPA Build
FROM node:24-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Go Single Binary Build
FROM golang:alpine AS go-builder
WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=frontend-builder /app/internal/web/dist ./internal/web/dist

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o podsync-manager ./cmd/server

# Stage 3: Minimal Production Image (~20MB)
FROM alpine:3.21 AS runner

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

ENV PORT=3000 \
    ENV=production

COPY --from=go-builder /app/podsync-manager /app/podsync-manager

EXPOSE 3000

ENTRYPOINT ["/app/podsync-manager"]
