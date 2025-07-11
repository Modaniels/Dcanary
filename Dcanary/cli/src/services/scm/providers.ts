import axios from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../../utils/logger';
import { configManager } from '../../utils/config';

export interface SCMProvider {
    name: string;
    baseUrl: string;
    authenticate(token: string): Promise<boolean>;
    createWebhook(repoInfo: RepositoryInfo, webhookConfig: WebhookConfig): Promise<WebhookResult>;
    testWebhook(repoInfo: RepositoryInfo, webhookId: string): Promise<boolean>;
    getRepository(repoInfo: RepositoryInfo): Promise<Repository>;
    listBranches(repoInfo: RepositoryInfo): Promise<Branch[]>;
}

export interface RepositoryInfo {
    provider: string;
    owner: string;
    name: string;
    fullName: string;
    url: string;
}

export interface WebhookConfig {
    url: string;
    secret: string;
    events: string[];
    contentType: 'json' | 'form';
    insecureSsl?: boolean;
}

export interface WebhookResult {
    id: string;
    url: string;
    active: boolean;
    events: string[];
}

export interface Repository {
    id: string;
    name: string;
    fullName: string;
    description?: string;
    private: boolean;
    defaultBranch: string;
    url: string;
    cloneUrl: string;
    language?: string;
}

export interface Branch {
    name: string;
    protected: boolean;
    default: boolean;
    sha: string;
}

export class GitHubProvider implements SCMProvider {
    name = 'github';
    baseUrl = 'https://api.github.com';
    private token?: string;

    async authenticate(token: string): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/user`, {
                headers: { Authorization: `token ${token}` }
            });
            
            this.token = token;
            logger.info('GitHub authentication successful', { user: response.data.login });
            return true;
        } catch (error: any) {
            logger.error('GitHub authentication failed', { error: error.message });
            return false;
        }
    }

    async createWebhook(repoInfo: RepositoryInfo, webhookConfig: WebhookConfig): Promise<WebhookResult> {
        if (!this.token) throw new Error('Not authenticated with GitHub');

        try {
            const payload = {
                name: 'web',
                active: true,
                events: webhookConfig.events,
                config: {
                    url: webhookConfig.url,
                    content_type: webhookConfig.contentType,
                    secret: webhookConfig.secret,
                    insecure_ssl: webhookConfig.insecureSsl ? '1' : '0'
                }
            };

            const response = await axios.post(
                `${this.baseUrl}/repos/${repoInfo.fullName}/hooks`,
                payload,
                { headers: { Authorization: `token ${this.token}` } }
            );

            logger.info('GitHub webhook created', { 
                repository: repoInfo.fullName, 
                webhookId: response.data.id 
            });

            return {
                id: response.data.id.toString(),
                url: response.data.config.url,
                active: response.data.active,
                events: response.data.events
            };
        } catch (error: any) {
            logger.error('Failed to create GitHub webhook', { 
                error: error.response?.data || error.message 
            });
            throw new Error(`GitHub webhook creation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    async testWebhook(repoInfo: RepositoryInfo, webhookId: string): Promise<boolean> {
        if (!this.token) throw new Error('Not authenticated with GitHub');

        try {
            await axios.post(
                `${this.baseUrl}/repos/${repoInfo.fullName}/hooks/${webhookId}/tests`,
                {},
                { headers: { Authorization: `token ${this.token}` } }
            );

            logger.info('GitHub webhook test triggered', { 
                repository: repoInfo.fullName, 
                webhookId 
            });
            return true;
        } catch (error: any) {
            logger.error('GitHub webhook test failed', { error: error.message });
            return false;
        }
    }

    async getRepository(repoInfo: RepositoryInfo): Promise<Repository> {
        if (!this.token) throw new Error('Not authenticated with GitHub');

        try {
            const response = await axios.get(
                `${this.baseUrl}/repos/${repoInfo.fullName}`,
                { headers: { Authorization: `token ${this.token}` } }
            );

            const repo = response.data;
            return {
                id: repo.id.toString(),
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                private: repo.private,
                defaultBranch: repo.default_branch,
                url: repo.html_url,
                cloneUrl: repo.clone_url,
                language: repo.language
            };
        } catch (error: any) {
            throw new Error(`Failed to get GitHub repository: ${error.response?.data?.message || error.message}`);
        }
    }

    async listBranches(repoInfo: RepositoryInfo): Promise<Branch[]> {
        if (!this.token) throw new Error('Not authenticated with GitHub');

        try {
            const response = await axios.get(
                `${this.baseUrl}/repos/${repoInfo.fullName}/branches`,
                { headers: { Authorization: `token ${this.token}` } }
            );

            return response.data.map((branch: any) => ({
                name: branch.name,
                protected: branch.protected,
                default: branch.name === 'main' || branch.name === 'master',
                sha: branch.commit.sha
            }));
        } catch (error: any) {
            throw new Error(`Failed to list GitHub branches: ${error.response?.data?.message || error.message}`);
        }
    }
}

