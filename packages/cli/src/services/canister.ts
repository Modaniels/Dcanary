import { Actor, HttpAgent, Identity, SignIdentity } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import fs from "fs-extra";
import path from "path";
import {
  BuildInstructionsResult,
  CanisterError,
  NetworkError,
  VerificationResult,
  VerificationResultWrapper,
  VoidResult,
} from "../types";
import { logger } from "../utils/logger";
import { configManager } from "../utils/config";

// ============================================================================
// IDL FACTORIES
// ============================================================================

const buildInstructionsIdl = ({ IDL }: any) => {
  const BuildInstructions = IDL.Record({
    project_id: IDL.Text,
    version: IDL.Text,
    instruction_set: IDL.Text,
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
    created_by: IDL.Principal,
  });
  const BuildInstructionsError = IDL.Variant({
    NotFound: IDL.Text,
    Unauthorized: IDL.Text,
    InvalidInput: IDL.Text,
    InternalError: IDL.Text,
  });
  return IDL.Service({
    add_build_instructions: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [
      IDL.Variant({ Ok: IDL.Null, Err: BuildInstructionsError }),
    ], []),
    get_build_instructions: IDL.Func([IDL.Text, IDL.Text], [
      IDL.Variant({ Ok: BuildInstructions, Err: BuildInstructionsError }),
    ], ["query"]),
  });
};

const verificationIdl = ({ IDL }: any) => {
  const VerificationStatus = IDL.Variant({
    Pending: IDL.Null,
    Verified: IDL.Null,
    Failed: IDL.Null,
  });
  const ExecutorResult = IDL.Record({
    executor_id: IDL.Principal,
    hash: IDL.Opt(IDL.Text),
    error: IDL.Opt(IDL.Text),
    completed: IDL.Bool,
    execution_time: IDL.Opt(IDL.Nat64),
  });
  const VerificationResult = IDL.Record({
    status: VerificationStatus,
    verified_hash: IDL.Opt(IDL.Text),
    error: IDL.Opt(IDL.Text),
    executor_results: IDL.Vec(ExecutorResult),
    consensus_threshold: IDL.Nat8,
    total_executors: IDL.Nat8,
    matching_results: IDL.Nat8,
    created_at: IDL.Nat64,
    completed_at: IDL.Opt(IDL.Nat64),
  });
  const VerificationError = IDL.Variant({
    NotFound: IDL.Text,
    Unauthorized: IDL.Text,
    InvalidInput: IDL.Text,
    InternalError: IDL.Text,
    TimeoutError: IDL.Text,
    ConsensusFailure: IDL.Text,
    InstructionsNotFound: IDL.Text,
    ExecutorFailure: IDL.Text,
  });
  return IDL.Service({
    request_verification: IDL.Func([IDL.Text, IDL.Text, IDL.Opt(IDL.Nat64)], [
      IDL.Variant({ Ok: VerificationResult, Err: VerificationError }),
    ], []),
    get_verification_status: IDL.Func([IDL.Text, IDL.Text], [
      IDL.Variant({ Ok: VerificationResult, Err: VerificationError }),
    ], ["query"]),
  });
};

const webhookIdl = ({ IDL }: any) => {
  // Using a placeholder service definition. In a real scenario, this would
  // be generated from the actual webhook canister's Candid file.
  return IDL.Service({
    list_repositories: IDL.Func([], [IDL.Vec(IDL.Record({}))], ["query"]),
  });
};

// ============================================================================
// UNIFIED CANISTER SERVICE
// ============================================================================

/**
 * A comprehensive service for interacting with all Dcanary canisters.
 * It uses lazy initialization for the agent and actors to improve performance
 * for commands that do not require on-chain interaction.
 */
export class CanisterService {
  private agent: HttpAgent | null = null;
  private identity: SignIdentity | null = null;

  private buildInstructionsActor: ActorSubclass | null = null;
  private verificationActor: ActorSubclass | null = null;
  private webhookActor: ActorSubclass | null = null;

  constructor() {
    // Initialization is deferred until a method is called.
  }

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

