export interface Logger {
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}
declare class SimpleLogger implements Logger {
    private level;
    constructor();
    private shouldLog;
    private formatMessage;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    setLevel(level: string): void;
}
export declare const logger: SimpleLogger;
export declare const log: {
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
};
export declare function setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void;
export {};
//# sourceMappingURL=logger.d.ts.map