export class GitLabProvider implements SCMProvider {
    name = 'gitlab';
    baseUrl = 'https://gitlab.com/api/v4';
    private token?: string;

    async authenticate(token: string): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/user`, {
                headers: { 'PRIVATE-TOKEN': token }
            });
            
            this.token = token;
            logger.info('GitLab authentication successful', { user: response.data.username });
            return true;
        } catch (error: any) {
            logger.error('GitLab authentication failed', { error: error.message });
            return false;
        }
    }

    async createWebhook(repoInfo: RepositoryInfo, webhookConfig: WebhookConfig): Promise<WebhookResult> {
        if (!this.token) throw new Error('Not authenticated with GitLab');

        try {
            // Get project ID first
            const projectResponse = await axios.get(
                `${this.baseUrl}/projects/${encodeURIComponent(repoInfo.fullName)}`,
                { headers: { 'PRIVATE-TOKEN': this.token } }
            );
            
            const projectId = projectResponse.data.id;

            const payload = {
                url: webhookConfig.url,
                token: webhookConfig.secret,
                push_events: webhookConfig.events.includes('push'),
                merge_requests_events: webhookConfig.events.includes('pull_request'),
                releases_events: webhookConfig.events.includes('release'),
                enable_ssl_verification: !webhookConfig.insecureSsl
            };

            const response = await axios.post(
                `${this.baseUrl}/projects/${projectId}/hooks`,
                payload,
                { headers: { 'PRIVATE-TOKEN': this.token } }
            );

            logger.info('GitLab webhook created', { 
                repository: repoInfo.fullName, 
                webhookId: response.data.id 
            });

            return {
                id: response.data.id.toString(),
                url: response.data.url,
                active: true,
                events: webhookConfig.events
            };
        } catch (error: any) {
            logger.error('Failed to create GitLab webhook', { 
                error: error.response?.data || error.message 
            });
            throw new Error(`GitLab webhook creation failed: ${error.response?.data?.message || error.message}`);
        }
    }

    async testWebhook(repoInfo: RepositoryInfo, webhookId: string): Promise<boolean> {
        // GitLab doesn't have a built-in webhook test endpoint
        // We'll implement a custom test by triggering a dummy event
        logger.info('GitLab webhook test - manual verification required', { 
            repository: repoInfo.fullName, 
            webhookId 
        });
        return true;
    }

    async getRepository(repoInfo: RepositoryInfo): Promise<Repository> {
        if (!this.token) throw new Error('Not authenticated with GitLab');

        try {
            const response = await axios.get(
                `${this.baseUrl}/projects/${encodeURIComponent(repoInfo.fullName)}`,
                { headers: { 'PRIVATE-TOKEN': this.token } }
            );

            const repo = response.data;
            return {
                id: repo.id.toString(),
                name: repo.name,
                fullName: repo.path_with_namespace,
                description: repo.description,
                private: repo.visibility === 'private',
                defaultBranch: repo.default_branch,
                url: repo.web_url,
                cloneUrl: repo.http_url_to_repo,
                language: repo.languages ? Object.keys(repo.languages)[0] : undefined
            };
        } catch (error: any) {
            throw new Error(`Failed to get GitLab repository: ${error.response?.data?.message || error.message}`);
        }
    }

    async listBranches(repoInfo: RepositoryInfo): Promise<Branch[]> {
        if (!this.token) throw new Error('Not authenticated with GitLab');

        try {
            const projectResponse = await axios.get(
                `${this.baseUrl}/projects/${encodeURIComponent(repoInfo.fullName)}`,
                { headers: { 'PRIVATE-TOKEN': this.token } }
            );
            
            const projectId = projectResponse.data.id;
            const defaultBranch = projectResponse.data.default_branch;

            const response = await axios.get(
                `${this.baseUrl}/projects/${projectId}/repository/branches`,
                { headers: { 'PRIVATE-TOKEN': this.token } }
            );

            return response.data.map((branch: any) => ({
                name: branch.name,
                protected: branch.protected,
                default: branch.name === defaultBranch,
                sha: branch.commit.id
            }));
        } catch (error: any) {
            throw new Error(`Failed to list GitLab branches: ${error.response?.data?.message || error.message}`);
        }
    }
}

export class SCMProviderFactory {
    private static providers: Map<string, () => SCMProvider> = new Map([
        ['github', () => new GitHubProvider()],
        ['gitlab', () => new GitLabProvider()]
    ] as [string, () => SCMProvider][]);

    static getProvider(name: string): SCMProvider {
        const providerFactory = this.providers.get(name.toLowerCase());
        if (!providerFactory) {
            throw new Error(`Unsupported SCM provider: ${name}`);
        }
        return providerFactory();
    }

    static getSupportedProviders(): string[] {
        return Array.from(this.providers.keys());
    }
}
