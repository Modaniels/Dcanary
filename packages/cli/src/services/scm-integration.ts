import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { configManager } from '../utils/config';
import { canisterService } from './canister-integration';

// ============================================================================
// SCM INTEGRATION WITH CANISTER CONNECTION
// ============================================================================

export interface SCMRepository {
    id: string;
    name: string;
    fullName: string;
    owner: string;
    url: string;
    cloneUrl: string;
    defaultBranch: string;
    private: boolean;
    description?: string;
    language?: string;
}

export interface SCMWebhook {
    id: string;
    url: string;
    events: string[];
    active: boolean;
    secret?: string;
}

export interface WebhookPayload {
    repository: SCMRepository;
    ref: string;
    before: string;
    after: string;
    commits: CommitInfo[];
    pusher: UserInfo;
    sender: UserInfo;
    action?: string;
    pull_request?: PullRequestInfo;
}

export interface CommitInfo {
    id: string;
    message: string;
    timestamp: string;
    author: UserInfo;
    committer: UserInfo;
    added: string[];
    removed: string[];
    modified: string[];
}

export interface UserInfo {
    name: string;
    email: string;
    username: string;
}

export interface PullRequestInfo {
    number: number;
    title: string;
    state: string;
    base: {
        ref: string;
        sha: string;
    };
    head: {
        ref: string;
        sha: string;
    };
    user: UserInfo;
}

export interface SCMIntegrationConfig {
    provider: 'github' | 'gitlab' | 'bitbucket';
    token: string;
    baseUrl?: string; // For enterprise/self-hosted instances
    webhookSecret?: string;
    webhookUrl?: string;
    autoDeploy: boolean;
    targetBranch: string;
    buildTriggers: string[];
    canisterConfigs: CanisterDeploymentConfig[];
}

export interface CanisterDeploymentConfig {
    name: string;
    type: 'motoko' | 'rust' | 'azle' | 'asset';
    buildCommand?: string;
    testCommand?: string;
    deployCommand?: string;
    canisterId?: string;
    network: 'local' | 'ic';
    dependsOn?: string[];
    cyclesThreshold?: number;
    upgradeMode?: 'upgrade' | 'reinstall';
}

// ============================================================================
// BASE SCM PROVIDER
// ============================================================================

export abstract class BaseSCMProvider {
    protected client: AxiosInstance;
    protected config: SCMIntegrationConfig;

    constructor(config: SCMIntegrationConfig) {
        this.config = config;
        this.client = axios.create({
            baseURL: config.baseUrl,
            headers: this.getAuthHeaders(),
            timeout: 30000
        });
    }

    protected abstract getAuthHeaders(): Record<string, string>;
    
    // Repository operations
    abstract listRepositories(): Promise<SCMRepository[]>;
    abstract getRepository(owner: string, repo: string): Promise<SCMRepository>;
    abstract createWebhook(owner: string, repo: string, webhookUrl: string, events: string[]): Promise<SCMWebhook>;
    abstract deleteWebhook(owner: string, repo: string, webhookId: string): Promise<boolean>;
    abstract listWebhooks(owner: string, repo: string): Promise<SCMWebhook[]>;
    
    // Webhook payload processing
    abstract validateWebhookSignature(payload: string, signature: string): boolean;
    abstract parseWebhookPayload(payload: any): WebhookPayload;
    
