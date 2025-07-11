"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSCMCommand = createSCMCommand;
const commander_1 = require("commander");
const ui_1 = require("../utils/ui");
const integration_service_1 = require("../services/scm/integration-service");
const fs = __importStar(require("fs-extra"));
function createSCMCommand() {
    const command = new commander_1.Command('scm');
    command
        .description('Manage SCM (Source Control Management) integration')
        .action(() => {
        command.help();
    });
    // Show integration status
    command
        .command('status')
        .description('Show SCM integration status')
        .action(async () => {
        try {
            const status = await integration_service_1.scmIntegrationService.getIntegrationStatus();
            if (!status.configured) {
                (0, ui_1.printError)('Not Configured', 'SCM integration is not set up');
                console.log();
                console.log(ui_1.Colors.gray('Run: ') + ui_1.Colors.cyan('dcanary integrate <provider>'));
                return;
            }
            console.log(ui_1.Colors.bold('🔗 SCM Integration Status'));
            console.log();
            console.log(`  Provider: ${ui_1.Colors.yellow(status.provider || 'Not set')}`);
            console.log(`  Repository: ${ui_1.Colors.cyan(status.repository || 'Not set')}`);
            console.log(`  Webhook: ${status.webhook ? ui_1.Colors.green('configured') : ui_1.Colors.red('not configured')}`);
            // Show detailed configuration if available
            if (await fs.pathExists('.dcanary/scm-integration.json')) {
                const config = await fs.readJson('.dcanary/scm-integration.json');
                console.log();
                console.log(ui_1.Colors.bold('Configuration:'));
                console.log(`  Events: ${ui_1.Colors.blue(config.events.join(', '))}`);
                console.log(`  Branches: ${ui_1.Colors.magenta(config.branches.join(', '))}`);
                console.log(`  Auto-deploy: ${config.autoDeploy ? ui_1.Colors.green('enabled') : ui_1.Colors.gray('disabled')}`);
                if (config.webhook) {
                    console.log(`  Webhook ID: ${ui_1.Colors.gray(config.webhook.id)}`);
                    console.log(`  Webhook URL: ${ui_1.Colors.gray(config.webhook.url)}`);
                }
            }
            console.log();
            console.log(ui_1.Colors.gray('Commands:'));
            console.log(`  ${ui_1.Colors.cyan('dcanary scm test')} - Test integration`);
            console.log(`  ${ui_1.Colors.cyan('dcanary scm webhook')} - Webhook management`);
        }
        catch (error) {
            (0, ui_1.printError)('Status Check Failed', error.message);
            process.exit(1);
        }
    });
    // Test SCM integration
    command
        .command('test')
        .description('Test SCM integration')
        .option('-p, --provider <provider>', 'Test specific provider')
        .action(async (options) => {
        try {
            const spinner = new ui_1.Spinner();
            spinner.start('Testing SCM integration...');
            const success = await integration_service_1.scmIntegrationService.testIntegration(options.provider);
            if (success) {
                spinner.succeed('Integration test passed');
                (0, ui_1.printSuccess)('✅ SCM integration is working correctly');
                console.log();
                console.log(ui_1.Colors.bold('Test Results:'));
                console.log(`  ${ui_1.Colors.green('✓')} Authentication successful`);
                console.log(`  ${ui_1.Colors.green('✓')} Repository access verified`);
                console.log(`  ${ui_1.Colors.green('✓')} Webhook configuration valid`);
            }
            else {
                spinner.fail('Integration test failed');
                (0, ui_1.printError)('Test Failed', 'SCM integration is not working properly');
                console.log();
                console.log(ui_1.Colors.gray('Troubleshooting:'));
                console.log(ui_1.Colors.gray('  • Check webhook configuration'));
                console.log(ui_1.Colors.gray('  • Verify access token permissions'));
                console.log(ui_1.Colors.gray('  • Review setup: dcanary scm setup'));
                process.exit(1);
            }
        }
        catch (error) {
            (0, ui_1.printError)('Test Failed', error.message);
            process.exit(1);
        }
    });
    // Webhook management subcommand
    const webhookCmd = new commander_1.Command('webhook');
    webhookCmd
        .description('Webhook management commands')
        .action(() => {
        webhookCmd.help();
    });
    // Test webhook
    webhookCmd
        .command('test')
        .description('Test webhook integration')
        .action(async () => {
        try {
            const spinner = new ui_1.Spinner();
            spinner.start('Testing webhook...');
            const success = await integration_service_1.scmIntegrationService.testIntegration();
            if (success) {
                spinner.succeed('Webhook test passed');
                (0, ui_1.printSuccess)('✅ Webhook is working correctly');
            }
            else {
                spinner.fail('Webhook test failed');
                (0, ui_1.printError)('Test Failed', 'Webhook is not working properly');
                process.exit(1);
            }
        }
        catch (error) {
            (0, ui_1.printError)('Test Failed', error.message);
            process.exit(1);
        }
    });
    // Simulate webhook event
    webhookCmd
        .command('simulate')
        .description('Simulate a webhook event for testing')
        .option('-t, --type <type>', 'Event type (push, pull_request, release)', 'push')
        .option('-b, --branch <branch>', 'Branch name', 'main')
        .option('-c, --commit <commit>', 'Commit SHA', 'abc123')
        .option('-a, --author <author>', 'Author name', 'test-user')
        .option('-m, --message <message>', 'Commit message', 'Test commit')
        .action(async (options) => {
        try {
            const status = await integration_service_1.scmIntegrationService.getIntegrationStatus();
            if (!status.configured) {
                (0, ui_1.printError)('Not Configured', 'SCM integration must be set up first');
                return;
            }
            // Create simulated payload based on provider
            let payload;
            if (status.provider === 'github') {
                payload = {
                    ref: `refs/heads/${options.branch}`,
                    head_commit: {
                        id: options.commit,
                        message: options.message,
                        author: { name: options.author },
                        timestamp: new Date().toISOString()
                    }
                };
            }
            else if (status.provider === 'gitlab') {
                payload = {
                    object_kind: options.type,
                    ref: `refs/heads/${options.branch}`,
                    commits: [{
                            id: options.commit,
                            message: options.message,
                            author: { name: options.author },
                            timestamp: new Date().toISOString()
                        }]
                };
            }
            (0, ui_1.printInfo)('Simulating Webhook', `${options.type} event on ${options.branch} branch`);
            const event = await integration_service_1.scmIntegrationService.handleWebhookEvent(payload, status.provider);
            if (event) {
                (0, ui_1.printSuccess)('Event Processed', 'Webhook simulation successful');
                console.log();
                console.log(ui_1.Colors.bold('Event Details:'));
                console.log(`  Type: ${ui_1.Colors.yellow(event.type)}`);
                console.log(`  Branch: ${ui_1.Colors.blue(event.branch)}`);
                console.log(`  Commit: ${ui_1.Colors.gray(event.commit)}`);
                console.log(`  Author: ${ui_1.Colors.cyan(event.author)}`);
                console.log(`  Message: ${ui_1.Colors.white(event.message)}`);
                console.log();
                console.log(ui_1.Colors.gray('This would trigger:'));
                console.log(ui_1.Colors.gray('  1. Build process'));
                console.log(ui_1.Colors.gray('  2. Test execution'));
                console.log(ui_1.Colors.gray('  3. Canister deployment (if auto-deploy enabled)'));
            }
            else {
                (0, ui_1.printInfo)('Event Ignored', 'Event did not match trigger criteria');
            }
        }
        catch (error) {
            (0, ui_1.printError)('Simulation Failed', error.message);
            process.exit(1);
        }
    });
    command.addCommand(webhookCmd);
    // Show setup instructions
    command
        .command('setup')
        .description('Show SCM setup instructions')
        .action(async () => {
        try {
            const instructionsFile = '.dcanary/SCM_SETUP_INSTRUCTIONS.md';
            if (!await fs.pathExists(instructionsFile)) {
                (0, ui_1.printError)('No Instructions', 'Setup instructions not found. Run integration setup first.');
                console.log();
                console.log(ui_1.Colors.gray('Run: ') + ui_1.Colors.cyan('dcanary integrate <provider>'));
                return;
            }
            const instructions = await fs.readFile(instructionsFile, 'utf8');
            console.log(instructions);
        }
        catch (error) {
            (0, ui_1.printError)('Instructions Error', error.message);
            process.exit(1);
        }
    });
    return command;
}
//# sourceMappingURL=scm.js.map