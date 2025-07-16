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
exports.ProjectAnalyzer = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const logger_1 = require("../../utils/logger");
class ProjectAnalyzer {
    async analyzeProject(projectPath) {
        logger_1.logger.info('Starting project analysis', { projectPath });
        const analysis = {
            detectedTypes: [],
            language: 'unknown',
            suggestedCommands: {},
            dependencies: [],
            hasDockerfile: false,
            hasTests: false,
            isMonorepo: false,
            deploymentTargets: [],
            estimatedComplexity: 'simple'
        };
        try {
            // Check for common files
            await this.detectProjectType(projectPath, analysis);
            await this.analyzePackageFiles(projectPath, analysis);
            await this.detectFrameworks(projectPath, analysis);
            await this.suggestCommands(analysis);
            await this.detectDeploymentTargets(projectPath, analysis);
            await this.estimateComplexity(projectPath, analysis);
            logger_1.logger.info('Project analysis complete', { analysis });
            return analysis;
        }
        catch (error) {
            logger_1.logger.error('Project analysis failed', { error: error.message });
            throw error;
        }
    }
    async detectProjectType(projectPath, analysis) {
        const files = await fs.readdir(projectPath);
        // Check for ICP-specific files first
        const icpIndicators = {
            'dfx.json': 'icp',
            'canister_ids.json': 'icp',
            '.vessel': 'motoko',
            'Cargo.toml': 'rust-canister', // Could be regular rust, but check context
            'package.json': 'azle', // Could be regular node, but check context
            'vessel.dhall': 'motoko',
            'moc': 'motoko'
        };
        // Secondary indicators for ICP project types
        const secondaryIndicators = {
            'src/main.mo': 'motoko',
            'src/lib.rs': 'rust-canister',
            'src/index.ts': 'azle',
            'src/declarations': 'icp-frontend'
        };
        // Check primary indicators
        for (const file of files) {
            if (icpIndicators[file]) {
                analysis.detectedTypes.push(icpIndicators[file]);
                if (file === 'dfx.json') {
                    await this.analyzeDfxJson(projectPath, analysis);
                }
            }
        }
        // Check secondary indicators
        for (const [filePath, type] of Object.entries(secondaryIndicators)) {
            if (await fs.pathExists(path.join(projectPath, filePath))) {
                if (!analysis.detectedTypes.includes(type)) {
                    analysis.detectedTypes.push(type);
                }
            }
        }
        // Check for test directories
        const testDirs = ['test', 'tests', '__tests__', 'spec', '.vessel/test'];
        for (const dir of testDirs) {
            if (await fs.pathExists(path.join(projectPath, dir))) {
                analysis.hasTests = true;
                break;
            }
        }
        // Check for multi-canister setup
        if (await fs.pathExists(path.join(projectPath, 'dfx.json'))) {
            try {
                const dfxConfig = await fs.readJson(path.join(projectPath, 'dfx.json'));
                if (dfxConfig.canisters && Object.keys(dfxConfig.canisters).length > 1) {
                    analysis.isMonorepo = true; // Multi-canister project
                }
            }
            catch (error) {
                // Ignore JSON parsing errors
            }
        }
    }
    async analyzeDfxJson(projectPath, analysis) {
        try {
            const dfxConfig = await fs.readJson(path.join(projectPath, 'dfx.json'));
            // Analyze canisters
            if (dfxConfig.canisters) {
                const canisters = Object.entries(dfxConfig.canisters);
                for (const [name, config] of canisters) {
                    if (config.type === 'motoko') {
                        if (!analysis.detectedTypes.includes('motoko')) {
                            analysis.detectedTypes.push('motoko');
                        }
                    }
                    else if (config.type === 'rust') {
                        if (!analysis.detectedTypes.includes('rust-canister')) {
                            analysis.detectedTypes.push('rust-canister');
                        }
                    }
                    else if (config.type === 'assets') {
                        if (!analysis.detectedTypes.includes('icp-frontend')) {
                            analysis.detectedTypes.push('icp-frontend');
                        }
                    }
                }
            }
            // Set language based on predominant canister type
            if (analysis.detectedTypes.includes('motoko')) {
                analysis.language = 'motoko';
            }
            else if (analysis.detectedTypes.includes('rust-canister')) {
                analysis.language = 'rust';
            }
            else if (analysis.detectedTypes.includes('azle')) {
                analysis.language = 'typescript';
            }
        }
        catch (error) {
            // Ignore JSON parsing errors
        }
    }
    async analyzePackageFiles(projectPath, analysis) {
        // Node.js projects
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            analysis.language = 'javascript';
            // Detect package manager
            if (await fs.pathExists(path.join(projectPath, 'yarn.lock'))) {
                analysis.packageManager = 'yarn';
            }
            else if (await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
                analysis.packageManager = 'pnpm';
            }
            else {
                analysis.packageManager = 'npm';
            }
            // Extract dependencies
            const deps = {
                ...packageJson.dependencies || {},
                ...packageJson.devDependencies || {}
            };
            analysis.dependencies = Object.keys(deps);
            // Check for TypeScript
            if (deps['typescript'] || await fs.pathExists(path.join(projectPath, 'tsconfig.json'))) {
                analysis.language = 'typescript';
            }
        }
        // Python projects
        const requirementsPath = path.join(projectPath, 'requirements.txt');
        if (await fs.pathExists(requirementsPath)) {
            analysis.language = 'python';
            const requirements = await fs.readFile(requirementsPath, 'utf-8');
            analysis.dependencies = requirements.split('\n')
                .map(line => line.split('==')[0].split('>=')[0].trim())
                .filter(dep => dep.length > 0);
        }
        // Rust projects
        const cargoPath = path.join(projectPath, 'Cargo.toml');
        if (await fs.pathExists(cargoPath)) {
            analysis.language = 'rust';
            // Could parse Cargo.toml for dependencies if needed
        }
    }
    async detectFrameworks(projectPath, analysis) {
        if (analysis.dependencies.length === 0)
            return;
        // ICP-focused framework detection
        const icpFrameworkMap = {
            'react': 'react-icp',
            'vue': 'vue-icp',
            '@angular/core': 'angular-icp',
            '@dfinity/agent': 'icp-integration',
            '@dfinity/candid': 'icp-integration',
            '@dfinity/identity': 'icp-integration',
            'azle': 'azle',
            'vessel': 'motoko'
        };
        for (const dep of analysis.dependencies) {
            const framework = icpFrameworkMap[dep];
            if (framework) {
                analysis.framework = framework;
                if (!analysis.detectedTypes.includes(framework)) {
                    analysis.detectedTypes.push(framework);
                }
                break;
            }
        }
        // If no specific framework detected but has ICP dependencies, mark as ICP project
        const hasIcpDeps = analysis.dependencies.some(dep => dep.includes('@dfinity') || dep.includes('agent-js') || dep.includes('ic-'));
        if (hasIcpDeps && !analysis.framework) {
            analysis.framework = 'icp-integration';
        }
    }
    async suggestCommands(analysis) {
        const { detectedTypes, framework } = analysis;
        // ICP-focused command suggestions
        if (detectedTypes.includes('icp') || detectedTypes.includes('motoko') || detectedTypes.includes('rust-canister')) {
            analysis.suggestedCommands = {
                build: 'dfx build',
                test: 'dfx test',
                dev: 'dfx start --background && dfx deploy',
                deploy: 'dfx deploy --network ic'
            };
        }
        else if (detectedTypes.includes('azle')) {
            analysis.suggestedCommands = {
                build: 'dfx build',
                test: 'npm test',
                dev: 'dfx start --background && dfx deploy',
                deploy: 'dfx deploy --network ic'
            };
        }
        else if (framework?.includes('icp')) {
            // Frontend with ICP integration
            analysis.suggestedCommands = {
                build: 'npm run build && dfx build',
                test: 'npm test',
                dev: 'npm run dev',
                deploy: 'npm run build && dfx deploy --network ic'
            };
        }
        else {
            // Fallback for unrecognized ICP projects
            analysis.suggestedCommands = {
                build: 'dfx build',
                test: 'echo "Configure test command"',
                dev: 'dfx start --background',
                deploy: 'dfx deploy --network ic'
            };
        }
    }
    async detectDeploymentTargets(projectPath, analysis) {
        const { detectedTypes, framework } = analysis;
        // ICP deployment targets
        if (detectedTypes.includes('motoko') || detectedTypes.includes('rust-canister') || detectedTypes.includes('azle')) {
            analysis.deploymentTargets.push('ic-mainnet', 'local');
        }
        // Frontend projects with ICP integration
        if (framework?.includes('icp') || detectedTypes.includes('icp-frontend')) {
            analysis.deploymentTargets.push('asset-canister', 'ipfs');
        }
        // Multi-canister projects
        if (analysis.isMonorepo) {
            analysis.deploymentTargets.push('ic-mainnet', 'local', 'asset-canister');
        }
        // Check for specific deployment configurations
        if (await fs.pathExists(path.join(projectPath, 'candid'))) {
            analysis.deploymentTargets.push('candid-ui');
        }
        // Default ICP targets if none detected
        if (analysis.deploymentTargets.length === 0) {
            analysis.deploymentTargets.push('local', 'ic-mainnet');
        }
    }
    async estimateComplexity(projectPath, analysis) {
        let complexityScore = 0;
        // File count
        const files = await (0, glob_1.glob)('**/*', { cwd: projectPath, ignore: ['node_modules/**', '.git/**'] });
        if (files.length > 100)
            complexityScore += 2;
        else if (files.length > 50)
            complexityScore += 1;
        // Dependencies
        if (analysis.dependencies.length > 50)
            complexityScore += 2;
        else if (analysis.dependencies.length > 20)
            complexityScore += 1;
        // Multiple languages/frameworks
        if (analysis.detectedTypes.length > 2)
            complexityScore += 1;
        // Monorepo
        if (analysis.isMonorepo)
            complexityScore += 2;
        // Docker
        if (analysis.hasDockerfile)
            complexityScore += 1;
        // Tests
        if (analysis.hasTests)
            complexityScore += 1;
        if (complexityScore >= 5) {
            analysis.estimatedComplexity = 'complex';
        }
        else if (complexityScore >= 2) {
            analysis.estimatedComplexity = 'medium';
        }
        else {
            analysis.estimatedComplexity = 'simple';
        }
    }
}
exports.ProjectAnalyzer = ProjectAnalyzer;
//# sourceMappingURL=project-analyzer.js.map