"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitCommand = createInitCommand;
const commander_1 = require("commander");
const inquirer = __importStar(require("inquirer"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const ui_1 = require("../utils/ui");
const logger_1 = require("../utils/logger");
const project_analyzer_1 = require("../services/analyzers/project-analyzer");
const git_service_1 = require("../services/git-service");
const config_generator_1 = require("../services/config-generator");
function createInitCommand() {
    const command = new commander_1.Command('init');
    command
        .description('Initialize a new Dcanary CI/CD pipeline for your project')
        .option('-t, --type <type>', 'Project type (react, vue, nodejs, python, rust, icp, custom)')
        .option('-r, --repo <repo>', 'Git repository URL')
        .option('-n, --name <name>', 'Project name')
        .option('-f, --force', 'Overwrite existing configuration')
        .option('--template <template>', 'Use a specific template')
        .action(async (options) => {
        const spinner = new ui_1.Spinner();
        try {
            console.log(ui_1.Colors.bold('\n🌐 Welcome to Dcanary - Decentralized CI/CD for Internet Computer\n'));
            // Check if already initialized
            if (fs.existsSync('.dcanary.yml') && !options.force) {
                (0, ui_1.printError)('Already Initialized', 'This project already has Dcanary configuration. Use --force to overwrite.');
                return;
            }
            // Project analysis
            spinner.start('Analyzing current directory...');
            const analyzer = new project_analyzer_1.ProjectAnalyzer();
            const analysis = await analyzer.analyzeProject(process.cwd());
            spinner.succeed('Project analysis complete');
            // Interactive setup if no options provided
            let config = await gatherProjectInfo(options, analysis);
            // Generate configuration
            spinner.start('Generating Dcanary configuration...');
            const configGenerator = new config_generator_1.ConfigGenerator();
            const dcanaryConfig = await configGenerator.generate(config);
            spinner.succeed('Configuration generated');
            // Write configuration file
            spinner.start('Writing configuration files...');
            await fs.writeFile('.dcanary.yml', dcanaryConfig.yaml);
            await fs.writeFile('.dcanary/config.json', JSON.stringify(dcanaryConfig.json, null, 2));
            await fs.ensureDir('.dcanary/scripts');
            await fs.ensureDir('.dcanary/templates');
            spinner.succeed('Configuration files created');
            // Git integration setup
            if (config.repository) {
                spinner.start('Setting up Git integration...');
                const gitService = new git_service_1.GitService();
                await gitService.setupIntegration(config.repository, config);
                spinner.succeed('Git integration configured');
            }
            // Success message
            (0, ui_1.printSuccess)(`🎉 Dcanary Initialized Successfully! Your ${config.projectType} ICP project is now ready for decentralized CI/CD`);
            console.log();
            console.log(ui_1.Colors.bold('Next Steps:'));
            console.log('  1. ' + ui_1.Colors.cyan('dcanary analyze') + ' - Validate your ICP build configuration');
            console.log('  2. ' + ui_1.Colors.cyan('dcanary build') + ' - Test your canister build locally');
            console.log('  3. ' + ui_1.Colors.cyan('dcanary integrate github') + ' - Set up webhook integration');
            console.log('  4. ' + ui_1.Colors.cyan('dcanary deploy --network ic') + ' - Deploy to IC mainnet');
            console.log();
        }
        catch (error) {
            spinner.fail('Initialization failed');
            (0, ui_1.printError)('Initialization Error', error.message);
            logger_1.logger.error('Init command failed', { error: error.message, stack: error.stack });
            process.exit(1);
        }
    });
    return command;
}
async function gatherProjectInfo(options, analysis) {
    const questions = [];
    // Project name
    if (!options.name) {
        questions.push({
            type: 'input',
            name: 'name',
            message: 'Project name:',
            default: path.basename(process.cwd()),
            validate: (input) => input.length > 0 || 'Project name is required'
        });
    }
    // Project type
    if (!options.projectType) {
        const detectedTypes = analysis.detectedTypes || [];
        const choices = [
            { name: '🌐 Motoko Canister', value: 'motoko' },
            { name: '🦀 Rust Canister', value: 'rust-canister' },
            { name: '📘 Azle (TypeScript) Canister', value: 'azle' },
            { name: '⚛️  React DApp with IC backend', value: 'react-icp' },
            { name: '💚 Vue.js DApp with IC backend', value: 'vue-icp' },
            { name: '🅰️  Angular DApp with IC backend', value: 'angular-icp' },
            { name: '📱 React Native with IC integration', value: 'react-native-icp' },
            { name: '� Multi-canister ICP project', value: 'multi-canister' },
            { name: '📄 Static frontend for existing canisters', value: 'frontend-only' },
            { name: '⚙️  Custom ICP configuration', value: 'custom-icp' }
        ];
        questions.push({
            type: 'list',
            name: 'projectType',
            message: 'What type of ICP project is this?',
            choices,
            default: detectedTypes[0] || 'motoko'
        });
    }
    // Repository URL
    if (!options.repo) {
        questions.push({
            type: 'input',
            name: 'repository',
            message: 'Git repository URL (optional):',
            validate: (input) => {
                if (!input)
                    return true;
                return input.includes('github.com') || input.includes('gitlab.com') || input.includes('bitbucket.org')
                    || 'Please provide a valid Git repository URL';
            }
        });
    }
    // Build commands
    questions.push({
        type: 'input',
        name: 'buildCommand',
        message: 'Build command:',
        default: analysis.suggestedCommands?.build || 'dfx build',
        when: (answers) => answers.projectType !== 'frontend-only'
    });
    questions.push({
        type: 'input',
        name: 'testCommand',
        message: 'Test command (optional):',
        default: analysis.suggestedCommands?.test || 'dfx test'
    });
    // Deployment targets for ICP
    questions.push({
        type: 'checkbox',
        name: 'deployTargets',
        message: 'Select ICP deployment targets:',
        choices: [
            { name: 'Internet Computer Mainnet', value: 'ic-mainnet' },
            { name: 'Local Replica (Development)', value: 'local' },
            { name: 'Asset Canister (Frontend)', value: 'asset-canister' },
            { name: 'Frontend via IPFS (Decentralized)', value: 'ipfs' },
            { name: 'Candid UI Generation', value: 'candid-ui' },
            { name: 'Custom Deployment Script', value: 'custom' }
        ],
        validate: (choices) => choices.length > 0 || 'Select at least one deployment target'
    });
    // ICP-specific CI/CD preferences
    questions.push({
        type: 'list',
        name: 'buildStrategy',
        message: 'Decentralized build strategy for IC:',
        choices: [
            { name: 'Consensus (3+ nodes verify build) - Recommended', value: 'consensus' },
            { name: 'Parallel (fastest available node)', value: 'parallel' },
            { name: 'Sequential (fallback if one fails)', value: 'sequential' }
        ],
        default: 'consensus'
    });
    const answers = await inquirer.prompt(questions);
    return {
        name: options.name || answers.name,
        projectType: options.projectType || answers.projectType,
        repository: options.repo || answers.repository,
        buildCommand: answers.buildCommand,
        testCommand: answers.testCommand,
        deployTargets: answers.deployTargets,
        buildStrategy: answers.buildStrategy,
        ...analysis
    };
}
//# sourceMappingURL=init.js.map