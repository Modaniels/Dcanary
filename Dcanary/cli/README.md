# DCanary CLI - Decentralized CI/CD Pipeline for ICP

A command-line interface for the **world's first fully decentralized CI/CD pipeline** built on the Internet Computer Protocol (ICP). DCanary provides complete continuous integration and deployment capabilities without relying on centralized providers like GitHub Actions, Jenkins, or GitLab CI.

## 🌟 What is DCanary?

DCanary is revolutionizing CI/CD by moving entire pipeline execution to the blockchain. Instead of relying on centralized CI/CD providers, DCanary runs your complete build, test, and deployment workflows across multiple independent executor nodes on the Internet Computer, providing:

- **🔒 Complete Pipeline Control**: Full CI/CD workflows from code to production
- **🛡️ Tamper-proof Execution**: All pipeline runs are verifiable on-chain
- **⚡ Distributed Reliability**: No single point of failure in your deployment process
- **🌍 True Decentralization**: Your pipelines run on censorship-resistant infrastructure
- **💰 Cost Predictability**: No surprise billing or usage limits from cloud providers

## 🚀 Complete CI/CD Capabilities

DCanary provides **full CI/CD functionality**, not just verification:

### **Continuous Integration**
- **Automated Builds**: Triggered by commits, PRs, schedules, or manual triggers
- **Multi-Stage Pipelines**: Complex workflows with dependencies and conditions
- **Testing Integration**: Unit tests, integration tests, end-to-end testing
- **Code Quality Gates**: Linting, security scanning, dependency auditing
- **Artifact Management**: Build packages, containers, binaries with versioning
- **Parallel Execution**: Multiple jobs running simultaneously across executors

### **Continuous Deployment**
- **Environment Promotion**: Automated deployment through staging → production
- **Deployment Strategies**: Blue/green, canary, rolling deployments
- **Infrastructure as Code**: Automated provisioning and configuration
- **Rollback Capabilities**: Automatic rollback on deployment failures
- **Manual Approval Gates**: Human oversight for critical deployments
- **Multi-Environment**: Deploy to multiple clouds, on-premises, or hybrid

### **Pipeline Orchestration**
- **Workflow Dependencies**: Control execution order and conditions
- **Environment Variables**: Secure secret management and configuration
- **Pipeline Templates**: Reusable configurations across projects
- **Branch Strategies**: Different pipelines for different branches/environments
- **Monitoring & Alerts**: Real-time status updates and notifications

## 🚀 Hybrid Approach: Best of Both Worlds

Mody is designed to work **alongside** your existing CI/CD pipelines during the transition to full decentralization:

### Phase 1: Verification Companion (Current)
- Keep your existing GitHub Actions, Jenkins, or GitLab CI pipelines
- Add Mody verification as an additional step for critical builds
- Build trust in decentralized verification gradually

### Phase 2: Hybrid Execution (Near Future)  
- Run some jobs on traditional CI/CD, others on Mody
- Use Mody for sensitive builds requiring maximum transparency
- Traditional CI/CD for faster development iterations

### Phase 3: Full Decentralization (Future)
- Complete migration to on-chain CI/CD execution
- Blockchain-native development workflows
- True censorship-resistant deployment pipelines

## 🛠️ Features

- 🎯 **Easy Integration**: Works with existing workflows via simple CLI commands
- 🎨 **Beautiful UI**: Colored output, progress indicators, and intuitive displays  
- 📋 **Comprehensive**: Complete build verification and pipeline management
- 🔄 **CI/CD Native**: Drop-in compatibility with GitHub Actions, GitLab CI, Jenkins
- ⚙️ **Configurable**: Environment variables and persistent configuration
- 🌐 **Cross-Platform**: Works on Linux, macOS, and Windows

## 📦 Installation

### From NPM (when published)

```bash
npm install -g mody
```

### From Source

```bash
git clone <repository-url>
cd mody-cli
npm install
npm run build
npm link
```

## 🚀 Quick Start

### 1. Configure Mody

```bash
# Configure canister IDs for your decentralized pipeline
mody configure --set-build-canister-id <build_instructions_canister_id>
mody configure --set-verification-canister-id <verification_canister_id>
mody configure --set-executor-ids <executor1_id,executor2_id,executor3_id>

# Set target network (ic for mainnet, local for development)
mody configure --set-network ic
```

### 2. Add Your Build Instructions

```bash
# Define how your project should be built
mody add-instructions -p my-project -v 1.0.0 -i "npm install && npm run build"

# Or from a build script file
mody add-instructions -p my-project -v 1.0.0 -f scripts/build.sh
```

