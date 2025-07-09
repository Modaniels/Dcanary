export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'get_active_verifications' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Tuple(
              IDL.Text,
              IDL.Record({
                'status' : IDL.Variant({
                  'Failed' : IDL.Null,
                  'Verified' : IDL.Null,
                  'Pending' : IDL.Null,
                }),
                'matching_results' : IDL.Nat8,
                'verified_hash' : IDL.Opt(IDL.Text),
                'created_at' : IDL.Nat64,
                'error' : IDL.Opt(IDL.Text),
                'executor_results' : IDL.Vec(
                  IDL.Record({
                    'execution_time' : IDL.Opt(IDL.Nat64),
                    'hash' : IDL.Opt(IDL.Text),
                    'completed' : IDL.Bool,
                    'error' : IDL.Opt(IDL.Text),
                    'executor_id' : IDL.Principal,
                  })
                ),
                'completed_at' : IDL.Opt(IDL.Nat64),
                'total_executors' : IDL.Nat8,
                'consensus_threshold' : IDL.Nat8,
              }),
            )
          ),
        ],
        ['query'],
      ),
    'get_canister_info' : IDL.Func(
        [],
        [
          IDL.Record({
            'authorized_requester' : IDL.Principal,
            'active_verifications' : IDL.Nat64,
            'deployed_at' : IDL.Nat64,
            'build_instructions_canister' : IDL.Principal,
            'version' : IDL.Text,
            'build_executor_canisters' : IDL.Vec(IDL.Principal),
            'total_verifications' : IDL.Nat64,
            'admin_principal' : IDL.Principal,
          }),
        ],
        ['query'],
      ),
    'get_verification_status' : IDL.Func(
        [IDL.Text, IDL.Text],
        [
          IDL.Variant({
            'Ok' : IDL.Record({
              'status' : IDL.Variant({
                'Failed' : IDL.Null,
                'Verified' : IDL.Null,
                'Pending' : IDL.Null,
              }),
              'matching_results' : IDL.Nat8,
              'verified_hash' : IDL.Opt(IDL.Text),
              'created_at' : IDL.Nat64,
              'error' : IDL.Opt(IDL.Text),
              'executor_results' : IDL.Vec(
                IDL.Record({
                  'execution_time' : IDL.Opt(IDL.Nat64),
                  'hash' : IDL.Opt(IDL.Text),
                  'completed' : IDL.Bool,
                  'error' : IDL.Opt(IDL.Text),
                  'executor_id' : IDL.Principal,
                })
              ),
              'completed_at' : IDL.Opt(IDL.Nat64),
              'total_executors' : IDL.Nat8,
              'consensus_threshold' : IDL.Nat8,
            }),
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'ExecutorFailure' : IDL.Text,
              'InstructionsNotFound' : IDL.Text,
              'ConsensusFailure' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'TimeoutError' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        ['query'],
      ),
    'list_verification_history' : IDL.Func(
        [IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)],
        [
          IDL.Vec(
            IDL.Tuple(
              IDL.Text,
              IDL.Record({
                'status' : IDL.Variant({
                  'Failed' : IDL.Null,
                  'Verified' : IDL.Null,
                  'Pending' : IDL.Null,
                }),
                'matching_results' : IDL.Nat8,
                'verified_hash' : IDL.Opt(IDL.Text),
                'created_at' : IDL.Nat64,
                'error' : IDL.Opt(IDL.Text),
                'executor_results' : IDL.Vec(
                  IDL.Record({
                    'execution_time' : IDL.Opt(IDL.Nat64),
                    'hash' : IDL.Opt(IDL.Text),
                    'completed' : IDL.Bool,
                    'error' : IDL.Opt(IDL.Text),
                    'executor_id' : IDL.Principal,
                  })
                ),
                'completed_at' : IDL.Opt(IDL.Nat64),
                'total_executors' : IDL.Nat8,
                'consensus_threshold' : IDL.Nat8,
              }),
            )
          ),
        ],
        ['query'],
      ),
    'request_verification' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Opt(IDL.Nat64)],
        [
          IDL.Variant({
            'Ok' : IDL.Record({
              'status' : IDL.Variant({
                'Failed' : IDL.Null,
                'Verified' : IDL.Null,
                'Pending' : IDL.Null,
              }),
              'matching_results' : IDL.Nat8,
              'verified_hash' : IDL.Opt(IDL.Text),
              'created_at' : IDL.Nat64,
              'error' : IDL.Opt(IDL.Text),
              'executor_results' : IDL.Vec(
                IDL.Record({
                  'execution_time' : IDL.Opt(IDL.Nat64),
                  'hash' : IDL.Opt(IDL.Text),
                  'completed' : IDL.Bool,
                  'error' : IDL.Opt(IDL.Text),
                  'executor_id' : IDL.Principal,
                })
              ),
              'completed_at' : IDL.Opt(IDL.Nat64),
              'total_executors' : IDL.Nat8,
              'consensus_threshold' : IDL.Nat8,
            }),
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'ExecutorFailure' : IDL.Text,
              'InstructionsNotFound' : IDL.Text,
              'ConsensusFailure' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'TimeoutError' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        [],
      ),
    'update_authorized_requester' : IDL.Func([IDL.Principal], [IDL.Bool], []),
    'update_build_executor_canisters' : IDL.Func(
        [IDL.Vec(IDL.Principal)],
        [IDL.Bool],
        [],
      ),
    'update_build_instructions_canister' : IDL.Func(
        [IDL.Principal],
        [IDL.Bool],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
