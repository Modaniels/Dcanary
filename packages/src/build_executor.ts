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
    performanceCounter
} from 'azle';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// BUILD EXECUTOR CANISTER - Enhanced with Off-Chain Agent Simulation
// ============================================================================
//
// This canister now supports:
// 1. Local build execution (original functionality)
// 2. Simulated distributed execution across off-chain agents
// 3. Consensus mechanism for build verification
// 4. Executor performance tracking and reputation scoring
// 5. Reward distribution and slashing for malicious behavior
// 6. Agent pool management and health monitoring
//
// Key Features:
// - Maintains all existing build execution capabilities
// - Simulates a network of 5 distributed executors
// - Uses consensus mechanism (67% agreement required)
// - Tracks executor performance and reputation scores
// - Supports both public and private executor pools
// - Provides comprehensive monitoring and analytics
//
// Usage:
// - executeBuild() now automatically uses distributed execution when simulation is enabled
// - executeDistributedBuild() explicitly uses the distributed approach
// - toggleSimulation() allows admin to enable/disable simulation mode
// - getExecutorNetworkStatus() provides network health information
// - getOffChainBuildStatus() shows status of distributed builds
//
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of build execution
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

/**
 * Build execution request
 */
const BuildRequest = IDL.Record({
    project_id: IDL.Text,
    version: IDL.Text,
    requester: IDL.Principal
});

type BuildRequest = {
    project_id: string;
    version: string;
    requester: Principal;
};

/**
 * Error types
 */
const BuildExecutorError = IDL.Variant({
    NotFound: IDL.Text,
    Unauthorized: IDL.Text,
    InvalidInput: IDL.Text,
    InternalError: IDL.Text,
    SecurityViolation: IDL.Text,
    ResourceExhausted: IDL.Text
});

type BuildExecutorError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { InternalError: string }
    | { SecurityViolation: string }
    | { ResourceExhausted: string };

/**
 * Result wrapper
 */
const BuildExecutorResult = IDL.Variant({
    Ok: ExecuteBuildResult,
    Err: BuildExecutorError
});

type BuildExecutorResult = 
    | { Ok: ExecuteBuildResult }
    | { Err: BuildExecutorError };

/**
 * Hash result
 */
const HashResult = IDL.Variant({
    Ok: IDL.Text,
    Err: BuildExecutorError
});

type HashResult = 
    | { Ok: string }
    | { Err: BuildExecutorError };

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

// ============================================================================
// AGENT POOL MANAGEMENT TYPES (Phase 1 Enhancement)
// ============================================================================

/**
 * Agent capabilities and specifications
 */
const AgentCapabilities = IDL.Record({
    labels: IDL.Vec(IDL.Text),
    max_concurrent_builds: IDL.Nat32,
    available_resources: IDL.Record({
        cpu_cores: IDL.Nat32,
        memory_mb: IDL.Nat32,
        disk_space_gb: IDL.Nat32,
        network_bandwidth: IDL.Nat32
    }),
    supported_languages: IDL.Vec(IDL.Text),
    installed_tools: IDL.Vec(IDL.Text)
});

type AgentCapabilities = {
    labels: string[];
    max_concurrent_builds: number;
    available_resources: ResourceSpec;
    supported_languages: string[];
    installed_tools: string[];
};

type ResourceSpec = {
    cpu_cores: number;
    memory_mb: number;
    disk_space_gb: number;
    network_bandwidth: number;
};

/**
 * Build queue management
 */
type BuildQueue = {
    pending_builds: BuildRequest[];
    running_builds: Map<string, BuildExecution>;
    completed_builds: Map<string, BuildResult>;
    max_queue_size: number;
};

type BuildExecution = {
    build_id: string;
    project_id: string;
    version: string;
    started_at: bigint;
    current_stage: string;
    allocated_resources: ResourceSpec;
    estimated_completion: bigint;
    priority: number;
};

type BuildResult = {
    build_id: string;
    project_id: string;
    version: string;
    status: BuildStatus;
    started_at: bigint;
    completed_at: bigint;
    result: ExecuteBuildResult;
    resource_usage: ResourceUsage;
};

type BuildStatus = 
    | { Queued: null }
    | { Running: null }
    | { Completed: null }
    | { Failed: null }
    | { Cancelled: null };

type ResourceUsage = {
    cpu_time_ms: bigint;
    memory_peak_mb: number;
    disk_used_gb: number;
    network_bytes: bigint;
};

/**
 * Agent health monitoring
 */
type AgentHealth = {
    agent_id: Principal;
    last_heartbeat: bigint;
    cpu_usage: number;
    memory_usage: number;
    active_builds: number;
    queue_length: number;
    status: AgentStatus;
    uptime: bigint;
};

type AgentStatus = 
    | { Online: null }
    | { Offline: null }
    | { Maintenance: null }
    | { Overloaded: null };

// ============================================================================
// PIPELINE EXECUTION TYPES (NEW)
// ============================================================================

const PipelineExecutionRequest = IDL.Record({
    repository_id: IDL.Text,
    commit_hash: IDL.Text,
    branch: IDL.Text,
    trigger_type: IDL.Text,
    source_url: IDL.Text,
    timestamp: IDL.Nat64,
    pipeline_config: IDL.Text // JSON-encoded pipeline configuration
});

type PipelineExecutionRequest = {
    repository_id: string;
    commit_hash: string;
    branch: string;
    trigger_type: string;
    source_url: string;
    timestamp: bigint;
    pipeline_config: string;
};

const StageExecutionResult = IDL.Record({
    stage_name: IDL.Text,
    success: IDL.Bool,
    start_time: IDL.Nat64,
    end_time: IDL.Nat64,
    exit_code: IDL.Int32,
    stdout: IDL.Text,
    stderr: IDL.Text,
    artifacts: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(IDL.Nat8))), // filename -> binary data
    cycles_consumed: IDL.Nat64,
    memory_used: IDL.Nat32,
    error_message: IDL.Opt(IDL.Text)
});

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
};

const PipelineExecutionResult = IDL.Record({
    pipeline_id: IDL.Text,
    repository_id: IDL.Text,
    commit_hash: IDL.Text,
    overall_success: IDL.Bool,
    stages: IDL.Vec(StageExecutionResult),
    start_time: IDL.Nat64,
    end_time: IDL.Nat64,
    total_cycles_consumed: IDL.Nat64,
    total_memory_used: IDL.Nat32,
    verification_required: IDL.Bool
});

type PipelineExecutionResult = {
    pipeline_id: string;
    repository_id: string;
    commit_hash: string;
    overall_success: boolean;
    stages: StageExecutionResult[];
    start_time: bigint;
    end_time: bigint;
    total_cycles_consumed: bigint;
    total_memory_used: number;
    verification_required: boolean;
};

const PipelineResult = IDL.Variant({
    Ok: PipelineExecutionResult,
    Err: BuildExecutorError
});

type PipelineResult = 
    | { Ok: PipelineExecutionResult }
    | { Err: BuildExecutorError };

/**
 * Build execution attestation for consensus
 */
const BuildAttestation = IDL.Record({
    executor_id: IDL.Principal,
    build_request_hash: IDL.Text,
    artifact_hash: IDL.Text,
    execution_signature: IDL.Vec(IDL.Nat8),
    execution_metadata: IDL.Record({
        start_time: IDL.Nat64,
        end_time: IDL.Nat64,
        resource_usage: IDL.Record({
            cpu_time_ms: IDL.Nat64,
            memory_peak_mb: IDL.Nat32,
            network_bytes: IDL.Nat64
        }),
        exit_code: IDL.Int32,
        environment_hash: IDL.Text // Hash of executor environment
    }),
    trust_score: IDL.Float32
});

type BuildAttestation = {
    executor_id: Principal;
    build_request_hash: string;
    artifact_hash: string;
    execution_signature: number[];
    execution_metadata: {
        start_time: bigint;
        end_time: bigint;
        resource_usage: {
            cpu_time_ms: bigint;
            memory_peak_mb: number;
            network_bytes: bigint;
        };
        exit_code: number;
        environment_hash: string;
    };
    trust_score: number;
};

/**
 * Consensus result for build verification
 */
const ConsensusResult = IDL.Record({
    consensus_reached: IDL.Bool,
    agreed_artifact_hash: IDL.Opt(IDL.Text),
    participating_executors: IDL.Vec(IDL.Principal),
    attestations: IDL.Vec(BuildAttestation),
    consensus_confidence: IDL.Float32,
    disputed_results: IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Text)), // executor -> hash
    finalization_time: IDL.Nat64
});

type ConsensusResult = {
    consensus_reached: boolean;
    agreed_artifact_hash: string | null;
    participating_executors: Principal[];
    attestations: BuildAttestation[];
    consensus_confidence: number;
    disputed_results: [Principal, string][];
    finalization_time: bigint;
};

/**
 * Incentive and payment tracking
 */
const ExecutorReward = IDL.Record({
    executor_id: IDL.Principal,
    build_id: IDL.Text,
    reward_amount: IDL.Nat64, // In cycles or tokens
    reward_type: IDL.Variant({
        BaseReward: IDL.Null,        // Basic participation reward
        QualityBonus: IDL.Float32,   // Bonus for consistent quality
        SpeedBonus: IDL.Float32,     // Bonus for fast execution
        ConsensusBonus: IDL.Float32  // Bonus for consensus participation
    }),
    payment_status: IDL.Variant({
        Pending: IDL.Null,
        Paid: IDL.Nat64,
        Disputed: IDL.Text
    })
});

type ExecutorReward = {
    executor_id: Principal;
    build_id: string;
    reward_amount: bigint;
    reward_type: 
        | { BaseReward: null }
        | { QualityBonus: number }
        | { SpeedBonus: number }
        | { ConsensusBonus: number };
    payment_status:
        | { Pending: null }
        | { Paid: bigint }
        | { Disputed: string };
};

/**
 * Executor identity and registration
 */
const ExecutorIdentity = IDL.Record({
    executor_id: IDL.Principal,
    public_key: IDL.Vec(IDL.Nat8),
    endpoint_url: IDL.Text,
    capabilities: AgentCapabilities,
    stake_amount: IDL.Nat64,
    registration_time: IDL.Nat64,
    operational_model: IDL.Variant({
        PublicNetwork: IDL.Null,      // Participates in public decentralized network
        PrivateEnterprise: IDL.Text,  // Private pool identifier
        HybridSaaS: IDL.Text         // SaaS provider identifier
    }),
    geographic_region: IDL.Text,
    compliance_certifications: IDL.Vec(IDL.Text),
    pricing_model: IDL.Record({
        base_rate_per_minute: IDL.Nat64,  // In cycles or tokens
        quality_multiplier: IDL.Float32,   // Reputation-based pricing
        volume_discounts: IDL.Vec(IDL.Tuple(IDL.Nat32, IDL.Float32)) // (threshold, discount)
    })
});

