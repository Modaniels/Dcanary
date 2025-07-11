# DCanary Decentralized CI/CD Testing Plan

## Overview
This document outlines the comprehensive testing strategy for the enhanced DCanary decentralized CI/CD system with all canisters now implemented.

## Test Environment Setup

### 1. Local IC Network Setup
```bash
# Start local IC replica
dfx start --clean

# Deploy all canisters in dependency order
dfx deploy pipeline_config_canister
dfx deploy webhook_canister  
dfx deploy build_executor
dfx deploy verification_canister
dfx deploy deployment_canister
```

### 2. Test Repository Setup
```bash
# Create test repositories with different project types
mkdir test-repos
cd test-repos

# Node.js TypeScript project
mkdir nodejs-test && cd nodejs-test
npm init -y
npm install --save-dev typescript jest
# Add package.json scripts: build, test, lint

# Rust project  
cd ../
cargo new rust-test
cd rust-test
# Add Cargo.toml dependencies and tests

# Python project
cd ../
mkdir python-test && cd python-test
pip init
# Add setup.py, requirements.txt, tests
```

## Phase 1: Unit Testing (Individual Canister Testing)

### 1.1 Pipeline Configuration Canister Tests

**Test File**: `test/pipeline_config_tests.ts`

```typescript
describe('Pipeline Configuration Canister', () => {
    test('Create pipeline configuration', async () => {
        const config = {
            repository_id: 'github:test/nodejs-app',
            name: 'Node.js CI Pipeline',
            stages: [
                {
                    name: 'install',
                    runtime: 'node',
                    commands: ['npm ci'],
                    depends_on: [],
                    timeout_minutes: 5n,
                    resource_requirements: {
                        memory_mb: 2048,
                        cpu_cores: 1,
                        storage_mb: 1024,
                        max_cycles: 1000000000n
                    }
                },
                {
                    name: 'test',
                    runtime: 'node', 
                    commands: ['npm test'],
                    depends_on: ['install'],
                    timeout_minutes: 10n,
                    resource_requirements: {
                        memory_mb: 4096,
                        cpu_cores: 2,
                        storage_mb: 2048,
                        max_cycles: 2000000000n
                    }
                }
            ],
            triggers: [
                { Push: { branches: ['main', 'develop'] } },
                { PullRequest: { target_branches: ['main'] } }
            ]
        };

        const result = await pipelineConfigCanister.createPipelineConfig(config);
        expect(result).toHaveProperty('Ok');
    });

    test('Get pipeline configuration by repository', async () => {
        const result = await pipelineConfigCanister.getPipelineConfigByRepository('github:test/nodejs-app');
        expect(result).toHaveProperty('Ok');
        expect(result.Ok.name).toBe('Node.js CI Pipeline');
    });

    test('Create pipeline from template', async () => {
        const result = await pipelineConfigCanister.createPipelineFromTemplate(
            'nodejs-typescript-template',
            'github:test/new-app',
            'New App Pipeline'
        );
        expect(result).toHaveProperty('Ok');
    });

    test('List available templates', async () => {
        const templates = await pipelineConfigCanister.listPipelineTemplates('nodejs');
        expect(templates.length).toBeGreaterThan(0);
        expect(templates[0].category).toBe('nodejs');
    });
});
```

### 1.2 Webhook Canister Tests

**Test File**: `test/webhook_canister_tests.ts`

```typescript
describe('Webhook Canister', () => {
    test('Register repository', async () => {
        const result = await webhookCanister.registerRepository(
            'test-project-1',
            { GitHub: null },
            'testorg',
            'nodejs-app',
            'webhook-secret-123',
            true, // auto_build_on_push
            true, // auto_build_on_tag
            ['main', 'develop']
        );
        expect(result).toHaveProperty('Ok');
    });

    test('Trigger pipeline execution', async () => {
        const result = await webhookCanister.triggerPipelineExecution(
            'github:testorg/nodejs-app',
            'push',
            'main',
            'abc123def456',
            'Add new feature',
            'https://github.com/testorg/nodejs-app/archive/abc123def456.tar.gz'
        );
        expect(result).toHaveProperty('Ok');
        expect(result.Ok).toHaveProperty('pipeline_id');
        expect(result.Ok).toHaveProperty('build_id');
    });

    test('Handle webhook event', async () => {
        const result = await webhookCanister.handleWebhookEvent(
            'github:testorg/nodejs-app',
            'push',
            'abc123def456',
            'main',
            'Fix critical bug'
        );
        expect(result).toHaveProperty('Ok');
    });

    test('Get build queue status', async () => {
        const queueStatus = await webhookCanister.getBuildQueueStatus();
        expect(Array.isArray(queueStatus)).toBe(true);
    });
});
```

