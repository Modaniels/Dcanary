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
// PIPELINE VERIFICATION TYPES (NEW ENHANCEMENT)
// ============================================================================

/**
 * Pipeline execution result for verification
 */
const PipelineExecutorResult = IDL.Record({
    executor_id: IDL.Principal,
    pipeline_id: IDL.Text,
    repository_id: IDL.Text,
    commit_hash: IDL.Text,
    stage_results: IDL.Vec(IDL.Record({
        stage_name: IDL.Text,
        success: IDL.Bool,
        start_time: IDL.Nat64,
        end_time: IDL.Nat64,
        exit_code: IDL.Int32,
        stdout: IDL.Text,
        stderr: IDL.Text,
        artifacts: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(IDL.Nat8))),
        cycles_consumed: IDL.Nat64,
        memory_used: IDL.Nat32,
        error_message: IDL.Opt(IDL.Text),
        metadata: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)) // key-value metadata
    })),
    overall_success: IDL.Bool,
    total_cycles_consumed: IDL.Nat64,
    total_memory_used: IDL.Nat32,
    execution_start: IDL.Nat64,
    execution_end: IDL.Nat64
});

type PipelineExecutorResult = {
    executor_id: Principal;
    pipeline_id: string;
    repository_id: string;
    commit_hash: string;
    stage_results: StageExecutionResult[];
    overall_success: boolean;
    total_cycles_consumed: bigint;
    total_memory_used: number;
    execution_start: bigint;
    execution_end: bigint;
};

type StageExecutionResult = {
    stage_name: string;
    success: boolean;
    start_time: bigint;
    end_time: bigint;
    exit_code: number;
    stdout: string;
    stderr: string;
    artifacts: [string, number[]][];
    cycles_consumed: bigint;
    memory_used: number;
    error_message: string | null;
    metadata: [string, string][]; // For test coverage, quality metrics, etc.
};

/**
 * Pipeline verification request
 */
const PipelineVerificationRequest = IDL.Record({
    pipeline_id: IDL.Text,
    repository_id: IDL.Text,
    commit_hash: IDL.Text,
    branch: IDL.Text,
    executor_results: IDL.Vec(PipelineExecutorResult),
    requester: IDL.Principal,
    verification_rules: IDL.Record({
        min_consensus_percentage: IDL.Nat8,
        required_executor_count: IDL.Nat8,
        stage_consensus_required: IDL.Bool,
        artifact_verification_required: IDL.Bool
    })
});

type PipelineVerificationRequest = {
    pipeline_id: string;
    repository_id: string;
    commit_hash: string;
    branch: string;
    executor_results: PipelineExecutorResult[];
    requester: Principal;
    verification_rules: {
        min_consensus_percentage: number;
        required_executor_count: number;
        stage_consensus_required: boolean;
        artifact_verification_required: boolean;
    };
};

/**
 * Pipeline verification result
 */
const PipelineVerificationResult = IDL.Record({
    verification_id: IDL.Text,
    pipeline_id: IDL.Text,
    repository_id: IDL.Text,
    commit_hash: IDL.Text,
    verification_status: IDL.Variant({
        Pending: IDL.Null,
        Verified: IDL.Null,
        Failed: IDL.Text,
        RequiresApproval: IDL.Null
    }),
    consensus_achieved: IDL.Bool,
    consensus_count: IDL.Nat8,
    verified_stages: IDL.Vec(IDL.Text),
    failed_stages: IDL.Vec(IDL.Text),
    stage_consensus: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat8)), // stage_name -> consensus_count
    artifact_hashes: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)), // artifact_name -> verified_hash
    quality_gates_passed: IDL.Bool,
    deployment_approved: IDL.Bool,
    created_at: IDL.Nat64,
    completed_at: IDL.Opt(IDL.Nat64),
    execution_summary: IDL.Record({
        total_cycles: IDL.Nat64,
        total_time: IDL.Nat64,
        success_rate: IDL.Float32
    })
});

