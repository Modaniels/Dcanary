import { 
    IDL, 
    query, 
    update, 
    init, 
    postUpgrade,
    StableBTreeMap,
    Principal,
    time,
    msgCaller,
    trap,
    call
} from 'azle';

import {
    SCMProvider,
    WebhookEventType,
    RepositoryConfig,
    GitHubWebhookPayload,
    GitLabWebhookPayload,
    BuildTrigger,
    WebhookError,
    WebhookResult
} from './types/webhook';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

const RepositoryError = IDL.Variant({
    NotFound: IDL.Text,
    Unauthorized: IDL.Text,
    InvalidInput: IDL.Text,
    InternalError: IDL.Text,
    AlreadyExists: IDL.Text
});

type RepositoryError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { InternalError: string }
    | { AlreadyExists: string };

const RepositoryResult = IDL.Variant({
    Ok: IDL.Text,
    Err: RepositoryError
});

type RepositoryResult = 
    | { Ok: string }
    | { Err: RepositoryError };

// ============================================================================
// WEBHOOK HANDLER CANISTER
// ============================================================================

export default class WebhookHandlerCanister {
    // Stable storage for repository configurations
    private repositories = new StableBTreeMap<string, RepositoryConfig>(0);
    
    // Stable storage for build triggers
    private buildTriggers = new StableBTreeMap<string, BuildTrigger>(1);
    
    // Admin principal
    private adminPrincipal: Principal = Principal.fromText('2vxsx-fae');
    
    // Verification canister principal (to be set via configuration)
    private verificationCanisterPrincipal: Principal | null = null;

    // ============================================================================
    // LIFECYCLE HOOKS
    // ============================================================================

    @init([])
    init(): void {
        console.log('Webhook Handler Canister initialized');
    }

    @postUpgrade([])
    postUpgrade(): void {
        console.log('Webhook Handler Canister upgraded');
    }

    // ============================================================================
    // REPOSITORY MANAGEMENT
    // ============================================================================

    /**
     * Register a new repository for webhook handling
     */
    @update([IDL.Text, SCMProvider, IDL.Text, IDL.Text, IDL.Text, IDL.Bool, IDL.Bool, IDL.Vec(IDL.Text)])
    async registerRepository(
        projectId: string,
        provider: SCMProvider,
        owner: string,
        repoName: string,
        webhookSecret: string,
        autoBuildOnPush: boolean,
        autoBuildOnTag: boolean,
        buildBranches: string[]
    ): Promise<RepositoryResult> {
        const caller = msgCaller();
        
        // Only admin or project owners can register repositories
        if (caller.toText() !== this.adminPrincipal.toText()) {
            return {
                Err: { Unauthorized: 'Only authorized users can register repositories' }
            };
        }

        if (!projectId || !owner || !repoName || !webhookSecret) {
            return {
                Err: { InvalidInput: 'Missing required fields' }
            };
        }

        const repositoryId = this.generateRepositoryId(provider, owner, repoName);
        
        const existingRepo = this.repositories.get(repositoryId);
        if (existingRepo !== null) {
            return {
                Err: { AlreadyExists: 'Repository already registered' }
            };
        }

        const now = time();
        const config: RepositoryConfig = {
            id: repositoryId,
            provider,
            owner,
            name: repoName,
            webhook_secret: webhookSecret,
            project_id: projectId,
            auto_build_on_push: autoBuildOnPush,
            auto_build_on_tag: autoBuildOnTag,
            build_branches: buildBranches,
            created_at: now,
            updated_at: now,
            created_by: caller
        };

        this.repositories.insert(repositoryId, config);

        return { Ok: repositoryId };
    }

    /**
     * Update repository configuration
     */
    @update([IDL.Text, IDL.Bool, IDL.Bool, IDL.Vec(IDL.Text)])
    async updateRepository(
        repositoryId: string,
        autoBuildOnPush: boolean,
        autoBuildOnTag: boolean,
        buildBranches: string[]
    ): Promise<RepositoryResult> {
        const caller = msgCaller();
        
        const repo = this.repositories.get(repositoryId);
        if (repo === null || repo === undefined) {
            return {
                Err: { NotFound: 'Repository not found' }
            };
        }
        
        // Only admin or repository creator can update
        if (caller.toText() !== this.adminPrincipal.toText() && caller.toText() !== repo.created_by.toText()) {
            return {
                Err: { Unauthorized: 'Not authorized to update this repository' }
            };
        }

        const updatedRepo: RepositoryConfig = {
            id: repo.id,
            provider: repo.provider,
            owner: repo.owner,
            name: repo.name,
            webhook_secret: repo.webhook_secret,
            project_id: repo.project_id,
            auto_build_on_push: autoBuildOnPush,
            auto_build_on_tag: autoBuildOnTag,
            build_branches: buildBranches,
            created_at: repo.created_at,
            updated_at: time(),
            created_by: repo.created_by
        };

        this.repositories.insert(repositoryId, updatedRepo);

        return { Ok: repositoryId };
    }

    /**
     * Get repository configuration
     */
    @query([IDL.Text])
    getRepository(repositoryId: string): RepositoryConfig | null {
        const repo = this.repositories.get(repositoryId);
        return repo === undefined ? null : repo;
    }

