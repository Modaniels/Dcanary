# DCanary - Decentralized CI/CD Pipeline

> **🎯 Complete Decentralized CI/CD Pipeline**: A production-ready, secure, and scalable CI/CD system built entirely on the Internet Computer Protocol (ICP).

## 🚀 Overview

DCanary is a fully decentralized CI/CD pipeline that replaces traditional CI/CD services with on-chain logic. All pipeline execution, verification, and deployment happens on the Internet Computer blockchain, providing transparency, immutability, and decentralization.

## 🏗️ Architecture

DCanary consists of 5 core canisters that work together to provide a complete CI/CD pipeline:

1. **Webhook Canister** - Receives repository webhooks and triggers pipeline execution
2. **Pipeline Config Canister** - Stores and manages pipeline configurations
3. **Build Executor Canister** - Executes multi-stage build pipelines
4. **Verification Canister** - Provides multi-executor consensus and verification
5. **Deployment Canister** - Handles canister deployments and lifecycle management

## 🚀 Quick Start

1. **Deploy the canisters:**

   ```bash
   dfx start --background
   dfx deploy
   ```

2. **Use the CLI:**

   ```bash
   cd cli
   npm install
   npm link
   dcanary --help
   ```

3. **Create a pipeline:**

   ```bash
   dcanary init --type nodejs
   dcanary pipeline create --name "My Pipeline" --repo "github:user/repo"
   ```

## 📚 Documentation

- **[Complete Workflow Guide](./COMPLETE_WORKFLOW_GUIDE.md)** - Detailed step-by-step usage
- **[Quick Start Guide](./QUICK_START.md)** - Get started in 5 minutes
- **[Implementation Status](./IMPLEMENTATION_STATUS.md)** - Current status and features

## 🧪 Testing

```bash
npm test                    # Run all tests
dfx canister call webhook_canister getBuildQueueStatus  # Check canister status
```

## 🎯 Features

- ✅ **Fully Decentralized** - No external dependencies
- ✅ **Multi-Stage Pipelines** - Complex build workflows
- ✅ **Multi-Executor Verification** - Consensus-based verification
- ✅ **Artifact Management** - Build artifact storage and retrieval
- ✅ **Canister Deployment** - Deploy to Internet Computer
- ✅ **CLI Interface** - Easy-to-use command line tools

## 🔧 Development

This project uses Azle (TypeScript for Internet Computer) with the following structure:

- **TypeScript** for all canister logic
- **StableBTreeMap** for persistent storage
- **Result pattern** for error handling
- **Comprehensive testing** with Jest

DCanary provides the first fully decentralized CI/CD pipeline, enabling trustless, transparent, and immutable build processes on the Internet Computer blockchain! 🎉