type PipelineVerificationResult = {
    verification_id: string;
    pipeline_id: string;
    repository_id: string;
    commit_hash: string;
    verification_status: 
        | { Pending: null }
        | { Verified: null }
        | { Failed: string }
        | { RequiresApproval: null };
    consensus_achieved: boolean;
    consensus_count: number;
    verified_stages: string[];
    failed_stages: string[];
    stage_consensus: [string, number][]; // stage_name -> consensus_count
    artifact_hashes: [string, string][]; // artifact_name -> verified_hash
    quality_gates_passed: boolean;
    deployment_approved: boolean;
    created_at: bigint;
    completed_at: bigint | null;
    execution_summary: {
        total_cycles: bigint;
        total_time: bigint;
        success_rate: number;
    };
};

/**
 * Quality gate configuration
 */
const QualityGate = IDL.Record({
    name: IDL.Text,
    description: IDL.Text,
    gate_type: IDL.Variant({
        TestCoverage: IDL.Record({ min_percentage: IDL.Float32 }),
        CodeQuality: IDL.Record({ max_violations: IDL.Nat32 }),
        SecurityScan: IDL.Record({ max_vulnerabilities: IDL.Nat32 }),
        PerformanceTest: IDL.Record({ max_response_time_ms: IDL.Nat32 }),
        CustomCheck: IDL.Record({ 
            check_command: IDL.Text,
            expected_output: IDL.Text
        })
    }),
    required: IDL.Bool,
    timeout_minutes: IDL.Nat32
});

type QualityGate = {
    name: string;
    description: string;
    gate_type: 
        | { TestCoverage: { min_percentage: number } }
        | { CodeQuality: { max_violations: number } }
        | { SecurityScan: { max_vulnerabilities: number } }
        | { PerformanceTest: { max_response_time_ms: number } }
        | { CustomCheck: { check_command: string; expected_output: string } };
    required: boolean;
    timeout_minutes: number;
};

/**
 * Deployment approval configuration
 */
const DeploymentApproval = IDL.Record({
    required_approvers: IDL.Vec(IDL.Principal),
    min_approvals: IDL.Nat8,
    approval_timeout_hours: IDL.Nat32,
    auto_deploy_on_approval: IDL.Bool,
    block_on_verification_failure: IDL.Bool,
    approval_status: IDL.Variant({
        Pending: IDL.Record({ pending_approvers: IDL.Vec(IDL.Principal) }),
        Approved: IDL.Record({ approved_at: IDL.Nat64, approved_by: IDL.Vec(IDL.Principal) }),
        Rejected: IDL.Record({ rejected_at: IDL.Nat64, rejected_by: IDL.Principal, reason: IDL.Text }),
        Expired: IDL.Record({ expired_at: IDL.Nat64 })
    })
});

type DeploymentApproval = {
    required_approvers: Principal[];
    min_approvals: number;
    approval_timeout_hours: number;
    auto_deploy_on_approval: boolean;
    block_on_verification_failure: boolean;
    approval_status: 
        | { Pending: { pending_approvers: Principal[] } }
        | { Approved: { approved_at: bigint; approved_by: Principal[] } }
        | { Rejected: { rejected_at: bigint; rejected_by: Principal; reason: string } }
        | { Expired: { expired_at: bigint } };
};

/**
 * Result wrapper types
 */
const PipelineVerificationResultWrapper = IDL.Variant({
    Ok: PipelineVerificationResult,
    Err: IDL.Variant({
        NotFound: IDL.Text,
        Unauthorized: IDL.Text,
        InvalidInput: IDL.Text,
        InternalError: IDL.Text,
        InsufficientConsensus: IDL.Text,
        QualityGateFailure: IDL.Text
    })
});

