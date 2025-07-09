export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'addInstructions' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text],
        [
          IDL.Variant({
            'Ok' : IDL.Null,
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        [],
      ),
    'addMultipleInstructions' : IDL.Func(
        [
          IDL.Vec(
            IDL.Record({
              'version' : IDL.Text,
              'instruction_set' : IDL.Text,
              'project_id' : IDL.Text,
            })
          ),
        ],
        [
          IDL.Vec(
            IDL.Variant({
              'Ok' : IDL.Null,
              'Err' : IDL.Variant({
                'InvalidInput' : IDL.Text,
                'NotFound' : IDL.Text,
                'Unauthorized' : IDL.Text,
                'InternalError' : IDL.Text,
              }),
            })
          ),
        ],
        [],
      ),
    'getAllInstructions' : IDL.Func(
        [IDL.Opt(IDL.Nat32), IDL.Opt(IDL.Nat32)],
        [
          IDL.Vec(
            IDL.Record({
              'updated_at' : IDL.Nat64,
              'created_at' : IDL.Nat64,
              'created_by' : IDL.Principal,
              'version' : IDL.Text,
              'instruction_set' : IDL.Text,
              'project_id' : IDL.Text,
            })
          ),
        ],
        ['query'],
      ),
    'getCanisterInfo' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_instructions' : IDL.Nat32,
            'deployed_at' : IDL.Nat64,
            'version' : IDL.Text,
            'admin_principal' : IDL.Principal,
          }),
        ],
        ['query'],
      ),
    'getInstructions' : IDL.Func(
        [IDL.Text, IDL.Text],
        [
          IDL.Variant({
            'Ok' : IDL.Record({
              'updated_at' : IDL.Nat64,
              'created_at' : IDL.Nat64,
              'created_by' : IDL.Principal,
              'version' : IDL.Text,
              'instruction_set' : IDL.Text,
              'project_id' : IDL.Text,
            }),
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        ['query'],
      ),
    'getInstructionsByProject' : IDL.Func(
        [IDL.Text],
        [
          IDL.Vec(
            IDL.Record({
              'updated_at' : IDL.Nat64,
              'created_at' : IDL.Nat64,
              'created_by' : IDL.Principal,
              'version' : IDL.Text,
              'instruction_set' : IDL.Text,
              'project_id' : IDL.Text,
            })
          ),
        ],
        ['query'],
      ),
    'getStatistics' : IDL.Func(
        [],
        [
          IDL.Record({
            'oldest_instruction' : IDL.Opt(IDL.Nat64),
            'newest_instruction' : IDL.Opt(IDL.Nat64),
            'canister_version' : IDL.Text,
            'total_instructions' : IDL.Nat32,
            'deployed_at' : IDL.Nat64,
            'total_projects' : IDL.Nat32,
            'admin_principal' : IDL.Principal,
          }),
        ],
        ['query'],
      ),
    'healthCheck' : IDL.Func([], [IDL.Text], ['query']),
    'instructionsExist' : IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], ['query']),
    'listProjects' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'listVersions' : IDL.Func([IDL.Text], [IDL.Vec(IDL.Text)], ['query']),
    'removeInstructions' : IDL.Func(
        [IDL.Text, IDL.Text],
        [
          IDL.Variant({
            'Ok' : IDL.Null,
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        [],
      ),
    'updateAdmin' : IDL.Func(
        [IDL.Principal],
        [
          IDL.Variant({
            'Ok' : IDL.Null,
            'Err' : IDL.Variant({
              'InvalidInput' : IDL.Text,
              'NotFound' : IDL.Text,
              'Unauthorized' : IDL.Text,
              'InternalError' : IDL.Text,
            }),
          }),
        ],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
