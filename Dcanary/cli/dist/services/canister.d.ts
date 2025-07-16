import { Identity } from '@dfinity/agent';
import { VerificationResult } from '../types';
export declare const buildInstructionsIdl: ({ IDL }: any) => any;
export declare const verificationIdl: ({ IDL }: any) => any;
export declare class CanisterService {
    private agent;
    constructor(networkUrl: string, identity?: Identity);
    /**
     * Create actor for build instructions canister
     */
    private createBuildInstructionsActor;
    /**
     * Create actor for verification canister
     */
    private createVerificationActor;
    /**
     * Add or update build instructions
     */
    addBuildInstructions(canisterId: string, projectId: string, version: string, instructionSet: string): Promise<void>;
    /**
     * Get build instructions
     */
    getBuildInstructions(canisterId: string, projectId: string, version: string): Promise<any>;
    /**
     * Request verification
     */
    requestVerification(canisterId: string, projectId: string, version: string, timeoutSeconds?: number): Promise<VerificationResult>;
    /**
     * Get verification status
     */
    getVerificationStatus(canisterId: string, projectId: string, version: string): Promise<VerificationResult>;
    /**
     * Get verification history
     */
    getVerificationHistory(canisterId: string): Promise<[string, VerificationResult][]>;
    /**
     * Cancel verification
     */
    cancelVerification(canisterId: string, projectId: string, version: string): Promise<void>;
    /**
     * Get build instructions canister info
     */
    getBuildInstructionsCanisterInfo(canisterId: string): Promise<any>;
    /**
     * Get verification canister info
     */
    getVerificationCanisterInfo(canisterId: string): Promise<any>;
}
//# sourceMappingURL=canister.d.ts.map