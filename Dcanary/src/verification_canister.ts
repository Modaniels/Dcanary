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
    call,
    setTimer,
    setTimerInterval,
    clearTimer
} from 'azle';

// ============================================================================
// MULTI-STAGE PIPELINE TYPES (Phase 1 Enhancement)
// ============================================================================

/**
 * Pipeline stage definition
 */
const PipelineStage = IDL.Record({
    name: IDL.Text,
    steps: IDL.Vec(IDL.Record({
        step_type: IDL.Text,
        configuration: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
        timeout_seconds: IDL.Nat64
    })),
    parallel_group: IDL.Opt(IDL.Text),
    when_condition: IDL.Opt(IDL.Text),
    timeout_minutes: IDL.Nat64,
    retry_count: IDL.Nat8,
    post_actions: IDL.Vec(IDL.Text)
});

type PipelineStage = {
    name: string;
    steps: BuildStep[];
    parallel_group: string | null;
    when_condition: string | null;
    timeout_minutes: bigint;
    retry_count: number;
    post_actions: string[];
};

/**
 * Build step definition
 */
type BuildStep = {
    step_type: string;
    configuration: Map<string, string>;
    timeout_seconds: bigint;
};

/**
 * Pipeline template for reusable pipeline definitions
 */
const PipelineTemplate = IDL.Record({
    template_id: IDL.Text,
    name: IDL.Text,
    description: IDL.Text,
    parameters: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Record({
        name: IDL.Text,
        param_type: IDL.Text,
        default_value: IDL.Opt(IDL.Text),
        description: IDL.Text,
        required: IDL.Bool
    }))),
    stages: IDL.Vec(PipelineStage),
    default_values: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
    required_capabilities: IDL.Vec(IDL.Text)
});

type PipelineTemplate = {
    template_id: string;
    name: string;
    description: string;
    parameters: Map<string, ParameterDefinition>;
    stages: PipelineStage[];
    default_values: Map<string, string>;
    required_capabilities: string[];
};

type ParameterDefinition = {
    name: string;
    param_type: string;
    default_value: string | null;
    description: string;
    required: boolean;
};

/**
 * Pipeline instance for execution
 */
type PipelineInstance = {
    instance_id: string;
    template_id: string;
    project_id: string;
    parameters: Map<string, string>;
    status: PipelineStatus;
    current_stage: number;
    started_at: bigint;
    completed_at: bigint | null;
    stages: PipelineStage[];
    stage_results: Map<string, StageResult>;
    error: string | null;
};

/**
 * Pipeline execution status
 */
type PipelineStatus = 
    | { Running: null }
    | { Completed: null }
    | { Failed: null }
    | { Cancelled: null };

/**
 * Stage execution result
 */
type StageResult = {
    stage_name: string;
    status: StageStatus;
    started_at: bigint;
    completed_at: bigint | null;
    step_results: Map<string, StepResult>;
    error: string | null;
    retry_count: number;
};

type StageStatus = 
    | { Running: null }
    | { Completed: null }
    | { Failed: null }
    | { Skipped: null };

