import { Actor, HttpAgent, Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { 
    BuildInstructionsResult, 
    VoidResult, 
    VerificationResultWrapper,
    VerificationResult,
    NetworkError,
    CanisterError 
} from '../types';
import { logger } from '../utils/logger';

// IDL definitions for the canisters
export const buildInstructionsIdl = ({ IDL }: any) => {
    const BuildInstructions = IDL.Record({
        project_id: IDL.Text,
        version: IDL.Text,
        instruction_set: IDL.Text,
        created_at: IDL.Nat64,
        updated_at: IDL.Nat64,
        created_by: IDL.Principal
    });

    const BuildInstructionsError = IDL.Variant({
        NotFound: IDL.Text,
        Unauthorized: IDL.Text,
        InvalidInput: IDL.Text,
        InternalError: IDL.Text
    });

    const BuildInstructionsResult = IDL.Variant({
        Ok: BuildInstructions,
        Err: BuildInstructionsError
    });

    const VoidResult = IDL.Variant({
        Ok: IDL.Null,
        Err: BuildInstructionsError
    });

    return IDL.Service({
        add_build_instructions: IDL.Func([IDL.Text, IDL.Text, IDL.Text], [VoidResult], []),
        get_build_instructions: IDL.Func([IDL.Text, IDL.Text], [BuildInstructionsResult], ['query']),
        list_build_instructions: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, BuildInstructions))], ['query']),
        delete_build_instructions: IDL.Func([IDL.Text, IDL.Text], [VoidResult], []),
        get_canister_info: IDL.Func([], [IDL.Record({
            version: IDL.Text,
            deployed_at: IDL.Nat64,
            total_instructions: IDL.Nat64,
            admin_principal: IDL.Principal
        })], ['query'])
    });
};

export const verificationIdl = ({ IDL }: any) => {
    const VerificationStatus = IDL.Variant({
        Pending: IDL.Null,
        Verified: IDL.Null,
        Failed: IDL.Null
    });

    const ExecutorResult = IDL.Record({
        executor_id: IDL.Principal,
        hash: IDL.Opt(IDL.Text),
        error: IDL.Opt(IDL.Text),
        completed: IDL.Bool,
        execution_time: IDL.Opt(IDL.Nat64)
    });

    const VerificationResult = IDL.Record({
        status: VerificationStatus,
        verified_hash: IDL.Opt(IDL.Text),
        error: IDL.Opt(IDL.Text),
        executor_results: IDL.Vec(ExecutorResult),
        consensus_threshold: IDL.Nat8,
        total_executors: IDL.Nat8,
        matching_results: IDL.Nat8,
        created_at: IDL.Nat64,
        completed_at: IDL.Opt(IDL.Nat64)
    });

    const VerificationError = IDL.Variant({
        NotFound: IDL.Text,
        Unauthorized: IDL.Text,
        InvalidInput: IDL.Text,
        InternalError: IDL.Text,
        TimeoutError: IDL.Text,
        ConsensusFailure: IDL.Text,
        InstructionsNotFound: IDL.Text,
        ExecutorFailure: IDL.Text
    });

    const VerificationResultWrapper = IDL.Variant({
        Ok: VerificationResult,
        Err: VerificationError
    });

    return IDL.Service({
        request_verification: IDL.Func([IDL.Text, IDL.Text, IDL.Opt(IDL.Nat64)], [VerificationResultWrapper], []),
        get_verification_status: IDL.Func([IDL.Text, IDL.Text], [VerificationResultWrapper], ['query']),
        get_verification_history: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, VerificationResult))], ['query']),
        cancel_verification: IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({
            Ok: IDL.Null,
            Err: VerificationError
        })], []),
        get_canister_info: IDL.Func([], [IDL.Record({
            version: IDL.Text,
            deployed_at: IDL.Nat64,
            total_verifications: IDL.Nat64,
            build_instructions_canister_id: IDL.Principal,
            build_executor_canister_ids: IDL.Vec(IDL.Principal),
            authorized_requester: IDL.Principal,
            admin_principal: IDL.Principal
        })], ['query'])
    });
};

export class CanisterService {
    private agent: HttpAgent;

    constructor(networkUrl: string, identity?: Identity) {
        this.agent = new HttpAgent({
            host: networkUrl,
            identity
        });

        // Fetch root key for local development
        if (networkUrl.includes('127.0.0.1') || networkUrl.includes('localhost')) {
            this.agent.fetchRootKey().catch(err => {
                logger.warn('Failed to fetch root key', { error: err.message });
            });
        }
    }

    /**
     * Create actor for build instructions canister
     */
    private createBuildInstructionsActor(canisterId: string) {
        return Actor.createActor(buildInstructionsIdl, {
            agent: this.agent,
            canisterId: Principal.fromText(canisterId)
        });
    }

    /**
     * Create actor for verification canister
     */
    private createVerificationActor(canisterId: string) {
        return Actor.createActor(verificationIdl, {
            agent: this.agent,
            canisterId: Principal.fromText(canisterId)
        });
    }