    // Integration with DCanary canisters
    async setupRepositoryIntegration(owner: string, repo: string): Promise<string> {
        try {
            logger.info('Setting up repository integration', { owner, repo });
            
            // 1. Get repository information
            const repository = await this.getRepository(owner, repo);
            
            // 2. Create webhook URL (this would be your webhook endpoint)
            const webhookUrl = this.config.webhookUrl || 
                `https://${configManager.get('webhookCanisterId')}.ic0.app/webhook`;
            
            // 3. Set up webhook
            const webhook = await this.createWebhook(
                owner, 
                repo, 
                webhookUrl,
                this.config.buildTriggers
            );
            
            // 4. Register repository with webhook canister
            const repoConfig = {
                repo_id: `${owner}/${repo}`,
                name: repository.name,
                owner: repository.owner,
                scm_provider: this.config.provider,
                webhook_url: webhookUrl,
                webhook_secret: this.config.webhookSecret,
                auto_deploy: this.config.autoDeploy,
                target_branch: this.config.targetBranch,
                build_triggers: this.config.buildTriggers,
                canister_configs: this.config.canisterConfigs.map(config => ({
                    name: config.name,
                    type: config.type,
                    build_command: config.buildCommand,
                    deploy_command: config.deployCommand,
                    canister_id: config.canisterId,
                    network: config.network,
                    cycles_threshold: config.cyclesThreshold
                })),
                pipeline_config: {
                    stages: ['build', 'test', 'deploy'],
                    parallel_execution: false,
                    timeout_minutes: 30,
                    notification_settings: {
                        on_success: true,
                        on_failure: true,
                        channels: ['webhook']
                    }
                }
            };
            
            const registrationResult = await canisterService.registerRepository(repoConfig);
            
            logger.info('Repository integration completed', { 
                owner, 
                repo, 
                webhookId: webhook.id,
                registrationId: registrationResult 
            });
            
            return registrationResult;
            
        } catch (error) {
            logger.error('Failed to setup repository integration', { owner, repo, error });
            throw error;
        }
    }

    async handleWebhookEvent(payload: WebhookPayload): Promise<void> {
        try {
            const repoId = `${payload.repository.owner}/${payload.repository.name}`;
            logger.info('Processing webhook event', { repoId, ref: payload.ref });
            
            // Check if this event should trigger a build
            if (!this.shouldTriggerBuild(payload)) {
                logger.info('Webhook event does not trigger build', { repoId });
                return;
            }
            
            // Send webhook to canister for processing
            const webhookResult = await canisterService.handleWebhook(repoId, {
                event_type: this.getEventType(payload),
                repository: payload.repository,
                commit_hash: payload.after,
                branch: payload.ref.replace('refs/heads/', ''),
                commits: payload.commits,
                pusher: payload.pusher,
                timestamp: Date.now()
            });
            
            // If auto-deploy is enabled and webhook created a verification request
            if (this.config.autoDeploy && webhookResult.verification_request_id) {
                await this.triggerCanisterDeployment(webhookResult.verification_request_id, payload);
            }
            
            logger.info('Webhook event processed successfully', { 
                repoId, 
                verificationRequestId: webhookResult.verification_request_id 
            });
            
        } catch (error) {
            logger.error('Failed to handle webhook event', { payload, error });
            throw error;
        }
    }

    private shouldTriggerBuild(payload: WebhookPayload): boolean {
        // Check if the branch matches target branch
        const branch = payload.ref.replace('refs/heads/', '');
        if (branch !== this.config.targetBranch) {
            return false;
        }
        
        // Check if any commits have changes that should trigger build
        const hasRelevantChanges = payload.commits.some(commit => 
            commit.added.length > 0 || 
            commit.modified.length > 0 || 
            commit.removed.length > 0
        );
        
        return hasRelevantChanges;
    }

    private getEventType(payload: WebhookPayload): string {
        if (payload.pull_request) {
            return 'pull_request';
        }
        if (payload.commits && payload.commits.length > 0) {
            return 'push';
        }
        return 'unknown';
    }

    private async triggerCanisterDeployment(verificationRequestId: string, payload: WebhookPayload): Promise<void> {
        try {
            logger.info('Triggering canister deployment', { verificationRequestId });
            
            // Create verification request with build instructions
            const buildInstructions = {
                repo_url: payload.repository.cloneUrl,
                commit_hash: payload.after,
                build_commands: this.generateBuildCommands(),
                test_commands: this.generateTestCommands(),
                environment_vars: this.getEnvironmentVariables(),
                timeout_seconds: 1800 // 30 minutes
            };
            
            const verificationRequest = {
                request_id: verificationRequestId,
                repo_id: `${payload.repository.owner}/${payload.repository.name}`,
                commit_hash: payload.after,
                branch: payload.ref.replace('refs/heads/', ''),
                build_instructions: buildInstructions,
                requester: payload.pusher.username,
                created_at: BigInt(Date.now())
            };
            
            await canisterService.createVerificationRequest(verificationRequest);
            
            logger.info('Canister deployment triggered', { verificationRequestId });
            
        } catch (error) {
            logger.error('Failed to trigger canister deployment', { verificationRequestId, error });
            throw error;
        }
    }

