# Mody Hybrid CI/CD Configuration Examples
# These examples show how to integrate Mody with existing CI/CD systems

## Example 1: GitHub Actions - Verification Companion

Create `.github/workflows/mody-verify.yml`:

```yaml
name: Hybrid Build with Mody Verification

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

jobs:
  # Traditional fast build for development
  traditional-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: traditional-build
          path: dist/

  # Decentralized verification for releases and main branch
  mody-verification:
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    needs: traditional-build
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Mody CLI
        run: npm install -g mody
      
      - name: Add build instructions to Mody network
        env:
          MODY_BUILD_INSTRUCTIONS_CANISTER_ID: ${{ secrets.MODY_BUILD_CANISTER_ID }}
          MODY_NETWORK: ic
        run: |
          mody add-instructions \
            --project-id ${{ github.repository }} \
            --version ${{ github.sha }} \
            --file .mody/build-instructions.sh
      
      - name: Request decentralized verification
        env:
          MODY_VERIFICATION_CANISTER_ID: ${{ secrets.MODY_VERIFICATION_CANISTER_ID }}
          MODY_NETWORK: ic
        run: |
          # Request verification and capture results
          mody request-verification \
            --project-id ${{ github.repository }} \
            --version ${{ github.sha }} \
            --timeout 900 \
            --json > mody-verification.json
          
          # Parse and validate results
          STATUS=$(jq -r '.status' mody-verification.json)
          
          if [ "$STATUS" = "Verified" ]; then
            echo "✅ Decentralized verification passed"
            echo "MODY_VERIFICATION_STATUS=verified" >> $GITHUB_ENV
          else
            echo "❌ Decentralized verification failed: $STATUS"
            echo "MODY_VERIFICATION_STATUS=failed" >> $GITHUB_ENV
            exit 1
          fi
      
      - name: Create verification badge
        if: github.ref == 'refs/heads/main'
        run: |
          echo "![Mody Verified](https://img.shields.io/badge/Mody-Verified-green)" > mody-badge.md
      
      - name: Upload Mody verification results
        uses: actions/upload-artifact@v4
        with:
          name: mody-verification
          path: |
            mody-verification.json
            mody-badge.md
```

