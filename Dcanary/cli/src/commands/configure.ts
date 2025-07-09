import { Command } from 'commander';
import { CLIOptions, ValidationError } from '../types';
import { configManager } from '../utils/config';
import { validateCanisterId } from '../utils/helpers';
import { 
    Colors, 
    printSuccess, 
    printError, 
    printSection, 
    printKeyValue,
    printInfo
} from '../utils/ui';
import { logger } from '../utils/logger';

export function createConfigureCommand(): Command {
    const command = new Command('configure');

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
        .action(async (options: CLIOptions & {
            setBuildCanisterId?: string;
            setVerificationCanisterId?: string;
            setExecutorIds?: string;
            setNetwork?: string;
            setIdentity?: string;
            setTimeout?: number;
            reset?: boolean;
            show?: boolean;
        }) => {
            try {
                // If no options provided, show current configuration
                if (!hasConfigOptions(options)) {
                    showConfiguration();
                    return;
                }

                // Handle reset
                if (options.reset) {
                    configManager.reset();
                    await configManager.saveConfig();
                    printSuccess('Configuration reset to defaults');
                    return;
                }

                // Handle show
                if (options.show) {
                    showConfiguration();
                    return;
                }

                // Validate and set configuration
                const updates: any = {};

                if (options.setBuildCanisterId) {
                    validateCanisterId(options.setBuildCanisterId);
                    updates.buildInstructionsCanisterId = options.setBuildCanisterId;
                }

                if (options.setVerificationCanisterId) {
                    validateCanisterId(options.setVerificationCanisterId);
                    updates.verificationCanisterId = options.setVerificationCanisterId;
                }

                if (options.setExecutorIds) {
                    const executorIds = options.setExecutorIds.split(',').map(id => id.trim());
                    for (const id of executorIds) {
                        validateCanisterId(id);
                    }
                    updates.buildExecutorCanisterIds = executorIds;
                }

                if (options.setNetwork) {
                    if (!['ic', 'local'].includes(options.setNetwork)) {
                        throw new ValidationError('Network must be either "ic" or "local"');
                    }
                    updates.network = options.setNetwork;
                }

                if (options.setIdentity) {
                    updates.identity = options.setIdentity;
                }

                if (options.setTimeout) {
                    if (options.setTimeout < 1 || options.setTimeout > 3600) {
                        throw new ValidationError('Timeout must be between 1 and 3600 seconds');
                    }
                    updates.timeout = options.setTimeout;
                }

                // Apply updates
                configManager.setMany(updates);
                await configManager.saveConfig();

                // Show what was updated
                console.log();
                printSuccess('Configuration updated successfully');
                
                console.log();
                console.log(Colors.bold('Updated settings:'));
                Object.entries(updates).forEach(([key, value]) => {
                    const displayKey = formatConfigKey(key);
                    const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
                    printKeyValue(displayKey, displayValue, 'success');
                });

                // Show completion status
                console.log();
                if (configManager.isConfigured()) {
                    printInfo('✓ Configuration is complete - all required settings are configured');
                } else {
                    printInfo('⚠ Configuration is incomplete - some required settings are missing');
                    showMissingSettings();
                }

                logger.info('Configuration updated', { updates });

            } catch (error: any) {
                if (error instanceof ValidationError) {
                    printError('Validation Error', error.message);
                    process.exit(1);
                } else {
                    const errorMessage = error?.message || 'Unknown error occurred';
                    printError('Configuration Error', errorMessage);
                    logger.error('Error in configure command', { error: errorMessage });
                    process.exit(1);
                }
            }
        });

    return command;
}

function hasConfigOptions(options: any): boolean {
    return !!(
        options.setBuildCanisterId ||
        options.setVerificationCanisterId ||
        options.setExecutorIds ||
        options.setNetwork ||
        options.setIdentity ||
        options.setTimeout ||
        options.reset ||
        options.show
    );
}

function showConfiguration(): void {
    const config = configManager.getConfig();
    const status = configManager.getConfigStatus();

    console.log();
    console.log(Colors.bold(Colors.cyan('Current Configuration')));
    console.log(Colors.gray('═'.repeat(50)));

    // Required settings
    printSection('Required Settings');
    printKeyValue(
        'Build Instructions Canister ID', 
        status.buildInstructionsCanisterId || 'Not configured',
        status.buildInstructionsCanisterId ? 'success' : 'warning'
    );
    printKeyValue(
        'Verification Canister ID', 
        status.verificationCanisterId || 'Not configured',
        status.verificationCanisterId ? 'success' : 'warning'
    );
    printKeyValue(
        'Build Executor Canisters', 
        status.executorCount > 0 ? `${status.executorCount} configured` : 'Not configured',
        status.executorCount > 0 ? 'success' : 'warning'
    );

    // Optional settings
    printSection('Optional Settings');
    printKeyValue('Default Network', status.network);
    printKeyValue('Default Identity', status.identity || 'Not configured');
    printKeyValue('Default Timeout', `${status.timeout} seconds`);

    // Configuration status
    console.log();
    if (configManager.isConfigured()) {
        printSuccess('✓ Configuration is complete');
    } else {
        printInfo('⚠ Configuration is incomplete');
        showMissingSettings();
    }

    // Show help
    console.log();
    console.log(Colors.gray('To configure settings, use:'));
    console.log(Colors.gray('  mody configure --set-build-canister-id <ID>'));
    console.log(Colors.gray('  mody configure --set-verification-canister-id <ID>'));
    console.log(Colors.gray('  mody configure --set-executor-ids <ID1,ID2,ID3>'));
    console.log(Colors.gray('  mody configure --set-network <ic|local>'));
    console.log(Colors.gray('  mody configure --reset  # Reset to defaults'));
    console.log();
}

function showMissingSettings(): void {
    const config = configManager.getConfig();
    const missing: string[] = [];

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
        console.log(Colors.warning('Missing required settings:'));
        missing.forEach(setting => {
            console.log(`  ${Colors.gray('•')} ${setting}`);
        });
    }
}

function formatConfigKey(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/canister id/gi, 'Canister ID')
        .replace(/ids/gi, 'IDs');
}
