import express, { Request, Response } from 'express';
import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { createHash } from 'crypto';

const app = express();
app.use(express.json());

// Type definitions for webhook payloads
interface GitHubWebhookPayload {
    action?: string;
    ref?: string;
    repository?: {
        id: number;
        name: string;
        full_name: string;
        html_url: string;
        clone_url: string;
        ssh_url: string;
        default_branch: string;
    };
    head_commit?: {
        id: string;
        message: string;
        timestamp: string;
        author: {
            name: string;
            email: string;
            username: string;
        };
        committer: {
            name: string;
            email: string;
            username: string;
        };
    };
    pusher?: {
        name: string;
        email: string;
    };
    sender?: {
        login: string;
        id: number;
        html_url: string;
    };
}

interface GitLabWebhookPayload {
    object_kind: string;
    ref?: string;
    project?: {
        id: number;
        name: string;
        path_with_namespace: string;
        web_url: string;
        http_url: string;
        ssh_url: string;
        default_branch: string;
    };
    commits?: Array<{
        id: string;
        message: string;
        timestamp: string;
        author: {
            name: string;
            email: string;
        };
    }>;
    user_name?: string;
    user_email?: string;
}

// Mock webhook processing function
async function processWebhook(payload: any): Promise<any> {
    // Simulate webhook processing
    return {
        Ok: {
            id: 'webhook_' + Date.now(),
            project_id: 'test_project',
            commit_sha: payload.head_commit?.id || 'unknown'
        }
    };
}

// GitHub webhook endpoint
app.post('/webhook/github', async (req: Request, res: Response) => {
    console.log('GitHub webhook received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    try {
        const payload = req.body as GitHubWebhookPayload;
        
        // Process the webhook and call the canister
        const result = await processWebhook(payload);
        
        if ('Ok' in (result as any)) {
            const okResult = (result as any).Ok;
            console.log(`Webhook processed successfully: ${okResult.id}`);
            
            res.status(200).json({
                success: true,
                trigger_id: okResult.id,
                project_id: okResult.project_id,
                commit_sha: okResult.commit_sha
            });
        } else {
            const errorType = Object.keys((result as any).Err)[0];
            const errorMessage = Object.values((result as any).Err)[0] as string;
            console.error(`Webhook processing failed: ${errorType} - ${errorMessage}`);
            
            res.status(400).json({
                success: false,
                error: `${errorType}: ${errorMessage}`
            });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GitLab webhook endpoint  
app.post('/webhook/gitlab', async (req: Request, res: Response) => {
    console.log('GitLab webhook received');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    
    try {
        const payload = req.body as GitLabWebhookPayload;
        
        // Process the webhook and call the canister
        const result = await processWebhook(payload);
        
        if ('Ok' in (result as any)) {
            const okResult = (result as any).Ok;
            console.log(`Webhook processed successfully: ${okResult.id}`);
            
            res.status(200).json({
                success: true,
                trigger_id: okResult.id,
                project_id: okResult.project_id,
                commit_sha: okResult.commit_sha
            });
        } else {
            const errorType = Object.keys((result as any).Err)[0];
            const errorMessage = Object.values((result as any).Err)[0] as string;
            console.error(`Webhook processing failed: ${errorType} - ${errorMessage}`);
            
            res.status(400).json({
                success: false,
                error: `${errorType}: ${errorMessage}`
            });
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'dcanary-webhook-handler'
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 DCanary Webhook Handler listening on port ${PORT}`);
    console.log(`📡 GitHub webhook endpoint: http://localhost:${PORT}/webhook/github`);
    console.log(`📡 GitLab webhook endpoint: http://localhost:${PORT}/webhook/gitlab`);
    console.log(`❤️  Health check endpoint: http://localhost:${PORT}/health`);
});
