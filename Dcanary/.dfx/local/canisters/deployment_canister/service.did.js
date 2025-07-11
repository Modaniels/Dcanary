export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'addCycles' : IDL.Func([IDL.Principal, IDL.Nat64], [], []),
    'addNetwork' : IDL.Func(
        [
          IDL.Text,
          IDL.Variant({
            'IC' : IDL.Null,
            'Local' : IDL.Null,
            'Custom' : IDL.Record({
              'is_mainnet' : IDL.Bool,
              'network_url' : IDL.Text,
            }),
            'Testnet' : IDL.Record({ 'network_url' : IDL.Text }),
          }),
        ],
        [],
        [],
      ),
    'deployCanister' : IDL.Func(
        [
          IDL.Record({
            'wasm_module' : IDL.Vec(IDL.Nat8),
            'cycles_amount' : IDL.Opt(IDL.Nat64),
            'reserved_cycles_limit' : IDL.Opt(IDL.Nat64),
            'strategy' : IDL.Variant({
              'Upgrade' : IDL.Null,
              'Install' : IDL.Null,
              'Reinstall' : IDL.Null,
            }),
            'canister_id' : IDL.Opt(IDL.Principal),
            'network' : IDL.Variant({
              'IC' : IDL.Null,
              'Local' : IDL.Null,
              'Custom' : IDL.Record({
                'is_mainnet' : IDL.Bool,
                'network_url' : IDL.Text,
              }),
              'Testnet' : IDL.Record({ 'network_url' : IDL.Text }),
            }),
            'init_args' : IDL.Vec(IDL.Nat8),
            'freeze_threshold' : IDL.Opt(IDL.Nat64),
            'canister_name' : IDL.Text,
            'memory_allocation' : IDL.Opt(IDL.Nat64),
            'compute_allocation' : IDL.Opt(IDL.Nat64),
          }),
        ],
        [],
        [],
      ),
    'getCyclesBalance' : IDL.Func([IDL.Principal], [], ['query']),
    'getDeploymentStatus' : IDL.Func([IDL.Text], [], ['query']),
    'getLowCyclesAlerts' : IDL.Func([], [], ['query']),
    'listManagedCanisters' : IDL.Func([], [], ['query']),
    'listMyDeployments' : IDL.Func([], [], ['query']),
    'listNetworks' : IDL.Func([], [], ['query']),
    'upgradeCanister' : IDL.Func(
        [IDL.Principal, IDL.Vec(IDL.Nat8), IDL.Vec(IDL.Nat8)],
        [],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