    private generateBuildCommands(): string[] {
        const commands: string[] = [];
        
        for (const canisterConfig of this.config.canisterConfigs) {
            if (canisterConfig.buildCommand) {
                commands.push(canisterConfig.buildCommand);
            } else {
                // Generate default build commands based on canister type
                switch (canisterConfig.type) {
                    case 'motoko':
                        commands.push(`dfx build ${canisterConfig.name}`);
                        break;
                    case 'rust':
                        commands.push(`dfx build ${canisterConfig.name}`);
                        break;
                    case 'azle':
                        commands.push(`dfx build ${canisterConfig.name}`);
                        break;
                    case 'asset':
                        commands.push(`npm run build`);
                        commands.push(`dfx build ${canisterConfig.name}`);
                        break;
                }
            }
        }
        
        return commands;
    }

    private generateTestCommands(): string[] {
        const commands: string[] = [];
        
        for (const canisterConfig of this.config.canisterConfigs) {
            if (canisterConfig.testCommand) {
                commands.push(canisterConfig.testCommand);
            }
        }
        
        // Add default test commands
        commands.push('npm test');
        commands.push('dfx test');
        
        return commands.filter(cmd => cmd.length > 0);
    }

    private getEnvironmentVariables(): Record<string, string> {
        const envVars = configManager.get('environmentVariables') || {};
        return {
            DFX_NETWORK: this.config.canisterConfigs[0]?.network || 'local',
            CI: 'true',
            DCANARY_BUILD: 'true',
            ...(typeof envVars === 'object' ? envVars : {})
        };
    }
}

// ============================================================================
// GITHUB PROVIDER
// ============================================================================

