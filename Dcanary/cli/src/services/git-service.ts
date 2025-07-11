import * as fs from 'fs-extra';
import { logger } from '../utils/logger';

export class GitService {
    async setupIntegration(repositoryUrl: string, config: any): Promise<void> {
        try {
            // Extract repository info
            const repoInfo = this.parseRepositoryUrl(repositoryUrl);
            
            // Generate webhook configuration
            const webhookConfig = {
                provider: repoInfo.provider,
                repository: repoInfo.repository,
                events: ['push', 'pull_request'],
                branches: ['main', 'develop'],
                webhook: {
                    url: `https://api.dcanary.io/webhooks/${repoInfo.provider}`,
                    secret: '${DCANARY_WEBHOOK_SECRET}',
                    contentType: 'application/json'
                }
            };

            // Save webhook configuration
            await fs.ensureDir('.dcanary');
            await fs.writeJson('.dcanary/webhook.json', webhookConfig, { spaces: 2 });

            // Generate instructions for manual setup
            const instructions = this.generateSetupInstructions(repoInfo, webhookConfig);
            await fs.writeFile('.dcanary/WEBHOOK_SETUP.md', instructions);

            logger.info('Git integration configured', { repository: repositoryUrl });

        } catch (error: any) {
            logger.error('Failed to setup Git integration', { error: error.message });
            throw error;
        }
    }

    private parseRepositoryUrl(url: string): any {
        const patterns = {
            github: /github\.com[\/:]([^\/]+)\/([^\/\.]+)/,
            gitlab: /gitlab\.com[\/:]([^\/]+)\/([^\/\.]+)/,
            bitbucket: /bitbucket\.org[\/:]([^\/]+)\/([^\/\.]+)/
        };

        for (const [provider, pattern] of Object.entries(patterns)) {
            const match = url.match(pattern);
            if (match) {
                return {
                    provider,
                    owner: match[1],
                    name: match[2],
                    repository: `${match[1]}/${match[2]}`
                };
            }
        }

        throw new Error(`Unsupported repository URL: ${url}`);
    }

    private generateSetupInstructions(repoInfo: any, webhookConfig: any): string {
        const { provider, owner, name } = repoInfo;
        
        return `# Dcanary Webhook Setup Instructions

## ${provider.charAt(0).toUpperCase() + provider.slice(1)} Integration

### Automatic Setup (Recommended)
Run the following command to automatically configure webhooks:
\`\`\`bash
dcanary integrate ${provider} --auto-setup
\`\`\`

### Manual Setup

1. **Go to your repository settings:**
   - Repository: ${owner}/${name}
   - Navigate to Settings → Webhooks

2. **Add new webhook:**
   - Payload URL: \`${webhookConfig.webhook.url}\`
   - Content type: \`${webhookConfig.webhook.contentType}\`
   - Secret: \`\${DCANARY_WEBHOOK_SECRET}\` (get from Dcanary dashboard)

3. **Select events:**
   - ✅ Push events
   - ✅ Pull request events
   - ✅ Release events

4. **Test the webhook:**
   \`\`\`bash
   dcanary webhook test --repository ${owner}/${name}
   \`\`\`

### Environment Variables
Add these to your repository secrets:
- \`DCANARY_WEBHOOK_SECRET\`: Your webhook secret
- \`DCANARY_API_KEY\`: Your Dcanary API key

### Next Steps
1. Push a commit to trigger the first build
2. Check build status: \`dcanary status\`
3. View logs: \`dcanary logs --live\`

For more information, visit: https://docs.dcanary.io/integrations/${provider}
`;
    }
}
