import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'addInstructions' : ActorMethod<
    [string, string, string],
    { 'Ok' : null } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'InternalError' : string }
      }
  >,
  'addMultipleInstructions' : ActorMethod<
    [
      Array<
        {
          'version' : string,
          'instruction_set' : string,
          'project_id' : string,
        }
      >,
    ],
    Array<
      { 'Ok' : null } |
        {
          'Err' : { 'InvalidInput' : string } |
            { 'NotFound' : string } |
            { 'Unauthorized' : string } |
            { 'InternalError' : string }
        }
    >
  >,
  'getAllInstructions' : ActorMethod<
    [[] | [number], [] | [number]],
    Array<
      {
        'updated_at' : bigint,
        'created_at' : bigint,
        'created_by' : Principal,
        'version' : string,
        'instruction_set' : string,
        'project_id' : string,
      }
    >
  >,
  'getCanisterInfo' : ActorMethod<
    [],
    {
      'total_instructions' : number,
      'deployed_at' : bigint,
      'version' : string,
      'admin_principal' : Principal,
    }
  >,
  'getInstructions' : ActorMethod<
    [string, string],
    {
        'Ok' : {
          'updated_at' : bigint,
          'created_at' : bigint,
          'created_by' : Principal,
          'version' : string,
          'instruction_set' : string,
          'project_id' : string,
        }
      } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'InternalError' : string }
      }
  >,
  'getInstructionsByProject' : ActorMethod<
    [string],
    Array<
      {
        'updated_at' : bigint,
        'created_at' : bigint,
        'created_by' : Principal,
        'version' : string,
        'instruction_set' : string,
        'project_id' : string,
      }
    >
  >,
  'getStatistics' : ActorMethod<
    [],
    {
      'oldest_instruction' : [] | [bigint],
      'newest_instruction' : [] | [bigint],
      'canister_version' : string,
      'total_instructions' : number,
      'deployed_at' : bigint,
      'total_projects' : number,
      'admin_principal' : Principal,
    }
  >,
  'healthCheck' : ActorMethod<[], string>,
  'instructionsExist' : ActorMethod<[string, string], boolean>,
  'listProjects' : ActorMethod<[], Array<string>>,
  'listVersions' : ActorMethod<[string], Array<string>>,
  'removeInstructions' : ActorMethod<
    [string, string],
    { 'Ok' : null } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'InternalError' : string }
      }
  >,
  'updateAdmin' : ActorMethod<
    [Principal],
    { 'Ok' : null } |
      {
        'Err' : { 'InvalidInput' : string } |
          { 'NotFound' : string } |
          { 'Unauthorized' : string } |
          { 'InternalError' : string }
      }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