### 3. Request Decentralized Verification

```bash
# Start decentralized build verification across multiple executors
mody request-verification -p my-project -v 1.0.0

# For CI/CD integration (non-interactive)
mody request-verification -p my-project -v 1.0.0 --no-wait
```

### 4. Check Pipeline Status

```bash
# Human-readable status for development
mody get-status -p my-project -v 1.0.0

# JSON output for CI/CD automation
mody get-status -p my-project -v 1.0.0 --json
```

## 📚 Commands

### `add-instructions`

Define build instructions for your project that will be executed across the decentralized network.

```bash
mody add-instructions [options]

Options:
  -p, --project-id <project_id>        Project ID (required)
  -v, --version <version>              Project version (required)
  -i, --instruction-set <instructions> Build instructions as string
  -f, --file <file_path>               Path to file containing instructions
  -c, --canister-id <canister_id>      Build instructions canister ID
  -n, --network <network>              Network (ic or local)
  --identity <identity>                Identity to use
```

**Examples:**

```bash
# Add Node.js build instructions
mody add-instructions -p my-app -v 1.0.0 -i "npm ci && npm run build && npm test"

# Add build instructions from file  
mody add-instructions -p my-app -v 1.0.0 -f .mody/build-pipeline.sh

# Specify canister and network
mody add-instructions -p my-app -v 1.0.0 -f build.sh -c rdmx6-jaaaa-aaaaa-aaadq-cai -n ic
```

### `request-verification`

Request decentralized build verification across multiple executor nodes.

```bash
mody request-verification [options]

Options:
  -p, --project-id <project_id>    Project ID (required)
  -v, --version <version>          Project version (required)
  -c, --canister-id <canister_id>  Verification canister ID
  -t, --timeout <seconds>          Maximum wait time (default: 600)
  -n, --network <network>          Network (ic or local)
  --identity <identity>            Identity to use
  --no-wait                        Don't wait for completion
```

**Examples:**

```bash
# Request verification and monitor progress
mody request-verification -p my-app -v 1.0.0

# Set custom timeout for complex builds
mody request-verification -p my-app -v 1.0.0 -t 1800

# For CI/CD: fire and forget
mody request-verification -p my-app -v 1.0.0 --no-wait
```

### `get-status`

Check the status of your decentralized pipeline execution.

```bash
mody get-status [options]

Options:
  -p, --project-id <project_id>    Project ID (required)
  -v, --version <version>          Project version (required)
  -c, --canister-id <canister_id>  Verification canister ID
  -n, --network <network>          Network (ic or local)
  --identity <identity>            Identity to use
  --json                           Output in JSON format
```

**Examples:**

```bash
# Check status with rich formatting
mody get-status -p my-app -v 1.0.0

# JSON output for automation
mody get-status -p my-app -v 1.0.0 --json | jq '.status'
```

### `configure`

Configure Mody for your decentralized pipeline setup.

```bash
mody configure [options]

Options:
  --set-build-canister-id <id>         Set build instructions canister ID
  --set-verification-canister-id <id>  Set verification canister ID
  --set-executor-ids <ids>             Set executor canister IDs (comma-separated)
  --set-network <network>              Set default network (ic or local)
  --set-identity <identity>            Set default identity
  --set-timeout <seconds>              Set default timeout
  --show                               Show current configuration
  --reset                              Reset to defaults
```

**Examples:**

```bash
# Show current configuration
mody configure

# Configure for mainnet deployment
mody configure --set-build-canister-id rdmx6-jaaaa-aaaaa-aaadq-cai
mody configure --set-verification-canister-id rrkah-fqaaa-aaaaa-aaaaq-cai
mody configure --set-executor-ids "exec1-id,exec2-id,exec3-id"
mody configure --set-network ic

# Development setup
mody configure --set-network local --set-timeout 300

# Reset everything
mody configure --reset
```

### `version`

Show Mody version and system information.

```bash
mody version
```

## ⚙️ Configuration

Mody supports multiple configuration methods for seamless integration into any development workflow.

### Environment Variables

Configure Mody using environment variables for containerized and CI/CD environments:

```bash
export MODY_BUILD_INSTRUCTIONS_CANISTER_ID="rdmx6-jaaaa-aaaaa-aaadq-cai"
export MODY_VERIFICATION_CANISTER_ID="rrkah-fqaaa-aaaaa-aaaaq-cai"
export MODY_BUILD_EXECUTOR_CANISTER_IDS="exec1,exec2,exec3"
export MODY_NETWORK="ic"
export MODY_IDENTITY="default"
export MODY_TIMEOUT="600"
export MODY_LOG_LEVEL="info"
```

