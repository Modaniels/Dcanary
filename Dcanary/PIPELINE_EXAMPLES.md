# Pipeline Configuration Examples

## 1. Multi-Stage Pipeline Definition

Here's how you can define complex pipelines in your DCanary system, inspired by Jenkins pipeline syntax:

```typescript
// Example pipeline configuration for a TypeScript project
const typescript_pipeline: PipelineTemplate = {
    template_id: "typescript-webapp",
    name: "TypeScript Web Application Pipeline",
    description: "Full CI/CD pipeline for TypeScript web applications",
    parameters: new Map([
        ["NODE_VERSION", { name: "NODE_VERSION", param_type: { Choice: ["18", "20", "22"] }, default_value: "20", description: "Node.js version", required: true }],
        ["DEPLOY_ENV", { name: "DEPLOY_ENV", param_type: { Choice: ["staging", "production"] }, default_value: "staging", description: "Deployment environment", required: true }],
        ["RUN_E2E_TESTS", { name: "RUN_E2E_TESTS", param_type: { Boolean: null }, default_value: "true", description: "Run end-to-end tests", required: false }]
    ]),
    stages: [
        {
            name: "checkout",
            steps: [
                {
                    step_type: { Checkout: { repository: "{{PROJECT_REPO}}", branch: "{{BUILD_BRANCH}}" } },
                    configuration: new Map([["depth", "1"], ["clean", "true"]]),
                    timeout_seconds: 300
                }
            ],
            parallel_group: null,
            when_condition: { Always: null },
            timeout_minutes: 10,
            retry_count: 2,
            post_actions: []
        },
        {
            name: "build",
            steps: [
                {
                    step_type: { Build: { 
                        command: "npm install && npm run build",
                        environment: new Map([["NODE_VERSION", "{{NODE_VERSION}}"]])
                    }},
                    configuration: new Map([["cache_dependencies", "true"]]),
                    timeout_seconds: 1200
                }
            ],
            parallel_group: null,
            when_condition: { Always: null },
            timeout_minutes: 20,
            retry_count: 1,
            post_actions: [
                { Archive: ["dist/**/*", "package-lock.json"] }
            ]
        },
        {
            name: "test",
            steps: [
                {
                    step_type: { Test: {
                        command: "npm run test:unit",
                        test_type: "unit",
                        coverage_required: true
                    }},
                    configuration: new Map([["coverage_threshold", "80"]]),
                    timeout_seconds: 600
                }
            ],
            parallel_group: "testing",
            when_condition: { Always: null },
            timeout_minutes: 15,
            retry_count: 2,
            post_actions: []
        },
        {
            name: "lint",
            steps: [
                {
                    step_type: { Build: { 
                        command: "npm run lint",
                        environment: new Map()
                    }},
                    configuration: new Map([["fail_on_warning", "false"]]),
                    timeout_seconds: 300
                }
            ],
            parallel_group: "testing",
            when_condition: { Always: null },
            timeout_minutes: 10,
            retry_count: 1,
            post_actions: []
        },
        {
            name: "security-scan",
            steps: [
                {
                    step_type: { SecurityScan: {
                        scan_type: "dependency",
                        severity_threshold: "high",
                        fail_on_violation: true
                    }},
                    configuration: new Map([["update_database", "true"]]),
                    timeout_seconds: 600
                }
            ],
            parallel_group: "security",
            when_condition: { Always: null },
            timeout_minutes: 15,
            retry_count: 1,
            post_actions: []
        },
        {
            name: "e2e-tests",
            steps: [
                {
                    step_type: { Test: {
                        command: "npm run test:e2e",
                        test_type: "e2e",
                        coverage_required: false
                    }},
                    configuration: new Map([["headless", "true"], ["browser", "chromium"]]),
                    timeout_seconds: 1800
                }
            ],
            parallel_group: null,
            when_condition: { Boolean: "{{RUN_E2E_TESTS}}" },
            timeout_minutes: 30,
            retry_count: 2,
            post_actions: [
                { Archive: ["test-results/**/*", "screenshots/**/*"] }
            ]
        },
        {
            name: "deploy-staging",
            steps: [
                {
                    step_type: { Deploy: {
                        target: "staging",
                        strategy: "blue-green",
                        rollback_on_failure: true
                    }},
                    configuration: new Map([["health_check_url", "/health"], ["timeout", "300"]]),
                    timeout_seconds: 600
                }
            ],
            parallel_group: null,
            when_condition: { Branch: "develop" },
            timeout_minutes: 15,
            retry_count: 1,
            post_actions: [
                { Notify: { type: "slack", channel: "#deployments", message: "Staging deployment completed" } }
            ]
        },
        {
            name: "deploy-production",
            steps: [
                {
                    step_type: { Deploy: {
                        target: "production",
                        strategy: "canary",
                        rollback_on_failure: true
                    }},
                    configuration: new Map([["canary_percentage", "10"], ["monitoring_duration", "300"]]),
                    timeout_seconds: 1200
                }
            ],
            parallel_group: null,
            when_condition: { ManualApproval: null },
            timeout_minutes: 25,
            retry_count: 0,
            post_actions: [
                { Notify: { type: "slack", channel: "#deployments", message: "Production deployment completed" } },
                { Notify: { type: "email", recipients: ["ops@company.com"], subject: "Production Deployment Success" } }
            ]
        }
    ],
    default_values: new Map([
        ["NODE_VERSION", "20"],
        ["DEPLOY_ENV", "staging"],
        ["RUN_E2E_TESTS", "true"]
    ]),
    required_capabilities: ["node", "npm", "docker", "security-scanner"]
};
```