      if (network === "local") {
        await this.agent.fetchRootKey().catch((err) => {
          logger.warn(
            "Could not fetch root key. Ensure the local replica is running.",
            { error: err },
          );
        });
      }
      logger.info("IC Agent initialized lazily.", { network });
    } catch (error) {
      throw new NetworkError(
        `Failed to initialize IC Agent: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async getIdentity(): Promise<SignIdentity> {
    if (this.identity) {
      return this.identity;
    }
    try {
      const identityPath = configManager.get("identity") ||
        path.join(
          os.homedir(),
          ".config",
          "dfx",
          "identity",
          "default",
          "identity.pem",
        );
      if (fs.existsSync(identityPath)) {
        this.identity = Ed25519KeyIdentity.fromPem(
          fs.readFileSync(identityPath, "utf8"),
        );
        logger.info("User identity loaded.", { path: identityPath });
      } else {
        this.identity = Ed25519KeyIdentity.generate();
        logger.warn(
          'No identity found, using anonymous identity. Run "dcanary configure" to set a path.',
        );
      }
      return this.identity;
    } catch (error) {
      throw new ConfigurationError(
        `Failed to load identity: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  // --- Actor Creation Methods ---

  private async createActor(
    idlFactory: any,
    canisterIdKey: keyof CLIConfig,
    canisterName: string,
  ): Promise<ActorSubclass> {
    await this.ensureAgentInitialized();
    const canisterId = configManager.get(canisterIdKey);
    if (!canisterId) {
      throw new ConfigurationError(
        `${canisterName} canister ID is not configured. Please run "dcanary configure".`,
      );
    }
    return Actor.createActor(idlFactory, {
      agent: this.agent!,
      canisterId: Principal.fromText(String(canisterId)),
    });
  }

  private async getBuildInstructionsActor(): Promise<ActorSubclass> {
    if (!this.buildInstructionsActor) {
      this.buildInstructionsActor = await this.createActor(
        buildInstructionsIdl,
        "buildInstructionsCanisterId",
        "Build Instructions",
      );
    }
    return this.buildInstructionsActor;
  }

  private async getVerificationActor(): Promise<ActorSubclass> {
    if (!this.verificationActor) {
      this.verificationActor = await this.createActor(
        verificationIdl,
        "verificationCanisterId",
        "Verification",
      );
    }
    return this.verificationActor;
  }

  private async getWebhookActor(): Promise<ActorSubclass> {
    if (!this.webhookActor) {
      this.webhookActor = await this.createActor(
        webhookIdl,
        "webhookCanisterId",
        "Webhook",
      );
    }
    return this.webhookActor;
  }

  // --- Public API Methods ---

  public async addBuildInstructions(
    canisterId: string,
    projectId: string,
    version: string,
    instructionSet: string,
  ): Promise<void> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getBuildInstructionsActor();
      const result = await actor.add_build_instructions(
        projectId,
        version,
        instructionSet,
      ) as VoidResult;
      if ("Err" in result) {
        throw new CanisterError(
          `Failed to add build instructions: ${Object.values(result.Err)[0]}`,
        );
      }
    } catch (error) {
      if (error instanceof CanisterError) throw error;
      throw new NetworkError(
        `Failed to communicate with canister: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  public async requestVerification(
    canisterId: string,
    projectId: string,
    version: string,
    timeoutSeconds?: number,
  ): Promise<VerificationResult> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getVerificationActor();
      const timeout = timeoutSeconds ? [BigInt(timeoutSeconds)] : [];
      const result = await actor.request_verification(
        projectId,
        version,
        timeout,
      ) as VerificationResultWrapper;
      if ("Err" in result) {
        throw new CanisterError(
          `Failed to request verification: ${Object.values(result.Err)[0]}`,
        );
      }
      return result.Ok;
    } catch (error) {
      if (error instanceof CanisterError) throw error;
      throw new NetworkError(
        `Failed to communicate with canister: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  public async getVerificationStatus(
    canisterId: string,
    projectId: string,
    version: string,
  ): Promise<VerificationResult> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getVerificationActor();
      const result = await actor.get_verification_status(
        projectId,
        version,
      ) as VerificationResultWrapper;
      if ("Err" in result) {
        throw new CanisterError(
          `Failed to get verification status: ${Object.values(result.Err)[0]}`,
        );
      }
      return result.Ok;
    } catch (error) {
      if (error instanceof CanisterError) throw error;
      throw new NetworkError(
        `Failed to communicate with canister: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  public async listRepositories(): Promise<any[]> {
    await this.ensureAgentInitialized();
    try {
      const actor = await this.getWebhookActor();
      return await actor.list_repositories() as any[];
    } catch (error) {
      if (error instanceof CanisterError) throw error;
      throw new NetworkError(
        `Failed to list repositories: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

// Export a singleton instance of the service
export const canisterService = new CanisterService();
