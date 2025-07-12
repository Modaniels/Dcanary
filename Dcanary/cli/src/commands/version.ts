import { Command } from "commander";
import { Colors, printKeyValue } from "../utils/ui";
import { logger } from "../utils/logger";
import { DESCRIPTION, HOMEPAGE, NAME, VERSION } from "../constants";
/**
 * Creates the 'version' command for the Dcanary CLI.
 * This command displays detailed version information about the CLI tool,
 * including data from package.json and the current Node.js environment.
 */
export function createVersionCommand(): Command {
  const command = new Command("version");

  command
    .description("Show Dcanary CLI version information")
    .action(() => {
      console.log();
      console.log(
        Colors.bold(Colors.cyan("Dcanary CLI Version Information")),
      );
      console.log(Colors.gray("═".repeat(40)));

      printKeyValue("CLI Name", NAME);
      printKeyValue("Version", VERSION);
      printKeyValue("Description", DESCRIPTION);
      printKeyValue("Node.js Version", process.version);
      printKeyValue("Platform", `${process.platform} ${process.arch}`);

      console.log();
      console.log(Colors.gray("For more information, visit:"));
      console.log(Colors.gray(`  ${HOMEPAGE}`));
      console.log();
    });

  return command;
}
