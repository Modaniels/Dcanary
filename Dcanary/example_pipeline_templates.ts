// Example pipeline template for DCanary Phase 1 implementation

import { PipelineTemplate } from './src/verification_canister';

/**
 * Example TypeScript Web Application Pipeline Template
 */
export const typescriptWebAppPipeline: PipelineTemplate = {
    template_id: "typescript-webapp-v1",
    name: "TypeScript Web Application CI/CD Pipeline",
    description: "Complete CI/CD pipeline for TypeScript web applications with testing, security scanning, and deployment",
    parameters: new Map([
        ["NODE_VERSION", {
            name: "NODE_VERSION",
            param_type: "choice",
            default_value: "20",
            description: "Node.js version to use for builds",
            required: true
        }],
        ["DEPLOY_ENVIRONMENT", {
            name: "DEPLOY_ENVIRONMENT",
            param_type: "choice",
            default_value: "staging",
            description: "Target deployment environment",
            required: true
        }],
        ["RUN_E2E_TESTS", {
            name: "RUN_E2E_TESTS",
            param_type: "boolean",
            default_value: "true",
            description: "Run end-to-end tests",
            required: false
        }],
        ["SKIP_SECURITY_SCAN", {
            name: "SKIP_SECURITY_SCAN",
            param_type: "boolean",
            default_value: "false",
            description: "Skip security scanning",
            required: false
        }]
    ]),
    stages: [
        {
            name: "checkout",
            steps: [
                {
                    step_type: "checkout",
                    configuration: new Map([
                        ["clean", "true"],
                        ["depth", "1"]
                    ]),
                    timeout_seconds: 300n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 10n,
            retry_count: 2,
            post_actions: []
        },
        {
            name: "install-dependencies",
            steps: [
                {
                    step_type: "build",
                    configuration: new Map([
                        ["command", "npm ci"],
                        ["cache", "true"]
                    ]),
                    timeout_seconds: 600n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 15n,
            retry_count: 1,
            post_actions: []
        },
        {
            name: "build",
            steps: [
                {
                    step_type: "build",
                    configuration: new Map([
                        ["command", "npm run build"],
                        ["environment", "production"]
                    ]),
                    timeout_seconds: 900n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 20n,
            retry_count: 1,
            post_actions: ["Archive build artifacts"]
        },
        {
            name: "unit-tests",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "npm run test:unit"],
                        ["coverage", "true"],
                        ["coverage_threshold", "80"]
                    ]),
                    timeout_seconds: 600n
                }
            ],
            parallel_group: "testing",
            when_condition: null,
            timeout_minutes: 15n,
            retry_count: 2,
            post_actions: ["Archive test results"]
        },
        {
            name: "lint",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "npm run lint"],
                        ["fix", "false"]
                    ]),
                    timeout_seconds: 300n
                }
            ],
            parallel_group: "testing",
            when_condition: null,
            timeout_minutes: 10n,
            retry_count: 1,
            post_actions: []
        },
        {
            name: "security-scan",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "npm audit"],
                        ["fix", "false"],
                        ["severity", "high"]
                    ]),
                    timeout_seconds: 300n
                }
            ],
            parallel_group: "security",
            when_condition: "skip_security_scan:false",
            timeout_minutes: 10n,
            retry_count: 1,
            post_actions: ["Archive security report"]
        },
        {
            name: "integration-tests",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "npm run test:integration"],
                        ["environment", "test"]
                    ]),
                    timeout_seconds: 1200n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 25n,
            retry_count: 2,
            post_actions: ["Archive integration test results"]
        },
        {
            name: "e2e-tests",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "npm run test:e2e"],
                        ["browser", "chromium"],
                        ["headless", "true"]
                    ]),
                    timeout_seconds: 1800n
                }
            ],
            parallel_group: null,
            when_condition: "run_e2e_tests:true",
            timeout_minutes: 30n,
            retry_count: 1,
            post_actions: ["Archive e2e test results", "Archive screenshots"]
        },
        {
            name: "deploy-staging",
            steps: [
                {
                    step_type: "deploy",
                    configuration: new Map([
                        ["target", "staging"],
                        ["strategy", "blue-green"],
                        ["health_check", "/health"]
                    ]),
                    timeout_seconds: 900n
                }
            ],
            parallel_group: null,
            when_condition: "branch:develop",
            timeout_minutes: 20n,
            retry_count: 1,
            post_actions: ["Notify deployment status"]
        },
        {
            name: "deploy-production",
            steps: [
                {
                    step_type: "deploy",
                    configuration: new Map([
                        ["target", "production"],
                        ["strategy", "canary"],
                        ["canary_percentage", "10"]
                    ]),
                    timeout_seconds: 1800n
                }
            ],
            parallel_group: null,
            when_condition: "branch:main",
            timeout_minutes: 35n,
            retry_count: 0,
            post_actions: ["Notify production deployment", "Update monitoring"]
        }
    ],
    default_values: new Map([
        ["NODE_VERSION", "20"],
        ["DEPLOY_ENVIRONMENT", "staging"],
        ["RUN_E2E_TESTS", "true"],
        ["SKIP_SECURITY_SCAN", "false"]
    ]),
    required_capabilities: [
        "linux",
        "node",
        "npm",
        "docker",
        "chromium",
        "security-scanner"
    ]
};

/**
 * Example Rust Application Pipeline Template
 */
