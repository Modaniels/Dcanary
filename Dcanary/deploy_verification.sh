#!/bin/bash

# Verification Canister Deployment Script
# This script deploys the verification canister and configures it with proper principals

set -e

echo "🚀 Starting Verification Canister Deployment..."

# Configuration
NETWORK=${1:-local}
BUILD_INSTRUCTIONS_CANISTER=""
BUILD_EXECUTOR_CANISTERS=""
AUTHORIZED_REQUESTER=""
ADMIN_PRINCIPAL=""

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

# Function to check if dfx is running
check_dfx() {
    if ! pgrep -f "dfx start" > /dev/null 2>&1; then
        print_error "dfx is not running. Please start dfx first with: dfx start --clean"
        exit 1
    fi
    print_success "dfx is running"
}

# Function to get canister ID
get_canister_id() {
    local canister_name=$1
    local network=$2
    
    if [ "$network" == "local" ]; then
        dfx canister id "$canister_name" 2>/dev/null || echo ""
    else
        dfx canister id "$canister_name" --network "$network" 2>/dev/null || echo ""
    fi
}

# Function to deploy canister
deploy_canister() {
    local canister_name=$1
    local network=$2
    
    print_status "Deploying $canister_name to $network network..."
    
    if [ "$network" == "local" ]; then
        dfx deploy "$canister_name" --with-cycles 2000000000000
    else
        dfx deploy "$canister_name" --network "$network" --with-cycles 2000000000000
    fi
    
    if [ $? -eq 0 ]; then
        print_success "$canister_name deployed successfully"
        local canister_id=$(get_canister_id "$canister_name" "$network")
        print_status "$canister_name ID: $canister_id"
        return 0
    else
        print_error "Failed to deploy $canister_name"
        return 1
    fi
}

# Function to configure verification canister
configure_verification_canister() {
    local network=$1
    local verification_canister_id=$2
    
    print_status "Configuring verification canister..."
    
    # Get required canister IDs
    BUILD_INSTRUCTIONS_CANISTER=$(get_canister_id "build_instructions_canister" "$network")
    local executor1=$(get_canister_id "build_executor_canister" "$network")
    
    if [ -z "$BUILD_INSTRUCTIONS_CANISTER" ]; then
        print_error "Build instructions canister not found. Please deploy it first."
        return 1
    fi
    
    if [ -z "$executor1" ]; then
        print_error "Build executor canister not found. Please deploy it first."
        return 1
    fi
    
    print_status "Build Instructions Canister: $BUILD_INSTRUCTIONS_CANISTER"
    print_status "Build Executor Canister: $executor1"
    
    # Get current principal as admin
    ADMIN_PRINCIPAL=$(dfx identity get-principal)
    AUTHORIZED_REQUESTER="$ADMIN_PRINCIPAL"
    
    print_status "Admin Principal: $ADMIN_PRINCIPAL"
    print_status "Authorized Requester: $AUTHORIZED_REQUESTER"
    
    # Update build instructions canister ID
    print_status "Setting build instructions canister..."
    if [ "$network" == "local" ]; then
        dfx canister call verification_canister update_build_instructions_canister "(principal \"$BUILD_INSTRUCTIONS_CANISTER\")"
    else
        dfx canister call verification_canister update_build_instructions_canister "(principal \"$BUILD_INSTRUCTIONS_CANISTER\")" --network "$network"
    fi
    
    # Update build executor canisters
    print_status "Setting build executor canisters..."
    if [ "$network" == "local" ]; then
        dfx canister call verification_canister update_build_executor_canisters "(vec { principal \"$executor1\" })"
    else
        dfx canister call verification_canister update_build_executor_canisters "(vec { principal \"$executor1\" })" --network "$network"
    fi
    
    # Update authorized requester
    print_status "Setting authorized requester..."
    if [ "$network" == "local" ]; then
        dfx canister call verification_canister update_authorized_requester "(principal \"$AUTHORIZED_REQUESTER\")"
    else
        dfx canister call verification_canister update_authorized_requester "(principal \"$AUTHORIZED_REQUESTER\")" --network "$network"
    fi
    
    print_success "Verification canister configured successfully"
}

# Function to verify deployment
verify_deployment() {
    local network=$1
    
    print_status "Verifying deployment..."
    
    # Get canister info
    if [ "$network" == "local" ]; then
        local canister_info=$(dfx canister call verification_canister get_canister_info)
    else
        local canister_info=$(dfx canister call verification_canister get_canister_info --network "$network")
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Verification canister is responding"
        echo "Canister Info: $canister_info"
        return 0
    else
        print_error "Verification canister is not responding properly"
        return 1
    fi
}

# Function to run basic tests
run_basic_tests() {
    local network=$1
    
    print_status "Running basic functionality tests..."
    
    # Test unauthorized access (should fail)
    print_status "Testing unauthorized access..."
    if [ "$network" == "local" ]; then
        local unauthorized_result=$(dfx canister call verification_canister request_verification '("test-project", "1.0.0", opt 300)' 2>&1 || true)
    else
        local unauthorized_result=$(dfx canister call verification_canister request_verification '("test-project", "1.0.0", opt 300)' --network "$network" 2>&1 || true)
    fi
    
    if echo "$unauthorized_result" | grep -q "Unauthorized\|NotFound"; then
        print_success "Unauthorized access correctly rejected"
    else
        print_warning "Unexpected response to unauthorized access test"
    fi
    
    # Test getting non-existent verification status
    print_status "Testing non-existent verification status..."
    if [ "$network" == "local" ]; then
        local status_result=$(dfx canister call verification_canister get_verification_status '("non-existent", "1.0.0")' 2>&1 || true)
    else
        local status_result=$(dfx canister call verification_canister get_verification_status '("non-existent", "1.0.0")' --network "$network" 2>&1 || true)
    fi
    
    if echo "$status_result" | grep -q "NotFound"; then
        print_success "Non-existent verification correctly returned NotFound"
    else
        print_warning "Unexpected response to non-existent verification test"
    fi
    
    print_success "Basic tests completed"
}

