import { Command } from 'commander';
import * as fs from 'fs-extra';
import { Colors, printSuccess, printError, Spinner } from '../utils/ui';
import { logger } from '../utils/logger';
import { ProjectAnalyzer } from '../services/analyzers/project-analyzer';

export function createAnalyzeCommand(): Command {
    const command = new Command('analyze');

    command
        .description('Analyze your project and suggest optimal CI/CD configuration')
        .option('-f, --format <format>', 'Output format (json, yaml, table)', 'table')
        .option('-o, --output <file>', 'Save analysis to file')
        .option('--suggestions', 'Include optimization suggestions')
        .action(async (options) => {
            const spinner = new Spinner();
            
            try {
                spinner.start('Analyzing project structure...');
                
                const analyzer = new ProjectAnalyzer();
                const analysis = await analyzer.analyzeProject(process.cwd());
                
                spinner.succeed('Analysis complete');

                // Display results
                if (options.format === 'table') {
                    displayTableFormat(analysis);
                } else if (options.format === 'json') {
                    console.log(JSON.stringify(analysis, null, 2));
                } else if (options.format === 'yaml') {
                    const yaml = require('yaml');
                    console.log(yaml.stringify(analysis));
                }

                // Show suggestions if requested
                if (options.suggestions) {
                    showOptimizationSuggestions(analysis);
                }

                // Save to file if requested
                if (options.output) {
                    await fs.writeJson(options.output, analysis, { spaces: 2 });
                    console.log(Colors.gray(`Analysis saved to ${options.output}`));
                }

                // Check for Dcanary configuration
                if (await fs.pathExists('.dcanary.yml')) {
                    console.log();
                    console.log(Colors.green('✅ Dcanary configuration found'));
                    console.log(Colors.gray('Run ' + Colors.cyan('dcanary build') + ' to test your configuration'));
                } else {
                    console.log();
                    console.log(Colors.yellow('⚠️  No Dcanary configuration found'));
                    console.log(Colors.gray('Run ' + Colors.cyan('dcanary init') + ' to get started'));
                }

            } catch (error: any) {
                spinner.fail('Analysis failed');
                printError('Analysis Error', error.message);
                logger.error('Analyze command failed', { error: error.message, stack: error.stack });
                process.exit(1);
            }
        });

    return command;
}

function displayTableFormat(analysis: any) {
    console.log();
    console.log(Colors.bold('📊 Project Analysis Results'));
    console.log();

    // Project Type
    console.log(Colors.cyan('Project Types:'));
    if (analysis.detectedTypes.length > 0) {
        analysis.detectedTypes.forEach((type: string) => {
            console.log(`  ✅ ${type}`);
        });
    } else {
        console.log('  ❓ Unknown project type');
    }
    console.log();

    // Language & Framework
    console.log(Colors.cyan('Technology Stack:'));
    console.log(`  Language: ${analysis.language || 'Unknown'}`);
    if (analysis.framework) {
        console.log(`  Framework: ${analysis.framework}`);
    }
    if (analysis.packageManager) {
        console.log(`  Package Manager: ${analysis.packageManager}`);
    }
    console.log();

    // Build Commands
    console.log(Colors.cyan('Suggested Commands:'));
    Object.entries(analysis.suggestedCommands).forEach(([key, value]) => {
        if (value) {
            console.log(`  ${key}: ${Colors.gray(value as string)}`);
        }
    });
    console.log();

    // Project Features
    console.log(Colors.cyan('Project Features:'));
    console.log(`  Has Tests: ${analysis.hasTests ? '✅' : '❌'}`);
    console.log(`  Has Dockerfile: ${analysis.hasDockerfile ? '✅' : '❌'}`);
    console.log(`  Is Monorepo: ${analysis.isMonorepo ? '✅' : '❌'}`);
    console.log(`  Complexity: ${getComplexityEmoji(analysis.estimatedComplexity)} ${analysis.estimatedComplexity}`);
    console.log();

    // Deployment Targets
    if (analysis.deploymentTargets.length > 0) {
        console.log(Colors.cyan('Recommended Deployment Targets:'));
        analysis.deploymentTargets.forEach((target: string) => {
            console.log(`  • ${target}`);
        });
        console.log();
    }

    // Dependencies (if not too many)
    if (analysis.dependencies.length > 0 && analysis.dependencies.length <= 10) {
        console.log(Colors.cyan('Key Dependencies:'));
        analysis.dependencies.slice(0, 10).forEach((dep: string) => {
            console.log(`  • ${dep}`);
        });
        if (analysis.dependencies.length > 10) {
            console.log(`  ... and ${analysis.dependencies.length - 10} more`);
        }
        console.log();
    }
}

function showOptimizationSuggestions(analysis: any) {
    console.log(Colors.bold('💡 Optimization Suggestions'));
    console.log();

    const suggestions = [];

    // Test suggestions
    if (!analysis.hasTests) {
        suggestions.push('Add automated tests to improve build reliability');
    }

    // Docker suggestions
    if (!analysis.hasDockerfile && analysis.estimatedComplexity !== 'simple') {
        suggestions.push('Consider adding a Dockerfile for consistent builds');
    }

    // Performance suggestions
    if (analysis.dependencies.length > 50) {
        suggestions.push('Review dependencies - consider removing unused packages');
    }

    // Security suggestions
    if (analysis.language === 'javascript' && !analysis.dependencies.includes('helmet')) {
        suggestions.push('Add security middleware for production deployments');
    }

    // Deployment suggestions
    if (analysis.deploymentTargets.includes('vercel') && analysis.framework !== 'nextjs') {
        suggestions.push('Consider Next.js for better Vercel integration');
    }

    if (suggestions.length === 0) {
        console.log(Colors.green('🎉 Your project looks well-configured!'));
    } else {
        suggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. ${suggestion}`);
        });
    }
    console.log();
}

function getComplexityEmoji(complexity: string): string {
    switch (complexity) {
        case 'simple': return '🟢';
        case 'medium': return '🟡';
        case 'complex': return '🔴';
        default: return '❓';
    }
}
