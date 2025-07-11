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
    trap
} from 'azle';

// ============================================================================
// PIPELINE CONFIGURATION TYPES
// ============================================================================

const TriggerType = IDL.Variant({
    Push: IDL.Record({ branches: IDL.Vec(IDL.Text) }),
    PullRequest: IDL.Record({ target_branches: IDL.Vec(IDL.Text) }),
    Release: IDL.Record({ tag_pattern: IDL.Opt(IDL.Text) }),
    Manual: IDL.Null,
    Schedule: IDL.Record({ cron_expression: IDL.Text })
});

type TriggerType = 
    | { Push: { branches: string[] } }
    | { PullRequest: { target_branches: string[] } }
    | { Release: { tag_pattern: string | null } }
    | { Manual: null }
    | { Schedule: { cron_expression: string } };

const PipelineStage = IDL.Record({
    name: IDL.Text,
    runtime: IDL.Text,                    // "motoko", "rust", "azle", "assets"
    commands: IDL.Vec(IDL.Text),
    depends_on: IDL.Vec(IDL.Text),        // Stage dependencies
    timeout_minutes: IDL.Nat64,
    retry_count: IDL.Nat8,
    parallel_group: IDL.Opt(IDL.Text),    // For parallel execution
    environment: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)), // Environment variables
    artifacts: IDL.Vec(IDL.Text),         // Output artifacts
    cache_paths: IDL.Vec(IDL.Text),       // Paths to cache between runs
    resource_requirements: IDL.Record({
        memory_mb: IDL.Nat32,
        cpu_cores: IDL.Nat8,
        storage_mb: IDL.Nat32,
        max_cycles: IDL.Nat64
    })
});

type PipelineStage = {
    name: string;
    runtime: string;
    commands: string[];
    depends_on: string[];
    timeout_minutes: bigint;
    retry_count: number;
    parallel_group: string | null;
    environment: [string, string][];
    artifacts: string[];
    cache_paths: string[];
    resource_requirements: {
        memory_mb: number;
        cpu_cores: number;
        storage_mb: number;
        max_cycles: bigint;
    };
};

const NetworkConfig = IDL.Record({
    name: IDL.Text,
    provider_url: IDL.Text,
    is_mainnet: IDL.Bool,
    default_gas_price: IDL.Opt(IDL.Nat64)
});

type NetworkConfig = {
    name: string;
    provider_url: string;
    is_mainnet: boolean;
    default_gas_price: bigint | null;
};

const NotificationConfig = IDL.Record({
    email_recipients: IDL.Vec(IDL.Text),
    slack_webhook: IDL.Opt(IDL.Text),
    discord_webhook: IDL.Opt(IDL.Text),
    notify_on_success: IDL.Bool,
    notify_on_failure: IDL.Bool,
    notify_on_start: IDL.Bool
});

type NotificationConfig = {
    email_recipients: string[];
    slack_webhook: string | null;
    discord_webhook: string | null;
    notify_on_success: boolean;
    notify_on_failure: boolean;
    notify_on_start: boolean;
};

const PipelineConfig = IDL.Record({
    repository_id: IDL.Text,
    repository_url: IDL.Text,
    owner: IDL.Principal,
    name: IDL.Text,
    description: IDL.Opt(IDL.Text),
    triggers: IDL.Vec(TriggerType),
    stages: IDL.Vec(PipelineStage),
    global_environment: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    networks: IDL.Vec(NetworkConfig),
    notifications: NotificationConfig,
    is_active: IDL.Bool,
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
    version: IDL.Nat32
});

type PipelineConfig = {
    repository_id: string;
    repository_url: string;
    owner: Principal;
    name: string;
    description: string | null;
    triggers: TriggerType[];
    stages: PipelineStage[];
    global_environment: [string, string][];
    networks: NetworkConfig[];
    notifications: NotificationConfig;
    is_active: boolean;
    created_at: bigint;
    updated_at: bigint;
    version: number;
};

const PipelineError = IDL.Variant({
    NotFound: IDL.Text,
    Unauthorized: IDL.Text,
    InvalidInput: IDL.Text,
    AlreadyExists: IDL.Text,
    InternalError: IDL.Text
});

type PipelineError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { AlreadyExists: string }
    | { InternalError: string };

const PipelineResult = IDL.Variant({
    Ok: PipelineConfig,
    Err: PipelineError
});

type PipelineResult = 
    | { Ok: PipelineConfig }
    | { Err: PipelineError };

const PipelineListResult = IDL.Variant({
    Ok: IDL.Vec(PipelineConfig),
    Err: PipelineError
});

type PipelineListResult = 
    | { Ok: PipelineConfig[] }
    | { Err: PipelineError };

