#!/bin/bash

# Dcanary Webhook Integration Deployment Script

set -e

echo "🚀 Deploying Dcanary Webhook Integration..."

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

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    print_error "dfx.json not found. Please run this script from the Dcanary directory."
    exit 1
fi

# Set network (default to local)
NETWORK=${1:-local}
print_status "Deploying to network: $NETWORK"

# Install dependencies
print_status "Installing dependencies..."
npm install

# Build CLI
print_status "Building CLI..."
cd cli
npm install
npm run build
cd ..

# Deploy canisters
print_status "Deploying canisters..."

# Deploy build instructions canister
print_status "Deploying build instructions canister..."
dfx deploy build_instructions_canister --network $NETWORK

# Deploy build executor canister
print_status "Deploying build executor canister..."
dfx deploy build_executor_canister --network $NETWORK

# Deploy verification canister
print_status "Deploying verification canister..."
dfx deploy verification_canister --network $NETWORK

# Deploy webhook canister
print_status "Deploying webhook canister..."
dfx deploy webhook_canister --network $NETWORK

# Get canister IDs
print_status "Getting canister IDs..."
BUILD_INSTRUCTIONS_ID=$(dfx canister id build_instructions_canister --network $NETWORK)
BUILD_EXECUTOR_ID=$(dfx canister id build_executor_canister --network $NETWORK)
VERIFICATION_ID=$(dfx canister id verification_canister --network $NETWORK)
WEBHOOK_ID=$(dfx canister id webhook_canister --network $NETWORK)

print_success "Canisters deployed successfully!"
echo ""
echo "📋 Canister IDs:"
echo "  Build Instructions: $BUILD_INSTRUCTIONS_ID"
echo "  Build Executor:     $BUILD_EXECUTOR_ID"
echo "  Verification:       $VERIFICATION_ID"
echo "  Webhook:            $WEBHOOK_ID"
echo ""

# Configure webhook canister with verification canister
print_status "Configuring webhook canister..."
dfx canister call webhook_canister setVerificationCanister "principal \"$VERIFICATION_ID\"" --network $NETWORK

print_success "Webhook canister configured!"

# Deploy webhook handler (if Docker is available)
if command -v docker &> /dev/null; then
    print_status "Building webhook handler Docker image..."
    cd webhook-handler
    docker build -t dcanary-webhook-handler .
    print_success "Webhook handler Docker image built!"
    
    print_warning "To run the webhook handler:"
    echo "  docker run -d -p 3000:3000 \\"
    echo "    -e WEBHOOK_CANISTER_ID=$WEBHOOK_ID \\"
    echo "    -e IC_HOST=https://$NETWORK.dfinity.network \\"
    echo "    --name dcanary-webhook-handler \\"
    echo "    dcanary-webhook-handler"
    cd ..
else
    print_warning "Docker not found. Webhook handler not built."
    print_warning "Please build and deploy the webhook handler manually from the webhook-handler directory."
fi

# Run tests
if [ "$NETWORK" = "local" ]; then
    print_status "Running integration tests..."
    npm test
    print_success "Tests completed!"
fi

echo ""
print_success "🎉 Dcanary Webhook Integration deployed successfully!"
echo ""
echo "📖 Next steps:"
echo "  1. Configure your SCM repositories using the CLI:"
echo "     mody scm register <project-id> --provider github --owner <owner> --repo <repo>"
echo ""
echo "  2. Set up webhooks in your GitHub/GitLab repositories:"
if [ "$NETWORK" = "local" ]; then
    echo "     URL: http://localhost:3000/webhook/github (or /gitlab)"
else
    echo "     URL: https://$WEBHOOK_ID.ic0.app/webhook/github (or /gitlab)"
fi
echo ""
echo "  3. Start building with automatic webhook triggers!"
echo ""
echo "📚 Documentation: ./WEBHOOK_SCM_INTEGRATION.md"
echo ""
