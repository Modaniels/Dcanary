import { Command } from 'commander';
import { logger } from '../utils/logger.js';
import { ui } from '../utils/ui.js';
import { getIdentity, getAgent } from '../utils/helpers.js';
import { Actor } from '@dfinity/agent';
import inquirer from 'inquirer';

// Webhook canister interface (simplified)
const webhookCanisterInterface = ({ IDL }: any) => {
    const SCMProvider = IDL.Variant({
        GitHub: IDL.Null,
        GitLab: IDL.Null
    });

    const RepositoryResult = IDL.Variant({
        Ok: IDL.Text,
        Err: IDL.Variant({
            NotFound: IDL.Text,
            Unauthorized: IDL.Text,
            InvalidInput: IDL.Text,
            InternalError: IDL.Text,
            AlreadyExists: IDL.Text
        })
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
        listRepositoriesByProject: IDL.Func([IDL.Text], [IDL.Vec(IDL.Record({
            id: IDL.Text,
            provider: SCMProvider,
            owner: IDL.Text,
            name: IDL.Text,
            project_id: IDL.Text,
            auto_build_on_push: IDL.Bool,
            auto_build_on_tag: IDL.Bool,
            build_branches: IDL.Vec(IDL.Text),
            created_at: IDL.Nat64
        }))], ['query'])
    });
};

interface SCMIntegrationOptions {
    canisterId?: string;
    network?: string;
}

