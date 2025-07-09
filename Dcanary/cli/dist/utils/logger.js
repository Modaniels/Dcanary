"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.logger = void 0;
exports.setLogLevel = setLogLevel;
class SimpleLogger {
    level;
    constructor() {
        this.level = process.env.MODY_LOG_LEVEL || 'info';
    }
    shouldLog(level) {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.level] ?? 2;
        const messageLevel = levels[level] ?? 0;
        return messageLevel <= currentLevel;
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toLocaleTimeString();
        let output = `${timestamp} [${level.toUpperCase()}] ${message}`;
        if (meta && Object.keys(meta).length > 0) {
            output += ` ${JSON.stringify(meta)}`;
        }
        return output;
    }
    error(message, meta) {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, meta));
        }
    }
    warn(message, meta) {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }
    info(message, meta) {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, meta));
        }
    }
    debug(message, meta) {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, meta));
        }
    }
    setLevel(level) {
        this.level = level;
    }
}
exports.logger = new SimpleLogger();
// Export logger functions for convenience
exports.log = {
    error: (message, meta) => exports.logger.error(message, meta),
    warn: (message, meta) => exports.logger.warn(message, meta),
    info: (message, meta) => exports.logger.info(message, meta),
    debug: (message, meta) => exports.logger.debug(message, meta)
};
// Function to set log level dynamically
function setLogLevel(level) {
    exports.logger.setLevel(level);
    exports.logger.info(`Log level set to: ${level}`);
}
//# sourceMappingURL=logger.js.map