import { CLIConfig } from '../types';
export declare class ConfigManager {
    private configPath;
    private config;
    constructor();
    /**
     * Load configuration from file and environment variables
     */
    private loadConfig;
    /**
     * Load configuration from environment variables
     */
    private loadFromEnvironment;
    /**
     * Ensure directory exists
     */
    private ensureDir;
    /**
     * Save configuration to file
     */
    saveConfig(): Promise<void>;
    /**
     * Get current configuration
     */
    getConfig(): CLIConfig;
    /**
     * Get a specific configuration value
     */
    get<K extends keyof CLIConfig>(key: K): CLIConfig[K];
    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    /**
     * Set a configuration value
     */
    set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void;
    set<T>(key: string, value: T): void;
    /**
     * Set multiple configuration values
     */
    setMany(config: Partial<CLIConfig>): void;
    /**
     * Validate required configuration for build instructions operations
     */
    validateBuildInstructionsConfig(): void;
    /**
     * Validate required configuration for verification operations
     */
    validateVerificationConfig(): void;
    /**
     * Get network URL based on configuration
     */
    getNetworkUrl(): string;
    /**
     * Get default timeout in seconds
     */
    getTimeout(): number;
    /**
     * Check if configuration is complete
     */
    isConfigured(): boolean;
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
    };
    /**
     * Reset configuration to defaults
     */
    reset(): void;
    /**
     * Load configuration from a specific file path
     */
    loadFromFile(filePath: string): void;
}
export declare const configManager: ConfigManager;
//# sourceMappingURL=config.d.ts.map