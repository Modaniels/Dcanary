"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanisterError = exports.NetworkError = exports.ValidationError = exports.ConfigurationError = exports.CLIError = void 0;
// ============================================================================
// ERROR TYPES
// ============================================================================
class CLIError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CLIError';
    }
}
exports.CLIError = CLIError;
class ConfigurationError extends CLIError {
    constructor(message, details) {
        super(message, 'CONFIGURATION_ERROR', details);
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
class ValidationError extends CLIError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NetworkError extends CLIError {
    constructor(message, details) {
        super(message, 'NETWORK_ERROR', details);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
class CanisterError extends CLIError {
    constructor(message, details) {
        super(message, 'CANISTER_ERROR', details);
        this.name = 'CanisterError';
    }
}
exports.CanisterError = CanisterError;
//# sourceMappingURL=index.js.map