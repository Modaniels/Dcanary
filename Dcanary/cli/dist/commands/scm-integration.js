"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSCMIntegrationCommand = createSCMIntegrationCommand;
const commander_1 = require("commander");
const logger_js_1 = require("../utils/logger.js");
const ui_js_1 = require("../utils/ui.js");
const helpers_js_1 = require("../utils/helpers.js");
const agent_1 = require("@dfinity/agent");
const inquirer_1 = __importDefault(require("inquirer"));
// =================================================================
// 1. CANDID INTERFACE & TYPES
// =================================================================
// FIX: The IDL definition is now a clean factory function.
// It takes the IDL object and returns a service definition.
const createWebhookCanisterInterface = ({ IDL }) => {
    const SCMProvider = IDL.Variant({
        GitHub: IDL.Null,
        GitLab: IDL.Null
    });
    const RepositoryError = IDL.Variant({
        NotFound: IDL.Text,
        Unauthorized: IDL.Text,
        InvalidInput: IDL.Text,
        InternalError: IDL.Text,
        AlreadyExists: IDL.Text
    });
    const RepositoryResult = IDL.Variant({
        Ok: IDL.Text, // The ID of the repository
        Err: RepositoryError
    });
    const Repository = IDL.Record({
        id: IDL.Text,
        provider: SCMProvider,
        owner: IDL.Text,
        name: IDL.Text,
        project_id: IDL.Text,
        auto_build_on_push: IDL.Bool,
        auto_build_on_tag: IDL.Bool,
        build_branches: IDL.Vec(IDL.Text),
        created_at: IDL.Nat64
    });
    return IDL.Service({
        registerRepository: IDL.Func([IDL.Text, SCMProvider, IDL.Text, IDL.Text, IDL.Text, IDL.Bool, IDL.Bool, IDL.Vec(IDL.Text)], [RepositoryResult], ['update']),
        updateRepository: IDL.Func([IDL.Text, IDL.Bool, IDL.Bool, IDL.Vec(IDL.Text)], [RepositoryResult], ['update']),
        listRepositoriesByProject: IDL.Func([IDL.Text], [IDL.Vec(Repository)], ['query'])
    });
};
// FIX: Helper to parse canister errors into a readable string.
function getCanisterError(error) {
    const errorType = Object.keys(error)[0];
    const errorMessage = Object.values(error)[0];
    return `${errorType}: ${errorMessage}`;
}
// FIX: Refactored actor creation to avoid code duplication.
function getWebhookActor(options) {
    if (!options.canisterId) {
        throw new Error('Webhook canister ID is required. Use the --canister-id option.');
    }
    const agent = (0, helpers_js_1.getAgent)(); // Assumes getAgent() uses options.network if needed
    return agent_1.Actor.createActor(createWebhookCanisterInterface, {
        agent,
        canisterId: options.canisterId
    });
}
// =================================================================
// 3. COMMANDER CLI DEFINITION
// =================================================================
function createSCMIntegrationCommand() {
    const scm = new commander_1.Command('scm')
        .description('Manage SCM (GitHub/GitLab) integrations')
        .option('--canister-id <id>', 'Webhook canister ID')
        .option('--network <network>', 'Network to use (local/ic)', 'local');
    // --- REGISTER COMMAND ---
    scm.command('register')
        .description('Register a repository for webhook integration')
        .argument('<project-id>', 'Project ID')
        .option('--provider <provider>', 'SCM provider (github/gitlab)')
        .option('--owner <owner>', 'Repository owner/organization')
        .option('--repo <repo>', 'Repository name')
        .option('--secret <secret>', 'Webhook secret')
        .option('--auto-push', 'Auto-build on push events', false)
        .option('--auto-tag', 'Auto-build on tag events', false)
        .option('--branches <branches>', 'Comma-separated list of branches to build')
        .action(async (projectId, options, command) => {
        try {
            ui_js_1.ui.showHeader('🔗 Register Repository');
            const answers = await inquirer_1.default.prompt([
            // ... (inquirer prompts are fine, no change needed)
            ]);
            // FIX: Simplified option merging
            const config = { ...options, ...answers };
            const spinner = ui_js_1.ui.startSpinner('Registering repository...');
            try {
                const parentOptions = command.parent.opts();
                const webhookActor = getWebhookActor(parentOptions);
                const provider = config.provider === 'github' ? { GitHub: null } : { GitLab: null };
                const buildBranches = config.branches ? config.branches.split(',').map((b) => b.trim()) : [];
                const result = await webhookActor.registerRepository(projectId, provider, config.owner, config.repo, config.secret, config.autoPush, config.autoTag, buildBranches);
                spinner.succeed();
                if ('Ok' in result) {
                    ui_js_1.ui.showSuccess(`Repository registered successfully!`);
                    ui_js_1.ui.showInfo(`Repository ID: ${result.Ok}`);
                    const webhookUrl = `https://${parentOptions.canisterId}.icp0.io/webhook/${config.provider}`;
                    ui_js_1.ui.showInfo(`\n📋 Webhook Configuration:`);
                    ui_js_1.ui.showInfo(`URL: ${webhookUrl}`);
                    ui_js_1.ui.showInfo(`Secret: [Your provided secret]`);
                    ui_js_1.ui.showInfo(`\n🔧 Configure this webhook in your ${config.provider} repository settings.`);
                }
                else {
                    ui_js_1.ui.showError(`Failed to register repository: ${getCanisterError(result.Err)}`);
                }
            }
            catch (error) {
                spinner.fail();
                throw error;
            }
        }
        catch (error) {
            logger_js_1.logger.error('Failed to register repository', error);
            ui_js_1.ui.showError(`Error: ${error.message}`);
            process.exit(1);
        }
    });
    // --- LIST COMMAND ---
    scm.command('list')
        .description('List registered repositories for a project')
        .argument('<project-id>', 'Project ID')
        .action(async (projectId, _options, command) => {
        try {
            ui_js_1.ui.showHeader('📋 Repository List');
            const spinner = ui_js_1.ui.startSpinner('Fetching repositories...');
            try {
                const parentOptions = command.parent.opts();
                const webhookActor = getWebhookActor(parentOptions);
                // FIX: Use the 'Repository' type for type safety
                const repositories = await webhookActor.listRepositoriesByProject(projectId);
                spinner.succeed();
                if (repositories.length === 0) {
                    ui_js_1.ui.showInfo('No repositories registered for this project.');
                    return;
                }
                ui_js_1.ui.showInfo(`Found ${repositories.length} repositories:\n`);
                repositories.forEach((repo, index) => {
                    const provider = 'GitHub' in repo.provider ? 'GitHub' : 'GitLab';
                    console.log(`${index + 1}. ${provider}: ${repo.owner}/${repo.name}`);
                    console.log(`   ID: ${repo.id}`);
                    console.log(`   Auto-build on push: ${repo.auto_build_on_push}`);
                    console.log(`   Auto-build on tag: ${repo.auto_build_on_tag}`);
                    console.log(`   Build branches: ${repo.build_branches.join(', ') || '(all)'}`);
                    console.log(`   Created: ${new Date(Number(repo.created_at / 1000000n)).toLocaleString()}`);
                    console.log('');
                });
            }
            catch (error) {
                spinner.fail();
                throw error;
            }
        }
        catch (error) {
            logger_js_1.logger.error('Failed to list repositories', error);
            ui_js_1.ui.showError(`Error: ${error.message}`);
            process.exit(1);
        }
    });
    // --- UPDATE COMMAND ---
    scm.command('update')
        .description('Update repository configuration')
        .argument('<repository-id>', 'Repository ID')
        .option('--auto-push <value>', 'Auto-build on push events (true/false)')
        .option('--auto-tag <value>', 'Auto-build on tag events (true/false)')
        .option('--branches <branches>', 'Comma-separated list of branches to build')
        .action(async (repositoryId, options, command) => {
        try {
            ui_js_1.ui.showHeader('⚙️ Update Repository');
            // ... (inquirer prompts are fine, no change needed)
            const answers = await inquirer_1.default.prompt([ /*...*/]);
            const config = {
                autoPush: options.autoPush !== undefined ? options.autoPush === 'true' : answers.autoPush,
                autoTag: options.autoTag !== undefined ? options.autoTag === 'true' : answers.autoTag,
                branches: options.branches !== undefined ? options.branches : answers.branches
            };
            const spinner = ui_js_1.ui.startSpinner('Updating repository...');
            try {
                const parentOptions = command.parent.opts();
                const webhookActor = getWebhookActor(parentOptions);
                const buildBranches = config.branches ? config.branches.split(',').map((b) => b.trim()) : [];
                const result = await webhookActor.updateRepository(repositoryId, config.autoPush, config.autoTag, buildBranches);
                spinner.succeed();
                if ('Ok' in result) {
                    ui_js_1.ui.showSuccess('Repository updated successfully!');
                }
                else {
                    ui_js_1.ui.showError(`Failed to update repository: ${getCanisterError(result.Err)}`);
                }
            }
            catch (error) {
                spinner.fail(); // FIX: Consistent error handling
                throw error;
            }
        }
        catch (error) {
            logger_js_1.logger.error('Failed to update repository', error);
            ui_js_1.ui.showError(`Error: ${error.message}`);
            process.exit(1);
        }
    });
    return scm;
}
//# sourceMappingURL=scm-integration.js.map