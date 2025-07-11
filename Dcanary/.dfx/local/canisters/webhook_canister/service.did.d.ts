import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'addBuildExecutor' : ActorMethod<[Principal], undefined>,
  'getBuildQueueStatus' : ActorMethod<[], undefined>,
  'getBuildTrigger' : ActorMethod<[string], undefined>,
  'getBuildTriggers' : ActorMethod<[string], undefined>,
  'getPipelineHistory' : ActorMethod<[string], undefined>,
  'getRepository' : ActorMethod<[string], undefined>,
  'handleWebhookEvent' : ActorMethod<
    [string, string, string, string, [] | [string]],
    undefined
  >,
  'listRepositoriesByProject' : ActorMethod<[string], undefined>,
  'registerRepository' : ActorMethod<
    [
      string,
      { 'GitHub' : null } |
        { 'GitLab' : null },
      string,
      string,
      string,
      boolean,
      boolean,
      Array<string>,
    ],
    undefined
  >,
  'setPipelineConfigCanister' : ActorMethod<[Principal], undefined>,
  'setVerificationCanister' : ActorMethod<[Principal], undefined>,
  'triggerPipelineExecution' : ActorMethod<
    [string, string, string, string, string, string],
    undefined
  >,
  'updateRepository' : ActorMethod<
    [string, boolean, boolean, Array<string>],
    undefined
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
