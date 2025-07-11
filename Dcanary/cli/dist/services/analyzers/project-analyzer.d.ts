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
export declare class ProjectAnalyzer {
    analyzeProject(projectPath: string): Promise<ProjectAnalysis>;
    private detectProjectType;
    private analyzeDfxJson;
    private analyzePackageFiles;
    private detectFrameworks;
    private suggestCommands;
    private detectDeploymentTargets;
    private estimateComplexity;
}
//# sourceMappingURL=project-analyzer.d.ts.map