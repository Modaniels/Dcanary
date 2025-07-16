import { Command } from 'commander';
import fs from 'fs-extra';
import { configManager } from '../utils/config';
import { Colors, Spinner, printHeader, printError, printInfo, printSuccess } from '../utils/ui';
import { logger } from '../utils/logger';
import { CanisterService } from '../services/canister';

interface ValidationResult {
    check: string;
    status: 'success' | 'failure' | 'warning';
    message: string;
}

/**
 * Creates the 'validate' command to check the project and system configuration.
 */
export function createValidateCommand(): Command {
    const command = new Command('validate');

    command
        .description('Validate the Dcanary configuration for the current project')
        .action(async () => {
            printHeader('🔍 Dcanary Configuration Validator');
            const spinner = new Spinner();
            const results: ValidationResult[] = [];

            try {
                // 1. Check for local project initialization
                spinner.start('Checking for local Dcanary configuration...');
                const isProjectInitialized = fs.existsSync('.dcanary.yml');
                results.push({
                    check: 'Project Initialization',
                    status: isProjectInitialized ? 'success' : 'failure',
                    message: isProjectInitialized ? '.dcanary.yml found' : 'Not a Dcanary project. Run "dcanary init".'
                });
                spinner.succeed();
                if (!isProjectInitialized) {
                    printValidationResults(results);
                    return;
                }
                
                // 2. Load global and local configurations
                spinner.start('Loading global and local settings...');
                const config = configManager.getConfig();
                results.push({
                    check: 'Global Config',
                    status: 'success',
                    message: `Loaded from ${configManager.getConfigPath()}`
                });
                spinner.succeed();

                // 3. Validate required canister IDs are configured
                spinner.start('Verifying canister ID configuration...');
                const requiredCanisters = [
                    'buildInstructionsCanisterId',
                    'verificationCanisterId',
                    'webhookCanisterId',
                ];
                let allCanistersConfigured = true;

                for (const key of requiredCanisters) {
                    if (!config[key]) {
                        allCanistersConfigured = false;
                        results.push({
                            check: `${formatKey(key)}`,
                            status: 'failure',
                            message: 'Not configured. Run "dcanary configure".'
                        });
                    }
                }

                if (allCanistersConfigured) {
                    results.push({
                        check: 'Canister IDs',
                        status: 'success',
                        message: 'All required canister IDs are configured.'
                    });
                }
                spinner.succeed();
                
                // 4. Ping canisters to check for responsiveness
                const canisterService = new CanisterService();
                
                if (config.buildInstructionsCanisterId) {
                    spinner.start('Pinging Build Instructions Canister...');
                    try {
                        // Assuming a healthCheck or get_canister_info method exists
                        await canisterService.getBuildInstructionsCanisterInfo(config.buildInstructionsCanisterId);
                        results.push({
                            check: 'Build Instructions Canister',
                            status: 'success',
                            message: `Responded successfully on network "${config.network || 'local'}"`
                        });
                        spinner.succeed();
                    } catch (error) {
                        results.push({
                            check: 'Build Instructions Canister',
                            status: 'failure',
                            message: `Failed to ping: ${error instanceof Error ? error.message : 'Unknown error'}`
                        });
                        spinner.fail();
                    }
                }
                
                if (config.verificationCanisterId) {
                    spinner.start('Pinging Verification Canister...');
                    try {
                        await canisterService.getVerificationCanisterInfo(config.verificationCanisterId);
                        results.push({
                            check: 'Verification Canister',
                            status: 'success',
                            message: `Responded successfully on network "${config.network || 'local'}"`
                        });
                        spinner.succeed();
                    } catch (error) {
                        results.push({
                            check: 'Verification Canister',
                            status: 'failure',
                            message: `Failed to ping: ${error instanceof Error ? error.message : 'Unknown error'}`
                        });
                        spinner.fail();
                    }
                }

                printValidationResults(results);

            } catch (error: any) {
                spinner.fail('Validation process failed.');
                printError('An unexpected error occurred during validation.', error.message);
                logger.error('Validate command failed', { error: error.message, stack: error.stack });
                process.exit(1);
            }
        });

    return command;
}

function printValidationResults(results: ValidationResult[]): void {
    console.log();
    console.log(Colors.bold('Validation Summary:'));
    console.log();

    let failures = 0;

    results.forEach(result => {
        let icon = '';
        let colorFunc: (text: string) => string;

        switch (result.status) {
            case 'success':
                icon = '✓';
                colorFunc = Colors.green;
                break;
            case 'failure':
                icon = '✗';
                colorFunc = Colors.red;
                failures++;
                break;
            case 'warning':
                icon = '⚠';
                colorFunc = Colors.yellow;
                break;
        }

        console.log(`${colorFunc(icon)} ${Colors.bold(result.check)}: ${result.message}`);
    });

    console.log();
    if (failures === 0) {
        printSuccess('All checks passed. Your configuration appears to be valid!');
    } else {
        printError(`${failures} check(s) failed. Please review the messages above.`);
    }
}

function formatKey(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/canister id/gi, 'Canister');
}
