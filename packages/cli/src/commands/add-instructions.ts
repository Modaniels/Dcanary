import { Command } from "commander";
import fs from "fs";
import { CLIOptions, ValidationError } from "../types";
import { CanisterService } from "../services/canister";
import { configManager } from "../utils/config";
import {
  validateCanisterId,
  validateProjectId,
  validateVersion,
} from "../utils/helpers";
import { Colors, printError, printSuccess, Spinner } from "../utils/ui";
import { logger } from "../utils/logger";

export function createAddInstructionsCommand(): Command {
  const command = new Command("add-instructions");

  command
    .description("Add or update build instructions for a project")
    .requiredOption("-p, --project-id <project_id>", "Project ID")
    .requiredOption("-v, --version <version>", "Project version")
    .option(
      "-i, --instruction-set <instruction_set>",
      "Build instructions as a string",
    )
    .option(
      "-f, --file <file_path>",
      "Path to file containing build instructions",
    )
    .option("-c, --canister-id <canister_id>", "Build instructions canister ID")
    .option("-n, --network <network>", "Network to use (ic or local)", "local")
    .option("--identity <identity>", "Identity to use")
    .action(async (options: CLIOptions) => {
      const spinner = new Spinner();

      try {
        // Validate inputs
        validateInputs(options);

        // Get configuration
        const config = configManager.getConfig();
        const canisterId = options.canisterId ||
          config.buildInstructionsCanisterId;
        const network = options.network || config.network || "local";

        if (!canisterId) {
          throw new ValidationError(
            "Build instructions canister ID is not configured. " +
              'Please specify it with --canister-id or run "dcanary configure".',
          );
        }

        // Get instruction set
        const instructionSet = getInstructionSet(options);

        // Initialize canister service
        const networkUrl = network === "ic"
          ? "https://ic0.app"
          : "http://127.0.0.1:4943";
        const canisterService = new CanisterService(networkUrl);

        // Add build instructions
        spinner.start(
          `Adding build instructions for ${Colors.cyan(options.projectId!)}@${
            Colors.cyan(options.version!)
          }`,
        );

        await canisterService.addBuildInstructions(
          canisterId,
          options.projectId!,
          options.version!,
          instructionSet,
        );

        spinner.succeed(
          `Build instructions added successfully for ${
            Colors.cyan(options.projectId!)
          }@${Colors.cyan(options.version!)}`,
        );

        // Display summary
        console.log();
        console.log(Colors.bold("Summary:"));
        console.log(`  Project ID: ${Colors.cyan(options.projectId!)}`);
        console.log(`  Version: ${Colors.cyan(options.version!)}`);
        console.log(`  Canister ID: ${Colors.gray(canisterId)}`);
        console.log(`  Network: ${Colors.gray(network)}`);
        console.log(
          `  Instructions length: ${
            Colors.gray(instructionSet.length.toString())
          } characters`,
        );

        if (options.file) {
          console.log(`  Source file: ${Colors.gray(options.file)}`);
        }

        logger.info("Build instructions added", {
          projectId: options.projectId,
          version: options.version,
          canisterId,
          network,
          instructionsLength: instructionSet.length,
        });
      } catch (error: any) {
        spinner.fail();

        if (error instanceof ValidationError) {
          printError("Validation Error", error.message);
          process.exit(1);
        } else if (
          error?.name === "CanisterError" || error?.name === "NetworkError"
        ) {
          printError(error.name, error.message);
          process.exit(1);
        } else {
          const errorMessage = error?.message || "Unknown error occurred";
          printError("Unexpected Error", errorMessage);
          logger.error("Unexpected error in add-instructions command", {
            error: errorMessage,
          });
          process.exit(1);
        }
      }
    });

  return command;
}

function validateInputs(options: CLIOptions): void {
  if (!options.projectId) {
    throw new ValidationError("Project ID is required");
  }

  if (!options.version) {
    throw new ValidationError("Version is required");
  }

  if (!options.instructionSet && !options.file) {
    throw new ValidationError(
      "Either --instruction-set or --file must be provided",
    );
  }

  if (options.instructionSet && options.file) {
    throw new ValidationError(
      "Cannot specify both --instruction-set and --file",
    );
  }

  validateProjectId(options.projectId);
  validateVersion(options.version);

  if (options.canisterId) {
    validateCanisterId(options.canisterId);
  }

  if (options.file && !fs.existsSync(options.file)) {
    throw new ValidationError(`File not found: ${options.file}`);
  }

  if (options.network && !["ic", "local"].includes(options.network)) {
    throw new ValidationError('Network must be either "ic" or "local"');
  }
}

function getInstructionSet(options: CLIOptions): string {
  if (options.instructionSet) {
    return options.instructionSet.trim();
  }

  if (options.file) {
    try {
      const content = fs.readFileSync(options.file, "utf8");
      if (!content.trim()) {
        throw new ValidationError("Build instructions file is empty");
      }
      return content.trim();
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      const errorMessage = error?.message || "Unknown error occurred";
      throw new ValidationError(
        `Failed to read file ${options.file}: ${errorMessage}`,
      );
    }
  }

  throw new ValidationError("No instruction set provided");
}
