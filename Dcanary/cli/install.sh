#!/bin/bash

# Mody CLI Installation Script
# This script installs the Mody CLI on your system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18 or later."
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18 or later is required. Current version: $(node --version)"
    fi
    
    success "Node.js $(node --version) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm."
    fi
    
    success "npm $(npm --version) is installed"
}

# Install Mody CLI
install_cli() {
    info "Installing Mody CLI globally..."
    
    if npm install -g mody-cli; then
        success "Mody CLI installed successfully"
    else
        warning "Global installation failed. Trying with sudo..."
        if sudo npm install -g mody-cli; then
            success "Mody CLI installed successfully with sudo"
        else
            error "Failed to install Mody CLI"
        fi
    fi
}

# Verify installation
verify_installation() {
    info "Verifying installation..."
    
    if command -v mody &> /dev/null; then
        success "Mody CLI is available in PATH"
        mody version
    else
        error "Mody CLI is not available in PATH"
    fi
}

# Create config directory
create_config_dir() {
    CONFIG_DIR="$HOME/.mody-cli"
    
    if [ ! -d "$CONFIG_DIR" ]; then
        info "Creating configuration directory at $CONFIG_DIR"
        mkdir -p "$CONFIG_DIR/logs"
        success "Configuration directory created"
    else
        info "Configuration directory already exists"
    fi
}

# Show next steps
show_next_steps() {
    echo
    echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
    echo
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Configure your canister IDs:"
    echo "   mody configure --set-build-canister-id <your-build-canister-id>"
    echo "   mody configure --set-verification-canister-id <your-verification-canister-id>"
    echo
    echo "2. Set up your build executor canisters:"
    echo "   mody configure --set-executor-ids <executor1,executor2,executor3>"
    echo
    echo "3. Set your default network:"
    echo "   mody configure --set-network ic"
    echo
    echo "4. Get help:"
    echo "   mody --help"
    echo
    echo -e "${BLUE}Documentation:${NC} https://docs.your-org.com/mody-cli"
    echo -e "${BLUE}Examples:${NC} https://github.com/your-org/mody-cli/tree/main/examples"
    echo
}

# Main installation process
main() {
    echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         DBV CLI Installer            ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
    echo
    
    info "Starting DBV CLI installation..."
    echo
    
    # Check prerequisites
    check_nodejs
    check_npm
    echo
    
    # Install CLI
    install_cli
    echo
    
    # Create config directory
    create_config_dir
    echo
    
    # Verify installation
    verify_installation
    echo
    
    # Show next steps
    show_next_steps
}

# Run main function
main "$@"