    /**
     * Add or update build instructions
     */
    async addBuildInstructions(
        canisterId: string,
        projectId: string,
        version: string,
        instructionSet: string
    ): Promise<void> {
        try {
            const actor = this.createBuildInstructionsActor(canisterId);
            const result = await actor.add_build_instructions(projectId, version, instructionSet) as VoidResult;

            if ('Err' in result) {
                const error = result.Err;
                const errorMessage = Object.values(error)[0] as string;
                throw new CanisterError(`Failed to add build instructions: ${errorMessage}`);
            }

            logger.info('Build instructions added successfully', { projectId, version });
        } catch (error: any) {
            if (error instanceof CanisterError) {
                throw error;
            }
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new NetworkError(`Failed to communicate with build instructions canister: ${errorMessage}`);
        }
    }

    /**
     * Get build instructions
     */
    async getBuildInstructions(
        canisterId: string,
        projectId: string,
        version: string
    ): Promise<any> {
        try {
            const actor = this.createBuildInstructionsActor(canisterId);
            const result = await actor.get_build_instructions(projectId, version) as BuildInstructionsResult;

            if ('Err' in result) {
                const error = result.Err;
                const errorMessage = Object.values(error)[0] as string;
                throw new CanisterError(`Failed to get build instructions: ${errorMessage}`);
            }

            return result.Ok;
        } catch (error: any) {
            if (error instanceof CanisterError) {
                throw error;
            }
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new NetworkError(`Failed to communicate with build instructions canister: ${errorMessage}`);
        }
    }

    /**
     * Request verification
     */
    async requestVerification(
        canisterId: string,
        projectId: string,
        version: string,
        timeoutSeconds?: number
    ): Promise<VerificationResult> {
        try {
            const actor = this.createVerificationActor(canisterId);
            const timeout = timeoutSeconds ? [BigInt(timeoutSeconds)] : [];
            const result = await actor.request_verification(projectId, version, timeout) as VerificationResultWrapper;

            if ('Err' in result) {
                const error = result.Err;
                const errorMessage = Object.values(error)[0] as string;
                throw new CanisterError(`Failed to request verification: ${errorMessage}`);
            }

            logger.info('Verification requested successfully', { projectId, version });
            return result.Ok;
        } catch (error: any) {
            if (error instanceof CanisterError) {
                throw error;
            }
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new NetworkError(`Failed to communicate with verification canister: ${errorMessage}`);
        }
    }

    /**
     * Get verification status
     */
    async getVerificationStatus(
        canisterId: string,
        projectId: string,
        version: string
    ): Promise<VerificationResult> {
        try {
            const actor = this.createVerificationActor(canisterId);
            const result = await actor.get_verification_status(projectId, version) as VerificationResultWrapper;

            if ('Err' in result) {
                const error = result.Err;
                const errorMessage = Object.values(error)[0] as string;
                throw new CanisterError(`Failed to get verification status: ${errorMessage}`);
            }

            return result.Ok;
        } catch (error: any) {
            if (error instanceof CanisterError) {
                throw error;
            }
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new NetworkError(`Failed to communicate with verification canister: ${errorMessage}`);
        }
    }

    /**
     * Get verification history
     */
    async getVerificationHistory(canisterId: string): Promise<[string, VerificationResult][]> {
        try {
            const actor = this.createVerificationActor(canisterId);
            const result = await actor.get_verification_history();
            return result as [string, VerificationResult][];
        } catch (error: any) {
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new NetworkError(`Failed to get verification history: ${errorMessage}`);
        }
    }

    /**
     * Cancel verification
     */
    async cancelVerification(
        canisterId: string,
        projectId: string,
        version: string
    ): Promise<void> {
        try {
            const actor = this.createVerificationActor(canisterId);
            const result = await actor.cancel_verification(projectId, version) as any;

            if (result && 'Err' in result) {
                const error = result.Err;
                const errorMessage = Object.values(error as any)[0] as string;
                throw new CanisterError(`Failed to cancel verification: ${errorMessage}`);
            }

            logger.info('Verification cancelled successfully', { projectId, version });
        } catch (error: any) {
            if (error instanceof CanisterError) {
                throw error;
            }
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new NetworkError(`Failed to communicate with verification canister: ${errorMessage}`);
        }
    }

    /**
     * Get build instructions canister info
     */
    async getBuildInstructionsCanisterInfo(canisterId: string): Promise<any> {
        try {
            const actor = this.createBuildInstructionsActor(canisterId);
            return await actor.get_canister_info();
        } catch (error: any) {
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new NetworkError(`Failed to get canister info: ${errorMessage}`);
        }
    }

    /**
     * Get verification canister info
     */
    async getVerificationCanisterInfo(canisterId: string): Promise<any> {
        try {
            const actor = this.createVerificationActor(canisterId);
            return await actor.get_canister_info();
        } catch (error: any) {
            const errorMessage = error?.message || 'Unknown error occurred';
            throw new NetworkError(`Failed to get canister info: ${errorMessage}`);
        }
    }
}
