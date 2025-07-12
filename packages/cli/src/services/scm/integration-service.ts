import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger';
import { configManager } from '../../utils/config';
import { 
    SCMProvider, 
    SCMProviderFactory, 
    RepositoryInfo, 
    WebhookConfig, 
    WebhookResult,
    Repository,
    Branch
} from './providers';

const execAsync = promisify(exec);

export interface SCMIntegrationConfig {
    provider: string;
    repository: RepositoryInfo;
    webhook?: WebhookResult;
    autoDeploy: boolean;
    branches: string[];
    events: string[];
    token?: string;
}

export interface TriggerEvent {
    type: 'push' | 'pull_request' | 'release' | 'tag';
    branch: string;
    commit: string;
    author: string;
    message: string;
    timestamp: string;
}

export class SCMIntegrationService {
    private static readonly CONFIG_FILE = '.dcanary/scm-integration.json';
    private static readonly WEBHOOK_ENDPOINT = 'https://api.dcanary.io/webhooks';

    async setupIntegration(options: {
        provider: string;
        repositoryUrl?: string;
        token?: string;
        autoDeploy: boolean;
        branches: string[];
        events: string[];
        webhookUrl?: string;
    }): Promise<SCMIntegrationConfig> {
        try {
            logger.info('Setting up SCM integration', { provider: options.provider });

            // Parse repository URL or detect from git remote
            const repoInfo = options.repositoryUrl 
                ? this.parseRepositoryUrl(options.repositoryUrl)
                : await this.detectRepositoryFromGit();

            // Get SCM provider
            const provider = SCMProviderFactory.getProvider(options.provider);

            // Authenticate if token provided
            if (options.token) {
                const authenticated = await provider.authenticate(options.token);
                if (!authenticated) {
                    throw new Error(`Failed to authenticate with ${options.provider}`);
                }
            }

            // Verify repository access
            let repository: Repository;
            try {
                repository = await provider.getRepository(repoInfo);
                logger.info('Repository verified', { repository: repository.fullName });
            } catch (error) {
                logger.warn('Could not verify repository access - proceeding with manual setup', { 
                    error: (error as Error).message 
                });
                // Continue with manual setup if we can't access the repository
            }

            // Generate webhook configuration
            const webhookUrl = options.webhookUrl || `${SCMIntegrationService.WEBHOOK_ENDPOINT}/${options.provider}`;
            const webhookSecret = this.generateWebhookSecret();
            
            const webhookConfig: WebhookConfig = {
                url: webhookUrl,
                secret: webhookSecret,
                events: options.events,
                contentType: 'json',
                insecureSsl: false
            };

            // Create webhook if authenticated
            let webhookResult: WebhookResult | undefined;
            if (options.token) {
                try {
                    webhookResult = await provider.createWebhook(repoInfo, webhookConfig);
                    logger.info('Webhook created successfully', { webhookId: webhookResult.id });
                } catch (error) {
                    logger.warn('Could not create webhook automatically - manual setup required', { 
                        error: (error as Error).message 
                    });
                }
            }

            // Create integration configuration
            const integrationConfig: SCMIntegrationConfig = {
                provider: options.provider,
                repository: repoInfo,
                webhook: webhookResult,
                autoDeploy: options.autoDeploy,
                branches: options.branches,
                events: options.events,
                token: options.token
            };

            // Save configuration
            await this.saveIntegrationConfig(integrationConfig);

            // Generate setup instructions
            await this.generateSetupInstructions(integrationConfig, webhookConfig);

            // Update DCanary main config
            configManager.set('scm', {
                provider: options.provider,
                repository: repoInfo.fullName,
                autoDeploy: options.autoDeploy
            });

            logger.info('SCM integration setup complete', { 
                provider: options.provider,
                repository: repoInfo.fullName 
            });

            return integrationConfig;

        } catch (error: any) {
            logger.error('SCM integration setup failed', { error: error.message });
            throw error;
        }
    }

    async testIntegration(provider?: string): Promise<boolean> {
        try {
            const config = await this.loadIntegrationConfig();
            const targetProvider = provider || config.provider;

            if (config.provider !== targetProvider) {
                throw new Error(`Integration configured for ${config.provider}, not ${targetProvider}`);
            }

            const scmProvider = SCMProviderFactory.getProvider(config.provider);

            // Test authentication
            if (config.token) {
                const authenticated = await scmProvider.authenticate(config.token);
                if (!authenticated) {
                    throw new Error('Authentication failed');
                }
            }

            // Test webhook if available
            if (config.webhook && config.token) {
                const webhookWorking = await scmProvider.testWebhook(config.repository, config.webhook.id);
                if (!webhookWorking) {
                    logger.warn('Webhook test failed - manual verification may be required');
                }
            }

            // Test repository access
            const repository = await scmProvider.getRepository(config.repository);
            logger.info('Integration test successful', { repository: repository.fullName });

            return true;

        } catch (error: any) {
            logger.error('Integration test failed', { error: error.message });
            return false;
        }
    }

