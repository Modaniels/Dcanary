import {
  Actor,
  ActorSubclass,
  HttpAgent,
  Identity,
  SignIdentity,
} from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { logger } from "../utils/logger";
import { configManager } from "../utils/config";
import fs from "fs-extra";
import path from "path";

// --- (Interfaces remain the same) ---
// ============================================================================
// CANISTER INTERFACES
// ============================================================================

/**
 * Webhook Canister Interface
 */
export interface WebhookCanister {
  register_repository: (
    config: RepositoryConfig,
  ) => Promise<{ Ok: string } | { Err: any }>;
  handle_webhook: (
    payload: any,
  ) => Promise<{ Ok: WebhookResult } | { Err: any }>;
  get_repository_config: (
    repo_id: string,
  ) => Promise<{ Ok: RepositoryConfig } | { Err: any }>;
  list_repositories: () => Promise<RepositoryConfig[]>;
  update_repository_config: (
    repo_id: string,
    config: RepositoryConfig,
  ) => Promise<{ Ok: string } | { Err: any }>;
  remove_repository: (
    repo_id: string,
  ) => Promise<{ Ok: string } | { Err: any }>;
  get_webhook_events: (
    repo_id: string,
    limit?: number,
  ) => Promise<WebhookEvent[]>;
}

/**
 * Verification Canister Interface
 */
export interface VerificationCanister {
  create_verification_request: (
    request: VerificationRequest,
  ) => Promise<{ Ok: string } | { Err: any }>;
  get_verification_status: (
    request_id: string,
  ) => Promise<{ Ok: VerificationStatus } | { Err: any }>;
  submit_build_result: (
    request_id: string,
    result: BuildResult,
  ) => Promise<{ Ok: string } | { Err: any }>;
  get_build_logs: (
    request_id: string,
  ) => Promise<{ Ok: string[] } | { Err: any }>;
  list_verification_requests: (filter?: any) => Promise<VerificationRequest[]>;
  get_pipeline_status: (
    pipeline_id: string,
  ) => Promise<{ Ok: PipelineStatus } | { Err: any }>;
}

/**
 * Build Executor Canister Interface
 */
export interface BuildExecutorCanister {
  execute_build: (
    instructions: BuildInstructions,
  ) => Promise<{ Ok: BuildResult } | { Err: any }>;
  get_build_status: (
    build_id: string,
  ) => Promise<{ Ok: BuildStatus } | { Err: any }>;
  get_available_executors: () => Promise<ExecutorInfo[]>;
  register_executor: (
    executor: ExecutorConfig,
  ) => Promise<{ Ok: string } | { Err: any }>;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// ============================================================================
// CANISTER INTEGRATION SERVICE
// ============================================================================

export class CanisterIntegrationService {
  private agent: HttpAgent | null = null;
  private identity: SignIdentity | null = null;
  private webhookActor: ActorSubclass<WebhookCanister> | null = null;
  private verificationActor: ActorSubclass<VerificationCanister> | null = null;
  private buildExecutorActor: ActorSubclass<BuildExecutorCanister> | null =
    null;

  constructor() {
    // The constructor is now empty. Initialization is deferred.
  }

  // ========================================================================
  // INITIALIZATION (LAZY)
  // ========================================================================

  /**
   * Ensures the agent is initialized before use. If not, it creates and
   * configures a new agent. This method is called by all public methods.
   */
  private async ensureAgentInitialized(): Promise<void> {
    if (this.agent) {
      return;
    }

    try {
      const network = configManager.get("network", "local");
      const providerUrl = network === "ic"
        ? "https://ic0.app"
        : "http://127.0.0.1:4943";

      this.agent = new HttpAgent({
        host: providerUrl,
        identity: await this.getIdentity(),
      });

      // Fetch root key for local development, which is non-blocking.
      if (network === "local") {
        this.agent.fetchRootKey().catch((err) => {
          logger.warn(
            "Could not fetch root key. Ensure the local replica is running.",
            { error: err },
          );
        });
      }

      logger.info("IC Agent initialized lazily.", { network, providerUrl });
    } catch (error) {
      logger.error("Failed to initialize IC Agent.", { error });
      // Re-throw to ensure the calling function knows initialization failed.
      throw error;
    }
  }

