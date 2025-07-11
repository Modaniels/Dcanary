"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestVerificationCommand = createRequestVerificationCommand;
const commander_1 = require("commander");
const types_1 = require("../types");
const canister_1 = require("../services/canister");
const config_1 = require("../utils/config");
const helpers_1 = require("../utils/helpers");
const ui_1 = require("../utils/ui");
const logger_1 = require("../utils/logger");
function createRequestVerificationCommand() {
    const command = new commander_1.Command('request-verification');
    command
        .description('Request build verification for a project')
        .requiredOption('-p, --project-id <project_id>', 'Project ID')
        .requiredOption('-v, --version <version>', 'Project version')
        .option('-c, --canister-id <canister_id>', 'Verification canister ID')
        .option('-t, --timeout <seconds>', 'Maximum time to wait for verification (seconds)', parseInt, 600)
        .option('-n, --network <network>', 'Network to use (ic or local)', 'local')
        .option('--identity <identity>', 'Identity to use')
        .option('--no-wait', 'Don\'t wait for verification to complete')
        .action(async (options) => {
        const spinner = new ui_1.Spinner();
        try {
            // Validate inputs
            validateInputs(options);
            // Get configuration
            const config = config_1.configManager.getConfig();
            const canisterId = options.canisterId || config.verificationCanisterId;
            const network = options.network || config.network || 'local';
            const timeout = options.timeout || config.timeout || 600;
            if (!canisterId) {
                throw new types_1.ValidationError('Verification canister ID is required. ' +
                    'Use --canister-id option or configure it with: mody configure --set-verification-canister-id <ID>');
            }
            // Initialize canister service
            const networkUrl = network === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943';
            const canisterService = new canister_1.CanisterService(networkUrl);
            // Request verification
            spinner.start(`Requesting verification for ${ui_1.Colors.cyan(options.projectId)}@${ui_1.Colors.cyan(options.version)}`);
            const verificationResult = await canisterService.requestVerification(canisterId, options.projectId, options.version, timeout);
            spinner.succeed(`Verification requested for ${ui_1.Colors.cyan(options.projectId)}@${ui_1.Colors.cyan(options.version)}`);
            // Display initial status
            console.log();
            console.log(ui_1.Colors.bold('Initial Status:'));
            console.log(`  Status: ${getStatusColor((0, helpers_1.getStatusString)(verificationResult.status))}`);
            console.log(`  Total Executors: ${ui_1.Colors.gray(verificationResult.total_executors.toString())}`);
            console.log(`  Consensus Threshold: ${ui_1.Colors.gray(verificationResult.consensus_threshold.toString())}`);
            console.log(`  Timeout: ${ui_1.Colors.gray(timeout.toString())} seconds`);
            // Wait for completion if requested
            if (options.wait !== false) {
                const finalResult = await waitForVerification(canisterService, canisterId, options.projectId, options.version, timeout);
                displayFinalResult(finalResult, options.projectId, options.version);
                // Set appropriate exit code
                const status = (0, helpers_1.getStatusString)(finalResult.status);
                process.exit((0, helpers_1.getExitCode)(status));
            }
            else {
                (0, ui_1.printInfo)('Use "mody get-status" to check verification progress');
            }
            logger_1.logger.info('Verification requested', {
                projectId: options.projectId,
                version: options.version,
                canisterId,
                network,
                timeout,
                wait: options.wait !== false
            });
        }
        catch (error) {
            spinner.fail();
            if (error instanceof types_1.ValidationError) {
                (0, ui_1.printError)('Validation Error', error.message);
                process.exit(1);
            }
            else if (error?.name === 'CanisterError' || error?.name === 'NetworkError') {
                (0, ui_1.printError)(error.name, error.message);
                process.exit(1);
            }
            else {
                const errorMessage = error?.message || 'Unknown error occurred';
                (0, ui_1.printError)('Unexpected Error', errorMessage);
                logger_1.logger.error('Unexpected error in request-verification command', { error: errorMessage });
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
    if (options.timeout && (options.timeout < 1 || options.timeout > 3600)) {
        throw new types_1.ValidationError('Timeout must be between 1 and 3600 seconds');
    }
    if (options.network && !['ic', 'local'].includes(options.network)) {
        throw new types_1.ValidationError('Network must be either "ic" or "local"');
    }
}
async function waitForVerification(canisterService, canisterId, projectId, version, timeoutSeconds) {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    const pollInterval = 5000; // 5 seconds
    const progressBar = new ui_1.ProgressBar(40);
    const inCI = (0, helpers_1.isCI)();
    console.log();
    console.log(ui_1.Colors.bold('Waiting for verification to complete...'));
    if (!inCI) {
        console.log('(Press Ctrl+C to cancel and check status later)');
    }
    while (true) {
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) {
            throw new Error(`Verification timed out after ${timeoutSeconds} seconds`);
        }
        try {
            const result = await canisterService.getVerificationStatus(canisterId, projectId, version);
            const status = (0, helpers_1.getStatusString)(result.status);
            const completedExecutors = result.executor_results.filter(r => r.completed).length;
            const totalExecutors = result.total_executors;
            const progress = (0, helpers_1.calculateProgress)(completedExecutors, totalExecutors);
            const elapsedSeconds = Math.floor(elapsed / 1000);
            // Update progress
            if (inCI) {
                // In CI, just log periodically
                if (elapsedSeconds % 30 === 0) {
                    console.log(`Progress: ${progress}% (${completedExecutors}/${totalExecutors} executors, ${elapsedSeconds}s elapsed)`);
                }
            }
            else {
                // Interactive progress bar
                const estimated = (0, helpers_1.estimateRemainingTime)(elapsedSeconds, completedExecutors, totalExecutors);
                const progressText = `${completedExecutors}/${totalExecutors} executors (${elapsedSeconds}s${estimated ? `, ~${estimated}s remaining` : ''})`;
                progressBar.update(progress, progressText);
            }
            // Check if completed
            if (status === 'Verified' || status === 'Failed') {
                if (!inCI) {
                    progressBar.complete(`Verification ${status.toLowerCase()}`);
                }
                return result;
            }
            await (0, helpers_1.sleep)(pollInterval);
        }
        catch (error) {
            if (error?.name === 'CanisterError' && error.message.includes('NotFound')) {
                // Verification might not be started yet, continue waiting
                await (0, helpers_1.sleep)(pollInterval);
                continue;
            }
            throw error;
        }
    }
}
function displayFinalResult(result, projectId, version) {
    const status = (0, helpers_1.getStatusString)(result.status);
    const executorResults = result.executor_results || [];
    const completedExecutors = executorResults.filter((r) => r.completed).length;
    const successfulExecutors = executorResults.filter((r) => r.completed && r.hash && !r.error).length;
    const failedExecutors = executorResults.filter((r) => r.completed && r.error).length;
    console.log();
    console.log(ui_1.Colors.bold('Final Result:'));
    console.log(`  Project: ${ui_1.Colors.cyan(projectId)}@${ui_1.Colors.cyan(version)}`);
    console.log(`  Status: ${getStatusColor(status)}`);
    console.log(`  Completed Executors: ${ui_1.Colors.gray(completedExecutors.toString())}/${ui_1.Colors.gray(result.total_executors.toString())}`);
    console.log(`  Successful: ${ui_1.Colors.gray(successfulExecutors.toString())}`);
    console.log(`  Failed: ${ui_1.Colors.gray(failedExecutors.toString())}`);
    console.log(`  Consensus Threshold: ${ui_1.Colors.gray(result.consensus_threshold.toString())}`);
    console.log(`  Matching Results: ${ui_1.Colors.gray(result.matching_results.toString())}`);
    if (result.verified_hash) {
        console.log(`  Verified Hash: ${ui_1.Colors.green(result.verified_hash)}`);
    }
    if (result.error) {
        console.log(`  Error: ${ui_1.Colors.red(result.error)}`);
    }
    if (result.created_at && result.completed_at) {
        const durationNanos = result.completed_at - result.created_at;
        const duration = Number(durationNanos) / 1_000_000_000;
        console.log(`  Duration: ${ui_1.Colors.gray(duration.toFixed(1))} seconds`);
    }
    // Display status message
    console.log();
    if (status === 'Verified') {
        (0, ui_1.printSuccess)(`✓ Verification completed successfully`);
    }
    else if (status === 'Failed') {
        (0, ui_1.printError)('✗ Verification failed', result.error || 'Unknown error');
    }
}
function getStatusColor(status) {
    switch (status.toLowerCase()) {
        case 'verified':
            return ui_1.Colors.success(status);
        case 'failed':
            return ui_1.Colors.error(status);
        case 'pending':
            return ui_1.Colors.warning(status);
        default:
            return ui_1.Colors.gray(status);
    }
}
//# sourceMappingURL=request-verification.js.map