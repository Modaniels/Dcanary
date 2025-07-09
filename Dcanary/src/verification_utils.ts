import { Principal } from '@dfinity/principal';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface VerificationConfig {
    buildInstructionsCanisterId: Principal;
    buildExecutorCanisterIds: Principal[];
    authorizedRequester: Principal;
    adminPrincipal: Principal;
    defaultTimeoutSeconds: bigint;
    consensusThreshold: number;
    pollingIntervalSeconds: bigint;
}

export interface VerificationMetrics {
    totalVerifications: number;
    successfulVerifications: number;
    failedVerifications: number;
    timeoutedVerifications: number;
    averageVerificationTime: number;
    consensusFailures: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a verification key from project ID and version
 */
export function createVerificationKey(projectId: string, version: string): string {
    return `${projectId}:${version}`;
}

/**
 * Parse a verification key into project ID and version
 */
export function parseVerificationKey(key: string): { projectId: string; version: string } | null {
    const parts = key.split(':');
    if (parts.length !== 2) {
        return null;
    }
    return {
        projectId: parts[0],
        version: parts[1]
    };
}

/**
 * Calculate consensus threshold based on total executors and percentage
 */
export function calculateConsensusThreshold(totalExecutors: number, percentage: number): number {
    return Math.ceil(totalExecutors * percentage / 100);
}

/**
 * Validate project ID format
 */
export function isValidProjectId(projectId: string): boolean {
    // Project ID should be alphanumeric with hyphens and underscores
    const regex = /^[a-zA-Z0-9_-]+$/;
    return regex.test(projectId) && projectId.length > 0 && projectId.length <= 64;
}

/**
 * Validate version format (semantic versioning)
 */
export function isValidVersion(version: string): boolean {
    // Basic semantic version validation
    const regex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9_-]+)?(\+[a-zA-Z0-9_-]+)?$/;
    return regex.test(version);
}

/**
 * Convert nanoseconds to seconds
 */
export function nanosecondsToSeconds(nanoseconds: bigint): number {
    return Number(nanoseconds / 1_000_000_000n);
}

/**
 * Convert seconds to nanoseconds
 */
export function secondsToNanoseconds(seconds: number): bigint {
    return BigInt(seconds) * 1_000_000_000n;
}

/**
 * Check if a timeout has been reached
 */
export function isTimedOut(startTime: bigint, timeoutNanoseconds: bigint, currentTime: bigint): boolean {
    return currentTime >= (startTime + timeoutNanoseconds);
}

/**
 * Calculate verification progress percentage
 */
export function calculateProgress(completedExecutors: number, totalExecutors: number): number {
    if (totalExecutors === 0) return 0;
    return Math.round((completedExecutors / totalExecutors) * 100);
}

/**
 * Group executor results by hash for consensus analysis
 */
export function groupResultsByHash(executorResults: any[]): Map<string, any[]> {
    const hashGroups = new Map<string, any[]>();
    
    executorResults
        .filter(result => result.completed && result.hash && !result.error)
        .forEach(result => {
            const hash = result.hash;
            if (!hashGroups.has(hash)) {
                hashGroups.set(hash, []);
            }
            hashGroups.get(hash)!.push(result);
        });
    
    return hashGroups;
}

/**
 * Find the consensus hash from grouped results
 */
export function findConsensusHash(hashGroups: Map<string, any[]>, threshold: number): string | null {
    let maxCount = 0;
    let consensusHash: string | null = null;
    
    for (const [hash, results] of hashGroups.entries()) {
        if (results.length > maxCount) {
            maxCount = results.length;
            consensusHash = hash;
        }
    }
    
    return maxCount >= threshold ? consensusHash : null;
}

/**
 * Generate verification summary
 */
export function generateVerificationSummary(verificationResult: any): string {
    const status = verificationResult.status;
    const executorResults = verificationResult.executor_results || [];
    const completedExecutors = executorResults.filter((r: any) => r.completed).length;
    const successfulExecutors = executorResults.filter((r: any) => r.completed && r.hash && !r.error).length;
    const failedExecutors = executorResults.filter((r: any) => r.completed && r.error).length;
    
    let summary = `Verification Status: ${Object.keys(status)[0]}\n`;
    summary += `Total Executors: ${executorResults.length}\n`;
    summary += `Completed: ${completedExecutors}\n`;
    summary += `Successful: ${successfulExecutors}\n`;
    summary += `Failed: ${failedExecutors}\n`;
    summary += `Consensus Threshold: ${verificationResult.consensus_threshold}\n`;
    summary += `Matching Results: ${verificationResult.matching_results}\n`;
    
    if (verificationResult.verified_hash) {
        summary += `Verified Hash: ${verificationResult.verified_hash}\n`;
    }
    
    if (verificationResult.error) {
        summary += `Error: ${verificationResult.error}\n`;
    }
    
    if (verificationResult.created_at) {
        summary += `Started: ${new Date(Number(verificationResult.created_at / 1_000_000n)).toISOString()}\n`;
    }
    
    if (verificationResult.completed_at) {
        summary += `Completed: ${new Date(Number(verificationResult.completed_at / 1_000_000n)).toISOString()}\n`;
        
        if (verificationResult.created_at) {
            const durationNanos = verificationResult.completed_at - verificationResult.created_at;
            const duration = Number(durationNanos) / 1_000_000_000;
            summary += `Duration: ${duration} seconds\n`;
        }
    }
    
    return summary;
}