    async handleWebhookEvent(payload: any, provider: string): Promise<TriggerEvent | null> {
        try {
            logger.info('Processing webhook event', { provider });

            const config = await this.loadIntegrationConfig();
            if (config.provider !== provider) {
                throw new Error(`Webhook received for ${provider} but integration configured for ${config.provider}`);
            }

            // Parse webhook payload based on provider
            const event = this.parseWebhookPayload(payload, provider);
            if (!event) {
                logger.warn('Webhook event not relevant for CI/CD triggers');
                return null;
            }

            // Check if branch is monitored
            if (config.branches.length > 0 && !config.branches.includes(event.branch)) {
                logger.info('Event on non-monitored branch, skipping', { branch: event.branch });
                return null;
            }

            // Check if event type is configured
            if (!config.events.includes(event.type)) {
                logger.info('Event type not configured, skipping', { eventType: event.type });
                return null;
            }

            logger.info('Webhook event accepted for processing', { 
                type: event.type, 
                branch: event.branch,
                commit: event.commit.substring(0, 8)
            });

            return event;

        } catch (error: any) {
            logger.error('Webhook event processing failed', { error: error.message });
            throw error;
        }
    }

    async getIntegrationStatus(): Promise<{
        configured: boolean;
        provider?: string;
        repository?: string;
        webhook?: boolean;
        lastEvent?: string;
    }> {
        try {
            const config = await this.loadIntegrationConfig();
            return {
                configured: true,
                provider: config.provider,
                repository: config.repository.fullName,
                webhook: !!config.webhook,
                lastEvent: undefined // TODO: Track last event timestamp
            };
        } catch (error) {
            return { configured: false };
        }
    }

    private async detectRepositoryFromGit(): Promise<RepositoryInfo> {
        try {
            const { stdout } = await execAsync('git remote get-url origin');
            const remoteUrl = stdout.trim();
            return this.parseRepositoryUrl(remoteUrl);
        } catch (error) {
            throw new Error('Could not detect Git repository. Please provide repository URL or ensure you are in a Git repository.');
        }
    }

    private parseRepositoryUrl(url: string): RepositoryInfo {
        // GitHub patterns
        const githubHttps = url.match(/https:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/);
        const githubSsh = url.match(/git@github\.com:([^\/]+)\/([^\/\.]+)/);
        
        // GitLab patterns
        const gitlabHttps = url.match(/https:\/\/gitlab\.com\/([^\/]+)\/([^\/\.]+)/);
        const gitlabSsh = url.match(/git@gitlab\.com:([^\/]+)\/([^\/\.]+)/);
        
        // Bitbucket patterns
        const bitbucketHttps = url.match(/https:\/\/bitbucket\.org\/([^\/]+)\/([^\/\.]+)/);
        const bitbucketSsh = url.match(/git@bitbucket\.org:([^\/]+)\/([^\/\.]+)/);

        let match: RegExpMatchArray | null = null;
        let provider = '';

        if (githubHttps || githubSsh) {
            match = githubHttps || githubSsh;
            provider = 'github';
        } else if (gitlabHttps || gitlabSsh) {
            match = gitlabHttps || gitlabSsh;
            provider = 'gitlab';
        } else if (bitbucketHttps || bitbucketSsh) {
            match = bitbucketHttps || bitbucketSsh;
            provider = 'bitbucket';
        }

        if (!match) {
            throw new Error(`Unsupported repository URL format: ${url}`);
        }

        const owner = match[1];
        const name = match[2].replace(/\.git$/, '');

        return {
            provider,
            owner,
            name,
            fullName: `${owner}/${name}`,
            url: url
        };
    }

    private parseWebhookPayload(payload: any, provider: string): TriggerEvent | null {
        switch (provider) {
            case 'github':
                return this.parseGitHubWebhook(payload);
            case 'gitlab':
                return this.parseGitLabWebhook(payload);
            default:
                throw new Error(`Webhook parsing not implemented for ${provider}`);
        }
    }

