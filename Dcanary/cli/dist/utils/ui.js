"use strict";
// Simple color and formatting utilities without external dependencies
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressBar = exports.Spinner = exports.Colors = void 0;
exports.printHeader = printHeader;
exports.printSection = printSection;
exports.printKeyValue = printKeyValue;
exports.printList = printList;
exports.printError = printError;
exports.printSuccess = printSuccess;
exports.printWarning = printWarning;
exports.printInfo = printInfo;
exports.clearLine = clearLine;
exports.moveCursorUp = moveCursorUp;
exports.hideCursor = hideCursor;
exports.showCursor = showCursor;
class Colors {
    static RESET = '\x1b[0m';
    static BRIGHT = '\x1b[1m';
    static DIM = '\x1b[2m';
    // Foreground colors
    static RED = '\x1b[31m';
    static GREEN = '\x1b[32m';
    static YELLOW = '\x1b[33m';
    static BLUE = '\x1b[34m';
    static MAGENTA = '\x1b[35m';
    static CYAN = '\x1b[36m';
    static WHITE = '\x1b[37m';
    static GRAY = '\x1b[90m';
    static red(text) {
        return `${this.RED}${text}${this.RESET}`;
    }
    static green(text) {
        return `${this.GREEN}${text}${this.RESET}`;
    }
    static yellow(text) {
        return `${this.YELLOW}${text}${this.RESET}`;
    }
    static blue(text) {
        return `${this.BLUE}${text}${this.RESET}`;
    }
    static magenta(text) {
        return `${this.MAGENTA}${text}${this.RESET}`;
    }
    static cyan(text) {
        return `${this.CYAN}${text}${this.RESET}`;
    }
    static white(text) {
        return `${this.WHITE}${text}${this.RESET}`;
    }
    static gray(text) {
        return `${this.GRAY}${text}${this.RESET}`;
    }
    static bold(text) {
        return `${this.BRIGHT}${text}${this.RESET}`;
    }
    static dim(text) {
        return `${this.DIM}${text}${this.RESET}`;
    }
    // Status colors
    static success(text) {
        return this.green(text);
    }
    static error(text) {
        return this.red(text);
    }
    static warning(text) {
        return this.yellow(text);
    }
    static info(text) {
        return this.cyan(text);
    }
    static pending(text) {
        return this.yellow(text);
    }
    static verified(text) {
        return this.green(text);
    }
    static failed(text) {
        return this.red(text);
    }
}
exports.Colors = Colors;
class Spinner {
    frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    interval = null;
    frameIndex = 0;
    text = '';
    start(text) {
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
    succeed(text) {
        this.stop();
        const message = text || this.text;
        console.log(`${Colors.green('✓')} ${message}`);
    }
    fail(text) {
        this.stop();
        const message = text || this.text;
        console.log(`${Colors.red('✗')} ${message}`);
    }
    warn(text) {
        this.stop();
        const message = text || this.text;
        console.log(`${Colors.yellow('⚠')} ${message}`);
    }
    info(text) {
        this.stop();
        const message = text || this.text;
        console.log(`${Colors.cyan('ℹ')} ${message}`);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        // Clear current line and show cursor
        process.stdout.write('\r\x1B[K\x1B[?25h');
    }
    updateText(text) {
        this.text = text;
    }
}
exports.Spinner = Spinner;
class ProgressBar {
    width;
    completed;
    incomplete;
    constructor(width = 40) {
        this.width = width;
        this.completed = '█';
        this.incomplete = '░';
    }
    render(progress, text) {
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
    update(progress, text) {
        process.stdout.write(`\r${this.render(progress, text)}`);
    }
    complete(text) {
        this.update(100, text);
        console.log(); // New line
    }
}
exports.ProgressBar = ProgressBar;
function printHeader(title) {
    const line = '═'.repeat(title.length + 4);
    console.log(Colors.cyan(line));
    console.log(Colors.cyan(`  ${Colors.bold(title)}  `));
    console.log(Colors.cyan(line));
    console.log();
}
function printSection(title) {
    console.log(Colors.bold(Colors.blue(`\n${title}:`)));
    console.log(Colors.gray('─'.repeat(title.length + 1)));
}
function printKeyValue(key, value, color) {
    const coloredValue = color ? Colors[color](value) : value;
    console.log(`  ${Colors.bold(key)}: ${coloredValue}`);
}
function printList(items, bullet = '•') {
    items.forEach(item => {
        console.log(`  ${Colors.gray(bullet)} ${item}`);
    });
}
function printError(message, details) {
    console.log(Colors.error(`✗ ${message}`));
    if (details) {
        console.log(Colors.gray(`  ${details}`));
    }
}
function printSuccess(message) {
    console.log(Colors.success(`✓ ${message}`));
}
function printWarning(message) {
    console.log(Colors.warning(`⚠ ${message}`));
}
function printInfo(message) {
    console.log(Colors.info(`ℹ ${message}`));
}
function clearLine() {
    process.stdout.write('\r\x1B[K');
}
function moveCursorUp(lines = 1) {
    process.stdout.write(`\x1B[${lines}A`);
}
function hideCursor() {
    process.stdout.write('\x1B[?25l');
}
function showCursor() {
    process.stdout.write('\x1B[?25h');
}
//# sourceMappingURL=ui.js.map