# 🚀 DCanary CLI

**The world's first fully decentralized CI/CD pipeline for the Internet Computer Protocol (ICP)**

[![npm version](https://badge.fury.io/js/dcanary-cli.svg)](https://www.npmjs.com/package/dcanary-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org)

DCanary revolutionizes CI/CD by moving entire pipeline execution to the blockchain. Build, test, and deploy your Internet Computer applications with complete decentralization, tamper-proof execution, and no single point of failure.

## ✨ Features

### 🔒 **Fully Decentralized CI/CD**
- Complete pipeline execution on Internet Computer
- No reliance on centralized providers (GitHub Actions, Jenkins, etc.)
- Tamper-proof, verifiable builds and deployments
- Censorship-resistant infrastructure

### ⚡ **ICP-Native Integration**
- **Motoko** canister development and deployment
- **Rust** canister support with dfx integration
- **Azle (TypeScript)** canister deployment
- **Frontend DApps** with IC SDK integration
- **Multi-canister** coordination and management

### 🛠️ **Complete CI/CD Capabilities**
- Automated builds triggered by Git events
- Multi-stage pipelines with dependencies
- Testing integration (unit, integration, e2e)
- Deployment to IC mainnet and local replica
- Canister upgrade management
- Cycles monitoring and management

## 📦 Installation

### Global Installation (Recommended)
```bash
npm install -g dcanary-cli
```

### Verify Installation
```bash
dcanary --version
dcanary --help
```

## 🚀 Quick Start

### 1. Initialize Your ICP Project
```bash
# Navigate to your ICP project directory
cd my-icp-project

# Initialize DCanary pipeline
dcanary init
```

### 2. Analyze Your Project Structure
```bash
# Auto-detect project type and canisters
dcanary analyze
```

### 3. Set Up Git Integration
```bash
# Connect to GitHub with auto-deployment
dcanary integrate github --auto-deploy

# Or set up manual triggers
dcanary integrate github
```

### 4. Deploy to Internet Computer
```bash
# Deploy to local replica for testing
dcanary deploy --network local

# Deploy to IC mainnet
dcanary deploy --network ic
```

## 📖 Commands Reference

### **Core Commands**

#### `dcanary init`
Initialize a new DCanary CI/CD pipeline for your project
```bash
dcanary init [options]

Options:
  -t, --type <type>      Project type (react, vue, nodejs, python, rust, icp, custom)
  -r, --repo <repo>      Git repository URL
  -n, --name <name>      Project name
  -f, --force            Overwrite existing configuration
  --template <template>  Use a specific template
```

#### `dcanary analyze`
Analyze your project structure and detect ICP components
```bash
dcanary analyze [options]

Options:
  --output <format>      Output format (json, yaml, table)
  --save                 Save analysis results
```

#### `dcanary build`
Build your ICP project and canisters
```bash
dcanary build [options]

Options:
  --env <environment>    Build environment (development, production)
  --optimize            Enable optimization
  --target <canister>   Build specific canister
```

#### `dcanary deploy`
Deploy canisters to Internet Computer
```bash
dcanary deploy [options]

Options:
  --network <network>   Target network (ic, local)
  --canister <name>     Deploy specific canister
  --upgrade            Upgrade existing canister
  --reinstall          Reinstall canister (destructive)
```

### **Integration Commands**

#### `dcanary integrate`
Set up Git platform integration
```bash
dcanary integrate <platform> [options]

Platforms: github, gitlab, bitbucket

Options:
  --auto-deploy         Enable automatic deployment
  --branch <branch>     Target branch for deployment
  --webhook             Set up webhook integration
```

#### `dcanary status`
Check pipeline and deployment status
```bash
dcanary status [options]

Options:
  --network <network>   Check specific network
  --canister <name>     Check specific canister
  --watch              Watch for changes
```

#### `dcanary logs`
View pipeline and canister logs
```bash
dcanary logs [options]

Options:
  --follow             Follow log output
  --lines <number>     Number of lines to show
  --canister <name>    Show logs for specific canister
```

### **Management Commands**

#### `dcanary network`
Manage network configurations
```bash
dcanary network <command>

Commands:
  list                 List available networks
  add <name> <url>     Add custom network
  remove <name>        Remove network
  set-default <name>   Set default network
```

#### `dcanary secrets`
Manage pipeline secrets and environment variables
```bash
dcanary secrets <command>

Commands:
  list                 List secret names
  set <key> <value>    Set secret value
  remove <key>         Remove secret
  import <file>        Import secrets from file
```

#### `dcanary configure`
Configure DCanary settings
```bash
dcanary configure [options]

Options:
  --identity <path>    Set IC identity file path
  --wallet <id>        Set default wallet canister
  --provider <url>     Set IC provider URL
```

## 🏗️ Project Types Supported

### **ICP Canister Projects**
- **Motoko Canisters**: Native IC smart contracts
- **Rust Canisters**: High-performance IC applications
- **Azle Projects**: TypeScript/JavaScript canisters

### **Frontend DApps**
- **React + IC**: Frontend with Internet Computer integration
- **Vue + IC**: Vue.js applications with IC SDK
- **Vanilla JS**: Pure JavaScript IC frontends
- **Asset Canisters**: Static website hosting on IC

### **Full-Stack ICP Applications**
- **Multi-canister**: Backend + Frontend coordination
- **Cross-canister**: Inter-canister communication
- **Hybrid**: Traditional + IC components

## ⚙️ Configuration

DCanary uses a `.dcanary.yml` configuration file in your project root:

```yaml
# .dcanary.yml
project:
  name: "my-icp-app"
  type: "icp"
  
networks:
  local:
    provider: "http://localhost:8000"
  ic:
    provider: "https://ic0.app"

canisters:
  backend:
    type: "motoko"
    main: "src/backend/main.mo"
  frontend:
    type: "asset"
    source: "dist/"

pipeline:
  triggers:
    - push
    - pull_request
  stages:
    - build
    - test
    - deploy

deployment:
  strategy: "rolling"
  auto_upgrade: true
  cycles_threshold: 1000000000
```

## 🔐 Authentication & Identity

### IC Identity Setup
```bash
# Set IC identity for deployments
dcanary configure --identity ~/.config/dfx/identity/default/identity.pem

# Or use dfx identity
dfx identity use default
dcanary deploy --network ic
```

### Wallet Configuration
```bash
# Set default cycles wallet
dcanary configure --wallet rdmx6-jaaaa-aaaah-qcaiq-cai
```

## 🌐 Network Management

### Built-in Networks
- **local**: Local IC replica (dfx start)
- **ic**: IC mainnet (https://ic0.app)

### Custom Networks
```bash
# Add testnet
dcanary network add testnet https://testnet.dfinity.network

# Use custom network
dcanary deploy --network testnet
```

## 🔄 Deployment Strategies

### Rolling Deployment
Gradual canister upgrades with zero downtime

### Blue-Green Deployment
Switch between two identical environments

### Canary Deployment
Test with subset of users before full rollout

## 📊 Monitoring & Observability

### Canister Status
```bash
# Check all canisters
dcanary status

# Monitor cycles
dcanary status --cycles

# Watch in real-time
dcanary status --watch
```

### Logs and Debugging
```bash
# Follow canister logs
dcanary logs --follow --canister backend

# Export logs
dcanary logs --export logs.json
```

## 🔧 Advanced Usage

### Custom Build Scripts
```bash
# Use custom build command
dcanary build --script "npm run build:production"
```

### Environment Variables
```bash
# Set deployment environment
dcanary secrets set API_URL "https://api.example.com"
dcanary deploy --env production
```

### Multi-Canister Coordination
```bash
# Deploy in specific order
dcanary deploy --canister backend
dcanary deploy --canister frontend --depends backend
```

## 🛠️ Development

### Local Development
```bash
# Start local replica
dfx start --background

# Deploy locally
dcanary deploy --network local

# Watch for changes
dcanary build --watch
```

### Testing Integration
```bash
# Run tests before deployment
dcanary build --test
dcanary deploy --test-first
```

## 🐛 Troubleshooting

### Common Issues

**1. Identity/Wallet Issues**
```bash
# Check current identity
dfx identity whoami

# Switch identity
dfx identity use <identity-name>

# Re-configure DCanary
dcanary configure --identity ~/.config/dfx/identity/default/identity.pem
```

**2. Cycles Management**
```bash
# Check cycles balance
dcanary status --cycles

# Top up cycles
dfx wallet balance
dfx wallet send <canister-id> <amount>
```

**3. Network Connectivity**
```bash
# Test network connection
dcanary network list
dcanary status --network ic
```

### Debug Mode
```bash
# Enable verbose logging
dcanary --verbose <command>

# Set log level
dcanary --log-level debug <command>
```

## 📚 Examples

### Basic Motoko Project
```bash
# Initialize
dcanary init --type icp --template motoko

# Analyze structure
dcanary analyze

# Deploy
dcanary deploy --network local
```

### React + IC Frontend
```bash
# Initialize frontend project
dcanary init --type react --template ic-frontend

# Set up integration
dcanary integrate github --auto-deploy

# Deploy to IC
dcanary deploy --network ic
```

### Multi-Canister Application
```bash
# Initialize full-stack project
dcanary init --type icp --template full-stack

# Deploy backend first
dcanary deploy --canister backend --network ic

# Deploy frontend
dcanary deploy --canister frontend --network ic
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/modaniels/Dcanary/blob/main/CONTRIBUTING.md).

### Development Setup
```bash
git clone https://github.com/modaniels/Dcanary.git
cd Dcanary/cli
npm install
npm run build
npm link
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website**: [https://dcanary.io](https://dcanary.io)
- **Documentation**: [https://docs.dcanary.io](https://docs.dcanary.io)
- **GitHub**: [https://github.com/modaniels/Dcanary](https://github.com/modaniels/Dcanary)
- **NPM Package**: [https://www.npmjs.com/package/dcanary-cli](https://www.npmjs.com/package/dcanary-cli)
- **Internet Computer**: [https://internetcomputer.org](https://internetcomputer.org)

## 🙏 Acknowledgments

- **DFINITY Foundation** for the Internet Computer Protocol
- **IC Developer Community** for inspiration and feedback
- **Open Source Contributors** who make decentralization possible

---

**Built with ❤️ for the decentralized future of CI/CD**
