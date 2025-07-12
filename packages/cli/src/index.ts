#!/usr/bin/env node

import { Command } from "commander";
import { Colors, printError, printHeader } from "./utils/ui";
import { logger, LogLevel, setLogLevel } from "./utils/logger";
import { configManager } from "./utils/config";
import { DESCRIPTION, HOMEPAGE, NAME, VERSION } from "./constants";

// Command Imports
import { createInitCommand } from "./commands/init";
import { createAnalyzeCommand } from "./commands/analyze";
import { createBuildCommand } from "./commands/build";
import { createDeployCommand } from "./commands/deploy";
import { createNetworkCommand } from "./commands/network";
import { createIntegrateCommand } from "./commands/integrate";
import { createSecretsCommand } from "./commands/secrets";
import { createStatusCommand } from "./commands/status";
import { createLogsCommand } from "./commands/logs";
import { createConfigureCommand } from "./commands/configure";
import { createVersionCommand } from "./commands/version";
import { createSCMCommand } from "./commands/scm";
import { createValidateCommand } from "./commands/validate";

function main() {
  const program = new Command();

  // CLI configuration using dynamic constants
  program
    .name(NAME)
    .description(DESCRIPTION)
    .version(VERSION)
    .option("-v, --verbose", "Enable verbose (debug) logging")
    .option("-q, --quiet", "Suppress all logger output (sets level to silent)")
    .option("--log-level <level>", "Set log level (error, warn, info, debug)")
    .option("--config <path>", "Path to a custom configuration file")
    .option(
      "--network <network>",
      "Specify network for the command (ic, local)",
    );

  // Global options handler, runs before any command action
  program.hook("preAction", (thisCommand) => {
    const options = thisCommand.opts();

    // Set log level with clear precedence. The logger's default is 'error'.
    if (options.quiet) {
      setLogLevel("silent");
    } else if (options.verbose) {
      setLogLevel("debug");
    } else if (options.logLevel) {
      const validLevels: LogLevel[] = ["error", "warn", "info", "debug"];
      if (validLevels.includes(options.logLevel)) {
        setLogLevel(options.logLevel);
      }
    }

    // Update global config from other options
    if (options.network) {
      configManager.set("network", options.network);
    }
    if (options.config) {
      configManager.loadFromFile(options.config);
    }
  });

  // Add all commands
  program.addCommand(createInitCommand());
  program.addCommand(createAnalyzeCommand());
  program.addCommand(createBuildCommand());
  program.addCommand(createDeployCommand());
  program.addCommand(createNetworkCommand());
  program.addCommand(createIntegrateCommand());
  program.addCommand(createSecretsCommand());
  program.addCommand(createStatusCommand());
  program.addCommand(createLogsCommand());
  program.addCommand(createConfigureCommand());
  program.addCommand(createVersionCommand());
  program.addCommand(createSCMCommand());
  program.addCommand(createValidateCommand()); // Add the new command here

  // Help customization for a better visual experience
  program.configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => Colors.cyan(cmd.name()),
    optionTerm: (option) => Colors.yellow(option.flags),
    argumentTerm: (argument) => Colors.magenta(`<${argument.name()}>`),
  });

  // Custom help text appended at the end
  program.on("--help", () => {
    console.log();
    console.log(Colors.bold("🚀 Quick Start:"));
    console.log(
      `  ${Colors.cyan("dcanary init")}       # Initialize a new project`,
    );
    console.log(
      `  ${Colors.cyan("dcanary validate")}   # Validate your configuration`,
    );
    console.log(
      `  ${Colors.cyan("dcanary build")}       # Run a decentralized build`,
    );
    console.log();
    console.log(Colors.bold("📖 Learn More:"));
    console.log(`  ${Colors.gray("GitHub:")} ${HOMEPAGE}`);
    console.log();
  });

  // Graceful error handling
  program.exitOverride((err) => {
    if (err.code === "commander.help" || err.code === "commander.version") {
      process.exit(0);
    }
    if (err.code === "commander.unknownCommand") {
      printError(
        "Unknown Command",
        `Invalid command: ${program.args.join(" ")}`,
      );
      console.log(
        Colors.gray(`Run 'dcanary --help' for a list of available commands.`),
      );
    } else if (
      err.code === "commander.missingArgument" ||
      err.code === "commander.missingMandatoryOptionValue"
    ) {
      printError("Missing Input", err.message);
      console.log(
        Colors.gray(
          `Run 'dcanary ${program.args[0]} --help' for command-specific help.`,
        ),
      );
    } else {
      logger.error("CLI Error", { code: err.code, message: err.message });
    }
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", {
      message: error.message,
      stack: error.stack,
    });
    printError("An unexpected error occurred. Please check logs for details.");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection", { reason, promise });
    printError(
      "An unexpected async error occurred. Please check logs for details.",
    );
    process.exit(1);
  });

  // Handle SIGINT (Ctrl+C)
  process.on("SIGINT", () => {
    console.log();
    console.log(Colors.yellow("Operation cancelled by user."));
    process.exit(130);
  });

  // Default behavior when no command is specified
  if (process.argv.length === 2) {
    printHeader("Dcanary - Decentralized CI/CD for the Internet Computer");
    console.log(
      `Run ${Colors.cyan("dcanary --help")} to see all available commands.`,
    );
    console.log(`Or get started with ${Colors.cyan("dcanary init")}.`);
    console.log();
    process.exit(0);
  }

  // Parse command line arguments
  program.parse(process.argv);
}

if (require.main === module) {
  main();
}

export { main };
