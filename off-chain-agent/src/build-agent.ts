#!/usr/bin/env node

import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import Docker from 'dockerode';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

// Interface for your build_executor canister
const BuildExecutorIDL = IDL.Service({
  'getPendingBuilds': IDL.Func([], [IDL.Vec(BuildRequest)], ['query']),
  'submitBuildAttestation': IDL.Func([BuildAttestation], [IDL.Variant({ 'Ok': IDL.Null, 'Err': BuildExecutorError })], []),
  'registerExecutor': IDL.Func([ExecutorIdentity], [IDL.Variant({ 'Ok': IDL.Null, 'Err': BuildExecutorError })], [])
});

// Types (matching your canister)
const BuildRequest = IDL.Record({
  project_id: IDL.Text,
  version: IDL.Text,
  requester: IDL.Principal
});

const BuildAttestation = IDL.Record({
  executor_id: IDL.Principal,
  build_request_hash: IDL.Text,
  artifact_hash: IDL.Text,
  execution_signature: IDL.Vec(IDL.Nat8),
  execution_metadata: IDL.Record({
    start_time: IDL.Nat64,
    end_time: IDL.Nat64,
    resource_usage: IDL.Record({
      cpu_time_ms: IDL.Nat64,
      memory_peak_mb: IDL.Nat32,
      network_bytes: IDL.Nat64
    }),
    exit_code: IDL.Int32,
    environment_hash: IDL.Text
  }),
  trust_score: IDL.Float32
});

class DcanaryBuildAgent {
  private docker: Docker;
  private agent: HttpAgent;
  private canister: any;
  private principal: string;
  private privateKey: string;

  constructor(canisterId: string, principal: string, privateKey: string) {
    this.docker = new Docker();
    this.agent = new HttpAgent({
      host: 'https://ic0.app'
    });
    
    this.canister = Actor.createActor(BuildExecutorIDL, {
      agent: this.agent,
      canisterId: canisterId
    });

    this.principal = principal;
    this.privateKey = privateKey;
  }

  /**
   * Main execution loop
   */
  async start() {
    console.log('🚀 Dcanary Build Agent starting...');
    
    // Register with the network
    await this.registerWithNetwork();
    
    // Start polling for builds
    while (true) {
      try {
        await this.pollAndExecuteBuilds();
        await this.sleep(10000); // Poll every 10 seconds
      } catch (error) {
        console.error('Error in main loop:', error);
        await this.sleep(30000); // Wait 30s on error
      }
    }
  }

  /**
   * Register this agent with the Dcanary network
   */
  async registerWithNetwork() {
    console.log('📝 Registering with Dcanary network...');
    
    const identity = {
      executor_id: this.principal,
      public_key: Array.from(Buffer.from(this.publicKey, 'hex')),
      endpoint_url: process.env.AGENT_ENDPOINT || 'http://localhost:8080',
      capabilities: {
        labels: ['linux', 'docker', 'dfx', 'typescript'],
        max_concurrent_builds: 3,
        available_resources: {
          cpu_cores: 4,
          memory_mb: 8192,
          disk_space_gb: 100,
          network_bandwidth: 1000
        },
        supported_languages: ['motoko', 'rust', 'typescript', 'javascript'],
        installed_tools: ['dfx', 'moc', 'rustc', 'node', 'npm', 'cargo']
      },
      stake_amount: 10000000n, // 10M cycles
      registration_time: BigInt(Date.now() * 1000000),
      operational_model: { PublicNetwork: null },
      geographic_region: process.env.AWS_REGION || 'us-east-1',
      compliance_certifications: ['SOC2'],
      pricing_model: {
        base_rate_per_minute: 1000n,
        quality_multiplier: 1.0,
        volume_discounts: []
      }
    };

    const result = await this.canister.registerExecutor(identity);
    if ('Err' in result) {
      throw new Error(`Registration failed: ${JSON.stringify(result.Err)}`);
    }
    
    console.log('✅ Successfully registered with network');
  }

  /**
   * Poll for builds and execute them
   */
  async pollAndExecuteBuilds() {
    const pendingBuilds = await this.canister.getPendingBuilds();
    
    if (pendingBuilds.length === 0) {
      console.log('💤 No pending builds');
      return;
    }

    console.log(`🔍 Found ${pendingBuilds.length} pending builds`);

    for (const build of pendingBuilds) {
      try {
        await this.executeBuild(build);
      } catch (error) {
        console.error(`❌ Build failed for ${build.project_id}:`, error);
      }
    }
  }

  /**
   * Execute a single build
   */
  async executeBuild(buildRequest: any) {
    const startTime = Date.now();
    console.log(`🔨 Starting build: ${buildRequest.project_id}@${buildRequest.version}`);

    // 1. Get build instructions from canister
    const instructions = await this.getBuildInstructions(buildRequest);
    
    // 2. Clone source code
    const workDir = await this.cloneRepository(instructions.source_url, instructions.commit_hash);
    
    try {
      // 3. Execute build in Docker
      const buildResult = await this.runBuildInDocker(instructions.instruction_set, workDir);
      
      // 4. Collect and hash artifacts
      const artifacts = await this.collectArtifacts(workDir);
      const artifactHash = this.calculateHash(artifacts);
      
      // 5. Submit attestation to IC
      await this.submitAttestation({
        buildRequest,
        buildResult,
        artifactHash,
        startTime,
        endTime: Date.now()
      });

      console.log(`✅ Build completed: ${buildRequest.project_id}@${buildRequest.version}`);
      
    } finally {
      // Always cleanup
      this.cleanup(workDir);
    }
  }