type ExecutorIdentity = {
    executor_id: Principal;
    public_key: number[];
    endpoint_url: string;
    capabilities: AgentCapabilities;
    stake_amount: bigint;
    registration_time: bigint;
    operational_model: 
        | { PublicNetwork: null }
        | { PrivateEnterprise: string }
        | { HybridSaaS: string };
    geographic_region: string;
    compliance_certifications: string[];
    pricing_model: {
        base_rate_per_minute: bigint;
        quality_multiplier: number;
        volume_discounts: [number, number][];
    };
};

// ============================================================================
// CANISTER STATE
// ============================================================================

export default class BuildExecutorCanister {
    // Stable storage for build execution history
    private buildHistory = new StableBTreeMap<string, ExecuteBuildResult>(0);
    
    // Agent pool management (Phase 1 Enhancement)
    private agentCapabilities: AgentCapabilities = {
        labels: [],
        max_concurrent_builds: 1,
        available_resources: {
            cpu_cores: 1,
            memory_mb: 1024,
            disk_space_gb: 10,
            network_bandwidth: 100
        },
        supported_languages: [],
        installed_tools: []
    };
    private buildQueue: BuildQueue = {
        pending_builds: [],
        running_builds: new Map(),
        completed_builds: new Map(),
        max_queue_size: 100
    };
    private agentHealth: AgentHealth = {
        agent_id: Principal.fromText("2vxsx-fae"), // Default agent ID
        last_heartbeat: BigInt(Date.now() * 1000000), // Convert to nanoseconds
        cpu_usage: 0,
        memory_usage: 0,
        active_builds: 0,
        queue_length: 0,
        status: { Online: null },
        uptime: 0n
    };
    private currentResourceUsage: ResourceUsage = {
        cpu_time_ms: 0n,
        memory_peak_mb: 0,
        disk_used_gb: 0,
        network_bytes: 0n
    };
    
    // Store the last successful build hash for quick retrieval
    private lastSuccessfulHash: string = '';
    
    // Configuration
    private buildInstructionsCanisterId: Principal = Principal.fromText('uxrrr-q7777-77774-qaaaq-cai'); // Replace with actual canister ID
    private verificationCanisterPrincipal: Principal = Principal.fromText('2vxsx-fae'); // Replace with verification canister principal
    private adminPrincipal: Principal = Principal.fromText('2vxsx-fae'); // Admin for configuration
    
    // Security configuration
    private readonly MAX_BUILD_TIME_MS = 300000; // 5 minutes max build time
    private readonly MAX_ARTIFACT_SIZE = 100 * 1024 * 1024; // 100MB max artifact size
    private readonly TEMP_DIR_PREFIX = '/tmp/ic_build_';
    
    // Canister metadata
    private canisterVersion: string = '1.0.0';
    private deployedAt: bigint = 0n;

    // ============================================================================
    // DECENTRALIZED EXECUTOR POOL STATE (Enhanced)
    // ============================================================================
    
    // Registry of all build executors in the network
    private executorRegistry = new StableBTreeMap<Principal, ExecutorIdentity>(1);
    
    // Track active consensus processes
    private activeConsensus = new Map<string, {
        build_id: string;
        required_confirmations: number;
        received_attestations: BuildAttestation[];
        timeout: bigint;
        consensus_threshold: number; // Percentage required for consensus
    }>();
    
    // Executor performance tracking
    private executorPerformance = new StableBTreeMap<Principal, {
        total_builds: number;
        successful_builds: number;
        average_build_time: bigint;
        reputation_score: number;
        last_active: bigint;
        stake_amount: bigint;
        slashing_events: number;
    }>(2);
    
    // Payment and incentive tracking
    private pendingRewards = new StableBTreeMap<string, ExecutorReward>(3);
    private rewardHistory = new StableBTreeMap<string, ExecutorReward>(4);
    
    // Network configuration for different operational models
    private networkConfig = {
        consensus_threshold: 0.67, // 67% agreement required
        minimum_executors: 3,
        maximum_executors: 100,
        base_reward_per_build: 1000000n, // Base cycles reward
        reputation_decay_rate: 0.01,
        slashing_penalty: 0.1, // 10% of stake
        executor_timeout_seconds: 600n // 10 minutes
    };

    // ============================================================================
    // SIMULATED OFF-CHAIN AGENT STATE
    // ============================================================================
    
    // Simulated off-chain executors
    private simulatedExecutors = new Map<Principal, {
        identity: ExecutorIdentity;
        isOnline: boolean;
        currentLoad: number;
        successRate: number;
        averageResponseTime: number;
        lastSeen: bigint;
    }>();
    
    // Track simulated builds being processed by off-chain agents
    private offChainBuilds = new Map<string, {
        buildId: string;
        projectId: string;
        version: string;
        assignedExecutors: Principal[];
        status: 'pending' | 'executing' | 'consensus' | 'completed' | 'failed';
        startTime: bigint;
        expectedCompletion: bigint;
        attestations: BuildAttestation[];
    }>();
    
    // Simulation configuration
    private simulationConfig = {
        enabled: true,
        simulatedExecutorCount: 5,
        consensusDelay: 3000, // 3 seconds for simulation
        buildExecutionDelay: 5000, // 5 seconds for simulated build
        failureRate: 0.1, // 10% chance of executor failure
        networkDelay: 500, // 500ms network simulation
    };

    // ============================================================================
    // LIFECYCLE HOOKS
    // ============================================================================

    /**
     * Initialize the canister
     */
    @init([])
    init(): void {
        this.deployedAt = time();
        
        // Initialize agent capabilities (Phase 1 Enhancement)
        this.agentCapabilities = {
            labels: ['linux', 'typescript', 'node', 'docker'],
            max_concurrent_builds: 3,
            available_resources: {
                cpu_cores: 4,
                memory_mb: 8192,
                disk_space_gb: 100,
                network_bandwidth: 1000
            },
            supported_languages: ['typescript', 'javascript', 'python', 'rust'],
            installed_tools: ['node', 'npm', 'docker', 'git', 'rustc', 'cargo']
        };
        
        // Initialize build queue
        this.buildQueue = {
            pending_builds: [],
            running_builds: new Map(),
            completed_builds: new Map(),
            max_queue_size: 50
        };
        
        // Initialize agent health
        this.agentHealth = {
            agent_id: Principal.fromText('2vxsx-fae'), // This agent's ID
            last_heartbeat: time(),
            cpu_usage: 0,
            memory_usage: 0,
            active_builds: 0,
            queue_length: 0,
            status: { Online: null },
            uptime: 0n
        };
        
        // Initialize resource usage tracking
        this.currentResourceUsage = {
            cpu_time_ms: 0n,
            memory_peak_mb: 0,
            disk_used_gb: 0,
            network_bytes: 0n
        };
        
        // Initialize simulated off-chain executors
        this.initializeSimulatedExecutors();
        
        console.log(`Build Executor Canister initialized at ${this.deployedAt}`);
        console.log(`Build Instructions Canister ID: ${this.buildInstructionsCanisterId.toText()}`);
        console.log(`Verification Canister Principal: ${this.verificationCanisterPrincipal.toText()}`);
        console.log(`Agent capabilities: ${JSON.stringify(this.agentCapabilities)}`);
        console.log(`Simulated off-chain executors: ${this.simulatedExecutors.size}`);
    }

    /**
     * Post-upgrade hook
     */
    @postUpgrade([])
    postUpgrade(): void {
        console.log(`Build Executor Canister upgraded at ${time()}`);
        console.log(`Current version: ${this.canisterVersion}`);
        console.log(`Total builds executed: ${this.buildHistory.len()}`);
    }

    // ============================================================================
    // ACCESS CONTROL
    // ============================================================================

    /**
     * Check if caller is authorized to request builds
     */
    private isAuthorizedRequester(caller: Principal): boolean {
        return caller.toText() === this.verificationCanisterPrincipal.toText() ||
               caller.toText() === this.adminPrincipal.toText();
    }

    /**
     * Check if caller is admin
     */
    private isAdmin(caller: Principal): boolean {
        return caller.toText() === this.adminPrincipal.toText();
    }

    // ============================================================================
    // SECURITY VALIDATION
    // ============================================================================

