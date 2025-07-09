export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'cancelBuild' : IDL.Func([IDL.Text], [IDL.Bool], []),
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
    'getAgentCapabilities' : IDL.Func(
        [],
        [
          IDL.Record({
            'available_resources' : IDL.Record({
              'memory_mb' : IDL.Nat32,
              'network_bandwidth' : IDL.Nat32,
              'disk_space_gb' : IDL.Nat32,
              'cpu_cores' : IDL.Nat32,
            }),
            'labels' : IDL.Vec(IDL.Text),
            'max_concurrent_builds' : IDL.Nat32,
            'installed_tools' : IDL.Vec(IDL.Text),
            'supported_languages' : IDL.Vec(IDL.Text),
          }),
        ],
        ['query'],
      ),
    'getAgentHealth' : IDL.Func(
        [],
        [
          IDL.Record({
            'status' : IDL.Text,
            'active_builds' : IDL.Nat32,
            'cpu_usage' : IDL.Float32,
            'agent_id' : IDL.Principal,
            'last_heartbeat' : IDL.Nat64,
            'uptime' : IDL.Nat64,
            'queue_length' : IDL.Nat32,
            'memory_usage' : IDL.Float32,
          }),
        ],
        ['query'],
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
    'getBuildQueueStatus' : IDL.Func(
        [],
        [
          IDL.Record({
            'pending_builds' : IDL.Nat32,
            'queue_utilization' : IDL.Float32,
            'max_queue_size' : IDL.Nat32,
            'completed_builds' : IDL.Nat32,
            'running_builds' : IDL.Nat32,
          }),
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
    'getResourceUsage' : IDL.Func(
        [],
        [
          IDL.Record({
            'resource_efficiency' : IDL.Float32,
            'cpu_time_ms' : IDL.Nat64,
            'memory_peak_mb' : IDL.Nat32,
            'disk_used_gb' : IDL.Nat32,
            'network_bytes' : IDL.Nat64,
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
    'processNextBuild' : IDL.Func([], [IDL.Bool], []),
    'queueBuildRequest' : IDL.Func(
        [
          IDL.Record({
            'requester' : IDL.Principal,
            'version' : IDL.Text,
            'project_id' : IDL.Text,
          }),
        ],
        [IDL.Bool],
        [],
      ),
    'updateAgentCapabilities' : IDL.Func(
        [
          IDL.Record({
            'available_resources' : IDL.Record({
              'memory_mb' : IDL.Nat32,
              'network_bandwidth' : IDL.Nat32,
              'disk_space_gb' : IDL.Nat32,
              'cpu_cores' : IDL.Nat32,
            }),
            'labels' : IDL.Vec(IDL.Text),
            'max_concurrent_builds' : IDL.Nat32,
            'installed_tools' : IDL.Vec(IDL.Text),
            'supported_languages' : IDL.Vec(IDL.Text),
          }),
        ],
        [IDL.Bool],
        [],
      ),
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