    /**
     * List all repositories for a project
     */
    @query([IDL.Text])
    listRepositoriesByProject(projectId: string): RepositoryConfig[] {
        const repositories: RepositoryConfig[] = [];
        
        for (let i = 0; i < this.repositories.len(); i++) {
            const items = this.repositories.items(i, 1);
            if (items.length > 0) {
                const [_, repo] = items[0];
                if (repo.project_id === projectId) {
                    repositories.push(repo);
                }
            }
        }
        
        return repositories;
    }

    // ============================================================================
    // WEBHOOK HANDLERS (Simplified without crypto verification)
    // ============================================================================

    /**
     * Handle webhook event (simplified version for inter-canister communication)
     */
    @update([IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)])
    async handleWebhookEvent(
        repositoryId: string,
        eventType: string,
        commitSha: string,
        branch: string,
        commitMessage: string | null
    ): Promise<WebhookResult> {
        try {
            const repo = this.repositories.get(repositoryId);
            
            if (repo === null || repo === undefined) {
                return {
                    Err: { RepositoryNotFound: `Repository ${repositoryId} not configured` }
                };
            }

            // Check if event should trigger a build
            const shouldBuild = this.shouldTriggerBuild(repo, eventType, branch);
            
            if (!shouldBuild) {
                return {
                    Err: { UnsupportedEvent: 'Event type not configured for building' }
                };
            }

            // Create build trigger
            const buildTrigger = this.createBuildTrigger(repo, eventType, commitSha, branch, commitMessage);
            this.buildTriggers.insert(buildTrigger.id, buildTrigger);
            
            // Trigger verification if configured
            if (this.verificationCanisterPrincipal && 
                (repo.auto_build_on_push || repo.auto_build_on_tag)) {
                await this.triggerVerification(buildTrigger);
            }
            
            return { Ok: buildTrigger };
            
        } catch (error) {
            return {
                Err: { ProcessingError: `Failed to process webhook: ${error}` }
            };
        }
    }

    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================

    private generateRepositoryId(provider: SCMProvider, owner: string, name: string): string {
        const providerStr = 'GitHub' in provider ? 'github' : 'gitlab';
        return `${providerStr}:${owner}/${name}`.toLowerCase();
    }

    private shouldTriggerBuild(repo: RepositoryConfig, eventType: string, branch: string): boolean {
        // Check auto-build settings
        if (eventType === 'push' && !repo.auto_build_on_push) {
            return false;
        }
        
        if ((eventType === 'tag' || eventType === 'release') && !repo.auto_build_on_tag) {
            return false;
        }
        
        // Check branch filters
        if (repo.build_branches.length > 0 && !repo.build_branches.includes(branch)) {
            return false;
        }
        
        return true;
    }

    private createBuildTrigger(
        repo: RepositoryConfig,
        eventType: string,
        commitSha: string,
        branch: string,
        commitMessage: string | null
    ): BuildTrigger {
        const triggerId = this.generateTriggerId();
        
        let triggerType: WebhookEventType;
        if (eventType === 'push') {
            triggerType = { Push: null };
        } else if (eventType === 'tag') {
            triggerType = { Tag: null };
        } else if (eventType === 'release') {
            triggerType = { Release: null };
        } else {
            triggerType = { Push: null }; // default
        }
        
        return {
            id: triggerId,
            project_id: repo.project_id,
            repository_id: repo.id,
            trigger_type: triggerType,
            branch: branch,
            commit_sha: commitSha,
            commit_message: commitMessage,
            author_name: null,
            author_email: null,
            triggered_at: time(),
            verification_id: null
        };
    }

    private async triggerVerification(buildTrigger: BuildTrigger): Promise<void> {
        if (!this.verificationCanisterPrincipal) {
            return;
        }

        try {
            // Call verification canister to start build verification
            await call(this.verificationCanisterPrincipal, 'requestVerification', {
                paramIdlTypes: [IDL.Text, IDL.Text],
                returnIdlType: IDL.Text,
                args: [buildTrigger.project_id, buildTrigger.commit_sha]
            });
        } catch (error) {
            console.log(`Failed to trigger verification: ${error}`);
        }
    }

    private generateTriggerId(): string {
        const timestamp = time();
        const random = Math.floor(Math.random() * 1000000);
        return `trigger_${timestamp}_${random}`;
    }

    // ============================================================================
    // CONFIGURATION METHODS
    // ============================================================================

    /**
     * Set verification canister principal
     */
    @update([IDL.Principal])
    setVerificationCanister(principal: Principal): boolean {
        const caller = msgCaller();
        
        if (caller.toText() !== this.adminPrincipal.toText()) {
            trap('Only admin can set verification canister');
        }
        
        this.verificationCanisterPrincipal = principal;
        return true;
    }

    /**
     * Get build triggers for a project
     */
    @query([IDL.Text])
    getBuildTriggers(projectId: string): BuildTrigger[] {
        const triggers: BuildTrigger[] = [];
        
        for (let i = 0; i < this.buildTriggers.len(); i++) {
            const items = this.buildTriggers.items(i, 1);
            if (items.length > 0) {
                const [_, trigger] = items[0];
                if (trigger.project_id === projectId) {
                    triggers.push(trigger);
                }
            }
        }
        
        return triggers.sort((a, b) => Number(b.triggered_at - a.triggered_at));
    }

    /**
     * Get build trigger by ID
     */
    @query([IDL.Text])
    getBuildTrigger(triggerId: string): BuildTrigger | null {
        const trigger = this.buildTriggers.get(triggerId);
        return trigger === undefined ? null : trigger;
    }
}
