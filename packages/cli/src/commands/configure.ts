import { Command } from "commander";
import inquirer from "inquirer";
import { CLIConfig, ValidationError } from "../types";
import { configManager } from "../utils/config";
import { validateCanisterId } from "../utils/helpers";
import {
  Colors,
  printError,
  printInfo,
  printKeyValue,
  printSection,
  printSuccess,
} from "../utils/ui";
import { logger } from "../utils/logger";

/**
 * Creates the 'configure' command for the Dcanary CLI.
 * This command allows users to view, set, and reset CLI configuration settings,
 * offering both an interactive mode and a flag-based mode for scripting.
 */
export function createConfigureCommand(): Command {
  const command = new Command("configure");

  command
    .description(
      "Configure Dcanary CLI settings and canister IDs interactively or via flags.",
    )
    .option(
      "--build-instructions-canister-id <id>",
      "Set build instructions canister ID",
    )
    .option("--verification-canister-id <id>", "Set verification canister ID")
    .option("--webhook-canister-id <id>", "Set webhook canister ID")
    .option(
      "--executor-ids <ids>",
      "Set build executor canister IDs (comma-separated)",
    )
    .option("--network <network>", "Set default network (ic or local)")
    .option("--identity <path>", "Set IC identity file path")
    .option(
      "--timeout <seconds>",
      "Set default command timeout in seconds",
      (v) => parseInt(v, 10),
    )
    .option("--wallet <id>", "Set default wallet canister ID")
    .option("--provider <url>", "Set IC provider URL")
    .option("--reset", "Reset configuration to defaults")
    .option("--show", "Show current configuration")
    .action(async (options: CLIConfig) => {
      try {
        if (options.show) {
          showConfiguration();
          return;
        }

        if (options.reset) {
          configManager.reset();
          configManager.saveConfig();
          printSuccess("Configuration reset to defaults.");
          return;
        }

        // If any configuration flags are passed, use non-interactive mode.
        // Otherwise, launch the interactive setup.
        if (hasConfigurationFlags(options)) {
          await handleNonInteractiveConfiguration(options);
        } else {
          await handleInteractiveConfiguration();
        }
      } catch (error: any) {
        if (error instanceof ValidationError) {
          printError("Validation Error", error.message);
        } else {
          const errorMessage = error?.message ||
            "Unknown configuration error occurred.";
          printError("Configuration Error", errorMessage);
          logger.error("Error in configure command", { error: errorMessage });
        }
        process.exit(1);
      }
    });

  return command;
}

/**
 * Checks if any configuration-specific flags were passed by the user.
 * @param options The commander options object.
 * @returns True if configuration flags are present, otherwise false.
 */
function hasConfigurationFlags(options: CLIConfig): boolean {
  const configFlags = [
    "buildInstructionsCanisterId",
    "verificationCanisterId",
    "webhookCanisterId",
    "executorIds",
    "network",
    "identity",
    "timeout",
    "wallet",
    "provider",
  ];
  return configFlags.some((flag) => options[flag] !== undefined);
}

/**
 * Handles the interactive configuration flow using inquirer.
 */
async function handleInteractiveConfiguration(): Promise<void> {
  printInfo("Entering interactive configuration mode...");
  const currentConfig = configManager.getConfig();

  const questions = [
    {
      type: "input",
      name: "buildInstructionsCanisterId",
      message: "Enter Build Instructions Canister ID:",
      default: currentConfig.buildInstructionsCanisterId || "",
      validate: (input: string) =>
        !input || (validateCanisterId(input), true) || "Invalid Canister ID.",
    },
    {
      type: "input",
      name: "verificationCanisterId",
      message: "Enter Verification Canister ID:",
      default: currentConfig.verificationCanisterId || "",
      validate: (input: string) =>
        !input || (validateCanisterId(input), true) || "Invalid Canister ID.",
    },
    {
      type: "input",
      name: "webhookCanisterId",
      message: "Enter Webhook Canister ID:",
      default: currentConfig.webhookCanisterId || "",
      validate: (input: string) =>
        !input || (validateCanisterId(input), true) || "Invalid Canister ID.",
    },
    {
      type: "input",
      name: "executorIds",
      message: "Enter Build Executor Canister IDs (comma-separated):",
      default: (currentConfig.buildExecutorCanisterIds || []).join(","),
      filter: (input: string) =>
        input.split(",").map((id) => id.trim()).filter((id) => id),
    },
    {
      type: "list",
      name: "network",
      message: "Select default network:",
      choices: ["ic", "local"],
      default: currentConfig.network || "local",
    },
    {
      type: "input",
      name: "identity",
      message: "Enter path to your default identity file (optional):",
      default: currentConfig.identity || "",
    },
    {
      type: "number",
      name: "timeout",
      message: "Enter default command timeout in seconds:",
      default: currentConfig.timeout || 600,
      validate: (input: number) =>
        (input > 0 && input <= 3600) || "Timeout must be between 1 and 3600.",
    },
  ];

  const answers = await inquirer.prompt(questions);
  configManager.setMany({
    ...answers,
    buildExecutorCanisterIds: answers.executorIds,
  });
  configManager.saveConfig();

  console.log();
  printSuccess("Configuration has been saved successfully!");
  showConfiguration();
}

