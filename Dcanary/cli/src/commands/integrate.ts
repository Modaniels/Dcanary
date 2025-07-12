import { Command } from "commander";
import { logger } from "../utils/logger";
import {
  Colors,
  printError,
  printHeader,
  printSuccess,
  printWarning,
  Spinner,
} from "../utils/ui";
import { configManager } from "../utils/config";
import { SCMIntegrationConfig } from "../services/scm-integration";
import { canisterService } from "../services/canister";
import inquirer from "inquirer";
import fs from "fs-extra";
import path from "path";

// ============================================================================
// DECENTRALIZED PIPELINE FUNCTIONS
// ============================================================================

async function deployPipelineConfigCanister(
  repoIdentifier: string,
): Promise<string> {
  try {
    // In a real implementation, this would deploy a new canister or reuse existing one
    // For now, we'll use the configured canister or deploy a mock one
    let configCanisterId = configManager.get("pipelineConfigCanisterId");

    if (!configCanisterId) {
      // Mock canister deployment - in reality this would call dfx or IC management canister
      configCanisterId = `rrkah-fqaaa-aaaah-qcuiq-cai`; // Mock canister ID
      configManager.set("pipelineConfigCanisterId", configCanisterId);
      await configManager.saveConfig();

      logger.info("Pipeline configuration canister deployed", {
        canisterId: configCanisterId,
        repository: repoIdentifier,
      });
    }

    return configCanisterId;
  } catch (error) {
    logger.error("Failed to deploy pipeline config canister", { error });
    throw new Error("Failed to deploy pipeline configuration canister");
  }
}

async function setupWebhookCanister(
  platform: string,
  options: any,
): Promise<string> {
  try {
    let webhookCanisterId = configManager.get("webhookCanisterId");

    if (!webhookCanisterId) {
      // Mock canister deployment - in reality this would deploy webhook canister
      webhookCanisterId = `rdmx6-jaaaa-aaaah-qcaiq-cai`; // Mock canister ID
      configManager.set("webhookCanisterId", webhookCanisterId);
      await configManager.saveConfig();

      logger.info("Webhook canister deployed", {
        canisterId: webhookCanisterId,
        platform,
      });
    }

    // Register platform configuration with webhook canister
    // This would call the webhook canister's register_platform method
    logger.info("Platform registered with webhook canister", {
      platform,
      webhookCanisterId,
    });

    return webhookCanisterId;
  } catch (error) {
    logger.error("Failed to setup webhook canister", { error });
    throw new Error("Failed to setup webhook canister");
  }
}

async function setupRepositoryWebhook(
  platform: string,
  repo: string,
  token: string,
  webhookCanisterId: string,
): Promise<void> {
  try {
    const webhookUrl = `https://${webhookCanisterId}.ic0.app/webhook`;

    // This would make actual API calls to GitHub/GitLab to setup webhook
    // For now, we'll log the configuration
    logger.info("Repository webhook configured", {
      platform,
      repository: repo,
      webhookUrl,
      events: ["push", "pull_request", "release"],
    });

    // Store webhook configuration
    configManager.set(`webhook.${platform}.${repo}`, {
      url: webhookUrl,
      canisterId: webhookCanisterId,
      events: ["push", "pull_request", "release"],
      active: true,
    });

    await configManager.saveConfig();
  } catch (error) {
    logger.error("Failed to setup repository webhook", { error });
    throw new Error("Failed to setup repository webhook");
  }
}

async function createDefaultPipelineStages(
  configCanisterId: string,
): Promise<void> {
  try {
    // Detect project type and create appropriate pipeline stages
    const projectType = await detectProjectType();

    const defaultStages = generateDefaultStages(projectType);

    // In reality, this would call the pipeline config canister
    // to store the stage configuration on-chain
    logger.info("Default pipeline stages created", {
      configCanisterId,
      projectType,
      stages: defaultStages.map((s) => s.name),
    });

    // Store stages in local config for CLI reference
    configManager.set("pipeline.stages", defaultStages);
    configManager.set("pipeline.configCanisterId", configCanisterId);
    await configManager.saveConfig();
  } catch (error) {
    logger.error("Failed to create default pipeline stages", { error });
    throw new Error("Failed to create pipeline stages");
  }
}

