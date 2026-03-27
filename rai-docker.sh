#!/bin/bash

# ==============================================================================
# Responsible AI Toolkit - Docker Compose Helper Script
# ==============================================================================
# This script provides convenient shortcuts for managing the optimized Docker
# Compose setup with various profile combinations.
# ==============================================================================

set -e

COMPOSE_FILE="docker-compose.optimized.yml"
PROJECT_NAME="responsible-ai-toolkit-optimized"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if docker compose is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not available"
        exit 1
    fi
}

# Display usage information
usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Convenient shortcuts for managing Responsible AI Toolkit services.

COMMANDS:
    ui              Start core + UI services (lightweight)
    ml              Start UI + ML capabilities (explain, fairness)
    llm             Start UI + LLM services
    security        Start UI + security and moderation services
    full            Start all services
    dev             Start recommended development setup (UI + ML-ops + Storage)
    stop            Stop all services
    down            Stop and remove all containers
    clean           Stop and remove containers, networks, and volumes
    status          Show status of all services
    logs [service]  Show logs (optionally for specific service)
    restart [svc]   Restart a service
    rebuild [svc]   Rebuild and restart a service
    shell <service> Open a shell in a service container
    help            Show this help message

EXAMPLES:
    $0 ui                    # Start UI services
    $0 ml                    # Start ML services
    $0 logs admin            # Show admin service logs
    $0 restart backend       # Restart backend service
    $0 shell rai-mongo       # Open MongoDB shell

For detailed documentation, see DOCKER_USAGE_GUIDE.md

EOF
}

# Command implementations
cmd_ui() {
    print_header "Starting UI Services"
    docker compose -f $COMPOSE_FILE --profile ui up -d
    print_success "UI services started"
    print_info "Access shell at: http://localhost:30010"
}

cmd_ml() {
    print_header "Starting UI + ML Services"
    docker compose -f $COMPOSE_FILE \
        --profile ui \
        --profile ml-ops \
        --profile explainability \
        --profile fairness \
        up -d
    print_success "ML services started"
}

cmd_llm() {
    print_header "Starting UI + LLM Services"
    docker compose -f $COMPOSE_FILE \
        --profile ui \
        --profile llm \
        up -d
    print_success "LLM services started"
}

cmd_security() {
    print_header "Starting UI + Security Services"
    docker compose -f $COMPOSE_FILE \
        --profile ui \
        --profile security \
        up -d
    print_success "Security services started"
}

cmd_full() {
    print_header "Starting All Services (Full Stack)"
    print_info "This will start 16 containers - ensure you have sufficient resources"
    docker compose -f $COMPOSE_FILE \
        --profile ui \
        --profile ml-ops \
        --profile explainability \
        --profile fairness \
        --profile privacy \
        --profile llm \
        --profile security \
        --profile storage \
        up -d
    print_success "All services started"
}

cmd_dev() {
    print_header "Starting Development Setup"
    docker compose -f $COMPOSE_FILE \
        --profile ui \
        --profile ml-ops \
        --profile storage \
        up -d
    print_success "Development services started"
}

cmd_stop() {
    print_header "Stopping All Services"
    docker compose -f $COMPOSE_FILE stop
    print_success "All services stopped"
}

cmd_down() {
    print_header "Stopping and Removing Containers"
    docker compose -f $COMPOSE_FILE down
    print_success "Containers removed"
}

cmd_clean() {
    print_header "Cleaning Up Everything"
    print_info "This will remove all containers, networks, and volumes"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f $COMPOSE_FILE down -v
        print_success "Everything cleaned up"
    else
        print_info "Cancelled"
    fi
}

cmd_status() {
    print_header "Service Status"
    docker compose -f $COMPOSE_FILE ps
}

cmd_logs() {
    local service=$1
    if [ -z "$service" ]; then
        print_header "Showing All Logs (Ctrl+C to exit)"
        docker compose -f $COMPOSE_FILE logs -f
    else
        print_header "Showing Logs for: $service"
        docker compose -f $COMPOSE_FILE logs -f "$service"
    fi
}

cmd_restart() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "Please specify a service name"
        exit 1
    fi
    print_header "Restarting Service: $service"
    docker compose -f $COMPOSE_FILE restart "$service"
    print_success "Service restarted"
}

cmd_rebuild() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "Please specify a service name"
        exit 1
    fi
    print_header "Rebuilding Service: $service"
    docker compose -f $COMPOSE_FILE build --no-cache "$service"
    docker compose -f $COMPOSE_FILE up -d "$service"
    print_success "Service rebuilt and restarted"
}

cmd_shell() {
    local service=$1
    if [ -z "$service" ]; then
        print_error "Please specify a service name"
        print_info "Available services: admin, backend, mfe, shell, etc."
        exit 1
    fi
    
    # Handle both container names (rai-*) and service names
    if [[ ! $service == rai-* ]]; then
        service="rai-$service"
    fi
    
    print_header "Opening Shell in: $service"
    
    # Special handling for MongoDB
    if [[ $service == "rai-mongo" ]]; then
        docker exec -it "$service" mongosh
    else
        docker exec -it "$service" bash || docker exec -it "$service" sh
    fi
}

# Main script
check_docker

if [ $# -eq 0 ]; then
    usage
    exit 0
fi

case "$1" in
    ui)
        cmd_ui
        ;;
    ml)
        cmd_ml
        ;;
    llm)
        cmd_llm
        ;;
    security)
        cmd_security
        ;;
    full)
        cmd_full
        ;;
    dev)
        cmd_dev
        ;;
    stop)
        cmd_stop
        ;;
    down)
        cmd_down
        ;;
    clean)
        cmd_clean
        ;;
    status)
        cmd_status
        ;;
    logs)
        cmd_logs "$2"
        ;;
    restart)
        cmd_restart "$2"
        ;;
    rebuild)
        cmd_rebuild "$2"
        ;;
    shell)
        cmd_shell "$2"
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo
        usage
        exit 1
        ;;
esac
