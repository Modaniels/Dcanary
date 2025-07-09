"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigureCommand = createConfigureCommand;
const commander_1 = require("commander");
const types_1 = require("../types");
const config_1 = require("../utils/config");
const helpers_1 = require("../utils/helpers");
const ui_1 = require("../utils/ui");
const logger_1 = require("../utils/logger");
function createConfigureCommand() {
    const command = new commander_1.Command('configure');
    command
        .description('Configure CLI settings')
        .option('--set-build-canister-id <canister_id>', 'Set build instructions canister ID')
        .option('--set-verification-canister-id <canister_id>', 'Set verification canister ID')
        .option('--set-executor-ids <canister_ids>', 'Set build executor canister IDs (comma-separated)')
        .option('--set-network <network>', 'Set default network (ic or local)')
        .option('--set-identity <identity>', 'Set default identity')
        .option('--set-timeout <seconds>', 'Set default timeout in seconds', parseInt)
        .option('--reset', 'Reset configuration to defaults')
        .option('--show', 'Show current configuration')
        .action(async (options) => {
        try {
            // If no options provided, show current configuration
            if (!hasConfigOptions(options)) {
                showConfiguration();
                return;
            }
            // Handle reset
            if (options.reset) {
                config_1.configManager.reset();
                await config_1.configManager.saveConfig();
                (0, ui_1.printSuccess)('Configuration reset to defaults');
                return;
            }
            // Handle show
            if (options.show) {
                showConfiguration();
                return;
            }
            // Validate and set configuration
            const updates = {};
            if (options.setBuildCanisterId) {
                (0, helpers_1.validateCanisterId)(options.setBuildCanisterId);
                updates.buildInstructionsCanisterId = options.setBuildCanisterId;
            }
            if (options.setVerificationCanisterId) {
                (0, helpers_1.validateCanisterId)(options.setVerificationCanisterId);
                updates.verificationCanisterId = options.setVerificationCanisterId;
            }
            if (options.setExecutorIds) {
                const executorIds = options.setExecutorIds.split(',').map(id => id.trim());
                for (const id of executorIds) {
                    (0, helpers_1.validateCanisterId)(id);
                }
                updates.buildExecutorCanisterIds = executorIds;
            }
            if (options.setNetwork) {
                if (!['ic', 'local'].includes(options.setNetwork)) {
                    throw new types_1.ValidationError('Network must be either "ic" or "local"');
                }
                updates.network = options.setNetwork;
            }
            if (options.setIdentity) {
                updates.identity = options.setIdentity;
            }
            if (options.setTimeout) {
                if (options.setTimeout < 1 || options.setTimeout > 3600) {
                    throw new types_1.ValidationError('Timeout must be between 1 and 3600 seconds');
                }
                updates.timeout = options.setTimeout;
            }
            // Apply updates
            config_1.configManager.setMany(updates);
            await config_1.configManager.saveConfig();
            // Show what was updated
            console.log();
            (0, ui_1.printSuccess)('Configuration updated successfully');
            console.log();
            console.log(ui_1.Colors.bold('Updated settings:'));
            Object.entries(updates).forEach(([key, value]) => {
                const displayKey = formatConfigKey(key);
                const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                (0, ui_1.printKeyValue)(displayKey, displayValue, 'success');
            });
            // Show completion status
            console.log();
            if (config_1.configManager.isConfigured()) {
                (0, ui_1.printInfo)('✓ Configuration is complete - all required settings are configured');
            }
            else {
                (0, ui_1.printInfo)('⚠ Configuration is incomplete - some required settings are missing');
                showMissingSettings();
            }
            logger_1.logger.info('Configuration updated', { updates });
        }
        catch (error) {
            if (error instanceof types_1.ValidationError) {
                (0, ui_1.printError)('Validation Error', error.message);
                process.exit(1);
            }
            else {
                const errorMessage = error?.message || 'Unknown error occurred';
                (0, ui_1.printError)('Configuration Error', errorMessage);
                logger_1.logger.error('Error in configure command', { error: errorMessage });
                process.exit(1);
            }
        }
    });
    return command;
}
function hasConfigOptions(options) {
    return !!(options.setBuildCanisterId ||
        options.setVerificationCanisterId ||
        options.setExecutorIds ||
        options.setNetwork ||
        options.setIdentity ||
        options.setTimeout ||
        options.reset ||
        options.show);
}
function showConfiguration() {
    const config = config_1.configManager.getConfig();
    const status = config_1.configManager.getConfigStatus();
    console.log();
    console.log(ui_1.Colors.bold(ui_1.Colors.cyan('Current Configuration')));
    console.log(ui_1.Colors.gray('═'.repeat(50)));
    // Required settings
    (0, ui_1.printSection)('Required Settings');
    (0, ui_1.printKeyValue)('Build Instructions Canister ID', status.buildInstructionsCanisterId || 'Not configured', status.buildInstructionsCanisterId ? 'success' : 'warning');
    (0, ui_1.printKeyValue)('Verification Canister ID', status.verificationCanisterId || 'Not configured', status.verificationCanisterId ? 'success' : 'warning');
    (0, ui_1.printKeyValue)('Build Executor Canisters', status.executorCount > 0 ? `${status.executorCount} configured` : 'Not configured', status.executorCount > 0 ? 'success' : 'warning');
    // Optional settings
    (0, ui_1.printSection)('Optional Settings');
    (0, ui_1.printKeyValue)('Default Network', status.network);
    (0, ui_1.printKeyValue)('Default Identity', status.identity || 'Not configured');
    (0, ui_1.printKeyValue)('Default Timeout', `${status.timeout} seconds`);
    // Configuration status
    console.log();
    if (config_1.configManager.isConfigured()) {
        (0, ui_1.printSuccess)('✓ Configuration is complete');
    }
    else {
        (0, ui_1.printInfo)('⚠ Configuration is incomplete');
        showMissingSettings();
    }
    // Show help
    console.log();
    console.log(ui_1.Colors.gray('To configure settings, use:'));
    console.log(ui_1.Colors.gray('  mody configure --set-build-canister-id <ID>'));
    console.log(ui_1.Colors.gray('  mody configure --set-verification-canister-id <ID>'));
    console.log(ui_1.Colors.gray('  mody configure --set-executor-ids <ID1,ID2,ID3>'));
    console.log(ui_1.Colors.gray('  mody configure --set-network <ic|local>'));
    console.log(ui_1.Colors.gray('  mody configure --reset  # Reset to defaults'));
    console.log();
}
function showMissingSettings() {
    const config = config_1.configManager.getConfig();
    const missing = [];
    if (!config.buildInstructionsCanisterId) {
        missing.push('Build Instructions Canister ID');
    }
    if (!config.verificationCanisterId) {
        missing.push('Verification Canister ID');
    }
    if (!config.buildExecutorCanisterIds || config.buildExecutorCanisterIds.length === 0) {
        missing.push('Build Executor Canister IDs');
    }
    if (missing.length > 0) {
        console.log();
        console.log(ui_1.Colors.warning('Missing required settings:'));
        missing.forEach(setting => {
            console.log(`  ${ui_1.Colors.gray('•')} ${setting}`);
        });
    }
}
function formatConfigKey(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/canister id/gi, 'Canister ID')
        .replace(/ids/gi, 'IDs');
}
//# sourceMappingURL=configure.js.map