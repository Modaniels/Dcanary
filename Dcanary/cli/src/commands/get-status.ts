import { Command } from 'commander';
import { CLIOptions, ValidationError, StatusOutput } from '../types';
import { CanisterService } from '../services/canister';
import { configManager } from '../utils/config';
import { 
    validateProjectId, 
    validateVersion, 
    validateCanisterId,
    formatVerificationResult,
    getExitCode
} from '../utils/helpers';
import { Colors, printError, printSection, printKeyValue } from '../utils/ui';
import { logger } from '../utils/logger';

export function createGetStatusCommand(): Command {
    const command = new Command('get-status');

    command
        .description('Get verification status for a project')
        .requiredOption('-p, --project-id <project_id>', 'Project ID')
        .requiredOption('-v, --version <version>', 'Project version')
        .option('-c, --canister-id <canister_id>', 'Verification canister ID')
        .option('-n, --network <network>', 'Network to use (ic or local)', 'local')
        .option('--identity <identity>', 'Identity to use')
        .option('--json', 'Output in JSON format')
        .action(async (options: CLIOptions) => {
            try {
                // Validate inputs
                validateInputs(options);

                // Get configuration
                const config = configManager.getConfig();
                const canisterId = options.canisterId || config.verificationCanisterId;
                const network = options.network || config.network || 'local';

                if (!canisterId) {
                    throw new ValidationError(
                        'Verification canister ID is required. ' +
                        'Use --canister-id option or configure it with: mody configure --set-verification-canister-id <ID>'
                    );
                }

                // Initialize canister service
                const networkUrl = network === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943';
                const canisterService = new CanisterService(networkUrl);

                // Get verification status
                const verificationResult = await canisterService.getVerificationStatus(
                    canisterId,
                    options.projectId!,
                    options.version!
                );

                // Format output
                const statusOutput = formatVerificationResult(
                    options.projectId!,
                    options.version!,
                    verificationResult
                );

                if (options.json) {
                    // JSON output
                    console.log(JSON.stringify(statusOutput, null, 2));
                } else {
                    // Human-readable output
                    displayStatus(statusOutput);
                }

                // Set appropriate exit code
                process.exit(getExitCode(statusOutput.status));

            } catch (error: any) {
                if (error instanceof ValidationError) {
                    if (options.json) {
                        console.log(JSON.stringify({ error: 'ValidationError', message: error.message }));
                    } else {
                        printError('Validation Error', error.message);
                    }
                    process.exit(1);
                } else if (error?.name === 'CanisterError') {
                    if (error.message.includes('NotFound')) {
                        if (options.json) {
                            console.log(JSON.stringify({ 
                                error: 'NotFound', 
                                message: `No verification found for ${options.projectId}@${options.version}` 
                            }));
                        } else {
                            printError('Not Found', `No verification found for ${Colors.cyan(options.projectId!)}@${Colors.cyan(options.version!)}`);
                        }
                        process.exit(2);
                    } else {
                        if (options.json) {
                            console.log(JSON.stringify({ error: 'CanisterError', message: error.message }));
                        } else {
                            printError('Canister Error', error.message);
                        }
                        process.exit(1);
                    }
                } else if (error?.name === 'NetworkError') {
                    if (options.json) {
                        console.log(JSON.stringify({ error: 'NetworkError', message: error.message }));
                    } else {
                        printError('Network Error', error.message);
                    }
                    process.exit(1);
                } else {
                    const errorMessage = error?.message || 'Unknown error occurred';
                    if (options.json) {
                        console.log(JSON.stringify({ error: 'UnexpectedError', message: errorMessage }));
                    } else {
                        printError('Unexpected Error', errorMessage);
                    }
                    logger.error('Unexpected error in get-status command', { error: errorMessage });
                    process.exit(1);
                }
            }
        });

    return command;
}

function validateInputs(options: CLIOptions): void {
    if (!options.projectId) {
        throw new ValidationError('Project ID is required');
    }
    
    if (!options.version) {
        throw new ValidationError('Version is required');
    }

    validateProjectId(options.projectId);
    validateVersion(options.version);

    if (options.canisterId) {
        validateCanisterId(options.canisterId);
    }

    if (options.network && !['ic', 'local'].includes(options.network)) {
        throw new ValidationError('Network must be either "ic" or "local"');
    }
}

function displayStatus(status: StatusOutput): void {
    // Header
    console.log();
    console.log(Colors.bold(Colors.cyan('Verification Status')));
    console.log(Colors.gray('═'.repeat(50)));

    // Basic information
    printSection('Project Information');
    printKeyValue('Project ID', status.projectId);
    printKeyValue('Version', status.version);
    printKeyValue('Status', status.status, getStatusColorType(status.status));

    // Verification details
    if (status.totalExecutors !== undefined) {
        printSection('Execution Details');
        printKeyValue('Total Executors', status.totalExecutors.toString());
        
        if (status.completedExecutors !== undefined) {
            const progress = status.totalExecutors > 0 
                ? Math.round((status.completedExecutors / status.totalExecutors) * 100)
                : 0;
            printKeyValue('Completed Executors', `${status.completedExecutors}/${status.totalExecutors} (${progress}%)`);
        }

        if (status.successfulExecutors !== undefined) {
            printKeyValue('Successful Executors', status.successfulExecutors.toString());
        }

        if (status.failedExecutors !== undefined) {
            printKeyValue('Failed Executors', status.failedExecutors.toString());
        }

        if (status.consensusThreshold !== undefined) {
            printKeyValue('Consensus Threshold', status.consensusThreshold.toString());
        }

        if (status.matchingResults !== undefined) {
            printKeyValue('Matching Results', status.matchingResults.toString());
        }
    }

    // Results
    if (status.verifiedHash || status.error) {
        printSection('Results');
        
        if (status.verifiedHash) {
            printKeyValue('Verified Hash', status.verifiedHash, 'success');
        }

        if (status.error) {
            printKeyValue('Error', status.error, 'error');
        }
    }

    // Timing
    if (status.createdAt || status.completedAt || status.duration) {
        printSection('Timing');
        
        if (status.createdAt) {
            const createdDate = new Date(status.createdAt);
            printKeyValue('Started', createdDate.toLocaleString());
        }

        if (status.completedAt) {
            const completedDate = new Date(status.completedAt);
            printKeyValue('Completed', completedDate.toLocaleString());
        }

        if (status.duration) {
            printKeyValue('Duration', status.duration);
        }
    }

    console.log();
}

function getStatusColorType(status: string): 'success' | 'error' | 'warning' | 'info' {
    switch (status.toLowerCase()) {
        case 'verified':
            return 'success';
        case 'failed':
            return 'error';
        case 'pending':
            return 'warning';
        default:
            return 'info';
    }
}
