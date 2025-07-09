import { IDL, Principal } from 'azle';

// ============================================================================
// WEBHOOK TYPES
// ============================================================================

/**
 * Supported SCM providers
 */
export const SCMProvider = IDL.Variant({
    GitHub: IDL.Null,
    GitLab: IDL.Null
});

export type SCMProvider = 
    | { GitHub: null }
    | { GitLab: null };

/**
 * Webhook event types
 */
export const WebhookEventType = IDL.Variant({
    Push: IDL.Null,
    PullRequest: IDL.Null,
    MergeRequest: IDL.Null,
    Tag: IDL.Null,
    Release: IDL.Null
});

export type WebhookEventType = 
    | { Push: null }
    | { PullRequest: null }
    | { MergeRequest: null }
    | { Tag: null }
    | { Release: null };

/**
 * Repository configuration
 */
export const RepositoryConfig = IDL.Record({
    id: IDL.Text,
    provider: SCMProvider,
    owner: IDL.Text,
    name: IDL.Text,
    webhook_secret: IDL.Text,
    project_id: IDL.Text,
    auto_build_on_push: IDL.Bool,
    auto_build_on_tag: IDL.Bool,
    build_branches: IDL.Vec(IDL.Text),
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
    created_by: IDL.Principal
});

export type RepositoryConfig = {
    id: string;
    provider: SCMProvider;
    owner: string;
    name: string;
    webhook_secret: string;
    project_id: string;
    auto_build_on_push: boolean;
    auto_build_on_tag: boolean;
    build_branches: string[];
    created_at: bigint;
    updated_at: bigint;
    created_by: Principal;
};

/**
 * Webhook payload from GitHub
 */
export const GitHubWebhookPayload = IDL.Record({
    event_type: IDL.Text,
    repository: IDL.Record({
        full_name: IDL.Text,
        default_branch: IDL.Text
    }),
    ref: IDL.Opt(IDL.Text),
    before: IDL.Opt(IDL.Text),
    after: IDL.Opt(IDL.Text),
    commits: IDL.Opt(IDL.Vec(IDL.Record({
        id: IDL.Text,
        message: IDL.Text,
        author: IDL.Record({
            name: IDL.Text,
            email: IDL.Text
        })
    }))),
    pull_request: IDL.Opt(IDL.Record({
        number: IDL.Nat32,
        title: IDL.Text,
        head: IDL.Record({
            ref: IDL.Text,
            sha: IDL.Text
        }),
        base: IDL.Record({
            ref: IDL.Text,
            sha: IDL.Text
        })
    })),
    release: IDL.Opt(IDL.Record({
        tag_name: IDL.Text,
        name: IDL.Text,
        prerelease: IDL.Bool
    }))
});

export type GitHubWebhookPayload = {
    event_type: string;
    repository: {
        full_name: string;
        default_branch: string;
    };
    ref: string | null;
    before: string | null;
    after: string | null;
    commits: Array<{
        id: string;
        message: string;
        author: {
            name: string;
            email: string;
        };
    }> | null;
    pull_request: {
        number: number;
        title: string;
        head: {
            ref: string;
            sha: string;
        };
        base: {
            ref: string;
            sha: string;
        };
    } | null;
    release: {
        tag_name: string;
        name: string;
        prerelease: boolean;
    } | null;
};

/**
 * Webhook payload from GitLab
 */
export const GitLabWebhookPayload = IDL.Record({
    event_type: IDL.Text,
    project: IDL.Record({
        path_with_namespace: IDL.Text,
        default_branch: IDL.Text
    }),
    ref: IDL.Opt(IDL.Text),
    before: IDL.Opt(IDL.Text),
    after: IDL.Opt(IDL.Text),
    commits: IDL.Opt(IDL.Vec(IDL.Record({
        id: IDL.Text,
        message: IDL.Text,
        author: IDL.Record({
            name: IDL.Text,
            email: IDL.Text
        })
    }))),
    merge_request: IDL.Opt(IDL.Record({
        iid: IDL.Nat32,
        title: IDL.Text,
        source_branch: IDL.Text,
        target_branch: IDL.Text,
        last_commit: IDL.Record({
            id: IDL.Text
        })
    }))
});

export type GitLabWebhookPayload = {
    event_type: string;
    project: {
        path_with_namespace: string;
        default_branch: string;
    };
    ref: string | null;
    before: string | null;
    after: string | null;
    commits: Array<{
        id: string;
        message: string;
        author: {
            name: string;
            email: string;
        };
    }> | null;
    merge_request: {
        iid: number;
        title: string;
        source_branch: string;
        target_branch: string;
        last_commit: {
            id: string;
        };
    } | null;
};

/**
 * Build trigger information
 */
export const BuildTrigger = IDL.Record({
    id: IDL.Text,
    project_id: IDL.Text,
    repository_id: IDL.Text,
    trigger_type: WebhookEventType,
    branch: IDL.Opt(IDL.Text),
    commit_sha: IDL.Text,
    commit_message: IDL.Opt(IDL.Text),
    author_name: IDL.Opt(IDL.Text),
    author_email: IDL.Opt(IDL.Text),
    triggered_at: IDL.Nat64,
    verification_id: IDL.Opt(IDL.Text)
});

export type BuildTrigger = {
    id: string;
    project_id: string;
    repository_id: string;
    trigger_type: WebhookEventType;
    branch: string | null;
    commit_sha: string;
    commit_message: string | null;
    author_name: string | null;
    author_email: string | null;
    triggered_at: bigint;
    verification_id: string | null;
};

/**
 * Webhook errors
 */
export const WebhookError = IDL.Variant({
    InvalidSignature: IDL.Text,
    RepositoryNotFound: IDL.Text,
    InvalidPayload: IDL.Text,
    UnsupportedEvent: IDL.Text,
    ProcessingError: IDL.Text,
    Unauthorized: IDL.Text
});

export type WebhookError = 
    | { InvalidSignature: string }
    | { RepositoryNotFound: string }
    | { InvalidPayload: string }
    | { UnsupportedEvent: string }
    | { ProcessingError: string }
    | { Unauthorized: string };

/**
 * Webhook processing result
 */
export const WebhookResult = IDL.Variant({
    Ok: BuildTrigger,
    Err: WebhookError
});

export type WebhookResult = 
    | { Ok: BuildTrigger }
    | { Err: WebhookError };
