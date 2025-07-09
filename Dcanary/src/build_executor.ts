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
import { execSync } from 'child_process';
import { createHash } from 'crypto';

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
// CANISTER STATE
// ============================================================================

export default class BuildExecutorCanister {
    // Stable storage for build execution history
    private buildHistory = new StableBTreeMap<string, ExecuteBuildResult>(0);
    
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
        console.log(`Build Executor Canister initialized at ${this.deployedAt}`);
        console.log(`Build Instructions Canister ID: ${this.buildInstructionsCanisterId.toText()}`);
        console.log(`Verification Canister Principal: ${this.verificationCanisterPrincipal.toText()}`);
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

            // Execute with strict security options
            const execOptions = {
                cwd: sandboxDir,
                timeout: this.MAX_BUILD_TIME_MS,
                maxBuffer: 10 * 1024 * 1024, // 10MB max output
                env: {
                    HOME: sandboxDir,
                    PATH: '/usr/local/bin:/usr/bin:/bin',
                    NODE_ENV: 'production'
                },
                uid: process.getuid ? process.getuid() : undefined,
                gid: process.getgid ? process.getgid() : undefined
            };

            const output = execSync(`bash ${scriptPath}`, execOptions);
            console.log(`Build output: ${output.toString()}`);

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
     * Generate SHA256 hash of build artifact
     */
    private generateArtifactHash(artifactPath: string): { hash: string; size: number } {
        try {
            const hash = createHash('sha256');
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
                    const data = fs.readFileSync(filePath);
                    hash.update(filePath.replace(artifactPath, '')); // Include relative path
                    hash.update(data);
                    totalSize += data.length;
                }
            };

            processPath(artifactPath);

            return {
                hash: hash.digest('hex'),
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
}
