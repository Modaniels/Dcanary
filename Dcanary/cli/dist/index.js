#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const commander_1 = require("commander");
const ui_1 = require("./utils/ui");
const logger_1 = require("./utils/logger");
const config_1 = require("./utils/config");
// Import new command modules
const init_1 = require("./commands/init");
const analyze_1 = require("./commands/analyze");
const build_1 = require("./commands/build");
const deploy_1 = require("./commands/deploy");
const network_1 = require("./commands/network");
const integrate_1 = require("./commands/integrate");
const secrets_1 = require("./commands/secrets");
const status_1 = require("./commands/status");
const logs_1 = require("./commands/logs");
const configure_1 = require("./commands/configure");
const version_1 = require("./commands/version");
const scm_1 = require("./commands/scm");
function main() {
    const program = new commander_1.Command();
    // CLI configuration
    program
        .name('dcanary')
        .description('Dcanary - Decentralized CI/CD Pipeline for Internet Computer')
        .version('1.0.0')
        .option('-v, --verbose', 'Enable verbose logging')
        .option('-q, --quiet', 'Suppress non-error output')
        .option('--log-level <level>', 'Set log level (error, warn, info, debug)', 'info')
        .option('--config <path>', 'Path to config file')
        .option('--network <network>', 'IC Network to use (ic, local)', 'local');
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
        // Update config
        if (options.logLevel) {
            config_1.configManager.set('logLevel', options.logLevel);
        }
        if (options.network) {
            config_1.configManager.set('network', options.network);
        }
        if (options.config) {
            config_1.configManager.loadFromFile(options.config);
        }
    });
    // Core Commands (New Architecture)
    program.addCommand((0, init_1.createInitCommand)());
    program.addCommand((0, analyze_1.createAnalyzeCommand)());
    program.addCommand((0, build_1.createBuildCommand)());
    program.addCommand((0, deploy_1.createDeployCommand)());
    program.addCommand((0, network_1.createNetworkCommand)());
    program.addCommand((0, integrate_1.createIntegrateCommand)());
    program.addCommand((0, secrets_1.createSecretsCommand)());
    program.addCommand((0, status_1.createStatusCommand)());
    program.addCommand((0, logs_1.createLogsCommand)());
    program.addCommand((0, configure_1.createConfigureCommand)());
    program.addCommand((0, version_1.createVersionCommand)());
    program.addCommand((0, scm_1.createSCMCommand)());
    // Help customization
    program.configureHelp({
        sortSubcommands: true,
        subcommandTerm: (cmd) => ui_1.Colors.cyan(cmd.name()),
        optionTerm: (option) => ui_1.Colors.yellow(option.flags),
        argumentTerm: (argument) => ui_1.Colors.magenta(`<${argument.name()}>`),
    });
    // Custom help
    program.on('--help', () => {
        console.log();
        console.log(ui_1.Colors.bold('🚀 Quick Start:'));
        console.log();
        console.log('  ' + ui_1.Colors.gray('# Initialize ICP project pipeline'));
        console.log('  ' + ui_1.Colors.cyan('dcanary init'));
        console.log();
        console.log('  ' + ui_1.Colors.gray('# Analyze ICP project structure'));
        console.log('  ' + ui_1.Colors.cyan('dcanary analyze'));
        console.log();
        console.log('  ' + ui_1.Colors.gray('# Set up Git integration for ICP'));
        console.log('  ' + ui_1.Colors.cyan('dcanary integrate github --auto-deploy'));
        console.log();
        console.log('  ' + ui_1.Colors.gray('# Deploy canisters to IC'));
        console.log('  ' + ui_1.Colors.cyan('dcanary deploy --network ic'));
        console.log();
        console.log(ui_1.Colors.bold('� ICP Project Types Supported:'));
        console.log('  ' + ui_1.Colors.green('• Motoko canisters'));
        console.log('  ' + ui_1.Colors.green('• Rust canisters'));
        console.log('  ' + ui_1.Colors.green('• Azle (TypeScript) canisters'));
        console.log('  ' + ui_1.Colors.green('• Frontend DApps (React/Vue with IC integration)'));
        console.log('  ' + ui_1.Colors.green('• Full-stack ICP applications'));
        console.log();
        console.log(ui_1.Colors.bold('🔗 ICP Deployment Features:'));
        console.log('  ' + ui_1.Colors.blue('• Mainnet & local replica deployment'));
        console.log('  ' + ui_1.Colors.blue('• Canister upgrade management'));
        console.log('  ' + ui_1.Colors.blue('• Cycles management & monitoring'));
        console.log('  ' + ui_1.Colors.blue('• Asset canister deployment'));
        console.log('  ' + ui_1.Colors.blue('• Multi-canister coordination'));
        console.log();
        console.log(ui_1.Colors.bold('📖 Learn More:'));
        console.log('  ' + ui_1.Colors.gray('Website: https://dcanary.io'));
        console.log('  ' + ui_1.Colors.gray('Docs:    https://docs.dcanary.io'));
        console.log('  ' + ui_1.Colors.gray('GitHub:  https://github.com/dcanary-org/dcanary'));
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
            console.log(ui_1.Colors.gray('Run ' + ui_1.Colors.cyan('dcanary --help') + ' to see available commands'));
            console.log(ui_1.Colors.gray('Or try ' + ui_1.Colors.cyan('dcanary init') + ' to get started'));
            process.exit(1);
        }
        if (err.code === 'commander.missingArgument' || err.code === 'commander.missingMandatoryOptionValue') {
            (0, ui_1.printError)('Missing Argument', err.message);
            console.log();
            console.log(ui_1.Colors.gray('Run ' + ui_1.Colors.cyan('dcanary <command> --help') + ' for command-specific help'));
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
        (0, ui_1.printHeader)('Dcanary - Decentralized CI/CD for Internet Computer');
        console.log(ui_1.Colors.gray('🌐 Run ' + ui_1.Colors.cyan('dcanary init') + ' to set up ICP project pipeline'));
        console.log(ui_1.Colors.gray('📖 Run ' + ui_1.Colors.cyan('dcanary --help') + ' to see all commands'));
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