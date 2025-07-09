// Simple logger implementation
export interface Logger {
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}

class SimpleLogger implements Logger {
    private level: string;

    constructor() {
        this.level = process.env.MODY_LOG_LEVEL || 'info';
    }

    private shouldLog(level: string): boolean {
        const levels = { error: 0, warn: 1, info: 2, debug: 3 };
        const currentLevel = levels[this.level as keyof typeof levels] ?? 2;
        const messageLevel = levels[level as keyof typeof levels] ?? 0;
        return messageLevel <= currentLevel;
    }

    private formatMessage(level: string, message: string, meta?: any): string {
        const timestamp = new Date().toLocaleTimeString();
        let output = `${timestamp} [${level.toUpperCase()}] ${message}`;
        if (meta && Object.keys(meta).length > 0) {
            output += ` ${JSON.stringify(meta)}`;
        }
        return output;
    }

    error(message: string, meta?: any): void {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, meta));
        }
    }

    warn(message: string, meta?: any): void {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, meta));
        }
    }

    info(message: string, meta?: any): void {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, meta));
        }
    }

    debug(message: string, meta?: any): void {
        if (this.shouldLog('debug')) {
            console.debug(this.formatMessage('debug', message, meta));
        }
    }

    setLevel(level: string): void {
        this.level = level;
    }
}

export const logger = new SimpleLogger();

// Export logger functions for convenience
export const log = {
    error: (message: string, meta?: any) => logger.error(message, meta),
    warn: (message: string, meta?: any) => logger.warn(message, meta),
    info: (message: string, meta?: any) => logger.info(message, meta),
    debug: (message: string, meta?: any) => logger.debug(message, meta)
};

// Function to set log level dynamically
export function setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
    logger.setLevel(level);
    logger.info(`Log level set to: ${level}`);
}