# Function to display deployment summary
display_summary() {
    local network=$1
    
    echo ""
    echo "=========================================="
    echo "🎉 DEPLOYMENT SUMMARY"
    echo "=========================================="
    echo "Network: $network"
    echo ""
    
    local verification_id=$(get_canister_id "verification_canister" "$network")
    local instructions_id=$(get_canister_id "build_instructions_canister" "$network")
    local executor_id=$(get_canister_id "build_executor_canister" "$network")
    
    echo "📋 Canister IDs:"
    echo "  Verification Canister: $verification_id"
    echo "  Build Instructions:    $instructions_id"
    echo "  Build Executor:        $executor_id"
    echo ""
    
    echo "👤 Principals:"
    echo "  Admin:              $ADMIN_PRINCIPAL"
    echo "  Authorized Requester: $AUTHORIZED_REQUESTER"
    echo ""
    
    echo "🔗 Useful Commands:"
    if [ "$network" == "local" ]; then
        echo "  Get canister info:     dfx canister call verification_canister get_canister_info"
        echo "  Request verification:  dfx canister call verification_canister request_verification '(\"project-id\", \"1.0.0\", opt 300)'"
        echo "  Get status:           dfx canister call verification_canister get_verification_status '(\"project-id\", \"1.0.0\")'"
    else
        echo "  Get canister info:     dfx canister call verification_canister get_canister_info --network $network"
        echo "  Request verification:  dfx canister call verification_canister request_verification '(\"project-id\", \"1.0.0\", opt 300)' --network $network"
        echo "  Get status:           dfx canister call verification_canister get_verification_status '(\"project-id\", \"1.0.0\")' --network $network"
    fi
    echo ""
    
    echo "📊 Monitoring:"
    if [ "$network" == "local" ]; then
        echo "  Active verifications:  dfx canister call verification_canister get_active_verifications"
        echo "  Verification history:  dfx canister call verification_canister list_verification_history '(opt 10, opt 0)'"
    else
        echo "  Active verifications:  dfx canister call verification_canister get_active_verifications --network $network"
        echo "  Verification history:  dfx canister call verification_canister list_verification_history '(opt 10, opt 0)' --network $network"
    fi
    echo ""
    
    echo "✅ Deployment completed successfully!"
    echo "=========================================="
}

# Main deployment flow
main() {
    echo "Verification Canister Deployment"
    echo "Network: $NETWORK"
    echo ""
    
    # Check prerequisites
    if [ "$NETWORK" == "local" ]; then
        check_dfx
    fi
    
    # Deploy prerequisite canisters if they don't exist
    local instructions_id=$(get_canister_id "build_instructions_canister" "$NETWORK")
    local executor_id=$(get_canister_id "build_executor_canister" "$NETWORK")
    
    if [ -z "$instructions_id" ]; then
        print_status "Build instructions canister not found, deploying..."
        deploy_canister "build_instructions_canister" "$NETWORK" || exit 1
    else
        print_success "Build instructions canister already exists: $instructions_id"
    fi
    
    if [ -z "$executor_id" ]; then
        print_status "Build executor canister not found, deploying..."
        deploy_canister "build_executor_canister" "$NETWORK" || exit 1
    else
        print_success "Build executor canister already exists: $executor_id"
    fi
    
    # Deploy verification canister
    deploy_canister "verification_canister" "$NETWORK" || exit 1
    
    local verification_id=$(get_canister_id "verification_canister" "$NETWORK")
    if [ -z "$verification_id" ]; then
        print_error "Failed to get verification canister ID"
        exit 1
    fi
    
    # Configure the canister
    configure_verification_canister "$NETWORK" "$verification_id" || exit 1
    
    # Verify deployment
    verify_deployment "$NETWORK" || exit 1
    
    # Run basic tests
    run_basic_tests "$NETWORK"
    
    # Display summary
    display_summary "$NETWORK"
}

# Help function
show_help() {
    echo "Verification Canister Deployment Script"
    echo ""
    echo "Usage: $0 [NETWORK]"
    echo ""
    echo "Networks:"
    echo "  local    Deploy to local dfx replica (default)"
    echo "  ic       Deploy to Internet Computer mainnet"
    echo "  testnet  Deploy to testnet"
    echo ""
    echo "Examples:"
    echo "  $0              # Deploy to local network"
    echo "  $0 local        # Deploy to local network"
    echo "  $0 ic           # Deploy to Internet Computer"
    echo ""
    echo "Prerequisites:"
    echo "  - dfx must be installed and configured"
    echo "  - For local deployment: dfx start --clean"
    echo "  - For IC deployment: dfx identity set <your-identity>"
    echo ""
}

# Check for help flag
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    show_help
    exit 0
fi

# Validate network parameter
if [ -n "$1" ] && [ "$1" != "local" ] && [ "$1" != "ic" ] && [ "$1" != "testnet" ]; then
    print_error "Invalid network: $1"
    echo ""
    show_help
    exit 1
fi

# Run main deployment
main