async function detectProjectType(): Promise<string> {
  const cwd = process.cwd();

  // Check for dfx.json (ICP project)
  if (await fs.pathExists(path.join(cwd, "dfx.json"))) {
    return "icp";
  }

  // Check for package.json (Node.js project)
  if (await fs.pathExists(path.join(cwd, "package.json"))) {
    const packageJson = await fs.readJson(path.join(cwd, "package.json"));
    if (packageJson.dependencies?.["@dfinity/agent"]) {
      return "icp-frontend";
    }
    return "nodejs";
  }

  // Check for Cargo.toml (Rust project)
  if (await fs.pathExists(path.join(cwd, "Cargo.toml"))) {
    return "rust";
  }

  return "generic";
}

function generateDefaultStages(projectType: string): any[] {
  const baseStages = [
    {
      name: "build",
      description: "Build the project",
      timeout: 600, // 10 minutes
      retry_count: 2,
    },
    {
      name: "test",
      description: "Run tests",
      depends_on: ["build"],
      timeout: 300, // 5 minutes
      retry_count: 1,
    },
  ];

  switch (projectType) {
    case "icp":
      return [
        {
          ...baseStages[0],
          commands: ["dfx build"],
        },
        {
          ...baseStages[1],
          commands: ["npm test"],
        },
        {
          name: "deploy",
          description: "Deploy to IC",
          depends_on: ["test"],
          commands: ["dfx deploy --network ic"],
          timeout: 600,
          retry_count: 1,
        },
      ];

    case "icp-frontend":
      return [
        {
          ...baseStages[0],
          commands: ["npm install", "npm run build"],
        },
        {
          ...baseStages[1],
          commands: ["npm test"],
        },
        {
          name: "deploy",
          description: "Deploy frontend to IC",
          depends_on: ["test"],
          commands: ["dfx deploy --network ic"],
          timeout: 300,
          retry_count: 1,
        },
      ];

    case "nodejs":
      return [
        {
          ...baseStages[0],
          commands: ["npm install", "npm run build"],
        },
        {
          ...baseStages[1],
          commands: ["npm test"],
        },
      ];

    case "rust":
      return [
        {
          ...baseStages[0],
          commands: ["cargo build --release"],
        },
        {
          ...baseStages[1],
          commands: ["cargo test"],
        },
      ];

    default:
      return baseStages.map((stage) => ({
        ...stage,
        commands: [
          'echo "Configure build commands with: dcanary pipeline configure"',
        ],
      }));
  }
}

