import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
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