  /**
   * Clone repository and checkout specific commit
   */
  async cloneRepository(sourceUrl: string, commitHash: string): Promise<string> {
    const workDir = `/tmp/dcanary_build_${Date.now()}`;
    
    console.log(`📥 Cloning ${sourceUrl} @ ${commitHash}`);
    
    execSync(`git clone ${sourceUrl} ${workDir}`, { stdio: 'inherit' });
    execSync(`cd ${workDir} && git checkout ${commitHash}`, { stdio: 'inherit' });
    
    return workDir;
  }

  /**
   * Execute build in Docker container
   */
  async runBuildInDocker(instructions: string, workDir: string): Promise<any> {
    console.log(`🐳 Running build in Docker container`);
    
    // Create Dockerfile
    const dockerfile = `
FROM dfinity/dfx:latest
WORKDIR /workspace
COPY . .
RUN ${instructions}
`;
    fs.writeFileSync(path.join(workDir, 'Dockerfile'), dockerfile);

    // Build Docker image
    const imageTag = `dcanary-build-${Date.now()}`;
    execSync(`cd ${workDir} && docker build -t ${imageTag} .`, { stdio: 'inherit' });

    // Run container and collect results
    const containerResult = execSync(`docker run --rm ${imageTag}`, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Cleanup image
    execSync(`docker rmi ${imageTag}`, { stdio: 'ignore' });

    return {
      exitCode: 0,
      stdout: containerResult,
      stderr: '',
      memoryUsed: 256 // MB (would get from Docker stats in real implementation)
    };
  }

  /**
   * Collect build artifacts
   */
  async collectArtifacts(workDir: string): Promise<Buffer[]> {
    const artifacts: Buffer[] = [];
    
    // Look for common build output directories
    const artifactPaths = ['.dfx', 'dist', 'build', 'target', 'out'];
    
    for (const artifactPath of artifactPaths) {
      const fullPath = path.join(workDir, artifactPath);
      if (fs.existsSync(fullPath)) {
        // In real implementation, would recursively collect all files
        // For now, just collect the directory structure
        const files = this.getFilesRecursively(fullPath);
        for (const file of files) {
          artifacts.push(fs.readFileSync(file));
        }
      }
    }
    
    return artifacts;
  }

  /**
   * Calculate hash of artifacts
   */
  calculateHash(artifacts: Buffer[]): string {
    const hash = crypto.createHash('sha256');
    
    for (const artifact of artifacts) {
      hash.update(artifact);
    }
    
    return hash.digest('hex');
  }

  /**
   * Submit build attestation to IC canister
   */
  async submitAttestation(data: any) {
    console.log(`📤 Submitting attestation to IC`);
    
    const attestation = {
      executor_id: this.principal,
      build_request_hash: this.hashBuildRequest(data.buildRequest),
      artifact_hash: data.artifactHash,
      execution_signature: Array.from(this.signArtifacts(data.artifactHash)),
      execution_metadata: {
        start_time: BigInt(data.startTime * 1000000), // Convert to nanoseconds
        end_time: BigInt(data.endTime * 1000000),
        resource_usage: {
          cpu_time_ms: BigInt(data.endTime - data.startTime),
          memory_peak_mb: data.buildResult.memoryUsed || 256,
          network_bytes: 1024000n // Mock value
        },
        exit_code: data.buildResult.exitCode,
        environment_hash: this.getEnvironmentHash()
      },
      trust_score: 0.95 // Based on agent reputation
    };

    const result = await this.canister.submitBuildAttestation(attestation);
    
    if ('Err' in result) {
      throw new Error(`Attestation submission failed: ${JSON.stringify(result.Err)}`);
    }
    
    console.log('✅ Attestation submitted successfully');
  }

  // Helper methods
  private async getBuildInstructions(buildRequest: any): Promise<any> {
    // In real implementation, would call build_instructions_canister
    return {
      instruction_set: 'dfx build && dfx test',
      source_url: 'https://github.com/example/project',
      commit_hash: 'abc123...'
    };
  }

  private hashBuildRequest(request: any): string {
    return crypto.createHash('sha256')
      .update(JSON.stringify(request))
      .digest('hex');
  }

  private signArtifacts(artifactHash: string): Buffer {
    // In real implementation, would use proper cryptographic signing
    return crypto.createHmac('sha256', this.privateKey)
      .update(artifactHash)
      .digest();
  }

  private getEnvironmentHash(): string {
    // Hash of Docker image, dfx version, etc.
    return crypto.createHash('sha256')
      .update('dfinity/dfx:latest')
      .digest('hex');
  }

  private getFilesRecursively(dir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private cleanup(workDir: string) {
    try {
      execSync(`rm -rf ${workDir}`, { stdio: 'ignore' });
    } catch (error) {
      console.warn(`⚠️  Failed to cleanup ${workDir}:`, error);
    }
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private get publicKey(): string {
    // In real implementation, derive from private key
    return crypto.createHash('sha256').update(this.privateKey).digest('hex');
  }
}

// Main execution
if (require.main === module) {
  const agent = new DcanaryBuildAgent(
    process.env.CANISTER_ID || 'rdmx6-jaaaa-aaaah-qcaiq-cai',
    process.env.PRINCIPAL_ID || '2vxsx-fae',
    process.env.PRIVATE_KEY || 'default-key'
  );

  agent.start().catch(console.error);
}

export default DcanaryBuildAgent;