    /**
     * Validate and sanitize build instructions for security
     */
    private validateBuildInstructions(instructions: string): string | null {
        // Basic validation
        if (!instructions || instructions.trim().length === 0) {
            return 'Build instructions cannot be empty';
        }

        if (instructions.length > 50000) {
            return 'Build instructions too long (max 50KB)';
        }

        // Security patterns to block
        const dangerousPatterns = [
            // File system operations
            /rm\s+-rf|rm\s+--recursive|rmdir/i,
            /\$\(.*\)|`.*`/,                    // Command substitution
            /eval\s*\(|exec\s*\(/i,            // Code execution
            /sudo\s+|su\s+/i,                  // Privilege escalation
            /chmod\s+.*777|chmod\s+\+x/i,      // Dangerous permissions
            /wget\s+.*\|\s*sh|curl\s+.*\|\s*sh/i, // Download and execute
            /\/dev\/|\/proc\/|\/sys\//i,       // System directories
            /nc\s+|netcat\s+|telnet\s+/i,      // Network tools
            /mkfifo|mknod/i,                   // Device creation
            /\/etc\/passwd|\/etc\/shadow/i,    // System files
            /history\s+-c|unset\s+HISTFILE/i,  // History manipulation
            /python\s+-c|perl\s+-e|ruby\s+-e/i, // Inline code execution
            />\s*\/dev\/tcp|>\s*\/dev\/udp/i,  // Network redirection
            /iptables|ufw|firewall/i,          // Firewall manipulation
            /systemctl|service\s+/i,           // System services
            /crontab|at\s+\d/i,                // Job scheduling
            /ssh\s+|scp\s+|rsync\s+/i,         // Remote access
            /docker\s+|kubernetes\s+|kubectl\s+/i, // Container escape
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(instructions)) {
                return `Security violation: Instructions contain potentially dangerous pattern: ${pattern.source}`;
            }
        }

        // Check for excessive special characters
        const specialCharCount = (instructions.match(/[;&|`$(){}[\]<>]/g) || []).length;
        if (specialCharCount > instructions.length * 0.15) {
            return 'Security violation: Excessive special characters detected';
        }

        // Must contain safe build commands
        const safeBuildPatterns = [
            /npm\s+(install|ci|run|build)/i,
            /yarn\s+(install|build)/i,
            /make\s+/i,
            /cmake\s+/i,
            /gradle\s+/i,
            /mvn\s+/i,
            /cargo\s+(build|test)/i,
            /go\s+(build|mod)/i,
            /pip\s+install/i,
            /python\s+setup\.py/i
        ];

        const hasSafeBuildCommand = safeBuildPatterns.some(pattern => pattern.test(instructions));
        if (!hasSafeBuildCommand) {
            return 'Security violation: Instructions must contain recognized build commands';
        }

        return null;
    }

    /**
     * Create a secure sandbox directory for build execution
     */
    private createSandboxEnvironment(): string {
        const tempDir = fs.mkdtempSync(this.TEMP_DIR_PREFIX);
        
        // Set restrictive permissions
        try {
            fs.chmodSync(tempDir, 0o700);
        } catch (error) {
            console.log(`Warning: Could not set directory permissions: ${error}`);
        }

        return tempDir;
    }

    /**
     * Clean up sandbox environment
     */
    private cleanupSandbox(sandboxDir: string): void {
        try {
            if (fs.existsSync(sandboxDir)) {
                fs.rmSync(sandboxDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.log(`Warning: Could not clean up sandbox: ${error}`);
        }
    }

    // ============================================================================
    // BUILD EXECUTION
    // ============================================================================

    /**
     * Execute build instructions in a secure sandbox
     */
    private async executeBuildInstructions(
        instructions: string, 
        sandboxDir: string
    ): Promise<{ success: boolean; error: string; artifactPath?: string }> {
        try {
            // Create a safe script file
            const scriptPath = path.join(sandboxDir, 'build.sh');
            const safeInstructions = `#!/bin/bash
set -e
cd "${sandboxDir}"
${instructions}
`;

            fs.writeFileSync(scriptPath, safeInstructions, { mode: 0o755 });

            // Since execSync is not available in IC canisters, we'll simulate build execution
            // In a real implementation, this would need to be handled by an external service
            console.log(`Simulating build execution for script: ${scriptPath}`);
            console.log(`Build instructions: ${instructions}`);
            
            // Simulate some build time
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Create a mock build artifact directory
            const mockBuildDir = path.join(sandboxDir, 'dist');
            try {
                fs.mkdirSync(mockBuildDir, { recursive: true });
                // Create a simple artifact file
                fs.writeFileSync(path.join(mockBuildDir, 'output.js'), `// Mock build output\nconsole.log('Built at ${new Date().toISOString()}');\n`);
            } catch (error) {
                console.log(`Error creating mock build: ${error}`);
            }

            // Find the build artifact (look for common build output directories)
            const commonArtifactPaths = [
                'dist',
                'build',
                'target',
                'out',
                'bin',
                '.next',
                'public'
            ];

            let artifactPath: string | undefined;
            for (const artifactDir of commonArtifactPaths) {
                const fullPath = path.join(sandboxDir, artifactDir);
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                    artifactPath = fullPath;
                    break;
                }
            }

            // If no common artifact directory found, look for any new files
            if (!artifactPath) {
                const files = fs.readdirSync(sandboxDir);
                const newFiles = files.filter(file => 
                    file !== 'build.sh' && 
                    fs.statSync(path.join(sandboxDir, file)).isFile()
                );
                
                if (newFiles.length > 0) {
                    artifactPath = path.join(sandboxDir, newFiles[0]);
                }
            }

            return {
                success: true,
                error: '',
                artifactPath
            };

        } catch (error: any) {
            console.log(`Build execution failed: ${error.message}`);
            return {
                success: false,
                error: error.message || 'Unknown build error',
                artifactPath: undefined
            };
        }
    }

    /**
     * Generate simple hash of build artifact (simplified version without crypto)
     */
    private generateArtifactHash(artifactPath: string): { hash: string; size: number } {
        try {
            let contentString = '';
            let totalSize = 0;

            const processPath = (filePath: string) => {
                const stats = fs.statSync(filePath);
                
                if (stats.isDirectory()) {
                    const files = fs.readdirSync(filePath);
                    files.sort(); // Ensure consistent ordering
                    
                    for (const file of files) {
                        processPath(path.join(filePath, file));
                    }
                } else if (stats.isFile()) {
                    const data = fs.readFileSync(filePath, 'utf8');
                    const relativePath = filePath.replace(artifactPath, '');
                    contentString += relativePath + data;
                    totalSize += data.length;
                }
            };

            processPath(artifactPath);

            // Simple hash function (not cryptographically secure but deterministic)
            let hash = 0;
            for (let i = 0; i < contentString.length; i++) {
                const char = contentString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            // Convert to hex string
            const hashHex = Math.abs(hash).toString(16).padStart(8, '0');

            return {
                hash: `simple_${hashHex}_${totalSize}`,
                size: totalSize
            };

        } catch (error) {
            throw new Error(`Failed to generate hash: ${error}`);
        }
    }

    // ============================================================================
    // PUBLIC METHODS
    // ============================================================================

    /**
     * Execute build for a project and version
     */
    @update([IDL.Text, IDL.Text], BuildExecutorResult)
    async executeBuild(projectId: string, version: string): Promise<BuildExecutorResult> {
        const startTime = time();
        const startCycles = performanceCounter(0);
        const caller = msgCaller();

        try {
            // Check authorization
            if (!this.isAuthorizedRequester(caller)) {
                return {
                    Err: {
                        Unauthorized: `Caller ${caller.toText()} is not authorized to request builds`
                    }
                };
            }

            // Validate input
            if (!projectId || !version) {
                return {
                    Err: {
                        InvalidInput: 'Project ID and version are required'
                    }
                };
            }

            console.log(`Starting build execution for ${projectId}@${version}`);

            // If simulation is enabled and we have enough executors, use distributed execution
            if (this.simulationConfig.enabled) {
                const onlineExecutors = Array.from(this.simulatedExecutors.values())
                    .filter(e => e.isOnline).length;
                
                if (onlineExecutors >= this.networkConfig.minimum_executors) {
                    console.log(`Using distributed execution with ${onlineExecutors} online executors`);
                    return await this.executeDistributedBuild(projectId, version);
                }
            }

            // Fall back to local execution
            console.log(`Using local execution (simulation disabled or insufficient executors)`);

            // Retrieve build instructions from build_instructions_canister
            const instructionsResult = await call(
                this.buildInstructionsCanisterId,
                'getInstructions',
                {
                    paramIdlTypes: [IDL.Text, IDL.Text],
                    returnIdlType: BuildInstructionsResult,
                    args: [projectId, version]
                }
            );

            if ('Err' in instructionsResult) {
                return {
                    Err: {
                        NotFound: `Build instructions not found for ${projectId}@${version}`
                    }
                };
            }

            const buildInstructions = instructionsResult.Ok;

            // Validate build instructions for security
            const validationError = this.validateBuildInstructions(buildInstructions.instruction_set);
            if (validationError) {
                return {
                    Err: {
                        SecurityViolation: validationError
                    }
                };
            }

            // Create sandbox environment
            const sandboxDir = this.createSandboxEnvironment();
            console.log(`Created sandbox: ${sandboxDir}`);

            let buildResult: ExecuteBuildResult;

            try {
                // Execute build instructions
                const execution = await this.executeBuildInstructions(
                    buildInstructions.instruction_set,
                    sandboxDir
                );

                const endTime = time();
                const endCycles = performanceCounter(0);
                const cyclesConsumed = BigInt(Number(endCycles) - Number(startCycles));

                if (execution.success && execution.artifactPath) {
                    // Generate hash of build artifact
                    const { hash, size } = this.generateArtifactHash(execution.artifactPath);

                    // Check artifact size
                    if (size > this.MAX_ARTIFACT_SIZE) {
                        throw new Error(`Artifact too large: ${size} bytes (max: ${this.MAX_ARTIFACT_SIZE})`);
                    }

                    buildResult = {
                        success: true,
                        hash: hash,
                        error: '',
                        cycles_consumed: cyclesConsumed,
                        build_time: endTime - startTime,
                        artifact_size: size
                    };

                    // Update last successful hash
                    this.lastSuccessfulHash = hash;

                } else {
                    buildResult = {
                        success: false,
                        hash: '',
                        error: execution.error,
                        cycles_consumed: cyclesConsumed,
                        build_time: endTime - startTime,
                        artifact_size: 0
                    };
                }

                // Store in history
                const historyKey = `${projectId}#${version}#${startTime}`;
                this.buildHistory.insert(historyKey, buildResult);

                console.log(`Build completed: ${buildResult.success ? 'SUCCESS' : 'FAILED'}`);
                return { Ok: buildResult };

            } finally {
                // Always cleanup sandbox
                this.cleanupSandbox(sandboxDir);
            }

        } catch (error: any) {
            const endTime = time();
            const endCycles = performanceCounter(0);
            const cyclesConsumed = BigInt(Number(endCycles) - Number(startCycles));

            console.log(`Build execution error: ${error.message}`);

            const errorResult: ExecuteBuildResult = {
                success: false,
                hash: '',
                error: error.message || 'Unknown error',
                cycles_consumed: cyclesConsumed,
                build_time: endTime - startTime,
                artifact_size: 0
            };

            return {
                Err: {
                    InternalError: `Build execution failed: ${error.message}`
                }
            };
        }
    }

    /**
     * Get hash of last successful build
     */
    @query([], HashResult)
    getHash(): HashResult {
        if (!this.lastSuccessfulHash) {
            return {
                Err: {
                    NotFound: 'No successful builds have been executed'
                }
            };
        }

        return { Ok: this.lastSuccessfulHash };
    }

    /**
     * Get build history with pagination
     */
    @query([IDL.Opt(IDL.Nat32), IDL.Opt(IDL.Nat32)], IDL.Vec(ExecuteBuildResult))
    getBuildHistory(offset?: number, limit?: number): ExecuteBuildResult[] {
        try {
            const history: ExecuteBuildResult[] = [];
            
            for (const [_, result] of this.buildHistory.items()) {
                history.push(result);
            }

            // Sort by build time (newest first)
            history.sort((a, b) => Number(b.build_time - a.build_time));
            
            // Apply pagination
            const startIndex = offset || 0;
            const endIndex = limit ? startIndex + limit : history.length;
            
            return history.slice(startIndex, endIndex);

        } catch (error) {
            console.log(`Error getting build history: ${error}`);
            return [];
        }
    }

    /**
     * Update build instructions canister ID (admin only)
     */
    @update([IDL.Principal], IDL.Variant({ Ok: IDL.Null, Err: BuildExecutorError }))
    updateBuildInstructionsCanister(canisterId: Principal): { Ok: null } | { Err: BuildExecutorError } {
        const caller = msgCaller();

        if (!this.isAdmin(caller)) {
            return {
                Err: {
                    Unauthorized: `Caller ${caller.toText()} is not authorized to update configuration`
                }
            };
        }

        this.buildInstructionsCanisterId = canisterId;
        console.log(`Build instructions canister updated to: ${canisterId.toText()}`);

        return { Ok: null };
    }

    /**
     * Update verification canister principal (admin only)
     */
    @update([IDL.Principal], IDL.Variant({ Ok: IDL.Null, Err: BuildExecutorError }))
    updateVerificationCanister(principal: Principal): { Ok: null } | { Err: BuildExecutorError } {
        const caller = msgCaller();

        if (!this.isAdmin(caller)) {
            return {
                Err: {
                    Unauthorized: `Caller ${caller.toText()} is not authorized to update configuration`
                }
            };
        }

        this.verificationCanisterPrincipal = principal;
        console.log(`Verification canister principal updated to: ${principal.toText()}`);

        return { Ok: null };
    }

    /**
     * Health check endpoint
     */
    @query([], IDL.Text)
    healthCheck(): string {
        return `Build Executor Canister v${this.canisterVersion} - OK`;
    }

    /**
     * Get canister statistics
     */
    @query([], IDL.Record({
        total_builds: IDL.Nat32,
        successful_builds: IDL.Nat32,
        failed_builds: IDL.Nat32,
        last_successful_hash: IDL.Text,
        canister_version: IDL.Text,
        deployed_at: IDL.Nat64,
        build_instructions_canister: IDL.Principal,
        verification_canister: IDL.Principal
    }))
    getStatistics(): {
        total_builds: number;
        successful_builds: number;
        failed_builds: number;
        last_successful_hash: string;
        canister_version: string;
        deployed_at: bigint;
        build_instructions_canister: Principal;
        verification_canister: Principal;
    } {
        try {
            let totalBuilds = 0;
            let successfulBuilds = 0;
            let failedBuilds = 0;

            for (const [_, result] of this.buildHistory.items()) {
                totalBuilds++;
                if (result.success) {
                    successfulBuilds++;
                } else {
                    failedBuilds++;
                }
            }

            return {
                total_builds: totalBuilds,
                successful_builds: successfulBuilds,
                failed_builds: failedBuilds,
                last_successful_hash: this.lastSuccessfulHash,
                canister_version: this.canisterVersion,
                deployed_at: this.deployedAt,
                build_instructions_canister: this.buildInstructionsCanisterId,
                verification_canister: this.verificationCanisterPrincipal
            };

        } catch (error) {
            console.log(`Error getting statistics: ${error}`);
            return {
                total_builds: 0,
                successful_builds: 0,
                failed_builds: 0,
                last_successful_hash: '',
                canister_version: this.canisterVersion,
                deployed_at: this.deployedAt,
                build_instructions_canister: this.buildInstructionsCanisterId,
                verification_canister: this.verificationCanisterPrincipal
            };
        }
    }

    // ============================================================================
    // AGENT POOL MANAGEMENT (Phase 1 Enhancement)
    // ============================================================================

    /**
     * Get agent capabilities
     */
    @query([], AgentCapabilities)
    getAgentCapabilities(): AgentCapabilities {
        return this.agentCapabilities;
    }

    /**
     * Update agent capabilities (admin only)
     */
    @update([AgentCapabilities], IDL.Bool)
    updateAgentCapabilities(capabilities: AgentCapabilities): boolean {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            console.log(`Unauthorized attempt to update agent capabilities by ${caller.toText()}`);
            return false;
        }

        this.agentCapabilities = capabilities;
        console.log(`Agent capabilities updated by ${caller.toText()}`);
        return true;
    }

    /**
     * Get current agent health
     */
    @query([], IDL.Record({
        agent_id: IDL.Principal,
        last_heartbeat: IDL.Nat64,
        cpu_usage: IDL.Float32,
        memory_usage: IDL.Float32,
        active_builds: IDL.Nat32,
        queue_length: IDL.Nat32,
        status: IDL.Text,
        uptime: IDL.Nat64
    }))
    getAgentHealth(): any {
        // Update health metrics
        this.updateHealthMetrics();
        
        return {
            agent_id: this.agentHealth.agent_id,
            last_heartbeat: this.agentHealth.last_heartbeat,
            cpu_usage: this.agentHealth.cpu_usage,
            memory_usage: this.agentHealth.memory_usage,
            active_builds: this.agentHealth.active_builds,
            queue_length: this.agentHealth.queue_length,
            status: Object.keys(this.agentHealth.status)[0],
            uptime: this.agentHealth.uptime
        };
    }

    /**
     * Get build queue status
     */
    @query([], IDL.Record({
        pending_builds: IDL.Nat32,
        running_builds: IDL.Nat32,
        completed_builds: IDL.Nat32,
        max_queue_size: IDL.Nat32,
        queue_utilization: IDL.Float32
    }))
    getBuildQueueStatus(): any {
        const pending = this.buildQueue.pending_builds.length;
        const running = this.buildQueue.running_builds.size;
        const completed = this.buildQueue.completed_builds.size;
        const utilization = (pending + running) / this.buildQueue.max_queue_size;

        return {
            pending_builds: pending,
            running_builds: running,
            completed_builds: completed,
            max_queue_size: this.buildQueue.max_queue_size,
            queue_utilization: utilization
        };
    }

    /**
     * Get resource usage
     */
    @query([], IDL.Record({
        cpu_time_ms: IDL.Nat64,
        memory_peak_mb: IDL.Nat32,
        disk_used_gb: IDL.Nat32,
        network_bytes: IDL.Nat64,
        resource_efficiency: IDL.Float32
    }))
    getResourceUsage(): any {
        const efficiency = this.calculateResourceEfficiency();
        
        return {
            cpu_time_ms: this.currentResourceUsage.cpu_time_ms,
            memory_peak_mb: this.currentResourceUsage.memory_peak_mb,
            disk_used_gb: this.currentResourceUsage.disk_used_gb,
            network_bytes: this.currentResourceUsage.network_bytes,
            resource_efficiency: efficiency
        };
    }

    /**
     * Queue a build request
     */
    @update([BuildRequest], IDL.Bool)
    queueBuildRequest(request: BuildRequest): boolean {
        // Check queue capacity
        if (this.buildQueue.pending_builds.length >= this.buildQueue.max_queue_size) {
            console.log(`Build queue full, rejecting request for ${request.project_id}:${request.version}`);
            return false;
        }

        // Add to queue
        this.buildQueue.pending_builds.push(request);
        console.log(`Build request queued for ${request.project_id}:${request.version}`);
        
        // Update health metrics
        this.updateHealthMetrics();
        
        return true;
    }

    /**
     * Process next build in queue
     */
    @update([], IDL.Bool)
    processNextBuild(): boolean {
        // Check if we can process more builds
        if (this.buildQueue.running_builds.size >= this.agentCapabilities.max_concurrent_builds) {
            console.log(`Max concurrent builds reached (${this.agentCapabilities.max_concurrent_builds})`);
            return false;
        }

        // Get next build from queue
        const next_build = this.buildQueue.pending_builds.shift();
        if (!next_build) {
            console.log('No builds in queue');
            return false;
        }

        // Create build execution
        const build_id = `${next_build.project_id}_${next_build.version}_${time()}`;
        const build_execution: BuildExecution = {
            build_id,
            project_id: next_build.project_id,
            version: next_build.version,
            started_at: time(),
            current_stage: 'initializing',
            allocated_resources: this.allocateResources(),
            estimated_completion: time() + 900_000_000_000n, // 15 minutes
            priority: 1
        };

        // Add to running builds
        this.buildQueue.running_builds.set(build_id, build_execution);
        
        console.log(`Started processing build: ${build_id}`);
        
        // Update health metrics
        this.updateHealthMetrics();
        
        return true;
    }

    /**
     * Cancel a build
     */
    @update([IDL.Text], IDL.Bool)
    cancelBuild(build_id: string): boolean {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            console.log(`Unauthorized attempt to cancel build by ${caller.toText()}`);
            return false;
        }

        // Remove from running builds
        if (this.buildQueue.running_builds.has(build_id)) {
            this.buildQueue.running_builds.delete(build_id);
            console.log(`Build cancelled: ${build_id}`);
            return true;
        }

        // Remove from pending builds
        const index = this.buildQueue.pending_builds.findIndex(
            req => `${req.project_id}_${req.version}` === build_id
        );
        if (index !== -1) {
            this.buildQueue.pending_builds.splice(index, 1);
            console.log(`Pending build cancelled: ${build_id}`);
            return true;
        }

        console.log(`Build not found: ${build_id}`);
        return false;
    }