### 1.3 Build Executor Tests

**Test File**: `test/build_executor_tests.ts`

```typescript
describe('Build Executor Canister', () => {
    test('Execute pipeline', async () => {
        const pipelineRequest = {
            repository_id: 'github:testorg/nodejs-app',
            commit_hash: 'abc123def456',
            branch: 'main',
            trigger_type: 'push',
            source_url: 'https://github.com/testorg/nodejs-app/archive/abc123def456.tar.gz',
            timestamp: BigInt(Date.now() * 1000000),
            pipeline_config: JSON.stringify({
                stages: [
                    {
                        name: 'install',
                        commands: ['npm ci'],
                        runtime: 'node'
                    },
                    {
                        name: 'test',
                        commands: ['npm test'],
                        runtime: 'node',
                        depends_on: ['install']
                    }
                ]
            })
        };

        const result = await buildExecutor.executePipeline(pipelineRequest);
        expect(result).toHaveProperty('Ok');
        expect(result.Ok.overall_success).toBe(true);
    });

    test('Get pipeline result', async () => {
        const result = await buildExecutor.getPipelineResult('pipeline_test_123');
        expect(result).toHaveProperty('Ok');
    });

    test('Get agent capabilities', async () => {
        const capabilities = await buildExecutor.getAgentCapabilities();
        expect(capabilities.supported_languages).toContain('typescript');
        expect(capabilities.installed_tools).toContain('node');
    });
});
```

### 1.4 Verification Canister Tests

**Test File**: `test/verification_canister_tests.ts`

```typescript
describe('Verification Canister', () => {
    test('Verify pipeline execution', async () => {
        const verificationRequest = {
            pipeline_id: 'pipeline_test_123',
            repository_id: 'github:testorg/nodejs-app',
            commit_hash: 'abc123def456',
            branch: 'main',
            executor_results: [
                {
                    executor_id: 'executor_1',
                    pipeline_id: 'pipeline_test_123',
                    overall_success: true,
                    stage_results: [
                        {
                            stage_name: 'install',
                            success: true,
                            exit_code: 0,
                            stdout: 'npm install completed',
                            artifacts: []
                        },
                        {
                            stage_name: 'test',
                            success: true,
                            exit_code: 0,
                            stdout: 'All tests passed',
                            artifacts: [['coverage.json', []]]
                        }
                    ]
                }
            ],
            verification_rules: {
                min_consensus_percentage: 51,
                required_executor_count: 1,
                stage_consensus_required: true,
                artifact_verification_required: false
            }
        };

        const result = await verificationCanister.verifyPipelineExecution(verificationRequest);
        expect(result).toHaveProperty('Ok');
        expect(result.Ok.consensus_achieved).toBe(true);
    });

    test('Configure quality gates', async () => {
        const qualityGates = [
            {
                name: 'Test Coverage',
                description: 'Minimum 80% test coverage required',
                gate_type: { TestCoverage: { min_percentage: 80.0 } },
                required: true,
                timeout_minutes: 5
            }
        ];

        const result = await verificationCanister.setQualityGates(
            'github:testorg/nodejs-app',
            qualityGates
        );
        expect(result).toBe(true);
    });

    test('Execute pipeline template', async () => {
        const result = await verificationCanister.execute_pipeline_template(
            'nodejs-typescript-template',
            'test-project-1',
            [
                ['NODE_VERSION', '18'],
                ['ENVIRONMENT', 'test']
            ]
        );
        expect(result).toHaveProperty('Ok');
    });
});
```

### 1.5 Deployment Canister Tests

**Test File**: `test/deployment_canister_tests.ts`

