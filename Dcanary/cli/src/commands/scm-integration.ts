import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { ui } from '../utils/ui.js';
import { getIdentity, getAgent } from '../utils/helpers.js';
import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid'; // <-- FIX: Import IDL
import inquirer from 'inquirer';

// =================================================================
// 1. CANDID INTERFACE & TYPES
// =================================================================

// FIX: The IDL definition is now a clean factory function.
// It takes the IDL object and returns a service definition.
const createWebhookCanisterInterface = ({ IDL }: any) => {
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
        registerRepository: IDL.Func(
            [IDL.Text, SCMProvider, IDL.Text, IDL.Text, IDL.Text, IDL.Bool, IDL.Bool, IDL.Vec(IDL.Text)],
            [RepositoryResult],
            ['update']
        ),
        updateRepository: IDL.Func(
            [IDL.Text, IDL.Bool, IDL.Bool, IDL.Vec(IDL.Text)],
            [RepositoryResult],
            ['update']
        ),
        listRepositoriesByProject: IDL.Func(
            [IDL.Text],
            [IDL.Vec(Repository)],
            ['query']
        )
    });
};

// FIX: Define TypeScript types that match the Candid interface for type safety.
type SCMProvider = { GitHub: null } | { GitLab: null };
type RepositoryError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { InternalError: string }
    | { AlreadyExists: string };

type RepositoryResult = { Ok: string } | { Err: RepositoryError };

interface Repository {
    id: string;
    provider: SCMProvider;
    owner: string;
    name: string;
    project_id: string;
    auto_build_on_push: boolean;
    auto_build_on_tag: boolean;
    build_branches: string[];
    created_at: bigint;
}

// =================================================================
// 2. HELPER FUNCTIONS
// =================================================================

interface SCMIntegrationOptions {
    canisterId?: string;
    network?: string;
}

// FIX: Helper to parse canister errors into a readable string.
function getCanisterError(error: RepositoryError): string {
    const errorType = Object.keys(error)[0];
    const errorMessage = Object.values(error)[0];
    return `${errorType}: ${errorMessage}`;
}

// FIX: Refactored actor creation to avoid code duplication.
function getWebhookActor(options: SCMIntegrationOptions) {
    if (!options.canisterId) {
        throw new Error('Webhook canister ID is required. Use the --canister-id option.');
    }
    const agent = getAgent(); // Assumes getAgent() uses options.network if needed

    return Actor.createActor<any>(createWebhookCanisterInterface, {
        agent,
        canisterId: options.canisterId
    });
}


// =================================================================
// 3. COMMANDER CLI DEFINITION
// =================================================================

export function createSCMIntegrationCommand(): Command {
    const scm = new Command('scm')
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
        .action(async (projectId: string, options: any, command: any) => {
            try {
                ui.showHeader('🔗 Register Repository');

                const answers = await inquirer.prompt([
                    // ... (inquirer prompts are fine, no change needed)
                ]);
                
                // FIX: Simplified option merging
                const config = { ...options, ...answers };

                const spinner = ui.startSpinner('Registering repository...');
                try {
                    const parentOptions = command.parent.opts() as SCMIntegrationOptions;
                    const webhookActor = getWebhookActor(parentOptions);

                    const provider: SCMProvider = config.provider === 'github' ? { GitHub: null } : { GitLab: null };
                    const buildBranches = config.branches ? config.branches.split(',').map((b: string) => b.trim()) : [];

                    const result = await webhookActor.registerRepository(
                        projectId, provider, config.owner, config.repo,
                        config.secret, config.autoPush, config.autoTag, buildBranches
                    ) as RepositoryResult;

                    spinner.succeed();

                    if ('Ok' in result) {
                        ui.showSuccess(`Repository registered successfully!`);
                        ui.showInfo(`Repository ID: ${result.Ok}`);
                        
                        const webhookUrl = `https://${parentOptions.canisterId}.icp0.io/webhook/${config.provider}`;
                        ui.showInfo(`\n📋 Webhook Configuration:`);
                        ui.showInfo(`URL: ${webhookUrl}`);
                        ui.showInfo(`Secret: [Your provided secret]`);
                        ui.showInfo(`\n🔧 Configure this webhook in your ${config.provider} repository settings.`);
                    } else {
                        ui.showError(`Failed to register repository: ${getCanisterError(result.Err)}`);
                    }
                } catch (error) {
                    spinner.fail();
                    throw error;
                }
            } catch (error) {
                logger.error('Failed to register repository', error);
                ui.showError(`Error: ${(error as Error).message}`);
                process.exit(1);
            }
        });

    // --- LIST COMMAND ---
    scm.command('list')
        .description('List registered repositories for a project')
        .argument('<project-id>', 'Project ID')
        .action(async (projectId: string, _options: any, command: any) => {
            try {
                ui.showHeader('📋 Repository List');
                const spinner = ui.startSpinner('Fetching repositories...');

                try {
                    const parentOptions = command.parent.opts() as SCMIntegrationOptions;
                    const webhookActor = getWebhookActor(parentOptions);
                    
                    // FIX: Use the 'Repository' type for type safety
                    const repositories = await webhookActor.listRepositoriesByProject(projectId) as Repository[];
                    
                    spinner.succeed();

                    if (repositories.length === 0) {
                        ui.showInfo('No repositories registered for this project.');
                        return;
                    }

                    ui.showInfo(`Found ${repositories.length} repositories:\n`);
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
                } catch (error) {
                    spinner.fail();
                    throw error;
                }
            } catch (error) {
                logger.error('Failed to list repositories', error);
                ui.showError(`Error: ${(error as Error).message}`);
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
        .action(async (repositoryId: string, options: any, command: any) => {
            try {
                ui.showHeader('⚙️ Update Repository');
                
                // ... (inquirer prompts are fine, no change needed)
                const answers = await inquirer.prompt([/*...*/]);

                const config = {
                    autoPush: options.autoPush !== undefined ? options.autoPush === 'true' : answers.autoPush,
                    autoTag: options.autoTag !== undefined ? options.autoTag === 'true' : answers.autoTag,
                    branches: options.branches !== undefined ? options.branches : answers.branches
                };

                const spinner = ui.startSpinner('Updating repository...');
                try {
                    const parentOptions = command.parent.opts() as SCMIntegrationOptions;
                    const webhookActor = getWebhookActor(parentOptions);
                    
                    const buildBranches = config.branches ? config.branches.split(',').map((b: string) => b.trim()) : [];

                    const result = await webhookActor.updateRepository(
                        repositoryId, config.autoPush, config.autoTag, buildBranches
                    ) as RepositoryResult;

                    spinner.succeed();

                    if ('Ok' in result) {
                        ui.showSuccess('Repository updated successfully!');
                    } else {
                        ui.showError(`Failed to update repository: ${getCanisterError(result.Err)}`);
                    }
                } catch (error) {
                    spinner.fail(); // FIX: Consistent error handling
                    throw error;
                }
            } catch (error) {
                logger.error('Failed to update repository', error);
                ui.showError(`Error: ${(error as Error).message}`);
                process.exit(1);
            }
        });

    return scm;
}