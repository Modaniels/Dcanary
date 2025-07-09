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
// CANISTER STATE
// ============================================================================

export default class BuildExecutorCanister {
    // Stable storage for build execution history
    private buildHistory = new StableBTreeMap<string, ExecuteBuildResult>(0);
    
    // Agent pool management (Phase 1 Enhancement)
    private agentCapabilities: AgentCapabilities;
    private buildQueue: BuildQueue;
    private agentHealth: AgentHealth;
    private currentResourceUsage: ResourceUsage;
    
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
        
        console.log(`Build Executor Canister initialized at ${this.deployedAt}`);
        console.log(`Build Instructions Canister ID: ${this.buildInstructionsCanisterId.toText()}`);
        console.log(`Verification Canister Principal: ${this.verificationCanisterPrincipal.toText()}`);
        console.log(`Agent capabilities: ${JSON.stringify(this.agentCapabilities)}`);
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
        const total_builds = this.buildHistory.len();
        if (total_builds === 0n) return 0;
        
        // Simple efficiency calculation based on successful builds
        const items = this.buildHistory.items();
        const successful_builds = items.filter(([_, result]) => result.success).length;
        
        return successful_builds / Number(total_builds);
    }
}