// ============================================================================
// PIPELINE CONFIGURATION CANISTER
// ============================================================================

export default class PipelineConfigCanister {
    // Stable storage for pipeline configurations
    private pipelines = new StableBTreeMap<string, PipelineConfig>(0);
    
    // Index by owner for efficient queries
    private ownerIndex = new StableBTreeMap<string, string[]>(1);
    
    // Template storage for reusable pipeline templates
    private templates = new StableBTreeMap<string, PipelineConfig>(2);
    
    // Admin principals who can manage global templates
    private adminPrincipals: Principal[] = [Principal.fromText('2vxsx-fae')];

    // ============================================================================
    // LIFECYCLE HOOKS
    // ============================================================================

    @init([])
    init(): void {
        console.log('Pipeline Configuration Canister initialized');
        
        // Initialize with default templates
        this.initializeDefaultTemplates();
    }

    @postUpgrade([])
    postUpgrade(): void {
        console.log('Pipeline Configuration Canister upgraded');
    }

    // ============================================================================
    // PIPELINE MANAGEMENT
    // ============================================================================

    /**
     * Register a new pipeline configuration
     */
    @update([IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)])
    registerPipeline(
        repositoryId: string,
        repositoryUrl: string,
        name: string,
        description: string | null
    ): PipelineResult {
        const caller = msgCaller();
        
        // Check if pipeline already exists
        const existingPipeline = this.pipelines.get(repositoryId);
        if (existingPipeline !== null) {
            return {
                Err: { AlreadyExists: `Pipeline for repository ${repositoryId} already exists` }
            };
        }

        const now = time();
        const pipeline: PipelineConfig = {
            repository_id: repositoryId,
            repository_url: repositoryUrl,
            owner: caller,
            name: name,
            description: description,
            triggers: [
                { Push: { branches: ['main', 'master'] } } // Default trigger
            ],
            stages: [
                // Default build stage
                {
                    name: 'build',
                    runtime: 'motoko',
                    commands: ['dfx build'],
                    depends_on: [],
                    timeout_minutes: 10n,
                    retry_count: 2,
                    parallel_group: null,
                    environment: [],
                    artifacts: ['*.wasm'],
                    cache_paths: ['.dfx'],
                    resource_requirements: {
                        memory_mb: 512,
                        cpu_cores: 1,
                        storage_mb: 100,
                        max_cycles: 1000000000n
                    }
                }
            ],
            global_environment: [],
            networks: [
                {
                    name: 'local',
                    provider_url: 'http://127.0.0.1:4943',
                    is_mainnet: false,
                    default_gas_price: null
                },
                {
                    name: 'ic',
                    provider_url: 'https://ic0.app',
                    is_mainnet: true,
                    default_gas_price: null
                }
            ],
            notifications: {
                email_recipients: [],
                slack_webhook: null,
                discord_webhook: null,
                notify_on_success: true,
                notify_on_failure: true,
                notify_on_start: false
            },
            is_active: true,
            created_at: now,
            updated_at: now,
            version: 1
        };

        // Store pipeline
        this.pipelines.insert(repositoryId, pipeline);
        
        // Update owner index
        this.updateOwnerIndex(caller.toText(), repositoryId);

        return { Ok: pipeline };
    }

    /**
     * Get pipeline configuration
     */
    @query([IDL.Text])
    getPipelineConfig(repositoryId: string): PipelineResult {
        const pipeline = this.pipelines.get(repositoryId);
        
        if (!pipeline) {
            return {
                Err: { NotFound: `Pipeline for repository ${repositoryId} not found` }
            };
        }

        return { Ok: pipeline };
    }

    /**
     * Update pipeline configuration
     */
    @update([IDL.Text, PipelineConfig])
    updatePipelineConfig(repositoryId: string, config: PipelineConfig): PipelineResult {
        const caller = msgCaller();
        
        const existingPipeline = this.pipelines.get(repositoryId);
        if (!existingPipeline) {
            return {
                Err: { NotFound: `Pipeline for repository ${repositoryId} not found` }
            };
        }

        // Check ownership
        if (existingPipeline.owner.toText() !== caller.toText() && !this.isAdmin(caller)) {
            return {
                Err: { Unauthorized: 'Only pipeline owner or admin can update configuration' }
            };
        }

        // Update timestamp and version
        const updatedConfig: PipelineConfig = {
            ...config,
            repository_id: repositoryId,
            owner: existingPipeline.owner,
            updated_at: time(),
            version: existingPipeline.version + 1
        };

        this.pipelines.insert(repositoryId, updatedConfig);

        return { Ok: updatedConfig };
    }

    /**
     * Add pipeline stage
     */
    @update([IDL.Text, PipelineStage])
    addPipelineStage(repositoryId: string, stage: PipelineStage): PipelineResult {
        const caller = msgCaller();
        
        const pipeline = this.pipelines.get(repositoryId);
        if (!pipeline) {
            return {
                Err: { NotFound: `Pipeline for repository ${repositoryId} not found` }
            };
        }

        // Check ownership
        if (pipeline.owner.toText() !== caller.toText() && !this.isAdmin(caller)) {
            return {
                Err: { Unauthorized: 'Only pipeline owner or admin can add stages' }
            };
        }

        // Check for duplicate stage names
        const existingStage = pipeline.stages.find(s => s.name === stage.name);
        if (existingStage) {
            return {
                Err: { AlreadyExists: `Stage '${stage.name}' already exists` }
            };
        }

        // Add stage
        const updatedPipeline: PipelineConfig = {
            ...pipeline,
            stages: [...pipeline.stages, stage],
            updated_at: time(),
            version: pipeline.version + 1
        };

        this.pipelines.insert(repositoryId, updatedPipeline);

        return { Ok: updatedPipeline };
    }

    /**
     * Update pipeline triggers
     */
    @update([IDL.Text, IDL.Vec(TriggerType)])
    updatePipelineTriggers(repositoryId: string, triggers: TriggerType[]): PipelineResult {
        const caller = msgCaller();
        
        const pipeline = this.pipelines.get(repositoryId);
        if (!pipeline) {
            return {
                Err: { NotFound: `Pipeline for repository ${repositoryId} not found` }
            };
        }

        // Check ownership
        if (pipeline.owner.toText() !== caller.toText() && !this.isAdmin(caller)) {
            return {
                Err: { Unauthorized: 'Only pipeline owner or admin can update triggers' }
            };
        }

        const updatedPipeline: PipelineConfig = {
            ...pipeline,
            triggers: triggers,
            updated_at: time(),
            version: pipeline.version + 1
        };

        this.pipelines.insert(repositoryId, updatedPipeline);

        return { Ok: updatedPipeline };
    }

    /**
     * Set pipeline environment variables
     */
    @update([IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))])
    setPipelineEnvironment(repositoryId: string, environment: [string, string][]): PipelineResult {
        const caller = msgCaller();
        
        const pipeline = this.pipelines.get(repositoryId);
        if (!pipeline) {
            return {
                Err: { NotFound: `Pipeline for repository ${repositoryId} not found` }
            };
        }

        // Check ownership
        if (pipeline.owner.toText() !== caller.toText() && !this.isAdmin(caller)) {
            return {
                Err: { Unauthorized: 'Only pipeline owner or admin can set environment variables' }
            };
        }

        const updatedPipeline: PipelineConfig = {
            ...pipeline,
            global_environment: environment,
            updated_at: time(),
            version: pipeline.version + 1
        };

        this.pipelines.insert(repositoryId, updatedPipeline);

        return { Ok: updatedPipeline };
    }

    /**
     * List pipelines owned by caller
     */
    @query([])
    listMyPipelines(): PipelineListResult {
        const caller = msgCaller();
        const ownerPipelines = this.ownerIndex.get(caller.toText()) || [];
        
        const pipelines: PipelineConfig[] = [];
        for (const repoId of ownerPipelines) {
            const pipeline = this.pipelines.get(repoId);
            if (pipeline) {
                pipelines.push(pipeline);
            }
        }

        return { Ok: pipelines };
    }

    /**
     * List all pipelines (admin only)
     */
    @query([])
    listAllPipelines(): PipelineListResult {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            return {
                Err: { Unauthorized: 'Only admin can list all pipelines' }
            };
        }

        const allPipelines = this.pipelines.values();
        return { Ok: allPipelines };
    }

    /**
     * Delete pipeline
     */
    @update([IDL.Text])
    deletePipeline(repositoryId: string): boolean {
        const caller = msgCaller();
        
        const pipeline = this.pipelines.get(repositoryId);
        if (!pipeline) {
            return false;
        }

        // Check ownership
        if (pipeline.owner.toText() !== caller.toText() && !this.isAdmin(caller)) {
            trap('Only pipeline owner or admin can delete pipeline');
        }

        // Remove from storage
        this.pipelines.delete(repositoryId);
        
        // Update owner index
        this.removeFromOwnerIndex(pipeline.owner.toText(), repositoryId);

        return true;
    }

    // ============================================================================
    // TEMPLATE MANAGEMENT
    // ============================================================================

    /**
     * Create pipeline from template
     */
    @update([IDL.Text, IDL.Text, IDL.Text, IDL.Text])
    createFromTemplate(
        templateName: string,
        repositoryId: string,
        repositoryUrl: string,
        pipelineName: string
    ): PipelineResult {
        const template = this.templates.get(templateName);
        if (!template) {
            return {
                Err: { NotFound: `Template '${templateName}' not found` }
            };
        }

        const caller = msgCaller();
        const now = time();

        const pipeline: PipelineConfig = {
            ...template,
            repository_id: repositoryId,
            repository_url: repositoryUrl,
            owner: caller,
            name: pipelineName,
            created_at: now,
            updated_at: now,
            version: 1
        };

        // Check if pipeline already exists
        const existingPipeline = this.pipelines.get(repositoryId);
        if (existingPipeline !== null) {
            return {
                Err: { AlreadyExists: `Pipeline for repository ${repositoryId} already exists` }
            };
        }

        this.pipelines.insert(repositoryId, pipeline);
        this.updateOwnerIndex(caller.toText(), repositoryId);

        return { Ok: pipeline };
    }

    /**
     * List available templates
     */
    @query([])
    listTemplates(): Array<[string, PipelineConfig]> {
        return this.templates.items();
    }

    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================

    private updateOwnerIndex(owner: string, repositoryId: string): void {
        const existingRepos = this.ownerIndex.get(owner) || [];
        if (!existingRepos.includes(repositoryId)) {
            existingRepos.push(repositoryId);
            this.ownerIndex.insert(owner, existingRepos);
        }
    }

    private removeFromOwnerIndex(owner: string, repositoryId: string): void {
        const existingRepos = this.ownerIndex.get(owner) || [];
        const updatedRepos = existingRepos.filter(repo => repo !== repositoryId);
        this.ownerIndex.insert(owner, updatedRepos);
    }

    private isAdmin(principal: Principal): boolean {
        return this.adminPrincipals.some(admin => admin.toText() === principal.toText());
    }

    private initializeDefaultTemplates(): void {
        // Motoko Project Template
        const motokoTemplate: PipelineConfig = {
            repository_id: 'template-motoko',
            repository_url: '',
            owner: this.adminPrincipals[0],
            name: 'Motoko Project Template',
            description: 'Standard template for Motoko canister projects',
            triggers: [
                { Push: { branches: ['main', 'master'] } },
                { PullRequest: { target_branches: ['main', 'master'] } }
            ],
            stages: [
                {
                    name: 'build',
                    runtime: 'motoko',
                    commands: ['dfx build'],
                    depends_on: [],
                    timeout_minutes: 15n,
                    retry_count: 2,
                    parallel_group: null,
                    environment: [],
                    artifacts: ['*.wasm', '.dfx/local/canisters/**/*.wasm'],
                    cache_paths: ['.dfx'],
                    resource_requirements: {
                        memory_mb: 1024,
                        cpu_cores: 2,
                        storage_mb: 200,
                        max_cycles: 2000000000n
                    }
                },
                {
                    name: 'test',
                    runtime: 'motoko',
                    commands: ['dfx test'],
                    depends_on: ['build'],
                    timeout_minutes: 10n,
                    retry_count: 1,
                    parallel_group: null,
                    environment: [],
                    artifacts: ['test-results.xml'],
                    cache_paths: [],
                    resource_requirements: {
                        memory_mb: 512,
                        cpu_cores: 1,
                        storage_mb: 100,
                        max_cycles: 1000000000n
                    }
                },
                {
                    name: 'deploy',
                    runtime: 'motoko',
                    commands: ['dfx deploy --network ic'],
                    depends_on: ['test'],
                    timeout_minutes: 20n,
                    retry_count: 3,
                    parallel_group: null,
                    environment: [['DFX_NETWORK', 'ic']],
                    artifacts: [],
                    cache_paths: [],
                    resource_requirements: {
                        memory_mb: 512,
                        cpu_cores: 1,
                        storage_mb: 50,
                        max_cycles: 3000000000n
                    }
                }
            ],
            global_environment: [
                ['NODE_ENV', 'production'],
                ['DFX_VERSION', '0.15.0']
            ],
            networks: [
                {
                    name: 'local',
                    provider_url: 'http://127.0.0.1:4943',
                    is_mainnet: false,
                    default_gas_price: null
                },
                {
                    name: 'ic',
                    provider_url: 'https://ic0.app',
                    is_mainnet: true,
                    default_gas_price: null
                }
            ],
            notifications: {
                email_recipients: [],
                slack_webhook: null,
                discord_webhook: null,
                notify_on_success: true,
                notify_on_failure: true,
                notify_on_start: false
            },
            is_active: true,
            created_at: time(),
            updated_at: time(),
            version: 1
        };

        this.templates.insert('motoko-standard', motokoTemplate);

        // Add more templates for Rust, Azle, etc.
        // ... (similar template definitions)
    }
}
