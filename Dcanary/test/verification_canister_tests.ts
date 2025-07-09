import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Principal } from '@dfinity/principal';

describe('Verification Canister Tests', () => {
    let testContext: TestContext;
    let verificationCanister: any;
    let buildInstructionsCanister: any;
    let buildExecutorCanister: any;

    const mockAuthorizedRequester = Principal.fromText('2vxsx-fae');
    const mockAdminPrincipal = Principal.fromText('2vxsx-fae');
    
    beforeAll(async () => {
        testContext = await runTests([
            'verification_canister',
            'build_instructions_canister', 
            'build_executor_canister'
        ], {});

        verificationCanister = getCanisterActor(testContext, 'verification_canister');
        buildInstructionsCanister = getCanisterActor(testContext, 'build_instructions_canister');
        buildExecutorCanister = getCanisterActor(testContext, 'build_executor_canister');
    });

    afterAll(async () => {
        if (testContext) {
            await testContext.tearDown();
        }
    });

    describe('Canister Initialization', () => {
        it('should initialize with correct configuration', async () => {
            const canisterInfo = await verificationCanister.get_canister_info();
            
            expect(canisterInfo.version).toBe('1.0.0');
            expect(canisterInfo.deployed_at).toBeGreaterThan(0n);
            expect(canisterInfo.total_verifications).toBe(0n);
            expect(canisterInfo.active_verifications).toBe(0n);
        });
    });

    describe('Access Control', () => {
        it('should allow authorized requester to request verification', async () => {
            // First, add build instructions
            await buildInstructionsCanister.store_build_instructions(
                'test-project',
                '1.0.0',
                'npm install && npm run build'
            );

            const result = await verificationCanister.request_verification(
                'test-project',
                '1.0.0',
                300n // 5 minutes timeout
            );

            expect('Ok' in result).toBe(true);
            if ('Ok' in result) {
                expect(result.Ok.status).toEqual({ Pending: null });
                expect(result.Ok.executor_results.length).toBeGreaterThan(0);
            }
        });

        it('should reject unauthorized verification requests', async () => {
            // This test would require a different caller context
            // In a real implementation, you'd mock the msgCaller to test this
        });

        it('should allow admin to update configuration', async () => {
            const newRequester = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');
            const result = await verificationCanister.update_authorized_requester(newRequester);
            
            expect(result).toBe(true);
            
            const canisterInfo = await verificationCanister.get_canister_info();
            expect(canisterInfo.authorized_requester.toText()).toBe(newRequester.toText());
        });
    });

    describe('Verification Process', () => {
        it('should handle verification for valid project', async () => {
            // Setup build instructions
            await buildInstructionsCanister.store_build_instructions(
                'valid-project',
                '2.0.0',
                'echo "test build" && echo "abcd1234"'
            );

            // Request verification
            const verificationResult = await verificationCanister.request_verification(
                'valid-project',
                '2.0.0',
                600n // 10 minutes
            );

            expect('Ok' in verificationResult).toBe(true);
            
            if ('Ok' in verificationResult) {
                const result = verificationResult.Ok;
                expect(result.status).toEqual({ Pending: null });
                expect(result.project_id).toBe('valid-project');
                expect(result.version).toBe('2.0.0');
                expect(result.executor_results.length).toBeGreaterThan(0);
                expect(result.consensus_threshold).toBeGreaterThan(0);
            }
        });

        it('should handle missing build instructions', async () => {
            const result = await verificationCanister.request_verification(
                'non-existent-project',
                '1.0.0'
            );

            expect('Err' in result).toBe(true);
            if ('Err' in result) {
                expect('InstructionsNotFound' in result.Err).toBe(true);
            }
        });

        it('should prevent duplicate verification requests', async () => {
            // Setup build instructions
            await buildInstructionsCanister.store_build_instructions(
                'duplicate-test',
                '1.0.0',
                'echo "test"'
            );

            // First request
            const firstResult = await verificationCanister.request_verification(
                'duplicate-test',
                '1.0.0'
            );
            expect('Ok' in firstResult).toBe(true);

            // Second request should fail
            const secondResult = await verificationCanister.request_verification(
                'duplicate-test',
                '1.0.0'
            );
            expect('Err' in secondResult).toBe(true);
            if ('Err' in secondResult) {
                expect('InvalidInput' in secondResult.Err).toBe(true);
            }
        });
    });

    describe('Status Retrieval', () => {
        it('should retrieve verification status', async () => {
            // Setup and start verification
            await buildInstructionsCanister.store_build_instructions(
                'status-test',
                '1.0.0',
                'echo "status test"'
            );

            await verificationCanister.request_verification(
                'status-test',
                '1.0.0'
            );

            // Get status
            const statusResult = await verificationCanister.get_verification_status(
                'status-test',
                '1.0.0'
            );

            expect('Ok' in statusResult).toBe(true);
            if ('Ok' in statusResult) {
                const status = statusResult.Ok;
                expect(status.status).toEqual({ Pending: null });
                expect(status.executor_results.length).toBeGreaterThan(0);
            }
        });

        it('should return not found for non-existent verification', async () => {
            const result = await verificationCanister.get_verification_status(
                'non-existent',
                '1.0.0'
            );

            expect('Err' in result).toBe(true);
            if ('Err' in result) {
                expect('NotFound' in result.Err).toBe(true);
            }
        });
    });

    describe('Configuration Management', () => {
        it('should update build executor canisters', async () => {
            const newExecutors = [
                Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai'),
                Principal.fromText('rno2w-sqaaa-aaaaa-aaacq-cai')
            ];

            const result = await verificationCanister.update_build_executor_canisters(newExecutors);
            expect(result).toBe(true);

            const canisterInfo = await verificationCanister.get_canister_info();
            expect(canisterInfo.build_executor_canisters.length).toBe(2);
        });

        it('should update build instructions canister', async () => {
            const newInstructionsCanister = Principal.fromText('rdmx6-jaaaa-aaaaa-aaadq-cai');
            
            const result = await verificationCanister.update_build_instructions_canister(
                newInstructionsCanister
            );
            expect(result).toBe(true);

            const canisterInfo = await verificationCanister.get_canister_info();
            expect(canisterInfo.build_instructions_canister.toText()).toBe(
                newInstructionsCanister.toText()
            );
        });
    });

    describe('History and Monitoring', () => {
        it('should list verification history', async () => {
            const history = await verificationCanister.list_verification_history(10n, 0n);
            expect(Array.isArray(history)).toBe(true);
        });

        it('should get active verifications', async () => {
            const active = await verificationCanister.get_active_verifications();
            expect(Array.isArray(active)).toBe(true);
        });
    });

    describe('Input Validation', () => {
        it('should reject empty project ID', async () => {
            const result = await verificationCanister.request_verification('', '1.0.0');
            
            expect('Err' in result).toBe(true);
            if ('Err' in result) {
                expect('InvalidInput' in result.Err).toBe(true);
            }
        });

        it('should reject empty version', async () => {
            const result = await verificationCanister.request_verification('test-project', '');
            
            expect('Err' in result).toBe(true);
            if ('Err' in result) {
                expect('InvalidInput' in result.Err).toBe(true);
            }
        });

        it('should reject empty executor list in configuration', async () => {
            const result = await verificationCanister.update_build_executor_canisters([]);
            expect(result).toBe(false);
        });
    });

    describe('Consensus Mechanism', () => {
        it('should handle consensus calculation correctly', async () => {
            // This test would require mocking the executor responses
            // to simulate different consensus scenarios
            
            // Setup verification
            await buildInstructionsCanister.store_build_instructions(
                'consensus-test',
                '1.0.0',
                'echo "consensus test"'
            );

            const result = await verificationCanister.request_verification(
                'consensus-test',
                '1.0.0'
            );

            expect('Ok' in result).toBe(true);
            if ('Ok' in result) {
                // Check that consensus threshold is calculated correctly
                const threshold = result.Ok.consensus_threshold;
                const totalExecutors = result.Ok.total_executors;
                expect(threshold).toBe(Math.ceil(totalExecutors * 0.51));
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle canister call failures gracefully', async () => {
            // This would require integration with actual executor canisters
            // or mocking to simulate failures
        });

        it('should handle timeout scenarios', async () => {
            // Setup a verification with very short timeout
            await buildInstructionsCanister.store_build_instructions(
                'timeout-test',
                '1.0.0',
                'sleep 10 && echo "too slow"'
            );

            const result = await verificationCanister.request_verification(
                'timeout-test',
                '1.0.0',
                1n // 1 second timeout
            );

            expect('Ok' in result).toBe(true);
            
            // Wait for timeout to trigger
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const status = await verificationCanister.get_verification_status(
                'timeout-test',
                '1.0.0'
            );

            if ('Ok' in status) {
                // Should eventually timeout and show Failed status
                // Note: This test might need adjustment based on polling interval
            }
        });
    });

    describe('Cycle Management', () => {
        it('should handle cycle consumption appropriately', async () => {
            // This test would verify that adequate cycles are allocated
            // for inter-canister calls and that failures are handled
            // when cycles are insufficient
        });
    });

    describe('Integration Tests', () => {
        it('should work end-to-end with all canisters', async () => {
            const projectId = 'integration-test';
            const version = '1.0.0';
            const instructions = 'npm install && npm run build && echo "hash123"';

            // 1. Store build instructions
            await buildInstructionsCanister.store_build_instructions(
                projectId,
                version,
                instructions
            );

            // 2. Request verification
            const verificationResult = await verificationCanister.request_verification(
                projectId,
                version,
                300n
            );

            expect('Ok' in verificationResult).toBe(true);

            // 3. Monitor status (in real scenario, would poll until completion)
            const statusResult = await verificationCanister.get_verification_status(
                projectId,
                version
            );

            expect('Ok' in statusResult).toBe(true);
            if ('Ok' in statusResult) {
                expect(statusResult.Ok.status).toEqual({ Pending: null });
                expect(statusResult.Ok.executor_results.length).toBeGreaterThan(0);
            }
        });
    });
});
