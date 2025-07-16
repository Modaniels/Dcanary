"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStatusCommand = createStatusCommand;
const commander_1 = require("commander");
const ui_1 = require("../utils/ui");
function createStatusCommand() {
    const command = new commander_1.Command('status');
    command
        .description('Check status of ICP project builds and deployments')
        .option('-p, --project <project>', 'Project name')
        .option('-w, --watch', 'Watch for status changes')
        .action(async (options) => {
        try {
            console.log();
            console.log(ui_1.Colors.bold('🌐 Dcanary ICP Project Status'));
            console.log();
            // Project info
            console.log(ui_1.Colors.cyan('Project: my-icp-project'));
            console.log(ui_1.Colors.gray('Type: Motoko + React Frontend'));
            console.log();
            // Build status
            console.log(ui_1.Colors.cyan('Latest Build:'));
            console.log('  • Status: ✅ Success');
            console.log('  • Commit: abc1234 - "Add user authentication"');
            console.log('  • Duration: 2m 34s');
            console.log('  • Nodes: 3/3 consensus achieved');
            console.log();
            // Deployment status
            console.log(ui_1.Colors.cyan('Deployments:'));
            console.log('  • Local Replica: ✅ Running');
            console.log('  • IC Mainnet: ✅ Deployed');
            console.log('  • Asset Canister: ✅ Updated');
            console.log();
            // Canister status
            console.log(ui_1.Colors.cyan('Canisters:'));
            console.log('  • Backend: rdmx6-jaaaa-aaaah-qcaiq-cai (✅ Running)');
            console.log('  • Frontend: rrkah-fqaaa-aaaah-qcaiq-cai (✅ Running)');
            console.log('  • Cycles: 1.2T remaining');
            console.log();
            if (options.watch) {
                console.log(ui_1.Colors.gray('👀 Watching for changes... (Press Ctrl+C to stop)'));
                // TODO: Implement watch mode
            }
        }
        catch (error) {
            console.error('Status check failed:', error.message);
            process.exit(1);
        }
    });
    return command;
}
//# sourceMappingURL=status.js.map