export class GitHubProvider extends BaseSCMProvider {
    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'DCanary-CLI/1.0.0'
        };
    }

    async listRepositories(): Promise<SCMRepository[]> {
        try {
            const response = await this.client.get('/user/repos');
            return response.data.map((repo: any) => this.mapGitHubRepo(repo));
        } catch (error) {
            logger.error('Failed to list GitHub repositories', { error });
            throw error;
        }
    }

    async getRepository(owner: string, repo: string): Promise<SCMRepository> {
        try {
            const response = await this.client.get(`/repos/${owner}/${repo}`);
            return this.mapGitHubRepo(response.data);
        } catch (error) {
            logger.error('Failed to get GitHub repository', { owner, repo, error });
            throw error;
        }
    }

    async createWebhook(owner: string, repo: string, webhookUrl: string, events: string[]): Promise<SCMWebhook> {
        try {
            const response = await this.client.post(`/repos/${owner}/${repo}/hooks`, {
                name: 'web',
                active: true,
                events: events,
                config: {
                    url: webhookUrl,
                    content_type: 'json',
                    secret: this.config.webhookSecret,
                    insecure_ssl: '0'
                }
            });
            
            return this.mapGitHubWebhook(response.data);
        } catch (error) {
            logger.error('Failed to create GitHub webhook', { owner, repo, webhookUrl, error });
            throw error;
        }
    }

    async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<boolean> {
        try {
            await this.client.delete(`/repos/${owner}/${repo}/hooks/${webhookId}`);
            return true;
        } catch (error) {
            logger.error('Failed to delete GitHub webhook', { owner, repo, webhookId, error });
            return false;
        }
    }

    async listWebhooks(owner: string, repo: string): Promise<SCMWebhook[]> {
        try {
            const response = await this.client.get(`/repos/${owner}/${repo}/hooks`);
            return response.data.map((hook: any) => this.mapGitHubWebhook(hook));
        } catch (error) {
            logger.error('Failed to list GitHub webhooks', { owner, repo, error });
            throw error;
        }
    }

    validateWebhookSignature(payload: string, signature: string): boolean {
        if (!this.config.webhookSecret) {
            return true; // No secret configured, assume valid
        }
        
        const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', this.config.webhookSecret)
            .update(payload)
            .digest('hex');
            
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    parseWebhookPayload(payload: any): WebhookPayload {
        return {
            repository: this.mapGitHubRepo(payload.repository),
            ref: payload.ref || '',
            before: payload.before || '',
            after: payload.after || '',
            commits: (payload.commits || []).map((commit: any) => ({
                id: commit.id,
                message: commit.message,
                timestamp: commit.timestamp,
                author: {
                    name: commit.author.name,
                    email: commit.author.email,
                    username: commit.author.username || commit.author.name
                },
                committer: {
                    name: commit.committer.name,
                    email: commit.committer.email,
                    username: commit.committer.username || commit.committer.name
                },
                added: commit.added || [],
                removed: commit.removed || [],
                modified: commit.modified || []
            })),
            pusher: {
                name: payload.pusher?.name || '',
                email: payload.pusher?.email || '',
                username: payload.pusher?.name || ''
            },
            sender: {
                name: payload.sender?.login || '',
                email: payload.sender?.email || '',
                username: payload.sender?.login || ''
            },
            action: payload.action,
            pull_request: payload.pull_request ? {
                number: payload.pull_request.number,
                title: payload.pull_request.title,
                state: payload.pull_request.state,
                base: {
                    ref: payload.pull_request.base.ref,
                    sha: payload.pull_request.base.sha
                },
                head: {
                    ref: payload.pull_request.head.ref,
                    sha: payload.pull_request.head.sha
                },
                user: {
                    name: payload.pull_request.user.login,
                    email: payload.pull_request.user.email || '',
                    username: payload.pull_request.user.login
                }
            } : undefined
        };
    }

    private mapGitHubRepo(repo: any): SCMRepository {
        return {
            id: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            owner: repo.owner.login,
            url: repo.html_url,
            cloneUrl: repo.clone_url,
            defaultBranch: repo.default_branch,
            private: repo.private,
            description: repo.description,
            language: repo.language
        };
    }

    private mapGitHubWebhook(hook: any): SCMWebhook {
        return {
            id: hook.id.toString(),
            url: hook.config?.url || '',
            events: hook.events || [],
            active: hook.active
        };
    }
}

// ============================================================================
// GITLAB PROVIDER
// ============================================================================

