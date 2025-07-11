import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface _SERVICE {
  'addCycles' : ActorMethod<[Principal, bigint], undefined>,
  'addNetwork' : ActorMethod<
    [
      string,
      { 'IC' : null } |
        { 'Local' : null } |
        { 'Custom' : { 'is_mainnet' : boolean, 'network_url' : string } } |
        { 'Testnet' : { 'network_url' : string } },
    ],
    undefined
  >,
  'deployCanister' : ActorMethod<
    [
      {
        'wasm_module' : Uint8Array | number[],
        'cycles_amount' : [] | [bigint],
        'reserved_cycles_limit' : [] | [bigint],
        'strategy' : { 'Upgrade' : null } |
          { 'Install' : null } |
          { 'Reinstall' : null },
        'canister_id' : [] | [Principal],
        'network' : { 'IC' : null } |
          { 'Local' : null } |
          { 'Custom' : { 'is_mainnet' : boolean, 'network_url' : string } } |
          { 'Testnet' : { 'network_url' : string } },
        'init_args' : Uint8Array | number[],
        'freeze_threshold' : [] | [bigint],
        'canister_name' : string,
        'memory_allocation' : [] | [bigint],
        'compute_allocation' : [] | [bigint],
      },
    ],
    undefined
  >,
  'getCyclesBalance' : ActorMethod<[Principal], undefined>,
  'getDeploymentStatus' : ActorMethod<[string], undefined>,
  'getLowCyclesAlerts' : ActorMethod<[], undefined>,
  'listManagedCanisters' : ActorMethod<[], undefined>,
  'listMyDeployments' : ActorMethod<[], undefined>,
  'listNetworks' : ActorMethod<[], undefined>,
  'upgradeCanister' : ActorMethod<
    [Principal, Uint8Array | number[], Uint8Array | number[]],
    undefined
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