## 2. Agent Pool Configuration

```typescript
// Example agent pool configurations
const agent_pools: AgentPool[] = [
    {
        pool_id: "standard-builds",
        min_agents: 2,
        max_agents: 10,
        current_agents: [],
        pending_requests: 0,
        labels: ["linux", "node", "docker"],
        capabilities: {
            labels: ["linux", "node", "docker"],
            max_concurrent_builds: 3,
            available_resources: {
                cpu_cores: 4,
                memory_mb: 8192,
                disk_space_gb: 100,
                network_bandwidth: 1000
            },
            supported_languages: ["typescript", "javascript", "python"],
            installed_tools: ["node", "npm", "docker", "git"]
        }
    },
    {
        pool_id: "high-performance",
        min_agents: 1,
        max_agents: 5,
        current_agents: [],
        pending_requests: 0,
        labels: ["linux", "high-cpu", "large-memory"],
        capabilities: {
            labels: ["linux", "high-cpu", "large-memory"],
            max_concurrent_builds: 2,
            available_resources: {
                cpu_cores: 16,
                memory_mb: 32768,
                disk_space_gb: 500,
                network_bandwidth: 10000
            },
            supported_languages: ["rust", "go", "c++"],
            installed_tools: ["rust", "go", "gcc", "make", "cmake"]
        }
    }
];
```

## 3. Role-Based Access Control

```typescript
// Example RBAC configuration
const roles: Role[] = [
    {
        name: "developer",
        permissions: [
            { ViewBuilds: null },
            { TriggerBuilds: null }
        ],
        project_scope: ["frontend", "backend"],
        resource_limits: {
            max_concurrent_builds: 3,
            max_build_duration_minutes: 60,
            max_artifact_size_mb: 1024,
            allowed_agents: [] // Empty means all agents
        }
    },
    {
        name: "devops",
        permissions: [
            { ViewBuilds: null },
            { TriggerBuilds: null },
            { ConfigurePipelines: null },
            { ViewMetrics: null }
        ],
        project_scope: [], // Empty means all projects
        resource_limits: {
            max_concurrent_builds: 10,
            max_build_duration_minutes: 120,
            max_artifact_size_mb: 5120,
            allowed_agents: []
        }
    },
    {
        name: "admin",
        permissions: [
            { ViewBuilds: null },
            { TriggerBuilds: null },
            { ConfigurePipelines: null },
            { ManageUsers: null },
            { ViewMetrics: null },
            { AdministerSystem: null }
        ],
        project_scope: [],
        resource_limits: {
            max_concurrent_builds: -1, // Unlimited
            max_build_duration_minutes: -1, // Unlimited
            max_artifact_size_mb: -1, // Unlimited
            allowed_agents: []
        }
    }
];
```

