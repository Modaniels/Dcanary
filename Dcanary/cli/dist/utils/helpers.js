"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateProjectId = validateProjectId;
exports.validateVersion = validateVersion;
exports.validateCanisterId = validateCanisterId;
exports.createVerificationKey = createVerificationKey;
exports.parseVerificationKey = parseVerificationKey;
exports.nanosecondsToSeconds = nanosecondsToSeconds;
exports.secondsToNanoseconds = secondsToNanoseconds;
exports.formatDuration = formatDuration;
exports.getStatusString = getStatusString;
exports.formatVerificationResult = formatVerificationResult;
exports.calculateProgress = calculateProgress;
exports.estimateRemainingTime = estimateRemainingTime;
exports.sleep = sleep;
exports.truncate = truncate;
exports.isCI = isCI;
exports.getExitCode = getExitCode;
const types_1 = require("../types");
/**
 * Validate project ID format
 */
function validateProjectId(projectId) {
    if (!projectId) {
        throw new types_1.ValidationError('Project ID is required');
    }
    // Project ID should be alphanumeric with hyphens and underscores
    const regex = /^[a-zA-Z0-9_-]+$/;
    if (!regex.test(projectId) || projectId.length === 0 || projectId.length > 64) {
        throw new types_1.ValidationError('Project ID must be alphanumeric with hyphens and underscores, and between 1-64 characters');
    }
}
/**
 * Validate version format (semantic versioning)
 */
function validateVersion(version) {
    if (!version) {
        throw new types_1.ValidationError('Version is required');
    }
    // Basic semantic version validation
    const regex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9_-]+)?(\+[a-zA-Z0-9_-]+)?$/;
    if (!regex.test(version)) {
        throw new types_1.ValidationError('Version must follow semantic versioning format (e.g., 1.0.0, 1.0.0-alpha, 1.0.0+build)');
    }
}
/**
 * Validate canister ID format
 */
function validateCanisterId(canisterId) {
    if (!canisterId) {
        throw new types_1.ValidationError('Canister ID is required');
    }
    // Basic canister ID validation (Principal format)
    try {
        // This is a simplified check - the actual Principal validation would be more complex
        if (!/^[a-z0-9-]+$/.test(canisterId)) {
            throw new Error('Invalid format');
        }
    }
    catch (error) {
        throw new types_1.ValidationError('Invalid canister ID format');
    }
}
/**
 * Create verification key from project ID and version
 */
function createVerificationKey(projectId, version) {
    return `${projectId}:${version}`;
}
/**
 * Parse verification key into project ID and version
 */
function parseVerificationKey(key) {
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
function nanosecondsToSeconds(nanoseconds) {
    return Number(nanoseconds / 1000000000n);
}
/**
 * Convert seconds to nanoseconds
 */
function secondsToNanoseconds(seconds) {
    return BigInt(seconds) * 1000000000n;
}
/**
 * Format time duration in human-readable format
 */
function formatDuration(nanoseconds) {
    const seconds = Number(nanoseconds / 1000000000n);
    if (seconds >= 3600) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
    else if (seconds >= 60) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }
    else {
        return `${seconds}s`;
    }
}
/**
 * Get verification status as string
 */
function getStatusString(status) {
    if ('Pending' in status)
        return 'Pending';
    if ('Verified' in status)
        return 'Verified';
    if ('Failed' in status)
        return 'Failed';
    return 'Unknown';
}
/**
 * Convert verification result to display format
 */
function formatVerificationResult(projectId, version, result) {
    const executorResults = result.executor_results || [];
    const completedExecutors = executorResults.filter(r => r.completed).length;
    const successfulExecutors = executorResults.filter(r => r.completed && r.hash && !r.error).length;
    const failedExecutors = executorResults.filter(r => r.completed && r.error).length;
    const output = {
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
        output.createdAt = new Date(Number(result.created_at / 1000000n)).toISOString();
    }
    if (result.completed_at) {
        output.completedAt = new Date(Number(result.completed_at / 1000000n)).toISOString();
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
function calculateProgress(completedExecutors, totalExecutors) {
    if (totalExecutors === 0)
        return 0;
    return Math.round((completedExecutors / totalExecutors) * 100);
}
/**
 * Estimate remaining time based on current progress
 */
function estimateRemainingTime(elapsedSeconds, completedExecutors, totalExecutors) {
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
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Truncate text to specified length with ellipsis
 */
function truncate(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
}
/**
 * Check if running in CI environment
 */
function isCI() {
    return !!(process.env.CI ||
        process.env.GITHUB_ACTIONS ||
        process.env.JENKINS_URL ||
        process.env.TRAVIS ||
        process.env.CIRCLECI ||
        process.env.GITLAB_CI);
}
/**
 * Get appropriate exit code based on verification status
 */
function getExitCode(status) {
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
//# sourceMappingURL=helpers.js.map