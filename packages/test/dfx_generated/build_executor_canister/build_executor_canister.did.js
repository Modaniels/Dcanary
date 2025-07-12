export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'executeBuild' : IDL.Func(
        [IDL.Text, IDL.Text],
        [
          IDL.Variant({
            'Ok' : IDL.Record({
              'build_time' : IDL.Nat64,
              'artifact_size' : IDL.Nat32,
              'hash' : IDL.Text,
              'error' : IDL.Text,
              'cycles_consumed' : IDL.Nat64,
              'success' : IDL.Bool,
            }),
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'SecurityViolation' : IDL.Text,
              'ResourceExhausted' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        [],
      ),
    'getBuildHistory' : IDL.Func(
        [IDL.Opt(IDL.Nat32), IDL.Opt(IDL.Nat32)],
        [
          IDL.Vec(
            IDL.Record({
              'build_time' : IDL.Nat64,
              'artifact_size' : IDL.Nat32,
              'hash' : IDL.Text,
              'error' : IDL.Text,
              'cycles_consumed' : IDL.Nat64,
              'success' : IDL.Bool,
            })
          ),
        ],
        ['query'],
      ),
    'getHash' : IDL.Func(
        [],
        [
          IDL.Variant({
            'Ok' : IDL.Text,
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'SecurityViolation' : IDL.Text,
              'ResourceExhausted' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        ['query'],
      ),
    'getStatistics' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_builds' : IDL.Nat32,
            'successful_builds' : IDL.Nat32,
            'canister_version' : IDL.Text,
            'verification_canister' : IDL.Principal,
            'deployed_at' : IDL.Nat64,
            'build_instructions_canister' : IDL.Principal,
            'failed_builds' : IDL.Nat32,
            'last_successful_hash' : IDL.Text,
          }),
        ],
        ['query'],
      ),
    'healthCheck' : IDL.Func([], [IDL.Text], ['query']),
    'updateBuildInstructionsCanister' : IDL.Func(
        [IDL.Principal],
        [
          IDL.Variant({
            'Ok' : IDL.Null,
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'SecurityViolation' : IDL.Text,
              'ResourceExhausted' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        [],
      ),
    'updateVerificationCanister' : IDL.Func(
        [IDL.Principal],
        [
          IDL.Variant({
            'Ok' : IDL.Null,
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'SecurityViolation' : IDL.Text,
              'ResourceExhausted' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