## Example 2: Jenkins Pipeline - Hybrid Execution

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    environment {
        MODY_BUILD_INSTRUCTIONS_CANISTER_ID = credentials('mody-build-canister')
        MODY_VERIFICATION_CANISTER_ID = credentials('mody-verification-canister')
        MODY_NETWORK = 'ic'
    }
    
    stages {
        stage('Fast Development Build') {
            when {
                not { tag pattern: 'v\\d+\\.\\d+\\.\\d+', comparator: 'REGEXP' }
            }
            steps {
                echo "🚀 Running fast development build..."
                sh 'npm ci'
                sh 'npm run lint'
                sh 'npm test'
                sh 'npm run build'
                
                publishHTML([
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'coverage',
                    reportFiles: 'index.html',
                    reportName: 'Coverage Report'
                ])
            }
        }
        
        stage('Production Build with Mody') {
            when {
                tag pattern: 'v\\d+\\.\\d+\\.\\d+', comparator: 'REGEXP'
            }
            steps {
                echo "🔐 Running production build with Mody verification..."
                
                // Install Mody CLI
                sh 'npm install -g mody'
                
                // Traditional build first (for speed)
                sh 'npm ci'
                sh 'npm run build'
                sh 'npm test'
                
                script {
                    // Add build instructions to Mody
                    sh """
                        mody add-instructions \\
                            --project-id ${env.JOB_NAME} \\
                            --version ${env.TAG_NAME} \\
                            --file .mody/production-build.sh
                    """
                    
                    // Request decentralized verification
                    def verificationResult = sh(
                        script: """
                            mody request-verification \\
                                --project-id ${env.JOB_NAME} \\
                                --version ${env.TAG_NAME} \\
                                --timeout 1200 \\
                                --json
                        """,
                        returnStdout: true
                    ).trim()
                    
                    // Parse verification result
                    def verification = readJSON text: verificationResult
                    
                    if (verification.status != 'Verified') {
                        error "❌ Mody verification failed: ${verification.error ?: 'Unknown error'}"
                    }
                    
                    echo "✅ Mody verification successful!"
                    echo "🔐 Verified hash: ${verification.verifiedHash}"
                    
                    // Store verification results
                    writeJSON file: 'mody-verification-result.json', json: verification
                    archiveArtifacts artifacts: 'mody-verification-result.json'
                    
                    // Set environment variables for downstream jobs
                    env.MODY_VERIFIED_HASH = verification.verifiedHash
                    env.MODY_VERIFICATION_STATUS = 'verified'
                }
            }
        }
        
        stage('Deploy') {
            when {
                allOf {
                    tag pattern: 'v\\d+\\.\\d+\\.\\d+', comparator: 'REGEXP'
                    environment name: 'MODY_VERIFICATION_STATUS', value: 'verified'
                }
            }
            steps {
                echo "🚀 Deploying Mody-verified build..."
                echo "Verified hash: ${env.MODY_VERIFIED_HASH}"
                
                // Your deployment steps here
                sh 'echo "Deploying to production with Mody verification..."'
            }
        }
    }
    
    post {
        always {
            // Clean up
            sh 'npm cache clean --force || true'
        }
        
        success {
            echo "✅ Pipeline completed successfully"
            
            // Send success notification with Mody status
            script {
                if (env.MODY_VERIFICATION_STATUS == 'verified') {
                    emailext (
                        subject: "✅ Build ${env.TAG_NAME} - Mody Verified",
                        body: """
                        Build ${env.TAG_NAME} has been successfully verified by Mody!
                        
                        Verified Hash: ${env.MODY_VERIFIED_HASH}
                        Build URL: ${env.BUILD_URL}
                        """,
                        to: "${env.CHANGE_AUTHOR_EMAIL}"
                    )
                }
            }
        }
        
        failure {
            echo "❌ Pipeline failed"
            emailext (
                subject: "❌ Build ${env.TAG_NAME} - Failed",
                body: "Build failed. Check ${env.BUILD_URL} for details.",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
```

## Example 3: GitLab CI - Progressive Decentralization

Create `.gitlab-ci.yml`:

```yaml
# Progressive decentralization with GitLab CI
stages:
  - validate
  - build
  - test
  - verify-mody
  - deploy

variables:
  MODY_NETWORK: "ic"
  NODE_VERSION: "18"

# Fast validation for all branches
validate:
  stage: validate
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run lint
    - npm run format:check
  cache:
    paths:
      - node_modules/

# Traditional build for development
build-traditional:
  stage: build
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
  except:
    - tags

# Test stage
test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm test
    - npm run test:e2e
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

# Mody verification for releases
mody-verify:
  stage: verify-mody
  image: node:$NODE_VERSION
  variables:
    MODY_BUILD_INSTRUCTIONS_CANISTER_ID: $MODY_BUILD_CANISTER_ID
    MODY_VERIFICATION_CANISTER_ID: $MODY_VERIFICATION_CANISTER_ID
  before_script:
    - npm install -g mody
  script:
    - |
      echo "🔐 Starting Mody decentralized verification..."
      
      # Add build instructions
      mody add-instructions \
        --project-id $CI_PROJECT_PATH \
        --version $CI_COMMIT_TAG \
        --file .mody/release-build.sh
      
      # Request verification
      mody request-verification \
        --project-id $CI_PROJECT_PATH \
        --version $CI_COMMIT_TAG \
        --timeout 900 \
        --json > mody-verification.json
      
      # Check status
      MODY_STATUS=$(jq -r '.status' mody-verification.json)
      
      if [ "$MODY_STATUS" = "Verified" ]; then
        echo "✅ Mody verification successful"
        echo "MODY_VERIFIED_HASH=$(jq -r '.verifiedHash' mody-verification.json)" >> build.env
        echo "MODY_VERIFICATION_STATUS=verified" >> build.env
      else
        echo "❌ Mody verification failed: $MODY_STATUS"
        exit 1
      fi
  artifacts:
    paths:
      - mody-verification.json
    reports:
      dotenv: build.env
  only:
    - tags

# Deploy only Mody-verified releases
deploy-production:
  stage: deploy
  image: alpine:latest
  dependencies:
    - mody-verify
  script:
    - |
      if [ "$MODY_VERIFICATION_STATUS" = "verified" ]; then
        echo "🚀 Deploying Mody-verified release $CI_COMMIT_TAG"
        echo "Verified hash: $MODY_VERIFIED_HASH"
        
        # Your deployment logic here
        echo "Deploying to production..."
      else
        echo "❌ Cannot deploy: Mody verification not passed"
        exit 1
      fi
  environment:
    name: production
    url: https://your-app.com
  only:
    - tags
  when: manual  # Require manual approval for production
```

## Example 4: Docker Integration

Create `.mody/Dockerfile.verify`:

```dockerfile
# Multi-stage Dockerfile for Mody verification
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Verification stage with Mody
FROM node:18-alpine AS mody-verify

# Install Mody CLI
RUN npm install -g mody

WORKDIR /app

# Copy built application
COPY --from=builder /app .

# Copy Mody configuration
COPY .mody/ ./.mody/

# Set environment variables
ENV MODY_NETWORK=ic

# Run Mody verification
RUN mody add-instructions \
    --project-id $PROJECT_ID \
    --version $VERSION \
    --file .mody/docker-build.sh && \
    mody request-verification \
    --project-id $PROJECT_ID \
    --version $VERSION \
    --timeout 600

# Final stage - only if verification passes
FROM node:18-alpine AS production

WORKDIR /app

# Copy verified build
COPY --from=mody-verify /app/dist ./dist
COPY --from=mody-verify /app/package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Add verification metadata
COPY --from=mody-verify /app/mody-verification.json ./

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health-check.js

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

## Configuration Files

Create `.mody/config.yml`:

```yaml
# Mody project configuration
project:
  id: "your-org/your-project"
  name: "Your Project Name"
  type: "web-application"

verification:
  timeout: 900  # 15 minutes
  consensus_threshold: 51  # 51% agreement required
  
build:
  # Different build scripts for different scenarios
  development: ".mody/dev-build.sh"
  staging: ".mody/staging-build.sh"
  production: ".mody/production-build.sh"
  docker: ".mody/docker-build.sh"

integration:
  # CI/CD integration settings
  github:
    verify_on_pr: false
    verify_on_main: true
    verify_on_release: true
    
  gitlab:
    verify_on_mr: false
    verify_on_main: true
    verify_on_tag: true
    
  jenkins:
    verify_on_build: false
    verify_on_release: true

notifications:
  slack:
    webhook_url: "https://hooks.slack.com/services/..."
    channel: "#deployments"
    
  email:
    recipients: ["team@yourorg.com"]
    
  discord:
    webhook_url: "https://discord.com/api/webhooks/..."
```

These examples demonstrate how Mody can be progressively integrated into existing workflows, providing a smooth transition path to decentralized CI/CD.
