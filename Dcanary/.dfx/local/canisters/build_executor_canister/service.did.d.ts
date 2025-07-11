import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'cancelBuild' : ActorMethod<[string], boolean>,
  'executeBuild' : ActorMethod<
    [string, string],
    {
        'Ok' : {
          'build_time' : bigint,
          'artifact_size' : number,
          'hash' : string,
          'error' : string,
          'cycles_consumed' : bigint,
          'success' : boolean,
        }
      } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'SecurityViolation' : string } |
          { 'ResourceExhausted' : string } |
          { 'InternalError' : string }
      }
  >,
  'executePipeline' : ActorMethod<
    [
      {
        'branch' : string,
        'pipeline_config' : string,
        'repository_id' : string,
        'source_url' : string,
        'timestamp' : bigint,
        'commit_hash' : string,
        'trigger_type' : string,
      },
    ],
    undefined
  >,
  'getAgentCapabilities' : ActorMethod<
    [],
    {
      'available_resources' : {
        'memory_mb' : number,
        'network_bandwidth' : number,
        'disk_space_gb' : number,
        'cpu_cores' : number,
      },
      'labels' : Array<string>,
      'max_concurrent_builds' : number,
      'installed_tools' : Array<string>,
      'supported_languages' : Array<string>,
    }
  >,
  'getAgentHealth' : ActorMethod<
    [],
    {
      'status' : string,
      'active_builds' : number,
      'cpu_usage' : number,
      'agent_id' : Principal,
      'last_heartbeat' : bigint,
      'uptime' : bigint,
      'queue_length' : number,
      'memory_usage' : number,
    }
  >,
  'getBuildHistory' : ActorMethod<
    [[] | [number], [] | [number]],
    Array<
      {
        'build_time' : bigint,
        'artifact_size' : number,
        'hash' : string,
        'error' : string,
        'cycles_consumed' : bigint,
        'success' : boolean,
      }
    >
  >,
  'getBuildQueueStatus' : ActorMethod<
    [],
    {
      'pending_builds' : number,
      'queue_utilization' : number,
      'max_queue_size' : number,
      'completed_builds' : number,
      'running_builds' : number,
    }
  >,
  'getHash' : ActorMethod<
    [],
    { 'Ok' : string } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'SecurityViolation' : string } |
          { 'ResourceExhausted' : string } |
          { 'InternalError' : string }
      }
  >,
  'getPipelineResult' : ActorMethod<[string], undefined>,
  'getResourceUsage' : ActorMethod<
    [],
    {
      'resource_efficiency' : number,
      'cpu_time_ms' : bigint,
      'memory_peak_mb' : number,
      'disk_used_gb' : number,
      'network_bytes' : bigint,
    }
  >,
  'getStatistics' : ActorMethod<
    [],
    {
      'total_builds' : number,
      'successful_builds' : number,
      'canister_version' : string,
      'verification_canister' : Principal,
      'deployed_at' : bigint,
      'build_instructions_canister' : Principal,
      'failed_builds' : number,
      'last_successful_hash' : string,
    }
  >,
  'healthCheck' : ActorMethod<[], string>,
  'processNextBuild' : ActorMethod<[], boolean>,
  'queueBuildRequest' : ActorMethod<
    [{ 'requester' : Principal, 'version' : string, 'project_id' : string }],
    boolean
  >,
  'updateAgentCapabilities' : ActorMethod<
    [
      {
        'available_resources' : {
          'memory_mb' : number,
          'network_bandwidth' : number,
          'disk_space_gb' : number,
          'cpu_cores' : number,
        },
        'labels' : Array<string>,
        'max_concurrent_builds' : number,
        'installed_tools' : Array<string>,
        'supported_languages' : Array<string>,
      },
    ],
    boolean
  >,
  'updateBuildInstructionsCanister' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'SecurityViolation' : string } |
          { 'ResourceExhausted' : string } |
          { 'InternalError' : string }
      }
  >,
  'updateVerificationCanister' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'SecurityViolation' : string } |
          { 'ResourceExhausted' : string } |
          { 'InternalError' : string }
      }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