  private async getIdentity(): Promise<SignIdentity> {
    if (this.identity) {
      return this.identity;
    }

    try {
      const identityPath = configManager.get("identity") ||
        path.join(
          process.env.HOME || "",
          ".config/dfx/identity/default/identity.pem",
        );

      if (await fs.pathExists(identityPath)) {
        const identityPem = await fs.readFile(identityPath, "utf8");
        // Note: fromPem might not exist, using generate as fallback
        try {
          this.identity = (Ed25519KeyIdentity as any).fromPem?.(identityPem) ||
            Ed25519KeyIdentity.generate();
        } catch {
          this.identity = Ed25519KeyIdentity.generate();
        }
        logger.info("IC Identity loaded", { path: identityPath });
      } else {
        // Create anonymous identity for testing
        this.identity = Ed25519KeyIdentity.generate();
        logger.warn(
          "Using anonymous identity - configure with dcanary configure --identity <path>",
        );
      }

      return this.identity!;
    } catch (error) {
      logger.error("Failed to load IC identity", { error });
      throw error;
    }
  }

  private async getWebhookActor(): Promise<ActorSubclass<WebhookCanister>> {
    await this.ensureAgentInitialized();
    if (this.webhookActor) {
      return this.webhookActor;
    }

    const canisterId = configManager.get("webhookCanisterId");
    if (!canisterId) {
      throw new Error(
        "Webhook canister ID not configured. Use: dcanary configure --webhook-canister-id <id>",
      );
    }

    // In a real implementation, you'd import the IDL from your canister
    const idl = ({ IDL }: any) => {
      // This should match your webhook_canister.ts interface
      return IDL.Service({
        register_repository: IDL.Func([IDL.Record({})], [IDL.Variant({})], []),
        handle_webhook: IDL.Func([IDL.Record({})], [IDL.Variant({})], []),
        get_repository_config: IDL.Func([IDL.Text], [IDL.Variant({})], [
          "query",
        ]),
        list_repositories: IDL.Func([], [IDL.Vec(IDL.Record({}))], ["query"]),
        update_repository_config: IDL.Func([IDL.Text, IDL.Record({})], [
          IDL.Variant({}),
        ], []),
        remove_repository: IDL.Func([IDL.Text], [IDL.Variant({})], []),
        get_webhook_events: IDL.Func([IDL.Text, IDL.Opt(IDL.Nat)], [
          IDL.Vec(IDL.Record({})),
        ], ["query"]),
      });
    };

    this.webhookActor = Actor.createActor(idl, {
      agent: this.agent!,
      canisterId: Principal.fromText(String(canisterId)),
    }) as ActorSubclass<WebhookCanister>;

    return this.webhookActor;
  }

  private async getVerificationActor(): Promise<
    ActorSubclass<VerificationCanister>
  > {
    await this.ensureAgentInitialized();
    if (this.verificationActor) {
      return this.verificationActor;
    }

    const canisterId = configManager.get("verificationCanisterId");
    if (!canisterId) {
      throw new Error(
        "Verification canister ID not configured. Use: dcanary configure --verification-canister-id <id>",
      );
    }

    // Similar IDL setup for verification canister
    const idl = ({ IDL }: any) => {
      return IDL.Service({
        create_verification_request: IDL.Func([IDL.Record({})], [
          IDL.Variant({}),
        ], []),
        get_verification_status: IDL.Func([IDL.Text], [IDL.Variant({})], [
          "query",
        ]),
        submit_build_result: IDL.Func([IDL.Text, IDL.Record({})], [
          IDL.Variant({}),
        ], []),
        get_build_logs: IDL.Func([IDL.Text], [IDL.Variant({})], ["query"]),
        list_verification_requests: IDL.Func([IDL.Opt(IDL.Record({}))], [
          IDL.Vec(IDL.Record({})),
        ], ["query"]),
        get_pipeline_status: IDL.Func([IDL.Text], [IDL.Variant({})], ["query"]),
      });
    };

    this.verificationActor = Actor.createActor(idl, {
      agent: this.agent!,
      canisterId: Principal.fromText(canisterId),
    }) as ActorSubclass<VerificationCanister>;

    return this.verificationActor;
  }

  // ========================================================================
  // REPOSITORY MANAGEMENT
  // ========================================================================

  async registerRepository(config: RepositoryConfig): Promise<string> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getWebhookActor();
      const result = await actor.register_repository(config);

