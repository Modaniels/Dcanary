import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'approveDeployment' : ActorMethod<
    [string, boolean, [] | [string]],
    undefined
  >,
  'configureDeploymentApproval' : ActorMethod<
    [
      {
        'repository_id' : string,
        'pipeline_id' : string,
        'min_approvals' : number,
        'block_on_verification_failure' : boolean,
        'required_approvers' : Array<Principal>,
        'approval_status' : { 'Approved' : { 'approved_at' : bigint } } |
          { 'Rejected' : { 'rejected_by' : Principal, 'reason' : string } } |
          { 'Expired' : { 'expired_at' : bigint } } |
          { 'Pending' : { 'pending_approvers' : Array<Principal> } },
        'approval_timeout_hours' : number,
        'auto_approve_on_quality_gates' : boolean,
      },
    ],
    undefined
  >,
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
  'getPipelineVerification' : ActorMethod<[string], undefined>,
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
  'listPipelineVerifications' : ActorMethod<[string], undefined>,
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
  'setQualityGates' : ActorMethod<
    [
      string,
      Array<
        {
          'name' : string,
          'required' : boolean,
          'gate_type' : { 'TestCoverage' : { 'min_percentage' : number } } |
            { 'CodeQuality' : { 'max_violations' : number } } |
            { 'PerformanceTest' : { 'max_response_time_ms' : number } } |
            { 'SecurityScan' : { 'max_vulnerabilities' : number } } |
            {
              'CustomCheck' : {
                'expected_output' : string,
                'check_command' : string,
              }
            },
          'timeout_seconds' : number,
        }
      >,
    ],
    undefined
  >,
  'update_authorized_requester' : ActorMethod<[Principal], boolean>,
  'update_build_executor_canisters' : ActorMethod<[Array<Principal>], boolean>,
  'update_build_instructions_canister' : ActorMethod<[Principal], boolean>,
  'verifyPipelineExecution' : ActorMethod<
    [
      {
        'branch' : string,
        'required_consensus' : number,
        'pipeline_config' : string,
        'repository_id' : string,
        'pipeline_id' : string,
        'executor_results' : Array<
          {
            'stage_results' : Array<
              {
                'artifacts' : Array<[string, Uint8Array | number[]]>,
                'execution_time' : bigint,
                'metadata' : Array<[string, string]>,
                'cycles_consumed' : bigint,
                'success' : boolean,
                'stage_name' : string,
              }
            >,
            'executor_id' : Principal,
          }
        >,
        'commit_hash' : string,
      },
    ],
    undefined
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
