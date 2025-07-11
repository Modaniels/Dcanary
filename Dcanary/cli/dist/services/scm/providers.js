"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCMProviderFactory = exports.GitLabProvider = exports.GitHubProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../../utils/logger");
class GitHubProvider {
    name = 'github';
    baseUrl = 'https://api.github.com';
    token;
    async authenticate(token) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/user`, {
                headers: { Authorization: `token ${token}` }
            });
            this.token = token;
            logger_1.logger.info('GitHub authentication successful', { user: response.data.login });
            return true;
        }
        catch (error) {
            logger_1.logger.error('GitHub authentication failed', { error: error.message });
            return false;
        }
    }
    async createWebhook(repoInfo, webhookConfig) {
        if (!this.token)
            throw new Error('Not authenticated with GitHub');
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
            const response = await axios_1.default.post(`${this.baseUrl}/repos/${repoInfo.fullName}/hooks`, payload, { headers: { Authorization: `token ${this.token}` } });
            logger_1.logger.info('GitHub webhook created', {
                repository: repoInfo.fullName,
                webhookId: response.data.id
            });
            return {
                id: response.data.id.toString(),
                url: response.data.config.url,
                active: response.data.active,
                events: response.data.events
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create GitHub webhook', {
                error: error.response?.data || error.message
            });
            throw new Error(`GitHub webhook creation failed: ${error.response?.data?.message || error.message}`);
        }
    }
    async testWebhook(repoInfo, webhookId) {
        if (!this.token)
            throw new Error('Not authenticated with GitHub');
        try {
            await axios_1.default.post(`${this.baseUrl}/repos/${repoInfo.fullName}/hooks/${webhookId}/tests`, {}, { headers: { Authorization: `token ${this.token}` } });
            logger_1.logger.info('GitHub webhook test triggered', {
                repository: repoInfo.fullName,
                webhookId
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('GitHub webhook test failed', { error: error.message });
            return false;
        }
    }
    async getRepository(repoInfo) {
        if (!this.token)
            throw new Error('Not authenticated with GitHub');
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/repos/${repoInfo.fullName}`, { headers: { Authorization: `token ${this.token}` } });
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
        }
        catch (error) {
            throw new Error(`Failed to get GitHub repository: ${error.response?.data?.message || error.message}`);
        }
    }
    async listBranches(repoInfo) {
        if (!this.token)
            throw new Error('Not authenticated with GitHub');
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/repos/${repoInfo.fullName}/branches`, { headers: { Authorization: `token ${this.token}` } });
            return response.data.map((branch) => ({
                name: branch.name,
                protected: branch.protected,
                default: branch.name === 'main' || branch.name === 'master',
                sha: branch.commit.sha
            }));
        }
        catch (error) {
            throw new Error(`Failed to list GitHub branches: ${error.response?.data?.message || error.message}`);
        }
    }
}
exports.GitHubProvider = GitHubProvider;
class GitLabProvider {
    name = 'gitlab';
    baseUrl = 'https://gitlab.com/api/v4';
    token;
    async authenticate(token) {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/user`, {
                headers: { 'PRIVATE-TOKEN': token }
            });
            this.token = token;
            logger_1.logger.info('GitLab authentication successful', { user: response.data.username });
            return true;
        }
        catch (error) {
            logger_1.logger.error('GitLab authentication failed', { error: error.message });
            return false;
        }
    }
    async createWebhook(repoInfo, webhookConfig) {
        if (!this.token)
            throw new Error('Not authenticated with GitLab');
        try {
            // Get project ID first
            const projectResponse = await axios_1.default.get(`${this.baseUrl}/projects/${encodeURIComponent(repoInfo.fullName)}`, { headers: { 'PRIVATE-TOKEN': this.token } });
            const projectId = projectResponse.data.id;
            const payload = {
                url: webhookConfig.url,
                token: webhookConfig.secret,
                push_events: webhookConfig.events.includes('push'),
                merge_requests_events: webhookConfig.events.includes('pull_request'),
                releases_events: webhookConfig.events.includes('release'),
                enable_ssl_verification: !webhookConfig.insecureSsl
            };
            const response = await axios_1.default.post(`${this.baseUrl}/projects/${projectId}/hooks`, payload, { headers: { 'PRIVATE-TOKEN': this.token } });
            logger_1.logger.info('GitLab webhook created', {
                repository: repoInfo.fullName,
                webhookId: response.data.id
            });
            return {
                id: response.data.id.toString(),
                url: response.data.url,
                active: true,
                events: webhookConfig.events
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to create GitLab webhook', {
                error: error.response?.data || error.message
            });
            throw new Error(`GitLab webhook creation failed: ${error.response?.data?.message || error.message}`);
        }
    }
    async testWebhook(repoInfo, webhookId) {
        // GitLab doesn't have a built-in webhook test endpoint
        // We'll implement a custom test by triggering a dummy event
        logger_1.logger.info('GitLab webhook test - manual verification required', {
            repository: repoInfo.fullName,
            webhookId
        });
        return true;
    }
    async getRepository(repoInfo) {
        if (!this.token)
            throw new Error('Not authenticated with GitLab');
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/projects/${encodeURIComponent(repoInfo.fullName)}`, { headers: { 'PRIVATE-TOKEN': this.token } });
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
        }
        catch (error) {
            throw new Error(`Failed to get GitLab repository: ${error.response?.data?.message || error.message}`);
        }
    }
    async listBranches(repoInfo) {
        if (!this.token)
            throw new Error('Not authenticated with GitLab');
        try {
            const projectResponse = await axios_1.default.get(`${this.baseUrl}/projects/${encodeURIComponent(repoInfo.fullName)}`, { headers: { 'PRIVATE-TOKEN': this.token } });
            const projectId = projectResponse.data.id;
            const defaultBranch = projectResponse.data.default_branch;
            const response = await axios_1.default.get(`${this.baseUrl}/projects/${projectId}/repository/branches`, { headers: { 'PRIVATE-TOKEN': this.token } });
            return response.data.map((branch) => ({
                name: branch.name,
                protected: branch.protected,
                default: branch.name === defaultBranch,
                sha: branch.commit.id
            }));
        }
        catch (error) {
            throw new Error(`Failed to list GitLab branches: ${error.response?.data?.message || error.message}`);
        }
    }
}
exports.GitLabProvider = GitLabProvider;
class SCMProviderFactory {
    static providers = new Map([
        ['github', () => new GitHubProvider()],
        ['gitlab', () => new GitLabProvider()]
    ]);
    static getProvider(name) {
        const providerFactory = this.providers.get(name.toLowerCase());
        if (!providerFactory) {
            throw new Error(`Unsupported SCM provider: ${name}`);
        }
        return providerFactory();
    }
    static getSupportedProviders() {
        return Array.from(this.providers.keys());
    }
}
exports.SCMProviderFactory = SCMProviderFactory;
//# sourceMappingURL=providers.js.map