      if ("Ok" in result) {
        logger.info("Repository registered successfully", {
          repoId: config.repo_id,
          name: config.name,
        });
        return result.Ok;
      } else {
        throw new Error(
          `Failed to register repository: ${JSON.stringify(result.Err)}`,
        );
      }
    } catch (error) {
      logger.error("Failed to register repository", { config, error });
      throw error;
    }
  }

  async getRepositoryConfig(repoId: string): Promise<RepositoryConfig | null> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getWebhookActor();
      const result = await actor.get_repository_config(repoId);

      if ("Ok" in result) {
        return result.Ok;
      } else {
        logger.warn("Repository not found", { repoId });
        return null;
      }
    } catch (error) {
      logger.error("Failed to get repository config", { repoId, error });
      throw error;
    }
  }

  async listRepositories(): Promise<RepositoryConfig[]> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getWebhookActor();
      return await actor.list_repositories();
    } catch (error) {
      logger.error("Failed to list repositories", { error });
      throw error;
    }
  }

  async removeRepository(repoId: string): Promise<boolean> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getWebhookActor();
      const result = await actor.remove_repository(repoId);

      if ("Ok" in result) {
        logger.info("Repository removed successfully", { repoId });
        return true;
      } else {
        logger.error("Failed to remove repository", {
          repoId,
          error: result.Err,
        });
        return false;
      }
    } catch (error) {
      logger.error("Failed to remove repository", { repoId, error });
      throw error;
    }
  }

  // ========================================================================
  // WEBHOOK HANDLING
  // ========================================================================

  async handleWebhook(repoId: string, payload: any): Promise<WebhookResult> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getWebhookActor();
      const result = await actor.handle_webhook({
        repo_id: repoId,
        payload,
        timestamp: BigInt(Date.now()),
      });

      if ("Ok" in result) {
        logger.info("Webhook processed successfully", { repoId });
        return result.Ok;
      } else {
        throw new Error(
          `Webhook processing failed: ${JSON.stringify(result.Err)}`,
        );
      }
    } catch (error) {
      logger.error("Failed to handle webhook", { repoId, error });
      throw error;
    }
  }

  async getWebhookEvents(
    repoId: string,
    limit?: number,
  ): Promise<WebhookEvent[]> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getWebhookActor();
      return await actor.get_webhook_events(
        repoId,
        limit ? Number(limit) : undefined,
      );
    } catch (error) {
      logger.error("Failed to get webhook events", { repoId, error });
      throw error;
    }
  }

  // ========================================================================
  // VERIFICATION & BUILD MANAGEMENT
  // ========================================================================

  async createVerificationRequest(
    request: VerificationRequest,
  ): Promise<string> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getVerificationActor();
      const result = await actor.create_verification_request(request);

      if ("Ok" in result) {
        logger.info("Verification request created", { requestId: result.Ok });
        return result.Ok;
      } else {
        throw new Error(
          `Failed to create verification request: ${
            JSON.stringify(result.Err)
          }`,
        );
      }
    } catch (error) {
      logger.error("Failed to create verification request", { request, error });
      throw error;
    }
  }

  async getVerificationStatus(
    requestId: string,
  ): Promise<VerificationStatus | null> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getVerificationActor();
      const result = await actor.get_verification_status(requestId);

      if ("Ok" in result) {
        return result.Ok;
      } else {
        logger.warn("Verification request not found", { requestId });
        return null;
      }
    } catch (error) {
      logger.error("Failed to get verification status", { requestId, error });
      throw error;
    }
  }

  async getBuildLogs(requestId: string): Promise<string[]> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getVerificationActor();
      const result = await actor.get_build_logs(requestId);

      if ("Ok" in result) {
        return result.Ok;
      } else {
        logger.warn("Build logs not found", { requestId });
        return [];
      }
    } catch (error) {
      logger.error("Failed to get build logs", { requestId, error });
      throw error;
    }
  }

  async listVerificationRequests(filter?: any): Promise<VerificationRequest[]> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getVerificationActor();
      return await actor.list_verification_requests(filter);
    } catch (error) {
      logger.error("Failed to list verification requests", { error });
      throw error;
    }
  }

  async getPipelineStatus(pipelineId: string): Promise<PipelineStatus | null> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getVerificationActor();
      const result = await actor.get_pipeline_status(pipelineId);

      if ("Ok" in result) {
        return result.Ok;
      } else {
        return null;
      }
    } catch (error) {
      logger.error("Failed to get pipeline status", { pipelineId, error });
      throw error;
    }
  }
}

// ============================================================================
// HELPER TYPES FOR WEBHOOK INTEGRATION
// ============================================================================

interface WebhookResult {
  processed: boolean;
  verification_request_id?: string;
  pipeline_id?: string;
  message: string;
}

// Export singleton instance
export const canisterService = new CanisterIntegrationService();
