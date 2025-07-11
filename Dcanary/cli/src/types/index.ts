import { Principal } from '@dfinity/principal';

// ============================================================================
// CLI CONFIGURATION TYPES
// ============================================================================

export interface CLIConfig {
    buildInstructionsCanisterId?: string;
    verificationCanisterId?: string;
    buildExecutorCanisterIds?: string[];
    webhookCanisterId?: string;
    network?: 'ic' | 'local';


    
    identity?: string;
    timeout?: number;
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
    scm?: any;
    environmentVariables?: Record<string, string>;
    [key: string]: any; // Allow additional dynamic properties
}

export interface CLIOptions {
    projectId?: string;
    version?: string;
    canisterId?: string;
    instructionSet?: string;
    file?: string;
    timeout?: number;
    json?: boolean;
    identity?: string;
    network?: 'ic' | 'local';
    setBuildCanisterId?: string;
    setExecutorIds?: string;
    setVerificationCanisterId?: string;
}

// ============================================================================
// CANISTER INTERFACE TYPES
// ============================================================================

export interface BuildInstructions {
    project_id: string;
    version: string;
    instruction_set: string;
    created_at: bigint;
    updated_at: bigint;
    created_by: Principal;
}

export type BuildInstructionsError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { InternalError: string };

export type BuildInstructionsResult = 
    | { Ok: BuildInstructions }
    | { Err: BuildInstructionsError };

export type VoidResult = 
    | { Ok: null }
    | { Err: BuildInstructionsError };

export type VerificationStatus = 
    | { Pending: null }
    | { Verified: null }
    | { Failed: null };

export interface ExecutorResult {
    executor_id: Principal;
    hash: string | null;
    error: string | null;
    completed: boolean;
    execution_time: bigint | null;
}

export interface VerificationResult {
    status: VerificationStatus;
    verified_hash: string | null;
    error: string | null;
    executor_results: ExecutorResult[];
    consensus_threshold: number;
    total_executors: number;
    matching_results: number;
    created_at: bigint;
    completed_at: bigint | null;
}

export type VerificationError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { InternalError: string }
    | { TimeoutError: string }
    | { ConsensusFailure: string }
    | { InstructionsNotFound: string }
    | { ExecutorFailure: string };

export type VerificationResultWrapper = 
    | { Ok: VerificationResult }
    | { Err: VerificationError };

// ============================================================================
// CLI OUTPUT TYPES
// ============================================================================

export interface StatusOutput {
    projectId: string;
    version: string;
    status: string;
    verifiedHash?: string;
    error?: string;
    totalExecutors?: number;
    completedExecutors?: number;
    successfulExecutors?: number;
    failedExecutors?: number;
    consensusThreshold?: number;
    matchingResults?: number;
    createdAt?: string;
    completedAt?: string;
    duration?: string;
}

export interface VerificationProgress {
    projectId: string;
    version: string;
    status: string;
    progress: number;
    completedExecutors: number;
    totalExecutors: number;
    elapsedTime: number;
    estimatedTimeRemaining?: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class CLIError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = 'CLIError';
    }
}

export class ConfigurationError extends CLIError {
    constructor(message: string, details?: any) {
        super(message, 'CONFIGURATION_ERROR', details);
        this.name = 'ConfigurationError';
    }
}

export class ValidationError extends CLIError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}

export class NetworkError extends CLIError {
    constructor(message: string, details?: any) {
        super(message, 'NETWORK_ERROR', details);
        this.name = 'NetworkError';
    }
}

export class CanisterError extends CLIError {
    constructor(message: string, details?: any) {
        super(message, 'CANISTER_ERROR', details);
        this.name = 'CanisterError';
    }
}