## 4. Event-Driven Notifications

```typescript
// Example event handling configuration
const event_handlers: Map<EventType, EventHandler[]> = new Map([
    ["BuildStarted", [
        {
            handler_type: "slack",
            configuration: new Map([
                ["webhook_url", "https://hooks.slack.com/services/..."],
                ["channel", "#builds"],
                ["template", "Build started for {{project_id}} ({{version}})"]
            ])
        }
    ]],
    ["BuildCompleted", [
        {
            handler_type: "slack",
            configuration: new Map([
                ["webhook_url", "https://hooks.slack.com/services/..."],
                ["channel", "#builds"],
                ["template", "Build {{status}} for {{project_id}} ({{version}}) - Duration: {{duration}}"]
            ])
        },
        {
            handler_type: "email",
            configuration: new Map([
                ["smtp_server", "smtp.company.com"],
                ["recipients", "team@company.com"],
                ["subject", "Build {{status}}: {{project_id}}"]
            ])
        }
    ]],
    ["SecurityAlert", [
        {
            handler_type: "slack",
            configuration: new Map([
                ["webhook_url", "https://hooks.slack.com/services/..."],
                ["channel", "#security"],
                ["template", "🚨 Security alert in {{project_id}}: {{alert_type}}"]
            ])
        },
        {
            handler_type: "pagerduty",
            configuration: new Map([
                ["integration_key", "xxx"],
                ["severity", "high"]
            ])
        }
    ]]
]);
```

## 5. Pipeline Execution Flow

```typescript
// Example of how pipeline execution works
export const execute_pipeline_template = update([
    IDL.Text, // template_id
    IDL.Text, // project_id
    IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)) // parameters
], VerificationResultWrapper, async (template_id, project_id, parameters) => {
    
    // 1. Load template
    const template = pipeline_templates.get(template_id);
    if (!template) {
        return { Err: { NotFound: `Template ${template_id} not found` } };
    }
    
    // 2. Validate parameters
    const param_map = new Map(parameters);
    for (const [param_name, param_def] of template.parameters) {
        if (param_def.required && !param_map.has(param_name)) {
            return { Err: { InvalidInput: `Required parameter ${param_name} missing` } };
        }
    }
    
    // 3. Create pipeline instance
    const pipeline_instance: PipelineInstance = {
        instance_id: generate_uuid(),
        template_id,
        project_id,
        parameters: param_map,
        status: { Running: null },
        current_stage: 0,
        started_at: time(),
        stages: template.stages,
        results: new Map()
    };
    
    // 4. Execute pipeline
    return await execute_pipeline_stages(pipeline_instance);
});

async function execute_pipeline_stages(pipeline: PipelineInstance): Promise<VerificationResultWrapper> {
    const results: Map<string, StageResult> = new Map();
    
    // Group stages by parallel groups
    const stage_groups = group_stages_by_parallel(pipeline.stages);
    
    for (const stage_group of stage_groups) {
        if (stage_group.parallel) {
            // Execute stages in parallel
            const parallel_results = await Promise.all(
                stage_group.stages.map(stage => execute_stage(stage, pipeline))
            );
            
            // Check if any stage failed
            const failed_stage = parallel_results.find(result => result.status.Failed);
            if (failed_stage) {
                return { Err: { ExecutorFailure: `Stage ${failed_stage.stage_name} failed` } };
            }
            
            // Store results
            parallel_results.forEach(result => results.set(result.stage_name, result));
        } else {
            // Execute stages sequentially
            for (const stage of stage_group.stages) {
                const result = await execute_stage(stage, pipeline);
                results.set(stage.name, result);
                
                if (result.status.Failed) {
                    return { Err: { ExecutorFailure: `Stage ${stage.name} failed` } };
                }
            }
        }
    }
    
    return { Ok: { 
        project_id: pipeline.project_id,
        version: "1.0.0", // Extract from pipeline
        status: { Verified: null },
        consensus_hash: "calculated_hash",
        executor_results: [],
        verified_at: time(),
        requester: msgCaller()
    }};
}
```

This architecture provides Jenkins-like flexibility while maintaining the decentralized nature of your ICP-based system!