export function createSCMIntegrationCommand(): Command {
    const scm = new Command('scm')
        .description('Manage SCM (GitHub/GitLab) integrations')
        .option('--canister-id <id>', 'Webhook canister ID')
        .option('--network <network>', 'Network to use (local/ic)', 'local');

    // Register repository command
    scm.command('register')
        .description('Register a repository for webhook integration')
        .argument('<project-id>', 'Project ID')
        .option('--provider <provider>', 'SCM provider (github/gitlab)', 'github')
        .option('--owner <owner>', 'Repository owner/organization')
        .option('--repo <repo>', 'Repository name')
        .option('--secret <secret>', 'Webhook secret')
        .option('--auto-push', 'Auto-build on push events', false)
        .option('--auto-tag', 'Auto-build on tag events', false)
        .option('--branches <branches>', 'Comma-separated list of branches to build', '')
        .action(async (projectId: string, options: any, command: any) => {
            try {
                const parentOptions = command.parent.opts() as SCMIntegrationOptions;
                
                ui.showHeader('🔗 Register Repository');
                
                // Interactive prompts if options not provided
                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'provider',
                        message: 'Select SCM provider:',
                        choices: ['github', 'gitlab'],
                        default: options.provider,
                        when: !options.provider
                    },
                    {
                        type: 'input',
                        name: 'owner',
                        message: 'Repository owner/organization:',
                        default: options.owner,
                        when: !options.owner,
                        validate: (input: string) => input.length > 0 || 'Owner is required'
                    },
                    {
                        type: 'input',
                        name: 'repo',
                        message: 'Repository name:',
                        default: options.repo,
                        when: !options.repo,
                        validate: (input: string) => input.length > 0 || 'Repository name is required'
                    },
                    {
                        type: 'password',
                        name: 'secret',
                        message: 'Webhook secret:',
                        default: options.secret,
                        when: !options.secret,
                        validate: (input: string) => input.length > 0 || 'Webhook secret is required'
                    },
                    {
                        type: 'confirm',
                        name: 'autoPush',
                        message: 'Auto-build on push events?',
                        default: options.autoPush
                    },
                    {
                        type: 'confirm',
                        name: 'autoTag',
                        message: 'Auto-build on tag events?',
                        default: options.autoTag
                    },
                    {
                        type: 'input',
                        name: 'branches',
                        message: 'Branches to build (comma-separated, empty for all):',
                        default: options.branches
                    }
                ]);

                const config = {
                    provider: options.provider || answers.provider,
                    owner: options.owner || answers.owner,
                    repo: options.repo || answers.repo,
                    secret: options.secret || answers.secret,
                    autoPush: options.autoPush || answers.autoPush,
                    autoTag: options.autoTag || answers.autoTag,
                    branches: options.branches || answers.branches
                };

                const spinner = ui.startSpinner('Registering repository...');
                
                try {
                    const identity = await getIdentity();
                    const agent = await getAgent(parentOptions.network || 'local', identity);
                    
                    if (!parentOptions.canisterId) {
                        throw new Error('Webhook canister ID is required. Use --canister-id option.');
                    }

                    const webhookActor = Actor.createActor(webhookCanisterInterface, {
                        agent,
                        canisterId: parentOptions.canisterId
                    });

                    const provider = config.provider === 'github' ? { GitHub: null } : { GitLab: null };
                    const buildBranches = config.branches ? config.branches.split(',').map(b => b.trim()) : [];

                    const result = await webhookActor.registerRepository(
                        projectId,
                        provider,
                        config.owner,
                        config.repo,
                        config.secret,
                        config.autoPush,
                        config.autoTag,
                        buildBranches
                    );

                    spinner.succeed();

                    if ('Ok' in result) {
                        ui.showSuccess(`Repository registered successfully!`);
                        ui.showInfo(`Repository ID: ${result.Ok}`);
                        
                        // Show webhook URL
                        const webhookUrl = `https://${parentOptions.canisterId}.ic0.app/webhook/${config.provider}`;
                        ui.showInfo(`\n📋 Webhook Configuration:`);
                        ui.showInfo(`URL: ${webhookUrl}`);
                        ui.showInfo(`Secret: ${config.secret}`);
                        ui.showInfo(`\n🔧 Configure this webhook in your ${config.provider} repository settings.`);
                        
                    } else {
                        const error = Object.values(result.Err)[0] as string;
                        ui.showError(`Failed to register repository: ${error}`);
                    }

                } catch (error) {
                    spinner.fail();
                    throw error;
                }

            } catch (error) {
                logger.error('Failed to register repository', error);
                ui.showError(`Failed to register repository: ${(error as Error).message}`);
                process.exit(1);
            }
        });

    // List repositories command
    scm.command('list')
        .description('List registered repositories for a project')
        .argument('<project-id>', 'Project ID')
        .action(async (projectId: string, options: any, command: any) => {
            try {
                const parentOptions = command.parent.opts() as SCMIntegrationOptions;
                
                ui.showHeader('📋 Repository List');
                
                const spinner = ui.startSpinner('Fetching repositories...');
                
                try {
                    const identity = await getIdentity();
                    const agent = await getAgent(parentOptions.network || 'local', identity);
                    
                    if (!parentOptions.canisterId) {
                        throw new Error('Webhook canister ID is required. Use --canister-id option.');
                    }

                    const webhookActor = Actor.createActor(webhookCanisterInterface, {
                        agent,
                        canisterId: parentOptions.canisterId
                    });

                    const repositories = await webhookActor.listRepositoriesByProject(projectId);
                    
                    spinner.succeed();

                    if (repositories.length === 0) {
                        ui.showInfo('No repositories registered for this project.');
                        return;
                    }

                    ui.showInfo(`Found ${repositories.length} repositories:\n`);
                    
                    repositories.forEach((repo: any, index: number) => {
                        const provider = 'GitHub' in repo.provider ? 'GitHub' : 'GitLab';
                        console.log(`${index + 1}. ${provider}: ${repo.owner}/${repo.name}`);
                        console.log(`   ID: ${repo.id}`);
                        console.log(`   Auto-build on push: ${repo.auto_build_on_push}`);
                        console.log(`   Auto-build on tag: ${repo.auto_build_on_tag}`);
                        console.log(`   Build branches: ${repo.build_branches.join(', ') || 'all'}`);
                        console.log(`   Created: ${new Date(Number(repo.created_at / 1000000n)).toLocaleString()}`);
                        console.log('');
                    });

                } catch (error) {
                    spinner.fail();
                    throw error;
                }

            } catch (error) {
                logger.error('Failed to list repositories', error);
                ui.showError(`Failed to list repositories: ${(error as Error).message}`);
                process.exit(1);
            }
        });

    // Update repository command
    scm.command('update')
        .description('Update repository configuration')
        .argument('<repository-id>', 'Repository ID')
        .option('--auto-push <value>', 'Auto-build on push events (true/false)')
        .option('--auto-tag <value>', 'Auto-build on tag events (true/false)')
        .option('--branches <branches>', 'Comma-separated list of branches to build')
        .action(async (repositoryId: string, options: any, command: any) => {
            try {
                const parentOptions = command.parent.opts() as SCMIntegrationOptions;
                
                ui.showHeader('⚙️ Update Repository');
                
                // Interactive prompts if options not provided
                const answers = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'autoPush',
                        message: 'Auto-build on push events?',
                        when: options.autoPush === undefined
                    },
                    {
                        type: 'confirm',
                        name: 'autoTag',
                        message: 'Auto-build on tag events?',
                        when: options.autoTag === undefined
                    },
                    {
                        type: 'input',
                        name: 'branches',
                        message: 'Branches to build (comma-separated, empty for all):',
                        when: options.branches === undefined
                    }
                ]);

                const config = {
                    autoPush: options.autoPush !== undefined ? options.autoPush === 'true' : answers.autoPush,
                    autoTag: options.autoTag !== undefined ? options.autoTag === 'true' : answers.autoTag,
                    branches: options.branches !== undefined ? options.branches : answers.branches
                };

                const spinner = ui.startSpinner('Updating repository...');
                
                try {
                    const identity = await getIdentity();
                    const agent = await getAgent(parentOptions.network || 'local', identity);
                    
                    if (!parentOptions.canisterId) {
                        throw new Error('Webhook canister ID is required. Use --canister-id option.');
                    }

                    const webhookActor = Actor.createActor(webhookCanisterInterface, {
                        agent,
                        canisterId: parentOptions.canisterId
                    });

                    const buildBranches = config.branches ? config.branches.split(',').map(b => b.trim()) : [];

                    const result = await webhookActor.updateRepository(
                        repositoryId,
                        config.autoPush,
                        config.autoTag,
                        buildBranches
                    );

                    spinner.succeed();

                    if ('Ok' in result) {
                        ui.showSuccess('Repository updated successfully!');
                    } else {
                        const error = Object.values(result.Err)[0] as string;
                        ui.showError(`Failed to update repository: ${error}`);
                    }

                } catch (error) {
                    spinner.fail();
                    throw error;
                }

            } catch (error) {
                logger.error('Failed to update repository', error);
                ui.showError(`Failed to update repository: ${(error as Error).message}`);
                process.exit(1);
            }
        });

    return scm;
}
