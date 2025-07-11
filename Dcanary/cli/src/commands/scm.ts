import { Command } from 'commander';
import { Colors, printSuccess, printError, printInfo, Spinner } from '../utils/ui';
import { logger } from '../utils/logger';
import { scmIntegrationService } from '../services/scm/integration-service';
import * as fs from 'fs-extra';

export function createSCMCommand(): Command {
    const command = new Command('scm');

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
                const status = await scmIntegrationService.getIntegrationStatus();
                
                if (!status.configured) {
                    printError('Not Configured', 'SCM integration is not set up');
                    console.log();
                    console.log(Colors.gray('Run: ') + Colors.cyan('dcanary integrate <provider>'));
                    return;
                }

                console.log(Colors.bold('🔗 SCM Integration Status'));
                console.log();
                console.log(`  Provider: ${Colors.yellow(status.provider || 'Not set')}`);
                console.log(`  Repository: ${Colors.cyan(status.repository || 'Not set')}`);
                console.log(`  Webhook: ${status.webhook ? Colors.green('configured') : Colors.red('not configured')}`);
                
                // Show detailed configuration if available
                if (await fs.pathExists('.dcanary/scm-integration.json')) {
                    const config = await fs.readJson('.dcanary/scm-integration.json');
                    
                    console.log();
                    console.log(Colors.bold('Configuration:'));
                    console.log(`  Events: ${Colors.blue(config.events.join(', '))}`);
                    console.log(`  Branches: ${Colors.magenta(config.branches.join(', '))}`);
                    console.log(`  Auto-deploy: ${config.autoDeploy ? Colors.green('enabled') : Colors.gray('disabled')}`);
                    
                    if (config.webhook) {
                        console.log(`  Webhook ID: ${Colors.gray(config.webhook.id)}`);
                        console.log(`  Webhook URL: ${Colors.gray(config.webhook.url)}`);
                    }
                }

                console.log();
                console.log(Colors.gray('Commands:'));
                console.log(`  ${Colors.cyan('dcanary scm test')} - Test integration`);
                console.log(`  ${Colors.cyan('dcanary scm webhook')} - Webhook management`);

            } catch (error: any) {
                printError('Status Check Failed', error.message);
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
                const spinner = new Spinner();
                spinner.start('Testing SCM integration...');

                const success = await scmIntegrationService.testIntegration(options.provider);
                
                if (success) {
                    spinner.succeed('Integration test passed');
                    printSuccess('✅ SCM integration is working correctly');
                    
                    console.log();
                    console.log(Colors.bold('Test Results:'));
                    console.log(`  ${Colors.green('✓')} Authentication successful`);
                    console.log(`  ${Colors.green('✓')} Repository access verified`);
                    console.log(`  ${Colors.green('✓')} Webhook configuration valid`);
                    
                } else {
                    spinner.fail('Integration test failed');
                    printError('Test Failed', 'SCM integration is not working properly');
                    
                    console.log();
                    console.log(Colors.gray('Troubleshooting:'));
                    console.log(Colors.gray('  • Check webhook configuration'));
                    console.log(Colors.gray('  • Verify access token permissions'));
                    console.log(Colors.gray('  • Review setup: dcanary scm setup'));
                    
                    process.exit(1);
                }

            } catch (error: any) {
                printError('Test Failed', error.message);
                process.exit(1);
            }
        });

    // Webhook management subcommand
    const webhookCmd = new Command('webhook');
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
                const spinner = new Spinner();
                spinner.start('Testing webhook...');

                const success = await scmIntegrationService.testIntegration();
                
                if (success) {
                    spinner.succeed('Webhook test passed');
                    printSuccess('✅ Webhook is working correctly');
                } else {
                    spinner.fail('Webhook test failed');
                    printError('Test Failed', 'Webhook is not working properly');
                    process.exit(1);
                }

            } catch (error: any) {
                printError('Test Failed', error.message);
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
                const status = await scmIntegrationService.getIntegrationStatus();
                
                if (!status.configured) {
                    printError('Not Configured', 'SCM integration must be set up first');
                    return;
                }

                // Create simulated payload based on provider
                let payload: any;
                
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
                } else if (status.provider === 'gitlab') {
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

                printInfo('Simulating Webhook', `${options.type} event on ${options.branch} branch`);
                
                const event = await scmIntegrationService.handleWebhookEvent(payload, status.provider!);
                
                if (event) {
                    printSuccess('Event Processed', 'Webhook simulation successful');
                    console.log();
                    console.log(Colors.bold('Event Details:'));
                    console.log(`  Type: ${Colors.yellow(event.type)}`);
                    console.log(`  Branch: ${Colors.blue(event.branch)}`);
                    console.log(`  Commit: ${Colors.gray(event.commit)}`);
                    console.log(`  Author: ${Colors.cyan(event.author)}`);
                    console.log(`  Message: ${Colors.white(event.message)}`);
                    
                    console.log();
                    console.log(Colors.gray('This would trigger:'));
                    console.log(Colors.gray('  1. Build process'));
                    console.log(Colors.gray('  2. Test execution'));
                    console.log(Colors.gray('  3. Canister deployment (if auto-deploy enabled)'));
                    
                } else {
                    printInfo('Event Ignored', 'Event did not match trigger criteria');
                }

            } catch (error: any) {
                printError('Simulation Failed', error.message);
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
                    printError('No Instructions', 'Setup instructions not found. Run integration setup first.');
                    console.log();
                    console.log(Colors.gray('Run: ') + Colors.cyan('dcanary integrate <provider>'));
                    return;
                }

                const instructions = await fs.readFile(instructionsFile, 'utf8');
                console.log(instructions);

            } catch (error: any) {
                printError('Instructions Error', error.message);
                process.exit(1);
            }
        });

    return command;
}
