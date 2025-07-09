import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'create_pipeline_template' : ActorMethod<
    [
      string,
      {
        'stages' : Array<
          {
            'post_actions' : Array<string>,
            'retry_count' : number,
            'name' : string,
            'when_condition' : [] | [string],
            'steps' : Array<
              {
                'configuration' : Array<[string, string]>,
                'step_type' : string,
                'timeout_seconds' : bigint,
              }
            >,
            'parallel_group' : [] | [string],
            'timeout_minutes' : bigint,
          }
        >,
        'default_values' : Array<[string, string]>,
        'name' : string,
        'parameters' : Array<
          [
            string,
            {
              'name' : string,
              'description' : string,
              'required' : boolean,
              'param_type' : string,
              'default_value' : [] | [string],
            },
          ]
        >,
        'description' : string,
        'required_capabilities' : Array<string>,
        'template_id' : string,
      },
    ],
    boolean
  >,
  'execute_pipeline_template' : ActorMethod<
    [string, string, Array<[string, string]>],
    {
        'Ok' : {
          'status' : { 'Failed' : null } |
            { 'Verified' : null } |
            { 'Pending' : null },
          'matching_results' : number,
          'verified_hash' : [] | [string],
          'created_at' : bigint,
          'error' : [] | [string],
          'executor_results' : Array<
            {
              'execution_time' : [] | [bigint],
              'hash' : [] | [string],
              'completed' : boolean,
              'error' : [] | [string],
              'executor_id' : Principal,
            }
          >,
          'completed_at' : [] | [bigint],
          'total_executors' : number,
          'consensus_threshold' : number,
        }
      } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'ExecutorFailure' : string } |
          { 'InstructionsNotFound' : string } |
          { 'ConsensusFailure' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'TimeoutError' : string } |
          { 'InternalError' : string }
      }
  >,
  'get_active_verifications' : ActorMethod<
    [],
    Array<
      [
        string,
        {
          'status' : { 'Failed' : null } |
            { 'Verified' : null } |
            { 'Pending' : null },
          'matching_results' : number,
          'verified_hash' : [] | [string],
          'created_at' : bigint,
          'error' : [] | [string],
          'executor_results' : Array<
            {
              'execution_time' : [] | [bigint],
              'hash' : [] | [string],
              'completed' : boolean,
              'error' : [] | [string],
              'executor_id' : Principal,
            }
          >,
          'completed_at' : [] | [bigint],
          'total_executors' : number,
          'consensus_threshold' : number,
        },
      ]
    >
  >,
  'get_canister_info' : ActorMethod<
    [],
    {
      'authorized_requester' : Principal,
      'active_verifications' : bigint,
      'deployed_at' : bigint,
      'build_instructions_canister' : Principal,
      'version' : string,
      'build_executor_canisters' : Array<Principal>,
      'total_verifications' : bigint,
      'admin_principal' : Principal,
    }
  >,
  'get_pipeline_instance_status' : ActorMethod<
    [string],
    [] | [
      {
        'status' : string,
        'instance_id' : string,
        'current_stage' : number,
        'error' : [] | [string],
        'template_id' : string,
        'project_id' : string,
        'completed_at' : [] | [bigint],
        'started_at' : bigint,
      }
    ]
  >,
  'get_pipeline_template' : ActorMethod<
    [string],
    [] | [
      {
        'stages' : Array<
          {
            'post_actions' : Array<string>,
            'retry_count' : number,
            'name' : string,
            'when_condition' : [] | [string],
            'steps' : Array<
              {
                'configuration' : Array<[string, string]>,
                'step_type' : string,
                'timeout_seconds' : bigint,
              }
            >,
            'parallel_group' : [] | [string],
            'timeout_minutes' : bigint,
          }
        >,
        'default_values' : Array<[string, string]>,
        'name' : string,
        'parameters' : Array<
          [
            string,
            {
              'name' : string,
              'description' : string,
              'required' : boolean,
              'param_type' : string,
              'default_value' : [] | [string],
            },
          ]
        >,
        'description' : string,
        'required_capabilities' : Array<string>,
        'template_id' : string,
      }
    ]
  >,
  'get_verification_status' : ActorMethod<
    [string, string],
    {
        'Ok' : {
          'status' : { 'Failed' : null } |
            { 'Verified' : null } |
            { 'Pending' : null },
          'matching_results' : number,
          'verified_hash' : [] | [string],
          'created_at' : bigint,
          'error' : [] | [string],
          'executor_results' : Array<
            {
              'execution_time' : [] | [bigint],
              'hash' : [] | [string],
              'completed' : boolean,
              'error' : [] | [string],
              'executor_id' : Principal,
            }
          >,
          'completed_at' : [] | [bigint],
          'total_executors' : number,
          'consensus_threshold' : number,
        }
      } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'ExecutorFailure' : string } |
          { 'InstructionsNotFound' : string } |
          { 'ConsensusFailure' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'TimeoutError' : string } |
          { 'InternalError' : string }
      }
  >,
  'list_active_pipeline_instances' : ActorMethod<[], Array<string>>,
  'list_pipeline_templates' : ActorMethod<
    [],
    Array<
      [
        string,
        {
          'stages' : Array<
            {
              'post_actions' : Array<string>,
              'retry_count' : number,
              'name' : string,
              'when_condition' : [] | [string],
              'steps' : Array<
                {
                  'configuration' : Array<[string, string]>,
                  'step_type' : string,
                  'timeout_seconds' : bigint,
                }
              >,
              'parallel_group' : [] | [string],
              'timeout_minutes' : bigint,
            }
          >,
          'default_values' : Array<[string, string]>,
          'name' : string,
          'parameters' : Array<
            [
              string,
              {
                'name' : string,
                'description' : string,
                'required' : boolean,
                'param_type' : string,
                'default_value' : [] | [string],
              },
            ]
          >,
          'description' : string,
          'required_capabilities' : Array<string>,
          'template_id' : string,
        },
      ]
    >
  >,
  'list_verification_history' : ActorMethod<
    [[] | [bigint], [] | [bigint]],
    Array<
      [
        string,
        {
          'status' : { 'Failed' : null } |
            { 'Verified' : null } |
            { 'Pending' : null },
          'matching_results' : number,
          'verified_hash' : [] | [string],
          'created_at' : bigint,
          'error' : [] | [string],
          'executor_results' : Array<
            {
              'execution_time' : [] | [bigint],
              'hash' : [] | [string],
              'completed' : boolean,
              'error' : [] | [string],
              'executor_id' : Principal,
            }
          >,
          'completed_at' : [] | [bigint],
          'total_executors' : number,
          'consensus_threshold' : number,
        },
      ]
    >
  >,
  'request_verification' : ActorMethod<
    [string, string, [] | [bigint]],
    {
        'Ok' : {
          'status' : { 'Failed' : null } |
            { 'Verified' : null } |
            { 'Pending' : null },
          'matching_results' : number,
          'verified_hash' : [] | [string],
          'created_at' : bigint,
          'error' : [] | [string],
          'executor_results' : Array<
            {
              'execution_time' : [] | [bigint],
              'hash' : [] | [string],
              'completed' : boolean,
              'error' : [] | [string],
              'executor_id' : Principal,
            }
          >,
          'completed_at' : [] | [bigint],
          'total_executors' : number,
          'consensus_threshold' : number,
        }
      } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'ExecutorFailure' : string } |
          { 'InstructionsNotFound' : string } |
          { 'ConsensusFailure' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'TimeoutError' : string } |
          { 'InternalError' : string }
      }
  >,
  'update_authorized_requester' : ActorMethod<[Principal], boolean>,
  'update_build_executor_canisters' : ActorMethod<[Array<Principal>], boolean>,
  'update_build_instructions_canister' : ActorMethod<[Principal], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
