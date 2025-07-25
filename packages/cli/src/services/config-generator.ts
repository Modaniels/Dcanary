import { stringify } from 'yaml';
import { ProjectAnalysis } from './analyzers/project-analyzer';

export interface DcanaryConfig {
    yaml: string;
    json: any;
}

export class ConfigGenerator {
    async generate(projectInfo: any): Promise<DcanaryConfig> {
        const config = {
            version: '2.0',
            project: {
                name: projectInfo.name,
                type: projectInfo.projectType,
                language: projectInfo.language || 'javascript',
                framework: projectInfo.framework
            },
            repository: projectInfo.repository ? {
                url: projectInfo.repository,
                branch: 'main',
                autoTrigger: true
            } : null,
            build: {
                strategy: projectInfo.buildStrategy || 'consensus',
                commands: {
                    build: projectInfo.buildCommand,
                    test: projectInfo.testCommand,
                    lint: this.generateLintCommand(projectInfo.projectType),
                    validate: this.generateValidateCommand(projectInfo.projectType)
                },
                environment: {
                    node: '>=16.0.0',
                    variables: {}
                },
                artifacts: {
                    paths: this.generateArtifactPaths(projectInfo.projectType),
                    retention: '30d'
                }
            },
            deploy: {
                targets: this.generateDeployTargets(projectInfo.deployTargets),
                environments: {
                    staging: {
                        auto: true,
                        branch: 'develop'
                    },
                    production: {
                        auto: false,
                        branch: 'main',
                        approval: true
                    }
                }
            },
            network: {
                consensus: {
                    required: projectInfo.buildStrategy === 'consensus' ? 3 : 1,
                    timeout: '10m'
                },
                nodes: {
                    min: 2,
                    max: 5,
                    regions: ['us-east', 'eu-west', 'asia-pacific']
                }
            },
            security: {
                secretScan: true,
                dependencyAudit: true,
                codeAnalysis: projectInfo.estimatedComplexity !== 'simple'
            },
            notifications: {
                slack: null,
                email: null,
                webhook: null
            }
        };

        // Remove null values
        const cleanConfig = this.removeNullValues(config);

        return {
            yaml: stringify(cleanConfig, { indent: 2 }),
            json: cleanConfig
        };
    }

    private generateLintCommand(projectType: string): string {
        const commands: Record<string, string> = {
            'motoko': 'vessel verify',
            'rust-canister': 'cargo clippy',
            'azle': 'npm run lint',
            'react-icp': 'npm run lint',
            'vue-icp': 'npm run lint',
            'angular-icp': 'ng lint',
            'multi-canister': 'dfx build --check'
        };
        return commands[projectType] || 'echo "No lint command configured"';
    }

    private generateValidateCommand(projectType: string): string {
        const commands: Record<string, string> = {
            'motoko': 'moc --check $(vessel sources)',
            'rust-canister': 'cargo check',
            'azle': 'npm run type-check',
            'react-icp': 'npm run type-check',
            'vue-icp': 'npm run type-check',
            'angular-icp': 'ng build --dry-run',
            'multi-canister': 'dfx build --check'
        };
        return commands[projectType] || 'dfx build --check';
    }

    private generateArtifactPaths(projectType: string): string[] {
        const paths: Record<string, string[]> = {
            'motoko': ['.dfx/local/canisters/', '.dfx/ic/canisters/'],
            'rust-canister': ['.dfx/local/canisters/', '.dfx/ic/canisters/', 'target/wasm32-unknown-unknown/release/'],
            'azle': ['.dfx/local/canisters/', '.dfx/ic/canisters/', 'dist/'],
            'react-icp': ['build/', '.dfx/local/canisters/', '.dfx/ic/canisters/'],
            'vue-icp': ['dist/', '.dfx/local/canisters/', '.dfx/ic/canisters/'],
            'angular-icp': ['dist/', '.dfx/local/canisters/', '.dfx/ic/canisters/'],
            'multi-canister': ['.dfx/local/', '.dfx/ic/']
        };
        return paths[projectType] || ['.dfx/local/canisters/', '.dfx/ic/canisters/'];
    }

    private generateDeployTargets(selectedTargets: string[]): Record<string, any> {
        const targetConfigs: Record<string, any> = {};

        for (const target of selectedTargets) {
            switch (target) {
                case 'ic-mainnet':
                    targetConfigs['ic-mainnet'] = {
                        type: 'icp',
                        network: 'ic',
                        canister: 'all',
                        upgrade: 'auto'
                    };
                    break;
                case 'local':
                    targetConfigs['local'] = {
                        type: 'icp',
                        network: 'local',
                        canister: 'all'
                    };
                    break;
                case 'asset-canister':
                    targetConfigs['asset-canister'] = {
                        type: 'icp-assets',
                        network: 'ic',
                        buildCommand: '${build.commands.build}',
                        sourceDir: 'dist'
                    };
                    break;
                case 'ipfs':
                    targetConfigs['ipfs'] = {
                        type: 'ipfs',
                        pin: true,
                        gateway: 'https://ipfs.io/ipfs/',
                        buildDir: 'dist'
                    };
                    break;
                case 'candid-ui':
                    targetConfigs['candid-ui'] = {
                        type: 'candid-ui',
                        generate: true,
                        output: 'candid/'
                    };
                    break;
                default:
                    targetConfigs[target] = {
                        type: 'custom',
                        command: 'echo "Configure custom ICP deployment"'
                    };
            }
        }

        return targetConfigs;
    }

    private removeNullValues(obj: any): any {
        if (obj === null || obj === undefined) {
            return undefined;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeNullValues(item)).filter(item => item !== undefined);
        }
        
        if (typeof obj === 'object') {
            const cleaned: Record<string, any> = {};
            for (const [key, value] of Object.entries(obj)) {
                const cleanedValue = this.removeNullValues(value);
                if (cleanedValue !== undefined) {
                    cleaned[key] = cleanedValue;
                }
            }
            return cleaned;
        }
        
        return obj;
    }
}
