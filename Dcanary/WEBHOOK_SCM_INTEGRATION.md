# Webhook and SCM Integration Guide

## Overview

Dcanary supports automatic build triggering through inter-canister communication for SCM integration with GitHub and GitLab. This allows your CI/CD pipeline to automatically respond to code changes, pull requests, tags, and releases via programmatic triggers.

## Supported SCM Providers

- **GitHub** - Repository registration and build triggering for push, pull request, and release events
- **GitLab** - Repository registration and build triggering for push, merge request, and tag events

## Architecture

The webhook integration consists of:

1. **Webhook Canister** - Handles repository registration and inter-canister build triggering
2. **Repository Configuration** - Stores SCM repository settings and build preferences
3. **Build Triggers** - Records of events that trigger builds via canister calls
4. **CLI Commands** - Manage SCM integrations and webhook configurations

## Setup Guide

### 1. Deploy the Webhook Canister

First, deploy the webhook canister to your ICP environment:

```bash
# Deploy locally
dfx deploy webhook_canister --network local

# Deploy to IC mainnet
dfx deploy webhook_canister --network ic
```

### 2. Register Your Repository

Use the CLI to register your repository with Dcanary:

```bash
# Register a GitHub repository
mody scm register my-project \
  --provider github \
  --owner myorg \
  --repo myrepo \
  --secret your-webhook-secret \
  --auto-push \
  --auto-tag \
  --branches "main,develop" \
  --canister-id <webhook-canister-id>

# Register a GitLab repository  
mody scm register my-project \
  --provider gitlab \
  --owner myorg \
  --repo myrepo \
  --secret your-webhook-token \
  --auto-push \
  --auto-tag \
  --branches "main,develop" \
  --canister-id <webhook-canister-id>
```

### 3. Trigger Webhook Events via Inter-Canister Communication

Instead of direct HTTP webhooks, use inter-canister communication to trigger builds:

```bash
# Trigger a webhook event manually via CLI
mody webhook trigger <repository-id> \
  --event push \
  --commit abc123def456 \
  --branch main \
  --message "Fix critical bug"

# Or call the canister directly from another canister
await call(webhook_canister_id, 'handleWebhookEvent', {
  args: [repository_id, 'push', commit_sha, branch, commit_message]
});
```

## CLI Commands

### SCM Integration Commands

```bash
# Register a new repository
mody scm register <project-id> [options]

# List registered repositories for a project
mody scm list <project-id>

# Update repository configuration
mody scm update <repository-id> [options]
```

### Webhook Management Commands

```bash
# List build triggers for a project
mody webhook triggers <project-id>

# Get details of a specific build trigger
mody webhook trigger <trigger-id>

# Test webhook integration locally
mody webhook test <repository-id> [options]
```

## Configuration Options

### Repository Configuration

- **Auto-build on Push** - Automatically trigger builds when code is pushed
- **Auto-build on Tag** - Automatically trigger builds when tags are created
- **Build Branches** - Specify which branches should trigger builds (empty = all branches)
- **Webhook Secret/Token** - Security token for webhook verification

### Event Types

The system supports the following webhook events:

- **Push** - Code pushed to repository
- **Pull Request** - Pull request opened/updated (GitHub)
- **Merge Request** - Merge request opened/updated (GitLab)
- **Tag** - New tag created
- **Release** - New release published

## Security

### Webhook Verification

All webhook events are verified using simple token-based authentication:

- **GitHub**: Token verification for inter-canister calls
- **GitLab**: Token verification for inter-canister calls

### Access Control

- Only authorized users can register repositories
- Repository owners can update their own configurations
- Admin users have full access to all operations

## Workflow Example

1. Developer pushes code to the `main` branch
2. Another canister or external service calls the webhook canister
3. Webhook canister processes the event
4. Build trigger is created if the repository is configured for auto-build
5. Verification process is automatically started (if enabled)
6. Build results are available through the CLI or API

## Monitoring and Debugging

### View Build Triggers

```bash
# See recent build triggers
mody webhook triggers my-project --limit 10

# Get details of a specific trigger
mody webhook trigger trigger_12345_67890
```

### Check Repository Status

```bash
# List all repositories for a project
mody scm list my-project
```

### Test Webhook Integration

```bash
# Simulate a webhook event via inter-canister call
mody webhook test github:myorg/myrepo \
  --event push \
  --branch main \
  --commit abc123def456
```

## Troubleshooting

### Common Issues

1. **Webhook Not Triggering**
   - Verify repository is registered with correct settings
   - Check inter-canister call permissions

2. **Builds Not Starting**
   - Verify verification canister is configured
   - Check auto-build settings for the repository
   - Ensure branches match configuration

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
mody --verbose webhook triggers my-project
```

## API Reference

### Canister Methods

```typescript
// Register repository
registerRepository(projectId, provider, owner, repo, secret, autoPush, autoTag, branches)

// List repositories
listRepositoriesByProject(projectId)

// Get build triggers
getBuildTriggers(projectId)

// Handle webhook events via inter-canister calls
handleWebhookEvent(repositoryId, eventType, commitSha, branch, commitMessage)
```

## Best Practices

1. **Use Unique Secrets** - Generate strong, unique secrets for each repository
2. **Configure Branch Filters** - Only build branches you need to save resources
3. **Monitor Build Triggers** - Regularly check webhook activity for issues
4. **Test Integration** - Use the test command to verify webhook configuration
5. **Secure Access** - Limit who can register and modify repositories

## Future Enhancements

- Support for additional SCM providers (Bitbucket, Azure DevOps)
- Advanced filtering and routing rules
- Webhook retry mechanisms
- Real-time webhook event monitoring
- Integration with notification systems
