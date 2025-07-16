export interface DcanaryConfig {
    yaml: string;
    json: any;
}
export declare class ConfigGenerator {
    generate(projectInfo: any): Promise<DcanaryConfig>;
    private generateLintCommand;
    private generateValidateCommand;
    private generateArtifactPaths;
    private generateDeployTargets;
    private removeNullValues;
}
//# sourceMappingURL=config-generator.d.ts.map