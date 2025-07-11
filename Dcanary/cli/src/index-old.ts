#!/usr/bin/env node

import { Command } from 'commander';
import { createAddInstructionsCommand } from './commands/add-instructions';
import { createRequestVerificationCommand } from './commands/request-verification';
import { createGetStatusCommand } from './commands/get-status';
import { createConfigureCommand } from './commands/configure';
import { createVersionCommand } from './commands/version';
import { createSCMIntegrationCommand } from './commands/scm-integration';
import { createWebhookCommand } from './commands/webhook';
import { Colors, printHeader, printError } from './utils/ui';
import { logger, setLogLevel } from './utils/logger';
import { configManager } from './utils/config';

function main() {
    const program = new Command();

    // CLI configuration
    program
        .name('mody')
        .description('Mody - Decentralized CI/CD Pipeline CLI for ICP')
        .version('1.0.0')
        .option('-v, --verbose', 'Enable verbose logging')
        .option('-q, --quiet', 'Suppress non-error output')
        .option('--log-level <level>', 'Set log level (error, warn, info, debug)', 'info');

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

        // Update config with log level
        if (options.logLevel) {
            configManager.set('logLevel', options.logLevel);
        }
    });

    // Add commands
    program.addCommand(createAddInstructionsCommand());
    program.addCommand(createRequestVerificationCommand());
    program.addCommand(createGetStatusCommand());
    program.addCommand(createConfigureCommand());
    program.addCommand(createVersionCommand());
    program.addCommand(createSCMIntegrationCommand());
    program.addCommand(createWebhookCommand());

    // Help customization
    program.configureHelp({
        sortSubcommands: true,
        subcommandTerm: (cmd: any) => Colors.cyan(cmd.name()),
        optionTerm: (option: any) => Colors.yellow(option.flags),
        argumentTerm: (argument: any) => Colors.magenta(`<${argument.name()}>`),
    });

    // Custom help for main command
    program.on('--help', () => {
        console.log();
        console.log(Colors.bold('Examples:'));
        console.log('  ' + Colors.gray('# Add build instructions from file'));
        console.log('  ' + Colors.cyan('mody add-instructions') + ' -p my-project -v 1.0.0 -f build.sh');
        console.log();
        console.log('  ' + Colors.gray('# Request verification and wait for completion'));
        console.log('  ' + Colors.cyan('mody request-verification') + ' -p my-project -v 1.0.0');
        console.log();
        console.log('  ' + Colors.gray('# Check verification status'));
        console.log('  ' + Colors.cyan('mody get-status') + ' -p my-project -v 1.0.0');
        console.log();
        console.log('  ' + Colors.gray('# Configure CLI settings'));
        console.log('  ' + Colors.cyan('mody configure') + ' --set-build-canister-id abc123');
        console.log();
        console.log(Colors.bold('Environment Variables:'));
        console.log('  ' + Colors.yellow('MODY_BUILD_INSTRUCTIONS_CANISTER_ID') + '  Build instructions canister ID');
        console.log('  ' + Colors.yellow('MODY_VERIFICATION_CANISTER_ID') + '       Verification canister ID');
        console.log('  ' + Colors.yellow('MODY_BUILD_EXECUTOR_CANISTER_IDS') + '    Comma-separated executor IDs');
        console.log('  ' + Colors.yellow('MODY_NETWORK') + '                        Network (ic or local)');
        console.log('  ' + Colors.yellow('MODY_IDENTITY') + '                       Identity to use');
        console.log('  ' + Colors.yellow('MODY_TIMEOUT') + '                        Default timeout in seconds');
        console.log('  ' + Colors.yellow('MODY_LOG_LEVEL') + '                      Log level (error, warn, info, debug)');
        console.log();
        console.log(Colors.bold('For more information:'));
        console.log('  ' + Colors.gray('Visit: https://github.com/your-org/mody-cli'));
        console.log('  ' + Colors.gray('Docs:  https://docs.your-org.com/mody-cli'));
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
            console.log(Colors.gray('Run ' + Colors.cyan('mody --help') + ' to see available commands'));
            process.exit(1);
        }
        if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
            printError('Missing Argument', err.message);
            console.log();
            console.log(Colors.gray('Run ' + Colors.cyan('mody <command> --help') + ' for command-specific help'));
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
        printHeader('Mody - Decentralized CI/CD Pipeline CLI');
        console.log(Colors.gray('Run ' + Colors.cyan('mody --help') + ' to see available commands'));
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