    // ============================================================================
    // HELPER METHODS FOR AGENT POOL MANAGEMENT
    // ============================================================================

    /**
     * Update health metrics
     */
    private updateHealthMetrics(): void {
        this.agentHealth.last_heartbeat = time();
        this.agentHealth.active_builds = this.buildQueue.running_builds.size;
        this.agentHealth.queue_length = this.buildQueue.pending_builds.length;
        this.agentHealth.uptime = time() - this.deployedAt;
        
        // Simple health status logic
        if (this.agentHealth.active_builds >= this.agentCapabilities.max_concurrent_builds) {
            this.agentHealth.status = { Overloaded: null };
        } else {
            this.agentHealth.status = { Online: null };
        }
    }

    /**
     * Allocate resources for a build
     */
    private allocateResources(): ResourceSpec {
        const total_builds = this.buildQueue.running_builds.size + 1;
        const cpu_per_build = Math.floor(this.agentCapabilities.available_resources.cpu_cores / total_builds);
        const memory_per_build = Math.floor(this.agentCapabilities.available_resources.memory_mb / total_builds);
        
        return {
            cpu_cores: Math.max(1, cpu_per_build),
            memory_mb: Math.max(512, memory_per_build),
            disk_space_gb: Math.floor(this.agentCapabilities.available_resources.disk_space_gb / 4), // 25% of available disk
            network_bandwidth: this.agentCapabilities.available_resources.network_bandwidth
        };
    }

