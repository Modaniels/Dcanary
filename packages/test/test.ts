import { getCanisterId } from 'azle/_internal/dfx';
import { runTests } from 'azle/_internal/test';

import { createActor } from './dfx_generated/build_instructions_canister';
import { getTests } from './tests';

const canisterName = 'build_instructions_canister';
const buildInstructionsCanister = createActor(getCanisterId(canisterName), {
    agentOptions: {
        host: 'http://127.0.0.1:4943',
        shouldFetchRootKey: true
    }
});

runTests(getTests(buildInstructionsCanister));