```typescript
describe('Deployment Canister', () => {
    test('Deploy canister to local network', async () => {
        const deploymentRequest = {
            canister_name: 'test-app',
            wasm_module: new Uint8Array([]), // Mock WASM module
            init_args: new Uint8Array([]),
            network: { Local: null },
            strategy: { Install: null },
            canister_id: null,
            cycles_amount: 1000000000000n,
            environment_variables: [['NODE_ENV', 'production']]
        };

        const result = await deploymentCanister.deployCanister(deploymentRequest);
        expect(result).toHaveProperty('Ok');
        expect(result.Ok).toHaveProperty('canister_id');
    });

    test('Upgrade existing canister', async () => {
        const upgradeRequest = {
            canister_name: 'test-app',
            wasm_module: new Uint8Array([]), // Updated WASM module
            init_args: new Uint8Array([]),
            network: { Local: null },
            strategy: { Upgrade: null },
            canister_id: 'rrkah-fqaaa-aaaaa-aaaaq-cai', // Existing canister
            cycles_amount: null,
            environment_variables: []
        };

        const result = await deploymentCanister.deployCanister(upgradeRequest);
        expect(result).toHaveProperty('Ok');
    });

    test('Get canister info', async () => {
        const info = await deploymentCanister.getCanisterInfo('rrkah-fqaaa-aaaaa-aaaaq-cai');
        expect(info).toHaveProperty('Ok');
        expect(info.Ok.name).toBe('test-app');
    });

    test('Manage canister cycles', async () => {
        const result = await deploymentCanister.manageCycles(
            'rrkah-fqaaa-aaaaa-aaaaq-cai',
            500000000000n
        );
        expect(result).toHaveProperty('Ok');
    });
});
```

## Phase 2: Integration Testing (Cross-Canister Communication)

### 2.1 End-to-End Pipeline Flow Test

**Test File**: `test/e2e_pipeline_test.ts`

```typescript
describe('End-to-End Pipeline Flow', () => {
    test('Complete pipeline execution flow', async () => {
        // 1. Setup: Create pipeline configuration
        const pipelineConfig = {
            repository_id: 'github:testorg/e2e-app',
            name: 'E2E Test Pipeline',
            stages: [
                {
                    name: 'checkout',
                    runtime: 'node',
                    commands: ['git clone $SOURCE_URL'],
                    depends_on: [],
                    timeout_minutes: 2n
                },
                {
                    name: 'install',
                    runtime: 'node',
                    commands: ['npm ci'],
                    depends_on: ['checkout'],
                    timeout_minutes: 5n
                },
                {
                    name: 'test',
                    runtime: 'node',
                    commands: ['npm test'],
                    depends_on: ['install'],
                    timeout_minutes: 10n
                },
                {
                    name: 'build',
                    runtime: 'node',
                    commands: ['npm run build'],
                    depends_on: ['test'],
                    timeout_minutes: 5n
                }
            ]
        };

        const configResult = await pipelineConfigCanister.createPipelineConfig(pipelineConfig);
        expect(configResult).toHaveProperty('Ok');

        // 2. Register repository with webhook canister
        const repoResult = await webhookCanister.registerRepository(
            'e2e-project',
            { GitHub: null },
            'testorg',
            'e2e-app',
            'webhook-secret-e2e',
            true,
            true,
            ['main']
        );
        expect(repoResult).toHaveProperty('Ok');

        // 3. Trigger pipeline execution via webhook
        const triggerResult = await webhookCanister.triggerPipelineExecution(
            'github:testorg/e2e-app',
            'push',
            'main',
            'e2e-commit-hash',
            'E2E test commit',
            'https://github.com/testorg/e2e-app/archive/e2e-commit-hash.tar.gz'
        );
        expect(triggerResult).toHaveProperty('Ok');

        const pipelineId = triggerResult.Ok.pipeline_id;

        // 4. Wait for pipeline execution to complete
        // (In real testing, this would involve polling or webhook notifications)
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 5. Verify pipeline results
        const pipelineResult = await buildExecutor.getPipelineResult(pipelineId);
        expect(pipelineResult).toHaveProperty('Ok');
        expect(pipelineResult.Ok.overall_success).toBe(true);

        // 6. Check verification canister consensus
        const verificationStatus = await verificationCanister.get_verification_status(
            'e2e-project',
            '1.0.0'
        );
        expect(verificationStatus).toHaveProperty('Ok');
        expect(verificationStatus.Ok.status).toEqual({ Verified: null });

        // 7. If verification passed, check deployment
        if ('Verified' in verificationStatus.Ok.status) {
            const deploymentResult = await deploymentCanister.deployCanister({
                canister_name: 'e2e-app',
                wasm_module: new Uint8Array([]), // Mock built WASM
                init_args: new Uint8Array([]),
                network: { Local: null },
                strategy: { Install: null },
                canister_id: null,
                cycles_amount: 1000000000000n,
                environment_variables: []
            });
            expect(deploymentResult).toHaveProperty('Ok');
        }
    });
});
```

