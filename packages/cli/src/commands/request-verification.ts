import { Command } from "commander";
import { CLIOptions, ValidationError } from "../types";
import { CanisterService } from "../services/canister";
import { configManager } from "../utils/config";
import {
  calculateProgress,
  estimateRemainingTime,
  getExitCode,
  getStatusString,
  isCI,
  sleep,
  validateCanisterId,
  validateProjectId,
  validateVersion,
} from "../utils/helpers";
import {
  Colors,
  printError,
  printInfo,
  printSuccess,
  ProgressBar,
  Spinner,
} from "../utils/ui";
import { logger } from "../utils/logger";

export function createRequestVerificationCommand(): Command {
  const command = new Command("request-verification");

  command
    .description("Request build verification for a project")
    .requiredOption("-p, --project-id <project_id>", "Project ID")
    .requiredOption("-v, --version <version>", "Project version")
    .option("-c, --canister-id <canister_id>", "Verification canister ID")
    .option(
      "-t, --timeout <seconds>",
      "Maximum time to wait for verification (seconds)",
      parseInt,
      600,
    )
    .option("-n, --network <network>", "Network to use (ic or local)", "local")
    .option("--identity <identity>", "Identity to use")
    .option("--no-wait", "Don't wait for verification to complete")
    .action(async (options: CLIOptions & { wait?: boolean }) => {
      const spinner = new Spinner();

      try {
        // Validate inputs
        validateInputs(options);

        // Get configuration
        const config = configManager.getConfig();
        const canisterId = options.canisterId || config.verificationCanisterId;
        const network = options.network || config.network || "local";
        const timeout = options.timeout || config.timeout || 600;

        if (!canisterId) {
          throw new ValidationError(
            "Verification canister ID is not configured. " +
              'Please specify it with --canister-id or run "dcanary configure".',
          );
        }

        // Initialize canister service
        const networkUrl = network === "ic"
          ? "https://ic0.app"
          : "http://127.0.0.1:4943";
        const canisterService = new CanisterService(networkUrl);

        // Request verification
        spinner.start(
          `Requesting verification for ${Colors.cyan(options.projectId!)}@${
            Colors.cyan(options.version!)
          }`,
        );

        const verificationResult = await canisterService.requestVerification(
          canisterId,
          options.projectId!,
          options.version!,
          timeout,
        );

        spinner.succeed(
          `Verification requested for ${Colors.cyan(options.projectId!)}@${
            Colors.cyan(options.version!)
          }`,
        );

        // Display initial status
        console.log();
        console.log(Colors.bold("Initial Status:"));
        console.log(
          `  Status: ${
            getStatusColor(getStatusString(verificationResult.status))
          }`,
        );
        console.log(
          `  Total Executors: ${
            Colors.gray(verificationResult.total_executors.toString())
          }`,
        );
        console.log(
          `  Consensus Threshold: ${
            Colors.gray(verificationResult.consensus_threshold.toString())
          }`,
        );
        console.log(`  Timeout: ${Colors.gray(timeout.toString())} seconds`);

        // Wait for completion if requested
        if (options.wait !== false) {
          const finalResult = await waitForVerification(
            canisterService,
            canisterId,
            options.projectId!,
            options.version!,
            timeout,
          );

          displayFinalResult(finalResult, options.projectId!, options.version!);

          // Set appropriate exit code
          const status = getStatusString(finalResult.status);
          process.exit(getExitCode(status));
        } else {
          printInfo('Use "dcanary get-status" to check verification progress.');
        }

        logger.info("Verification requested", {
          projectId: options.projectId,
          version: options.version,
          canisterId,
          network,
          timeout,
          wait: options.wait !== false,
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
          logger.error("Unexpected error in request-verification command", {
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

  validateProjectId(options.projectId);
  validateVersion(options.version);

  if (options.canisterId) {
    validateCanisterId(options.canisterId);
  }

  if (options.timeout && (options.timeout < 1 || options.timeout > 3600)) {
    throw new ValidationError("Timeout must be between 1 and 3600 seconds");
  }

  if (options.network && !["ic", "local"].includes(options.network)) {
    throw new ValidationError('Network must be either "ic" or "local"');
  }
}

async function waitForVerification(
  canisterService: CanisterService,
  canisterId: string,
  projectId: string,
  version: string,
  timeoutSeconds: number,
): Promise<any> {
  const startTime = Date.now();
  const timeoutMs = timeoutSeconds * 1000;
  const pollInterval = 5000; // 5 seconds
  const progressBar = new ProgressBar(40);
  const inCI = isCI();

  console.log();
  console.log(Colors.bold("Waiting for verification to complete..."));

  if (!inCI) {
    console.log("(Press Ctrl+C to cancel and check status later)");
  }

  while (true) {
    const elapsed = Date.now() - startTime;

    if (elapsed >= timeoutMs) {
      throw new Error(`Verification timed out after ${timeoutSeconds} seconds`);
    }

    try {
      const result = await canisterService.getVerificationStatus(
        canisterId,
        projectId,
        version,
      );
      const status = getStatusString(result.status);
      const completedExecutors = result.executor_results.filter((r) =>
        r.completed
      ).length;
      const totalExecutors = result.total_executors;
      const progress = calculateProgress(completedExecutors, totalExecutors);
      const elapsedSeconds = Math.floor(elapsed / 1000);

      // Update progress
      if (inCI) {
        // In CI, just log periodically
        if (elapsedSeconds % 30 === 0) {
          console.log(
            `Progress: ${progress}% (${completedExecutors}/${totalExecutors} executors, ${elapsedSeconds}s elapsed)`,
          );
        }
      } else {
        // Interactive progress bar
        const estimated = estimateRemainingTime(
          elapsedSeconds,
          completedExecutors,
          totalExecutors,
        );
        const progressText =
          `${completedExecutors}/${totalExecutors} executors (${elapsedSeconds}s${
            estimated ? `, ~${estimated}s remaining` : ""
          })`;
        progressBar.update(progress, progressText);
      }

      // Check if completed
      if (status === "Verified" || status === "Failed") {
        if (!inCI) {
          progressBar.complete(`Verification ${status.toLowerCase()}`);
        }
        return result;
      }

      await sleep(pollInterval);
    } catch (error: any) {
      if (
        error?.name === "CanisterError" && error.message.includes("NotFound")
      ) {
        // Verification might not be started yet, continue waiting
        await sleep(pollInterval);
        continue;
      }
      throw error;
    }
  }
}

function displayFinalResult(
  result: any,
  projectId: string,
  version: string,
): void {
  const status = getStatusString(result.status);
  const executorResults = result.executor_results || [];
  const completedExecutors =
    executorResults.filter((r: any) => r.completed).length;
  const successfulExecutors =
    executorResults.filter((r: any) => r.completed && r.hash && !r.error)
      .length;
  const failedExecutors =
    executorResults.filter((r: any) => r.completed && r.error).length;

  console.log();
  console.log(Colors.bold("Final Result:"));
  console.log(`  Project: ${Colors.cyan(projectId)}@${Colors.cyan(version)}`);
  console.log(`  Status: ${getStatusColor(status)}`);
  console.log(
    `  Completed Executors: ${Colors.gray(completedExecutors.toString())}/${
      Colors.gray(result.total_executors.toString())
    }`,
  );
  console.log(`  Successful: ${Colors.gray(successfulExecutors.toString())}`);
  console.log(`  Failed: ${Colors.gray(failedExecutors.toString())}`);
  console.log(
    `  Consensus Threshold: ${
      Colors.gray(result.consensus_threshold.toString())
    }`,
  );
  console.log(
    `  Matching Results: ${Colors.gray(result.matching_results.toString())}`,
  );

  if (result.verified_hash) {
    console.log(`  Verified Hash: ${Colors.green(result.verified_hash)}`);
  }

  if (result.error) {
    console.log(`  Error: ${Colors.red(result.error)}`);
  }

  if (result.created_at && result.completed_at) {
    const durationNanos = result.completed_at - result.created_at;
    const duration = Number(durationNanos) / 1_000_000_000;
    console.log(`  Duration: ${Colors.gray(duration.toFixed(1))} seconds`);
  }

  // Display status message
  console.log();
  if (status === "Verified") {
    printSuccess(`✓ Verification completed successfully`);
  } else if (status === "Failed") {
    printError("✗ Verification failed", result.error || "Unknown error");
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "verified":
      return Colors.success(status);
    case "failed":
      return Colors.error(status);
    case "pending":
      return Colors.warning(status);
    default:
      return Colors.gray(status);
  }
}
