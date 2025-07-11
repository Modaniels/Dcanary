"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWebhookCommand = createWebhookCommand;
const commander_1 = require("commander");
const logger_js_1 = require("../utils/logger.js");
const ui_js_1 = require("../utils/ui.js");
const helpers_js_1 = require("../utils/helpers.js");
const agent_1 = require("@dfinity/agent");
// Webhook canister interface for triggers
const webhookCanisterInterface = ({ IDL }) => {
    const WebhookEventType = IDL.Variant({
        Push: IDL.Null,
        PullRequest: IDL.Null,
        MergeRequest: IDL.Null,
        Tag: IDL.Null,
        Release: IDL.Null
    });
    const BuildTrigger = IDL.Record({
        id: IDL.Text,
        project_id: IDL.Text,
        repository_id: IDL.Text,
        trigger_type: WebhookEventType,
        branch: IDL.Opt(IDL.Text),
        commit_sha: IDL.Text,
        commit_message: IDL.Opt(IDL.Text),
        author_name: IDL.Opt(IDL.Text),
        author_email: IDL.Opt(IDL.Text),
        triggered_at: IDL.Nat64,
        verification_id: IDL.Opt(IDL.Text)
    });
    return IDL.Service({
        getBuildTriggers: IDL.Func([IDL.Text], [IDL.Vec(BuildTrigger)], ['query']),
        getBuildTrigger: IDL.Func([IDL.Text], [IDL.Opt(BuildTrigger)], ['query'])
    });
};
function createWebhookCommand() {
    const webhook = new commander_1.Command('webhook')
        .description('Manage webhook events and build triggers')
        .option('--canister-id <id>', 'Webhook canister ID')
        .option('--network <network>', 'Network to use (local/ic)', 'local');
    // List build triggers command
    webhook.command('triggers')
        .description('List build triggers for a project')
        .argument('<project-id>', 'Project ID')
        .option('--limit <limit>', 'Limit number of results', '20')
        .action(async (projectId, options, command) => {
        try {
            const parentOptions = command.parent.opts();
            ui_js_1.ui.showHeader('🔨 Build Triggers');
            const spinner = ui_js_1.ui.startSpinner('Fetching build triggers...');
            try {
                const identity = await (0, helpers_js_1.getIdentity)();
                const agent = await (0, helpers_js_1.getAgent)(parentOptions.network || 'local', identity);
                if (!parentOptions.canisterId) {
                    throw new Error('Webhook canister ID is required. Use --canister-id option.');
                }
                const webhookActor = agent_1.Actor.createActor(webhookCanisterInterface, {
                    agent,
                    canisterId: parentOptions.canisterId
                });
                const result = await webhookActor.getBuildTriggers(projectId);
                spinner.succeed();
                if (result.length === 0) {
                    ui_js_1.ui.showInfo('No build triggers found for this project.');
                    return;
                }
                const limit = parseInt(options.limit);
                const limitedTriggers = result.slice(0, limit);
                ui_js_1.ui.showInfo(`Found ${result.length} build triggers (showing ${limitedTriggers.length}):\n`);
                limitedTriggers.forEach((trigger, index) => {
                    const triggerType = Object.keys(trigger.trigger_type)[0];
                    const triggeredAt = new Date(Number(trigger.triggered_at / 1000000n));
                    console.log(`${index + 1}. ${triggerType} trigger - ${trigger.commit_sha.substring(0, 8)}`);
                    console.log(`   ID: ${trigger.id}`);
                    console.log(`   Repository: ${trigger.repository_id}`);
                    if (trigger.branch.length > 0) {
                        console.log(`   Branch: ${trigger.branch[0]}`);
                    }
                    if (trigger.commit_message.length > 0) {
                        console.log(`   Message: ${trigger.commit_message[0]}`);
                    }
                    if (trigger.author_name.length > 0) {
                        console.log(`   Author: ${trigger.author_name[0]}`);
                    }
                    if (trigger.verification_id.length > 0) {
                        console.log(`   Verification: ${trigger.verification_id[0]}`);
                    }
                    console.log(`   Triggered: ${triggeredAt.toLocaleString()}`);
                    console.log('');
                });
                if (result.length > limit) {
                    ui_js_1.ui.showInfo(`... and ${result.length - limit} more triggers. Use --limit to see more.`);
                }
            }
            catch (error) {
                spinner.fail();
                throw error;
            }
        }
        catch (error) {
            logger_js_1.logger.error('Failed to fetch build triggers', error);
            ui_js_1.ui.showError(`Failed to fetch build triggers: ${error.message}`);
            process.exit(1);
        }
    });
    // Get specific trigger command
    webhook.command('trigger')
        .description('Get details of a specific build trigger')
        .argument('<trigger-id>', 'Build trigger ID')
        .action(async (triggerId, options, command) => {
        try {
            const parentOptions = command.parent.opts();
            ui_js_1.ui.showHeader('🔍 Build Trigger Details');
            const spinner = ui_js_1.ui.startSpinner('Fetching build trigger...');
            try {
                const identity = await (0, helpers_js_1.getIdentity)();
                const agent = await (0, helpers_js_1.getAgent)(parentOptions.network || 'local', identity);
                if (!parentOptions.canisterId) {
                    throw new Error('Webhook canister ID is required. Use --canister-id option.');
                }
                const webhookActor = agent_1.Actor.createActor(webhookCanisterInterface, {
                    agent,
                    canisterId: parentOptions.canisterId
                });
                const triggerOpt = await webhookActor.getBuildTrigger(triggerId);
                spinner.succeed();
                if (triggerOpt.length === 0) {
                    ui_js_1.ui.showError('Build trigger not found.');
                    return;
                }
                const trigger = triggerOpt[0];
                const triggerType = Object.keys(trigger.trigger_type)[0];
                const triggeredAt = new Date(Number(trigger.triggered_at / 1000000n));
                ui_js_1.ui.showInfo('Build Trigger Details:\n');
                console.log(`ID: ${trigger.id}`);
                console.log(`Project ID: ${trigger.project_id}`);
                console.log(`Repository ID: ${trigger.repository_id}`);
                console.log(`Trigger Type: ${triggerType}`);
                console.log(`Commit SHA: ${trigger.commit_sha}`);
                if (trigger.branch.length > 0) {
                    console.log(`Branch: ${trigger.branch[0]}`);
                }
                if (trigger.commit_message.length > 0) {
                    console.log(`Commit Message: ${trigger.commit_message[0]}`);
                }
                if (trigger.author_name.length > 0) {
                    console.log(`Author Name: ${trigger.author_name[0]}`);
                }
                if (trigger.author_email.length > 0) {
                    console.log(`Author Email: ${trigger.author_email[0]}`);
                }
                if (trigger.verification_id.length > 0) {
                    console.log(`Verification ID: ${trigger.verification_id[0]}`);
                }
                console.log(`Triggered At: ${triggeredAt.toLocaleString()}`);
            }
            catch (error) {
                spinner.fail();
                throw error;
            }
        }
        catch (error) {
            logger_js_1.logger.error('Failed to fetch build trigger', error);
            ui_js_1.ui.showError(`Failed to fetch build trigger: ${error.message}`);
            process.exit(1);
        }
    });
    // Test webhook command (for local testing)
    webhook.command('test')
        .description('Test webhook integration locally')
        .argument('<repository-id>', 'Repository ID')
        .option('--event <event>', 'Event type (push/tag)', 'push')
        .option('--branch <branch>', 'Branch name', 'main')
        .option('--commit <commit>', 'Commit SHA', 'test-commit-sha')
        .action(async (repositoryId, options, command) => {
        try {
            const parentOptions = command.parent.opts();
            ui_js_1.ui.showHeader('🧪 Test Webhook');
            ui_js_1.ui.showInfo('Testing webhook integration...\n');
            ui_js_1.ui.showInfo(`Repository ID: ${repositoryId}`);
            ui_js_1.ui.showInfo(`Event Type: ${options.event}`);
            ui_js_1.ui.showInfo(`Branch: ${options.branch}`);
            ui_js_1.ui.showInfo(`Commit SHA: ${options.commit}`);
            // This would be a simulation of webhook processing
            ui_js_1.ui.showSuccess('\n✅ Webhook test simulation completed!');
            ui_js_1.ui.showInfo('In a real scenario, this would:');
            ui_js_1.ui.showInfo('1. Verify webhook signature');
            ui_js_1.ui.showInfo('2. Parse webhook payload');
            ui_js_1.ui.showInfo('3. Check repository configuration');
            ui_js_1.ui.showInfo('4. Create build trigger');
            ui_js_1.ui.showInfo('5. Optionally start verification process');
        }
        catch (error) {
            logger_js_1.logger.error('Failed to test webhook', error);
            ui_js_1.ui.showError(`Failed to test webhook: ${error.message}`);
            process.exit(1);
        }
    });
    return webhook;
}
//# sourceMappingURL=webhook.js.map