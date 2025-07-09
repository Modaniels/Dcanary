import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
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
