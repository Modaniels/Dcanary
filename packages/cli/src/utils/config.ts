import fs from "fs-extra";
import path from "path";
import os from "os";
import { CLIConfig, ConfigurationError } from "../types";
import { logger } from "./logger";

/**
 * Manages the CLI configuration, sourcing from a JSON file and environment variables.
 * Configuration is stored in `~/.dcanary/config.json`.
 * Environment variables (prefixed with DCANARY_) override file-based settings.
 */
export class ConfigManager {
  private configPath: string;
  private config: CLIConfig = {};

  constructor() {
    this.configPath = path.join(os.homedir(), ".dcanary", "config.json");
    this.loadConfig();
  }

  /**
   * Loads configuration from the config file and environment variables.
   * Environment variables take precedence over the config file.
   */
  private loadConfig(): void {
    try {
      // Load from config file first if it exists
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, "utf8");
        const fileConfig = JSON.parse(fileContent);
        this.config = { ...fileConfig };
      }

      // Load from environment variables, which will override file config
      this.loadFromEnvironment();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      logger.warn("Failed to load configuration.", { error: errorMessage });
    }
  }

  /**
   * Loads configuration from environment variables, mapping them to the internal config structure.
   */
  private loadFromEnvironment(): void {
    const envConfig: CLIConfig = {};

    if (process.env.DCANARY_BUILD_INSTRUCTIONS_CANISTER_ID) {
      envConfig.buildInstructionsCanisterId =
        process.env.DCANARY_BUILD_INSTRUCTIONS_CANISTER_ID;
    }

    if (process.env.DCANARY_VERIFICATION_CANISTER_ID) {
      envConfig.verificationCanisterId =
        process.env.DCANARY_VERIFICATION_CANISTER_ID;
    }

    if (process.env.DCANARY_BUILD_EXECUTOR_CANISTER_IDS) {
      envConfig.buildExecutorCanisterIds = process.env
        .DCANARY_BUILD_EXECUTOR_CANISTER_IDS.split(",");
    }

    if (process.env.DCANARY_NETWORK) {
      envConfig.network = process.env.DCANARY_NETWORK as "ic" | "local";
    }

    if (process.env.DCANARY_IDENTITY) {
      envConfig.identity = process.env.DCANARY_IDENTITY;
    }

    if (process.env.DCANARY_TIMEOUT) {
      envConfig.timeout = parseInt(process.env.DCANARY_TIMEOUT, 10);
    }

    if (process.env.DCANARY_LOG_LEVEL) {
      envConfig.logLevel = process.env.DCANARY_LOG_LEVEL as
        | "error"
        | "warn"
        | "info"
        | "debug";
    }

    this.config = { ...this.config, ...envConfig };
  }

  /**
   * Saves the current configuration to the config file.
   * @throws {ConfigurationError} If saving the configuration fails.
   */
  saveConfig(): void {
    try {
      fs.ensureDirSync(path.dirname(this.configPath));
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        "utf8",
      );
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new ConfigurationError(
        `Failed to save configuration: ${errorMessage}`,
      );
    }
  }

  /**
   * Retrieves the entire current configuration object.
   * @returns A copy of the current configuration.
   */
  getConfig(): CLIConfig {
    return { ...this.config };
  }

  /**
   * Gets a specific configuration value by key.
   * @param key The configuration key to retrieve.
   * @param defaultValue A default value to return if the key is not found.
   * @returns The configuration value or the default value.
   */
  get<K extends keyof CLIConfig>(key: K): CLIConfig[K];
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(
    key: string,
    defaultValue?: T,
  ): T | CLIConfig[keyof CLIConfig] | undefined {
    if (key in this.config) {
      return this.config[key as keyof CLIConfig] as T;
    }
    return defaultValue;
  }

  /**
   * Sets a single configuration value.
   * @param key The configuration key to set.
   * @param value The value to set.
   */
  set<K extends keyof CLIConfig>(key: K, value: CLIConfig[K]): void;
  set<T>(key: string, value: T): void;
  set<T>(key: string, value: T): void {
    (this.config as any)[key] = value;
  }

  /**
   * Sets multiple configuration values at once.
   * @param config A partial configuration object to merge into the current config.
   */
  setMany(config: Partial<CLIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Validates that the build instructions canister ID is configured.
   * @throws {ConfigurationError} If the canister ID is not configured.
   */
  validateBuildInstructionsConfig(): void {
    if (!this.config.buildInstructionsCanisterId) {
      throw new ConfigurationError(
        "Build instructions canister ID is not configured. " +
          "Use --canister-id option or configure it with: dcanary configure --set-build-canister-id <ID>",
      );
    }
  }

  /**
   * Validates that the verification canister ID is configured.
   * @throws {ConfigurationError} If the canister ID is not configured.
   */
  validateVerificationConfig(): void {
    if (!this.config.verificationCanisterId) {
      throw new ConfigurationError(
        "Verification canister ID is not configured. " +
          "Use --canister-id option or configure it with: dcanary configure --set-verification-canister-id <ID>",
      );
    }
  }

  /**
   * Gets the full URL for the configured network.
   * @returns The network URL.
   */
  getNetworkUrl(): string {
    const network = this.config.network || "local";
    return network === "ic" ? "https://ic0.app" : "http://127.0.0.1:4943";
  }

  /**
   * Gets the default command timeout in seconds.
   * @returns The timeout in seconds.
   */
  getTimeout(): number {
    return this.config.timeout || 600; // Default 10 minutes
  }

  /**
   * Checks if all required configuration settings are present.
   * @returns True if the configuration is complete, otherwise false.
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
   * Retrieves the status of key configuration parameters for display.
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
      network: this.config.network || "local",
      identity: this.config.identity,
      timeout: this.getTimeout(),
    };
  }

  /**
   * Resets the configuration to an empty state.
   */
  reset(): void {
    this.config = {};
  }

  /**
   * Loads configuration from a specific file path, overriding existing settings.
   * @param filePath The absolute path to the configuration file.
   * @throws {ConfigurationError} If loading from the file fails.
   */
  loadFromFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const fileConfig = JSON.parse(fileContent);
        this.config = { ...this.config, ...fileConfig };
      } else {
        throw new Error(`Configuration file not found: ${filePath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      throw new ConfigurationError(
        `Failed to load config from ${filePath}: ${errorMessage}`,
      );
    }
  }

  /**
   * Gets the path to the configuration file.
   * @returns The absolute path to the configuration file.
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

// Singleton instance for global access
export const configManager = new ConfigManager();
