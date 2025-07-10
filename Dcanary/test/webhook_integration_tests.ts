import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import { Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getTestIdentity, deployCanister, getTestAgent } from './test_utils';

describe('Webhook Integration Tests', () => {
    let webhookActor: any;
    let testIdentity: any;
    let canisterId: string;

    beforeAll(async () => {
        testIdentity = getTestIdentity();
        
        // Deploy webhook canister
        canisterId = (await deployCanister('webhook_canister')).toString();
        
        const agent = getTestAgent();
        
        // Create webhook actor
        const webhookInterface = ({ IDL }: any) => {
            const SCMProvider = IDL.Variant({
                GitHub: IDL.Null,
                GitLab: IDL.Null
            });

            const RepositoryResult = IDL.Variant({
                Ok: IDL.Text,
                Err: IDL.Variant({
                    NotFound: IDL.Text,
                    Unauthorized: IDL.Text,
                    InvalidInput: IDL.Text,
                    InternalError: IDL.Text,
                    AlreadyExists: IDL.Text
                })
            });

            return IDL.Service({
                registerRepository: IDL.Func(
                    [IDL.Text, SCMProvider, IDL.Text, IDL.Text, IDL.Text, IDL.Bool, IDL.Bool, IDL.Vec(IDL.Text)],
                    [RepositoryResult],
                    ['update']
                ),
                listRepositoriesByProject: IDL.Func([IDL.Text], [IDL.Vec(IDL.Record({
                    id: IDL.Text,
                    provider: SCMProvider,
                    owner: IDL.Text,
                    name: IDL.Text,
                    project_id: IDL.Text,
                    auto_build_on_push: IDL.Bool,
                    auto_build_on_tag: IDL.Bool,
                    build_branches: IDL.Vec(IDL.Text)
                }))], ['query'])
            });
        };

        webhookActor = Actor.createActor(webhookInterface, {
            agent,
            canisterId
        });
    }, 60000);

    test('should register a GitHub repository', async () => {
        const result = await webhookActor.registerRepository(
            'test-project',
            { GitHub: null },
            'testorg',
            'testrepo',
            'test-secret-123',
            true,
            false,
            ['main', 'develop']
        );

        expect(result).toHaveProperty('Ok');
        expect(typeof result.Ok).toBe('string');
        expect(result.Ok).toContain('github:testorg/testrepo');
    }, 30000);

    test('should register a GitLab repository', async () => {
        const result = await webhookActor.registerRepository(
            'test-project',
            { GitLab: null },
            'testgroup',
            'testrepo',
            'test-token-456',
            false,
            true,
            []
        );

        expect(result).toHaveProperty('Ok');
        expect(typeof result.Ok).toBe('string');
        expect(result.Ok).toContain('gitlab:testgroup/testrepo');
    }, 30000);

    test('should list repositories for a project', async () => {
        const repositories = await webhookActor.listRepositoriesByProject('test-project');

        expect(Array.isArray(repositories)).toBe(true);
        expect(repositories.length).toBeGreaterThanOrEqual(2);

        const githubRepo = repositories.find((repo: any) => 'GitHub' in repo.provider);
        const gitlabRepo = repositories.find((repo: any) => 'GitLab' in repo.provider);

        expect(githubRepo).toBeDefined();
        expect(gitlabRepo).toBeDefined();

        expect(githubRepo.owner).toBe('testorg');
        expect(githubRepo.name).toBe('testrepo');
        expect(githubRepo.auto_build_on_push).toBe(true);
        expect(githubRepo.build_branches).toEqual(['main', 'develop']);

        expect(gitlabRepo.owner).toBe('testgroup');
        expect(gitlabRepo.name).toBe('testrepo');
        expect(gitlabRepo.auto_build_on_tag).toBe(true);
        expect(gitlabRepo.build_branches).toEqual([]);
    }, 30000);

    test('should prevent duplicate repository registration', async () => {
        const result = await webhookActor.registerRepository(
            'test-project',
            { GitHub: null },
            'testorg',
            'testrepo',
            'test-secret-123',
            true,
            false,
            ['main']
        );

        expect(result).toHaveProperty('Err');
        expect(result.Err).toHaveProperty('AlreadyExists');
    }, 30000);

    test('should validate required fields', async () => {
        const result = await webhookActor.registerRepository(
            '',
            { GitHub: null },
            'testorg',
            'testrepo',
            'test-secret',
            true,
            false,
            []
        );

        expect(result).toHaveProperty('Err');
        expect(result.Err).toHaveProperty('InvalidInput');
    }, 30000);
});