### 2.2 Multi-Executor Consensus Test

```typescript
describe('Multi-Executor Consensus', () => {
    test('Consensus with multiple build executors', async () => {
        // Setup multiple build executor results
        const executorResults = [
            {
                executor_id: 'executor_1',
                pipeline_id: 'consensus_test',
                overall_success: true,
                stage_results: [
                    { stage_name: 'build', success: true, artifacts: [['app.wasm', [1,2,3]]] }
                ]
            },
            {
                executor_id: 'executor_2', 
                pipeline_id: 'consensus_test',
                overall_success: true,
                stage_results: [
                    { stage_name: 'build', success: true, artifacts: [['app.wasm', [1,2,3]]] }
                ]
            },
            {
                executor_id: 'executor_3',
                pipeline_id: 'consensus_test', 
                overall_success: true,
                stage_results: [
                    { stage_name: 'build', success: true, artifacts: [['app.wasm', [1,2,3]]] }
                ]
            }
        ];

        const verificationRequest = {
            pipeline_id: 'consensus_test',
            repository_id: 'github:test/consensus-app',
            commit_hash: 'consensus-hash',
            branch: 'main',
            executor_results: executorResults,
            verification_rules: {
                min_consensus_percentage: 67, // 2/3 consensus
                required_executor_count: 3,
                stage_consensus_required: true,
                artifact_verification_required: true
            }
        };

        const result = await verificationCanister.verifyPipelineExecution(verificationRequest);
        expect(result).toHaveProperty('Ok');
        expect(result.Ok.consensus_achieved).toBe(true);
        expect(result.Ok.consensus_count).toBeGreaterThanOrEqual(2);
    });
});
```

## Phase 3: Performance Testing

### 3.1 Concurrent Pipeline Execution Test

