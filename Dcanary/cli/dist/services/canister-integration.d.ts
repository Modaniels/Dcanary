/**
 * Webhook Canister Interface
 */
export interface WebhookCanister {
    register_repository: (config: RepositoryConfig) => Promise<{
        Ok: string;
    } | {
        Err: any;
    }>;
    handle_webhook: (payload: any) => Promise<{
        Ok: WebhookResult;
    } | {
        Err: any;
    }>;
    get_repository_config: (repo_id: string) => Promise<{
        Ok: RepositoryConfig;
    } | {
        Err: any;
    }>;
    list_repositories: () => Promise<RepositoryConfig[]>;
    update_repository_config: (repo_id: string, config: RepositoryConfig) => Promise<{
        Ok: string;
    } | {
        Err: any;
    }>;
    remove_repository: (repo_id: string) => Promise<{
        Ok: string;
    } | {
        Err: any;
    }>;
    get_webhook_events: (repo_id: string, limit?: number) => Promise<WebhookEvent[]>;
}
/**
 * Verification Canister Interface
 */
export interface VerificationCanister {
    create_verification_request: (request: VerificationRequest) => Promise<{
        Ok: string;
    } | {
        Err: any;
    }>;
    get_verification_status: (request_id: string) => Promise<{
        Ok: VerificationStatus;
    } | {
        Err: any;
    }>;
    submit_build_result: (request_id: string, result: BuildResult) => Promise<{
        Ok: string;
    } | {
        Err: any;
    }>;
    get_build_logs: (request_id: string) => Promise<{
        Ok: string[];
    } | {
        Err: any;
    }>;
    list_verification_requests: (filter?: any) => Promise<VerificationRequest[]>;
    get_pipeline_status: (pipeline_id: string) => Promise<{
        Ok: PipelineStatus;
    } | {
        Err: any;
    }>;
}
/**
 * Build Executor Canister Interface
 */
export interface BuildExecutorCanister {
    execute_build: (instructions: BuildInstructions) => Promise<{
        Ok: BuildResult;
    } | {
        Err: any;
    }>;
    get_build_status: (build_id: string) => Promise<{
        Ok: BuildStatus;
    } | {
        Err: any;
    }>;
    get_available_executors: () => Promise<ExecutorInfo[]>;
    register_executor: (executor: ExecutorConfig) => Promise<{
        Ok: string;
    } | {
        Err: any;
    }>;
}
interface RepositoryConfig {
    repo_id: string;
    name: string;
    owner: string;
    scm_provider: string;
    webhook_url: string;
    webhook_secret?: string;
    auto_deploy: boolean;
    target_branch: string;
    build_triggers: string[];
    canister_configs: CanisterConfig[];
    pipeline_config: PipelineConfig;
}
interface CanisterConfig {
    name: string;
    type: string;
    build_command?: string;
    deploy_command?: string;
    canister_id?: string;
    network: string;
    cycles_threshold?: number;
}
interface PipelineConfig {
    stages: string[];
    parallel_execution: boolean;
    timeout_minutes: number;
    notification_settings: NotificationSettings;
}
interface NotificationSettings {
    on_success: boolean;
    on_failure: boolean;
    channels: string[];
}
interface WebhookEvent {
    event_id: string;
    repo_id: string;
    event_type: string;
    payload: any;
    processed_at: bigint;
    status: string;
}
interface VerificationRequest {
    request_id: string;
    repo_id: string;
    commit_hash: string;
    branch: string;
    build_instructions: BuildInstructions;
    requester: string;
    created_at: bigint;
}
interface VerificationStatus {
    request_id: string;
    status: string;
    stages_completed: string[];
    current_stage?: string;
    progress_percentage: number;
    started_at?: bigint;
    completed_at?: bigint;
    error_message?: string;
}
interface BuildInstructions {
    repo_url: string;
    commit_hash: string;
    build_commands: string[];
    test_commands?: string[];
    environment_vars: Record<string, string>;
    timeout_seconds: number;
}
interface BuildResult {
    build_id: string;
    success: boolean;
    artifacts: string[];
    logs: string[];
    test_results?: TestResult[];
    execution_time: number;
    error_message?: string;
}
interface BuildStatus {
    build_id: string;
    status: string;
    progress: number;
    current_step?: string;
    logs: string[];
}
interface ExecutorInfo {
    executor_id: string;
    status: string;
    capacity: number;
    current_load: number;
    supported_languages: string[];
}
interface ExecutorConfig {
    executor_id: string;
    name: string;
    supported_languages: string[];
    max_concurrent_builds: number;
    resource_limits: ResourceLimits;
}
interface ResourceLimits {
    memory_mb: number;
    cpu_cores: number;
    disk_mb: number;
    timeout_minutes: number;
}
interface TestResult {
    suite: string;
    tests_run: number;
    tests_passed: number;
    tests_failed: number;
    failures: TestFailure[];
}
interface TestFailure {
    test_name: string;
    error_message: string;
    stack_trace?: string;
}
interface PipelineStatus {
    pipeline_id: string;
    status: string;
    stages: StageStatus[];
    started_at: bigint;
    updated_at: bigint;
}
interface StageStatus {
    name: string;
    status: string;
    started_at?: bigint;
    completed_at?: bigint;
    logs: string[];
}
export declare class CanisterIntegrationService {
    private agent;
    private identity;
    private webhookActor;
    private verificationActor;
    private buildExecutorActor;
    constructor();
    private initializeAgent;
    private getIdentity;
    private getWebhookActor;
    private getVerificationActor;
    registerRepository(config: RepositoryConfig): Promise<string>;
    getRepositoryConfig(repoId: string): Promise<RepositoryConfig | null>;
    listRepositories(): Promise<RepositoryConfig[]>;
    removeRepository(repoId: string): Promise<boolean>;
    handleWebhook(repoId: string, payload: any): Promise<WebhookResult>;
    getWebhookEvents(repoId: string, limit?: number): Promise<WebhookEvent[]>;
    createVerificationRequest(request: VerificationRequest): Promise<string>;
    getVerificationStatus(requestId: string): Promise<VerificationStatus | null>;
    getBuildLogs(requestId: string): Promise<string[]>;
    listVerificationRequests(filter?: any): Promise<VerificationRequest[]>;
    getPipelineStatus(pipelineId: string): Promise<PipelineStatus | null>;
}
interface WebhookResult {
    processed: boolean;
    verification_request_id?: string;
    pipeline_id?: string;
    message: string;
}
export declare const canisterService: CanisterIntegrationService;
export {};
//# sourceMappingURL=canister-integration.d.ts.map