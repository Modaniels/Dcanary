/**
 * A simple, level-based logger for the CLI.
 * Avoids external dependencies for a lean implementation.
 */
export interface Logger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  setLevel(level: LogLevel): void;
}

export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

class SimpleLogger implements Logger {
  private level: LogLevel = "error"; // Default to only showing errors.

  constructor() {
    // Allow overriding the log level via an environment variable.
    const envLevel = process.env.DCANARY_LOG_LEVEL as LogLevel;
    if (
      envLevel &&
      ["silent", "error", "warn", "info", "debug"].includes(envLevel)
    ) {
      this.level = envLevel;
    }
  }

  /**
   * Determines if a message should be logged based on the current log level.
   * @param level The level of the message to be logged.
   * @returns True if the message should be logged, otherwise false.
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      silent: -1,
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    return levels[level] <= levels[this.level];
  }

  /**
   * Formats a log message with a timestamp and level.
   * @param level The log level.
   * @param message The main log message.
   * @param meta Optional additional data to log.
   * @returns A formatted log string.
   */
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toLocaleTimeString();
    let output = `${timestamp} [${level.toUpperCase()}] ${message}`;
    if (meta && Object.keys(meta).length > 0) {
      try {
        // Use a replacer to handle BigInt which JSON.stringify does not support by default.
        const metaString = JSON.stringify(
          meta,
          (_, value) => typeof value === "bigint" ? value.toString() : value,
        );
        output += ` ${metaString}`;
      } catch (e) {
        // Ignore metadata if it's not serializable
      }
    }
    return output;
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, meta));
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }

  /**
   * Dynamically sets the log level.
   * @param level The new log level.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Singleton logger instance
export const logger = new SimpleLogger();

// Convenience log functions
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
};

/**
 * A publicly exposed function to set the log level dynamically.
 * @param level The log level to set.
 */
export function setLogLevel(level: LogLevel): void {
  logger.setLevel(level);
}
