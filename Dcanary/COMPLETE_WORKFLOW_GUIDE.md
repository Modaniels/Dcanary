# DCanary Complete Workflow Guide: Create and Test an NPM Project

This guide shows you how to create a complete npm project and test the entire DCanary CI/CD workflow using all deployed canisters.

## Step 1: Create Test NPM Project

### 1.1 Project Setup

```bash
# Create project directory
mkdir test-npm-project
cd test-npm-project

# Initialize npm project
npm init -y
```

### 1.2 Install Dependencies

```bash
# Install production dependencies
npm install express dotenv

# Install development dependencies
npm install --save-dev \
  typescript \
  @types/node \
  @types/express \
  @types/jest \
  jest \
  ts-jest \
  ts-node \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  supertest \
  @types/supertest
```

### 1.3 Create Project Structure

```bash
# Create source directory
mkdir -p src
mkdir -p src/utils
mkdir -p src/routes
mkdir -p tests
mkdir -p dist
```

## Step 2: Configure TypeScript and Testing

### 2.1 TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests"
  ]
}
```

### 2.2 Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 2.3 ESLint Configuration (`.eslintrc.js`)

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': 'warn',
  },
};
```

### 2.4 Update package.json Scripts

```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "clean": "rm -rf dist",
    "prebuild": "npm run clean && npm run lint",
    "postbuild": "echo 'Build completed successfully'",
    "pretest": "npm run build",
    "ci": "npm run lint && npm run test:coverage && npm run build"
  }
}
```

## Step 3: Create Application Code

### 3.1 Main Application (`src/index.ts`)

```typescript
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Calculator } from './utils/calculator';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Routes
app.use('/health', healthRouter);

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'DCanary Test App',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/calculate/:operation/:a/:b', (req: Request, res: Response) => {
  const { operation, a, b } = req.params;
  const calculator = new Calculator();
  
  try {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    let result: number;
    
    switch (operation) {
      case 'add':
        result = calculator.add(numA, numB);
        break;
      case 'subtract':
        result = calculator.subtract(numA, numB);
        break;
      case 'multiply':
        result = calculator.multiply(numA, numB);
        break;
      case 'divide':
        result = calculator.divide(numA, numB);
        break;
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }
    
    res.json({
      operation,
      a: numA,
      b: numB,
      result
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

export default app;
```

### 3.2 Calculator Utility (`src/utils/calculator.ts`)

```typescript
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }

  multiply(a: number, b: number): number {
    return a * b;
  }

  divide(a: number, b: number): number {
    if (b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return a / b;
  }

  power(base: number, exponent: number): number {
    return Math.pow(base, exponent);
  }

  sqrt(number: number): number {
    if (number < 0) {
      throw new Error('Cannot calculate square root of negative number');
    }
    return Math.sqrt(number);
  }
}
```

### 3.3 Health Route (`src/routes/health.ts`)

```typescript
import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.version,
    memory: process.memoryUsage()
  });
});

healthRouter.get('/ready', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});
```

## Step 4: Create Tests

### 4.1 Calculator Tests (`tests/calculator.test.ts`)

```typescript
import { Calculator } from '../src/utils/calculator';

describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(calculator.add(2, 3)).toBe(5);
    });

    it('should add negative numbers', () => {
      expect(calculator.add(-2, -3)).toBe(-5);
    });

    it('should add positive and negative numbers', () => {
      expect(calculator.add(5, -3)).toBe(2);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers', () => {
      expect(calculator.subtract(5, 3)).toBe(2);
    });

    it('should handle negative results', () => {
      expect(calculator.subtract(3, 5)).toBe(-2);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers', () => {
      expect(calculator.multiply(4, 3)).toBe(12);
    });

    it('should handle zero multiplication', () => {
      expect(calculator.multiply(5, 0)).toBe(0);
    });
  });

  describe('divide', () => {
    it('should divide two numbers', () => {
      expect(calculator.divide(6, 2)).toBe(3);
    });

    it('should throw error when dividing by zero', () => {
      expect(() => calculator.divide(5, 0)).toThrow('Division by zero is not allowed');
    });
  });

  describe('power', () => {
    it('should calculate power correctly', () => {
      expect(calculator.power(2, 3)).toBe(8);
    });

    it('should handle power of zero', () => {
      expect(calculator.power(5, 0)).toBe(1);
    });
  });

  describe('sqrt', () => {
    it('should calculate square root', () => {
      expect(calculator.sqrt(9)).toBe(3);
    });

    it('should throw error for negative numbers', () => {
      expect(() => calculator.sqrt(-4)).toThrow('Cannot calculate square root of negative number');
    });
  });
});
```

### 4.2 API Tests (`tests/app.test.ts`)

```typescript
import request from 'supertest';
import app from '../src/index';

describe('App API', () => {
  describe('GET /', () => {
    it('should return app info', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'DCanary Test App');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /calculate', () => {
    it('should perform addition', async () => {
      const response = await request(app).get('/calculate/add/5/3');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        operation: 'add',
        a: 5,
        b: 3,
        result: 8
      });
    });

    it('should handle division by zero', async () => {
      const response = await request(app).get('/calculate/divide/5/0');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid operation', async () => {
      const response = await request(app).get('/calculate/invalid/5/3');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid operation');
    });
  });
});
```

## Step 5: Test Local Development

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Build the project
npm run build

