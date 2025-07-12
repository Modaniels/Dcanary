import { Command } from "commander";
import { logger } from "../utils/logger";
import { getAgent, getIdentity } from "../utils/helpers";
import { Actor } from "@dfinity/agent";
import {
  printError,
  printHeader,
  printInfo,
  printSuccess,
  Spinner,
} from "../utils/ui";

// Webhook canister interface for triggers
const webhookCanisterInterface = ({ IDL }: any) => {
  const WebhookEventType = IDL.Variant({
    Push: IDL.Null,
    PullRequest: IDL.Null,
    MergeRequest: IDL.Null,
    Tag: IDL.Null,
    Release: IDL.Null,
  });

  const BuildTrigger = IDL.Record({
    id: IDL.Text,
    project_id: IDL.Text,
    repository_id: IDL.Text,
    trigger_type: WebhookEventType,
    branch: IDL.Opt(IDL.Text),
    commit_sha: IDL.Text,
    commit_message: IDL.Opt(IDL.Text),
    author_name: IDL.Opt(IDL.Text),
    author_email: IDL.Opt(IDL.Text),
    triggered_at: IDL.Nat64,
    verification_id: IDL.Opt(IDL.Text),
  });

  return IDL.Service({
    getBuildTriggers: IDL.Func([IDL.Text], [IDL.Vec(BuildTrigger)], ["query"]),
    getBuildTrigger: IDL.Func([IDL.Text], [IDL.Opt(BuildTrigger)], ["query"]),
  });
};

interface WebhookOptions {
  canisterId?: string;
  network?: string;
}