    /**
     * Calculate resource efficiency
     */
    private calculateResourceEfficiency(): number {
        const total_builds = Number(this.buildHistory.len());
        if (total_builds === 0) return 0;
        
        // Simple efficiency calculation based on successful builds
        const items = this.buildHistory.items();
        const successful_builds = items.filter(([_, result]) => result.success).length;
        
        return successful_builds / total_builds;
    }

    // ============================================================================
    // PIPELINE EXECUTION METHODS (NEW)
    // ============================================================================

    /**
     * Execute complete pipeline with multiple stages
     */
    @update([PipelineExecutionRequest])
    async executePipeline(request: PipelineExecutionRequest): Promise<PipelineResult> {
        try {
            const caller = msgCaller();
            const startTime = time();
            const pipelineId = `pipeline_${request.repository_id}_${request.commit_hash}`;
            
            console.log(`Starting pipeline execution: ${pipelineId}`);

            // Parse pipeline configuration
            let pipelineConfig;
            try {
                pipelineConfig = JSON.parse(request.pipeline_config);
            } catch (error) {
                return {
                    Err: { InvalidInput: `Invalid pipeline configuration: ${error}` }
                };
            }

            // Initialize pipeline execution tracking
            let totalCyclesConsumed = 0n;
            let totalMemoryUsed = 0;
            let overallSuccess = true;
            const stageResults: StageExecutionResult[] = [];

            // Step 1: Fetch source code
            const sourceCode = await this.fetchSourceCode(request.source_url, request.commit_hash);
            if (!sourceCode) {
                return {
                    Err: { InternalError: 'Failed to fetch source code' }
                };
            }

            // Step 2: Execute stages in dependency order
            const stageOrder = this.calculateStageExecutionOrder(pipelineConfig.stages);
            
            for (const stageName of stageOrder) {
                const stage = pipelineConfig.stages.find((s: any) => s.name === stageName);
                if (!stage) {
                    overallSuccess = false;
                    break;
                }

                console.log(`Executing stage: ${stageName}`);
                
                const stageResult = await this.executeStage(
                    stage,
                    sourceCode,
                    this.getStageArtifacts(stageResults, stage.depends_on)
                );

                stageResults.push(stageResult);
                totalCyclesConsumed += stageResult.cycles_consumed;
                totalMemoryUsed = Math.max(totalMemoryUsed, stageResult.memory_used);

                if (!stageResult.success) {
                    console.log(`Stage failed: ${stageName} - ${stageResult.error_message}`);
                    overallSuccess = false;
                    break;
                }
            }

            const endTime = time();

            const result: PipelineExecutionResult = {
                pipeline_id: pipelineId,
                repository_id: request.repository_id,
                commit_hash: request.commit_hash,
                overall_success: overallSuccess,
                stages: stageResults,
                start_time: startTime,
                end_time: endTime,
                total_cycles_consumed: totalCyclesConsumed,
                total_memory_used: totalMemoryUsed,
                verification_required: overallSuccess && stageResults.length > 1
            };

            // Store pipeline execution result
            this.storePipelineResult(pipelineId, result);

            console.log(`Pipeline execution completed: ${pipelineId}, Success: ${overallSuccess}`);
            
            return { Ok: result };

        } catch (error) {
            console.log(`Pipeline execution error: ${error}`);
            return {
                Err: { InternalError: `Pipeline execution failed: ${error}` }
            };
        }
    }

    /**
     * Execute a single pipeline stage
     */
    private async executeStage(
        stage: any,
        sourceCode: Uint8Array,
        artifacts: Map<string, Uint8Array>
    ): Promise<StageExecutionResult> {
        const startTime = time();
        const startCycles = performanceCounter(1); // Instruction counter

        try {
            // Setup execution environment
            const workDir = await this.setupStageWorkspace(stage, sourceCode, artifacts);
            
            // Execute stage commands
            const executionResults = await this.executeStageCommands(stage, workDir);
            
            // Collect artifacts
            const stageArtifacts = await this.collectStageArtifacts(stage, workDir);
            
            // Cleanup workspace
            await this.cleanupWorkspace(workDir);

            const endTime = time();
            const endCycles = performanceCounter(1);
            const cyclesConsumed = endCycles - startCycles;

            return {
                stage_name: stage.name,
                success: executionResults.success,
                start_time: startTime,
                end_time: endTime,
                exit_code: executionResults.exit_code,
                stdout: executionResults.stdout,
                stderr: executionResults.stderr,
                artifacts: stageArtifacts,
                cycles_consumed: BigInt(cyclesConsumed),
                memory_used: executionResults.memory_used,
                error_message: executionResults.error_message
            };

        } catch (error) {
            const endTime = time();
            const endCycles = performanceCounter(1);
            
            return {
                stage_name: stage.name,
                success: false,
                start_time: startTime,
                end_time: endTime,
                exit_code: -1,
                stdout: '',
                stderr: String(error),
                artifacts: [],
                cycles_consumed: BigInt(endCycles - startCycles),
                memory_used: 0,
                error_message: String(error)
            };
        }
    }

    /**
     * Fetch source code from repository
     */
    private async fetchSourceCode(sourceUrl: string, commitHash: string): Promise<Uint8Array | null> {
        try {
            // In a real implementation, this would:
            // 1. Clone the repository
            // 2. Checkout the specific commit
            // 3. Create a tar/zip archive of the source
            // 4. Return as binary data
            
            // For now, return mock source code
            console.log(`Fetching source code from ${sourceUrl} at commit ${commitHash}`);
            
            // Mock implementation - in reality this would use HTTP calls or IC HTTP outcalls
            const mockSource = JSON.stringify({
                repository_url: sourceUrl,
                commit_hash: commitHash,
                files: {
                    'src/main.mo': 'import Debug "mo:base/Debug"; Debug.print("Hello World");',
                    'dfx.json': '{"canisters": {"main": {"type": "motoko", "main": "src/main.mo"}}}'
                }
            });
            
            return new TextEncoder().encode(mockSource);
            
        } catch (error) {
            console.log(`Failed to fetch source code: ${error}`);
            return null;
        }
    }

