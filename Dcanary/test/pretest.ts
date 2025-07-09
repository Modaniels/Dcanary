import { execSync } from 'child_process';

function pretest(): void {
    execSync(`dfx canister uninstall-code build_instructions_canister || true`, {
        stdio: 'inherit'
    });

    execSync(`dfx deploy build_instructions_canister`, {
        stdio: 'inherit'
    });

    execSync(`dfx generate build_instructions_canister`, {
        stdio: 'inherit'
    });
}

pretest();
