"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntegrateCommand = createIntegrateCommand;
const commander_1 = require("commander");
const logger_1 = require("../utils/logger");
const ui_1 = require("../utils/ui");
const config_1 = require("../utils/config");
const canister_integration_1 = require("../services/canister-integration");
const inquirer_1 = __importDefault(require("inquirer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function createIntegrateCommand() {
    const cmd = new commander_1.Command('integrate');
    cmd
        .description('Set up Git platform integration with DCanary canisters')
        .argument('<platform>', 'SCM platform (github, gitlab)')
        .option('--token <token>', 'API token for authentication')
        .option('--auto-deploy', 'Enable automatic deployment on push')
        .option('--branch <branch>', 'Target branch for deployment', 'main')
        .option('--webhook-url <url>', 'Custom webhook URL (uses canister by default)')
        .option('--webhook-secret <secret>', 'Webhook secret for validation')
        .option('--base-url <url>', 'Base URL for enterprise/self-hosted instances')
        .option('--repo <repo>', 'Repository to integrate (owner/repo)')
        .option('--interactive', 'Interactive setup with prompts')
        .action(async (platform, options) => {
        try {
            (0, ui_1.printHeader)(`Setting up ${platform.toUpperCase()} Integration with DCanary Canisters`);
            // Validate platform
            if (!['github', 'gitlab'].includes(platform)) {
                throw new Error(`Unsupported platform: ${platform}. Supported: github, gitlab`);
            }
            // For now, just show setup instructions
            console.log();
            console.log(ui_1.Colors.bold('🚧 Canister Integration Setup'));
            console.log();
            console.log(ui_1.Colors.gray('To complete SCM integration with your canisters:'));
            console.log();
            console.log('1. Configure your canister IDs:');
            console.log('   ' + ui_1.Colors.cyan('dcanary configure --webhook-canister <canister-id>'));
            console.log('   ' + ui_1.Colors.cyan('dcanary configure --verification-canister <canister-id>'));
            console.log();
            console.log('2. Set up your API token:');
            console.log('   ' + ui_1.Colors.cyan(`dcanary integrate ${platform} --token <your-token>`));
            console.log();
            console.log('3. Connect a repository:');
            console.log('   ' + ui_1.Colors.cyan(`dcanary integrate ${platform} --repo owner/repo --auto-deploy`));
            console.log();
            (0, ui_1.printSuccess)('Integration guide displayed!');
            console.log();
            console.log(ui_1.Colors.gray('Full canister integration will be available in the next update.'));
        }
        catch (error) {
            logger_1.logger.error('Integration setup failed', { error: error.message, platform });
            (0, ui_1.printError)('Integration Failed', error.message);
            process.exit(1);
        }
    });
    return cmd;
}
async function validateCanisterConfiguration() {
    const webhookCanisterId = config_1.configManager.get('webhookCanisterId');
    const verificationCanisterId = config_1.configManager.get('verificationCanisterId');
    if (!webhookCanisterId) {
        (0, ui_1.printWarning)('Webhook canister not configured');
        console.log('Configure with: ' + ui_1.Colors.cyan('dcanary configure --webhook-canister <canister-id>'));
        const { shouldConfigure } = await inquirer_1.default.prompt([{
                type: 'confirm',
                name: 'shouldConfigure',
                message: 'Would you like to configure canister IDs now?',
                default: true
            }]);
        if (shouldConfigure) {
            await promptCanisterConfiguration();
        }
        else {
            throw new Error('Canister configuration required for integration');
        }
    }
    if (!verificationCanisterId) {
        (0, ui_1.printWarning)('Verification canister not configured');
        await promptCanisterConfiguration();
    }
    // Test canister connectivity
    try {
        console.log(ui_1.Colors.gray('Testing canister connectivity...'));
        const repos = await canister_integration_1.canisterService.listRepositories();
        console.log(ui_1.Colors.green(`✓ Connected to webhook canister (${repos.length} repositories)`));
    }
    catch (error) {
        throw new Error(`Failed to connect to canisters: ${error}`);
    }
}
async function promptCanisterConfiguration() {
    const questions = [];
    if (!config_1.configManager.get('webhookCanisterId')) {
        questions.push({
            type: 'input',
            name: 'webhookCanisterId',
            message: 'Enter webhook canister ID:',
            validate: (input) => input.length > 0 || 'Canister ID is required'
        });
    }
    if (!config_1.configManager.get('verificationCanisterId')) {
        questions.push({
            type: 'input',
            name: 'verificationCanisterId',
            message: 'Enter verification canister ID:',
            validate: (input) => input.length > 0 || 'Canister ID is required'
        });
    }
    if (questions.length > 0) {
        const answers = await inquirer_1.default.prompt(questions);
        for (const [key, value] of Object.entries(answers)) {
            config_1.configManager.set(key, value);
        }
        console.log(ui_1.Colors.green('✓ Canister configuration saved'));
    }
}
async function getIntegrationConfig(platform, options) {
    let token = options.token;
    // Prompt for token if not provided
    if (!token) {
        const tokenPrompt = await inquirer_1.default.prompt([{
                type: 'password',
                name: 'token',
                message: `Enter ${platform.toUpperCase()} API token:`,
                validate: (input) => input.length > 0 || 'API token is required'
            }]);
        token = tokenPrompt.token;
    }
    // Get project configuration for canister deployment
    const canisterConfigs = await detectCanisterConfigurations();
    const config = {
        provider: platform,
        token,
        baseUrl: options.baseUrl,
        webhookSecret: options.webhookSecret || generateWebhookSecret(),
        webhookUrl: options.webhookUrl ||
            `https://${config_1.configManager.get('webhookCanisterId')}.ic0.app/webhook`,
        autoDeploy: options.autoDeploy || false,
        targetBranch: options.branch || 'main',
        buildTriggers: ['push', 'pull_request'],
        canisterConfigs
    };
    // Save configuration for future use
    config_1.configManager.set(`scm.${platform}`, {
        token,
        baseUrl: config.baseUrl,
        autoDeploy: config.autoDeploy,
        targetBranch: config.targetBranch
    });
    return config;
}
async function detectCanisterConfigurations() {
    const configs = [];
    const cwd = process.cwd();
    // Check for dfx.json
    const dfxPath = path_1.default.join(cwd, 'dfx.json');
    if (await fs_extra_1.default.pathExists(dfxPath)) {
        try {
            const dfxConfig = await fs_extra_1.default.readJson(dfxPath);
            if (dfxConfig.canisters) {
                for (const [name, config] of Object.entries(dfxConfig.canisters)) {
                    const canisterConfig = {
                        name,
                        network: 'local', // Default to local, can be overridden
                        cyclesThreshold: 1000000000 // 1B cycles default
                    };
                    const typedConfig = config;
                    // Detect canister type based on configuration
                    if (typedConfig.type === 'motoko') {
                        canisterConfig.type = 'motoko';
                        canisterConfig.buildCommand = `dfx build ${name}`;
                        canisterConfig.deployCommand = `dfx deploy ${name}`;
                    }
                    else if (typedConfig.type === 'rust') {
                        canisterConfig.type = 'rust';
                        canisterConfig.buildCommand = `dfx build ${name}`;
                        canisterConfig.deployCommand = `dfx deploy ${name}`;
                    }
                    else if (typedConfig.type === 'assets') {
                        canisterConfig.type = 'asset';
                        canisterConfig.buildCommand = `npm run build && dfx build ${name}`;
                        canisterConfig.deployCommand = `dfx deploy ${name}`;
                    }
                    else if (typedConfig.type === 'custom') {
                        canisterConfig.type = 'azle';
                        canisterConfig.buildCommand = `dfx build ${name}`;
                        canisterConfig.deployCommand = `dfx deploy ${name}`;
                    }
                    configs.push(canisterConfig);
                }
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to parse dfx.json', { error });
        }
    }
    // If no canisters detected, prompt for manual configuration
    if (configs.length === 0) {
        const { hasManualConfig } = await inquirer_1.default.prompt([{
                type: 'confirm',
                name: 'hasManualConfig',
                message: 'No canisters detected. Would you like to configure manually?',
                default: false
            }]);
        if (hasManualConfig) {
            const manualConfig = await inquirer_1.default.prompt([
                {
                    type: 'input',
                    name: 'name',
                    message: 'Canister name:',
                    default: 'main'
                },
                {
                    type: 'list',
                    name: 'type',
                    message: 'Canister type:',
                    choices: ['motoko', 'rust', 'azle', 'asset']
                },
                {
                    type: 'input',
                    name: 'buildCommand',
                    message: 'Build command:',
                    default: (answers) => `dfx build ${answers.name}`
                },
                {
                    type: 'list',
                    name: 'network',
                    message: 'Default network:',
                    choices: ['local', 'ic'],
                    default: 'local'
                }
            ]);
            configs.push({
                ...manualConfig,
                deployCommand: `dfx deploy ${manualConfig.name}`,
                cyclesThreshold: 1000000000
            });
        }
    }
    return configs;
}
async function setupRepositoryIntegration(provider, owner, repo, config) {
    console.log();
    console.log(ui_1.Colors.bold(`🔗 Setting up integration for ${owner}/${repo}`));
    try {
        // Setup repository integration (creates webhook and registers with canister)
        const registrationId = await provider.setupRepositoryIntegration(owner, repo);
        (0, ui_1.printSuccess)(`Repository integrated successfully!`);
        console.log();
        console.log(ui_1.Colors.gray('Integration details:'));
        console.log(`  Repository: ${ui_1.Colors.cyan(owner + '/' + repo)}`);
        console.log(`  Webhook URL: ${ui_1.Colors.gray(config.webhookUrl || 'Not set')}`);
        console.log(`  Auto-deploy: ${config.autoDeploy ? ui_1.Colors.green('Enabled') : ui_1.Colors.yellow('Disabled')}`);
        console.log(`  Target branch: ${ui_1.Colors.cyan(config.targetBranch)}`);
        console.log(`  Canister registration: ${ui_1.Colors.cyan(registrationId)}`);
        if (config.canisterConfigs.length > 0) {
            console.log();
            console.log(ui_1.Colors.gray('Configured canisters:'));
            config.canisterConfigs.forEach(canister => {
                console.log(`  • ${ui_1.Colors.cyan(canister.name)} (${canister.type}) → ${canister.network}`);
            });
        }
    }
    catch (error) {
        throw new Error(`Failed to setup repository integration: ${error.message}`);
    }
}
async function interactiveRepositorySetup(provider, config) {
    try {
        console.log();
        console.log(ui_1.Colors.gray('Fetching repositories...'));
        const repositories = await provider.listRepositories();
        if (repositories.length === 0) {
            throw new Error('No repositories found. Make sure your token has the correct permissions.');
        }
        const { selectedRepo } = await inquirer_1.default.prompt([{
                type: 'list',
                name: 'selectedRepo',
                message: 'Select repository to integrate:',
                choices: repositories.map((repo) => ({
                    name: `${repo.fullName} ${repo.private ? '(private)' : '(public)'} - ${repo.description || 'No description'}`,
                    value: repo
                })),
                pageSize: 10
            }]);
        const [owner, repo] = selectedRepo.fullName.split('/');
        await setupRepositoryIntegration(provider, owner, repo, config);
    }
    catch (error) {
        throw new Error(`Failed to setup interactive repository: ${error.message}`);
    }
}
function generateWebhookSecret() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
//# sourceMappingURL=integrate.js.map