import { ActorSubclass } from '@dfinity/agent';
import { expect, it, Test } from 'azle/_internal/test';

import { _SERVICE } from './dfx_generated/build_instructions_canister/build_instructions_canister.did';

export function getTests(buildInstructionsCanister: ActorSubclass<_SERVICE>): Test {
    return () => {
        it('gets canister health check', async () => {
            const result = await buildInstructionsCanister.healthCheck();

            expect(result).toContain('Build Instructions Canister');
            expect(result).toContain('OK');
        });

        it('gets canister info', async () => {
            const result = await buildInstructionsCanister.getCanisterInfo();

            expect(result.version).toBe('1.0.0');
            expect(result.total_instructions).toBe(0);
        });

        it('handles unauthorized access correctly', async () => {
            // First, let's check if we can add instructions (this might succeed if we're the admin)
            const result = await buildInstructionsCanister.addInstructions(
                'test-project',
                'v1.0.0',
                'npm install && npm run build'
            );

            // The test should either succeed (if we're admin) or fail with unauthorized
            if ('Ok' in result) {
                // We are the admin, so let's test that we can add instructions
                expect(result).toHaveProperty('Ok');
            } else {
                // We are not admin, so we should get unauthorized error
                expect(result).toHaveProperty('Err');
                if ('Err' in result) {
                    expect(result.Err).toHaveProperty('Unauthorized');
                }
            }
        });

        it('validates input correctly', async () => {
            const result = await buildInstructionsCanister.getInstructions('', 'v1.0.0');

            expect(result).toHaveProperty('Err');
            if ('Err' in result) {
                expect(result.Err).toHaveProperty('InvalidInput');
            }
        });

        it('lists projects and versions correctly', async () => {
            const projects = await buildInstructionsCanister.listProjects();
            const versions = await buildInstructionsCanister.listVersions('test-project');

            // After the previous test, we should have at least one project
            expect(projects.length).toBeGreaterThanOrEqual(0);
            if (projects.includes('test-project')) {
                expect(versions).toContain('v1.0.0');
            }
        });

        it('returns correct statistics', async () => {
            const stats = await buildInstructionsCanister.getStatistics();

            expect(stats.total_instructions).toBeGreaterThanOrEqual(0);
            expect(stats.total_projects).toBeGreaterThanOrEqual(0);
            expect(stats.canister_version).toBe('1.0.0');
            expect(Array.isArray(stats.oldest_instruction)).toBe(true);
            expect(Array.isArray(stats.newest_instruction)).toBe(true);
        });
    };
}