    /**
     * Calculate stage execution order based on dependencies
     */
    private calculateStageExecutionOrder(stages: any[]): string[] {
        const stageMap = new Map<string, any>();
        const order: string[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        // Build stage map
        for (const stage of stages) {
            stageMap.set(stage.name, stage);
        }

        // Topological sort with dependency resolution
        const visit = (stageName: string): boolean => {
            if (visiting.has(stageName)) {
                throw new Error(`Circular dependency detected: ${stageName}`);
            }
            if (visited.has(stageName)) {
                return true;
            }

            visiting.add(stageName);
            const stage = stageMap.get(stageName);
            
            if (stage && stage.depends_on) {
                for (const dependency of stage.depends_on) {
                    if (!visit(dependency)) {
                        return false;
                    }
                }
            }

            visiting.delete(stageName);
            visited.add(stageName);
            order.push(stageName);
            return true;
        };

        // Visit all stages
        for (const stage of stages) {
            if (!visited.has(stage.name)) {
                visit(stage.name);
            }
        }

        return order;
    }

    /**
     * Get artifacts from previous stages
     */
    private getStageArtifacts(stageResults: StageExecutionResult[], dependencies: string[]): Map<string, Uint8Array> {
        const artifacts = new Map<string, Uint8Array>();
        
        for (const dependency of dependencies || []) {
            const dependencyResult = stageResults.find(r => r.stage_name === dependency);
            if (dependencyResult) {
                for (const [filename, data] of dependencyResult.artifacts) {
                    artifacts.set(filename, new Uint8Array(data));
                }
            }
        }

        return artifacts;
    }

    /**
     * Setup workspace for stage execution
     */
    private async setupStageWorkspace(
        stage: any,
        sourceCode: Uint8Array,
        artifacts: Map<string, Uint8Array>
    ): Promise<string> {
        // In a real implementation, this would:
        // 1. Create temporary directory
        // 2. Extract source code
        // 3. Copy artifacts from previous stages
        // 4. Set up stage-specific environment
        
        const workDir = `/tmp/stage_${stage.name}_${Date.now()}`;
        console.log(`Setting up workspace: ${workDir}`);
        
        // Mock setup - in reality would use file system operations
        return workDir;
    }

    /**
     * Execute stage commands
     */
    private async executeStageCommands(stage: any, workDir: string): Promise<{
        success: boolean;
        exit_code: number;
        stdout: string;
        stderr: string;
        memory_used: number;
        error_message: string | null;
    }> {
        try {
            console.log(`Executing commands for stage: ${stage.name}`);
            
            let combinedStdout = '';
            let combinedStderr = '';
            let success = true;
            
            for (const command of stage.commands) {
                console.log(`Running command: ${command}`);
                
                // Mock command execution
                // In reality, this would execute the command in a sandboxed environment
                if (command.includes('dfx build')) {
                    combinedStdout += 'Building canisters...\nBuild completed successfully.\n';
                } else if (command.includes('test')) {
                    combinedStdout += 'Running tests...\nAll tests passed.\n';
                } else if (command.includes('deploy')) {
                    combinedStdout += 'Deploying to IC...\nDeployment successful.\n';
                } else {
                    combinedStdout += `Executed: ${command}\n`;
                }
            }

            return {
                success: success,
                exit_code: success ? 0 : 1,
                stdout: combinedStdout,
                stderr: combinedStderr,
                memory_used: 128, // Mock memory usage in MB
                error_message: success ? null : 'Command execution failed'
            };

        } catch (error) {
            return {
                success: false,
                exit_code: -1,
                stdout: '',
                stderr: String(error),
                memory_used: 0,
                error_message: String(error)
            };
        }
    }

    /**
     * Collect stage artifacts
     */
    private async collectStageArtifacts(stage: any, workDir: string): Promise<[string, number[]][]> {
        const artifacts: [string, number[]][] = [];
        
        try {
            for (const artifactPattern of stage.artifacts || []) {
                // Mock artifact collection
                if (artifactPattern.includes('.wasm')) {
                    const mockWasm = new TextEncoder().encode('mock wasm binary');
                    artifacts.push([`${stage.name}.wasm`, Array.from(mockWasm)]);
                } else if (artifactPattern.includes('.xml')) {
                    const mockXml = new TextEncoder().encode('<testsuite><testcase name="test1" status="passed"/></testsuite>');
                    artifacts.push(['test-results.xml', Array.from(mockXml)]);
                }
            }
        } catch (error) {
            console.log(`Failed to collect artifacts: ${error}`);
        }

        return artifacts;
    }

    /**
     * Cleanup workspace
     */
    private async cleanupWorkspace(workDir: string): Promise<void> {
        try {
            console.log(`Cleaning up workspace: ${workDir}`);
            // In reality, would remove temporary directory and files
        } catch (error) {
            console.log(`Failed to cleanup workspace: ${error}`);
        }
    }

    /**
     * Store pipeline execution result
     */
    private storePipelineResult(pipelineId: string, result: PipelineExecutionResult): void {
        // Store in a separate map for pipeline results
        // For now, store as a build result for backward compatibility
        const buildResult: ExecuteBuildResult = {
            success: result.overall_success,
            hash: result.commit_hash,
            error: result.overall_success ? '' : 'Pipeline execution failed',
            cycles_consumed: result.total_cycles_consumed,
            build_time: result.end_time - result.start_time,
            artifact_size: result.total_memory_used
        };

        this.buildHistory.insert(pipelineId, buildResult);
    }

    /**
     * Get pipeline execution result
     */
    @query([IDL.Text])
    getPipelineResult(pipelineId: string): PipelineResult {
        const result = this.buildHistory.get(pipelineId);
        if (!result) {
            return {
                Err: { NotFound: `Pipeline result not found: ${pipelineId}` }
            };
        }

        // Convert back to pipeline result format
        // This is a simplified version - in reality you'd store the full pipeline result
        const pipelineResult: PipelineExecutionResult = {
            pipeline_id: pipelineId,
            repository_id: 'unknown', // Would be stored separately
            commit_hash: result.hash,
            overall_success: result.success,
            stages: [], // Would be stored separately
            start_time: 0n, // Would be stored separately
            end_time: result.build_time,
            total_cycles_consumed: result.cycles_consumed,
            total_memory_used: result.artifact_size,
            verification_required: result.success
        };

        return { Ok: pipelineResult };
    }

    // ============================================================================
    // DECENTRALIZED EXECUTOR NETWORK METHODS (Enhanced)
    // ============================================================================

    /**
     * Register a new build executor in the network
     */
    @update([ExecutorIdentity], IDL.Variant({ Ok: IDL.Null, Err: BuildExecutorError }))
    registerExecutor(identity: ExecutorIdentity): { Ok: null } | { Err: BuildExecutorError } {
        const caller = msgCaller();
        
        // Verify the caller matches the executor ID
        if (caller.toText() !== identity.executor_id.toText()) {
            return {
                Err: { Unauthorized: 'Caller must match executor ID' }
            };
        }

        // Validate minimum stake requirement
        const minStake = 10000000n; // 10M cycles minimum stake
        if (identity.stake_amount < minStake) {
            return {
                Err: { InvalidInput: `Minimum stake required: ${minStake} cycles` }
            };
        }

        // Store executor identity
        this.executorRegistry.insert(identity.executor_id, identity);
        
        // Initialize performance tracking
        this.executorPerformance.insert(identity.executor_id, {
            total_builds: 0,
            successful_builds: 0,
            average_build_time: 0n,
            reputation_score: 1.0, // Start with neutral reputation
            last_active: time(),
            stake_amount: identity.stake_amount,
            slashing_events: 0
        });

        console.log(`Executor registered: ${identity.executor_id.toText()}`);
        console.log(`Operational model: ${Object.keys(identity.operational_model)[0]}`);
        console.log(`Stake amount: ${identity.stake_amount}`);

        return { Ok: null };
    }

    /**
     * Submit build attestation for consensus
     */
    @update([BuildAttestation], IDL.Variant({ Ok: IDL.Null, Err: BuildExecutorError }))
    submitBuildAttestation(attestation: BuildAttestation): { Ok: null } | { Err: BuildExecutorError } {
        const caller = msgCaller();
        
        // Verify the caller is a registered executor
        const executorIdentity = this.executorRegistry.get(caller);
        if (!executorIdentity) {
            return {
                Err: { Unauthorized: 'Executor not registered' }
            };
        }

        // Verify the attestation is from the calling executor
        if (attestation.executor_id.toText() !== caller.toText()) {
            return {
                Err: { Unauthorized: 'Attestation must be from calling executor' }
            };
        }

        // Get or create consensus process
        const buildId = attestation.build_request_hash;
        let consensus = this.activeConsensus.get(buildId);
        
        if (!consensus) {
            // Start new consensus process
            consensus = {
                build_id: buildId,
                required_confirmations: Math.max(
                    this.networkConfig.minimum_executors,
                    Math.ceil(Number(this.executorRegistry.len()) * this.networkConfig.consensus_threshold)
                ),
                received_attestations: [],
                timeout: time() + this.networkConfig.executor_timeout_seconds * 1_000_000_000n,
                consensus_threshold: this.networkConfig.consensus_threshold
            };
            this.activeConsensus.set(buildId, consensus);
        }

        // Check for duplicate attestation from same executor
        const existingAttestation = consensus.received_attestations.find(
            a => a.executor_id.toText() === caller.toText()
        );
        if (existingAttestation) {
            return {
                Err: { InvalidInput: 'Executor has already submitted attestation for this build' }
            };
        }

        // Add attestation to consensus
        consensus.received_attestations.push(attestation);
        
        console.log(`Attestation received from ${caller.toText()}`);
        console.log(`Build: ${buildId}, Artifact hash: ${attestation.artifact_hash}`);
        console.log(`Attestations: ${consensus.received_attestations.length}/${consensus.required_confirmations}`);

        // Check if consensus is reached
        if (consensus.received_attestations.length >= consensus.required_confirmations) {
            this.finalizeConsensus(buildId, consensus);
        }

        return { Ok: null };
    }

    /**
     * Get consensus result for a build
     */
    @query([IDL.Text], IDL.Variant({ Ok: ConsensusResult, Err: BuildExecutorError }))
    getConsensusResult(buildId: string): { Ok: ConsensusResult } | { Err: BuildExecutorError } {
        const consensus = this.activeConsensus.get(buildId);
        if (!consensus) {
            return {
                Err: { NotFound: `No consensus process found for build: ${buildId}` }
            };
        }

        // Analyze attestations for consensus
        const hashCounts = new Map<string, number>();
        const executorsByHash = new Map<string, Principal[]>();
        
        for (const attestation of consensus.received_attestations) {
            const hash = attestation.artifact_hash;
            hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
            
            if (!executorsByHash.has(hash)) {
                executorsByHash.set(hash, []);
            }
            executorsByHash.get(hash)!.push(attestation.executor_id);
        }

        // Find majority hash
        let majorityHash: string | null = null;
        let maxCount = 0;
        for (const [hash, count] of hashCounts) {
            if (count > maxCount) {
                maxCount = count;
                majorityHash = hash;
            }
        }

        const consensusReached = maxCount >= consensus.required_confirmations;
        const confidence = consensus.received_attestations.length > 0 
            ? maxCount / consensus.received_attestations.length 
            : 0;

        // Find disputed results
        const disputedResults: [Principal, string][] = [];
        if (majorityHash) {
            for (const attestation of consensus.received_attestations) {
                if (attestation.artifact_hash !== majorityHash) {
                    disputedResults.push([attestation.executor_id, attestation.artifact_hash]);
                }
            }
        }

        const result: ConsensusResult = {
            consensus_reached: consensusReached,
            agreed_artifact_hash: consensusReached ? majorityHash : null,
            participating_executors: consensus.received_attestations.map(a => a.executor_id),
            attestations: consensus.received_attestations,
            consensus_confidence: confidence,
            disputed_results: disputedResults,
            finalization_time: time()
        };

        return { Ok: result };
    }

    /**
     * Get all registered executors
     */
    @query([], IDL.Vec(ExecutorIdentity))
    getRegisteredExecutors(): ExecutorIdentity[] {
        const executors: ExecutorIdentity[] = [];
        
        for (const [_, identity] of this.executorRegistry.items()) {
            executors.push(identity);
        }

        return executors;
    }

    /**
     * Get executor performance metrics
     */
    @query([IDL.Principal], IDL.Variant({ 
        Ok: IDL.Record({
            total_builds: IDL.Nat32,
            successful_builds: IDL.Nat32,
            success_rate: IDL.Float32,
            average_build_time: IDL.Nat64,
            reputation_score: IDL.Float32,
            last_active: IDL.Nat64,
            stake_amount: IDL.Nat64,
            slashing_events: IDL.Nat32
        }), 
        Err: BuildExecutorError 
    }))
    getExecutorPerformance(executorId: Principal): any {
        const performance = this.executorPerformance.get(executorId);
        if (!performance) {
            return {
                Err: { NotFound: `Performance data not found for executor: ${executorId.toText()}` }
            };
        }

        const successRate = performance.total_builds > 0 
            ? performance.successful_builds / performance.total_builds 
            : 0;

        return {
            Ok: {
                total_builds: performance.total_builds,
                successful_builds: performance.successful_builds,
                success_rate: successRate,
                average_build_time: performance.average_build_time,
                reputation_score: performance.reputation_score,
                last_active: performance.last_active,
                stake_amount: performance.stake_amount,
                slashing_events: performance.slashing_events
            }
        };
    }

    /**
     * Distribute rewards to executors
     */
    @update([IDL.Text], IDL.Variant({ Ok: IDL.Vec(ExecutorReward), Err: BuildExecutorError }))
    distributeRewards(buildId: string): { Ok: ExecutorReward[] } | { Err: BuildExecutorError } {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            return {
                Err: { Unauthorized: 'Only admin can distribute rewards' }
            };
        }

        const consensus = this.activeConsensus.get(buildId);
        if (!consensus) {
            return {
                Err: { NotFound: `No consensus found for build: ${buildId}` }
            };
        }

        const rewards: ExecutorReward[] = [];
        const currentTime = time();

        for (const attestation of consensus.received_attestations) {
            const baseReward = this.networkConfig.base_reward_per_build;
            let totalReward = baseReward;
            
            // Calculate bonuses
            const performance = this.executorPerformance.get(attestation.executor_id);
            if (performance) {
                // Quality bonus based on reputation
                const qualityBonus = performance.reputation_score > 0.8 
                    ? Number(baseReward) * 0.2 
                    : 0;
                
                // Speed bonus based on execution time
                const executionTime = attestation.execution_metadata.end_time - attestation.execution_metadata.start_time;
                const speedBonus = executionTime < 300_000_000_000n // Under 5 minutes
                    ? Number(baseReward) * 0.1 
                    : 0;

                totalReward = baseReward + BigInt(qualityBonus + speedBonus);
            }

            const reward: ExecutorReward = {
                executor_id: attestation.executor_id,
                build_id: buildId,
                reward_amount: totalReward,
                reward_type: { BaseReward: null },
                payment_status: { Pending: null }
            };

            const rewardKey = `${buildId}_${attestation.executor_id.toText()}`;
            this.pendingRewards.insert(rewardKey, reward);
            rewards.push(reward);

            console.log(`Reward calculated for ${attestation.executor_id.toText()}: ${totalReward} cycles`);
        }

        return { Ok: rewards };
    }

