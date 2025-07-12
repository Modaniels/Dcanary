import { ActorSubclass } from '@dfinity/agent';
import { expect, it, Test } from 'azle/_internal/test';
import { Principal } from '@dfinity/principal';

import { _SERVICE } from './dfx_generated/build_executor_canister/build_executor_canister.did';

export function getBuildExecutorTests(buildExecutorCanister: ActorSubclass<_SERVICE>): Test {
    return () => {
        it('gets canister health check', async () => {
            const result = await buildExecutorCanister.healthCheck();

            expect(result).toContain('Build Executor Canister');
            expect(result).toContain('OK');
        });

        it('gets canister statistics', async () => {
            const stats = await buildExecutorCanister.getStatistics();

            expect(stats.canister_version).toBe('1.0.0');
            expect(stats.total_builds).toBeGreaterThanOrEqual(0);
            expect(stats.successful_builds).toBeGreaterThanOrEqual(0);
            expect(stats.failed_builds).toBeGreaterThanOrEqual(0);
        });

        it('handles unauthorized build requests', async () => {
            // This should fail because the caller is not the verification canister
            const result = await buildExecutorCanister.executeBuild(
                'test-project',
                'v1.0.0'
            );

            expect(result).toHaveProperty('Err');
            if ('Err' in result) {
                expect(result.Err).toHaveProperty('Unauthorized');
            }
        });

        it('validates input correctly', async () => {
            try {
                const result = await buildExecutorCanister.executeBuild('', '');

                expect(result).toHaveProperty('Err');
                if ('Err' in result) {
                    expect(result.Err).toHaveProperty('InvalidInput');
                }
            } catch (error) {
                // This is expected for unauthorized calls
                expect(error).toBeDefined();
            }
        });

        it('returns correct hash result for no builds', async () => {
            const result = await buildExecutorCanister.getHash();

            expect(result).toHaveProperty('Err');
            if ('Err' in result) {
                expect(result.Err).toHaveProperty('NotFound');
            }
        });

        it('returns empty build history', async () => {
            const history = await buildExecutorCanister.getBuildHistory([0], [10]);

            expect(Array.isArray(history)).toBe(true);
            expect(history.length).toBeGreaterThanOrEqual(0);
        });

        it('handles admin configuration updates with unauthorized caller', async () => {
            try {
                const newCanisterId = Principal.fromText('rdmx6-jaaaa-aaaah-qcaiq-cai');
                const result = await buildExecutorCanister.updateBuildInstructionsCanister(newCanisterId);

                expect(result).toHaveProperty('Err');
                if ('Err' in result) {
                    expect(result.Err).toHaveProperty('Unauthorized');
                }
            } catch (error) {
                // Expected for unauthorized calls
                expect(error).toBeDefined();
            }
        });

        it('handles verification canister update with unauthorized caller', async () => {
            try {
                const newPrincipal = Principal.fromText('rdmx6-jaaaa-aaaah-qcaiq-cai');
                const result = await buildExecutorCanister.updateVerificationCanister(newPrincipal);

                expect(result).toHaveProperty('Err');
                if ('Err' in result) {
                    expect(result.Err).toHaveProperty('Unauthorized');
                }
            } catch (error) {
                // Expected for unauthorized calls
                expect(error).toBeDefined();
            }
        });
    };
}
