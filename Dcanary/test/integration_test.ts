import { getCanisterId } from 'azle/_internal/dfx';
import { runTests } from 'azle/_internal/test';

import { createActor as createBuildInstructionsActor } from './dfx_generated/build_instructions_canister';
import { createActor as createBuildExecutorActor } from './dfx_generated/build_executor_canister';
import { getTests } from './tests';
import { getBuildExecutorTests } from './build_executor_tests';

const buildInstructionsCanister = createBuildInstructionsActor(
    getCanisterId('build_instructions_canister'), 
    {
        agentOptions: {
            host: 'http://127.0.0.1:4943',
            shouldFetchRootKey: true
        }
    }
);

const buildExecutorCanister = createBuildExecutorActor(
    getCanisterId('build_executor_canister'), 
    {
        agentOptions: {
            host: 'http://127.0.0.1:4943',
            shouldFetchRootKey: true
        }
    }
);

runTests(() => {
    describe('Build Instructions Canister', getTests(buildInstructionsCanister));
    describe('Build Executor Canister', getBuildExecutorTests(buildExecutorCanister));
});
