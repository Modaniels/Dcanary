# 🚀 DCanary NPM Project Quick Start

This guide shows you how to create and test an npm project with the DCanary decentralized CI/CD system.

## Prerequisites

```bash
# Make sure dfx is running
dfx start --clean

# Deploy all DCanary canisters
dfx deploy
```

## Quick Demo (Automated)

Run the complete demo script that creates an npm project and simulates the entire pipeline:

```bash
# Run the automated demo
./demo-npm-workflow.sh
```

This script will:
1. 📁 Create a complete npm TypeScript project with Express API
2. 🧪 Run local tests (lint, test, build) 
3. 🚀 Simulate the complete DCanary CI/CD pipeline
4. ⚙️ Show multi-canister orchestration
5. 🔍 Demonstrate multi-executor consensus  
6. 🌐 Simulate deployment to Internet Computer

## Manual Step-by-Step

If you want to understand each step:

### 1. Create Your NPM Project

```bash
# Create project directory
mkdir my-npm-project && cd my-npm-project

# Follow the complete guide
cat ../COMPLETE_WORKFLOW_GUIDE.md
```

### 2. Test Local Development

```bash
# Install dependencies
npm install

# Run the CI pipeline locally
npm run ci  # This runs: lint → test:coverage → build
```

### 3. Configure DCanary Pipeline

```bash
# Get your canister IDs
dfx canister id pipeline_config_canister
dfx canister id webhook_canister
dfx canister id build_executor
dfx canister id verification_canister  
dfx canister id deployment_canister

# Register your repository
dfx canister call webhook_canister registerRepository '(
  "my-project-1",
  variant { GitHub },
  "myorg", 
  "my-npm-project",
  "webhook-secret-123",
  true,
  true,
  vec { "main"; "develop" }
)'

# Create pipeline configuration  
dfx canister call pipeline_config_canister createPipelineFromTemplate '(
  "nodejs-typescript-template",
  "github:myorg/my-npm-project", 
  "My NPM Pipeline"
)'
```

### 4. Trigger Pipeline Execution

```bash
# Trigger a manual build
dfx canister call webhook_canister triggerPipelineExecution '(
  "github:myorg/my-npm-project",
  "manual",
  "main",
  "manual-123",
  "Manual test build", 
  "https://github.com/myorg/my-npm-project/archive/main.tar.gz"
)'
```

### 5. Monitor Pipeline Progress

```bash
# Check build queue status
dfx canister call webhook_canister getBuildQueueStatus

# Check pipeline execution
dfx canister call build_executor getPipelineResult '("pipeline_id_here")'

# Check verification status
dfx canister call verification_canister getVerificationResult '("my-project-1", "1.0.0")'

# Check deployment status
dfx canister call deployment_canister listDeployments
```

## What Makes DCanary Different

### Traditional CI/CD (GitHub Actions, Jenkins):
```yaml
# Centralized, runs on their servers
runs-on: ubuntu-latest
steps:
  - uses: actions/checkout@v2
  - run: npm test
```

### DCanary Decentralized CI/CD:
```typescript
// Runs on Internet Computer blockchain
// Distributed across hundreds of nodes worldwide  
// Tamper-proof and verifiable
{
  runtime: "node",
  commands: ["npm test"],  
  consensus_required: true,
  verification_enabled: true
}
```

## Key Benefits

✅ **Fully Decentralized**: No dependency on GitHub/GitLab infrastructure  
✅ **Censorship Resistant**: Cannot be shut down or blocked  
✅ **Verifiable Results**: Cryptographic proof of execution  
✅ **Multi-Executor Consensus**: Multiple independent verifications  
✅ **On-Chain Audit Trail**: Complete transparency  
✅ **Cost Efficient**: Pay only for cycles used  
✅ **Global Distribution**: Runs on IC nodes worldwide  

## Example Output

When you run the demo, you'll see:

```
🚀 DCanary Decentralized CI/CD Pipeline Demo
=============================================

🔹 REGISTRATION: Registering repository with webhook canister
  ✅ Repository "github:demo/demo-npm-project" registered
  ✅ Webhook canister: rrkah-fqaaa-aaaaa-aaaaq-cai

🔹 CONFIGURATION: Creating pipeline configuration  
  ✅ Pipeline configuration created
  ✅ Config canister: rdmx6-jaaaa-aaaaa-aaadq-cai
  📋 Stages: install → lint → test → build → package

🔹 TRIGGER: Webhook received from repository
  ✅ Webhook processed and validated
  ✅ Pipeline execution queued

🔹 EXECUTION: Build executor processing pipeline
  📦 Stage 1/5: install
     Runtime: node
     Commands: npm ci
  ✅ install completed successfully

  📦 Stage 2/5: lint  
     Runtime: node
     Commands: npm run lint
  ✅ lint completed successfully

  📦 Stage 3/5: test
     Runtime: node
     Commands: npm run test:coverage  
  ✅ test completed - Coverage: 95%

  📦 Stage 4/5: build
     Runtime: node
     Commands: npm run build
  ✅ build completed successfully

  📦 Stage 5/5: package
     Runtime: node
     Commands: tar -czf app.tar.gz dist/
  ✅ package completed successfully

🔹 CONSENSUS: Multiple executors validating results
  ✅ Executor-1: Build verified ✓
  ✅ Executor-2: Build verified ✓  
  ✅ Executor-3: Build verified ✓
  ✅ Consensus achieved (3/3 executors agree)

🔹 DEPLOYMENT: Deploying to Internet Computer
  ✅ WASM module validated
  ✅ Canister created and initialized
  ✅ Cycles allocated and transferred

🎉 PIPELINE COMPLETED SUCCESSFULLY!
```

## Troubleshooting

### Common Issues

1. **dfx not running**: Make sure `dfx start` is running
2. **Canister not deployed**: Run `dfx deploy` first  
3. **Permission denied**: Check you're using the right principal
4. **Tests failing**: Fix your code and try again

### Debug Commands

```bash
# Check canister status
dfx canister status --all

# View logs
dfx canister logs webhook_canister

# Check cycles
dfx wallet balance

# Restart if needed
dfx stop && dfx start --clean && dfx deploy
```

## Next Steps

1. 🔧 **Customize Pipeline**: Modify stages, add deployment targets
2. 🌐 **Real Repository**: Connect to actual GitHub/GitLab repo  
3. 🚀 **Production Deploy**: Deploy to mainnet IC network
4. 📊 **Monitoring**: Set up notifications and dashboards
5. 🔄 **Advanced Features**: Add caching, parallel execution, quality gates

---

**🎯 You now have a fully functional decentralized CI/CD pipeline running on blockchain!** 

The entire process is:
- ✅ Decentralized (no single point of failure)
- ✅ Verifiable (cryptographic proof) 
- ✅ Consensus-based (multiple executors agree)
- ✅ Tamper-proof (immutable audit trail)
- ✅ Globally distributed (IC network worldwide)
