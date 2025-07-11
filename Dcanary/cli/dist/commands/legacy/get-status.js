"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGetStatusCommand = createGetStatusCommand;
const commander_1 = require("commander");
const types_1 = require("../types");
const canister_1 = require("../services/canister");
const config_1 = require("../utils/config");
const helpers_1 = require("../utils/helpers");
const ui_1 = require("../utils/ui");
const logger_1 = require("../utils/logger");
function createGetStatusCommand() {
    const command = new commander_1.Command('get-status');
    command
        .description('Get verification status for a project')
        .requiredOption('-p, --project-id <project_id>', 'Project ID')
        .requiredOption('-v, --version <version>', 'Project version')
        .option('-c, --canister-id <canister_id>', 'Verification canister ID')
        .option('-n, --network <network>', 'Network to use (ic or local)', 'local')
        .option('--identity <identity>', 'Identity to use')
        .option('--json', 'Output in JSON format')
        .action(async (options) => {
        try {
            // Validate inputs
            validateInputs(options);
            // Get configuration
            const config = config_1.configManager.getConfig();
            const canisterId = options.canisterId || config.verificationCanisterId;
            const network = options.network || config.network || 'local';
            if (!canisterId) {
                throw new types_1.ValidationError('Verification canister ID is required. ' +
                    'Use --canister-id option or configure it with: mody configure --set-verification-canister-id <ID>');
            }
            // Initialize canister service
            const networkUrl = network === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943';
            const canisterService = new canister_1.CanisterService(networkUrl);
            // Get verification status
            const verificationResult = await canisterService.getVerificationStatus(canisterId, options.projectId, options.version);
            // Format output
            const statusOutput = (0, helpers_1.formatVerificationResult)(options.projectId, options.version, verificationResult);
            if (options.json) {
                // JSON output
                console.log(JSON.stringify(statusOutput, null, 2));
            }
            else {
                // Human-readable output
                displayStatus(statusOutput);
            }
            // Set appropriate exit code
            process.exit((0, helpers_1.getExitCode)(statusOutput.status));
        }
        catch (error) {
            if (error instanceof types_1.ValidationError) {
                if (options.json) {
                    console.log(JSON.stringify({ error: 'ValidationError', message: error.message }));
                }
                else {
                    (0, ui_1.printError)('Validation Error', error.message);
                }
                process.exit(1);
            }
            else if (error?.name === 'CanisterError') {
                if (error.message.includes('NotFound')) {
                    if (options.json) {
                        console.log(JSON.stringify({
                            error: 'NotFound',
                            message: `No verification found for ${options.projectId}@${options.version}`
                        }));
                    }
                    else {
                        (0, ui_1.printError)('Not Found', `No verification found for ${ui_1.Colors.cyan(options.projectId)}@${ui_1.Colors.cyan(options.version)}`);
                    }
                    process.exit(2);
                }
                else {
                    if (options.json) {
                        console.log(JSON.stringify({ error: 'CanisterError', message: error.message }));
                    }
                    else {
                        (0, ui_1.printError)('Canister Error', error.message);
                    }
                    process.exit(1);
                }
            }
            else if (error?.name === 'NetworkError') {
                if (options.json) {
                    console.log(JSON.stringify({ error: 'NetworkError', message: error.message }));
                }
                else {
                    (0, ui_1.printError)('Network Error', error.message);
                }
                process.exit(1);
            }
            else {
                const errorMessage = error?.message || 'Unknown error occurred';
                if (options.json) {
                    console.log(JSON.stringify({ error: 'UnexpectedError', message: errorMessage }));
                }
                else {
                    (0, ui_1.printError)('Unexpected Error', errorMessage);
                }
                logger_1.logger.error('Unexpected error in get-status command', { error: errorMessage });
                process.exit(1);
            }
        }
    });
    return command;
}
function validateInputs(options) {
    if (!options.projectId) {
        throw new types_1.ValidationError('Project ID is required');
    }
    if (!options.version) {
        throw new types_1.ValidationError('Version is required');
    }
    (0, helpers_1.validateProjectId)(options.projectId);
    (0, helpers_1.validateVersion)(options.version);
    if (options.canisterId) {
        (0, helpers_1.validateCanisterId)(options.canisterId);
    }
    if (options.network && !['ic', 'local'].includes(options.network)) {
        throw new types_1.ValidationError('Network must be either "ic" or "local"');
    }
}
function displayStatus(status) {
    // Header
    console.log();
    console.log(ui_1.Colors.bold(ui_1.Colors.cyan('Verification Status')));
    console.log(ui_1.Colors.gray('═'.repeat(50)));
    // Basic information
    (0, ui_1.printSection)('Project Information');
    (0, ui_1.printKeyValue)('Project ID', status.projectId);
    (0, ui_1.printKeyValue)('Version', status.version);
    (0, ui_1.printKeyValue)('Status', status.status, getStatusColorType(status.status));
    // Verification details
    if (status.totalExecutors !== undefined) {
        (0, ui_1.printSection)('Execution Details');
        (0, ui_1.printKeyValue)('Total Executors', status.totalExecutors.toString());
        if (status.completedExecutors !== undefined) {
            const progress = status.totalExecutors > 0
                ? Math.round((status.completedExecutors / status.totalExecutors) * 100)
                : 0;
            (0, ui_1.printKeyValue)('Completed Executors', `${status.completedExecutors}/${status.totalExecutors} (${progress}%)`);
        }
        if (status.successfulExecutors !== undefined) {
            (0, ui_1.printKeyValue)('Successful Executors', status.successfulExecutors.toString());
        }
        if (status.failedExecutors !== undefined) {
            (0, ui_1.printKeyValue)('Failed Executors', status.failedExecutors.toString());
        }
        if (status.consensusThreshold !== undefined) {
            (0, ui_1.printKeyValue)('Consensus Threshold', status.consensusThreshold.toString());
        }
        if (status.matchingResults !== undefined) {
            (0, ui_1.printKeyValue)('Matching Results', status.matchingResults.toString());
        }
    }
    // Results
    if (status.verifiedHash || status.error) {
        (0, ui_1.printSection)('Results');
        if (status.verifiedHash) {
            (0, ui_1.printKeyValue)('Verified Hash', status.verifiedHash, 'success');
        }
        if (status.error) {
            (0, ui_1.printKeyValue)('Error', status.error, 'error');
        }
    }
    // Timing
    if (status.createdAt || status.completedAt || status.duration) {
        (0, ui_1.printSection)('Timing');
        if (status.createdAt) {
            const createdDate = new Date(status.createdAt);
            (0, ui_1.printKeyValue)('Started', createdDate.toLocaleString());
        }
        if (status.completedAt) {
            const completedDate = new Date(status.completedAt);
            (0, ui_1.printKeyValue)('Completed', completedDate.toLocaleString());
        }
        if (status.duration) {
            (0, ui_1.printKeyValue)('Duration', status.duration);
        }
    }
    console.log();
}
function getStatusColorType(status) {
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
//# sourceMappingURL=get-status.js.map