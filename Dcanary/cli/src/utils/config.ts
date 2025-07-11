import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CLIConfig, ConfigurationError } from '../types';

export class ConfigManager {
    private configPath: string;
    private config: CLIConfig = {};

    constructor() {
        this.configPath = path.join(os.homedir(), '.mody-cli', 'config.json');
        this.loadConfig();
    }

    /**
     * Load configuration from file and environment variables
     */
    private loadConfig(): void {
        try {
            // Load from environment variables first
            this.loadFromEnvironment();

            // Load from config file if it exists
            if (fs.existsSync(this.configPath)) {
                const fileContent = fs.readFileSync(this.configPath, 'utf8');
                const fileConfig = JSON.parse(fileContent);
                this.config = { ...this.config, ...fileConfig };
            }
        } catch (error) {
            // Silently continue if config loading fails
            console.warn('Warning: Failed to load configuration:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * Load configuration from environment variables
     */
    private loadFromEnvironment(): void {
        const envConfig: CLIConfig = {};

        if (process.env.MODY_BUILD_INSTRUCTIONS_CANISTER_ID) {
            envConfig.buildInstructionsCanisterId = process.env.MODY_BUILD_INSTRUCTIONS_CANISTER_ID;
        }

        if (process.env.MODY_VERIFICATION_CANISTER_ID) {
            envConfig.verificationCanisterId = process.env.MODY_VERIFICATION_CANISTER_ID;
        }

        if (process.env.MODY_BUILD_EXECUTOR_CANISTER_IDS) {
            envConfig.buildExecutorCanisterIds = process.env.MODY_BUILD_EXECUTOR_CANISTER_IDS.split(',');
        }

        if (process.env.MODY_NETWORK) {
            envConfig.network = process.env.MODY_NETWORK as 'ic' | 'local';
        }

        if (process.env.MODY_IDENTITY) {
            envConfig.identity = process.env.MODY_IDENTITY;
        }

        if (process.env.MODY_TIMEOUT) {
            envConfig.timeout = parseInt(process.env.MODY_TIMEOUT, 10);
        }

        if (process.env.MODY_LOG_LEVEL) {
            envConfig.logLevel = process.env.MODY_LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug';
        }

        this.config = { ...this.config, ...envConfig };
    }

    /**
     * Ensure directory exists
     */
    private ensureDir(dirPath: string): void {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Save configuration to file
     */
    async saveConfig(): Promise<void> {
        try {
            this.ensureDir(path.dirname(this.configPath));
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
        } catch (error) {
            throw new ConfigurationError(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): CLIConfig {
        return { ...this.config };
    }

    /**
     * Get a specific configuration value
     */
    get<K extends keyof CLIConfig>(key: K): CLIConfig[K];
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get<T>(key: string, defaultValue?: T): T | CLIConfig[keyof CLIConfig] | undefined {
        if (key in this.config) {
            return this.config[key as keyof CLIConfig] as T;
        }
        return defaultValue;
    }

    /**
     * Set a configuration value
     */
    set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void;
    set<T>(key: string, value: T): void;
    set<T>(key: string, value: T): void {
        (this.config as any)[key] = value;
    }

    /**
     * Set multiple configuration values
     */
    setMany(config: Partial<CLIConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Validate required configuration for build instructions operations
     */
    validateBuildInstructionsConfig(): void {
        if (!this.config.buildInstructionsCanisterId) {
            throw new ConfigurationError(
                'Build instructions canister ID is not configured. ' +
                'Use --canister-id option or configure it with: mody configure --set-build-canister-id <ID>'
            );
        }
    }

    /**
     * Validate required configuration for verification operations
     */
    validateVerificationConfig(): void {
        if (!this.config.verificationCanisterId) {
            throw new ConfigurationError(
                'Verification canister ID is not configured. ' +
                'Use --canister-id option or configure it with: mody configure --set-verification-canister-id <ID>'
            );
        }
    }

    /**
     * Get network URL based on configuration
     */
    getNetworkUrl(): string {
        const network = this.config.network || 'local';
        return network === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943';
    }

    /**
     * Get default timeout in seconds
     */
    getTimeout(): number {
        return this.config.timeout || 600; // Default 10 minutes
    }

    /**
     * Check if configuration is complete
     */
    isConfigured(): boolean {
        return !!(
            this.config.buildInstructionsCanisterId &&
            this.config.verificationCanisterId &&
            this.config.buildExecutorCanisterIds &&
            this.config.buildExecutorCanisterIds.length > 0
        );
    }

    /**
     * Get configuration status for display
     */
    getConfigStatus(): {
        buildInstructionsCanisterId: string | undefined;
        verificationCanisterId: string | undefined;
        executorCount: number;
        network: string;
        identity: string | undefined;
        timeout: number;
    } {
        return {
            buildInstructionsCanisterId: this.config.buildInstructionsCanisterId,
            verificationCanisterId: this.config.verificationCanisterId,
            executorCount: this.config.buildExecutorCanisterIds?.length || 0,
            network: this.config.network || 'local',
            identity: this.config.identity,
            timeout: this.getTimeout()
        };
    }

    /**
     * Reset configuration to defaults
     */
    reset(): void {
        this.config = {};
    }

    /**
     * Load configuration from a specific file path
     */
    loadFromFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const fileConfig = JSON.parse(fileContent);
                this.config = { ...this.config, ...fileConfig };
            } else {
                throw new Error(`Configuration file not found: ${filePath}`);
            }
        } catch (error) {
            throw new ConfigurationError(`Failed to load config from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

// Singleton instance
export const configManager = new ConfigManager();
