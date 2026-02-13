#!/bin/bash
# =============================================================================
# AGI-SEO-Optimizer Run Script
#
# Wrapper script for running the SEO agent via cron or manually.
# Handles logging, cleanup, and proper exit codes.
#
# Usage:
#   ./scripts/run.sh              # Run with docker-compose
#   ./scripts/run.sh --no-build   # Run without rebuilding
#
# Cron example (daily at 3 AM):
#   0 3 * * * /path/to/AGI-SEO-Optimizer/scripts/run.sh >> /var/log/seo-agent-cron.log 2>&1
# =============================================================================

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Logging configuration
LOG_DIR="${PROJECT_DIR}/logs"
LOG_FILE="${LOG_DIR}/seo-agent-$(date +%Y%m%d-%H%M%S).log"
LOG_RETENTION_DAYS=30

# Docker configuration
DOCKER_COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
CONTAINER_NAME="seo-agent"

# =============================================================================
# Functions
# =============================================================================

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] $*" | tee -a "$LOG_FILE"
}

log_error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

cleanup_old_logs() {
    log "Cleaning up logs older than ${LOG_RETENTION_DAYS} days..."
    find "$LOG_DIR" -name "seo-agent-*.log" -type f -mtime +${LOG_RETENTION_DAYS} -delete 2>/dev/null || true
    local deleted_count=$(find "$LOG_DIR" -name "seo-agent-*.log" -type f -mtime +${LOG_RETENTION_DAYS} 2>/dev/null | wc -l)
    log "Cleanup complete"
}

check_prerequisites() {
    # Check if docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    # Check if docker-compose or docker compose is available
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Check if docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check if docker-compose.yml exists
    if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
        log_error "docker-compose.yml not found at: $DOCKER_COMPOSE_FILE"
        exit 1
    fi

    # Check if .env file exists
    if [[ ! -f "${PROJECT_DIR}/.env" ]]; then
        log_error ".env file not found. Copy .env.example to .env and configure it."
        exit 1
    fi
}

run_agent() {
    local build_flag="--build"

    # Check for --no-build flag
    if [[ "${1:-}" == "--no-build" ]]; then
        build_flag=""
        log "Running without rebuild"
    fi

    log "Starting SEO agent..."

    # Navigate to project directory
    cd "$PROJECT_DIR"

    # Pull latest images (optional, for base image updates)
    # $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" pull

    # Run the container
    if [[ -n "$build_flag" ]]; then
        $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up --build --abort-on-container-exit 2>&1 | tee -a "$LOG_FILE"
    else
        $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up --abort-on-container-exit 2>&1 | tee -a "$LOG_FILE"
    fi

    # Capture exit code from docker-compose
    local exit_code=${PIPESTATUS[0]}

    # Clean up stopped containers
    $DOCKER_COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" down 2>&1 | tee -a "$LOG_FILE"

    return $exit_code
}

# =============================================================================
# Main
# =============================================================================

main() {
    # Create logs directory
    mkdir -p "$LOG_DIR"

    log "============================================================"
    log "AGI-SEO-Optimizer Run Started"
    log "Project: $PROJECT_DIR"
    log "Log: $LOG_FILE"
    log "============================================================"

    # Check prerequisites
    check_prerequisites

    # Clean up old logs
    cleanup_old_logs

    # Run the agent
    local start_time=$(date +%s)

    if run_agent "$@"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log "============================================================"
        log "SEO agent completed successfully"
        log "Duration: ${duration} seconds"
        log "============================================================"
        exit 0
    else
        local exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_error "============================================================"
        log_error "SEO agent failed with exit code: $exit_code"
        log_error "Duration: ${duration} seconds"
        log_error "Check logs for details: $LOG_FILE"
        log_error "============================================================"
        exit $exit_code
    fi
}

# Run main function with all arguments
main "$@"
