#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const add_instructions_1 = require("./commands/add-instructions");
const request_verification_1 = require("./commands/request-verification");
const get_status_1 = require("./commands/get-status");
const configure_1 = require("./commands/configure");
const version_1 = require("./commands/version");
const scm_integration_1 = require("./commands/scm-integration");
const webhook_1 = require("./commands/webhook");
const ui_1 = require("./utils/ui");
const logger_1 = require("./utils/logger");
const config_1 = require("./utils/config");
function main() {
    const program = new commander_1.Command();
    // CLI configuration
    program
        .name('mody')
        .description('Mody - Decentralized CI/CD Pipeline CLI for ICP')
        .version('1.0.0')
        .option('-v, --verbose', 'Enable verbose logging')
        .option('-q, --quiet', 'Suppress non-error output')
        .option('--log-level <level>', 'Set log level (error, warn, info, debug)', 'info');
    // Global options handler
    program.hook('preAction', (thisCommand) => {
        const options = thisCommand.opts();
        // Set log level
        if (options.verbose) {
            (0, logger_1.setLogLevel)('debug');
        }
        else if (options.quiet) {
            (0, logger_1.setLogLevel)('error');
        }
        else if (options.logLevel) {
            (0, logger_1.setLogLevel)(options.logLevel);
        }
        // Update config with log level
        if (options.logLevel) {
            config_1.configManager.set('logLevel', options.logLevel);
        }
    });
    // Add commands
    program.addCommand((0, add_instructions_1.createAddInstructionsCommand)());
    program.addCommand((0, request_verification_1.createRequestVerificationCommand)());
    program.addCommand((0, get_status_1.createGetStatusCommand)());
    program.addCommand((0, configure_1.createConfigureCommand)());
    program.addCommand((0, version_1.createVersionCommand)());
    program.addCommand((0, scm_integration_1.createSCMIntegrationCommand)());
    program.addCommand((0, webhook_1.createWebhookCommand)());
    // Help customization
    program.configureHelp({
        sortSubcommands: true,
        subcommandTerm: (cmd) => ui_1.Colors.cyan(cmd.name()),
        optionTerm: (option) => ui_1.Colors.yellow(option.flags),
        argumentTerm: (argument) => ui_1.Colors.magenta(`<${argument.name()}>`),
    });
    // Custom help for main command
    program.on('--help', () => {
        console.log();
        console.log(ui_1.Colors.bold('Examples:'));
        console.log('  ' + ui_1.Colors.gray('# Add build instructions from file'));
        console.log('  ' + ui_1.Colors.cyan('mody add-instructions') + ' -p my-project -v 1.0.0 -f build.sh');
        console.log();
        console.log('  ' + ui_1.Colors.gray('# Request verification and wait for completion'));
        console.log('  ' + ui_1.Colors.cyan('mody request-verification') + ' -p my-project -v 1.0.0');
        console.log();
        console.log('  ' + ui_1.Colors.gray('# Check verification status'));
        console.log('  ' + ui_1.Colors.cyan('mody get-status') + ' -p my-project -v 1.0.0');
        console.log();
        console.log('  ' + ui_1.Colors.gray('# Configure CLI settings'));
        console.log('  ' + ui_1.Colors.cyan('mody configure') + ' --set-build-canister-id abc123');
        console.log();
        console.log(ui_1.Colors.bold('Environment Variables:'));
        console.log('  ' + ui_1.Colors.yellow('MODY_BUILD_INSTRUCTIONS_CANISTER_ID') + '  Build instructions canister ID');
        console.log('  ' + ui_1.Colors.yellow('MODY_VERIFICATION_CANISTER_ID') + '       Verification canister ID');
        console.log('  ' + ui_1.Colors.yellow('MODY_BUILD_EXECUTOR_CANISTER_IDS') + '    Comma-separated executor IDs');
        console.log('  ' + ui_1.Colors.yellow('MODY_NETWORK') + '                        Network (ic or local)');
        console.log('  ' + ui_1.Colors.yellow('MODY_IDENTITY') + '                       Identity to use');
        console.log('  ' + ui_1.Colors.yellow('MODY_TIMEOUT') + '                        Default timeout in seconds');
        console.log('  ' + ui_1.Colors.yellow('MODY_LOG_LEVEL') + '                      Log level (error, warn, info, debug)');
        console.log();
        console.log(ui_1.Colors.bold('For more information:'));
        console.log('  ' + ui_1.Colors.gray('Visit: https://github.com/your-org/mody-cli'));
        console.log('  ' + ui_1.Colors.gray('Docs:  https://docs.your-org.com/mody-cli'));
        console.log();
    });
    // Error handling
    program.exitOverride((err) => {
        if (err.code === 'commander.help' || err.code === 'commander.version') {
            process.exit(0);
        }
        if (err.code === 'commander.unknownCommand') {
            (0, ui_1.printError)('Unknown Command', `Unknown command: ${err.message}`);
            console.log();
            console.log(ui_1.Colors.gray('Run ' + ui_1.Colors.cyan('mody --help') + ' to see available commands'));
            process.exit(1);
        }
        if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
            (0, ui_1.printError)('Missing Argument', err.message);
            console.log();
            console.log(ui_1.Colors.gray('Run ' + ui_1.Colors.cyan('mody <command> --help') + ' for command-specific help'));
            process.exit(1);
        }
        logger_1.logger.error('CLI error', { error: err.message, code: err.code });
        process.exit(err.exitCode || 1);
    });
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger_1.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
        (0, ui_1.printError)('Fatal Error', 'An unexpected error occurred');
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.logger.error('Unhandled rejection', { reason, promise });
        (0, ui_1.printError)('Fatal Error', 'An unexpected error occurred');
        process.exit(1);
    });
    // Handle SIGINT (Ctrl+C) gracefully
    process.on('SIGINT', () => {
        console.log();
        console.log(ui_1.Colors.gray('Operation cancelled by user'));
        process.exit(130);
    });
    // Show header for interactive usage (not in CI)
    if (process.argv.length === 2 && !process.env.CI) {
        (0, ui_1.printHeader)('Mody - Decentralized CI/CD Pipeline CLI');
        console.log(ui_1.Colors.gray('Run ' + ui_1.Colors.cyan('mody --help') + ' to see available commands'));
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
//# sourceMappingURL=index.js.map