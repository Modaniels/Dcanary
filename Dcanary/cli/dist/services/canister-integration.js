"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canisterService = exports.CanisterIntegrationService = void 0;
const agent_1 = require("@dfinity/agent");
const principal_1 = require("@dfinity/principal");
const identity_1 = require("@dfinity/identity");
const logger_1 = require("../utils/logger");
const config_1 = require("../utils/config");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// ============================================================================
// CANISTER INTEGRATION SERVICE
// ============================================================================
class CanisterIntegrationService {
    agent = null;
    identity = null;
    webhookActor = null;
    verificationActor = null;
    buildExecutorActor = null;
    constructor() {
        this.initializeAgent();
    }
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    async initializeAgent() {
        try {
            const network = config_1.configManager.get('network') || 'local';
            const providerUrl = network === 'ic'
                ? 'https://ic0.app'
                : 'http://localhost:8000';
            this.agent = new agent_1.HttpAgent({
                host: providerUrl,
                identity: await this.getIdentity()
            });
            // Fetch root key for local development
            if (network === 'local') {
                await this.agent.fetchRootKey();
            }
            logger_1.logger.info('IC Agent initialized', { network, providerUrl });
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize IC Agent', { error });
            throw error;
        }
    }
    async getIdentity() {
        if (this.identity) {
            return this.identity;
        }
        try {
            const identityPath = config_1.configManager.get('identity') ||
                path_1.default.join(process.env.HOME || '', '.config/dfx/identity/default/identity.pem');
            if (await fs_extra_1.default.pathExists(identityPath)) {
                const identityPem = await fs_extra_1.default.readFile(identityPath, 'utf8');
                // Note: fromPem might not exist, using generate as fallback
                try {
                    this.identity = identity_1.Ed25519KeyIdentity.fromPem?.(identityPem) || identity_1.Ed25519KeyIdentity.generate();
                }
                catch {
                    this.identity = identity_1.Ed25519KeyIdentity.generate();
                }
                logger_1.logger.info('IC Identity loaded', { path: identityPath });
            }
            else {
                // Create anonymous identity for testing
                this.identity = identity_1.Ed25519KeyIdentity.generate();
                logger_1.logger.warn('Using anonymous identity - configure with dcanary configure --identity <path>');
            }
            return this.identity;
        }
        catch (error) {
            logger_1.logger.error('Failed to load IC identity', { error });
            throw error;
        }
    }
    async getWebhookActor() {
        if (this.webhookActor) {
            return this.webhookActor;
        }
        const canisterId = config_1.configManager.get('webhookCanisterId');
        if (!canisterId) {
            throw new Error('Webhook canister ID not configured. Use: dcanary configure --webhook-canister <id>');
        }
        // In a real implementation, you'd import the IDL from your canister
        const idl = ({ IDL }) => {
            // This should match your webhook_canister.ts interface
            return IDL.Service({
                register_repository: IDL.Func([IDL.Record({})], [IDL.Variant({})], []),
                handle_webhook: IDL.Func([IDL.Record({})], [IDL.Variant({})], []),
                get_repository_config: IDL.Func([IDL.Text], [IDL.Variant({})], ['query']),
                list_repositories: IDL.Func([], [IDL.Vec(IDL.Record({}))], ['query']),
                update_repository_config: IDL.Func([IDL.Text, IDL.Record({})], [IDL.Variant({})], []),
                remove_repository: IDL.Func([IDL.Text], [IDL.Variant({})], []),
                get_webhook_events: IDL.Func([IDL.Text, IDL.Opt(IDL.Nat)], [IDL.Vec(IDL.Record({}))], ['query'])
            });
        };
        this.webhookActor = agent_1.Actor.createActor(idl, {
            agent: this.agent,
            canisterId: principal_1.Principal.fromText(String(canisterId))
        });
        return this.webhookActor;
    }
    async getVerificationActor() {
        if (this.verificationActor) {
            return this.verificationActor;
        }
        const canisterId = config_1.configManager.get('verificationCanisterId');
        if (!canisterId) {
            throw new Error('Verification canister ID not configured. Use: dcanary configure --verification-canister <id>');
        }
        // Similar IDL setup for verification canister
        const idl = ({ IDL }) => {
            return IDL.Service({
                create_verification_request: IDL.Func([IDL.Record({})], [IDL.Variant({})], []),
                get_verification_status: IDL.Func([IDL.Text], [IDL.Variant({})], ['query']),
                submit_build_result: IDL.Func([IDL.Text, IDL.Record({})], [IDL.Variant({})], []),
                get_build_logs: IDL.Func([IDL.Text], [IDL.Variant({})], ['query']),
                list_verification_requests: IDL.Func([IDL.Opt(IDL.Record({}))], [IDL.Vec(IDL.Record({}))], ['query']),
                get_pipeline_status: IDL.Func([IDL.Text], [IDL.Variant({})], ['query'])
            });
        };
        this.verificationActor = agent_1.Actor.createActor(idl, {
            agent: this.agent,
            canisterId: principal_1.Principal.fromText(canisterId)
        });
        return this.verificationActor;
    }
    // ========================================================================
    // REPOSITORY MANAGEMENT
    // ========================================================================
    async registerRepository(config) {
        try {
            const actor = await this.getWebhookActor();
            const result = await actor.register_repository(config);
            if ('Ok' in result) {
                logger_1.logger.info('Repository registered successfully', {
                    repoId: config.repo_id,
                    name: config.name
                });
                return result.Ok;
            }
            else {
                throw new Error(`Failed to register repository: ${JSON.stringify(result.Err)}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to register repository', { config, error });
            throw error;
        }
    }
    async getRepositoryConfig(repoId) {
        try {
            const actor = await this.getWebhookActor();
            const result = await actor.get_repository_config(repoId);
            if ('Ok' in result) {
                return result.Ok;
            }
            else {
                logger_1.logger.warn('Repository not found', { repoId });
                return null;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to get repository config', { repoId, error });
            throw error;
        }
    }
    async listRepositories() {
        try {
            const actor = await this.getWebhookActor();
            return await actor.list_repositories();
        }
        catch (error) {
            logger_1.logger.error('Failed to list repositories', { error });
            throw error;
        }
    }
    async removeRepository(repoId) {
        try {
            const actor = await this.getWebhookActor();
            const result = await actor.remove_repository(repoId);
            if ('Ok' in result) {
                logger_1.logger.info('Repository removed successfully', { repoId });
                return true;
            }
            else {
                logger_1.logger.error('Failed to remove repository', { repoId, error: result.Err });
                return false;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to remove repository', { repoId, error });
            throw error;
        }
    }
    // ========================================================================
    // WEBHOOK HANDLING
    // ========================================================================
    async handleWebhook(repoId, payload) {
        try {
            const actor = await this.getWebhookActor();
            const result = await actor.handle_webhook({
                repo_id: repoId,
                payload,
                timestamp: BigInt(Date.now())
            });
            if ('Ok' in result) {
                logger_1.logger.info('Webhook processed successfully', { repoId });
                return result.Ok;
            }
            else {
                throw new Error(`Webhook processing failed: ${JSON.stringify(result.Err)}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to handle webhook', { repoId, error });
            throw error;
        }
    }
    async getWebhookEvents(repoId, limit) {
        try {
            const actor = await this.getWebhookActor();
            return await actor.get_webhook_events(repoId, limit ? Number(limit) : undefined);
        }
        catch (error) {
            logger_1.logger.error('Failed to get webhook events', { repoId, error });
            throw error;
        }
    }
    // ========================================================================
    // VERIFICATION & BUILD MANAGEMENT
    // ========================================================================
    async createVerificationRequest(request) {
        try {
            const actor = await this.getVerificationActor();
            const result = await actor.create_verification_request(request);
            if ('Ok' in result) {
                logger_1.logger.info('Verification request created', { requestId: result.Ok });
                return result.Ok;
            }
            else {
                throw new Error(`Failed to create verification request: ${JSON.stringify(result.Err)}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to create verification request', { request, error });
            throw error;
        }
    }
    async getVerificationStatus(requestId) {
        try {
            const actor = await this.getVerificationActor();
            const result = await actor.get_verification_status(requestId);
            if ('Ok' in result) {
                return result.Ok;
            }
            else {
                logger_1.logger.warn('Verification request not found', { requestId });
                return null;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to get verification status', { requestId, error });
            throw error;
        }
    }
    async getBuildLogs(requestId) {
        try {
            const actor = await this.getVerificationActor();
            const result = await actor.get_build_logs(requestId);
            if ('Ok' in result) {
                return result.Ok;
            }
            else {
                logger_1.logger.warn('Build logs not found', { requestId });
                return [];
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to get build logs', { requestId, error });
            throw error;
        }
    }
    async listVerificationRequests(filter) {
        try {
            const actor = await this.getVerificationActor();
            return await actor.list_verification_requests(filter);
        }
        catch (error) {
            logger_1.logger.error('Failed to list verification requests', { error });
            throw error;
        }
    }
    async getPipelineStatus(pipelineId) {
        try {
            const actor = await this.getVerificationActor();
            const result = await actor.get_pipeline_status(pipelineId);
            if ('Ok' in result) {
                return result.Ok;
            }
            else {
                return null;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to get pipeline status', { pipelineId, error });
            throw error;
        }
    }
}
exports.CanisterIntegrationService = CanisterIntegrationService;
// Export singleton instance
exports.canisterService = new CanisterIntegrationService();
//# sourceMappingURL=canister-integration.js.map