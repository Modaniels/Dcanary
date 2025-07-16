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
export declare class GitHubProvider implements SCMProvider {
    name: string;
    baseUrl: string;
    private token?;
    authenticate(token: string): Promise<boolean>;
    createWebhook(repoInfo: RepositoryInfo, webhookConfig: WebhookConfig): Promise<WebhookResult>;
    testWebhook(repoInfo: RepositoryInfo, webhookId: string): Promise<boolean>;
    getRepository(repoInfo: RepositoryInfo): Promise<Repository>;
    listBranches(repoInfo: RepositoryInfo): Promise<Branch[]>;
}
export declare class GitLabProvider implements SCMProvider {
    name: string;
    baseUrl: string;
    private token?;
    authenticate(token: string): Promise<boolean>;
    createWebhook(repoInfo: RepositoryInfo, webhookConfig: WebhookConfig): Promise<WebhookResult>;
    testWebhook(repoInfo: RepositoryInfo, webhookId: string): Promise<boolean>;
    getRepository(repoInfo: RepositoryInfo): Promise<Repository>;
    listBranches(repoInfo: RepositoryInfo): Promise<Branch[]>;
}
export declare class SCMProviderFactory {
    private static providers;
    static getProvider(name: string): SCMProvider;
    static getSupportedProviders(): string[];
}
//# sourceMappingURL=providers.d.ts.map