# Dcanary
Dcanary is the first decentralized CI/CD pipeline built on ICP.

## Features

### 🔄 Decentralized Build Verification
- Multiple independent build executors
- Consensus-based verification
- Tamper-proof build results

### 🔗 SCM Integration
- GitHub and GitLab webhook support
- Automatic build triggering on code changes
- Configurable build branches and events

### 🛠️ Build Instructions Management
- Version-controlled build instructions
- Project-based organization
- Secure access control

### 📊 Comprehensive CLI
- Easy project setup and management
- Build monitoring and status tracking
- Webhook configuration and testing

## Quick Start

### 1. Deploy Canisters

```bash
# Deploy all canisters locally
dfx deploy --network local

# Deploy to IC mainnet
dfx deploy --network ic
```

### 2. Install CLI

```bash
cd cli
npm install -g .
```

### 3. Configure Your Project

```bash
# Configure Dcanary
mody configure

# Add build instructions
mody add-instructions my-project v1.0.0 --file build-instructions.txt

# Register repository for webhooks
mody scm register my-project \
  --provider github \
  --owner myorg \
  --repo myrepo \
  --secret webhook-secret \
  --auto-push \
  --branches "main,develop"
```

### 4. Request Verification

```bash
# Manual verification request
mody request-verification my-project v1.0.0

# Check verification status
mody get-status verification-id
```

## Architecture

Dcanary consists of four main canisters:

1. **Build Instructions Canister** - Stores and manages build instructions
2. **Build Executor Canister** - Executes builds in isolated environments  
3. **Verification Canister** - Orchestrates verification and consensus
4. **Webhook Canister** - Handles SCM integrations and build triggers

## Documentation

- [Webhook & SCM Integration Guide](./WEBHOOK_SCM_INTEGRATION.md)
- [Verification Process](./VERIFICATION_CANISTER_README.md)
- [CLI Examples](./cli/examples/README.md)

## Getting Started

See our [documentation](./WEBHOOK_SCM_INTEGRATION.md) for detailed setup instructions and examples.