# Start the application
npm start
```

## Step 6: Configure DCanary Pipeline

Now let's configure the DCanary CI/CD pipeline for this project.

### 6.1 Connect to DCanary Canisters

```bash
# First, let's get the canister IDs from dfx
dfx canister id pipeline_config_canister
dfx canister id webhook_canister
dfx canister id build_executor
dfx canister id verification_canister
dfx canister id deployment_canister
```

### 6.2 Use DCanary CLI

The DCanary CLI provides a simple interface to configure and manage pipelines. Once the canisters are deployed, you can use the CLI to set up your project pipeline configuration.

## Step 7: Execute Complete Workflow

### 7.1 Test Locally First

```bash
# Make sure all dependencies are installed
npm install

# Test the project locally to ensure it works
npm run ci
```

### 7.2 Connect to DCanary

```bash
# Check pipeline status using dfx
dfx canister call webhook_canister getBuildQueueStatus

# Check pipeline configuration
dfx canister call pipeline_config_canister getPipelineConfigByRepository '("github:testorg/test-npm-project")'

# Trigger manual pipeline execution
dfx canister call webhook_canister triggerPipelineExecution '(
  "github:testorg/test-npm-project",
  "manual",
  "main", 
  "manual-trigger-123",
  "Manual pipeline test",
  "https://github.com/testorg/test-npm-project/archive/main.tar.gz"
)'
```

## Step 8: Verify Results

### 8.1 Check Build Results

```bash
# Check build executor results
dfx canister call build_executor getPipelineResult '("pipeline_github_testorg_test-npm-project_123")'

# Check verification results
dfx canister call verification_canister getVerificationResult '("test-npm-project", "1.0.0")'
```

### 8.2 Check Deployment Status

```bash
# Check deployed canisters
dfx canister call deployment_canister listDeployments

# Get specific canister info
dfx canister call deployment_canister getCanisterInfo '("deployed-canister-id")'
```

## Step 9: Real Integration with DCanary CLI

### 9.1 Install DCanary CLI

```bash
# Navigate to the CLI directory
cd ../cli

# Install the CLI globally
npm install -g .

# Or link it for development
npm link

# Verify installation
dcanary --version
```

### 9.2 Initialize Project with DCanary

```bash
# Go back to your test project
cd ../test-npm-project

# Initialize DCanary configuration
dcanary init --type nodejs --name "Test NPM Project"

# Configure pipeline using CLI
dcanary pipeline create \
  --name "Node.js TypeScript CI" \
  --repo "github:testorg/test-npm-project" \
  --template nodejs-typescript

# Add stages
dcanary pipeline add-stage install \
  --runtime node \
  --commands "npm ci" \
  --timeout 5m \
  --memory 2GB

dcanary pipeline add-stage test \
  --runtime node \
  --commands "npm run test:coverage" \
  --depends-on install \
  --timeout 10m \
  --memory 4GB

dcanary pipeline add-stage build \
  --runtime node \
  --commands "npm run build" \
  --depends-on test \
  --timeout 5m \
  --memory 2GB

# Deploy the pipeline configuration
dcanary deploy-pipeline
```

### 9.3 Trigger Pipeline via CLI

```bash
# Trigger a manual build
dcanary build trigger \
  --repo "github:testorg/test-npm-project" \
  --branch main \
  --commit abc123def456

# Monitor pipeline status
dcanary build status pipeline_test_123

# Get build logs
dcanary build logs pipeline_test_123

# List all pipelines
dcanary pipeline list

# Get pipeline details
dcanary pipeline get "github:testorg/test-npm-project"
```

## Expected Results

After running through this complete workflow, you should see:

1. **✅ Local Development Works**: All npm scripts run successfully
2. **✅ Pipeline Configuration Created**: DCanary knows about your project
3. **✅ Pipeline Execution**: All stages complete successfully
4. **✅ Multi-Executor Consensus**: Verification canister confirms results
5. **✅ Deployment**: Application deployed to IC network
6. **✅ Monitoring**: Can track progress through all stages

## Troubleshooting

### Common Issues

1. **Tests Fail**: Check test coverage and fix failing tests
2. **Lint Errors**: Run `npm run lint:fix` to auto-fix issues
3. **Build Errors**: Check TypeScript configuration and imports
4. **Canister Errors**: Verify canister IDs and network connectivity
5. **Permission Errors**: Ensure you're using the correct principal for admin operations

### Debug Commands

```bash
# Check canister status
dfx canister status --all

# View canister logs
dfx canister logs webhook_canister

# Check cycles balance
dfx wallet balance

# Restart local IC network if needed
dfx stop && dfx start --clean
```

## Live Demo

Here's a simplified demo you can run:

```bash
# 1. Create the project
mkdir demo-npm-project && cd demo-npm-project
npm init -y

# 2. Install dependencies
npm install express dotenv
npm install --save-dev typescript @types/node @types/express jest ts-jest @types/jest eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin supertest @types/supertest

# 3. Copy the source files from the guide above
# (Create the TypeScript configuration, application code, and tests)

# 4. Test locally
npm run lint
npm test
npm run build

# 5. Use DCanary CLI to set up pipeline
dcanary init --type nodejs
dcanary pipeline create --name "Test Pipeline" --repo "github:user/repo"

echo "🎉 Demo completed! Your npm project is ready for DCanary CI/CD!"
```

This complete workflow demonstrates how DCanary provides a fully decentralized, verifiable, and automated CI/CD pipeline that runs entirely on the Internet Computer blockchain! 🎉