### Configuration File

Persistent configuration is stored in `~/.mody-cli/config.json`:

```json
{
  "buildInstructionsCanisterId": "rdmx6-jaaaa-aaaaa-aaadq-cai",
  "verificationCanisterId": "rrkah-fqaaa-aaaaa-aaaaq-cai", 
  "buildExecutorCanisterIds": ["exec1", "exec2", "exec3"],
  "network": "ic",
  "identity": "default",
  "timeout": 600,
  "logLevel": "info"
}
```

## 🔄 CI/CD Integration Strategies

Mody is designed to integrate smoothly with your existing CI/CD workflows, providing a gradual path to decentralization.

### Strategy 1: Verification Companion

Add Mody verification alongside your existing pipeline:

#### GitHub Actions Example

```yaml
name: Build and Verify

on:
  push:
    tags: ['v*']

jobs:
  # Your existing build job
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      # Your existing build steps
      - run: npm ci
      - run: npm run build
      - run: npm test
      
      # Upload artifacts (existing)
      - uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: dist/

  # NEW: Add decentralized verification
  verify-decentralized:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Mody CLI
        run: npm install -g mody
      
      - name: Configure Mody
        env:
          MODY_BUILD_INSTRUCTIONS_CANISTER_ID: ${{ secrets.MODY_BUILD_CANISTER_ID }}
          MODY_VERIFICATION_CANISTER_ID: ${{ secrets.MODY_VERIFICATION_CANISTER_ID }}
          MODY_NETWORK: ic
        run: |
          # Add build instructions to decentralized network
          mody add-instructions \
            --project-id ${{ github.repository }} \
            --version ${{ github.ref_name }} \
            --file .mody/build-instructions.sh
      
      - name: Request Decentralized Verification
        env:
          MODY_VERIFICATION_CANISTER_ID: ${{ secrets.MODY_VERIFICATION_CANISTER_ID }}
          MODY_NETWORK: ic
        run: |
          # Verify build on decentralized network
          mody request-verification \
            --project-id ${{ github.repository }} \
            --version ${{ github.ref_name }} \
            --timeout 900 \
            --json > verification-result.json
          
          # Check if verification passed
          if [ "$(jq -r '.status' verification-result.json)" != "Verified" ]; then
            echo "❌ Decentralized verification failed"
            exit 1
          fi
          
          echo "✅ Decentralized verification passed"
      
      - name: Upload Verification Results
        uses: actions/upload-artifact@v4
        with:
          name: mody-verification-results
          path: verification-result.json
```

### Strategy 2: Hybrid Execution

Run critical builds on Mody, development builds on traditional CI:

```yaml
name: Hybrid Pipeline

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  # Fast feedback for PRs and development
  development-build:
    if: github.event_name == 'pull_request' || github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build && npm test

  # Decentralized verification for releases
  production-verify:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Decentralized Production Build
        env:
          MODY_VERIFICATION_CANISTER_ID: ${{ secrets.MODY_VERIFICATION_CANISTER_ID }}
          MODY_NETWORK: ic
        run: |
          npm install -g mody
          
          # Production builds go through decentralized verification
          mody add-instructions \
            --project-id ${{ github.repository }} \
            --version ${{ github.ref_name }} \
            --instruction-set "npm ci && npm run build:production && npm run test:integration"
          
          mody request-verification \
            --project-id ${{ github.repository }} \
            --version ${{ github.ref_name }} \
            --timeout 1200
```

### Strategy 3: Jenkins Integration

```groovy
pipeline {
    agent any
    
    environment {
        MODY_BUILD_INSTRUCTIONS_CANISTER_ID = credentials('mody-build-canister-id')
        MODY_VERIFICATION_CANISTER_ID = credentials('mody-verification-canister-id')
        MODY_NETWORK = 'ic'
    }
    
    stages {
        stage('Traditional Build') {
            steps {
                sh 'npm ci'
                sh 'npm run build'
                sh 'npm test'
            }
        }
        
        stage('Decentralized Verification') {
            when {
                tag pattern: 'v\\d+\\.\\d+\\.\\d+', comparator: 'REGEXP'
            }
            steps {
                sh 'npm install -g mody'
                
                script {
                    // Add build instructions
                    sh """
                        mody add-instructions \
                            --project-id ${env.JOB_NAME} \
                            --version ${env.TAG_NAME} \
                            --file jenkins/build-instructions.sh
                    """
                    
                    // Request verification
                    def result = sh(
                        script: """
                            mody request-verification \
                                --project-id ${env.JOB_NAME} \
                                --version ${env.TAG_NAME} \
                                --json
                        """,
                        returnStdout: true
                    ).trim()
                    
                    def verification = readJSON text: result
                    
                    if (verification.status != 'Verified') {
                        error "Decentralized verification failed: ${verification.error}"
                    }
                    
                    echo "✅ Decentralized verification successful"
                    
                    // Archive verification results
                    writeJSON file: 'mody-verification.json', json: verification
                    archiveArtifacts artifacts: 'mody-verification.json'
                }
            }
        }
    }
}
```

