// Simple color and formatting utilities without external dependencies

export class Colors {
    private static readonly RESET = '\x1b[0m';
    private static readonly BRIGHT = '\x1b[1m';
    private static readonly DIM = '\x1b[2m';
    
    // Foreground colors
    private static readonly RED = '\x1b[31m';
    private static readonly GREEN = '\x1b[32m';
    private static readonly YELLOW = '\x1b[33m';
    private static readonly BLUE = '\x1b[34m';
    private static readonly MAGENTA = '\x1b[35m';
    private static readonly CYAN = '\x1b[36m';
    private static readonly WHITE = '\x1b[37m';
    private static readonly GRAY = '\x1b[90m';

    static red(text: string): string {
        return `${this.RED}${text}${this.RESET}`;
    }

    static green(text: string): string {
        return `${this.GREEN}${text}${this.RESET}`;
    }

    static yellow(text: string): string {
        return `${this.YELLOW}${text}${this.RESET}`;
    }

    static blue(text: string): string {
        return `${this.BLUE}${text}${this.RESET}`;
    }

    static magenta(text: string): string {
        return `${this.MAGENTA}${text}${this.RESET}`;
    }

    static cyan(text: string): string {
        return `${this.CYAN}${text}${this.RESET}`;
    }

    static white(text: string): string {
        return `${this.WHITE}${text}${this.RESET}`;
    }

    static gray(text: string): string {
        return `${this.GRAY}${text}${this.RESET}`;
    }

    static bold(text: string): string {
        return `${this.BRIGHT}${text}${this.RESET}`;
    }

    static dim(text: string): string {
        return `${this.DIM}${text}${this.RESET}`;
    }

    // Status colors
    static success(text: string): string {
        return this.green(text);
    }

    static error(text: string): string {
        return this.red(text);
    }

    static warning(text: string): string {
        return this.yellow(text);
    }

    static info(text: string): string {
        return this.cyan(text);
    }

    static pending(text: string): string {
        return this.yellow(text);
    }

    static verified(text: string): string {
        return this.green(text);
    }

    static failed(text: string): string {
        return this.red(text);
    }
}

export class Spinner {
    private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    private interval: NodeJS.Timeout | null = null;
    private frameIndex = 0;
    private text = '';

    start(text: string): void {
        this.text = text;
        this.frameIndex = 0;
        
        // Hide cursor
        process.stdout.write('\x1B[?25l');
        
        this.interval = setInterval(() => {
            const frame = this.frames[this.frameIndex];
            process.stdout.write(`\r${Colors.cyan(frame)} ${this.text}`);
            this.frameIndex = (this.frameIndex + 1) % this.frames.length;
        }, 100);
    }

    succeed(text?: string): void {
        this.stop();
        const message = text || this.text;
        console.log(`${Colors.green('✓')} ${message}`);
    }

    fail(text?: string): void {
        this.stop();
        const message = text || this.text;
        console.log(`${Colors.red('✗')} ${message}`);
    }

    warn(text?: string): void {
        this.stop();
        const message = text || this.text;
        console.log(`${Colors.yellow('⚠')} ${message}`);
    }

    info(text?: string): void {
        this.stop();
        const message = text || this.text;
        console.log(`${Colors.cyan('ℹ')} ${message}`);
    }

    stop(): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        // Clear current line and show cursor
        process.stdout.write('\r\x1B[K\x1B[?25h');
    }

    updateText(text: string): void {
        this.text = text;
    }
}

export class ProgressBar {
    private width: number;
    private completed: string;
    private incomplete: string;

    constructor(width = 40) {
        this.width = width;
        this.completed = '█';
        this.incomplete = '░';
    }

    render(progress: number, text?: string): string {
        const percent = Math.max(0, Math.min(100, progress));
        const filledLength = Math.round((percent / 100) * this.width);
        const emptyLength = this.width - filledLength;
        
        const filled = this.completed.repeat(filledLength);
        const empty = this.incomplete.repeat(emptyLength);
        const bar = `${Colors.green(filled)}${Colors.gray(empty)}`;
        
        const percentText = `${percent.toFixed(0)}%`.padStart(4);
        const result = `[${bar}] ${Colors.bold(percentText)}`;
        
        return text ? `${result} ${text}` : result;
    }

    update(progress: number, text?: string): void {
        process.stdout.write(`\r${this.render(progress, text)}`);
    }

    complete(text?: string): void {
        this.update(100, text);
        console.log(); // New line
    }
}

export function printHeader(title: string): void {
    const line = '═'.repeat(title.length + 4);
    console.log(Colors.cyan(line));
    console.log(Colors.cyan(`  ${Colors.bold(title)}  `));
    console.log(Colors.cyan(line));
    console.log();
}

export function printSection(title: string): void {
    console.log(Colors.bold(Colors.blue(`\n${title}:`)));
    console.log(Colors.gray('─'.repeat(title.length + 1)));
}

export function printKeyValue(key: string, value: string, color?: 'success' | 'error' | 'warning' | 'info'): void {
    const coloredValue = color ? Colors[color](value) : value;
    console.log(`  ${Colors.bold(key)}: ${coloredValue}`);
}

export function printList(items: string[], bullet = '•'): void {
    items.forEach(item => {
        console.log(`  ${Colors.gray(bullet)} ${item}`);
    });
}

export function printError(message: string, details?: string): void {
    console.log(Colors.error(`✗ ${message}`));
    if (details) {
        console.log(Colors.gray(`  ${details}`));
    }
}

export function printSuccess(message: string): void {
    console.log(Colors.success(`✓ ${message}`));
}

export function printWarning(message: string): void {
    console.log(Colors.warning(`⚠ ${message}`));
}

export function printInfo(message: string): void {
    console.log(Colors.info(`ℹ ${message}`));
}

export function clearLine(): void {
    process.stdout.write('\r\x1B[K');
}

export function moveCursorUp(lines = 1): void {
    process.stdout.write(`\x1B[${lines}A`);
}

export function hideCursor(): void {
    process.stdout.write('\x1B[?25l');
}

export function showCursor(): void {
    process.stdout.write('\x1B[?25h');
}

/**
 * Show header (alias for printHeader)
 */
export function showHeader(title: string): void {
    printHeader(title);
}

/**
 * Start a spinner (simplified version)
 */
export function startSpinner(message: string): { stop: () => void; succeed: () => void; fail: () => void } {
    process.stdout.write(`${message}... `);
    return {
        stop: () => {
            process.stdout.write('Done\n');
        },
        succeed: () => {
            process.stdout.write('✓ Success\n');
        },
        fail: () => {
            process.stdout.write('✗ Failed\n');
        }
    };
}

// UI object consolidating all UI functions for easier importing
export const ui = {
    // Colors
    Colors,
    
    // Components
    Spinner,
    ProgressBar,
    
    // Print functions
    printHeader,
    printSection,
    printKeyValue,
    printSuccess,
    printError,
    printWarning,
    printInfo,
    printList,
    
    // Helper functions
    clearLine,
    moveCursorUp,
    hideCursor,
    showCursor,
    
    // Convenient aliases
    showError: printError,
    showSuccess: printSuccess,
    showWarning: printWarning,
    showInfo: printInfo,
    header: printHeader,
    section: printSection,
    keyValue: printKeyValue,
    list: printList,
    
    // New additions
    showHeader,
    startSpinner
};