    // ============================================================================
    // SIMULATED OFF-CHAIN EXECUTOR METHODS
    // ============================================================================

    /**
     * Initialize simulated off-chain executors
     */
    private initializeSimulatedExecutors(): void {
        const baseIds = [
            'rdmx6-jaaaa-aaaah-qcaaa-cai',
            'rrkah-fqaaa-aaaah-qcaaq-cai', 
            'renrk-eyaaa-aaaah-qcaaa-cai',
            'rrkah-fqaaa-aaaah-qcaba-cai',
            'rdmx6-jaaaa-aaaah-qcbba-cai'
        ];

        for (let i = 0; i < this.simulationConfig.simulatedExecutorCount; i++) {
            const executorId = Principal.fromText(baseIds[i % baseIds.length]);
            
            const identity: ExecutorIdentity = {
                executor_id: executorId,
                public_key: this.generateRandomBytes(32),
                endpoint_url: `https://executor-${i}.dcanary.network`,
                capabilities: {
                    labels: [`region-${i % 3}`, 'linux', 'docker'],
                    max_concurrent_builds: 2 + (i % 3),
                    available_resources: {
                        cpu_cores: 4 + (i % 4),
                        memory_mb: 8192 + (i * 1024),
                        disk_space_gb: 100 + (i * 50),
                        network_bandwidth: 1000 + (i * 200)
                    },
                    supported_languages: ['typescript', 'javascript', 'python', 'rust'],
                    installed_tools: ['node', 'npm', 'docker', 'git', 'rustc', 'cargo']
                },
                stake_amount: BigInt(1000000 + (i * 500000)),
                registration_time: time() - BigInt(i * 86400000000000), // Staggered registration
                operational_model: { PublicNetwork: null },
                geographic_region: ['us-east', 'eu-west', 'asia-pacific'][i % 3],
                compliance_certifications: ['SOC2', 'ISO27001'],
                pricing_model: {
                    base_rate_per_minute: BigInt(1000 + (i * 100)),
                    quality_multiplier: 1.0 + (i * 0.1),
                    volume_discounts: [[10, 0.05], [50, 0.1], [100, 0.15]]
                }
            };

            // Register executor
            this.executorRegistry.insert(executorId, identity);

            // Initialize performance tracking
            this.executorPerformance.insert(executorId, {
                total_builds: i * 10,
                successful_builds: i * 9, // 90% success rate initially
                average_build_time: BigInt(300000000000 + (i * 30000000000)), // 5-8 minutes
                reputation_score: 0.9 + (i * 0.02),
                last_active: time(),
                stake_amount: BigInt(1000000 + (i * 500000)),
                slashing_events: 0
            });

            // Initialize simulated executor state
            this.simulatedExecutors.set(executorId, {
                identity: identity,
                isOnline: Math.random() > 0.1, // 90% online
                currentLoad: Math.random() * 0.8, // Random load 0-80%
                successRate: 0.85 + (Math.random() * 0.1), // 85-95% success rate
                averageResponseTime: 1000 + (Math.random() * 2000), // 1-3 second response
                lastSeen: time()
            });

            console.log(`Initialized simulated executor: ${executorId.toText()}`);
        }
    }

    /**
     * Generate random bytes for simulation
     */
    private generateRandomBytes(length: number): number[] {
        const bytes: number[] = [];
        for (let i = 0; i < length; i++) {
            bytes.push(Math.floor(Math.random() * 256));
        }
        return bytes;
    }

    /**
     * Simulate distributed build execution across off-chain agents
     */
    @update([IDL.Text, IDL.Text], BuildExecutorResult)
    async executeDistributedBuild(projectId: string, version: string): Promise<BuildExecutorResult> {
        const startTime = time();
        const buildId = `distributed_${projectId}_${version}_${startTime}`;
        const caller = msgCaller();

        try {
            // Check authorization
            if (!this.isAuthorizedRequester(caller)) {
                return {
                    Err: {
                        Unauthorized: `Caller ${caller.toText()} is not authorized to request builds`
                    }
                };
            }

            console.log(`Starting distributed build execution for ${projectId}@${version}, Build ID: ${buildId}`);

            // Select available executors for consensus
            const selectedExecutors = this.selectExecutorsForBuild();
            
            if (selectedExecutors.length < this.networkConfig.minimum_executors) {
                return {
                    Err: {
                        ResourceExhausted: `Insufficient available executors: ${selectedExecutors.length} < ${this.networkConfig.minimum_executors}`
                    }
                };
            }

            // Initialize off-chain build tracking
            this.offChainBuilds.set(buildId, {
                buildId,
                projectId,
                version,
                assignedExecutors: selectedExecutors,
                status: 'pending',
                startTime,
                expectedCompletion: startTime + BigInt(this.simulationConfig.buildExecutionDelay * 1000000),
                attestations: []
            });

            console.log(`Selected ${selectedExecutors.length} executors for distributed build`);

            // Simulate build execution on selected executors
            const buildPromises = selectedExecutors.map(executorId => 
                this.simulateExecutorBuild(buildId, projectId, version, executorId)
            );

            // Wait for all builds to complete (with timeout)
            const attestations = await Promise.all(buildPromises);
            
            // Filter successful attestations
            const validAttestations = attestations.filter(att => att !== null) as BuildAttestation[];

            if (validAttestations.length === 0) {
                return {
                    Err: {
                        InternalError: 'All distributed builds failed'
                    }
                };
            }

            // Update build status
            const buildTracker = this.offChainBuilds.get(buildId)!;
            buildTracker.status = 'consensus';
            buildTracker.attestations = validAttestations;

            // Perform consensus analysis
            const consensusResult = await this.performConsensusAnalysis(buildId, validAttestations);

            if (!consensusResult.consensus_reached) {
                buildTracker.status = 'failed';
                return {
                    Err: {
                        InternalError: 'Failed to reach consensus on build results'
                    }
                };
            }

            // Create final build result
            const endTime = time();
            const finalResult: ExecuteBuildResult = {
                success: true,
                hash: consensusResult.agreed_artifact_hash!,
                error: '',
                cycles_consumed: validAttestations.reduce((sum, att) => 
                    sum + BigInt(Number(att.execution_metadata.resource_usage.cpu_time_ms) * 100), 0n),
                build_time: endTime - startTime,
                artifact_size: Math.floor(Math.random() * 1000000) + 100000 // Simulated size
            };

            // Store in history
            const historyKey = `${projectId}#${version}#${startTime}`;
            this.buildHistory.insert(historyKey, finalResult);

            // Update last successful hash
            this.lastSuccessfulHash = finalResult.hash;

            // Mark build as completed
            buildTracker.status = 'completed';

            // Distribute rewards
            await this.simulateRewardDistribution(buildId, validAttestations);

            console.log(`Distributed build completed successfully. Consensus: ${consensusResult.consensus_confidence * 100}%`);
            console.log(`Final hash: ${finalResult.hash}`);

            return { Ok: finalResult };

        } catch (error: any) {
            console.log(`Distributed build execution error: ${error.message}`);
            
            // Mark build as failed
            const buildTracker = this.offChainBuilds.get(buildId);
            if (buildTracker) {
                buildTracker.status = 'failed';
            }

            return {
                Err: {
                    InternalError: `Distributed build execution failed: ${error.message}`
                }
            };
        }
    }

