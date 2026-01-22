#!/bin/bash

# =============================================================================
# AkreChain Caliper Benchmark Runner
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CALIPER_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$CALIPER_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if Fabric network is running
check_network() {
    print_header "Checking Fabric Network Status"
    
    if docker ps | grep -q "peer0.upps.akreditasi.local"; then
        print_success "Fabric network is running"
        return 0
    else
        print_error "Fabric network is not running"
        echo -e "${YELLOW}Please start the network first:${NC}"
        echo "  cd $PROJECT_DIR"
        echo "  ./fablo-target/fabric-docker.sh up"
        return 1
    fi
}

# Install dependencies
install_deps() {
    print_header "Installing Caliper Dependencies"
    
    cd "$CALIPER_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo "Installing npm packages..."
        npm install
    else
        print_success "Dependencies already installed"
    fi
    
    # Bind Caliper to Fabric 2.5
    echo "Binding Caliper to Fabric 2.5..."
    npx caliper bind --caliper-bind-sut fabric:2.5
    
    print_success "Caliper setup complete"
}

# Run benchmark
run_benchmark() {
    local config_file="${1:-benchmarks/config.yaml}"
    local report_name="${2:-report}"
    
    print_header "Running Benchmark: $config_file"
    
    cd "$CALIPER_DIR"
    
    # Create reports directory if not exists
    mkdir -p reports
    
    # Generate timestamp for report
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local report_file="reports/${report_name}_${timestamp}.html"
    
    echo "Starting Caliper benchmark..."
    echo "Report will be saved to: $report_file"
    echo ""
    
    npx caliper launch manager \
        --caliper-workspace . \
        --caliper-networkconfig networks/networkConfig.yaml \
        --caliper-benchconfig "$config_file" \
        --caliper-flow-only-test \
        --caliper-report-path "$report_file"
    
    print_success "Benchmark completed!"
    echo -e "${GREEN}Report saved to: $report_file${NC}"
}

# Show usage
show_usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  install     Install Caliper dependencies"
    echo "  check       Check if Fabric network is running"
    echo "  all         Run full benchmark (create + query)"
    echo "  write       Run write-only benchmark"
    echo "  read        Run read-only benchmark"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 install   # Install dependencies first"
    echo "  $0 check     # Check network status"
    echo "  $0 all       # Run full benchmark"
    echo "  $0 write     # Run write-only benchmark"
}

# Main
case "${1:-help}" in
    install)
        install_deps
        ;;
    check)
        check_network
        ;;
    all)
        check_network && run_benchmark "benchmarks/config.yaml" "full_benchmark"
        ;;
    write)
        check_network && run_benchmark "benchmarks/config-write-only.yaml" "write_benchmark"
        ;;
    read)
        check_network && run_benchmark "benchmarks/config-read-only.yaml" "read_benchmark"
        ;;
    help|*)
        show_usage
        ;;
esac
