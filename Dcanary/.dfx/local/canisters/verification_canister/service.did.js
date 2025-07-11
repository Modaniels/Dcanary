export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'approveDeployment' : IDL.Func(
        [IDL.Text, IDL.Bool, IDL.Opt(IDL.Text)],
        [],
        [],
      ),
    'configureDeploymentApproval' : IDL.Func(
        [
          IDL.Record({
            'repository_id' : IDL.Text,
            'pipeline_id' : IDL.Text,
            'min_approvals' : IDL.Nat8,
            'block_on_verification_failure' : IDL.Bool,
            'required_approvers' : IDL.Vec(IDL.Principal),
            'approval_status' : IDL.Variant({
              'Approved' : IDL.Record({ 'approved_at' : IDL.Nat64 }),
              'Rejected' : IDL.Record({
                'rejected_by' : IDL.Principal,
                'reason' : IDL.Text,
              }),
              'Expired' : IDL.Record({ 'expired_at' : IDL.Nat64 }),
              'Pending' : IDL.Record({
                'pending_approvers' : IDL.Vec(IDL.Principal),
              }),
            }),
            'approval_timeout_hours' : IDL.Nat32,
            'auto_approve_on_quality_gates' : IDL.Bool,
          }),
        ],
        [],
        [],
      ),
    'create_pipeline_template' : IDL.Func(
        [
          IDL.Text,
          IDL.Record({
            'stages' : IDL.Vec(
              IDL.Record({
                'post_actions' : IDL.Vec(IDL.Text),
                'retry_count' : IDL.Nat8,
                'name' : IDL.Text,
                'when_condition' : IDL.Opt(IDL.Text),
                'steps' : IDL.Vec(
                  IDL.Record({
                    'configuration' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
                    'step_type' : IDL.Text,
                    'timeout_seconds' : IDL.Nat64,
                  })
                ),
                'parallel_group' : IDL.Opt(IDL.Text),
                'timeout_minutes' : IDL.Nat64,
              })
            ),
            'default_values' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
            'name' : IDL.Text,
            'parameters' : IDL.Vec(
              IDL.Tuple(
                IDL.Text,
                IDL.Record({
                  'name' : IDL.Text,
                  'description' : IDL.Text,
                  'required' : IDL.Bool,
                  'param_type' : IDL.Text,
                  'default_value' : IDL.Opt(IDL.Text),
                }),
              )
            ),
            'description' : IDL.Text,
            'required_capabilities' : IDL.Vec(IDL.Text),
            'template_id' : IDL.Text,
          }),
        ],
        [IDL.Bool],
        [],
      ),
    'execute_pipeline_template' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
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
    'getPipelineVerification' : IDL.Func([IDL.Text], [], ['query']),
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
    'get_pipeline_instance_status' : IDL.Func(
        [IDL.Text],
        [
          IDL.Opt(
            IDL.Record({
              'status' : IDL.Text,
              'instance_id' : IDL.Text,
              'current_stage' : IDL.Nat32,
              'error' : IDL.Opt(IDL.Text),
              'template_id' : IDL.Text,
              'project_id' : IDL.Text,
              'completed_at' : IDL.Opt(IDL.Nat64),
              'started_at' : IDL.Nat64,
            })
          ),
        ],
        ['query'],
      ),
    'get_pipeline_template' : IDL.Func(
        [IDL.Text],
        [
          IDL.Opt(
            IDL.Record({
              'stages' : IDL.Vec(
                IDL.Record({
                  'post_actions' : IDL.Vec(IDL.Text),
                  'retry_count' : IDL.Nat8,
                  'name' : IDL.Text,
                  'when_condition' : IDL.Opt(IDL.Text),
                  'steps' : IDL.Vec(
                    IDL.Record({
                      'configuration' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
                      'step_type' : IDL.Text,
                      'timeout_seconds' : IDL.Nat64,
                    })
                  ),
                  'parallel_group' : IDL.Opt(IDL.Text),
                  'timeout_minutes' : IDL.Nat64,
                })
              ),
              'default_values' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
              'name' : IDL.Text,
              'parameters' : IDL.Vec(
                IDL.Tuple(
                  IDL.Text,
                  IDL.Record({
                    'name' : IDL.Text,
                    'description' : IDL.Text,
                    'required' : IDL.Bool,
                    'param_type' : IDL.Text,
                    'default_value' : IDL.Opt(IDL.Text),
                  }),
                )
              ),
              'description' : IDL.Text,
              'required_capabilities' : IDL.Vec(IDL.Text),
              'template_id' : IDL.Text,
            })
          ),
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
    'listPipelineVerifications' : IDL.Func([IDL.Text], [], ['query']),
    'list_active_pipeline_instances' : IDL.Func(
        [],
        [IDL.Vec(IDL.Text)],
        ['query'],
      ),
    'list_pipeline_templates' : IDL.Func(
        [],
        [
          IDL.Vec(
            IDL.Tuple(
              IDL.Text,
              IDL.Record({
                'stages' : IDL.Vec(
                  IDL.Record({
                    'post_actions' : IDL.Vec(IDL.Text),
                    'retry_count' : IDL.Nat8,
                    'name' : IDL.Text,
                    'when_condition' : IDL.Opt(IDL.Text),
                    'steps' : IDL.Vec(
                      IDL.Record({
                        'configuration' : IDL.Vec(
                          IDL.Tuple(IDL.Text, IDL.Text)
                        ),
                        'step_type' : IDL.Text,
                        'timeout_seconds' : IDL.Nat64,
                      })
                    ),
                    'parallel_group' : IDL.Opt(IDL.Text),
                    'timeout_minutes' : IDL.Nat64,
                  })
                ),
                'default_values' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
                'name' : IDL.Text,
                'parameters' : IDL.Vec(
                  IDL.Tuple(
                    IDL.Text,
                    IDL.Record({
                      'name' : IDL.Text,
                      'description' : IDL.Text,
                      'required' : IDL.Bool,
                      'param_type' : IDL.Text,
                      'default_value' : IDL.Opt(IDL.Text),
                    }),
                  )
                ),
                'description' : IDL.Text,
                'required_capabilities' : IDL.Vec(IDL.Text),
                'template_id' : IDL.Text,
              }),
            )
          ),
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
    'setQualityGates' : IDL.Func(
        [
          IDL.Text,
          IDL.Vec(
            IDL.Record({
              'name' : IDL.Text,
              'required' : IDL.Bool,
              'gate_type' : IDL.Variant({
                'TestCoverage' : IDL.Record({ 'min_percentage' : IDL.Float32 }),
                'CodeQuality' : IDL.Record({ 'max_violations' : IDL.Nat32 }),
                'PerformanceTest' : IDL.Record({
                  'max_response_time_ms' : IDL.Nat32,
                }),
                'SecurityScan' : IDL.Record({
                  'max_vulnerabilities' : IDL.Nat32,
                }),
                'CustomCheck' : IDL.Record({
                  'expected_output' : IDL.Text,
                  'check_command' : IDL.Text,
                }),
              }),
              'timeout_seconds' : IDL.Nat32,
            })
          ),
        ],
        [],
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
    'verifyPipelineExecution' : IDL.Func(
        [
          IDL.Record({
            'branch' : IDL.Text,
            'required_consensus' : IDL.Nat8,
            'pipeline_config' : IDL.Text,
            'repository_id' : IDL.Text,
            'pipeline_id' : IDL.Text,
            'executor_results' : IDL.Vec(
              IDL.Record({
                'stage_results' : IDL.Vec(
                  IDL.Record({
                    'artifacts' : IDL.Vec(
                      IDL.Tuple(IDL.Text, IDL.Vec(IDL.Nat8))
                    ),
                    'execution_time' : IDL.Nat64,
                    'metadata' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
                    'cycles_consumed' : IDL.Nat64,
                    'success' : IDL.Bool,
                    'stage_name' : IDL.Text,
                  })
                ),
                'executor_id' : IDL.Principal,
              })
            ),
            'commit_hash' : IDL.Text,
          }),
        ],
        [],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
