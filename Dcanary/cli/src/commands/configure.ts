import { Command } from "commander";
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
 * This command allows users to view, set, and reset CLI configuration settings.
 */
export function createConfigureCommand(): Command {
  const command = new Command("configure");

  command
    .description("Configure Dcanary CLI settings and canister IDs")
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
      parseInt,
    )
    .option("--wallet <id>", "Set default wallet canister ID")
    .option("--provider <url>", "Set IC provider URL")
    .option("--reset", "Reset configuration to defaults")
    .option("--show", "Show current configuration")
    .action((options: CLIConfig) => {
      try {
        // If no options are provided, or only --show is used, display the current configuration.
        if (Object.keys(options).length === 0 || options.show) {
          showConfiguration();
          return;
        }

        if (options.reset) {
          configManager.reset();
          configManager.saveConfig();
          printSuccess("Configuration reset to defaults.");
          return;
        }

        // A map to hold validated configuration updates.
        const updates: Partial<CLIConfig> = {};

        if (options.buildInstructionsCanisterId) {
          validateCanisterId(options.buildInstructionsCanisterId);
          updates.buildInstructionsCanisterId =
            options.buildInstructionsCanisterId;
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
          const executorIds = options.executorIds.split(",").map((id: string) =>
            id.trim()
          );
          executorIds.forEach(validateCanisterId);
          updates.buildExecutorCanisterIds = executorIds;
        }

        if (options.network) {
          if (!["ic", "local"].includes(options.network)) {
            throw new ValidationError('Network must be either "ic" or "local"');
          }
          updates.network = options.network;
        }

        if (options.identity) {
          updates.identity = options.identity;
        }

        if (options.timeout) {
          if (options.timeout < 1 || options.timeout > 3600) {
            throw new ValidationError(
              "Timeout must be between 1 and 3600 seconds.",
            );
          }
          updates.timeout = options.timeout;
        }

        if (options.wallet) {
          validateCanisterId(options.wallet);
          updates.walletCanisterId = options.wallet;
        }

        if (options.provider) {
          updates.icProviderUrl = options.provider;
        }

        // Apply and save the updates.
        configManager.setMany(updates);
        configManager.saveConfig();

        console.log();
        printSuccess("Configuration updated successfully.");

        console.log();
        console.log(Colors.bold("Updated settings:"));
        Object.entries(updates).forEach(([key, value]) => {
          const displayKey = formatConfigKey(key);
          const displayValue = Array.isArray(value)
            ? value.join(", ")
            : String(value);
          printKeyValue(displayKey, displayValue, "success");
        });

        console.log();
        if (configManager.isConfigured()) {
          printInfo(
            "✓ Configuration is complete. All required settings are present.",
          );
        } else {
          printInfo(
            "⚠ Configuration is incomplete. Some required settings are missing.",
          );
          showMissingSettings();
        }

        logger.info("Configuration updated", { updates });
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
    Colors.gray("To update, use: dcanary configure --option <value>"),
  );
  console.log(
    Colors.gray("Example: dcanary configure --network ic --timeout 300"),
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
  if (!config.verificationCanisterId) {
    missing.push("Verification Canister ID");
  }
  if (
    !config.buildExecutorCanisterIds ||
    config.buildExecutorCanisterIds.length === 0
  ) {
    missing.push("Build Executor Canister IDs");
  }

  if (missing.length > 0) {
    console.log();
    console.log(Colors.warning("Missing required settings:"));
    missing.forEach((setting) => {
      console.log(`  ${Colors.gray("•")} ${setting}`);
    });
    console.log(Colors.gray("You can set them using 'dcanary configure'"));
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
