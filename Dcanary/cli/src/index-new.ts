#!/usr/bin/env node

import { Command } from 'commander';
import { Colors, printHeader, printError } from './utils/ui';
import { logger, setLogLevel } from './utils/logger';
import { configManager } from './utils/config';

// Import new command modules
import { createInitCommand } from './commands/init';
import { createAnalyzeCommand } from './commands/analyze';
import { createBuildCommand } from './commands/build';
import { createDeployCommand } from './commands/deploy';
import { createNetworkCommand } from './commands/network';
import { createIntegrateCommand } from './commands/integrate';
import { createSecretsCommand } from './commands/secrets';
import { createStatusCommand } from './commands/status';
import { createLogsCommand } from './commands/logs';
import { createConfigureCommand } from './commands/configure';
import { createVersionCommand } from './commands/version';

function main() {
    const program = new Command();

    // CLI configuration
    program
        .name('dcanary')
        .description('Dcanary - Decentralized CI/CD Pipeline for Internet Computer')
        .version('2.0.0')
        .option('-v, --verbose', 'Enable verbose logging')
        .option('-q, --quiet', 'Suppress non-error output')
        .option('--log-level <level>', 'Set log level (error, warn, info, debug)', 'info')
        .option('--config <path>', 'Path to config file')
        .option('--network <network>', 'IC Network to use (ic, local)', 'local');

    // Global options handler
    program.hook('preAction', (thisCommand: any) => {
        const options = thisCommand.opts();
        
        // Set log level
        if (options.verbose) {
            setLogLevel('debug');
        } else if (options.quiet) {
            setLogLevel('error');
        } else if (options.logLevel) {
            setLogLevel(options.logLevel);
        }

        // Update config
        if (options.logLevel) {
            configManager.set('logLevel', options.logLevel);
        }
        if (options.network) {
            configManager.set('network', options.network);
        }
        if (options.config) {
            configManager.loadFromFile(options.config);
        }
    });

    // Core Commands (New Architecture)
    program.addCommand(createInitCommand());
    program.addCommand(createAnalyzeCommand());
    program.addCommand(createBuildCommand());
    program.addCommand(createDeployCommand());
    program.addCommand(createNetworkCommand());
    program.addCommand(createIntegrateCommand());
    program.addCommand(createSecretsCommand());
    program.addCommand(createStatusCommand());
    program.addCommand(createLogsCommand());
    program.addCommand(createConfigureCommand());
    program.addCommand(createVersionCommand());

    // Help customization
    program.configureHelp({
        sortSubcommands: true,
        subcommandTerm: (cmd: any) => Colors.cyan(cmd.name()),
        optionTerm: (option: any) => Colors.yellow(option.flags),
        argumentTerm: (argument: any) => Colors.magenta(`<${argument.name()}>`),
    });

    // Custom help
    program.on('--help', () => {
        console.log();
        console.log(Colors.bold('🚀 Quick Start:'));
        console.log();
        console.log('  ' + Colors.gray('# Initialize ICP project pipeline'));
        console.log('  ' + Colors.cyan('dcanary init'));
        console.log();
        console.log('  ' + Colors.gray('# Analyze ICP project structure'));
        console.log('  ' + Colors.cyan('dcanary analyze'));
        console.log();
        console.log('  ' + Colors.gray('# Set up Git integration for ICP'));
        console.log('  ' + Colors.cyan('dcanary integrate github --auto-deploy'));
        console.log();
        console.log('  ' + Colors.gray('# Deploy canisters to IC'));
        console.log('  ' + Colors.cyan('dcanary deploy --network ic'));
        console.log();
        console.log(Colors.bold('� ICP Project Types Supported:'));
        console.log('  ' + Colors.green('• Motoko canisters'));
        console.log('  ' + Colors.green('• Rust canisters'));
        console.log('  ' + Colors.green('• Azle (TypeScript) canisters'));
        console.log('  ' + Colors.green('• Frontend DApps (React/Vue with IC integration)'));
        console.log('  ' + Colors.green('• Full-stack ICP applications'));
        console.log();
        console.log(Colors.bold('🔗 ICP Deployment Features:'));
        console.log('  ' + Colors.blue('• Mainnet & local replica deployment'));
        console.log('  ' + Colors.blue('• Canister upgrade management'));
        console.log('  ' + Colors.blue('• Cycles management & monitoring'));
        console.log('  ' + Colors.blue('• Asset canister deployment'));
        console.log('  ' + Colors.blue('• Multi-canister coordination'));
        console.log();
        console.log(Colors.bold('📖 Learn More:'));
        console.log('  ' + Colors.gray('Website: https://dcanary.io'));
        console.log('  ' + Colors.gray('Docs:    https://docs.dcanary.io'));
        console.log('  ' + Colors.gray('GitHub:  https://github.com/dcanary-org/dcanary'));
        console.log();
    });

    // Error handling
    program.exitOverride((err: any) => {
        if (err.code === 'commander.help' || err.code === 'commander.version') {
            process.exit(0);
        }
        if (err.code === 'commander.unknownCommand') {
            printError('Unknown Command', `Unknown command: ${err.message}`);
            console.log();
            console.log(Colors.gray('Run ' + Colors.cyan('dcanary --help') + ' to see available commands'));
            console.log(Colors.gray('Or try ' + Colors.cyan('dcanary init') + ' to get started'));
            process.exit(1);
        }
        if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
            printError('Missing Argument', err.message);
            console.log();
            console.log(Colors.gray('Run ' + Colors.cyan('dcanary <command> --help') + ' for command-specific help'));
            process.exit(1);
        }
        
        logger.error('CLI error', { error: err.message, code: err.code });
        process.exit(err.exitCode || 1);
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', { error: error.message, stack: error.stack });
        printError('Fatal Error', 'An unexpected error occurred');
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled rejection', { reason, promise });
        printError('Fatal Error', 'An unexpected error occurred');
        process.exit(1);
    });

    // Handle SIGINT (Ctrl+C) gracefully
    process.on('SIGINT', () => {
        console.log();
        console.log(Colors.gray('Operation cancelled by user'));
        process.exit(130);
    });

    // Show header for interactive usage (not in CI)
    if (process.argv.length === 2 && !process.env.CI) {
        printHeader('Dcanary - Decentralized CI/CD for Internet Computer');
        console.log(Colors.gray('🌐 Run ' + Colors.cyan('dcanary init') + ' to set up ICP project pipeline'));
        console.log(Colors.gray('📖 Run ' + Colors.cyan('dcanary --help') + ' to see all commands'));
        console.log();
        process.exit(0);
    }

    // Parse command line arguments
    program.parse(process.argv);
}

// Run the CLI
if (require.main === module) {
    main();
}

export { main };
