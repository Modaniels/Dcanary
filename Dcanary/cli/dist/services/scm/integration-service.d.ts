import { RepositoryInfo, WebhookResult } from './providers';
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
export declare class SCMIntegrationService {
    private static readonly CONFIG_FILE;
    private static readonly WEBHOOK_ENDPOINT;
    setupIntegration(options: {
        provider: string;
        repositoryUrl?: string;
        token?: string;
        autoDeploy: boolean;
        branches: string[];
        events: string[];
        webhookUrl?: string;
    }): Promise<SCMIntegrationConfig>;
    testIntegration(provider?: string): Promise<boolean>;
    handleWebhookEvent(payload: any, provider: string): Promise<TriggerEvent | null>;
    getIntegrationStatus(): Promise<{
        configured: boolean;
        provider?: string;
        repository?: string;
        webhook?: boolean;
        lastEvent?: string;
    }>;
    private detectRepositoryFromGit;
    private parseRepositoryUrl;
    private parseWebhookPayload;
    private parseGitHubWebhook;
    private parseGitLabWebhook;
    private generateWebhookSecret;
    private saveIntegrationConfig;
    private loadIntegrationConfig;
    private generateSetupInstructions;
}
export declare const scmIntegrationService: SCMIntegrationService;
//# sourceMappingURL=integration-service.d.ts.map