export function createWebhookCommand(): Command {
  const webhook = new Command("webhook")
    .description("Manage webhook events and build triggers")
    .option("--canister-id <id>", "Webhook canister ID")
    .option("--network <network>", "Network to use (local/ic)", "local");

  // List build triggers command
  webhook.command("triggers")
    .description("List build triggers for a project")
    .argument("<project-id>", "Project ID")
    .option("--limit <limit>", "Limit number of results", "20")
    .action(async (projectId: string, options: any, command: any) => {
      try {
        const parentOptions = command.parent.opts() as WebhookOptions;

        printHeader("🔨 Build Triggers");

        const spinner = new Spinner();
        spinner.start("Fetching build triggers...");

        try {
          const identity = await getIdentity();
          const agent = await getAgent(
            parentOptions.network || "local",
            identity,
          );

          if (!parentOptions.canisterId) {
            throw new Error(
              "Webhook canister ID is required. Use --canister-id option.",
            );
          }

          const webhookActor = Actor.createActor(webhookCanisterInterface, {
            agent,
            canisterId: parentOptions.canisterId,
          });

          const result = await webhookActor.getBuildTriggers(
            projectId,
          ) as any[];

          spinner.succeed();

          if (result.length === 0) {
            printInfo("No build triggers found for this project.");
            return;
          }

          const limit = parseInt(options.limit);
          const limitedTriggers = result.slice(0, limit);

          printInfo(
            `Found ${result.length} build triggers (showing ${limitedTriggers.length}):\n`,
          );

          limitedTriggers.forEach((trigger: any, index: number) => {
            const triggerType = Object.keys(trigger.trigger_type)[0];
            const triggeredAt = new Date(
              Number(trigger.triggered_at / 1000000n),
            );

            console.log(
              `${index + 1}. ${triggerType} trigger - ${
                trigger.commit_sha.substring(0, 8)
              }`,
            );
            console.log(`   ID: ${trigger.id}`);
            console.log(`   Repository: ${trigger.repository_id}`);

            if (trigger.branch.length > 0) {
              console.log(`   Branch: ${trigger.branch[0]}`);
            }

            if (trigger.commit_message.length > 0) {
              console.log(`   Message: ${trigger.commit_message[0]}`);
            }

            if (trigger.author_name.length > 0) {
              console.log(`   Author: ${trigger.author_name[0]}`);
            }

            if (trigger.verification_id.length > 0) {
              console.log(`   Verification: ${trigger.verification_id[0]}`);
            }

            console.log(`   Triggered: ${triggeredAt.toLocaleString()}`);
            console.log("");
          });

          if (result.length > limit) {
            printInfo(
              `... and ${
                result.length - limit
              } more triggers. Use --limit to see more.`,
            );
          }
        } catch (error) {
          spinner.fail();
          throw error;
        }
      } catch (error) {
        logger.error("Failed to fetch build triggers", error);
        printError(
          `Failed to fetch build triggers: ${(error as Error).message}`,
        );
        process.exit(1);
      }
    });

  // Get specific trigger command
  webhook.command("trigger")
    .description("Get details of a specific build trigger")
    .argument("<trigger-id>", "Build trigger ID")
    .action(async (triggerId: string, options: any, command: any) => {
      try {
        const parentOptions = command.parent.opts() as WebhookOptions;

        printHeader("🔍 Build Trigger Details");

        const spinner = new Spinner();
        spinner.start("Fetching build trigger...");

        try {
          const identity = await getIdentity();
          const agent = await getAgent(
            parentOptions.network || "local",
            identity,
          );

          if (!parentOptions.canisterId) {
            throw new Error(
              "Webhook canister ID is required. Use --canister-id option.",
            );
          }

          const webhookActor = Actor.createActor(webhookCanisterInterface, {
            agent,
            canisterId: parentOptions.canisterId,
          });

          const triggerOpt = await webhookActor.getBuildTrigger(
            triggerId,
          ) as any[];

          spinner.succeed();

          if (triggerOpt.length === 0) {
            printError("Build trigger not found.");
            return;
          }

          const trigger = triggerOpt[0];
          const triggerType = Object.keys(trigger.trigger_type)[0];
          const triggeredAt = new Date(Number(trigger.triggered_at / 1000000n));

          printInfo("Build Trigger Details:\n");

          console.log(`ID: ${trigger.id}`);
          console.log(`Project ID: ${trigger.project_id}`);
          console.log(`Repository ID: ${trigger.repository_id}`);
          console.log(`Trigger Type: ${triggerType}`);
          console.log(`Commit SHA: ${trigger.commit_sha}`);

          if (trigger.branch.length > 0) {
            console.log(`Branch: ${trigger.branch[0]}`);
          }

          if (trigger.commit_message.length > 0) {
            console.log(`Commit Message: ${trigger.commit_message[0]}`);
          }

          if (trigger.author_name.length > 0) {
            console.log(`Author Name: ${trigger.author_name[0]}`);
          }

          if (trigger.author_email.length > 0) {
            console.log(`Author Email: ${trigger.author_email[0]}`);
          }

          if (trigger.verification_id.length > 0) {
            console.log(`Verification ID: ${trigger.verification_id[0]}`);
          }

          console.log(`Triggered At: ${triggeredAt.toLocaleString()}`);
        } catch (error) {
          spinner.fail();
          throw error;
        }
      } catch (error) {
        logger.error("Failed to fetch build trigger", error);
        printError(
          `Failed to fetch build trigger: ${(error as Error).message}`,
        );
        process.exit(1);
      }
    });

  // Test webhook command (for local testing)
  webhook.command("test")
    .description("Test webhook integration locally")
    .argument("<repository-id>", "Repository ID")
    .option("--event <event>", "Event type (push/tag)", "push")
    .option("--branch <branch>", "Branch name", "main")
    .option("--commit <commit>", "Commit SHA", "test-commit-sha")
    .action(async (repositoryId: string, options: any) => {
      try {
        printHeader("🧪 Test Webhook");

        printInfo("Testing webhook integration...\n");
        printInfo(`Repository ID: ${repositoryId}`);
        printInfo(`Event Type: ${options.event}`);
        printInfo(`Branch: ${options.branch}`);
        printInfo(`Commit SHA: ${options.commit}`);

        // This would be a simulation of webhook processing
        printSuccess("\n✅ Webhook test simulation completed!");
        printInfo("In a real scenario, this would:");
        printInfo("1. Verify webhook signature");
        printInfo("2. Parse webhook payload");
        printInfo("3. Check repository configuration");
        printInfo("4. Create build trigger");
        printInfo("5. Optionally start verification process");
      } catch (error) {
        logger.error("Failed to test webhook", error);
        printError(`Failed to test webhook: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  return webhook;
}
