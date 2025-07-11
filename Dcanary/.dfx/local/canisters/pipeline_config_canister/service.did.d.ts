import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'addPipelineStage' : ActorMethod<
    [
      string,
      {
        'artifacts' : Array<string>,
        'retry_count' : number,
        'name' : string,
        'resource_requirements' : {
          'memory_mb' : number,
          'max_cycles' : bigint,
          'storage_mb' : number,
          'cpu_cores' : number,
        },
        'parallel_group' : [] | [string],
        'depends_on' : Array<string>,
        'cache_paths' : Array<string>,
        'environment' : Array<[string, string]>,
        'commands' : Array<string>,
        'timeout_minutes' : bigint,
        'runtime' : string,
      },
    ],
    undefined
  >,
  'createFromTemplate' : ActorMethod<
    [string, string, string, string],
    undefined
  >,
  'deletePipeline' : ActorMethod<[string], undefined>,
  'getPipelineConfig' : ActorMethod<[string], undefined>,
  'listAllPipelines' : ActorMethod<[], undefined>,
  'listMyPipelines' : ActorMethod<[], undefined>,
  'listTemplates' : ActorMethod<[], undefined>,
  'registerPipeline' : ActorMethod<
    [string, string, string, [] | [string]],
    undefined
  >,
  'setPipelineEnvironment' : ActorMethod<
    [string, Array<[string, string]>],
    undefined
  >,
  'updatePipelineConfig' : ActorMethod<
    [
      string,
      {
        'stages' : Array<
          {
            'artifacts' : Array<string>,
            'retry_count' : number,
            'name' : string,
            'resource_requirements' : {
              'memory_mb' : number,
              'max_cycles' : bigint,
              'storage_mb' : number,
              'cpu_cores' : number,
            },
            'parallel_group' : [] | [string],
            'depends_on' : Array<string>,
            'cache_paths' : Array<string>,
            'environment' : Array<[string, string]>,
            'commands' : Array<string>,
            'timeout_minutes' : bigint,
            'runtime' : string,
          }
        >,
        'updated_at' : bigint,
        'repository_id' : string,
        'networks' : Array<
          {
            'is_mainnet' : boolean,
            'default_gas_price' : [] | [bigint],
            'name' : string,
            'provider_url' : string,
          }
        >,
        'notifications' : {
          'notify_on_failure' : boolean,
          'slack_webhook' : [] | [string],
          'discord_webhook' : [] | [string],
          'email_recipients' : Array<string>,
          'notify_on_success' : boolean,
          'notify_on_start' : boolean,
        },
        'repository_url' : string,
        'owner' : Principal,
        'name' : string,
        'global_environment' : Array<[string, string]>,
        'description' : [] | [string],
        'created_at' : bigint,
        'version' : number,
        'is_active' : boolean,
        'triggers' : Array<
          { 'Release' : { 'tag_pattern' : [] | [string] } } |
            { 'Push' : { 'branches' : Array<string> } } |
            { 'PullRequest' : { 'target_branches' : Array<string> } } |
            { 'Schedule' : { 'cron_expression' : string } } |
            { 'Manual' : null }
        >,
      },
    ],
    undefined
  >,
  'updatePipelineTriggers' : ActorMethod<
    [
      string,
      Array<
        { 'Release' : { 'tag_pattern' : [] | [string] } } |
          { 'Push' : { 'branches' : Array<string> } } |
          { 'PullRequest' : { 'target_branches' : Array<string> } } |
          { 'Schedule' : { 'cron_expression' : string } } |
          { 'Manual' : null }
      >,
    ],
    undefined
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