### Strategy 4: GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - verify
  - deploy

# Traditional fast build for development
build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
  except:
    - tags

# Decentralized verification for releases
mody-verify:
  stage: verify
  image: node:18
  variables:
    MODY_NETWORK: "ic"
  before_script:
    - npm install -g mody
  script:
    - |
      # Configure Mody with GitLab CI variables
      mody add-instructions \
        --project-id $CI_PROJECT_PATH \
        --version $CI_COMMIT_TAG \
        --instruction-set "npm ci && npm run build:production && npm run test:e2e"
      
      # Request verification and capture result
      mody request-verification \
        --project-id $CI_PROJECT_PATH \
        --version $CI_COMMIT_TAG \
        --timeout 900 \
        --json | tee verification-result.json
      
      # Check verification status
      if [ "$(jq -r '.status' verification-result.json)" != "Verified" ]; then
        echo "Decentralized verification failed"
        exit 1
      fi
  artifacts:
    reports:
      dotenv: verification-result.json
  only:
    - tags
```

## 🎯 Exit Codes

Mody uses standard exit codes for seamless CI/CD integration:

- `0`: Success (verification completed successfully)
- `1`: Error (validation error, canister error, network issue)
- `2`: Verification pending or not found
- `3`: Unknown status or timeout

## 📝 Logging

Comprehensive logging for debugging and audit trails:

- **Location**: `~/.mody-cli/logs/`
- **Files**: 
  - `error.log`: Error messages only
  - `combined.log`: All log messages

**Control log level:**

```bash
# Command line
mody --log-level debug get-status -p my-app -v 1.0.0

# Environment variable
export MODY_LOG_LEVEL=debug
```

## 🛠️ Development

### Building from Source

```bash
git clone https://github.com/your-org/mody-cli
cd mody-cli
npm install
npm run build
```

### Development Mode

```bash
npm run dev -- <command> [options]
```

### Testing

```bash
npm test
```

## 🗺️ Roadmap

### Phase 1: Foundation (Current)
- ✅ CLI tool for decentralized verification
- ✅ Integration with existing CI/CD systems
- ✅ Build instructions management
- ✅ Multi-executor consensus verification

### Phase 2: Enhanced Integration (Q2 2025)
- 🔄 GitHub App for seamless integration
- 🔄 GitLab integration plugin
- 🔄 Advanced build artifact analysis
- 🔄 Cost optimization features

### Phase 3: Full Decentralization (Q3-Q4 2025)
- 🚀 Complete on-chain CI/CD execution
- 🚀 Decentralized artifact storage
- 🚀 Smart contract-based deployment triggers
- 🚀 Governance token for network participation

### Phase 4: Ecosystem (2026)
- 🌟 Plugin ecosystem for custom build tools
- 🌟 Integration with major package registries
- 🌟 Cross-chain deployment capabilities
- 🌟 Enterprise features and SLAs

## 💡 Use Cases

### Open Source Projects
- **Problem**: Build reproducibility and supply chain attacks
- **Solution**: Cryptographically verified builds with public audit trail

### Enterprise Software
- **Problem**: Compliance and regulatory requirements
- **Solution**: Immutable build records and tamper-proof CI/CD logs  

### Critical Infrastructure
- **Problem**: Single points of failure in CI/CD systems
- **Solution**: Distributed execution across independent nodes

### Blockchain Projects  
- **Problem**: Trust in deployment processes
- **Solution**: On-chain verification matching the decentralized nature of the product

## 🆘 Support & Community

- **📖 Documentation**: [https://docs.mody.dev](https://docs.mody.dev)
- **🐛 Issues**: [https://github.com/mody-dev/mody-cli/issues](https://github.com/mody-dev/mody-cli/issues)
- **💬 Discord**: [https://discord.gg/mody-dev](https://discord.gg/mody-dev)
- **🐦 Twitter**: [@mody_dev](https://twitter.com/mody_dev)
- **📧 Email**: support@mody.dev

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Ready to decentralize your CI/CD?** Start with `npm install -g mody` and join the future of software development! 🚀