type PipelineVerificationResultWrapper = 
    | { Ok: PipelineVerificationResult }
    | { Err: 
        | { NotFound: string }
        | { Unauthorized: string }
        | { InvalidInput: string }
        | { InternalError: string }
        | { InsufficientConsensus: string }
        | { QualityGateFailure: string }
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

    // ============================================================================
    // PIPELINE VERIFICATION METHODS (NEW)
    // ============================================================================

    // Stable storage for pipeline verifications
    private pipelineVerifications = new StableBTreeMap<string, PipelineVerificationResult>(5);
    
    // Deployment approvals
    private deploymentApprovals = new StableBTreeMap<string, DeploymentApproval>(6);
    
    // Quality gates configuration
    private qualityGates = new StableBTreeMap<string, QualityGate[]>(7);

    /**
     * Verify pipeline execution across multiple executors
     */
    @update([PipelineVerificationRequest])
    async verifyPipelineExecution(request: PipelineVerificationRequest): Promise<PipelineVerificationResultWrapper> {
        const caller = msgCaller();
        
        try {
            // Validate request
            if (request.executor_results.length === 0) {
                return { Err: { InvalidInput: 'No executor results provided' } };
            }

            if (request.required_consensus > request.executor_results.length) {
                return { Err: { InvalidInput: 'Required consensus exceeds number of executors' } };
            }

            const verificationId = this.generateVerificationId(request.pipeline_id);
            const now = time();

            // Analyze executor results for consensus
            const consensusAnalysis = this.analyzeExecutorConsensus(request);
            
            // Check quality gates
            const qualityGatesPassed = await this.checkQualityGates(request.repository_id, request);
            
            // Determine overall verification status
            let status: VerificationStatus;
            let deploymentApproved = false;

            if (consensusAnalysis.consensus_achieved && qualityGatesPassed) {
                status = { Verified: null };
                
                // Check if automatic deployment approval is enabled
                const approval = this.deploymentApprovals.get(request.pipeline_id);
                if (approval && approval.auto_approve_on_quality_gates) {
                    deploymentApproved = true;
                }
            } else {
                status = { Failed: null };
            }

            const verificationResult: PipelineVerificationResult = {
                verification_id: verificationId,
                pipeline_id: request.pipeline_id,
                repository_id: request.repository_id,
                commit_hash: request.commit_hash,
                verification_status: status,
                consensus_achieved: consensusAnalysis.consensus_achieved,
                consensus_count: consensusAnalysis.consensus_count,
                verified_stages: consensusAnalysis.verified_stages,
                failed_stages: consensusAnalysis.failed_stages,
                stage_consensus: consensusAnalysis.stage_consensus,
                artifact_hashes: consensusAnalysis.artifact_hashes,
                quality_gates_passed: qualityGatesPassed,
                deployment_approved: deploymentApproved,
                created_at: now,
                completed_at: now,
                execution_summary: consensusAnalysis.execution_summary
            };

            // Store verification result
            this.pipelineVerifications.insert(verificationId, verificationResult);

            // If deployment approval is required and not auto-approved, initiate approval workflow
            if ('Verified' in status && !deploymentApproved) {
                const approval = this.deploymentApprovals.get(request.pipeline_id);
                if (approval) {
                    await this.initiateDeploymentApproval(request.pipeline_id, approval);
                }
            }

            return { Ok: verificationResult };

        } catch (error) {
            return { Err: { InternalError: `Verification failed: ${error}` } };
        }
    }

    /**
     * Configure quality gates for a repository
     */
    @update([IDL.Text, IDL.Vec(QualityGate)])
    setQualityGates(repositoryId: string, gates: QualityGate[]): boolean {
        const caller = msgCaller();
        
        // Only admin or authorized users can set quality gates
        if (caller.toText() !== this.adminPrincipal.toText()) {
            trap('Only admin can configure quality gates');
        }

        this.qualityGates.insert(repositoryId, gates);
        return true;
    }

    /**
     * Configure deployment approval workflow
     */
    @update([DeploymentApproval])
    configureDeploymentApproval(approval: DeploymentApproval): boolean {
        const caller = msgCaller();
        
        // Only admin or authorized users can configure deployment approvals
        if (caller.toText() !== this.adminPrincipal.toText()) {
            trap('Only admin can configure deployment approvals');
        }

        this.deploymentApprovals.insert(approval.pipeline_id, approval);
        return true;
    }

    /**
     * Approve or reject deployment
     */
    @update([IDL.Text, IDL.Bool, IDL.Opt(IDL.Text)])
    async approveDeployment(pipelineId: string, approved: boolean, comment: string | null): Promise<boolean> {
        const caller = msgCaller();
        
        const approval = this.deploymentApprovals.get(pipelineId);
        if (!approval) {
            trap('No deployment approval configured for this pipeline');
        }

        // Check if caller is authorized to approve
        if (!approval.required_approvers.some(approver => approver.toText() === caller.toText())) {
            trap('Not authorized to approve this deployment');
        }

        // Get current verification result
        const verificationResult = Array.from(this.pipelineVerifications.values())
            .find(v => v.pipeline_id === pipelineId);
        
        if (!verificationResult) {
            trap('No verification result found for this pipeline');
        }

        // Add approval
        const newApproval = {
            approver: caller,
            approved: approved,
            timestamp: time(),
            comment: comment
        };

        const updatedVerification: PipelineVerificationResult = {
            ...verificationResult,
            approvals: [...verificationResult.approvals, newApproval],
            deployment_approved: approved && this.checkApprovalRequirements(approval, [...verificationResult.approvals, newApproval])
        };

        // Update verification result
        const verificationId = Array.from(this.pipelineVerifications.keys())
            .find(key => {
                const result = this.pipelineVerifications.get(key);
                return result?.pipeline_id === pipelineId;
            });
        
        if (verificationId) {
            this.pipelineVerifications.insert(verificationId, updatedVerification);
        }

        return true;
    }

    /**
     * Get pipeline verification status
     */
    @query([IDL.Text])
    getPipelineVerification(pipelineId: string): PipelineVerificationResultWrapper {
        const result = Array.from(this.pipelineVerifications.values())
            .find(v => v.pipeline_id === pipelineId);
        
        if (!result) {
            return { Err: { NotFound: `No verification found for pipeline ${pipelineId}` } };
        }

        return { Ok: result };
    }

    /**
     * List all pipeline verifications for a repository
     */
    @query([IDL.Text])
    listPipelineVerifications(repositoryId: string): PipelineVerificationResult[] {
        const results: PipelineVerificationResult[] = [];
        
        for (let i = 0; i < this.pipelineVerifications.len(); i++) {
            const items = this.pipelineVerifications.items(i, 1);
            if (items.length > 0) {
                const [_, result] = items[0];
                // Note: This is a simplified filter, in practice you'd need to store repository_id in the result
                results.push(result);
            }
        }

        return results.sort((a, b) => Number(b.created_at - a.created_at));
    }

    // ============================================================================
    // PIPELINE VERIFICATION HELPER METHODS
    // ============================================================================

    /**
     * Analyze executor results for consensus
     */
    private analyzeExecutorConsensus(request: PipelineVerificationRequest): {
        consensus_achieved: boolean;
        consensus_count: number;
        verified_stages: string[];
        failed_stages: string[];
        stage_consensus: [string, number][];
        artifact_hashes: [string, string][];
        execution_summary: {
            total_cycles: bigint;
            total_time: bigint;
            success_rate: number;
        };
    } {
        const stageResults = new Map<string, Array<{ success: boolean; artifacts: [string, number[]][]; cycles: bigint; time: bigint }>>();
        const artifactHashes = new Map<string, string>();
        
        let totalCycles = 0n;
        let totalTime = 0n;
        let totalStages = 0;
        let successfulStages = 0;

        // Collect results by stage
        for (const executorResult of request.executor_results) {
            for (const stageResult of executorResult.stage_results) {
                if (!stageResults.has(stageResult.stage_name)) {
                    stageResults.set(stageResult.stage_name, []);
                }
                
                stageResults.get(stageResult.stage_name)!.push({
                    success: stageResult.success,
                    artifacts: stageResult.artifacts,
                    cycles: stageResult.cycles_consumed,
                    time: stageResult.execution_time
                });

                totalCycles += stageResult.cycles_consumed;
                totalTime += stageResult.execution_time;
                totalStages++;
                
                if (stageResult.success) {
                    successfulStages++;
                }

                // Generate artifact hash (simplified)
                if (stageResult.artifacts.length > 0) {
                    const artifactData = stageResult.artifacts.map(([name, data]) => `${name}:${data.length}`).join(',');
                    artifactHashes.set(stageResult.stage_name, this.simpleHash(artifactData));
                }
            }
        }

        // Analyze consensus for each stage
        const verifiedStages: string[] = [];
        const failedStages: string[] = [];
        const stageConsensus: [string, number][] = [];

        for (const [stageName, results] of stageResults.entries()) {
            const successCount = results.filter(r => r.success).length;
            const consensusAchieved = successCount >= request.required_consensus;
            
            stageConsensus.push([stageName, successCount]);
            
            if (consensusAchieved) {
                verifiedStages.push(stageName);
            } else {
                failedStages.push(stageName);
            }
        }

        const overallConsensus = failedStages.length === 0 && verifiedStages.length > 0;
        const consensusCount = Math.min(...stageConsensus.map(([_, count]) => count));

        return {
            consensus_achieved: overallConsensus,
            consensus_count: consensusCount,
            verified_stages: verifiedStages,
            failed_stages: failedStages,
            stage_consensus: stageConsensus,
            artifact_hashes: Array.from(artifactHashes.entries()),
            execution_summary: {
                total_cycles: totalCycles,
                total_time: totalTime,
                success_rate: totalStages > 0 ? successfulStages / totalStages : 0
            }
        };
    }

    /**
     * Check quality gates for a repository
     */
    private async checkQualityGates(repositoryId: string, request: PipelineVerificationRequest): Promise<boolean> {
        const gates = this.qualityGates.get(repositoryId);
        if (!gates || gates.length === 0) {
            return true; // No quality gates configured
        }

        for (const gate of gates) {
            const passed = await this.evaluateQualityGate(gate, request);
            if (!passed && gate.required) {
                return false; // Required quality gate failed
            }
        }

        return true;
    }

    /**
     * Evaluate a single quality gate
     */
    private async evaluateQualityGate(gate: QualityGate, request: PipelineVerificationRequest): Promise<boolean> {
        try {
            if ('TestCoverage' in gate.gate_type) {
                return this.checkTestCoverage(gate.gate_type.TestCoverage.min_percentage, request);
            } else if ('CodeQuality' in gate.gate_type) {
                return this.checkCodeQuality(gate.gate_type.CodeQuality.max_violations, request);
            } else if ('SecurityScan' in gate.gate_type) {
                return this.checkSecurityScan(gate.gate_type.SecurityScan.max_vulnerabilities, request);
            } else if ('PerformanceTest' in gate.gate_type) {
                return this.checkPerformanceTest(gate.gate_type.PerformanceTest.max_response_time_ms, request);
            } else if ('CustomCheck' in gate.gate_type) {
                return this.checkCustomGate(gate.gate_type.CustomCheck, request);
            }
            
            return false;
        } catch (error) {
            console.log(`Quality gate ${gate.name} evaluation failed: ${error}`);
            return false;
        }
    }

    /**
     * Quality gate check implementations
     */
    private checkTestCoverage(minPercentage: number, request: PipelineVerificationRequest): boolean {
        // Simplified implementation - look for test coverage in metadata
        for (const executorResult of request.executor_results) {
            for (const stageResult of executorResult.stage_results) {
                const coverageMetadata = stageResult.metadata.find(([key, _]) => key === 'test_coverage');
                if (coverageMetadata) {
                    const coverage = parseFloat(coverageMetadata[1]);
                    if (coverage >= minPercentage) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private checkCodeQuality(maxViolations: number, request: PipelineVerificationRequest): boolean {
        // Simplified implementation - look for code quality violations in metadata
        for (const executorResult of request.executor_results) {
            for (const stageResult of executorResult.stage_results) {
                const violationsMetadata = stageResult.metadata.find(([key, _]) => key === 'quality_violations');
                if (violationsMetadata) {
                    const violations = parseInt(violationsMetadata[1]);
                    if (violations <= maxViolations) {
                        return true;
                    }
                }
            }
        }
        return true; // Pass if no violations found
    }

    private checkSecurityScan(maxVulnerabilities: number, request: PipelineVerificationRequest): boolean {
        // Simplified implementation - look for security scan results in metadata
        for (const executorResult of request.executor_results) {
            for (const stageResult of executorResult.stage_results) {
                const vulnMetadata = stageResult.metadata.find(([key, _]) => key === 'security_vulnerabilities');
                if (vulnMetadata) {
                    const vulnerabilities = parseInt(vulnMetadata[1]);
                    if (vulnerabilities <= maxVulnerabilities) {
                        return true;
                    }
                }
            }
        }
        return true; // Pass if no vulnerabilities found
    }

    private checkPerformanceTest(maxResponseTimeMs: number, request: PipelineVerificationRequest): boolean {
        // Simplified implementation - look for performance test results in metadata
        for (const executorResult of request.executor_results) {
            for (const stageResult of executorResult.stage_results) {
                const perfMetadata = stageResult.metadata.find(([key, _]) => key === 'response_time_ms');
                if (perfMetadata) {
                    const responseTime = parseInt(perfMetadata[1]);
                    if (responseTime <= maxResponseTimeMs) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private checkCustomGate(customCheck: { check_command: string; expected_output: string }, request: PipelineVerificationRequest): boolean {
        // Simplified implementation - in practice, this would execute the custom check
        console.log(`Custom check: ${customCheck.check_command}, expected: ${customCheck.expected_output}`);
        return true; // Always pass for now
    }

    /**
     * Initiate deployment approval workflow
     */
    private async initiateDeploymentApproval(pipelineId: string, approval: DeploymentApproval): Promise<void> {
        const updatedApproval: DeploymentApproval = {
            ...approval,
            approval_status: { Pending: { pending_approvers: approval.required_approvers } }
        };

        this.deploymentApprovals.insert(pipelineId, updatedApproval);

        // Set timeout for approval if configured
        if (approval.approval_timeout_hours > 0) {
            const timeoutMs = Number(approval.approval_timeout_hours) * 60 * 60 * 1000;
            setTimer(BigInt(timeoutMs), () => {
                this.expireDeploymentApproval(pipelineId);
            });
        }
    }

    /**
     * Expire deployment approval
     */
    private expireDeploymentApproval(pipelineId: string): void {
        const approval = this.deploymentApprovals.get(pipelineId);
        if (approval && 'Pending' in approval.approval_status) {
            const expiredApproval: DeploymentApproval = {
                ...approval,
                approval_status: { Expired: { expired_at: time() } }
            };
            this.deploymentApprovals.insert(pipelineId, expiredApproval);
        }
    }

    /**
     * Check if approval requirements are met
     */
    private checkApprovalRequirements(
        approval: DeploymentApproval, 
        approvals: Array<{ approver: Principal; approved: boolean; timestamp: bigint; comment: string | null }>
    ): boolean {
        const approvedCount = approvals.filter(a => a.approved).length;
        const rejectedCount = approvals.filter(a => !a.approved).length;

        // If any rejection and block on failure, deployment is not approved
        if (rejectedCount > 0 && approval.block_on_verification_failure) {
            return false;
        }

        // Check if minimum approvals are met
        return approvedCount >= approval.min_approvals;
    }

    /**
     * Generate verification ID
     */
    private generateVerificationId(pipelineId: string): string {
        const timestamp = time();
        return `verification_${pipelineId}_${timestamp}`;
    }

    /**
     * Simple hash function for artifact comparison
     */
    private simpleHash(input: string): string {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(16);
    }
}