export const rustAppPipeline: PipelineTemplate = {
    template_id: "rust-app-v1",
    name: "Rust Application CI/CD Pipeline",
    description: "Complete CI/CD pipeline for Rust applications with testing, security scanning, and deployment",
    parameters: new Map([
        ["RUST_VERSION", {
            name: "RUST_VERSION",
            param_type: "choice",
            default_value: "stable",
            description: "Rust version to use for builds",
            required: true
        }],
        ["TARGET_ARCH", {
            name: "TARGET_ARCH",
            param_type: "choice",
            default_value: "x86_64-unknown-linux-gnu",
            description: "Target architecture for build",
            required: true
        }],
        ["ENABLE_OPTIMIZATIONS", {
            name: "ENABLE_OPTIMIZATIONS",
            param_type: "boolean",
            default_value: "true",
            description: "Enable release optimizations",
            required: false
        }]
    ]),
    stages: [
        {
            name: "checkout",
            steps: [
                {
                    step_type: "checkout",
                    configuration: new Map([
                        ["clean", "true"],
                        ["depth", "1"]
                    ]),
                    timeout_seconds: 300n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 10n,
            retry_count: 2,
            post_actions: []
        },
        {
            name: "setup-rust",
            steps: [
                {
                    step_type: "build",
                    configuration: new Map([
                        ["command", "rustup update"],
                        ["toolchain", "{{RUST_VERSION}}"]
                    ]),
                    timeout_seconds: 300n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 10n,
            retry_count: 1,
            post_actions: []
        },
        {
            name: "check",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "cargo check"],
                        ["all_features", "true"]
                    ]),
                    timeout_seconds: 600n
                }
            ],
            parallel_group: "validation",
            when_condition: null,
            timeout_minutes: 15n,
            retry_count: 1,
            post_actions: []
        },
        {
            name: "format-check",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "cargo fmt -- --check"],
                        ["fail_on_diff", "true"]
                    ]),
                    timeout_seconds: 300n
                }
            ],
            parallel_group: "validation",
            when_condition: null,
            timeout_minutes: 10n,
            retry_count: 1,
            post_actions: []
        },
        {
            name: "clippy",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "cargo clippy -- -D warnings"],
                        ["all_features", "true"]
                    ]),
                    timeout_seconds: 600n
                }
            ],
            parallel_group: "validation",
            when_condition: null,
            timeout_minutes: 15n,
            retry_count: 1,
            post_actions: []
        },
        {
            name: "test",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "cargo test"],
                        ["all_features", "true"]
                    ]),
                    timeout_seconds: 1200n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 20n,
            retry_count: 2,
            post_actions: ["Archive test results"]
        },
        {
            name: "build",
            steps: [
                {
                    step_type: "build",
                    configuration: new Map([
                        ["command", "cargo build --release"],
                        ["target", "{{TARGET_ARCH}}"]
                    ]),
                    timeout_seconds: 1800n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 30n,
            retry_count: 1,
            post_actions: ["Archive binary artifacts"]
        },
        {
            name: "security-audit",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "cargo audit"],
                        ["deny_warnings", "true"]
                    ]),
                    timeout_seconds: 300n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 10n,
            retry_count: 1,
            post_actions: ["Archive security report"]
        }
    ],
    default_values: new Map([
        ["RUST_VERSION", "stable"],
        ["TARGET_ARCH", "x86_64-unknown-linux-gnu"],
        ["ENABLE_OPTIMIZATIONS", "true"]
    ]),
    required_capabilities: [
        "linux",
        "rust",
        "cargo",
        "git"
    ]
};

/**
 * Example Simple Build Pipeline Template
 */
export const simpleBuildPipeline: PipelineTemplate = {
    template_id: "simple-build-v1",
    name: "Simple Build Pipeline",
    description: "Basic pipeline for simple projects with build and test stages",
    parameters: new Map([
        ["BUILD_COMMAND", {
            name: "BUILD_COMMAND",
            param_type: "string",
            default_value: "make",
            description: "Command to build the project",
            required: true
        }],
        ["TEST_COMMAND", {
            name: "TEST_COMMAND",
            param_type: "string",
            default_value: "make test",
            description: "Command to run tests",
            required: false
        }]
    ]),
    stages: [
        {
            name: "checkout",
            steps: [
                {
                    step_type: "checkout",
                    configuration: new Map([
                        ["clean", "true"]
                    ]),
                    timeout_seconds: 300n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 10n,
            retry_count: 2,
            post_actions: []
        },
        {
            name: "build",
            steps: [
                {
                    step_type: "build",
                    configuration: new Map([
                        ["command", "{{BUILD_COMMAND}}"]
                    ]),
                    timeout_seconds: 1200n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 20n,
            retry_count: 1,
            post_actions: ["Archive build artifacts"]
        },
        {
            name: "test",
            steps: [
                {
                    step_type: "test",
                    configuration: new Map([
                        ["command", "{{TEST_COMMAND}}"]
                    ]),
                    timeout_seconds: 600n
                }
            ],
            parallel_group: null,
            when_condition: null,
            timeout_minutes: 15n,
            retry_count: 2,
            post_actions: ["Archive test results"]
        }
    ],
    default_values: new Map([
        ["BUILD_COMMAND", "make"],
        ["TEST_COMMAND", "make test"]
    ]),
    required_capabilities: [
        "linux",
        "make",
        "gcc"
    ]
};

// Export all templates
export const defaultPipelineTemplates = {
    "typescript-webapp-v1": typescriptWebAppPipeline,
    "rust-app-v1": rustAppPipeline,
    "simple-build-v1": simpleBuildPipeline
};
