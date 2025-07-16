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
exports.createAnalyzeCommand = createAnalyzeCommand;
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const ui_1 = require("../utils/ui");
const logger_1 = require("../utils/logger");
const project_analyzer_1 = require("../services/analyzers/project-analyzer");
function createAnalyzeCommand() {
    const command = new commander_1.Command('analyze');
    command
        .description('Analyze your project and suggest optimal CI/CD configuration')
        .option('-f, --format <format>', 'Output format (json, yaml, table)', 'table')
        .option('-o, --output <file>', 'Save analysis to file')
        .option('--suggestions', 'Include optimization suggestions')
        .action(async (options) => {
        const spinner = new ui_1.Spinner();
        try {
            spinner.start('Analyzing project structure...');
            const analyzer = new project_analyzer_1.ProjectAnalyzer();
            const analysis = await analyzer.analyzeProject(process.cwd());
            spinner.succeed('Analysis complete');
            // Display results
            if (options.format === 'table') {
                displayTableFormat(analysis);
            }
            else if (options.format === 'json') {
                console.log(JSON.stringify(analysis, null, 2));
            }
            else if (options.format === 'yaml') {
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
                console.log(ui_1.Colors.gray(`Analysis saved to ${options.output}`));
            }
            // Check for Dcanary configuration
            if (await fs.pathExists('.dcanary.yml')) {
                console.log();
                console.log(ui_1.Colors.green('✅ Dcanary configuration found'));
                console.log(ui_1.Colors.gray('Run ' + ui_1.Colors.cyan('dcanary build') + ' to test your configuration'));
            }
            else {
                console.log();
                console.log(ui_1.Colors.yellow('⚠️  No Dcanary configuration found'));
                console.log(ui_1.Colors.gray('Run ' + ui_1.Colors.cyan('dcanary init') + ' to get started'));
            }
        }
        catch (error) {
            spinner.fail('Analysis failed');
            (0, ui_1.printError)('Analysis Error', error.message);
            logger_1.logger.error('Analyze command failed', { error: error.message, stack: error.stack });
            process.exit(1);
        }
    });
    return command;
}
function displayTableFormat(analysis) {
    console.log();
    console.log(ui_1.Colors.bold('📊 Project Analysis Results'));
    console.log();
    // Project Type
    console.log(ui_1.Colors.cyan('Project Types:'));
    if (analysis.detectedTypes.length > 0) {
        analysis.detectedTypes.forEach((type) => {
            console.log(`  ✅ ${type}`);
        });
    }
    else {
        console.log('  ❓ Unknown project type');
    }
    console.log();
    // Language & Framework
    console.log(ui_1.Colors.cyan('Technology Stack:'));
    console.log(`  Language: ${analysis.language || 'Unknown'}`);
    if (analysis.framework) {
        console.log(`  Framework: ${analysis.framework}`);
    }
    if (analysis.packageManager) {
        console.log(`  Package Manager: ${analysis.packageManager}`);
    }
    console.log();
    // Build Commands
    console.log(ui_1.Colors.cyan('Suggested Commands:'));
    Object.entries(analysis.suggestedCommands).forEach(([key, value]) => {
        if (value) {
            console.log(`  ${key}: ${ui_1.Colors.gray(value)}`);
        }
    });
    console.log();
    // Project Features
    console.log(ui_1.Colors.cyan('Project Features:'));
    console.log(`  Has Tests: ${analysis.hasTests ? '✅' : '❌'}`);
    console.log(`  Has Dockerfile: ${analysis.hasDockerfile ? '✅' : '❌'}`);
    console.log(`  Is Monorepo: ${analysis.isMonorepo ? '✅' : '❌'}`);
    console.log(`  Complexity: ${getComplexityEmoji(analysis.estimatedComplexity)} ${analysis.estimatedComplexity}`);
    console.log();
    // Deployment Targets
    if (analysis.deploymentTargets.length > 0) {
        console.log(ui_1.Colors.cyan('Recommended Deployment Targets:'));
        analysis.deploymentTargets.forEach((target) => {
            console.log(`  • ${target}`);
        });
        console.log();
    }
    // Dependencies (if not too many)
    if (analysis.dependencies.length > 0 && analysis.dependencies.length <= 10) {
        console.log(ui_1.Colors.cyan('Key Dependencies:'));
        analysis.dependencies.slice(0, 10).forEach((dep) => {
            console.log(`  • ${dep}`);
        });
        if (analysis.dependencies.length > 10) {
            console.log(`  ... and ${analysis.dependencies.length - 10} more`);
        }
        console.log();
    }
}
function showOptimizationSuggestions(analysis) {
    console.log(ui_1.Colors.bold('💡 Optimization Suggestions'));
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
        console.log(ui_1.Colors.green('🎉 Your project looks well-configured!'));
    }
    else {
        suggestions.forEach((suggestion, index) => {
            console.log(`${index + 1}. ${suggestion}`);
        });
    }
    console.log();
}
function getComplexityEmoji(complexity) {
    switch (complexity) {
        case 'simple': return '🟢';
        case 'medium': return '🟡';
        case 'complex': return '🔴';
        default: return '❓';
    }
}
//# sourceMappingURL=analyze.js.map