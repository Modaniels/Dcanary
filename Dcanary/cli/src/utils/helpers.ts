import { StatusOutput, VerificationResult, ValidationError } from '../types';
import { Principal } from '@dfinity/principal';
import { HttpAgent, Identity } from '@dfinity/agent';

/**
 * Get identity for authentication
 */
export function getIdentity(): Identity {
    // Return a default identity for CLI operations
    // In a real implementation, this would handle identity creation/management
    return {} as Identity;
}

/**
 * Get HTTP agent for canister communication
 */
export function getAgent(network?: string, identity?: Identity): HttpAgent {
    // Return a default agent for CLI operations
    // In a real implementation, this would create a proper HTTP agent
    return {} as HttpAgent;
}

/**
 * Validate project ID format
 */
export function validateProjectId(projectId: string): void {
    if (!projectId) {
        throw new ValidationError('Project ID is required');
    }
    
    // Project ID should be alphanumeric with hyphens and underscores
    const regex = /^[a-zA-Z0-9_-]+$/;
    if (!regex.test(projectId) || projectId.length === 0 || projectId.length > 64) {
        throw new ValidationError(
            'Project ID must be alphanumeric with hyphens and underscores, and between 1-64 characters'
        );
    }
}

/**
 * Validate version format (semantic versioning)
 */
export function validateVersion(version: string): void {
    if (!version) {
        throw new ValidationError('Version is required');
    }
    
    // Basic semantic version validation
    const regex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9_-]+)?(\+[a-zA-Z0-9_-]+)?$/;
    if (!regex.test(version)) {
        throw new ValidationError(
            'Version must follow semantic versioning format (e.g., 1.0.0, 1.0.0-alpha, 1.0.0+build)'
        );
    }
}

/**
 * Validate canister ID format
 */
export function validateCanisterId(canisterId: string): void {
    if (!canisterId) {
        throw new ValidationError('Canister ID is required');
    }
    
    // Basic canister ID validation (Principal format)
    try {
        // This is a simplified check - the actual Principal validation would be more complex
        if (!/^[a-z0-9-]+$/.test(canisterId)) {
            throw new Error('Invalid format');
        }
    } catch (error) {
        throw new ValidationError('Invalid canister ID format');
    }
}

/**
 * Create verification key from project ID and version
 */
export function createVerificationKey(projectId: string, version: string): string {
    return `${projectId}:${version}`;
}

/**
 * Parse verification key into project ID and version
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
 * Format time duration in human-readable format
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
 * Get verification status as string
 */
export function getStatusString(status: any): string {
    if ('Pending' in status) return 'Pending';
    if ('Verified' in status) return 'Verified';
    if ('Failed' in status) return 'Failed';
    return 'Unknown';
}

/**
 * Convert verification result to display format
 */
export function formatVerificationResult(
    projectId: string,
    version: string,
    result: VerificationResult
): StatusOutput {
    const executorResults = result.executor_results || [];
    const completedExecutors = executorResults.filter(r => r.completed).length;
    const successfulExecutors = executorResults.filter(r => r.completed && r.hash && !r.error).length;
    const failedExecutors = executorResults.filter(r => r.completed && r.error).length;

    const output: StatusOutput = {
        projectId,
        version,
        status: getStatusString(result.status),
        totalExecutors: result.total_executors,
        completedExecutors,
        successfulExecutors,
        failedExecutors,
        consensusThreshold: result.consensus_threshold,
        matchingResults: result.matching_results
    };

    if (result.verified_hash) {
        output.verifiedHash = result.verified_hash;
    }

    if (result.error) {
        output.error = result.error;
    }

    if (result.created_at) {
        output.createdAt = new Date(Number(result.created_at / 1_000_000n)).toISOString();
    }

    if (result.completed_at) {
        output.completedAt = new Date(Number(result.completed_at / 1_000_000n)).toISOString();
        
        if (result.created_at) {
            const durationNanos = result.completed_at - result.created_at;
            output.duration = formatDuration(durationNanos);
        }
    }

    return output;
}

/**
 * Calculate verification progress percentage
 */
export function calculateProgress(completedExecutors: number, totalExecutors: number): number {
    if (totalExecutors === 0) return 0;
    return Math.round((completedExecutors / totalExecutors) * 100);
}

/**
 * Estimate remaining time based on current progress
 */
export function estimateRemainingTime(
    elapsedSeconds: number,
    completedExecutors: number,
    totalExecutors: number
): number | null {
    if (completedExecutors === 0 || completedExecutors >= totalExecutors) {
        return null;
    }
    
    const averageTimePerExecutor = elapsedSeconds / completedExecutors;
    const remainingExecutors = totalExecutors - completedExecutors;
    return Math.round(averageTimePerExecutor * remainingExecutors);
}

/**
 * Sleep for specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
    return !!(
        process.env.CI ||
        process.env.GITHUB_ACTIONS ||
        process.env.JENKINS_URL ||
        process.env.TRAVIS ||
        process.env.CIRCLECI ||
        process.env.GITLAB_CI
    );
}

/**
 * Get appropriate exit code based on verification status
 */
export function getExitCode(status: string): number {
    switch (status.toLowerCase()) {
        case 'verified':
            return 0;
        case 'failed':
            return 1;
        case 'pending':
            return 2;
        default:
            return 3;
    }
}
