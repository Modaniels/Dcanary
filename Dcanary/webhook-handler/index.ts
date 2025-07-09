/**
 * Webhook HTTP Handler
 * 
 * This service runs outside the canister and forwards webhook events
 * to the webhook canister. It handles HTTP requests from GitHub/GitLab
 * and translates them to canister calls.
 * 
 * Deploy this as a serverless function or container service.
 */

import express from 'express';
import crypto from 'crypto';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Configuration
const WEBHOOK_CANISTER_ID = process.env.WEBHOOK_CANISTER_ID || '';
const IC_HOST = process.env.IC_HOST || 'https://ic0.app';
const PORT = process.env.PORT || 3000;

// Create agent for canister calls
const agent = new HttpAgent({ host: IC_HOST });

// Webhook canister interface
const webhookInterface = ({ IDL }: any) => {
    const SCMProvider = IDL.Variant({
        GitHub: IDL.Null,
        GitLab: IDL.Null
    });

    const GitHubWebhookPayload = IDL.Record({
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

    const GitLabWebhookPayload = IDL.Record({
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

    const WebhookResult = IDL.Variant({
        Ok: IDL.Record({
            id: IDL.Text,
            project_id: IDL.Text,
            repository_id: IDL.Text,
            commit_sha: IDL.Text
        }),
        Err: IDL.Variant({
            InvalidSignature: IDL.Text,
            RepositoryNotFound: IDL.Text,
            InvalidPayload: IDL.Text,
            UnsupportedEvent: IDL.Text,
            ProcessingError: IDL.Text,
            Unauthorized: IDL.Text
        })
    });

    return IDL.Service({
        handleGitHubWebhook: IDL.Func([IDL.Text, GitHubWebhookPayload, IDL.Text], [WebhookResult], ['update']),
        handleGitLabWebhook: IDL.Func([IDL.Text, GitLabWebhookPayload, IDL.Text], [WebhookResult], ['update'])
    });
};

// Create webhook actor
const webhookActor = Actor.createActor(webhookInterface, {
    agent,
    canisterId: WEBHOOK_CANISTER_ID
});

// Helper function to transform GitHub payload
function transformGitHubPayload(headers: any, body: any): any {
    const eventType = headers['x-github-event'] || '';
    
    return {
        event_type: eventType,
        repository: {
            full_name: body.repository?.full_name || '',
            default_branch: body.repository?.default_branch || 'main'
        },
        ref: body.ref ? [body.ref] : [],
        before: body.before ? [body.before] : [],
        after: body.after ? [body.after] : [],
        commits: body.commits ? [body.commits.map((commit: any) => ({
            id: commit.id,
            message: commit.message,
            author: {
                name: commit.author.name,
                email: commit.author.email
            }
        }))] : [],
        pull_request: body.pull_request ? [{
            number: body.pull_request.number,
            title: body.pull_request.title,
            head: {
                ref: body.pull_request.head.ref,
                sha: body.pull_request.head.sha
            },
            base: {
                ref: body.pull_request.base.ref,
                sha: body.pull_request.base.sha
            }
        }] : [],
        release: body.release ? [{
            tag_name: body.release.tag_name,
            name: body.release.name,
            prerelease: body.release.prerelease
        }] : []
    };
}

// Helper function to transform GitLab payload
function transformGitLabPayload(headers: any, body: any): any {
    const eventType = headers['x-gitlab-event'] || '';
    
    return {
        event_type: eventType,
        project: {
            path_with_namespace: body.project?.path_with_namespace || '',
            default_branch: body.project?.default_branch || 'main'
        },
        ref: body.ref ? [body.ref] : [],
        before: body.before ? [body.before] : [],
        after: body.after ? [body.after] : [],
        commits: body.commits ? [body.commits.map((commit: any) => ({
            id: commit.id,
            message: commit.message,
            author: {
                name: commit.author.name,
                email: commit.author.email
            }
        }))] : [],
        merge_request: body.merge_request ? [{
            iid: body.merge_request.iid,
            title: body.merge_request.title,
            source_branch: body.merge_request.source_branch,
            target_branch: body.merge_request.target_branch,
            last_commit: {
                id: body.merge_request.last_commit.id
            }
        }] : []
    };
}

// GitHub webhook endpoint
app.post('/webhook/github', async (req, res) => {
    try {
        const signature = req.headers['x-hub-signature-256'] as string;
        const payload = transformGitHubPayload(req.headers, req.body);
        const repositoryName = req.body.repository?.full_name || '';

        if (!signature || !repositoryName) {
            return res.status(400).json({ error: 'Missing required headers or repository name' });
        }

        console.log(`Processing GitHub webhook for ${repositoryName}`);

        const result = await webhookActor.handleGitHubWebhook(signature, payload, repositoryName);

        if ('Ok' in result) {
            console.log(`Webhook processed successfully: ${result.Ok.id}`);
            res.status(200).json({ 
                success: true, 
                trigger_id: result.Ok.id,
                project_id: result.Ok.project_id,
                commit_sha: result.Ok.commit_sha
            });
        } else {
            const errorType = Object.keys(result.Err)[0];
            const errorMessage = Object.values(result.Err)[0] as string;
            console.error(`Webhook processing failed: ${errorType} - ${errorMessage}`);
            res.status(400).json({ error: `${errorType}: ${errorMessage}` });
        }

    } catch (error) {
        console.error('GitHub webhook processing error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GitLab webhook endpoint
app.post('/webhook/gitlab', async (req, res) => {
    try {
        const token = req.headers['x-gitlab-token'] as string;
        const payload = transformGitLabPayload(req.headers, req.body);
        const repositoryPath = req.body.project?.path_with_namespace || '';

        if (!token || !repositoryPath) {
            return res.status(400).json({ error: 'Missing required headers or repository path' });
        }

        console.log(`Processing GitLab webhook for ${repositoryPath}`);

        const result = await webhookActor.handleGitLabWebhook(token, payload, repositoryPath);

        if ('Ok' in result) {
            console.log(`Webhook processed successfully: ${result.Ok.id}`);
            res.status(200).json({ 
                success: true, 
                trigger_id: result.Ok.id,
                project_id: result.Ok.project_id,
                commit_sha: result.Ok.commit_sha
            });
        } else {
            const errorType = Object.keys(result.Err)[0];
            const errorMessage = Object.values(result.Err)[0] as string;
            console.error(`Webhook processing failed: ${errorType} - ${errorMessage}`);
            res.status(400).json({ error: `${errorType}: ${errorMessage}` });
        }

    } catch (error) {
        console.error('GitLab webhook processing error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        canister_id: WEBHOOK_CANISTER_ID,
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Webhook handler running on port ${PORT}`);
    console.log(`Webhook canister ID: ${WEBHOOK_CANISTER_ID}`);
    console.log(`IC host: ${IC_HOST}`);
});

export default app;
