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
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents build instructions for a specific project and version
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

/**
 * Error types for the canister operations
 */
const BuildInstructionsError = IDL.Variant({
    NotFound: IDL.Text,
    Unauthorized: IDL.Text,
    InvalidInput: IDL.Text,
    InternalError: IDL.Text
});

type BuildInstructionsError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { InternalError: string };

/**
 * Result type for operations that can fail
 */
const BuildInstructionsResult = IDL.Variant({
    Ok: BuildInstructions,
    Err: BuildInstructionsError
});

type BuildInstructionsResult = 
    | { Ok: BuildInstructions }
    | { Err: BuildInstructionsError };

const VoidResult = IDL.Variant({
    Ok: IDL.Null,
    Err: BuildInstructionsError
});

type VoidResult = 
    | { Ok: null }
    | { Err: BuildInstructionsError };

// ============================================================================
// CANISTER STATE
// ============================================================================

export default class BuildInstructionsCanister {
    // Stable storage for build instructions
    // Key format: "{project_id}#{version}"
    private buildInstructions = new StableBTreeMap<string, BuildInstructions>(0);
    
    // Access control - hardcoded admin principal for now
    // In production, this would be configurable
    private adminPrincipal: Principal = Principal.fromText('2vxsx-fae');
    
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
        console.log(`Build Instructions Canister initialized at ${this.deployedAt}`);
        console.log(`Admin principal: ${this.adminPrincipal.toText()}`);
    }

    /**
     * Post-upgrade hook to handle canister upgrades
     */
    @postUpgrade([])
    postUpgrade(): void {
        console.log(`Build Instructions Canister upgraded at ${time()}`);
        console.log(`Current version: ${this.canisterVersion}`);
        console.log(`Total instructions stored: ${this.buildInstructions.len()}`);
    }

    // ============================================================================
    // ACCESS CONTROL
    // ============================================================================

    /**
     * Check if the caller is authorized to perform admin operations
     */
    private isAuthorized(caller: Principal): boolean {
        return caller.toText() === this.adminPrincipal.toText();
    }

    /**
     * Validate input parameters to prevent injection attacks
     */
    private validateInput(projectId: string, version: string, instructionSet: string): string | null {
        // Project ID validation
        if (!projectId || projectId.trim().length === 0) {
            return 'Project ID cannot be empty';
        }
        if (projectId.length > 100) {
            return 'Project ID cannot exceed 100 characters';
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
            return 'Project ID can only contain alphanumeric characters, hyphens, and underscores';
        }

        // Version validation
        if (!version || version.trim().length === 0) {
            return 'Version cannot be empty';
        }
        if (version.length > 50) {
            return 'Version cannot exceed 50 characters';
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(version)) {
            return 'Version can only contain alphanumeric characters, dots, hyphens, and underscores';
        }

        // Instruction set validation
        if (!instructionSet || instructionSet.trim().length === 0) {
            return 'Instruction set cannot be empty';
        }
        if (instructionSet.length > 10000) {
            return 'Instruction set cannot exceed 10,000 characters';
        }

        // Enhanced security check for malicious content
        const dangerousPatterns = [
            /rm\s+-rf/i,                    // Dangerous file removal
            /\$\(.*\)/,                     // Command substitution
            /`.*`/,                         // Backtick command execution
            /eval\s*\(/i,                   // Eval function
            /exec\s*\(/i,                   // Exec function
            /sudo\s+/i,                     // Sudo commands
            /chmod\s+.*777/i,               // Dangerous permissions
            /wget\s+.*\|\s*sh/i,            // Download and execute
            /curl\s+.*\|\s*sh/i,            // Download and execute
            /\/dev\/null\s*2>&1/,           // Output redirection that might hide errors
            /\|\s*nc\s+/i,                  // Netcat usage
            /mkfifo/i,                      // Named pipe creation
            /\/etc\/passwd/i,               // Access to sensitive files
            /\/etc\/shadow/i,               // Access to sensitive files
            /history\s+-c/i,                // Clear command history
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(instructionSet)) {
                return 'Instruction set contains potentially dangerous commands or patterns';
            }
        }

        // Check for excessive special characters that might indicate injection attempts
        const specialCharCount = (instructionSet.match(/[;&|`$(){}[\]]/g) || []).length;
        const instructionLength = instructionSet.length;
        if (specialCharCount > instructionLength * 0.1) {
            return 'Instruction set contains excessive special characters';
        }

        return null;
    }

    /**
     * Generate a composite key for storing build instructions
     */
    private generateKey(projectId: string, version: string): string {
        return `${projectId}#${version}`;
    }

    // ============================================================================
    // PUBLIC METHODS
    // ============================================================================

    /**
     * Add or update build instructions for a specific project and version
     * Only authorized users can call this function
     */
    @update([IDL.Text, IDL.Text, IDL.Text], VoidResult)
    addInstructions(
        projectId: string, 
        version: string, 
        instructionSet: string
    ): VoidResult {
        try {
            const caller = msgCaller();
            
            // Check authorization
            if (!this.isAuthorized(caller)) {
                return { 
                    Err: { 
                        Unauthorized: `Caller ${caller.toText()} is not authorized to add instructions` 
                    } 
                };
            }

            // Validate input
            const validationError = this.validateInput(projectId, version, instructionSet);
            if (validationError) {
                return { 
                    Err: { 
                        InvalidInput: validationError 
                    } 
                };
            }

            const key = this.generateKey(projectId, version);
            const currentTime = time();
            
            // Check if instructions already exist
            const existingInstructions = this.buildInstructions.get(key);
            
            const instructions: BuildInstructions = {
                project_id: projectId.trim(),
                version: version.trim(),
                instruction_set: instructionSet.trim(),
                created_at: existingInstructions?.created_at || currentTime,
                updated_at: currentTime,
                created_by: existingInstructions?.created_by || caller
            };

            // Store the instructions
            this.buildInstructions.insert(key, instructions);

            console.log(`Instructions ${existingInstructions ? 'updated' : 'added'} for ${projectId}@${version}`);
            
            return { Ok: null };

        } catch (error) {
            console.log(`Error in addInstructions: ${error}`);
            return { 
                Err: { 
                    InternalError: `Failed to add instructions: ${error}` 
                } 
            };
        }
    }

    /**
     * Retrieve build instructions for a specific project and version
     */
    @query([IDL.Text, IDL.Text], BuildInstructionsResult)
    getInstructions(projectId: string, version: string): BuildInstructionsResult {
        try {
            // Basic input validation
            if (!projectId || !version) {
                return { 
                    Err: { 
                        InvalidInput: 'Project ID and version are required' 
                    } 
                };
            }

            const key = this.generateKey(projectId.trim(), version.trim());
            const instructions = this.buildInstructions.get(key);

            if (!instructions) {
                return { 
                    Err: { 
                        NotFound: `No instructions found for ${projectId}@${version}` 
                    } 
                };
            }

            return { Ok: instructions };

        } catch (error) {
            console.log(`Error in getInstructions: ${error}`);
            return { 
                Err: { 
                    InternalError: `Failed to retrieve instructions: ${error}` 
                } 
            };
        }
    }

    /**
     * List all projects that have build instructions
     */
    @query([], IDL.Vec(IDL.Text))
    listProjects(): string[] {
        try {
            const projects = new Set<string>();
            
            for (const [key, _] of this.buildInstructions.items()) {
                const projectId = key.split('#')[0];
                projects.add(projectId);
            }

            return Array.from(projects).sort();

        } catch (error) {
            console.log(`Error in listProjects: ${error}`);
            return [];
        }
    }

    /**
     * List all versions for a specific project
     */
    @query([IDL.Text], IDL.Vec(IDL.Text))
    listVersions(projectId: string): string[] {
        try {
            if (!projectId) {
                return [];
            }

            const versions: string[] = [];
            const projectPrefix = `${projectId.trim()}#`;
            
            for (const [key, _] of this.buildInstructions.items()) {
                if (key.startsWith(projectPrefix)) {
                    const version = key.substring(projectPrefix.length);
                    versions.push(version);
                }
            }

            return versions.sort();

        } catch (error) {
            console.log(`Error in listVersions: ${error}`);
            return [];
        }
    }

    /**
     * Remove build instructions for a specific project and version
     * Only authorized users can call this function
     */
    @update([IDL.Text, IDL.Text], VoidResult)
    removeInstructions(projectId: string, version: string): VoidResult {
        try {
            const caller = msgCaller();
            
            // Check authorization
            if (!this.isAuthorized(caller)) {
                return { 
                    Err: { 
                        Unauthorized: `Caller ${caller.toText()} is not authorized to remove instructions` 
                    } 
                };
            }

            // Basic input validation
            if (!projectId || !version) {
                return { 
                    Err: { 
                        InvalidInput: 'Project ID and version are required' 
                    } 
                };
            }

            const key = this.generateKey(projectId.trim(), version.trim());
            const removedInstructions = this.buildInstructions.remove(key);

            if (!removedInstructions) {
                return { 
                    Err: { 
                        NotFound: `No instructions found for ${projectId}@${version}` 
                    } 
                };
            }

            console.log(`Instructions removed for ${projectId}@${version}`);
            return { Ok: null };

        } catch (error) {
            console.log(`Error in removeInstructions: ${error}`);
            return { 
                Err: { 
                    InternalError: `Failed to remove instructions: ${error}` 
                } 
            };
        }
    }

    /**
     * Get canister statistics and metadata
     */
    @query([], IDL.Record({
        version: IDL.Text,
        deployed_at: IDL.Nat64,
        total_instructions: IDL.Nat32,
        admin_principal: IDL.Principal
    }))
    getCanisterInfo(): {
        version: string;
        deployed_at: bigint;
        total_instructions: number;
        admin_principal: Principal;
    } {
        return {
            version: this.canisterVersion,
            deployed_at: this.deployedAt,
            total_instructions: this.buildInstructions.len(),
            admin_principal: this.adminPrincipal
        };
    }

    /**
     * Update the admin principal (only current admin can do this)
     */
    @update([IDL.Principal], VoidResult)
    updateAdmin(newAdmin: Principal): VoidResult {
        try {
            const caller = msgCaller();
            
            // Check authorization
            if (!this.isAuthorized(caller)) {
                return { 
                    Err: { 
                        Unauthorized: `Caller ${caller.toText()} is not authorized to update admin` 
                    } 
                };
            }

            const oldAdmin = this.adminPrincipal;
            this.adminPrincipal = newAdmin;
            
            console.log(`Admin principal updated from ${oldAdmin.toText()} to ${newAdmin.toText()}`);
            
            return { Ok: null };

        } catch (error) {
            console.log(`Error in updateAdmin: ${error}`);
            return { 
                Err: { 
                    InternalError: `Failed to update admin: ${error}` 
                } 
            };
        }
    }

    /**
     * Health check endpoint
     */
    @query([], IDL.Text)
    healthCheck(): string {
        return `Build Instructions Canister v${this.canisterVersion} - OK`;
    }

    /**
     * Get all build instructions with pagination support
     */
    @query([IDL.Opt(IDL.Nat32), IDL.Opt(IDL.Nat32)], IDL.Vec(BuildInstructions))
    getAllInstructions(offset?: number, limit?: number): BuildInstructions[] {
        try {
            const allInstructions: BuildInstructions[] = [];
            
            for (const [_, instructions] of this.buildInstructions.items()) {
                allInstructions.push(instructions);
            }
            
            // Sort by project_id and then by version
            allInstructions.sort((a, b) => {
                const projectCompare = a.project_id.localeCompare(b.project_id);
                if (projectCompare !== 0) return projectCompare;
                return a.version.localeCompare(b.version);
            });
            
            // Apply pagination if specified
            const startIndex = offset || 0;
            const endIndex = limit ? startIndex + limit : allInstructions.length;
            
            return allInstructions.slice(startIndex, endIndex);
            
        } catch (error) {
            console.log(`Error in getAllInstructions: ${error}`);
            return [];
        }
    }

    /**
     * Get build instructions by project (all versions)
     */
    @query([IDL.Text], IDL.Vec(BuildInstructions))
    getInstructionsByProject(projectId: string): BuildInstructions[] {
        try {
            if (!projectId || projectId.trim().length === 0) {
                return [];
            }
            
            const instructions: BuildInstructions[] = [];
            const projectPrefix = `${projectId.trim()}#`;
            
            for (const [key, instruction] of this.buildInstructions.items()) {
                if (key.startsWith(projectPrefix)) {
                    instructions.push(instruction);
                }
            }
            
            // Sort by version
            instructions.sort((a, b) => a.version.localeCompare(b.version));
            
            return instructions;
            
        } catch (error) {
            console.log(`Error in getInstructionsByProject: ${error}`);
            return [];
        }
    }

    /**
     * Check if instructions exist for a project and version
     */
    @query([IDL.Text, IDL.Text], IDL.Bool)
    instructionsExist(projectId: string, version: string): boolean {
        try {
            if (!projectId || !version) {
                return false;
            }
            
            const key = this.generateKey(projectId.trim(), version.trim());
            return this.buildInstructions.containsKey(key);
            
        } catch (error) {
            console.log(`Error in instructionsExist: ${error}`);
            return false;
        }
    }

    /**
     * Batch add multiple build instructions (for efficiency)
     * Only authorized users can call this function
     */
    @update([IDL.Vec(IDL.Record({
        project_id: IDL.Text,
        version: IDL.Text,
        instruction_set: IDL.Text
    }))], IDL.Vec(VoidResult))
    addMultipleInstructions(
        instructionsList: Array<{
            project_id: string;
            version: string;
            instruction_set: string;
        }>
    ): VoidResult[] {
        try {
            const caller = msgCaller();
            
            // Check authorization
            if (!this.isAuthorized(caller)) {
                const unauthorizedError = { 
                    Err: { 
                        Unauthorized: `Caller ${caller.toText()} is not authorized to add instructions` 
                    } 
                };
                return new Array(instructionsList.length).fill(unauthorizedError);
            }

            // Validate batch size
            if (instructionsList.length > 50) {
                const batchSizeError = { 
                    Err: { 
                        InvalidInput: 'Batch size cannot exceed 50 instructions' 
                    } 
                };
                return new Array(instructionsList.length).fill(batchSizeError);
            }

            const results: VoidResult[] = [];
            const currentTime = time();

            for (const instruction of instructionsList) {
                // Validate each instruction
                const validationError = this.validateInput(
                    instruction.project_id,
                    instruction.version,
                    instruction.instruction_set
                );
                
                if (validationError) {
                    results.push({ 
                        Err: { 
                            InvalidInput: validationError 
                        } 
                    });
                    continue;
                }

                try {
                    const key = this.generateKey(instruction.project_id, instruction.version);
                    const existingInstructions = this.buildInstructions.get(key);
                    
                    const buildInstructions: BuildInstructions = {
                        project_id: instruction.project_id.trim(),
                        version: instruction.version.trim(),
                        instruction_set: instruction.instruction_set.trim(),
                        created_at: existingInstructions?.created_at || currentTime,
                        updated_at: currentTime,
                        created_by: existingInstructions?.created_by || caller
                    };

                    this.buildInstructions.insert(key, buildInstructions);
                    results.push({ Ok: null });
                    
                } catch (error) {
                    results.push({ 
                        Err: { 
                            InternalError: `Failed to add instructions: ${error}` 
                        } 
                    });
                }
            }

            console.log(`Batch operation completed: ${results.filter(r => 'Ok' in r).length}/${instructionsList.length} successful`);
            return results;

        } catch (error) {
            console.log(`Error in addMultipleInstructions: ${error}`);
            const internalError = { 
                Err: { 
                    InternalError: `Batch operation failed: ${error}` 
                } 
            };
            return new Array(instructionsList.length).fill(internalError);
        }
    }

    /**
     * Get detailed statistics about stored instructions
     */
    @query([], IDL.Record({
        total_instructions: IDL.Nat32,
        total_projects: IDL.Nat32,
        oldest_instruction: IDL.Opt(IDL.Nat64),
        newest_instruction: IDL.Opt(IDL.Nat64),
        canister_version: IDL.Text,
        deployed_at: IDL.Nat64,
        admin_principal: IDL.Principal
    }))
    getStatistics(): {
        total_instructions: number;
        total_projects: number;
        oldest_instruction: [] | [bigint];
        newest_instruction: [] | [bigint];
        canister_version: string;
        deployed_at: bigint;
        admin_principal: Principal;
    } {
        try {
            const projects = new Set<string>();
            let oldestTime: bigint | undefined = undefined;
            let newestTime: bigint | undefined = undefined;
            
            for (const [key, instruction] of this.buildInstructions.items()) {
                const projectId = key.split('#')[0];
                projects.add(projectId);
                
                if (oldestTime === undefined || instruction.created_at < oldestTime) {
                    oldestTime = instruction.created_at;
                }
                
                if (newestTime === undefined || instruction.updated_at > newestTime) {
                    newestTime = instruction.updated_at;
                }
            }
            
            return {
                total_instructions: this.buildInstructions.len(),
                total_projects: projects.size,
                oldest_instruction: oldestTime ? [oldestTime] : [],
                newest_instruction: newestTime ? [newestTime] : [],
                canister_version: this.canisterVersion,
                deployed_at: this.deployedAt,
                admin_principal: this.adminPrincipal
            };
            
        } catch (error) {
            console.log(`Error in getStatistics: ${error}`);
            return {
                total_instructions: 0,
                total_projects: 0,
                oldest_instruction: [],
                newest_instruction: [],
                canister_version: this.canisterVersion,
                deployed_at: this.deployedAt,
                admin_principal: this.adminPrincipal
            };
        }
    }
}
