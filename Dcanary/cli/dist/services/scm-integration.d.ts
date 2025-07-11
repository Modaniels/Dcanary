import { AxiosInstance } from 'axios';
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
    baseUrl?: string;
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
export declare abstract class BaseSCMProvider {
    protected client: AxiosInstance;
    protected config: SCMIntegrationConfig;
    constructor(config: SCMIntegrationConfig);
    protected abstract getAuthHeaders(): Record<string, string>;
    abstract listRepositories(): Promise<SCMRepository[]>;
    abstract getRepository(owner: string, repo: string): Promise<SCMRepository>;
    abstract createWebhook(owner: string, repo: string, webhookUrl: string, events: string[]): Promise<SCMWebhook>;
    abstract deleteWebhook(owner: string, repo: string, webhookId: string): Promise<boolean>;
    abstract listWebhooks(owner: string, repo: string): Promise<SCMWebhook[]>;
    abstract validateWebhookSignature(payload: string, signature: string): boolean;
    abstract parseWebhookPayload(payload: any): WebhookPayload;
    setupRepositoryIntegration(owner: string, repo: string): Promise<string>;
    handleWebhookEvent(payload: WebhookPayload): Promise<void>;
    private shouldTriggerBuild;
    private getEventType;
    private triggerCanisterDeployment;
    private generateBuildCommands;
    private generateTestCommands;
    private getEnvironmentVariables;
}
export declare class GitHubProvider extends BaseSCMProvider {
    protected getAuthHeaders(): Record<string, string>;
    listRepositories(): Promise<SCMRepository[]>;
    getRepository(owner: string, repo: string): Promise<SCMRepository>;
    createWebhook(owner: string, repo: string, webhookUrl: string, events: string[]): Promise<SCMWebhook>;
    deleteWebhook(owner: string, repo: string, webhookId: string): Promise<boolean>;
    listWebhooks(owner: string, repo: string): Promise<SCMWebhook[]>;
    validateWebhookSignature(payload: string, signature: string): boolean;
    parseWebhookPayload(payload: any): WebhookPayload;
    private mapGitHubRepo;
    private mapGitHubWebhook;
}
export declare class GitLabProvider extends BaseSCMProvider {
    protected getAuthHeaders(): Record<string, string>;
    listRepositories(): Promise<SCMRepository[]>;
    getRepository(owner: string, repo: string): Promise<SCMRepository>;
    createWebhook(owner: string, repo: string, webhookUrl: string, events: string[]): Promise<SCMWebhook>;
    deleteWebhook(owner: string, repo: string, webhookId: string): Promise<boolean>;
    listWebhooks(owner: string, repo: string): Promise<SCMWebhook[]>;
    validateWebhookSignature(payload: string, signature: string): boolean;
    parseWebhookPayload(payload: any): WebhookPayload;
    private mapGitLabProject;
    private mapGitLabWebhook;
}
export declare class SCMProviderFactory {
    static createProvider(config: SCMIntegrationConfig): BaseSCMProvider;
}
export declare const scmIntegrationService: {
    createProvider: typeof SCMProviderFactory.createProvider;
    providers: {
        GitHubProvider: typeof GitHubProvider;
        GitLabProvider: typeof GitLabProvider;
    };
};
//# sourceMappingURL=scm-integration.d.ts.map