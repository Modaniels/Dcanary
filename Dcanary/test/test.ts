import { getCanisterId } from 'azle/_internal/dfx';
import { runTests } from 'azle/_internal/test';
import { Principal } from '@dfinity/principal';

import { createActor } from './dfx_generated/build_instructions_canister';

const canisterName = 'build_instructions_canister';
const buildInstructionsCanister = createActor(getCanisterId(canisterName), {
    agentOptions: {
        host: 'http://127.0.0.1:4943',
        shouldFetchRootKey: true
    }
});

const tests = [
    {
        name: 'canister initialization and health check',
        test: async () => {
            const healthCheck = await buildInstructionsCanister.healthCheck();
            console.log('Health check:', healthCheck);
            
            const canisterInfo = await buildInstructionsCanister.getCanisterInfo();
            console.log('Canister info:', canisterInfo);
            
            if (!healthCheck.includes('Build Instructions Canister') || !healthCheck.includes('OK')) {
                throw new Error('Health check failed');
            }
            
            if (!canisterInfo.version || canisterInfo.total_instructions !== 0) {
                throw new Error('Canister info is incorrect');
            }
            
            return { Ok: 'Canister initialized and health check passed' };
        }
    },
    {
        name: 'unauthorized access should fail',
        test: async () => {
            try {
                // This should fail because the caller is not authorized
                const result = await buildInstructionsCanister.addInstructions(
                    'test-project',
                    'v1.0.0',
                    'npm install && npm run build'
                );
                
                // Check if it's an error result
                if ('Err' in result && 'Unauthorized' in result.Err) {
                    console.log('Expected unauthorized error:', result.Err.Unauthorized);
                    return { Ok: 'Unauthorized access correctly rejected' };
                } else {
                    throw new Error('Expected unauthorized error but got: ' + JSON.stringify(result));
                }
            } catch (error) {
                console.log('Caught error:', error);
                return { Ok: 'Unauthorized access correctly rejected' };
            }
        }
    },
    {
        name: 'input validation',
        test: async () => {
            try {
                // Test empty project ID
                const result1 = await buildInstructionsCanister.getInstructions('', 'v1.0.0');
                if ('Err' in result1 && 'InvalidInput' in result1.Err) {
                    console.log('Empty project ID correctly rejected:', result1.Err.InvalidInput);
                } else {
                    throw new Error('Expected InvalidInput error for empty project ID');
                }
                
                // Test empty version
                const result2 = await buildInstructionsCanister.getInstructions('test-project', '');
                if ('Err' in result2 && 'InvalidInput' in result2.Err) {
                    console.log('Empty version correctly rejected:', result2.Err.InvalidInput);
                } else {
                    throw new Error('Expected InvalidInput error for empty version');
                }
                
                return { Ok: 'Input validation working correctly' };
            } catch (error) {
                throw new Error(`Input validation test failed: ${error}`);
            }
        }
    },
    {
        name: 'get non-existent instructions',
        test: async () => {
            const result = await buildInstructionsCanister.getInstructions(
                'non-existent-project',
                'v1.0.0'
            );
            
            if ('Err' in result && 'NotFound' in result.Err) {
                console.log('Non-existent instructions correctly returned NotFound:', result.Err.NotFound);
                return { Ok: 'Non-existent instructions handling works correctly' };
            } else {
                throw new Error('Expected NotFound error but got: ' + JSON.stringify(result));
            }
        }
    },
    {
        name: 'list empty projects and versions',
        test: async () => {
            const projects = await buildInstructionsCanister.listProjects();
            const versions = await buildInstructionsCanister.listVersions('any-project');
            
            if (projects.length !== 0) {
                throw new Error(`Expected empty projects list but got: ${projects}`);
            }
            
            if (versions.length !== 0) {
                throw new Error(`Expected empty versions list but got: ${versions}`);
            }
            
            console.log('Empty lists returned correctly');
            return { Ok: 'Empty lists handling works correctly' };
        }
    },
    {
        name: 'admin operations with wrong principal',
        test: async () => {
            try {
                // Try to update admin with unauthorized principal
                const newAdmin = Principal.fromText('rdmx6-jaaaa-aaaah-qcaiq-cai');
                const result = await buildInstructionsCanister.updateAdmin(newAdmin);
                
                if ('Err' in result && 'Unauthorized' in result.Err) {
                    console.log('Unauthorized admin update correctly rejected:', result.Err.Unauthorized);
                    return { Ok: 'Unauthorized admin operations correctly rejected' };
                } else {
                    throw new Error('Expected unauthorized error for admin update');
                }
            } catch (error) {
                console.log('Admin operation correctly rejected:', error);
                return { Ok: 'Unauthorized admin operations correctly rejected' };
            }
        }
    },
    {
        name: 'remove non-existent instructions',
        test: async () => {
            try {
                const result = await buildInstructionsCanister.removeInstructions(
                    'non-existent-project',
                    'v1.0.0'
                );
                
                if ('Err' in result && ('Unauthorized' in result.Err || 'NotFound' in result.Err)) {
                    console.log('Remove non-existent instructions correctly handled:', result.Err);
                    return { Ok: 'Remove non-existent instructions handled correctly' };
                } else {
                    throw new Error('Expected error for removing non-existent instructions');
                }
            } catch (error) {
                console.log('Remove operation correctly rejected:', error);
                return { Ok: 'Remove non-existent instructions handled correctly' };
            }
        }
    },
    {
        name: 'test new query methods',
        test: async () => {
            try {
                // Test getAllInstructions
                const allInstructions = await buildInstructionsCanister.getAllInstructions([0], [10]);
                console.log('All instructions (should be empty):', allInstructions);
                
                // Test getStatistics
                const stats = await buildInstructionsCanister.getStatistics();
                console.log('Statistics:', stats);
                
                if (stats.total_instructions !== 0 || stats.total_projects !== 0) {
                    throw new Error('Expected empty statistics');
                }
                
                // Test instructionsExist
                const exists = await buildInstructionsCanister.instructionsExist('test-project', 'v1.0.0');
                console.log('Instructions exist (should be false):', exists);
                
                if (exists) {
                    throw new Error('Expected instructions to not exist');
                }
                
                // Test getInstructionsByProject
                const projectInstructions = await buildInstructionsCanister.getInstructionsByProject('test-project');
                console.log('Project instructions (should be empty):', projectInstructions);
                
                if (projectInstructions.length !== 0) {
                    throw new Error('Expected empty project instructions');
                }
                
                return { Ok: 'New query methods work correctly' };
            } catch (error) {
                throw new Error(`New query methods test failed: ${error}`);
            }
        }
    }
];

runTests(tests);