    private parseGitHubWebhook(payload: any): TriggerEvent | null {
        // Push event
        if (payload.ref && payload.head_commit) {
            return {
                type: 'push',
                branch: payload.ref.replace('refs/heads/', ''),
                commit: payload.head_commit.id,
                author: payload.head_commit.author.name,
                message: payload.head_commit.message,
                timestamp: payload.head_commit.timestamp
            };
        }

        // Pull request event
        if (payload.pull_request) {
            return {
                type: 'pull_request',
                branch: payload.pull_request.head.ref,
                commit: payload.pull_request.head.sha,
                author: payload.pull_request.user.login,
                message: payload.pull_request.title,
                timestamp: payload.pull_request.updated_at
            };
        }

        // Release event
        if (payload.release) {
            return {
                type: 'release',
                branch: payload.release.target_commitish,
                commit: payload.release.target_commitish,
                author: payload.release.author.login,
                message: payload.release.name,
                timestamp: payload.release.published_at
            };
        }

        return null;
    }

    private parseGitLabWebhook(payload: any): TriggerEvent | null {
        // Push event
        if (payload.object_kind === 'push' && payload.commits) {
            const lastCommit = payload.commits[payload.commits.length - 1];
            return {
                type: 'push',
                branch: payload.ref.replace('refs/heads/', ''),
                commit: lastCommit.id,
                author: lastCommit.author.name,
                message: lastCommit.message,
                timestamp: lastCommit.timestamp
            };
        }

        // Merge request event
        if (payload.object_kind === 'merge_request') {
            return {
                type: 'pull_request',
                branch: payload.object_attributes.source_branch,
                commit: payload.object_attributes.last_commit.id,
                author: payload.user.name,
                message: payload.object_attributes.title,
                timestamp: payload.object_attributes.updated_at
            };
        }

        return null;
    }

    private generateWebhookSecret(): string {
        return require('crypto').randomBytes(20).toString('hex');
    }

    private async saveIntegrationConfig(config: SCMIntegrationConfig): Promise<void> {
        await fs.ensureDir('.dcanary');
        await fs.writeJson(SCMIntegrationService.CONFIG_FILE, config, { spaces: 2 });
    }

    private async loadIntegrationConfig(): Promise<SCMIntegrationConfig> {
        if (!await fs.pathExists(SCMIntegrationService.CONFIG_FILE)) {
            throw new Error('SCM integration not configured. Run: dcanary integrate <provider>');
        }
        return await fs.readJson(SCMIntegrationService.CONFIG_FILE);
    }

    private async generateSetupInstructions(config: SCMIntegrationConfig, webhookConfig: WebhookConfig): Promise<void> {
        const { provider, repository } = config;
        
        const instructions = `# DCanary ${provider.toUpperCase()} Integration Setup

## Repository: ${repository.fullName}

### Webhook Configuration ${config.webhook ? '✅ (Automatically Configured)' : '⚠️ (Manual Setup Required)'}

${config.webhook ? `
**Webhook ID**: ${config.webhook.id}
**Status**: Active
**Events**: ${config.webhook.events.join(', ')}
` : `
**Manual Setup Required**

1. Go to your repository settings:
   - Repository: https://${provider}.com/${repository.fullName}
   - Navigate to Settings → Webhooks (GitHub) or Settings → Integrations → Webhooks (GitLab)

2. Add new webhook:
   - **Payload URL**: \`${webhookConfig.url}\`
   - **Content Type**: \`application/json\`
   - **Secret**: \`${webhookConfig.secret}\`

3. Select events:
   ${config.events.map(event => `   - ✅ ${event}`).join('\n')}

4. Test the webhook:
   \`\`\`bash
   dcanary integrate test
   \`\`\`
`}

### Environment Variables
Add these to your repository secrets:
- \`DCANARY_WEBHOOK_SECRET\`: \`${webhookConfig.secret}\`
- \`DCANARY_API_KEY\`: Your DCanary API key (get from dashboard)

### Configuration
- **Auto-deploy**: ${config.autoDeploy ? 'Enabled' : 'Disabled'}
- **Monitored branches**: ${config.branches.join(', ') || 'All branches'}
- **Trigger events**: ${config.events.join(', ')}

### Next Steps
1. ${config.webhook ? 'Push a commit to trigger the first build' : 'Complete manual webhook setup above'}
2. Check build status: \`dcanary status\`
3. View logs: \`dcanary logs --follow\`
4. Test integration: \`dcanary integrate test\`

### Troubleshooting
- Check webhook logs: \`dcanary logs --webhook\`
- Verify configuration: \`dcanary integrate status\`
- Re-configure: \`dcanary integrate ${provider} --force\`

For more information: https://docs.dcanary.io/integrations/${provider}
`;

        await fs.writeFile('.dcanary/SCM_SETUP_INSTRUCTIONS.md', instructions);
        logger.info('Setup instructions generated', { file: '.dcanary/SCM_SETUP_INSTRUCTIONS.md' });
    }
}

export const scmIntegrationService = new SCMIntegrationService();
