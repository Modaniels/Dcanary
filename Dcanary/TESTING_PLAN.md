# 🧪 DCanary Testing Guide

> **How to test the world's first decentralized CI/CD pipeline** 🚀

## 🎯 Quick Test - Verify Everything Wor## 🐛 Found Issues?

Found a bug? Help us improve DCanary:

- **[GitHub Repository](https://github.com/modaniels/Dcanary)** - Report bugs and request features
- **[Main Documentation](../README.md)** - Check guides for solutions

## 📚 Learn More

- **[Quick Start Guide](./QUICK_START.md)** - Get started in 5 minutes
- **[Complete Workflow Guide](./COMPLETE_WORKFLOW_GUIDE.md)** - End-to-end tutorial  
- **[Implementation Status](./IMPLEMENTATION_STATUS.md)** - See all available features
- **[CLI Documentation](./cli/README.md)** - Command reference

## 🎉 Testing Complete

If all tests pass, congratulations! You've successfully verified that DCanary's decentralized CI/CD pipeline is working perfectly on your system.

**Welcome to the future of CI/CD!** 🐤⛓️🚀stall and Test CLI

```bash
# Install DCanary CLI
npm install -g @dcanary/cli

# Verify installation
dcanary --version
dcanary --help
```

### 2. Test with Sample Project

```bash
# Create a test project
mkdir dcanary-test && cd dcanary-test
npm init -y

# Add simple test files
echo 'console.log("Hello DCanary!");' > index.js
echo '{"scripts": {"test": "echo \"Test passed!\"", "build": "echo \"Build complete!\""}}' > package.json

# Initialize with DCanary
dcanary init --type nodejs
```

### 3. Test Pipeline Creation

```bash
# Create a pipeline
dcanary pipeline create \
  --name "Test Pipeline" \
  --repo "github:testuser/dcanary-test"

# Add stages
dcanary pipeline add-stage test --commands "npm test"
dcanary pipeline add-stage build --commands "npm run build"

# Verify pipeline was created
dcanary pipeline list
```

### 4. Test Build Execution

```bash
# Trigger a test build
dcanary build trigger --repo "github:testuser/dcanary-test"

# Monitor status
dcanary status

# View logs
dcanary logs --follow
```

## 🔍 Advanced Testing

### Test Different Project Types

```bash
# Test Rust project
mkdir rust-test && cd rust-test
cargo init
dcanary init --type rust

# Test Python project  
mkdir python-test && cd python-test
pip init .
dcanary init --type python

# Test Motoko canister
mkdir motoko-test && cd motoko-test
dfx new my-canister
dcanary init --type motoko
```

### Test CI/CD Features

```bash
# Test webhook setup
dcanary webhook setup --repo "github:user/repo"

# Test deployment
dcanary deploy setup --network ic

# Test notifications
dcanary notify setup --slack-webhook "webhook-url"
```

## 🚨 Common Issues & Solutions

### CLI Installation Issues

```bash
# If global install fails, try:
sudo npm install -g @dcanary/cli

# Or install locally:
npx @dcanary/cli --version
```

### Pipeline Creation Fails

```bash
# Check if you're logged in
dcanary auth login

# Verify repository exists
dcanary repo verify --repo "github:user/repo"
```

### Build Execution Issues

```bash
# Check pipeline status
dcanary pipeline get "repo-name"

# View detailed logs
dcanary logs --debug --pipeline-id "pipeline-123"
```

## ✅ Expected Results

When everything is working correctly, you should see:

1. **✅ CLI Commands** - All commands run without errors
2. **✅ Pipeline Creation** - Pipeline appears in `dcanary pipeline list`
3. **✅ Build Execution** - Status shows "Success" in `dcanary status`
4. **✅ Logs Available** - Build logs are visible with `dcanary logs`
5. **✅ Artifacts** - Build artifacts can be downloaded

## 🐛 Report Issues

Found a bug? Help us improve DCanary:

- **GitHub Issues**: Report bugs and request features
- **Discord**: Get help from the community
- **Documentation**: Check guides for solutions

## 🎉 Success!

If all tests pass, congratulations! You've successfully verified that DCanary's decentralized CI/CD pipeline is working perfectly on your system.

**Welcome to the future of CI/CD!** 🐤⛓️🚀
