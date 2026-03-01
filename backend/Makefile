# =============================================================================
# MT Monitoring API - Makefile
# =============================================================================

# Variables
DOCKER_REPO ?= username/mt-monitoring
VERSION ?= $(shell date +%Y%m%d)
PLATFORMS ?= linux/amd64,linux/arm64

.PHONY: help build run test docker-build docker-push docker-buildx clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Local Development
# =============================================================================

build: ## Build binary for current platform
	CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/server ./cmd/server

run: ## Run server locally
	go run ./cmd/server

test: ## Run tests
	go test -v ./...

clean: ## Clean build artifacts
	rm -rf bin/ tmp/ data/*.db

# =============================================================================
# Docker - Single Platform
# =============================================================================

docker-build: ## Build Docker image for current platform
	docker build -t $(DOCKER_REPO):$(VERSION) -f Dockerfile.backend .
	docker tag $(DOCKER_REPO):$(VERSION) $(DOCKER_REPO):latest

docker-run: ## Run Docker container
	docker run -d -p 3001:3001 \
		-v $(PWD)/config.json:/app/config.json:ro \
		-v mt-data:/app/data \
		--name mt-monitoring \
		$(DOCKER_REPO):latest

docker-stop: ## Stop Docker container
	docker stop mt-monitoring && docker rm mt-monitoring

# =============================================================================
# Docker - Multi Platform (requires docker buildx)
# =============================================================================

docker-buildx-setup: ## Setup docker buildx for multi-arch builds
	docker buildx create --name mtbuilder --use --bootstrap || docker buildx use mtbuilder

docker-buildx: docker-buildx-setup ## Build multi-arch image (amd64 + arm64)
	docker buildx build \
		--platform $(PLATFORMS) \
		-t $(DOCKER_REPO):$(VERSION) \
		-t $(DOCKER_REPO):latest \
		-f Dockerfile.backend \
		--push .

docker-buildx-local: docker-buildx-setup ## Build multi-arch image and load locally
	docker buildx build \
		--platform linux/amd64 \
		-t $(DOCKER_REPO):$(VERSION) \
		-t $(DOCKER_REPO):latest \
		-f Dockerfile.backend \
		--load .

# =============================================================================
# Full Stack Build (Frontend + Backend)
# =============================================================================

docker-full: docker-buildx-setup ## Build full stack image (frontend + backend)
	docker buildx build \
		--platform $(PLATFORMS) \
		-t $(DOCKER_REPO):$(VERSION)-full \
		-t $(DOCKER_REPO):full \
		--push .

# =============================================================================
# Development
# =============================================================================

dev: ## Run with hot reload (requires air)
	air

docker-dev: ## Run development environment with docker-compose
	docker-compose -f docker-compose.dev.yml up --build
