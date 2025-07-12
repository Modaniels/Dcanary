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
    trap,
    call
} from 'azle';

// ============================================================================
// DEPLOYMENT CANISTER TYPES
// ============================================================================

const NetworkType = IDL.Variant({
    Local: IDL.Null,
    IC: IDL.Null,
    Testnet: IDL.Record({ network_url: IDL.Text }),
    Custom: IDL.Record({ network_url: IDL.Text, is_mainnet: IDL.Bool })
});

type NetworkType = 
    | { Local: null }
    | { IC: null }
    | { Testnet: { network_url: string } }
    | { Custom: { network_url: string; is_mainnet: boolean } };

const DeploymentStrategy = IDL.Variant({
    Install: IDL.Null,
    Upgrade: IDL.Null,
    Reinstall: IDL.Null
});

type DeploymentStrategy = 
    | { Install: null }
    | { Upgrade: null }
    | { Reinstall: null };

const DeploymentRequest = IDL.Record({
    canister_name: IDL.Text,
    wasm_module: IDL.Vec(IDL.Nat8),
    init_args: IDL.Vec(IDL.Nat8),
    network: NetworkType,
    strategy: DeploymentStrategy,
    canister_id: IDL.Opt(IDL.Principal),
    cycles_amount: IDL.Opt(IDL.Nat64),
    memory_allocation: IDL.Opt(IDL.Nat64),
    compute_allocation: IDL.Opt(IDL.Nat64),
    freeze_threshold: IDL.Opt(IDL.Nat64),
    reserved_cycles_limit: IDL.Opt(IDL.Nat64)
});

type DeploymentRequest = {
    canister_name: string;
    wasm_module: number[];
    init_args: number[];
    network: NetworkType;
    strategy: DeploymentStrategy;
    canister_id: Principal | null;
    cycles_amount: bigint | null;
    memory_allocation: bigint | null;
    compute_allocation: bigint | null;
    freeze_threshold: bigint | null;
    reserved_cycles_limit: bigint | null;
};

const DeploymentStatus = IDL.Variant({
    Pending: IDL.Null,
    InProgress: IDL.Null,
    Completed: IDL.Null,
    Failed: IDL.Null,
    RolledBack: IDL.Null
});

type DeploymentStatus = 
    | { Pending: null }
    | { InProgress: null }
    | { Completed: null }
    | { Failed: null }
    | { RolledBack: null };

const DeploymentResult = IDL.Record({
    deployment_id: IDL.Text,
    canister_id: IDL.Principal,
    canister_name: IDL.Text,
    network: NetworkType,
    status: DeploymentStatus,
    deployed_at: IDL.Nat64,
    cycles_used: IDL.Nat64,
    wasm_hash: IDL.Text,
    version: IDL.Nat32,
    deployer: IDL.Principal,
    logs: IDL.Vec(IDL.Text),
    error_message: IDL.Opt(IDL.Text)
});

type DeploymentResult = {
    deployment_id: string;
    canister_id: Principal;
    canister_name: string;
    network: NetworkType;
    status: DeploymentStatus;
    deployed_at: bigint;
    cycles_used: bigint;
    wasm_hash: string;
    version: number;
    deployer: Principal;
    logs: string[];
    error_message: string | null;
};

const DeploymentError = IDL.Variant({
    NotFound: IDL.Text,
    Unauthorized: IDL.Text,
    InvalidInput: IDL.Text,
    InsufficientCycles: IDL.Text,
    NetworkError: IDL.Text,
    CanisterError: IDL.Text,
    InternalError: IDL.Text
});

type DeploymentError = 
    | { NotFound: string }
    | { Unauthorized: string }
    | { InvalidInput: string }
    | { InsufficientCycles: string }
    | { NetworkError: string }
    | { CanisterError: string }
    | { InternalError: string };

const DeploymentResultWrapper = IDL.Variant({
    Ok: DeploymentResult,
    Err: DeploymentError
});

type DeploymentResultWrapper = 
    | { Ok: DeploymentResult }
    | { Err: DeploymentError };