export class GitLabProvider extends BaseSCMProvider {
    protected getAuthHeaders(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.config.token}`,
            'Content-Type': 'application/json'
        };
    }

    async listRepositories(): Promise<SCMRepository[]> {
        try {
            const response = await this.client.get('/projects?membership=true');
            return response.data.map((project: any) => this.mapGitLabProject(project));
        } catch (error) {
            logger.error('Failed to list GitLab projects', { error });
            throw error;
        }
    }

    async getRepository(owner: string, repo: string): Promise<SCMRepository> {
        try {
            const response = await this.client.get(`/projects/${encodeURIComponent(`${owner}/${repo}`)}`);
            return this.mapGitLabProject(response.data);
        } catch (error) {
            logger.error('Failed to get GitLab project', { owner, repo, error });
            throw error;
        }
    }

    async createWebhook(owner: string, repo: string, webhookUrl: string, events: string[]): Promise<SCMWebhook> {
        try {
            const projectId = encodeURIComponent(`${owner}/${repo}`);
            const response = await this.client.post(`/projects/${projectId}/hooks`, {
                url: webhookUrl,
                push_events: events.includes('push'),
                merge_requests_events: events.includes('pull_request'),
                token: this.config.webhookSecret
            });
            
            return this.mapGitLabWebhook(response.data);
        } catch (error) {
            logger.error('Failed to create GitLab webhook', { owner, repo, webhookUrl, error });
            throw error;
        }
    }

    async deleteWebhook(owner: string, repo: string, webhookId: string): Promise<boolean> {
        try {
            const projectId = encodeURIComponent(`${owner}/${repo}`);
            await this.client.delete(`/projects/${projectId}/hooks/${webhookId}`);
            return true;
        } catch (error) {
            logger.error('Failed to delete GitLab webhook', { owner, repo, webhookId, error });
            return false;
        }
    }

    async listWebhooks(owner: string, repo: string): Promise<SCMWebhook[]> {
        try {
            const projectId = encodeURIComponent(`${owner}/${repo}`);
            const response = await this.client.get(`/projects/${projectId}/hooks`);
            return response.data.map((hook: any) => this.mapGitLabWebhook(hook));
        } catch (error) {
            logger.error('Failed to list GitLab webhooks', { owner, repo, error });
            throw error;
        }
    }

    validateWebhookSignature(payload: string, signature: string): boolean {
        return signature === this.config.webhookSecret;
    }

    parseWebhookPayload(payload: any): WebhookPayload {
        // GitLab webhook payload structure
        return {
            repository: {
                id: payload.project?.id?.toString() || '',
                name: payload.project?.name || '',
                fullName: payload.project?.path_with_namespace || '',
                owner: payload.project?.namespace || '',
                url: payload.project?.web_url || '',
                cloneUrl: payload.project?.git_http_url || '',
                defaultBranch: payload.project?.default_branch || 'main',
                private: payload.project?.visibility_level !== 20,
                description: payload.project?.description
            },
            ref: payload.ref || '',
            before: payload.before || '',
            after: payload.after || '',
            commits: (payload.commits || []).map((commit: any) => ({
                id: commit.id,
                message: commit.message,
                timestamp: commit.timestamp,
                author: {
                    name: commit.author.name,
                    email: commit.author.email,
                    username: commit.author.name
                },
                committer: {
                    name: commit.author.name,
                    email: commit.author.email,
                    username: commit.author.name
                },
                added: commit.added || [],
                removed: commit.removed || [],
                modified: commit.modified || []
            })),
            pusher: {
                name: payload.user_name || '',
                email: payload.user_email || '',
                username: payload.user_username || ''
            },
            sender: {
                name: payload.user_name || '',
                email: payload.user_email || '',
                username: payload.user_username || ''
            }
        };
    }

    private mapGitLabProject(project: any): SCMRepository {
        return {
            id: project.id.toString(),
            name: project.name,
            fullName: project.path_with_namespace,
            owner: project.namespace?.name || '',
            url: project.web_url,
            cloneUrl: project.http_url_to_repo,
            defaultBranch: project.default_branch,
            private: project.visibility_level !== 20,
            description: project.description,
            language: project.primary_language
        };
    }

    private mapGitLabWebhook(hook: any): SCMWebhook {
        const events: string[] = [];
        if (hook.push_events) events.push('push');
        if (hook.merge_requests_events) events.push('pull_request');
        
        return {
            id: hook.id.toString(),
            url: hook.url,
            events,
            active: true
        };
    }
}

// ============================================================================
// SCM FACTORY
// ============================================================================

export class SCMProviderFactory {
    static createProvider(config: SCMIntegrationConfig): BaseSCMProvider {
        switch (config.provider) {
            case 'github':
                return new GitHubProvider({
                    ...config,
                    baseUrl: config.baseUrl || 'https://api.github.com'
                });
                
            case 'gitlab':
                return new GitLabProvider({
                    ...config,
                    baseUrl: config.baseUrl || 'https://gitlab.com/api/v4'
                });
                
            default:
                throw new Error(`Unsupported SCM provider: ${config.provider}`);
        }
    }
}

// Export the main integration service
export const scmIntegrationService = {
    createProvider: SCMProviderFactory.createProvider,
    providers: {
        GitHubProvider,
        GitLabProvider
    }
};
