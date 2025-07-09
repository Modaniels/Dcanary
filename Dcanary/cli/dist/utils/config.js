"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.configManager = exports.ConfigManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const types_1 = require("../types");
class ConfigManager {
    configPath;
    config = {};
    constructor() {
        this.configPath = path.join(os.homedir(), '.mody-cli', 'config.json');
        this.loadConfig();
    }
    /**
     * Load configuration from file and environment variables
     */
    loadConfig() {
        try {
            // Load from environment variables first
            this.loadFromEnvironment();
            // Load from config file if it exists
            if (fs.existsSync(this.configPath)) {
                const fileContent = fs.readFileSync(this.configPath, 'utf8');
                const fileConfig = JSON.parse(fileContent);
                this.config = { ...this.config, ...fileConfig };
            }
        }
        catch (error) {
            // Silently continue if config loading fails
            console.warn('Warning: Failed to load configuration:', error instanceof Error ? error.message : 'Unknown error');
        }
    }
    /**
     * Load configuration from environment variables
     */
    loadFromEnvironment() {
        const envConfig = {};
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
            envConfig.network = process.env.MODY_NETWORK;
        }
        if (process.env.MODY_IDENTITY) {
            envConfig.identity = process.env.MODY_IDENTITY;
        }
        if (process.env.MODY_TIMEOUT) {
            envConfig.timeout = parseInt(process.env.MODY_TIMEOUT, 10);
        }
        if (process.env.MODY_LOG_LEVEL) {
            envConfig.logLevel = process.env.MODY_LOG_LEVEL;
        }
        this.config = { ...this.config, ...envConfig };
    }
    /**
     * Ensure directory exists
     */
    ensureDir(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    /**
     * Save configuration to file
     */
    async saveConfig() {
        try {
            this.ensureDir(path.dirname(this.configPath));
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
        }
        catch (error) {
            throw new types_1.ConfigurationError(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get a specific configuration value
     */
    get(key) {
        return this.config[key];
    }
    /**
     * Set a configuration value
     */
    set(key, value) {
        this.config[key] = value;
    }
    /**
     * Set multiple configuration values
     */
    setMany(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Validate required configuration for build instructions operations
     */
    validateBuildInstructionsConfig() {
        if (!this.config.buildInstructionsCanisterId) {
            throw new types_1.ConfigurationError('Build instructions canister ID is not configured. ' +
                'Use --canister-id option or configure it with: mody configure --set-build-canister-id <ID>');
        }
    }
    /**
     * Validate required configuration for verification operations
     */
    validateVerificationConfig() {
        if (!this.config.verificationCanisterId) {
            throw new types_1.ConfigurationError('Verification canister ID is not configured. ' +
                'Use --canister-id option or configure it with: mody configure --set-verification-canister-id <ID>');
        }
    }
    /**
     * Get network URL based on configuration
     */
    getNetworkUrl() {
        const network = this.config.network || 'local';
        return network === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943';
    }
    /**
     * Get default timeout in seconds
     */
    getTimeout() {
        return this.config.timeout || 600; // Default 10 minutes
    }
    /**
     * Check if configuration is complete
     */
    isConfigured() {
        return !!(this.config.buildInstructionsCanisterId &&
            this.config.verificationCanisterId &&
            this.config.buildExecutorCanisterIds &&
            this.config.buildExecutorCanisterIds.length > 0);
    }
    /**
     * Get configuration status for display
     */
    getConfigStatus() {
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
    reset() {
        this.config = {};
    }
}
exports.ConfigManager = ConfigManager;
// Singleton instance
exports.configManager = new ConfigManager();
//# sourceMappingURL=config.js.map