const CyclesBalance = IDL.Record({
    canister_id: IDL.Principal,
    balance: IDL.Nat64,
    reserved: IDL.Nat64,
    available: IDL.Nat64,
    last_updated: IDL.Nat64
});

type CyclesBalance = {
    canister_id: Principal;
    balance: bigint;
    reserved: bigint;
    available: bigint;
    last_updated: bigint;
};

const CanisterInfo = IDL.Record({
    canister_id: IDL.Principal,
    name: IDL.Text,
    owner: IDL.Principal,
    network: NetworkType,
    created_at: IDL.Nat64,
    last_deployed: IDL.Nat64,
    deployment_count: IDL.Nat32,
    current_version: IDL.Nat32,
    status: IDL.Text,
    cycles_balance: CyclesBalance
});

type CanisterInfo = {
    canister_id: Principal;
    name: string;
    owner: Principal;
    network: NetworkType;
    created_at: bigint;
    last_deployed: bigint;
    deployment_count: number;
    current_version: number;
    status: string;
    cycles_balance: CyclesBalance;
};

// ============================================================================
// DEPLOYMENT CANISTER
// ============================================================================

export default class DeploymentCanister {
    // Stable storage for deployment history
    private deployments = new StableBTreeMap<string, DeploymentResult>(0);
    
    // Canister registry for tracking deployed canisters
    private canisters = new StableBTreeMap<string, CanisterInfo>(1);
    
    // Network configurations
    private networks = new StableBTreeMap<string, NetworkType>(2);
    
    // Cycles management
    private cyclesBalances = new StableBTreeMap<string, CyclesBalance>(3);
    
    // Admin principals
    private adminPrincipals: Principal[] = [Principal.fromText('2vxsx-fae')];
    
    // Default cycles amounts
    private readonly DEFAULT_CYCLES = 2_000_000_000_000n; // 2T cycles
    private readonly MIN_CYCLES = 100_000_000_000n; // 100B cycles

    // ============================================================================
    // LIFECYCLE HOOKS
    // ============================================================================

    @init([])
    init(): void {
        console.log('Deployment Canister initialized');
        // Initialize default networks directly in init
        this.networks.insert('local', { Local: null });
        this.networks.insert('ic', { IC: null });
        this.networks.insert('testnet', { 
            Testnet: { network_url: 'https://testnet.dfinity.network' } 
        });
    }

    @postUpgrade([])
    postUpgrade(): void {
        console.log('Deployment Canister upgraded');
    }

    // ============================================================================
    // DEPLOYMENT MANAGEMENT
    // ============================================================================

    /**
     * Deploy a canister to the specified network
     */
    @update([DeploymentRequest])
    async deployCanister(request: DeploymentRequest): Promise<DeploymentResultWrapper> {
        try {
            const caller = msgCaller();
            const deploymentId = this.generateDeploymentId();
            const now = time();

            console.log(`Starting deployment: ${deploymentId} for canister: ${request.canister_name}`);

            // Validate request
            const validationResult = this.validateDeploymentRequest(request);
            if (validationResult !== null) {
                return { Err: validationResult };
            }

            // Calculate WASM hash for versioning
            const wasmHash = await this.calculateWasmHash(new Uint8Array(request.wasm_module));

            // Prepare deployment
            let canisterId: Principal;
            let deploymentStatus: DeploymentStatus = { InProgress: null };
            let logs: string[] = [];
            let cyclesUsed = 0n;

            try {
                // Execute deployment based on strategy
                const deployResult = await this.executeDeployment(request, deploymentId, logs);
                canisterId = deployResult.canister_id;
                cyclesUsed = deployResult.cycles_used;
                deploymentStatus = { Completed: null };
                
                logs.push(`Deployment completed successfully. Canister ID: ${canisterId.toText()}`);

            } catch (error) {
                console.log(`Deployment failed: ${error}`);
                deploymentStatus = { Failed: null };
                logs.push(`Deployment failed: ${error}`);
                
                return {
                    Err: { CanisterError: `Deployment failed: ${error}` }
                };
            }

            // Create deployment result
            const result: DeploymentResult = {
                deployment_id: deploymentId,
                canister_id: canisterId,
                canister_name: request.canister_name,
                network: request.network,
                status: deploymentStatus,
                deployed_at: now,
                cycles_used: cyclesUsed,
                wasm_hash: wasmHash,
                version: await this.getNextVersion(request.canister_name),
                deployer: caller,
                logs: logs,
                error_message: null
            };

            // Store deployment result
            this.deployments.insert(deploymentId, result);

            // Update canister registry
            this.updateCanisterRegistry(request, canisterId, caller, now);

            // Update cycles tracking
            this.updateCyclesBalance(canisterId, cyclesUsed);

            console.log(`Deployment completed: ${deploymentId}`);
            return { Ok: result };

        } catch (error) {
            console.log(`Deployment error: ${error}`);
            return {
                Err: { InternalError: `Deployment failed: ${error}` }
            };
        }
    }

