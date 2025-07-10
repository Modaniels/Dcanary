export declare class Colors {
    private static readonly RESET;
    private static readonly BRIGHT;
    private static readonly DIM;
    private static readonly RED;
    private static readonly GREEN;
    private static readonly YELLOW;
    private static readonly BLUE;
    private static readonly MAGENTA;
    private static readonly CYAN;
    private static readonly WHITE;
    private static readonly GRAY;
    static red(text: string): string;
    static green(text: string): string;
    static yellow(text: string): string;
    static blue(text: string): string;
    static magenta(text: string): string;
    static cyan(text: string): string;
    static white(text: string): string;
    static gray(text: string): string;
    static bold(text: string): string;
    static dim(text: string): string;
    static success(text: string): string;
    static error(text: string): string;
    static warning(text: string): string;
    static info(text: string): string;
    static pending(text: string): string;
    static verified(text: string): string;
    static failed(text: string): string;
}
export declare class Spinner {
    private frames;
    private interval;
    private frameIndex;
    private text;
    start(text: string): void;
    succeed(text?: string): void;
    fail(text?: string): void;
    warn(text?: string): void;
    info(text?: string): void;
    stop(): void;
    updateText(text: string): void;
}
export declare class ProgressBar {
    private width;
    private completed;
    private incomplete;
    constructor(width?: number);
    render(progress: number, text?: string): string;
    update(progress: number, text?: string): void;
    complete(text?: string): void;
}
export declare function printHeader(title: string): void;
export declare function printSection(title: string): void;
export declare function printKeyValue(key: string, value: string, color?: 'success' | 'error' | 'warning' | 'info'): void;
export declare function printList(items: string[], bullet?: string): void;
export declare function printError(message: string, details?: string): void;
export declare function printSuccess(message: string): void;
export declare function printWarning(message: string): void;
export declare function printInfo(message: string): void;
export declare function clearLine(): void;
export declare function moveCursorUp(lines?: number): void;
export declare function hideCursor(): void;
export declare function showCursor(): void;
/**
 * Show header (alias for printHeader)
 */
export declare function showHeader(title: string): void;
/**
 * Start a spinner (simplified version)
 */
export declare function startSpinner(message: string): {
    stop: () => void;
    succeed: () => void;
    fail: () => void;
};
export declare const ui: {
    Colors: typeof Colors;
    Spinner: typeof Spinner;
    ProgressBar: typeof ProgressBar;
    printHeader: typeof printHeader;
    printSection: typeof printSection;
    printKeyValue: typeof printKeyValue;
    printSuccess: typeof printSuccess;
    printError: typeof printError;
    printWarning: typeof printWarning;
    printInfo: typeof printInfo;
    printList: typeof printList;
    clearLine: typeof clearLine;
    moveCursorUp: typeof moveCursorUp;
    hideCursor: typeof hideCursor;
    showCursor: typeof showCursor;
    showError: typeof printError;
    showSuccess: typeof printSuccess;
    showWarning: typeof printWarning;
    showInfo: typeof printInfo;
    header: typeof printHeader;
    section: typeof printSection;
    keyValue: typeof printKeyValue;
    list: typeof printList;
    showHeader: typeof showHeader;
    startSpinner: typeof startSpinner;
};
//# sourceMappingURL=ui.d.ts.map