/**
 * Handles the non-interactive, flag-based configuration flow.
 */
async function handleNonInteractiveConfiguration(
  options: CLIConfig,
): Promise<void> {
  const updates: Partial<CLIConfig> = {};

  if (options.buildInstructionsCanisterId) {
    validateCanisterId(options.buildInstructionsCanisterId);
    updates.buildInstructionsCanisterId = options.buildInstructionsCanisterId;
  }
  if (options.verificationCanisterId) {
    validateCanisterId(options.verificationCanisterId);
    updates.verificationCanisterId = options.verificationCanisterId;
  }
  if (options.webhookCanisterId) {
    validateCanisterId(options.webhookCanisterId);
    updates.webhookCanisterId = options.webhookCanisterId;
  }
  if (options.executorIds) {
    const executorIds = (options.executorIds as unknown as string).split(",")
      .map((id) => id.trim());
    executorIds.forEach(validateCanisterId);
    updates.buildExecutorCanisterIds = executorIds;
  }
  if (options.network) {
    if (!["ic", "local"].includes(options.network)) {
      throw new ValidationError('Network must be either "ic" or "local"');
    }
    updates.network = options.network;
  }
  if (options.identity) updates.identity = options.identity;
  if (options.timeout) {
    if (options.timeout < 1 || options.timeout > 3600) {
      throw new ValidationError("Timeout must be between 1 and 3600 seconds.");
    }
    updates.timeout = options.timeout;
  }
  if (options.wallet) {
    validateCanisterId(options.wallet);
    updates.walletCanisterId = options.wallet;
  }
  if (options.provider) updates.icProviderUrl = options.provider;

  configManager.setMany(updates);
  configManager.saveConfig();

  console.log();
  printSuccess("Configuration updated successfully.");
  console.log();
  console.log(Colors.bold("Updated settings:"));
  Object.entries(updates).forEach(([key, value]) => {
    printKeyValue(
      formatConfigKey(key),
      Array.isArray(value) ? value.join(", ") : String(value),
      "success",
    );
  });
}

/**
 * Displays the current CLI configuration to the user.
 */
function showConfiguration(): void {
  const status = configManager.getConfigStatus();

  console.log();
  console.log(Colors.bold(Colors.cyan("Current Dcanary CLI Configuration")));
  console.log(Colors.gray("═".repeat(50)));

  printSection("Required Settings");
  printKeyValue(
    "Build Instructions Canister ID",
    status.buildInstructionsCanisterId || "Not set",
    status.buildInstructionsCanisterId ? "success" : "warning",
  );
  printKeyValue(
    "Verification Canister ID",
    status.verificationCanisterId || "Not set",
    status.verificationCanisterId ? "success" : "warning",
  );
  printKeyValue(
    "Build Executor Canisters",
    status.executorCount > 0 ? `${status.executorCount} configured` : "Not set",
    status.executorCount > 0 ? "success" : "warning",
  );

  printSection("Optional Settings");
  printKeyValue("Default Network", status.network);
  printKeyValue("Default Identity Path", status.identity || "Not set");
  printKeyValue("Default Timeout", `${status.timeout} seconds`);

  console.log();
  if (configManager.isConfigured()) {
    printSuccess("✓ Configuration is complete.");
  } else {
    printInfo("⚠ Configuration is incomplete.");
    showMissingSettings();
  }

  console.log();
  console.log(
    Colors.gray("To re-run interactive setup, use 'dcanary configure'"),
  );
  console.log(
    Colors.gray(
      "To set a specific value, use 'dcanary configure --option <value>'",
    ),
  );
  console.log();
}

/**
 * Displays a list of required settings that are currently missing.
 */
function showMissingSettings(): void {
  const config = configManager.getConfig();
  const missing: string[] = [];

  if (!config.buildInstructionsCanisterId) {
    missing.push("Build Instructions Canister ID");
  }
  if (!config.verificationCanisterId) missing.push("Verification Canister ID");
  if (
    !config.buildExecutorCanisterIds ||
    config.buildExecutorCanisterIds.length === 0
  ) missing.push("Build Executor Canister IDs");

  if (missing.length > 0) {
    console.log();
    console.log(Colors.warning("Missing required settings:"));
    missing.forEach((setting) =>
      console.log(`  ${Colors.gray("•")} ${setting}`)
    );
  }
}

/**
 * Formats a camelCase configuration key into a human-readable string.
 * @param key The camelCase key.
 * @returns A formatted, human-readable string.
 */
function formatConfigKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/canister id/gi, "Canister ID")
    .replace(/ids/gi, "IDs")
    .replace(/ic provider url/gi, "IC Provider URL");
}