    /**
     * Upgrade an existing canister
     */
    @update([IDL.Principal, IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)])
    async upgradeCanister(
        canisterId: Principal,
        wasmModule: number[],
        upgradeArgs: number[]
    ): Promise<DeploymentResultWrapper> {
        try {
            const caller = msgCaller();
            
            // Check if canister exists in our registry
            const canisterInfo = this.canisters.get(canisterId.toText());
            if (!canisterInfo) {
                return {
                    Err: { NotFound: `Canister ${canisterId.toText()} not found in registry` }
                };
            }

            // Check ownership
            if (canisterInfo.owner.toText() !== caller.toText() && !this.isAdmin(caller)) {
                return {
                    Err: { Unauthorized: 'Only canister owner or admin can upgrade' }
                };
            }

            // Create upgrade request
            const upgradeRequest: DeploymentRequest = {
                canister_name: canisterInfo.name,
                wasm_module: wasmModule,
                init_args: upgradeArgs,
                network: canisterInfo.network,
                strategy: { Upgrade: null },
                canister_id: canisterId,
                cycles_amount: null,
                memory_allocation: null,
                compute_allocation: null,
                freeze_threshold: null,
                reserved_cycles_limit: null
            };

            return await this.deployCanister(upgradeRequest);

        } catch (error) {
            return {
                Err: { InternalError: `Upgrade failed: ${error}` }
            };
        }
    }

    /**
     * Get deployment status
     */
    @query([IDL.Text])
    getDeploymentStatus(deploymentId: string): DeploymentResultWrapper {
        const deployment = this.deployments.get(deploymentId);
        if (!deployment) {
            return {
                Err: { NotFound: `Deployment ${deploymentId} not found` }
            };
        }

        return { Ok: deployment };
    }

    /**
     * List deployments by deployer
     */
    @query([])
    listMyDeployments(): Array<[string, DeploymentResult]> {
        const caller = msgCaller();
        const allDeployments = this.deployments.items();
        
        return allDeployments.filter(([_, deployment]) => 
            deployment.deployer.toText() === caller.toText()
        );
    }

    /**
     * List all canisters managed by this deployment canister
     */
    @query([])
    listManagedCanisters(): Array<[string, CanisterInfo]> {
        const caller = msgCaller();
        const allCanisters = this.canisters.items();
        
        return allCanisters.filter(([_, canister]) => 
            canister.owner.toText() === caller.toText() || this.isAdmin(caller)
        );
    }

    // ============================================================================
    // CYCLES MANAGEMENT
    // ============================================================================

    /**
     * Add cycles to a canister
     */
    @update([IDL.Principal, IDL.Nat64])
    async addCycles(canisterId: Principal, amount: bigint): Promise<boolean> {
        try {
            const caller = msgCaller();
            
            // Verify ownership or admin access
            const canisterInfo = this.canisters.get(canisterId.toText());
            if (canisterInfo && canisterInfo.owner.toText() !== caller.toText() && !this.isAdmin(caller)) {
                trap('Only canister owner or admin can add cycles');
            }

            // In a real implementation, this would:
            // 1. Check caller's cycles balance
            // 2. Transfer cycles to the target canister
            // 3. Update tracking records

            console.log(`Adding ${amount} cycles to canister ${canisterId.toText()}`);
            
            // Mock implementation
            this.updateCyclesBalance(canisterId, -amount); // Negative to indicate addition
            
            return true;

        } catch (error) {
            console.log(`Failed to add cycles: ${error}`);
            return false;
        }
    }

    /**
     * Get cycles balance for a canister
     */
    @query([IDL.Principal])
    getCyclesBalance(canisterId: Principal): CyclesBalance | null {
        return this.cyclesBalances.get(canisterId.toText()) || null;
    }

    /**
     * Monitor cycles and send alerts for low balances
     */
    @query([])
    getLowCyclesAlerts(): Array<[string, CyclesBalance]> {
        const alerts: Array<[string, CyclesBalance]> = [];
        const threshold = this.MIN_CYCLES * 2n; // Alert when cycles are below 2x minimum

        for (const [canisterIdText, balance] of this.cyclesBalances.items()) {
            if (balance.available < threshold) {
                alerts.push([canisterIdText, balance]);
            }
        }

        return alerts;
    }

    // ============================================================================
    // NETWORK MANAGEMENT
    // ============================================================================

    /**
     * Add custom network configuration
     */
    @update([IDL.Text, NetworkType])
    addNetwork(name: string, network: NetworkType): boolean {
        const caller = msgCaller();
        
        if (!this.isAdmin(caller)) {
            trap('Only admin can add networks');
        }

        this.networks.insert(name, network);
        return true;
    }

    /**
     * List available networks
     */
    @query([])
    listNetworks(): Array<[string, NetworkType]> {
        return this.networks.items();
    }

    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================

    private validateDeploymentRequest(request: DeploymentRequest): DeploymentError | null {
        // Validate WASM module
        if (request.wasm_module.length === 0) {
            return { InvalidInput: 'WASM module cannot be empty' };
        }

        if (request.wasm_module.length > 10 * 1024 * 1024) { // 10MB limit
            return { InvalidInput: 'WASM module too large (max 10MB)' };
        }

        // Validate canister name
        if (request.canister_name.length === 0) {
            return { InvalidInput: 'Canister name cannot be empty' };
        }

        // For upgrades, ensure canister ID is provided
        if ('Upgrade' in request.strategy && !request.canister_id) {
            return { InvalidInput: 'Canister ID required for upgrade' };
        }

        return null;
    }

    private async executeDeployment(
        request: DeploymentRequest,
        deploymentId: string,
        logs: string[]
    ): Promise<{ canister_id: Principal; cycles_used: bigint }> {
        
        logs.push(`Executing deployment strategy: ${Object.keys(request.strategy)[0]}`);

        if ('Install' in request.strategy) {
            return await this.installCanister(request, logs);
        } else if ('Upgrade' in request.strategy) {
            return await this.upgradeCanisterInternal(request, logs);
        } else if ('Reinstall' in request.strategy) {
            return await this.reinstallCanister(request, logs);
        } else {
            throw new Error('Unknown deployment strategy');
        }
    }

    private async installCanister(
        request: DeploymentRequest,
        logs: string[]
    ): Promise<{ canister_id: Principal; cycles_used: bigint }> {
        
        logs.push('Creating new canister...');

        // In a real implementation, this would:
        // 1. Create a new canister on the specified network
        // 2. Install the WASM module
        // 3. Initialize with provided arguments
        // 4. Return the canister ID and cycles used

        // Mock implementation
        const canisterId = Principal.fromText('rdmx6-jaaaa-aaaah-qcaiq-cai');
        const cyclesUsed = request.cycles_amount || this.DEFAULT_CYCLES;

        logs.push(`Canister created with ID: ${canisterId.toText()}`);
        logs.push('Installing WASM module...');
        logs.push('Initializing canister...');

        return { canister_id: canisterId, cycles_used: cyclesUsed };
    }

    private async upgradeCanisterInternal(
        request: DeploymentRequest,
        logs: string[]
    ): Promise<{ canister_id: Principal; cycles_used: bigint }> {
        
        if (!request.canister_id) {
            throw new Error('Canister ID required for upgrade');
        }

        logs.push(`Upgrading canister: ${request.canister_id.toText()}`);

        // In a real implementation, this would:
        // 1. Stop the canister
        // 2. Install the new WASM module
        // 3. Run post-upgrade hooks
        // 4. Start the canister

        logs.push('Stopping canister...');
        logs.push('Installing new WASM module...');
        logs.push('Running post-upgrade hooks...');
        logs.push('Starting canister...');

        const cyclesUsed = 1_000_000_000n; // Upgrade typically uses fewer cycles

        return { canister_id: request.canister_id, cycles_used: cyclesUsed };
    }

    private async reinstallCanister(
        request: DeploymentRequest,
        logs: string[]
    ): Promise<{ canister_id: Principal; cycles_used: bigint }> {
        
        if (!request.canister_id) {
            throw new Error('Canister ID required for reinstall');
        }

        logs.push(`Reinstalling canister: ${request.canister_id.toText()}`);

        // In a real implementation, this would:
        // 1. Stop the canister
        // 2. Clear all data
        // 3. Install the WASM module
        // 4. Initialize with provided arguments
        // 5. Start the canister

        logs.push('Stopping canister...');
        logs.push('Clearing canister data...');
        logs.push('Installing WASM module...');
        logs.push('Initializing canister...');
        logs.push('Starting canister...');

        const cyclesUsed = request.cycles_amount || this.DEFAULT_CYCLES;

        return { canister_id: request.canister_id, cycles_used: cyclesUsed };
    }

    private async calculateWasmHash(wasmModule: Uint8Array): Promise<string> {
        // In a real implementation, this would calculate SHA256 hash
        // For now, return a mock hash
        return `sha256:${wasmModule.length}_${Date.now()}`;
    }

    private async getNextVersion(canisterName: string): Promise<number> {
        const deployments = this.deployments.items();
        const canisterDeployments = deployments.filter(([_, deployment]) => 
            deployment.canister_name === canisterName
        );

        return canisterDeployments.length + 1;
    }

    private updateCanisterRegistry(
        request: DeploymentRequest,
        canisterId: Principal,
        owner: Principal,
        now: bigint
    ): void {
        const canisterIdText = canisterId.toText();
        const existingCanister = this.canisters.get(canisterIdText);

        if (existingCanister) {
            // Update existing canister
            const updatedCanister: CanisterInfo = {
                ...existingCanister,
                last_deployed: now,
                deployment_count: existingCanister.deployment_count + 1,
                current_version: existingCanister.current_version + 1
            };
            this.canisters.insert(canisterIdText, updatedCanister);
        } else {
            // Register new canister
            const newCanister: CanisterInfo = {
                canister_id: canisterId,
                name: request.canister_name,
                owner: owner,
                network: request.network,
                created_at: now,
                last_deployed: now,
                deployment_count: 1,
                current_version: 1,
                status: 'running',
                cycles_balance: {
                    canister_id: canisterId,
                    balance: request.cycles_amount || this.DEFAULT_CYCLES,
                    reserved: 0n,
                    available: request.cycles_amount || this.DEFAULT_CYCLES,
                    last_updated: now
                }
            };
            this.canisters.insert(canisterIdText, newCanister);
        }
    }

    private updateCyclesBalance(canisterId: Principal, cyclesUsed: bigint): void {
        const canisterIdText = canisterId.toText();
        const existingBalance = this.cyclesBalances.get(canisterIdText);

        if (existingBalance) {
            const updatedBalance: CyclesBalance = {
                ...existingBalance,
                balance: existingBalance.balance - cyclesUsed,
                available: existingBalance.available - cyclesUsed,
                last_updated: time()
            };
            this.cyclesBalances.insert(canisterIdText, updatedBalance);
        } else {
            const newBalance: CyclesBalance = {
                canister_id: canisterId,
                balance: this.DEFAULT_CYCLES - cyclesUsed,
                reserved: 0n,
                available: this.DEFAULT_CYCLES - cyclesUsed,
                last_updated: time()
            };
            this.cyclesBalances.insert(canisterIdText, newBalance);
        }
    }

    private generateDeploymentId(): string {
        const timestamp = time();
        const random = Math.floor(Math.random() * 1000000);
        return `deploy_${timestamp}_${random}`;
    }

    private isAdmin(principal: Principal): boolean {
        return this.adminPrincipals.some(admin => admin.toText() === principal.toText());
    }
}
