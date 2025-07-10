import { StatusOutput, VerificationResult } from '../types';
import { HttpAgent, Identity } from '@dfinity/agent';
/**
 * Get identity for authentication
 */
export declare function getIdentity(): Identity;
/**
 * Get HTTP agent for canister communication
 */
export declare function getAgent(network?: string, identity?: Identity): HttpAgent;
/**
 * Validate project ID format
 */
export declare function validateProjectId(projectId: string): void;
/**
 * Validate version format (semantic versioning)
 */
export declare function validateVersion(version: string): void;
/**
 * Validate canister ID format
 */
export declare function validateCanisterId(canisterId: string): void;
/**
 * Create verification key from project ID and version
 */
export declare function createVerificationKey(projectId: string, version: string): string;
/**
 * Parse verification key into project ID and version
 */
export declare function parseVerificationKey(key: string): {
    projectId: string;
    version: string;
} | null;
/**
 * Convert nanoseconds to seconds
 */
export declare function nanosecondsToSeconds(nanoseconds: bigint): number;
/**
 * Convert seconds to nanoseconds
 */
export declare function secondsToNanoseconds(seconds: number): bigint;
/**
 * Format time duration in human-readable format
 */
export declare function formatDuration(nanoseconds: bigint): string;
/**
 * Get verification status as string
 */
export declare function getStatusString(status: any): string;
/**
 * Convert verification result to display format
 */
export declare function formatVerificationResult(projectId: string, version: string, result: VerificationResult): StatusOutput;
/**
 * Calculate verification progress percentage
 */
export declare function calculateProgress(completedExecutors: number, totalExecutors: number): number;
/**
 * Estimate remaining time based on current progress
 */
export declare function estimateRemainingTime(elapsedSeconds: number, completedExecutors: number, totalExecutors: number): number | null;
/**
 * Sleep for specified number of milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Truncate text to specified length with ellipsis
 */
export declare function truncate(text: string, maxLength: number): string;
/**
 * Check if running in CI environment
 */
export declare function isCI(): boolean;
/**
 * Get appropriate exit code based on verification status
 */
export declare function getExitCode(status: string): number;
//# sourceMappingURL=helpers.d.ts.map