```typescript
describe('Performance Tests', () => {
    test('Concurrent pipeline executions', async () => {
        const concurrentPipelines = 10;
        const promises = [];

        for (let i = 0; i < concurrentPipelines; i++) {
            const promise = webhookCanister.triggerPipelineExecution(
                `github:testorg/concurrent-app-${i}`,
                'push',
                'main',
                `commit-hash-${i}`,
                `Concurrent test ${i}`,
                `https://github.com/testorg/concurrent-app-${i}/archive/commit-hash-${i}.tar.gz`
            );
            promises.push(promise);
        }

        const results = await Promise.all(promises);
        
        // All pipelines should trigger successfully
        results.forEach(result => {
            expect(result).toHaveProperty('Ok');
        });

        // Check build queue can handle concurrent requests
        const queueStatus = await webhookCanister.getBuildQueueStatus();
        expect(queueStatus.length).toBeGreaterThanOrEqual(0);
    });

    test('Large pipeline with many stages', async () => {
        const largeStages = [];
        for (let i = 0; i < 20; i++) {
            largeStages.push({
                name: `stage-${i}`,
                runtime: 'node',
                commands: [`echo "Stage ${i}"`],
                depends_on: i > 0 ? [`stage-${i-1}`] : [],
                timeout_minutes: 1n,
                resource_requirements: {
                    memory_mb: 512,
                    cpu_cores: 1,
                    storage_mb: 512,
                    max_cycles: 100000000n
                }
            });
        }

        const largePipelineConfig = {
            repository_id: 'github:testorg/large-pipeline',
            name: 'Large Pipeline Test',
            stages: largeStages
        };

        const configResult = await pipelineConfigCanister.createPipelineConfig(largePipelineConfig);
        expect(configResult).toHaveProperty('Ok');

        const triggerResult = await webhookCanister.triggerPipelineExecution(
            'github:testorg/large-pipeline',
            'push',
            'main',
            'large-commit-hash',
            'Large pipeline test',
            'https://github.com/testorg/large-pipeline/archive/large-commit-hash.tar.gz'
        );
        expect(triggerResult).toHaveProperty('Ok');
    });
});
```

## Phase 4: Security Testing

### 4.1 Access Control Tests

```typescript
describe('Security Tests', () => {
    test('Unauthorized access prevention', async () => {
        // Test with non-admin principal
        const unauthorizedPrincipal = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');
        
        // Should fail to create pipeline config
        const configResult = await pipelineConfigCanister.createPipelineConfig({
            repository_id: 'unauthorized-repo',
            name: 'Unauthorized Pipeline'
        });
        // Expect unauthorized error or failure
        
        // Should fail to deploy canister
        const deployResult = await deploymentCanister.deployCanister({
            canister_name: 'unauthorized-canister',
            wasm_module: new Uint8Array([]),
            network: { Local: null },
            strategy: { Install: null }
        });
        // Expect unauthorized error
    });

    test('Input validation and sanitization', async () => {
        // Test with malicious input
        const maliciousConfig = {
            repository_id: '../../../etc/passwd',
            name: '<script>alert("xss")</script>',
            stages: [
                {
                    name: 'malicious',
                    commands: ['rm -rf /', 'sudo apt install malware'],
                    runtime: 'shell'
                }
            ]
        };

        const result = await pipelineConfigCanister.createPipelineConfig(maliciousConfig);
        // Should either sanitize input or reject with validation error
        expect(result).toHaveProperty('Err');
    });
});
```

## Test Execution Plan

### Day 1-2: Unit Testing
```bash
# Run individual canister tests
npm test -- test/pipeline_config_tests.ts
npm test -- test/webhook_canister_tests.ts  
npm test -- test/build_executor_tests.ts
npm test -- test/verification_canister_tests.ts
npm test -- test/deployment_canister_tests.ts
```

### Day 3-4: Integration Testing
```bash
# Run cross-canister communication tests
npm test -- test/e2e_pipeline_test.ts
npm test -- test/consensus_tests.ts
```

### Day 5: Performance & Security Testing
```bash
# Run performance and security tests
npm test -- test/performance_tests.ts
npm test -- test/security_tests.ts
```

### Day 6-7: Full System Testing
```bash
# Run complete test suite
npm test

# Test with real repositories
./scripts/test-real-repos.sh
```

## Success Criteria

### Unit Tests
- [ ] All canister methods execute without errors
- [ ] Proper error handling for invalid inputs
- [ ] Correct data persistence across canister upgrades

### Integration Tests  
- [ ] Successful cross-canister communication
- [ ] End-to-end pipeline execution completes
- [ ] Multi-executor consensus achieves correct results

### Performance Tests
- [ ] Handle 10+ concurrent pipeline executions
- [ ] Process pipelines with 20+ stages
- [ ] Maintain response times under 5 seconds

### Security Tests
- [ ] Unauthorized access properly blocked
- [ ] Malicious input sanitized or rejected
- [ ] Admin functions restricted to authorized principals

## Test Data and Mocking

### Mock Repositories
- **Node.js TypeScript**: Standard web application with Jest tests
- **Rust Canister**: IC canister with Cargo tests
- **Python FastAPI**: REST API with pytest tests
- **Multi-language**: Monorepo with multiple project types

### Mock WASM Modules
- Simple counter canister WASM for deployment tests
- Complex DeFi canister WASM for upgrade tests
- Invalid WASM for error handling tests

### Test Networks
- **Local**: DFX local replica for fast testing
- **Testnet**: IC testnet for realistic network testing
- **Custom**: Mock network for edge case testing

This comprehensive testing plan ensures the DCanary decentralized CI/CD system is production-ready and reliable across all use cases.
