import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { logger } from '../../utils/logger';

export interface ProjectAnalysis {
    detectedTypes: string[];
    framework?: string;
    language: string;
    packageManager?: string;
    suggestedCommands: {
        build?: string;
        test?: string;
        dev?: string;
        deploy?: string;
    };
    dependencies: string[];
    hasDockerfile: boolean;
    hasTests: boolean;
    isMonorepo: boolean;
    deploymentTargets: string[];
    estimatedComplexity: 'simple' | 'medium' | 'complex';
}

export class ProjectAnalyzer {
    async analyzeProject(projectPath: string): Promise<ProjectAnalysis> {
        logger.info('Starting project analysis', { projectPath });

        const analysis: ProjectAnalysis = {
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

            logger.info('Project analysis complete', { analysis });
            return analysis;

        } catch (error: any) {
            logger.error('Project analysis failed', { error: error.message });
            throw error;
        }
    }

    private async detectProjectType(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
        const files = await fs.readdir(projectPath);
        
        // Check for ICP-specific files first
        const icpIndicators: Record<string, string> = {
            'dfx.json': 'icp',
            'canister_ids.json': 'icp',
            '.vessel': 'motoko',
            'Cargo.toml': 'rust-canister', // Could be regular rust, but check context
            'package.json': 'azle', // Could be regular node, but check context
            'vessel.dhall': 'motoko',
            'moc': 'motoko'
        };

        // Secondary indicators for ICP project types
        const secondaryIndicators: Record<string, string> = {
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
            } catch (error) {
                // Ignore JSON parsing errors
            }
        }
    }

    private async analyzeDfxJson(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
        try {
            const dfxConfig = await fs.readJson(path.join(projectPath, 'dfx.json'));
            
            // Analyze canisters
            if (dfxConfig.canisters) {
                const canisters = Object.entries(dfxConfig.canisters) as Array<[string, any]>;
                
                for (const [name, config] of canisters) {
                    if (config.type === 'motoko') {
                        if (!analysis.detectedTypes.includes('motoko')) {
                            analysis.detectedTypes.push('motoko');
                        }
                    } else if (config.type === 'rust') {
                        if (!analysis.detectedTypes.includes('rust-canister')) {
                            analysis.detectedTypes.push('rust-canister');
                        }
                    } else if (config.type === 'assets') {
                        if (!analysis.detectedTypes.includes('icp-frontend')) {
                            analysis.detectedTypes.push('icp-frontend');
                        }
                    }
                }
            }

            // Set language based on predominant canister type
            if (analysis.detectedTypes.includes('motoko')) {
                analysis.language = 'motoko';
            } else if (analysis.detectedTypes.includes('rust-canister')) {
                analysis.language = 'rust';
            } else if (analysis.detectedTypes.includes('azle')) {
                analysis.language = 'typescript';
            }
        } catch (error) {
            // Ignore JSON parsing errors
        }
    }

    private async analyzePackageFiles(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
        // Node.js projects
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
            const packageJson = await fs.readJson(packageJsonPath);
            analysis.language = 'javascript';
            
            // Detect package manager
            if (await fs.pathExists(path.join(projectPath, 'yarn.lock'))) {
                analysis.packageManager = 'yarn';
            } else if (await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
                analysis.packageManager = 'pnpm';
            } else {
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

    private async detectFrameworks(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
        if (analysis.dependencies.length === 0) return;

        // ICP-focused framework detection
        const icpFrameworkMap: Record<string, string> = {
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
        const hasIcpDeps = analysis.dependencies.some(dep => 
            dep.includes('@dfinity') || dep.includes('agent-js') || dep.includes('ic-')
        );
        
        if (hasIcpDeps && !analysis.framework) {
            analysis.framework = 'icp-integration';
        }
    }

    private async suggestCommands(analysis: ProjectAnalysis): Promise<void> {
        const { detectedTypes, framework } = analysis;

        // ICP-focused command suggestions
        if (detectedTypes.includes('icp') || detectedTypes.includes('motoko') || detectedTypes.includes('rust-canister')) {
            analysis.suggestedCommands = {
                build: 'dfx build',
                test: 'dfx test',
                dev: 'dfx start --background && dfx deploy',
                deploy: 'dfx deploy --network ic'
            };
        } else if (detectedTypes.includes('azle')) {
            analysis.suggestedCommands = {
                build: 'dfx build',
                test: 'npm test',
                dev: 'dfx start --background && dfx deploy',
                deploy: 'dfx deploy --network ic'
            };
        } else if (framework?.includes('icp')) {
            // Frontend with ICP integration
            analysis.suggestedCommands = {
                build: 'npm run build && dfx build',
                test: 'npm test',
                dev: 'npm run dev',
                deploy: 'npm run build && dfx deploy --network ic'
            };
        } else {
            // Fallback for unrecognized ICP projects
            analysis.suggestedCommands = {
                build: 'dfx build',
                test: 'echo "Configure test command"',
                dev: 'dfx start --background',
                deploy: 'dfx deploy --network ic'
            };
        }
    }

    private async detectDeploymentTargets(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
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

    private async estimateComplexity(projectPath: string, analysis: ProjectAnalysis): Promise<void> {
        let complexityScore = 0;

        // File count
        const files = await glob('**/*', { cwd: projectPath, ignore: ['node_modules/**', '.git/**'] });
        if (files.length > 100) complexityScore += 2;
        else if (files.length > 50) complexityScore += 1;

        // Dependencies
        if (analysis.dependencies.length > 50) complexityScore += 2;
        else if (analysis.dependencies.length > 20) complexityScore += 1;

        // Multiple languages/frameworks
        if (analysis.detectedTypes.length > 2) complexityScore += 1;

        // Monorepo
        if (analysis.isMonorepo) complexityScore += 2;

        // Docker
        if (analysis.hasDockerfile) complexityScore += 1;

        // Tests
        if (analysis.hasTests) complexityScore += 1;

        if (complexityScore >= 5) {
            analysis.estimatedComplexity = 'complex';
        } else if (complexityScore >= 2) {
            analysis.estimatedComplexity = 'medium';
        } else {
            analysis.estimatedComplexity = 'simple';
        }
    }
}
