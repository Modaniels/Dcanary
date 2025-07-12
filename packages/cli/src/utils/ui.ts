import chalk, { Chalk } from "chalk";
import ora, { Ora } from "ora";

/**
 * A wrapper around the 'chalk' library to provide consistent color styling.
 */
export const Colors = {
  red: chalk.red,
  green: chalk.green,
  yellow: chalk.yellow,
  blue: chalk.blue,
  magenta: chalk.magenta,
  cyan: chalk.cyan,
  white: chalk.white,
  gray: chalk.gray,
  bold: chalk.bold,
  dim: chalk.dim,
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.cyan,
  verified: chalk.green,
  failed: chalk.red,
  pending: chalk.yellow,
};

/**
 * A wrapper around the 'ora' library to provide a consistent spinner implementation.
 */
export class Spinner {
  private spinner: Ora;

  constructor() {
    this.spinner = ora();
  }

  /**
   * Starts the spinner with a given text message.
   * @param text The message to display next to the spinner.
   */
  start(text: string): void {
    this.spinner.text = text;
    this.spinner.start();
  }

  /**
   * Stops the spinner and marks it as successful.
   * @param text Optional success message to display.
   */
  succeed(text?: string): void {
    this.spinner.succeed(text);
  }

  /**
   * Stops the spinner and marks it as failed.
   * @param text Optional failure message to display.
   */
  fail(text?: string): void {
    this.spinner.fail(text);
  }

  /**
   * Stops the spinner and marks it with a warning.
   * @param text Optional warning message to display.
   */
  warn(text?: string): void {
    this.spinner.warn(text);
  }

  /**
   * Stops the spinner and marks it with an info symbol.
   * @param text Optional info message to display.
   */
  info(text?: string): void {
    this.spinner.info(text);
  }

  /**
   * Stops the spinner without any symbol.
   */
  stop(): void {
    this.spinner.stop();
  }

  /**
   * Updates the text of a running spinner.
   * @param text The new message to display.
   */
  updateText(text: string): void {
    this.spinner.text = text;
  }
}

/**
 * A simple text-based progress bar.
 */
export class ProgressBar {
  private width: number;
  private completedChar = "█";
  private incompleteChar = "░";

  constructor(width = 40) {
    this.width = width;
  }

  private render(progress: number, text?: string): string {
    const percent = Math.max(0, Math.min(100, progress));
    const filledLength = Math.round((percent / 100) * this.width);
    const emptyLength = this.width - filledLength;

    const filled = this.completedChar.repeat(filledLength);
    const empty = this.incompleteChar.repeat(emptyLength);

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

// --- Standalone UI Functions ---

export function printHeader(title: string): void {
  const line = "═".repeat(title.length + 4);
  console.log();
  console.log(Colors.cyan(line));
  console.log(Colors.cyan(`  ${Colors.bold(title)}  `));
  console.log(Colors.cyan(line));
  console.log();
}

export function printSection(title: string): void {
  console.log();
  console.log(Colors.bold(Colors.blue(`${title}:`)));
  console.log(Colors.gray("─".repeat(title.length + 1)));
}

export function printKeyValue(
  key: string,
  value: string,
  color?: keyof typeof Colors,
): void {
  const coloredValue = color && Colors[color]
    ? (Colors[color] as Chalk)(value)
    : value;
  console.log(`  ${Colors.bold(key)}: ${coloredValue}`);
}

export function printList(items: string[], bullet = "•"): void {
  items.forEach((item) => {
    console.log(`  ${Colors.gray(bullet)} ${item}`);
  });
}

export function printError(message: string, details?: string): void {
  console.log(Colors.error(`✗ ${message}`));
  if (details) {
    console.log(Colors.gray(`  ${details}`));
  }
}

export function printSuccess(message: string, details?: string): void {
  console.log(Colors.success(`✓ ${message}`));
  if (details) {
    console.log(Colors.gray(`  ${details}`));
  }
}

export function printWarning(message: string, details?: string): void {
  console.log(Colors.warning(`⚠ ${message}`));
  if (details) {
    console.log(Colors.gray(`  ${details}`));
  }
}

export function printInfo(message: string, details?: string): void {
  console.log(Colors.info(`ℹ ${message}`));
  if (details) {
    console.log(Colors.gray(`  ${details}`));
  }
}
