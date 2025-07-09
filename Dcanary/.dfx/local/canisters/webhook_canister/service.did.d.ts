import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'getBuildTrigger' : ActorMethod<[string], undefined>,
  'getBuildTriggers' : ActorMethod<[string], undefined>,
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
  'setVerificationCanister' : ActorMethod<[Principal], undefined>,
  'updateRepository' : ActorMethod<
    [string, boolean, boolean, Array<string>],
    undefined
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
