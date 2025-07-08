#!/bin/bash

# Build Instructions Canister Deployment Script
# This script automates the deployment and testing of the canister

set -e

echo "🚀 Build Instructions Canister Deployment Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v dfx &> /dev/null; then
        print_error "dfx is not installed. Please install DFX SDK first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Start local IC replica
start_replica() {
    print_status "Starting local IC replica..."
    
    # Check if dfx is already running
    if dfx ping > /dev/null 2>&1; then
        print_warning "IC replica is already running"
    else
        dfx start --background
        print_success "IC replica started"
    fi
    
    # Wait for replica to be ready
    print_status "Waiting for replica to be ready..."
    sleep 5
}

# Deploy canister
deploy_canister() {
    print_status "Deploying canister..."
    dfx deploy
    
    # Get canister ID
    CANISTER_ID=$(dfx canister id build_instructions_canister)
    print_success "Canister deployed with ID: $CANISTER_ID"
}

# Test deployment
test_deployment() {
    print_status "Testing deployment..."
    
    # Health check
    print_status "Running health check..."
    HEALTH_RESULT=$(dfx canister call build_instructions_canister healthCheck)
    echo "Health check result: $HEALTH_RESULT"
    
    # Get canister info
    print_status "Getting canister info..."
    INFO_RESULT=$(dfx canister call build_instructions_canister getCanisterInfo)
    echo "Canister info: $INFO_RESULT"
    
    # Test list projects (should be empty)
    print_status "Testing list projects..."
    PROJECTS_RESULT=$(dfx canister call build_instructions_canister listProjects)
    echo "Projects: $PROJECTS_RESULT"
    
    # Test unauthorized access (should fail)
    print_status "Testing unauthorized access (should fail)..."
    if dfx canister call build_instructions_canister addInstructions '("test", "v1.0.0", "echo hello")' 2>/dev/null; then
        print_warning "Unauthorized access test failed - this should have been rejected"
    else
        print_success "Unauthorized access correctly rejected"
    fi
    
    print_success "All tests passed"
}

# Get deployment info
show_deployment_info() {
    echo ""
    print_status "Deployment Information"
    echo "======================"
    
    CANISTER_ID=$(dfx canister id build_instructions_canister)
    PRINCIPAL=$(dfx identity get-principal)
    
    echo "Canister ID: $CANISTER_ID"
    echo "Your Principal: $PRINCIPAL"
    echo ""
    echo "To update the admin principal, edit src/index.ts and change:"
    echo "private adminPrincipal: Principal = Principal.fromText('$PRINCIPAL');"
    echo ""
    echo "Useful commands:"
    echo "  dfx canister call build_instructions_canister healthCheck"
    echo "  dfx canister call build_instructions_canister getCanisterInfo"
    echo "  dfx canister call build_instructions_canister listProjects"
    echo ""
    echo "To stop the replica: dfx stop"
}

# Main deployment flow
main() {
    check_prerequisites
    install_dependencies
    start_replica
    deploy_canister
    test_deployment
    show_deployment_info
    
    print_success "Deployment completed successfully! 🎉"
}

# Handle command line arguments
case "${1:-deploy}" in
    "check")
        check_prerequisites
        ;;
    "install")
        install_dependencies
        ;;
    "start")
        start_replica
        ;;
    "deploy")
        main
        ;;
    "test")
        test_deployment
        ;;
    "info")
        show_deployment_info
        ;;
    "stop")
        print_status "Stopping IC replica..."
        dfx stop
        print_success "IC replica stopped"
        ;;
    *)
        echo "Usage: $0 [check|install|start|deploy|test|info|stop]"
        echo ""
        echo "Commands:"
        echo "  check   - Check prerequisites"
        echo "  install - Install dependencies"
        echo "  start   - Start IC replica"
        echo "  deploy  - Full deployment (default)"
        echo "  test    - Test deployment"
        echo "  info    - Show deployment info"
        echo "  stop    - Stop IC replica"
        exit 1
        ;;
esac