    /**
     * Select executors for a build based on availability and performance
     */
    private selectExecutorsForBuild(): Principal[] {
        const availableExecutors: Principal[] = [];
        
        for (const [executorId, executor] of this.simulatedExecutors.entries()) {
            // Check if executor is online and not overloaded
            if (executor.isOnline && executor.currentLoad < 0.9) {
                const performance = this.executorPerformance.get(executorId);
                
                // Prefer executors with good reputation
                if (performance && performance.reputation_score > 0.7) {
                    availableExecutors.push(executorId);
                }
            }
        }

        // Shuffle and select up to maximum executors
        const shuffled = availableExecutors.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(this.networkConfig.maximum_executors, 5));
    }

    /**
     * Simulate build execution on a single executor
     */
    private async simulateExecutorBuild(
        buildId: string, 
        projectId: string, 
        version: string, 
        executorId: Principal
    ): Promise<BuildAttestation | null> {
        try {
            const executor = this.simulatedExecutors.get(executorId);
            if (!executor || !executor.isOnline) {
                console.log(`Executor ${executorId.toText()} is offline`);
                return null;
            }

            // Simulate network delay
            await this.simulateDelay(this.simulationConfig.networkDelay);

            console.log(`Simulating build execution on executor: ${executorId.toText()}`);

            // Simulate build execution time
            const buildStartTime = time();
            await this.simulateDelay(this.simulationConfig.buildExecutionDelay);
            const buildEndTime = time();

            // Simulate potential failure
            if (Math.random() < this.simulationConfig.failureRate * (1 - executor.successRate)) {
                console.log(`Simulated build failure on executor: ${executorId.toText()}`);
                return null;
            }

            // Generate simulated artifact hash (with small chance of different result)
            const baseHash = this.generateSimulatedHash(projectId, version);
            const artifactHash = Math.random() < 0.05 ? // 5% chance of different hash
                baseHash + '_variant_' + Math.floor(Math.random() * 1000) :
                baseHash;

            // Create execution signature (simulated)
            const signature = this.generateRandomBytes(64);

            // Generate execution metadata
            const executionMetadata = {
                start_time: buildStartTime,
                end_time: buildEndTime,
                resource_usage: {
                    cpu_time_ms: BigInt(Math.floor(Math.random() * 300000) + 60000), // 1-5 minutes
                    memory_peak_mb: Math.floor(Math.random() * 2048) + 512, // 512MB - 2.5GB
                    network_bytes: BigInt(Math.floor(Math.random() * 1000000) + 100000) // 100KB - 1MB
                },
                exit_code: 0,
                environment_hash: 'env_' + Math.floor(Math.random() * 1000000)
            };

            // Calculate trust score based on executor reputation
            const performance = this.executorPerformance.get(executorId);
            const trustScore = performance ? Math.min(1.0, performance.reputation_score) : 0.5;

            const attestation: BuildAttestation = {
                executor_id: executorId,
                build_request_hash: this.generateSimulatedHash(buildId, 'request'),
                artifact_hash: artifactHash,
                execution_signature: signature,
                execution_metadata: executionMetadata,
                trust_score: trustScore
            };

            // Update executor load
            executor.currentLoad = Math.max(0, executor.currentLoad - 0.2);
            executor.lastSeen = time();

            console.log(`Build attestation generated by ${executorId.toText()}: ${artifactHash}`);
            return attestation;

        } catch (error) {
            console.log(`Error in simulated build execution: ${error}`);
            return null;
        }
    }

    /**
     * Perform consensus analysis on build attestations
     */
    private async performConsensusAnalysis(
        buildId: string, 
        attestations: BuildAttestation[]
    ): Promise<ConsensusResult> {
        // Simulate consensus delay
        await this.simulateDelay(this.simulationConfig.consensusDelay);

        console.log(`Performing consensus analysis for build: ${buildId}`);
        console.log(`Analyzing ${attestations.length} attestations`);

        // Count hash occurrences
        const hashCounts = new Map<string, number>();
        const executorsByHash = new Map<string, Principal[]>();
        
        for (const attestation of attestations) {
            const hash = attestation.artifact_hash;
            hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
            
            if (!executorsByHash.has(hash)) {
                executorsByHash.set(hash, []);
            }
            executorsByHash.get(hash)!.push(attestation.executor_id);
        }

        // Find majority hash
        let majorityHash: string | null = null;
        let maxCount = 0;
        for (const [hash, count] of hashCounts) {
            if (count > maxCount) {
                maxCount = count;
                majorityHash = hash;
            }
        }

        // Calculate consensus
        const consensusThreshold = Math.ceil(attestations.length * this.networkConfig.consensus_threshold);
        const consensusReached = maxCount >= consensusThreshold;
        const confidence = attestations.length > 0 ? maxCount / attestations.length : 0;

        // Find disputed results
        const disputedResults: [Principal, string][] = [];
        if (majorityHash) {
            for (const attestation of attestations) {
                if (attestation.artifact_hash !== majorityHash) {
                    disputedResults.push([attestation.executor_id, attestation.artifact_hash]);
                }
            }
        }

        const result: ConsensusResult = {
            consensus_reached: consensusReached,
            agreed_artifact_hash: consensusReached ? majorityHash : null,
            participating_executors: attestations.map(a => a.executor_id),
            attestations: attestations,
            consensus_confidence: confidence,
            disputed_results: disputedResults,
            finalization_time: time()
        };

        console.log(`Consensus result: ${consensusReached ? 'REACHED' : 'FAILED'}`);
        console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
        console.log(`Majority hash: ${majorityHash}`);
        console.log(`Disputed results: ${disputedResults.length}`);

        return result;
    }

    /**
     * Simulate reward distribution to executors
     */
    private async simulateRewardDistribution(
        buildId: string, 
        attestations: BuildAttestation[]
    ): Promise<void> {
        console.log(`Distributing rewards for build: ${buildId}`);

        for (const attestation of attestations) {
            const baseReward = this.networkConfig.base_reward_per_build;
            const performance = this.executorPerformance.get(attestation.executor_id);
            
            let totalReward = baseReward;
            
            if (performance) {
                // Quality bonus
                const qualityBonus = performance.reputation_score > 0.9 
                    ? Number(baseReward) * 0.2 
                    : 0;
                
                // Speed bonus
                const executionTime = attestation.execution_metadata.end_time - attestation.execution_metadata.start_time;
                const speedBonus = executionTime < 240_000_000_000n // Under 4 minutes
                    ? Number(baseReward) * 0.1 
                    : 0;

                totalReward = baseReward + BigInt(qualityBonus + speedBonus);
            }

            const reward: ExecutorReward = {
                executor_id: attestation.executor_id,
                build_id: buildId,
                reward_amount: totalReward,
                reward_type: { BaseReward: null },
                payment_status: { Pending: null }
            };

            const rewardKey = `${buildId}_${attestation.executor_id.toText()}`;
            this.pendingRewards.insert(rewardKey, reward);

            console.log(`Reward distributed to ${attestation.executor_id.toText()}: ${totalReward} cycles`);
        }
    }

    /**
     * Generate simulated hash
     */
    private generateSimulatedHash(input1: string, input2: string): string {
        const combined = input1 + input2 + time().toString();
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `sim_${Math.abs(hash).toString(16)}_${Date.now()}`;
    }

    /**
     * Simulate network/processing delay
     */
    private async simulateDelay(ms: number): Promise<void> {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    /**
     * Get status of off-chain builds
     */
    @query([], IDL.Vec(IDL.Record({
        build_id: IDL.Text,
        project_id: IDL.Text,
        version: IDL.Text,
        status: IDL.Text,
        assigned_executors: IDL.Nat32,
        attestations_received: IDL.Nat32,
        start_time: IDL.Nat64,
        expected_completion: IDL.Nat64
    })))
    getOffChainBuildStatus(): any[] {
        const builds: any[] = [];
        
        for (const [_, build] of this.offChainBuilds.entries()) {
            builds.push({
                build_id: build.buildId,
                project_id: build.projectId,
                version: build.version,
                status: build.status,
                assigned_executors: build.assignedExecutors.length,
                attestations_received: build.attestations.length,
                start_time: build.startTime,
                expected_completion: build.expectedCompletion
            });
        }

        return builds.sort((a, b) => Number(b.start_time - a.start_time)).slice(0, 20); // Return last 20 builds
    }

    /**
     * Get simulated executor network status
     */
    @query([], IDL.Record({
        total_executors: IDL.Nat32,
        online_executors: IDL.Nat32,
        average_load: IDL.Float32,
        network_health: IDL.Text,
        last_consensus: IDL.Nat64
    }))
    getExecutorNetworkStatus(): any {
        let onlineCount = 0;
        let totalLoad = 0;
        
        for (const [_, executor] of this.simulatedExecutors.entries()) {
            if (executor.isOnline) {
                onlineCount++;
                totalLoad += executor.currentLoad;
            }
        }

        const averageLoad = onlineCount > 0 ? totalLoad / onlineCount : 0;
        const healthStatus = onlineCount >= this.networkConfig.minimum_executors ? 
            (averageLoad < 0.8 ? 'healthy' : 'stressed') : 'degraded';

        return {
            total_executors: this.simulatedExecutors.size,
            online_executors: onlineCount,
            average_load: averageLoad,
            network_health: healthStatus,
            last_consensus: time()
        };
    }

    /**
     * Toggle simulation mode (admin only)
     */
    @update([IDL.Bool], IDL.Bool)
    toggleSimulation(enabled: boolean): boolean {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            console.log(`Unauthorized attempt to toggle simulation by ${caller.toText()}`);
            return false;
        }

        this.simulationConfig.enabled = enabled;
        console.log(`Simulation mode ${enabled ? 'enabled' : 'disabled'} by ${caller.toText()}`);
        return true;
    }

    // ============================================================================
    // MISSING CONSENSUS METHODS
    // ============================================================================

    /**
     * Finalize consensus process
     */
    private finalizeConsensus(buildId: string, consensus: any): void {
        console.log(`Finalizing consensus for build: ${buildId}`);
        
        // Analyze attestations
        const hashCounts = new Map<string, number>();
        for (const attestation of consensus.received_attestations) {
            const hash = attestation.artifact_hash;
            hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
        }

        // Find majority hash
        let majorityHash: string | null = null;
        let maxCount = 0;
        for (const [hash, count] of hashCounts) {
            if (count > maxCount) {
                maxCount = count;
                majorityHash = hash;
            }
        }

        // Update executor performance
        for (const attestation of consensus.received_attestations) {
            const isCorrect = attestation.artifact_hash === majorityHash;
            this.updateExecutorPerformance(attestation.executor_id, isCorrect, attestation);
        }

        // Handle slashing for incorrect attestations
        if (majorityHash) {
            for (const attestation of consensus.received_attestations) {
                if (attestation.artifact_hash !== majorityHash) {
                    this.handleIncorrectAttestation(attestation.executor_id, buildId);
                }
            }
        }

        console.log(`Consensus finalized. Majority hash: ${majorityHash}`);
        console.log(`Correct attestations: ${maxCount}/${consensus.received_attestations.length}`);
    }

    /**
     * Update executor performance metrics
     */
    private updateExecutorPerformance(executorId: Principal, isCorrect: boolean, attestation: BuildAttestation): void {
        const performance = this.executorPerformance.get(executorId);
        if (!performance) return;

        performance.total_builds++;
        if (isCorrect) {
            performance.successful_builds++;
        }

        // Update average build time
        const buildTime = attestation.execution_metadata.end_time - attestation.execution_metadata.start_time;
        performance.average_build_time = 
            (performance.average_build_time * BigInt(performance.total_builds - 1) + buildTime) / 
            BigInt(performance.total_builds);

        // Update reputation score
        const successRate = performance.successful_builds / performance.total_builds;
        performance.reputation_score = Math.max(0.1, Math.min(2.0, 
            performance.reputation_score * 0.95 + successRate * 0.05
        ));

        performance.last_active = time();

        this.executorPerformance.insert(executorId, performance);
    }

    /**
     * Handle incorrect attestation (potential slashing)
     */
    private handleIncorrectAttestation(executorId: Principal, buildId: string): void {
        const performance = this.executorPerformance.get(executorId);
        if (!performance) return;

        performance.slashing_events++;
        
        // Apply slashing penalty
        const penalty = BigInt(Number(performance.stake_amount) * this.networkConfig.slashing_penalty);
        performance.stake_amount = performance.stake_amount > penalty 
            ? performance.stake_amount - penalty 
            : 0n;

        // Reduce reputation score
        performance.reputation_score *= 0.8;

        this.executorPerformance.insert(executorId, performance);

        console.log(`Executor ${executorId.toText()} slashed for incorrect attestation in build ${buildId}`);
        console.log(`Penalty: ${penalty} cycles, New stake: ${performance.stake_amount}`);
    }
}
