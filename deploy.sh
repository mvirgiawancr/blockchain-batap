#!/bin/bash

# ============================================
# LAM-TEK 2025 - Deployment Script
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker is installed: $(docker --version)"
}

# Check if Docker Compose is installed
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose is installed: $(docker-compose --version)"
}

# Check if Fablo is installed
check_fablo() {
    if ! command -v fablo &> /dev/null; then
        print_warning "Fablo is not installed"
        print_info "Install with: sudo curl -Lf https://github.com/hyperledger-labs/fablo/releases/download/2.3.0/fablo.sh -o /usr/local/bin/fablo && sudo chmod +x /usr/local/bin/fablo"
        return 1
    fi
    print_success "Fablo is installed: $(fablo version)"
    return 0
}

# Check if environment files exist
check_env_files() {
    if [ ! -f "backend-express/.env" ]; then
        print_warning "backend-express/.env not found"
        return 1
    fi
    print_success "Backend .env file exists"
    
    if [ ! -f ".env.production" ]; then
        print_warning ".env.production not found"
        return 1
    fi
    print_success "Production .env file exists"
    return 0
}

# Get VPS IP
get_vps_ip() {
    # Try multiple methods to get public IP
    IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || \
         curl -s --max-time 5 icanhazip.com 2>/dev/null || \
         curl -s --max-time 5 ipinfo.io/ip 2>/dev/null || \
         hostname -I 2>/dev/null | awk '{print $1}')
    
    echo $IP
}

# Setup wizard
setup_wizard() {
    print_header "LAM-TEK 2025 - Setup Wizard"
    
    # Get VPS IP
    VPS_IP=$(get_vps_ip)
    if [ ! -z "$VPS_IP" ]; then
        print_info "Detected IP: $VPS_IP"
        read -p "Is this your VPS IP? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter your VPS IP address: " VPS_IP
        fi
    else
        read -p "Enter your VPS IP address: " VPS_IP
    fi
    
    # Update backend .env
    if [ ! -f "backend-express/.env" ]; then
        cp backend-express/.env.example backend-express/.env
        print_success "Created backend-express/.env from example"
    fi
    
    # Update CORS origins
    print_info "Updating CORS configuration..."
    if grep -q "CORS_ORIGINS=" backend-express/.env; then
        # Add VPS IP to existing CORS_ORIGINS if not already present
        if ! grep -q "$VPS_IP" backend-express/.env; then
            sed -i "s|CORS_ORIGINS=\(.*\)|CORS_ORIGINS=\1,http://$VPS_IP:3000|g" backend-express/.env
            print_success "Added http://$VPS_IP:3000 to CORS_ORIGINS"
        else
            print_info "VPS IP already in CORS_ORIGINS"
        fi
    fi
    
    # Create/Update .env.production
    echo "VITE_API_URL=http://$VPS_IP:8000/api/v1" > .env.production
    print_success "Created .env.production with API URL: http://$VPS_IP:8000/api/v1"
    
    # Check API keys
    print_info "Checking API keys..."
    if grep -q "your_gemini_api_key_here" backend-express/.env; then
        print_warning "Gemini API key not configured!"
        read -p "Enter Gemini API Key (or press Enter to skip): " GEMINI_KEY
        if [ ! -z "$GEMINI_KEY" ]; then
            sed -i "s/your_gemini_api_key_here/$GEMINI_KEY/g" backend-express/.env
            print_success "Gemini API key configured"
        fi
    else
        print_success "Gemini API key is configured"
    fi
    
    if grep -q "your_pinata_jwt_token_here" backend-express/.env; then
        print_warning "Pinata JWT not configured!"
        read -p "Enter Pinata JWT (or press Enter to skip): " PINATA_JWT
        if [ ! -z "$PINATA_JWT" ]; then
            sed -i "s|your_pinata_jwt_token_here|$PINATA_JWT|g" backend-express/.env
            print_success "Pinata JWT configured"
        fi
    else
        print_success "Pinata JWT is configured"
    fi
    
    print_header "Setup Complete"
    echo "Your application will be accessible at:"
    echo "  Frontend: http://$VPS_IP:3000"
    echo "  Backend:  http://$VPS_IP:8000"
    echo "  Health:   http://$VPS_IP:8000/health"
    echo ""
    print_info "Run './deploy.sh start' to start all services"
}

# Start Fabric network
start_fabric() {
    print_header "Starting Hyperledger Fabric Network"
    
    if [ -d "fablo-target" ]; then
        print_warning "Fabric network artifacts exist"
        read -p "Do you want to restart the network? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Stopping existing network..."
            fablo down
            print_info "Removing old artifacts..."
            rm -rf fablo-target
        fi
    fi
    
    if [ ! -d "fablo-target" ]; then
        print_info "Generating network configuration..."
        fablo generate
        
        print_info "Starting Fabric network..."
        fablo up
        
        print_success "Fabric network started successfully"
    else
        print_info "Starting existing Fabric network..."
        fablo up
        print_success "Fabric network started"
    fi
    
    # Wait for network to be ready
    print_info "Waiting for network to be ready..."
    sleep 10
}