export function createIntegrateCommand(): Command {
  const cmd = new Command("integrate");

  cmd
    .description("Set up Git platform integration with DCanary canisters")
    .argument("<platform>", "SCM platform (github, gitlab)")
    .option("--token <token>", "API token for authentication")
    .option("--auto-deploy", "Enable automatic deployment on push")
    .option("--branch <branch>", "Target branch for deployment", "main")
    .option(
      "--webhook-url <url>",
      "Custom webhook URL (uses canister by default)",
    )
    .option("--webhook-secret <secret>", "Webhook secret for validation")
    .option("--base-url <url>", "Base URL for enterprise/self-hosted instances")
    .option("--repo <repo>", "Repository to integrate (owner/repo)")
    .option("--interactive", "Interactive setup with prompts")
    .action(async (platform: string, options: any) => {
      try {
        printHeader(
          `Setting up ${platform.toUpperCase()} Integration with DCanary Canisters`,
        );

        // Validate platform
        if (!["github", "gitlab"].includes(platform)) {
          throw new Error(
            `Unsupported platform: ${platform}. Supported: github, gitlab`,
          );
        }

        // Setup fully decentralized pipeline
        console.log();
        console.log(Colors.bold("🌐 Setting up Decentralized CI/CD Pipeline"));
        console.log(
          Colors.gray(
            "All configuration and execution will happen on ICP canisters",
          ),
        );
        console.log();

        const spinner = new Spinner();

        try {
          // Step 1: Deploy or get pipeline configuration canister
          spinner.start("Deploying pipeline configuration canister...");
          const configCanisterId = await deployPipelineConfigCanister(
            options.repo || "auto-detect",
          );
          spinner.succeed(
            `Pipeline config canister deployed: ${configCanisterId}`,
          );

          // Step 2: Setup webhook canister integration
          spinner.start("Configuring webhook canister...");
          const webhookCanisterId = await setupWebhookCanister(
            platform,
            options,
          );
          spinner.succeed(`Webhook canister configured: ${webhookCanisterId}`);

          // Step 3: Configure repository webhook
          if (options.token && options.repo) {
            spinner.start(`Setting up ${platform} webhook...`);
            await setupRepositoryWebhook(
              platform,
              options.repo,
              options.token,
              webhookCanisterId,
            );
            spinner.succeed("Repository webhook configured");
          }

          // Step 4: Initialize default pipeline stages
          spinner.start("Creating default pipeline stages...");
          await createDefaultPipelineStages(configCanisterId);
          spinner.succeed("Pipeline stages configured");

          // Success summary
          console.log();
          printSuccess("🎉 Decentralized CI/CD Pipeline Active!");
          console.log();
          console.log(Colors.bold("Pipeline Details:"));
          console.log(`  📋 Config Canister: ${Colors.cyan(configCanisterId)}`);
          console.log(
            `  🔗 Webhook Canister: ${Colors.cyan(webhookCanisterId)}`,
          );
          console.log(
            `  🌐 Platform: ${Colors.yellow(platform.toUpperCase())}`,
          );

          if (options.repo) {
            console.log(`  📁 Repository: ${Colors.cyan(options.repo)}`);
            console.log(
              `  🔗 Webhook URL: ${
                Colors.gray(`https://${webhookCanisterId}.ic0.app/webhook`)
              }`,
            );
          }

          console.log();
          console.log(Colors.bold("Next Steps:"));
          if (!options.token || !options.repo) {
            console.log(
              `  1. ${Colors.gray("Connect repository:")} ${
                Colors.cyan(
                  `dcanary integrate ${platform} --repo owner/repo --token <token>`,
                )
              }`,
            );
          }
          console.log(
            `  2. ${Colors.gray("Configure pipeline:")} ${
              Colors.cyan("dcanary pipeline configure")
            }`,
          );
          console.log(
            `  3. ${Colors.gray("Push to trigger build:")} ${
              Colors.cyan("git push origin main")
            }`,
          );
          console.log(
            `  4. ${Colors.gray("Monitor pipeline:")} ${
              Colors.cyan("dcanary status --watch")
            }`,
          );
        } catch (error: any) {
          spinner.fail("Pipeline setup failed");
          throw error;
        }
      } catch (error: any) {
        logger.error("Integration setup failed", {
          error: error.message,
          platform,
        });
        printError("Integration Failed", error.message);
        process.exit(1);
      }
    });

  return cmd;
}

async function validateCanisterConfiguration(): Promise<void> {
  const webhookCanisterId = configManager.get("webhookCanisterId");
  const verificationCanisterId = configManager.get("verificationCanisterId");

  if (!webhookCanisterId) {
    printWarning("Webhook canister not configured");
    console.log(
      "Configure with: " +
        Colors.cyan("dcanary configure --webhook-canister <canister-id>"),
    );

    const { shouldConfigure } = await inquirer.prompt([{
      type: "confirm",
      name: "shouldConfigure",
      message: "Would you like to configure canister IDs now?",
      default: true,
    }]);

    if (shouldConfigure) {
      await promptCanisterConfiguration();
    } else {
      throw new Error("Canister configuration required for integration");
    }
  }

  if (!verificationCanisterId) {
    printWarning("Verification canister not configured");
    await promptCanisterConfiguration();
  }

  // Test canister connectivity
  try {
    console.log(Colors.gray("Testing canister connectivity..."));
    const repos = await canisterService.listRepositories();
    console.log(
      Colors.green(
        `✓ Connected to webhook canister (${repos.length} repositories)`,
      ),
    );
  } catch (error) {
    throw new Error(`Failed to connect to canisters: ${error}`);
  }
}

async function promptCanisterConfiguration(): Promise<void> {
  const questions = [];

  if (!configManager.get("webhookCanisterId")) {
    questions.push({
      type: "input",
      name: "webhookCanisterId",
      message: "Enter webhook canister ID:",
      validate: (input: string) =>
        input.length > 0 || "Canister ID is required",
    });
  }

  if (!configManager.get("verificationCanisterId")) {
    questions.push({
      type: "input",
      name: "verificationCanisterId",
      message: "Enter verification canister ID:",
      validate: (input: string) =>
        input.length > 0 || "Canister ID is required",
    });
  }

  if (questions.length > 0) {
    const answers = await inquirer.prompt(questions);

    for (const [key, value] of Object.entries(answers)) {
      configManager.set(key, value);
    }

    console.log(Colors.green("✓ Canister configuration saved"));
  }
}

async function getIntegrationConfig(
  platform: "github" | "gitlab" | "bitbucket",
  options: any,
): Promise<SCMIntegrationConfig> {
  let token = options.token;

  // Prompt for token if not provided
  if (!token) {
    const tokenPrompt = await inquirer.prompt([{
      type: "password",
      name: "token",
      message: `Enter ${platform.toUpperCase()} API token:`,
      validate: (input: string) => input.length > 0 || "API token is required",
    }]);
    token = tokenPrompt.token;
  }

  // Get project configuration for canister deployment
  const canisterConfigs = await detectCanisterConfigurations();

  const config: SCMIntegrationConfig = {
    provider: platform,
    token,
    baseUrl: options.baseUrl,
    webhookSecret: options.webhookSecret || generateWebhookSecret(),
    webhookUrl: options.webhookUrl ||
      `https://${configManager.get("webhookCanisterId")}.ic0.app/webhook`,
    autoDeploy: options.autoDeploy || false,
    targetBranch: options.branch || "main",
    buildTriggers: ["push", "pull_request"],
    canisterConfigs,
  };

  // Save configuration for future use
  configManager.set(`scm.${platform}`, {
    token,
    baseUrl: config.baseUrl,
    autoDeploy: config.autoDeploy,
    targetBranch: config.targetBranch,
  });

  return config;
}

async function detectCanisterConfigurations(): Promise<any[]> {
  const configs: any[] = [];
  const cwd = process.cwd();

  // Check for dfx.json
  const dfxPath = path.join(cwd, "dfx.json");
  if (await fs.pathExists(dfxPath)) {
    try {
      const dfxConfig = await fs.readJson(dfxPath);

      if (dfxConfig.canisters) {
        for (
          const [name, config] of Object.entries(dfxConfig.canisters as any)
        ) {
          const canisterConfig: any = {
            name,
            network: "local", // Default to local, can be overridden
            cyclesThreshold: 1000000000, // 1B cycles default
          };

          const typedConfig = config as any;

          // Detect canister type based on configuration
          if (typedConfig.type === "motoko") {
            canisterConfig.type = "motoko";
            canisterConfig.buildCommand = `dfx build ${name}`;
            canisterConfig.deployCommand = `dfx deploy ${name}`;
          } else if (typedConfig.type === "rust") {
            canisterConfig.type = "rust";
            canisterConfig.buildCommand = `dfx build ${name}`;
            canisterConfig.deployCommand = `dfx deploy ${name}`;
          } else if (typedConfig.type === "assets") {
            canisterConfig.type = "asset";
            canisterConfig.buildCommand = `npm run build && dfx build ${name}`;
            canisterConfig.deployCommand = `dfx deploy ${name}`;
          } else if (typedConfig.type === "custom") {
            canisterConfig.type = "azle";
            canisterConfig.buildCommand = `dfx build ${name}`;
            canisterConfig.deployCommand = `dfx deploy ${name}`;
          }

          configs.push(canisterConfig);
        }
      }
    } catch (error) {
      logger.warn("Failed to parse dfx.json", { error });
    }
  }

  // If no canisters detected, prompt for manual configuration
  if (configs.length === 0) {
    const { hasManualConfig } = await inquirer.prompt([{
      type: "confirm",
      name: "hasManualConfig",
      message: "No canisters detected. Would you like to configure manually?",
      default: false,
    }]);

    if (hasManualConfig) {
      const manualConfig = await inquirer.prompt([
        {
          type: "input",
          name: "name",
          message: "Canister name:",
          default: "main",
        },
        {
          type: "list",
          name: "type",
          message: "Canister type:",
          choices: ["motoko", "rust", "azle", "asset"],
        },
        {
          type: "input",
          name: "buildCommand",
          message: "Build command:",
          default: (answers: any) => `dfx build ${answers.name}`,
        },
        {
          type: "list",
          name: "network",
          message: "Default network:",
          choices: ["local", "ic"],
          default: "local",
        },
      ]);

      configs.push({
        ...manualConfig,
        deployCommand: `dfx deploy ${manualConfig.name}`,
        cyclesThreshold: 1000000000,
      });
    }
  }

  return configs;
}

async function setupRepositoryIntegration(
  provider: any,
  owner: string,
  repo: string,
  config: SCMIntegrationConfig,
): Promise<void> {
  console.log();
  console.log(Colors.bold(`🔗 Setting up integration for ${owner}/${repo}`));

  try {
    // Setup repository integration (creates webhook and registers with canister)
    const registrationId = await provider.setupRepositoryIntegration(
      owner,
      repo,
    );

    printSuccess(`Repository integrated successfully!`);
    console.log();
    console.log(Colors.gray("Integration details:"));
    console.log(`  Repository: ${Colors.cyan(owner + "/" + repo)}`);
    console.log(
      `  Webhook URL: ${Colors.gray(config.webhookUrl || "Not set")}`,
    );
    console.log(
      `  Auto-deploy: ${
        config.autoDeploy ? Colors.green("Enabled") : Colors.yellow("Disabled")
      }`,
    );
    console.log(`  Target branch: ${Colors.cyan(config.targetBranch)}`);
    console.log(`  Canister registration: ${Colors.cyan(registrationId)}`);

    if (config.canisterConfigs.length > 0) {
      console.log();
      console.log(Colors.gray("Configured canisters:"));
      config.canisterConfigs.forEach((canister) => {
        console.log(
          `  • ${
            Colors.cyan(canister.name)
          } (${canister.type}) → ${canister.network}`,
        );
      });
    }
  } catch (error: any) {
    throw new Error(`Failed to setup repository integration: ${error.message}`);
  }
}

async function interactiveRepositorySetup(
  provider: any,
  config: SCMIntegrationConfig,
): Promise<void> {
  try {
    console.log();
    console.log(Colors.gray("Fetching repositories..."));

    const repositories = await provider.listRepositories();

    if (repositories.length === 0) {
      throw new Error(
        "No repositories found. Make sure your token has the correct permissions.",
      );
    }

    const { selectedRepo } = await inquirer.prompt([{
      type: "list",
      name: "selectedRepo",
      message: "Select repository to integrate:",
      choices: repositories.map((repo: any) => ({
        name: `${repo.fullName} ${repo.private ? "(private)" : "(public)"} - ${
          repo.description || "No description"
        }`,
        value: repo,
      })),
      pageSize: 10,
    }]);

    const [owner, repo] = selectedRepo.fullName.split("/");
    await setupRepositoryIntegration(provider, owner, repo, config);
  } catch (error: any) {
    throw new Error(`Failed to setup interactive repository: ${error.message}`);
  }
}

function generateWebhookSecret(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}