/**
 * Validate canister configuration
 */
export function validateVerificationConfig(config: Partial<VerificationConfig>): string[] {
    const errors: string[] = [];
    
    if (!config.buildInstructionsCanisterId) {
        errors.push('Build instructions canister ID is required');
    }
    
    if (!config.buildExecutorCanisterIds || config.buildExecutorCanisterIds.length === 0) {
        errors.push('At least one build executor canister ID is required');
    }
    
    if (!config.authorizedRequester) {
        errors.push('Authorized requester principal is required');
    }
    
    if (!config.adminPrincipal) {
        errors.push('Admin principal is required');
    }
    
    if (config.consensusThreshold !== undefined && (config.consensusThreshold < 1 || config.consensusThreshold > 100)) {
        errors.push('Consensus threshold must be between 1 and 100 percent');
    }
    
    if (config.defaultTimeoutSeconds !== undefined && config.defaultTimeoutSeconds <= 0n) {
        errors.push('Default timeout must be greater than 0 seconds');
    }
    
    if (config.pollingIntervalSeconds !== undefined && config.pollingIntervalSeconds <= 0n) {
        errors.push('Polling interval must be greater than 0 seconds');
    }
    
    return errors;
}

/**
 * Create a default verification configuration
 */
export function createDefaultVerificationConfig(): Partial<VerificationConfig> {
    return {
        defaultTimeoutSeconds: 900n, // 15 minutes
        consensusThreshold: 51, // 51% consensus
        pollingIntervalSeconds: 30n // 30 seconds polling
    };
}

/**
 * Format cycles for display
 */
export function formatCycles(cycles: bigint): string {
    const billion = 1_000_000_000n;
    const million = 1_000_000n;
    const thousand = 1_000n;
    
    if (cycles >= billion) {
        return `${Number(cycles / billion).toFixed(2)}B cycles`;
    } else if (cycles >= million) {
        return `${Number(cycles / million).toFixed(2)}M cycles`;
    } else if (cycles >= thousand) {
        return `${Number(cycles / thousand).toFixed(2)}K cycles`;
    } else {
        return `${cycles} cycles`;
    }
}

/**
 * Format time duration
 */
export function formatDuration(nanoseconds: bigint): string {
    const seconds = Number(nanoseconds / 1_000_000_000n);
    
    if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    } else if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${seconds}s`;
    }
}

/**
 * Calculate verification metrics from history
 */
export function calculateVerificationMetrics(verificationHistory: [string, any][]): VerificationMetrics {
    const total = verificationHistory.length;
    let successful = 0;
    let failed = 0;
    let timeouts = 0;
    let consensusFailures = 0;
    let totalDuration = 0;
    let completedCount = 0;
    
    for (const [key, result] of verificationHistory) {
        if ('Verified' in result.status) {
            successful++;
        } else if ('Failed' in result.status) {
            failed++;
            if (result.error && result.error.includes('timeout')) {
                timeouts++;
            } else if (result.error && result.error.includes('consensus')) {
                consensusFailures++;
            }
        }
        
        if (result.created_at && result.completed_at) {
            const durationNanos = result.completed_at - result.created_at;
            const duration = Number(durationNanos) / 1_000_000_000;
            totalDuration += duration;
            completedCount++;
        }
    }
    
    return {
        totalVerifications: total,
        successfulVerifications: successful,
        failedVerifications: failed,
        timeoutedVerifications: timeouts,
        averageVerificationTime: completedCount > 0 ? Math.round(totalDuration / completedCount) : 0,
        consensusFailures
    };
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: string): boolean {
    const retryableErrors = [
        'network',
        'timeout',
        'resource',
        'temporary',
        'unavailable'
    ];
    
    const lowerError = error.toLowerCase();
    return retryableErrors.some(keyword => lowerError.includes(keyword));
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('security') || lowerError.includes('unauthorized')) {
        return 'critical';
    } else if (lowerError.includes('consensus') || lowerError.includes('validation')) {
        return 'high';
    } else if (lowerError.includes('timeout') || lowerError.includes('network')) {
        return 'medium';
    } else {
        return 'low';
    }
}

/**
 * Create error context for debugging
 */
export function createErrorContext(
    operation: string,
    projectId: string,
    version: string,
    error: any
): object {
    return {
        operation,
        projectId,
        version,
        error: error.toString(),
        timestamp: new Date().toISOString(),
        severity: getErrorSeverity(error.toString()),
        retryable: isRetryableError(error.toString())
    };
}