# Start services with Docker Compose
start_services() {
    print_header "Starting Backend and Frontend Services"
    
    # Load environment variables
    if [ -f ".env.production" ]; then
        export $(cat .env.production | grep -v '^#' | xargs)
    fi
    
    # Build and start services
    print_info "Building Docker images..."
    docker-compose -f docker-compose.production.yml build
    
    print_info "Starting containers..."
    docker-compose -f docker-compose.production.yml up -d
    
    print_success "Services started successfully"
}

# Show service status
show_status() {
    print_header "Service Status"
    
    echo ""
    echo "=== Hyperledger Fabric Containers ==="
    docker ps --filter "name=peer" --filter "name=orderer" --filter "name=ca" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20
    
    echo ""
    echo "=== Application Containers ==="
    docker-compose -f docker-compose.production.yml ps
    
    echo ""
    
    # Get VPS IP
    VPS_IP=$(get_vps_ip)
    if [ ! -z "$VPS_IP" ]; then
        echo "=== Access URLs ==="
        echo "  Frontend:  http://$VPS_IP:3000"
        echo "  Backend:   http://$VPS_IP:8000"
        echo "  Health:    http://$VPS_IP:8000/health"
        echo ""
    fi
}

# Show logs
show_logs() {
    SERVICE=$1
    if [ -z "$SERVICE" ]; then
        print_info "Showing all application logs..."
        docker-compose -f docker-compose.production.yml logs -f --tail=100
    else
        print_info "Showing logs for $SERVICE..."
        docker-compose -f docker-compose.production.yml logs -f --tail=100 $SERVICE
    fi
}

# Stop all services
stop_all() {
    print_header "Stopping All Services"
    
    print_info "Stopping application containers..."
    docker-compose -f docker-compose.production.yml down
    
    print_info "Stopping Fabric network..."
    if command -v fablo &> /dev/null && [ -d "fablo-target" ]; then
        fablo down
    fi
    
    print_success "All services stopped"
}

# Restart services
restart_services() {
    print_header "Restarting Services"
    
    print_info "Restarting application containers..."
    docker-compose -f docker-compose.production.yml restart
    
    print_success "Services restarted"
}

# Update and rebuild
update_and_rebuild() {
    print_header "Updating and Rebuilding Services"
    
    # Pull latest code if using git
    if [ -d ".git" ]; then
        print_info "Pulling latest code from git..."
        git pull origin main
    fi
    
    # Rebuild and restart
    print_info "Rebuilding containers..."
    docker-compose -f docker-compose.production.yml down
    docker-compose -f docker-compose.production.yml build --no-cache
    docker-compose -f docker-compose.production.yml up -d
    
    print_success "Services updated and rebuilt"
}

# Full deployment
full_deploy() {
    print_header "Full Deployment - LAM-TEK 2025"
    
    # Prerequisites check
    check_docker
    check_docker_compose
    check_fablo || {
        print_error "Fablo is required for Fabric network"
        exit 1
    }
    
    # Check environment
    if ! check_env_files; then
        print_warning "Environment files not properly configured"
        print_info "Running setup wizard..."
        setup_wizard
    fi
    
    # Start Fabric
    start_fabric
    
    # Start services
    start_services
    
    # Show status
    show_status
    
    print_header "Deployment Complete!"
    VPS_IP=$(get_vps_ip)
    if [ ! -z "$VPS_IP" ]; then
        echo "Access your application at:"
        echo "  Frontend: http://$VPS_IP:3000"
        echo "  Backend:  http://$VPS_IP:8000"
        echo "  Health:   http://$VPS_IP:8000/health"
    fi
}

# Main script
main() {
    case "${1}" in
        setup)
            setup_wizard
            ;;
        start)
            full_deploy
            ;;
        stop)
            stop_all
            ;;
        restart)
            restart_services
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs ${2}
            ;;
        update)
            update_and_rebuild
            ;;
        fabric:start)
            check_fablo && start_fabric
            ;;
        fabric:stop)
            check_fablo && fablo down
            ;;
        *)
            echo "╔═══════════════════════════════════════════════════════════╗"
            echo "║   LAM-TEK 2025 - Deployment Helper                       ║"
            echo "╚═══════════════════════════════════════════════════════════╝"
            echo ""
            echo "Usage: $0 <command>"
            echo ""
            echo "Commands:"
            echo "  setup          - Run setup wizard (configure environment)"
            echo "  start          - Full deployment (Fabric + Backend + Frontend)"
            echo "  stop           - Stop all services"
            echo "  restart        - Restart application services"
            echo "  status         - Show service status and URLs"
            echo "  logs [service] - Show logs (backend/frontend or all)"
            echo "  update         - Pull latest code and rebuild"
            echo "  fabric:start   - Start only Fabric network"
            echo "  fabric:stop    - Stop only Fabric network"
            echo ""
            echo "Examples:"
            echo "  $0 setup              # First time setup"
            echo "  $0 start              # Deploy everything"
            echo "  $0 logs backend       # Show backend logs"
            echo "  $0 status             # Check what's running"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"