type StepResult = {
    step_type: string;
    status: StageStatus;
    started_at: bigint;
    completed_at: bigint | null;
    output: string;
    error: string | null;
    executor_id: Principal | null;
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Verification status enum
 */
const VerificationStatus = IDL.Variant({
    Pending: IDL.Null,
    Verified: IDL.Null,
    Failed: IDL.Null
});

type VerificationStatus = 
    | { Pending: null }
    | { Verified: null }
    | { Failed: null };

/**
 * Result from a single build executor
 */
const ExecutorResult = IDL.Record({
    executor_id: IDL.Principal,
    hash: IDL.Opt(IDL.Text),
    error: IDL.Opt(IDL.Text),
    completed: IDL.Bool,
    execution_time: IDL.Opt(IDL.Nat64)
});

type ExecutorResult = {
    executor_id: Principal;
    hash: string | null;
    error: string | null;
    completed: boolean;
    execution_time: bigint | null;
};

/**
 * Final verification result
 */
const VerificationResult = IDL.Record({
    status: VerificationStatus,
    verified_hash: IDL.Opt(IDL.Text),
    error: IDL.Opt(IDL.Text),
    executor_results: IDL.Vec(ExecutorResult),
    consensus_threshold: IDL.Nat8,
    total_executors: IDL.Nat8,
    matching_results: IDL.Nat8,
    created_at: IDL.Nat64,
    completed_at: IDL.Opt(IDL.Nat64)
});

type VerificationResult = {
    status: VerificationStatus;
    verified_hash: string | null;
    error: string | null;
    executor_results: ExecutorResult[];
    consensus_threshold: number;
    total_executors: number;
    matching_results: number;
    created_at: bigint;
    completed_at: bigint | null;
};

/**
 * Verification request
 */
const VerificationRequest = IDL.Record({
    project_id: IDL.Text,
    version: IDL.Text,
    requester: IDL.Principal,
    timeout_seconds: IDL.Opt(IDL.Nat64)
});

type VerificationRequest = {
    project_id: string;
    version: string;
    requester: Principal;
    timeout_seconds: bigint | null;
};

/**
 * Build instructions from build_instructions_canister
 */
const BuildInstructions = IDL.Record({
    project_id: IDL.Text,
    version: IDL.Text,
    instruction_set: IDL.Text,
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
    created_by: IDL.Principal
});

type BuildInstructions = {
    project_id: string;
    version: string;
    instruction_set: string;
    created_at: bigint;
    updated_at: bigint;
    created_by: Principal;
};

const BuildInstructionsResult = IDL.Variant({
    Ok: BuildInstructions,
    Err: IDL.Record({
        NotFound: IDL.Text,
        Unauthorized: IDL.Text,
        InvalidInput: IDL.Text,
        InternalError: IDL.Text
    })
});

type BuildInstructionsResult = 
    | { Ok: BuildInstructions }
    | { Err: any };

/**
 * Build execution result from build_executor_canister
 */
const ExecuteBuildResult = IDL.Record({
    success: IDL.Bool,
    hash: IDL.Text,
    error: IDL.Text,
    cycles_consumed: IDL.Nat64,
    build_time: IDL.Nat64,
    artifact_size: IDL.Nat32
});

type ExecuteBuildResult = {
    success: boolean;
    hash: string;
    error: string;
    cycles_consumed: bigint;
    build_time: bigint;
    artifact_size: number;
};

const BuildExecutorResult = IDL.Variant({
    Ok: ExecuteBuildResult,
    Err: IDL.Record({
        NotFound: IDL.Text,
        Unauthorized: IDL.Text,
        InvalidInput: IDL.Text,
        InternalError: IDL.Text,
        SecurityViolation: IDL.Text,
        ResourceExhausted: IDL.Text
    })
});

type BuildExecutorResult = 
    | { Ok: ExecuteBuildResult }
    | { Err: any };

/**
 * Verification error types
 */
const VerificationError = IDL.Variant({
    NotFound: IDL.Text,
    Unauthorized: IDL.Text,
    InvalidInput: IDL.Text,
    InternalError: IDL.Text,
    TimeoutError: IDL.Text,
    ConsensusFailure: IDL.Text,
    InstructionsNotFound: IDL.Text,
    ExecutorFailure: IDL.Text
});

type VerificationError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { InternalError: string }
    | { TimeoutError: string }
    | { ConsensusFailure: string }
    | { InstructionsNotFound: string }
    | { ExecutorFailure: string };

/**
 * Verification result wrapper
 */
const VerificationResultWrapper = IDL.Variant({
    Ok: VerificationResult,
    Err: VerificationError
});

type VerificationResultWrapper = 
    | { Ok: VerificationResult }
    | { Err: VerificationError };

/**
 * Internal verification state
 */
type VerificationState = {
    request: VerificationRequest;
    result: VerificationResult;
    timer_id: bigint | null;
    start_time: bigint;
    timeout_at: bigint;
};

// ============================================================================
// CANISTER STATE
// ============================================================================

export default class VerificationCanister {
    // Stable storage for verification history
    private verificationHistory = new StableBTreeMap<string, VerificationResult>(0);
    
    // Pipeline template storage (Phase 1 Enhancement)
    private pipelineTemplates = new StableBTreeMap<string, PipelineTemplate>(1);
    
    // Active pipeline instances (Phase 1 Enhancement)
    private activePipelineInstances = new Map<string, PipelineInstance>();
    
    // Active verification processes
    private activeVerifications = new Map<string, VerificationState>();
    
    // Configuration
    private buildInstructionsCanisterId: Principal = Principal.fromText('uxrrr-q7777-77774-qaaaq-cai'); // Replace with actual canister ID
    private buildExecutorCanisterIds: Principal[] = [
        Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'), // Replace with actual executor canister IDs
        Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
        Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai')
    ];
    
    // Access control
    private authorizedRequester: Principal = Principal.fromText('2vxsx-fae'); // Principal authorized to request verifications
    private adminPrincipal: Principal = Principal.fromText('2vxsx-fae'); // Admin for configuration
    
    // Configuration parameters
    private readonly DEFAULT_TIMEOUT_SECONDS = 900n; // 15 minutes
    private readonly MIN_CONSENSUS_PERCENTAGE = 51; // 51% consensus required
    private readonly POLLING_INTERVAL_SECONDS = 30; // Check executor results every 30 seconds
    
    // Canister metadata
    private canisterVersion: string = '1.0.0';
    private deployedAt: bigint = 0n;

    // ============================================================================
    // LIFECYCLE HOOKS
    // ============================================================================

    /**
     * Initialize the canister
     */
    @init([])
    init(): void {
        this.deployedAt = time();
        console.log(`Verification Canister initialized at ${this.deployedAt}`);
        console.log(`Build Instructions Canister ID: ${this.buildInstructionsCanisterId.toText()}`);
        console.log(`Build Executor Canister IDs: ${this.buildExecutorCanisterIds.map(id => id.toText()).join(', ')}`);
        console.log(`Authorized Requester: ${this.authorizedRequester.toText()}`);
        console.log(`Admin Principal: ${this.adminPrincipal.toText()}`);
    }

    /**
     * Post-upgrade hook
     */
    @postUpgrade([])
    postUpgrade(): void {
        console.log(`Verification Canister upgraded at ${time()}`);
        console.log(`Current version: ${this.canisterVersion}`);
        console.log(`Total verifications: ${this.verificationHistory.len()}`);
        
        // Clear any active timers and restart monitoring for active verifications
        this.restartActiveVerifications();
    }

    // ============================================================================
    // ACCESS CONTROL
    // ============================================================================

    /**
     * Check if caller is authorized to request verifications
     */
    private isAuthorizedRequester(caller: Principal): boolean {
        return caller.toText() === this.authorizedRequester.toText() ||
               caller.toText() === this.adminPrincipal.toText();
    }

    /**
     * Check if caller is admin
     */
    private isAdmin(caller: Principal): boolean {
        return caller.toText() === this.adminPrincipal.toText();
    }

    // ============================================================================
    // VERIFICATION ORCHESTRATION
    // ============================================================================

    /**
     * Request verification for a project version
     */
    @update([IDL.Text, IDL.Text, IDL.Opt(IDL.Nat64)], VerificationResultWrapper)
    async request_verification(
        project_id: string, 
        version: string, 
        timeout_seconds?: bigint
    ): Promise<VerificationResultWrapper> {
        const caller = msgCaller();
        
        // Check authorization
        if (!this.isAuthorizedRequester(caller)) {
            return { 
                Err: { 
                    Unauthorized: `Principal ${caller.toText()} is not authorized to request verifications` 
                } 
            };
        }

        // Validate input
        if (!project_id || !version) {
            return { 
                Err: { 
                    InvalidInput: 'Project ID and version are required' 
                } 
            };
        }

        const verification_key = `${project_id}:${version}`;
        
        // Check if verification is already in progress
        if (this.activeVerifications.has(verification_key)) {
            return { 
                Err: { 
                    InvalidInput: `Verification already in progress for ${project_id}:${version}` 
                } 
            };
        }

        try {
            // Retrieve build instructions
            const instructionsResult = await this.retrieveBuildInstructions(project_id, version);
            
            if ('Err' in instructionsResult) {
                return { 
                    Err: { 
                        InstructionsNotFound: `Build instructions not found for ${project_id}:${version}` 
                    } 
                };
            }

            const instructions = instructionsResult.Ok;
            const current_time = time();
            const timeout = timeout_seconds || this.DEFAULT_TIMEOUT_SECONDS;
            const timeout_at = current_time + (timeout * 1_000_000_000n); // Convert to nanoseconds

            // Initialize verification result
            const executor_results: ExecutorResult[] = this.buildExecutorCanisterIds.map(executor_id => ({
                executor_id,
                hash: null,
                error: null,
                completed: false,
                execution_time: null
            }));

            const verification_result: VerificationResult = {
                status: { Pending: null },
                verified_hash: null,
                error: null,
                executor_results,
                consensus_threshold: Math.ceil(this.buildExecutorCanisterIds.length * this.MIN_CONSENSUS_PERCENTAGE / 100),
                total_executors: this.buildExecutorCanisterIds.length,
                matching_results: 0,
                created_at: current_time,
                completed_at: null
            };

            const verification_request: VerificationRequest = {
                project_id,
                version,
                requester: caller,
                timeout_seconds: timeout
            };

            // Start verification process
            await this.startVerificationProcess(verification_key, verification_request, verification_result, instructions);

            return { Ok: verification_result };

        } catch (error) {
            return { 
                Err: { 
                    InternalError: `Failed to start verification: ${error}` 
                } 
            };
        }
    }

    /**
     * Get verification status
     */
    @query([IDL.Text, IDL.Text], VerificationResultWrapper)
    get_verification_status(project_id: string, version: string): VerificationResultWrapper {
        const verification_key = `${project_id}:${version}`;
        
        // Check active verifications first
        const activeVerification = this.activeVerifications.get(verification_key);
        if (activeVerification) {
            return { Ok: activeVerification.result };
        }

        // Check completed verifications
        const historicalResult = this.verificationHistory.get(verification_key);
        if (historicalResult) {
            return { Ok: historicalResult };
        }

        return { 
            Err: { 
                NotFound: `No verification found for ${project_id}:${version}` 
            } 
        };
    }

    /**
     * Start the verification process by triggering builds on all executors
     */
    private async startVerificationProcess(
        verification_key: string,
        request: VerificationRequest,
        result: VerificationResult,
        instructions: BuildInstructions
    ): Promise<void> {
        const current_time = time();
        const timeout_at = current_time + (request.timeout_seconds || this.DEFAULT_TIMEOUT_SECONDS) * 1_000_000_000n;

        // Create verification state
        const verification_state: VerificationState = {
            request,
            result,
            timer_id: null,
            start_time: current_time,
            timeout_at
        };

        // Store active verification
        this.activeVerifications.set(verification_key, verification_state);

        // Trigger builds on all executors asynchronously
        const build_promises = this.buildExecutorCanisterIds.map(async (executor_id, index) => {
            try {
                await call(
                    executor_id,
                    'execute_build',
                    {
                        paramIdlTypes: [IDL.Text, IDL.Text],
                        returnIdlType: BuildExecutorResult,
                        args: [request.project_id, request.version]
                    }
                );
                console.log(`Build triggered on executor ${executor_id.toText()}`);
            } catch (error) {
                console.log(`Failed to trigger build on executor ${executor_id.toText()}: ${error}`);
                // Mark this executor as failed
                verification_state.result.executor_results[index].error = `Failed to trigger build: ${error}`;
                verification_state.result.executor_results[index].completed = true;
            }
        });

        // Wait for all build triggers to complete
        await Promise.allSettled(build_promises);

        // Start polling timer to check results
        const timer_id = setTimerInterval(this.POLLING_INTERVAL_SECONDS, () => this.pollExecutorResults(verification_key));
        verification_state.timer_id = timer_id;
    }

    /**
     * Poll executor results periodically
     */
    private async pollExecutorResults(verification_key: string): Promise<void> {
        const verification_state = this.activeVerifications.get(verification_key);
        if (!verification_state) {
            return;
        }

        const current_time = time();
        
        // Check for timeout
        if (current_time >= verification_state.timeout_at) {
            await this.handleVerificationTimeout(verification_key);
            return;
        }

        let all_completed = true;
        let updated = false;

        // Check each executor
        for (let i = 0; i < this.buildExecutorCanisterIds.length; i++) {
            const executor_id = this.buildExecutorCanisterIds[i];
            const executor_result = verification_state.result.executor_results[i];

            if (executor_result.completed) {
                continue;
            }

            try {
                // Get build result from executor
                const result = await call(
                    executor_id,
                    'get_build_result',
                    {
                        paramIdlTypes: [IDL.Text, IDL.Text],
                        returnIdlType: BuildExecutorResult,
                        args: [verification_state.request.project_id, verification_state.request.version]
                    }
                );

                if ('Ok' in result) {
                    const build_result = result.Ok;
                    executor_result.completed = true;
                    executor_result.execution_time = build_result.build_time;
                    
                    if (build_result.success) {
                        executor_result.hash = build_result.hash;
                        executor_result.error = null;
                    } else {
                        executor_result.error = build_result.error;
                        executor_result.hash = null;
                    }
                    updated = true;
                } else {
                    // Build still in progress or failed
                    all_completed = false;
                }

            } catch (error) {
                // Handle executor call failure
                executor_result.completed = true;
                executor_result.error = `Executor call failed: ${error}`;
                executor_result.hash = null;
                updated = true;
            }
        }

        // Update active state if changes occurred
        if (updated) {
            this.activeVerifications.set(verification_key, verification_state);
        }

        if (all_completed) {
            // Clear the polling timer before finalizing
            if (verification_state.timer_id) {
                clearTimer(verification_state.timer_id);
                verification_state.timer_id = null;
            }
            await this.finalizeVerification(verification_key);
        }
        // For setTimerInterval, no need to reschedule manually
    }

    /**
     * Finalize verification with consensus logic
     */
    private async finalizeVerification(verification_key: string): Promise<void> {
        const verification_state = this.activeVerifications.get(verification_key);
        if (!verification_state) {
            return;
        }

        // Clear timer
        if (verification_state.timer_id) {
            clearTimer(verification_state.timer_id);
        }

        const result = verification_state.result;
        const successful_hashes = result.executor_results
            .filter(er => er.completed && er.hash && !er.error)
            .map(er => er.hash as string);

        // Count hash occurrences for consensus
        const hash_counts = new Map<string, number>();
        successful_hashes.forEach(hash => {
            hash_counts.set(hash, (hash_counts.get(hash) || 0) + 1);
        });

        let verified_hash: string | null = null;
        let max_count = 0;

        // Find the most common hash
        for (const [hash, count] of hash_counts.entries()) {
            if (count > max_count) {
                max_count = count;
                verified_hash = hash;
            }
        }

        result.matching_results = max_count;
        result.completed_at = time();

        // Apply consensus logic
        if (max_count >= result.consensus_threshold) {
            result.status = { Verified: null };
            result.verified_hash = verified_hash;
            result.error = null;
        } else {
            result.status = { Failed: null };
            result.verified_hash = null;
            result.error = `Consensus failure: Only ${max_count} out of ${result.total_executors} executors agreed (threshold: ${result.consensus_threshold})`;
        }

        // Move to historical storage
        this.verificationHistory.insert(verification_key, result);
        this.activeVerifications.delete(verification_key);

        console.log(`Verification completed for ${verification_key}: ${result.status}`);
    }

    /**
     * Handle verification timeout
     */
    private async handleVerificationTimeout(verification_key: string): Promise<void> {
        const verification_state = this.activeVerifications.get(verification_key);
        if (!verification_state) {
            return;
        }

        // Clear timer
        if (verification_state.timer_id) {
            clearTimer(verification_state.timer_id);
        }

        const result = verification_state.result;
        result.status = { Failed: null };
        result.error = 'Verification timed out';
        result.completed_at = time();

        // Move to historical storage
        this.verificationHistory.insert(verification_key, result);
        this.activeVerifications.delete(verification_key);

        console.log(`Verification timed out for ${verification_key}`);
    }

    /**
     * Retrieve build instructions from build_instructions_canister
     */
    private async retrieveBuildInstructions(project_id: string, version: string): Promise<BuildInstructionsResult> {
        try {
            const result = await call(
                this.buildInstructionsCanisterId,
                'get_build_instructions',
                {
                    paramIdlTypes: [IDL.Text, IDL.Text],
                    returnIdlType: BuildInstructionsResult,
                    args: [project_id, version]
                }
            );
            
            return result;
        } catch (error) {
            return { 
                Err: { 
                    InternalError: `Failed to retrieve build instructions: ${error}` 
                } 
            };
        }
    }

    /**
     * Restart active verifications after upgrade
     */
    private restartActiveVerifications(): void {
        for (const [verification_key, verification_state] of this.activeVerifications.entries()) {
            // Clear old timer
            if (verification_state.timer_id) {
                clearTimer(verification_state.timer_id);
            }
            
            // Check if not timed out
            const current_time = time();
            if (current_time < verification_state.timeout_at) {
                // Restart polling
                const timer_id = setTimerInterval(this.POLLING_INTERVAL_SECONDS, () => this.pollExecutorResults(verification_key));
                verification_state.timer_id = timer_id;
                this.activeVerifications.set(verification_key, verification_state);
            } else {
                // Mark as timed out
                this.handleVerificationTimeout(verification_key);
            }
        }
    }

    // ============================================================================
    // CONFIGURATION MANAGEMENT
    // ============================================================================

    /**
     * Update authorized requester (admin only)
     */
    @update([IDL.Principal], IDL.Bool)
    update_authorized_requester(new_requester: Principal): boolean {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            return false;
        }

        this.authorizedRequester = new_requester;
        console.log(`Authorized requester updated to: ${new_requester.toText()}`);
        return true;
    }

    /**
     * Update build executor canister IDs (admin only)
     */
    @update([IDL.Vec(IDL.Principal)], IDL.Bool)
    update_build_executor_canisters(executor_ids: Principal[]): boolean {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            return false;
        }

        if (executor_ids.length === 0) {
            return false;
        }

        this.buildExecutorCanisterIds = executor_ids;
        console.log(`Build executor canisters updated: ${executor_ids.map(id => id.toText()).join(', ')}`);
        return true;
    }

    /**
     * Update build instructions canister ID (admin only)
     */
    @update([IDL.Principal], IDL.Bool)
    update_build_instructions_canister(canister_id: Principal): boolean {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            return false;
        }

        this.buildInstructionsCanisterId = canister_id;
        console.log(`Build instructions canister updated to: ${canister_id.toText()}`);
        return true;
    }

    // ============================================================================
    // QUERY METHODS
    // ============================================================================

    /**
     * Get canister configuration
     */
    @query([], IDL.Record({
        version: IDL.Text,
        deployed_at: IDL.Nat64,
        build_instructions_canister: IDL.Principal,
        build_executor_canisters: IDL.Vec(IDL.Principal),
        authorized_requester: IDL.Principal,
        admin_principal: IDL.Principal,
        total_verifications: IDL.Nat64,
        active_verifications: IDL.Nat64
    }))
    get_canister_info(): {
        version: string;
        deployed_at: bigint;
        build_instructions_canister: Principal;
        build_executor_canisters: Principal[];
        authorized_requester: Principal;
        admin_principal: Principal;
        total_verifications: bigint;
        active_verifications: bigint;
    } {
        return {
            version: this.canisterVersion,
            deployed_at: this.deployedAt,
            build_instructions_canister: this.buildInstructionsCanisterId,
            build_executor_canisters: this.buildExecutorCanisterIds,
            authorized_requester: this.authorizedRequester,
            admin_principal: this.adminPrincipal,
            total_verifications: BigInt(this.verificationHistory.len()),
            active_verifications: BigInt(this.activeVerifications.size)
        };
    }

    /**
     * List all verification history
     */
    @query([IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)], IDL.Vec(IDL.Tuple(IDL.Text, VerificationResult)))
    list_verification_history(limit?: bigint, offset?: bigint): [string, VerificationResult][] {
        const items = this.verificationHistory.items();
        const start = Number(offset || 0n);
        const end = limit ? start + Number(limit) : undefined;
        
        return items.slice(start, end);
    }

    /**
     * Get active verifications
     */
    @query([], IDL.Vec(IDL.Tuple(IDL.Text, VerificationResult)))
    get_active_verifications(): [string, VerificationResult][] {
        return Array.from(this.activeVerifications.entries()).map(([key, state]) => [key, state.result]);
    }

    // ============================================================================
    // PIPELINE TEMPLATE MANAGEMENT (Phase 1 Enhancement)
    // ============================================================================

    /**
     * Create a new pipeline template
     */
    @update([IDL.Text, PipelineTemplate], IDL.Bool)
    create_pipeline_template(template_id: string, template: PipelineTemplate): boolean {
        const caller = msgCaller();
        
        // Check if caller is admin
        if (!this.isAdmin(caller)) {
            console.log(`Unauthorized attempt to create pipeline template by ${caller.toText()}`);
            return false;
        }

        // Validate template
        if (!template_id || !template.name || template.stages.length === 0) {
            console.log(`Invalid pipeline template: ${template_id}`);
            return false;
        }

        // Store template
        this.pipelineTemplates.insert(template_id, template);
        console.log(`Pipeline template created: ${template_id}`);
        return true;
    }

    /**
     * Get pipeline template
     */
    @query([IDL.Text], IDL.Opt(PipelineTemplate))
    get_pipeline_template(template_id: string): PipelineTemplate | null {
        const template = this.pipelineTemplates.get(template_id);
        return template || null;
    }

    /**
     * List all pipeline templates
     */
    @query([], IDL.Vec(IDL.Tuple(IDL.Text, PipelineTemplate)))
    list_pipeline_templates(): [string, PipelineTemplate][] {
        return this.pipelineTemplates.items();
    }

    /**
     * Execute pipeline using template
     */
    @update([IDL.Text, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))], VerificationResultWrapper)
    async execute_pipeline_template(
        template_id: string, 
        project_id: string, 
        parameters: [string, string][]
    ): Promise<VerificationResultWrapper> {
        const caller = msgCaller();
        
        // Check authorization
        if (!this.isAuthorizedRequester(caller)) {
            return { 
                Err: { 
                    Unauthorized: `Principal ${caller.toText()} is not authorized to execute pipelines` 
                } 
            };
        }

        // Get template
        const template = this.pipelineTemplates.get(template_id);
        if (!template) {
            return { 
                Err: { 
                    NotFound: `Pipeline template ${template_id} not found` 
                } 
            };
        }

        // Validate parameters
        const param_map = new Map(parameters);
        for (const [param_name, param_def] of template.parameters) {
            if (param_def.required && !param_map.has(param_name)) {
                return { 
                    Err: { 
                        InvalidInput: `Required parameter ${param_name} missing` 
                    } 
                };
            }
        }

        // Create pipeline instance
        const instance_id = this.generatePipelineInstanceId(project_id, template_id);
        const pipeline_instance: PipelineInstance = {
            instance_id,
            template_id,
            project_id,
            parameters: param_map,
            status: { Running: null },
            current_stage: 0,
            started_at: time(),
            completed_at: null,
            stages: template.stages,
            stage_results: new Map(),
            error: null
        };

        // Store active instance
        this.activePipelineInstances.set(instance_id, pipeline_instance);

        try {
            // Execute pipeline stages
            return await this.executePipelineStages(pipeline_instance);
        } catch (error) {
            // Update instance status
            pipeline_instance.status = { Failed: null };
            pipeline_instance.completed_at = time();
            pipeline_instance.error = String(error);

            return { 
                Err: { 
                    InternalError: `Pipeline execution failed: ${error}` 
                } 
            };
        }
    }

    /**
     * Get pipeline instance status
     */
    @query([IDL.Text], IDL.Opt(IDL.Record({
        instance_id: IDL.Text,
        template_id: IDL.Text,
        project_id: IDL.Text,
        status: IDL.Text,
        current_stage: IDL.Nat32,
        started_at: IDL.Nat64,
        completed_at: IDL.Opt(IDL.Nat64),
        error: IDL.Opt(IDL.Text)
    })))
    get_pipeline_instance_status(instance_id: string): any {
        const instance = this.activePipelineInstances.get(instance_id);
        if (!instance) {
            return null;
        }

        return {
            instance_id: instance.instance_id,
            template_id: instance.template_id,
            project_id: instance.project_id,
            status: Object.keys(instance.status)[0],
            current_stage: instance.current_stage,
            started_at: instance.started_at,
            completed_at: instance.completed_at,
            error: instance.error
        };
    }

    /**
     * List active pipeline instances
     */
    @query([], IDL.Vec(IDL.Text))
    list_active_pipeline_instances(): string[] {
        return Array.from(this.activePipelineInstances.keys());
    }

    // ============================================================================
    // PIPELINE EXECUTION LOGIC (Phase 1 Enhancement)
    // ============================================================================

    /**
     * Execute pipeline stages
     */
    private async executePipelineStages(pipeline: PipelineInstance): Promise<VerificationResultWrapper> {
        console.log(`Starting pipeline execution for ${pipeline.project_id} using template ${pipeline.template_id}`);
        
        // Group stages by parallel execution
        const stage_groups = this.groupStagesByParallel(pipeline.stages);
        
        for (const stage_group of stage_groups) {
            if (stage_group.parallel && stage_group.stages.length > 1) {
                // Execute stages in parallel
                const parallel_results = await Promise.all(
                    stage_group.stages.map(stage => this.executeStage(stage, pipeline))
                );
                
                // Check for failures
                const failed_stage = parallel_results.find(result => 'Failed' in result.status);
                if (failed_stage) {
                    pipeline.status = { Failed: null };
                    pipeline.completed_at = time();
                    pipeline.error = `Stage ${failed_stage.stage_name} failed`;
                    
                    return { 
                        Err: { 
                            ExecutorFailure: `Stage ${failed_stage.stage_name} failed` 
                        } 
                    };
                }
                
                // Store results
                parallel_results.forEach(result => {
                    pipeline.stage_results.set(result.stage_name, result);
                });
            } else {
                // Execute stages sequentially
                for (const stage of stage_group.stages) {
                    const result = await this.executeStage(stage, pipeline);
                    pipeline.stage_results.set(stage.name, result);
                    
                    if ('Failed' in result.status) {
                        pipeline.status = { Failed: null };
                        pipeline.completed_at = time();
                        pipeline.error = `Stage ${stage.name} failed`;
                        
                        return { 
                            Err: { 
                                ExecutorFailure: `Stage ${stage.name} failed` 
                            } 
                        };
                    }
                }
            }
        }

        // Pipeline completed successfully
        pipeline.status = { Completed: null };
        pipeline.completed_at = time();
        
        // Convert pipeline result to verification result for compatibility
        const verification_result: VerificationResult = {
            status: { Verified: null },
            verified_hash: "pipeline_success_hash",
            error: null,
            executor_results: [],
            consensus_threshold: 100,
            total_executors: 1,
            matching_results: 1,
            created_at: pipeline.started_at,
            completed_at: pipeline.completed_at
        };

        return { Ok: verification_result };
    }

    /**
     * Execute a single stage
     */
    private async executeStage(stage: PipelineStage, pipeline: PipelineInstance): Promise<StageResult> {
        console.log(`Executing stage: ${stage.name}`);
        
        const stage_result: StageResult = {
            stage_name: stage.name,
            status: { Running: null },
            started_at: time(),
            completed_at: null,
            step_results: new Map(),
            error: null,
            retry_count: 0
        };

        try {
            // Check when condition
            if (stage.when_condition && !this.evaluateWhenCondition(stage.when_condition, pipeline)) {
                stage_result.status = { Skipped: null };
                stage_result.completed_at = time();
                console.log(`Stage ${stage.name} skipped due to condition`);
                return stage_result;
            }

            // Execute steps
            for (const step of stage.steps) {
                const step_result = await this.executeStep(step, pipeline);
                stage_result.step_results.set(step.step_type, step_result);
                
                if ('Failed' in step_result.status) {
                    stage_result.status = { Failed: null };
                    stage_result.error = step_result.error;
                    stage_result.completed_at = time();
                    return stage_result;
                }
            }

            // Stage completed successfully
            stage_result.status = { Completed: null };
            stage_result.completed_at = time();
            
        } catch (error) {
            stage_result.status = { Failed: null };
            stage_result.error = String(error);
            stage_result.completed_at = time();
        }

        return stage_result;
    }

    /**
     * Execute a single step
     */
    private async executeStep(step: BuildStep, pipeline: PipelineInstance): Promise<StepResult> {
        console.log(`Executing step: ${step.step_type}`);
        
        const step_result: StepResult = {
            step_type: step.step_type,
            status: { Running: null },
            started_at: time(),
            completed_at: null,
            output: "",
            error: null,
            executor_id: null
        };

        try {
            // Route step execution based on type
            switch (step.step_type) {
                case 'checkout':
                    await this.executeCheckoutStep(step, pipeline, step_result);
                    break;
                case 'build':
                    await this.executeBuildStep(step, pipeline, step_result);
                    break;
                case 'test':
                    await this.executeTestStep(step, pipeline, step_result);
                    break;
                case 'deploy':
                    await this.executeDeployStep(step, pipeline, step_result);
                    break;
                default:
                    await this.executeGenericStep(step, pipeline, step_result);
                    break;
            }

            step_result.status = { Completed: null };
            step_result.completed_at = time();
            
        } catch (error) {
            step_result.status = { Failed: null };
            step_result.error = String(error);
            step_result.completed_at = time();
        }

        return step_result;
    }

    // ============================================================================
    // PIPELINE HELPER METHODS
    // ============================================================================

    /**
     * Generate unique pipeline instance ID
     */
    private generatePipelineInstanceId(project_id: string, template_id: string): string {
        const timestamp = time();
        return `${project_id}_${template_id}_${timestamp}`;
    }

    /**
     * Group stages by parallel execution
     */
    private groupStagesByParallel(stages: PipelineStage[]): { parallel: boolean, stages: PipelineStage[] }[] {
        const groups: { parallel: boolean, stages: PipelineStage[] }[] = [];
        let current_group: PipelineStage[] = [];
        let current_parallel_group: string | null = null;

        for (const stage of stages) {
            if (stage.parallel_group) {
                if (current_parallel_group !== stage.parallel_group) {
                    // New parallel group
                    if (current_group.length > 0) {
                        groups.push({ parallel: false, stages: current_group });
                        current_group = [];
                    }
                    current_parallel_group = stage.parallel_group;
                }
                current_group.push(stage);
            } else {
                // Sequential stage
                if (current_parallel_group) {
                    // End of parallel group
                    groups.push({ parallel: true, stages: current_group });
                    current_group = [];
                    current_parallel_group = null;
                }
                current_group.push(stage);
                groups.push({ parallel: false, stages: current_group });
                current_group = [];
            }
        }

        // Add final group
        if (current_group.length > 0) {
            groups.push({ 
                parallel: current_parallel_group !== null, 
                stages: current_group 
            });
        }

        return groups;
    }

    /**
     * Evaluate when condition
     */
    private evaluateWhenCondition(condition: string, pipeline: PipelineInstance): boolean {
        // Simple condition evaluation - can be extended
        if (condition === 'always') return true;
        if (condition.startsWith('branch:')) {
            const branch = condition.substring(7);
            return pipeline.parameters.get('branch') === branch;
        }
        if (condition.startsWith('env:')) {
            const env = condition.substring(4);
            return pipeline.parameters.get('environment') === env;
        }
        return true;
    }

    /**
     * Step execution methods
     */
    private async executeCheckoutStep(step: BuildStep, pipeline: PipelineInstance, result: StepResult): Promise<void> {
        result.output = `Checkout step executed for ${pipeline.project_id}`;
        console.log(result.output);
    }

    private async executeBuildStep(step: BuildStep, pipeline: PipelineInstance, result: StepResult): Promise<void> {
        // Delegate to existing build executor
        if (this.buildExecutorCanisterIds.length > 0) {
            result.executor_id = this.buildExecutorCanisterIds[0];
            result.output = `Build step delegated to executor ${result.executor_id.toText()}`;
        } else {
            result.output = `Build step executed for ${pipeline.project_id}`;
        }
        console.log(result.output);
    }

    private async executeTestStep(step: BuildStep, pipeline: PipelineInstance, result: StepResult): Promise<void> {
        result.output = `Test step executed for ${pipeline.project_id}`;
        console.log(result.output);
    }

    private async executeDeployStep(step: BuildStep, pipeline: PipelineInstance, result: StepResult): Promise<void> {
        result.output = `Deploy step executed for ${pipeline.project_id}`;
        console.log(result.output);
    }

    private async executeGenericStep(step: BuildStep, pipeline: PipelineInstance, result: StepResult): Promise<void> {
        result.output = `Generic step ${step.step_type} executed for ${pipeline.project_id}`;
        console.log(result.output);
    }
}
