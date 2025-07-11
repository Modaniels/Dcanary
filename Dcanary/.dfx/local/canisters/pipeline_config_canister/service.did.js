export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'addPipelineStage' : IDL.Func(
        [
          IDL.Text,
          IDL.Record({
            'artifacts' : IDL.Vec(IDL.Text),
            'retry_count' : IDL.Nat8,
            'name' : IDL.Text,
            'resource_requirements' : IDL.Record({
              'memory_mb' : IDL.Nat32,
              'max_cycles' : IDL.Nat64,
              'storage_mb' : IDL.Nat32,
              'cpu_cores' : IDL.Nat8,
            }),
            'parallel_group' : IDL.Opt(IDL.Text),
            'depends_on' : IDL.Vec(IDL.Text),
            'cache_paths' : IDL.Vec(IDL.Text),
            'environment' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
            'commands' : IDL.Vec(IDL.Text),
            'timeout_minutes' : IDL.Nat64,
            'runtime' : IDL.Text,
          }),
        ],
        [],
        [],
      ),
    'createFromTemplate' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text],
        [],
        [],
      ),
    'deletePipeline' : IDL.Func([IDL.Text], [], []),
    'getPipelineConfig' : IDL.Func([IDL.Text], [], ['query']),
    'listAllPipelines' : IDL.Func([], [], ['query']),
    'listMyPipelines' : IDL.Func([], [], ['query']),
    'listTemplates' : IDL.Func([], [], ['query']),
    'registerPipeline' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [],
        [],
      ),
    'setPipelineEnvironment' : IDL.Func(
        [IDL.Text, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
        [],
        [],
      ),
    'updatePipelineConfig' : IDL.Func(
        [
          IDL.Text,
          IDL.Record({
            'stages' : IDL.Vec(
              IDL.Record({
                'artifacts' : IDL.Vec(IDL.Text),
                'retry_count' : IDL.Nat8,
                'name' : IDL.Text,
                'resource_requirements' : IDL.Record({
                  'memory_mb' : IDL.Nat32,
                  'max_cycles' : IDL.Nat64,
                  'storage_mb' : IDL.Nat32,
                  'cpu_cores' : IDL.Nat8,
                }),
                'parallel_group' : IDL.Opt(IDL.Text),
                'depends_on' : IDL.Vec(IDL.Text),
                'cache_paths' : IDL.Vec(IDL.Text),
                'environment' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
                'commands' : IDL.Vec(IDL.Text),
                'timeout_minutes' : IDL.Nat64,
                'runtime' : IDL.Text,
              })
            ),
            'updated_at' : IDL.Nat64,
            'repository_id' : IDL.Text,
            'networks' : IDL.Vec(
              IDL.Record({
                'is_mainnet' : IDL.Bool,
                'default_gas_price' : IDL.Opt(IDL.Nat64),
                'name' : IDL.Text,
                'provider_url' : IDL.Text,
              })
            ),
            'notifications' : IDL.Record({
              'notify_on_failure' : IDL.Bool,
              'slack_webhook' : IDL.Opt(IDL.Text),
              'discord_webhook' : IDL.Opt(IDL.Text),
              'email_recipients' : IDL.Vec(IDL.Text),
              'notify_on_success' : IDL.Bool,
              'notify_on_start' : IDL.Bool,
            }),
            'repository_url' : IDL.Text,
            'owner' : IDL.Principal,
            'name' : IDL.Text,
            'global_environment' : IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
            'description' : IDL.Opt(IDL.Text),
            'created_at' : IDL.Nat64,
            'version' : IDL.Nat32,
            'is_active' : IDL.Bool,
            'triggers' : IDL.Vec(
              IDL.Variant({
                'Release' : IDL.Record({ 'tag_pattern' : IDL.Opt(IDL.Text) }),
                'Push' : IDL.Record({ 'branches' : IDL.Vec(IDL.Text) }),
                'PullRequest' : IDL.Record({
                  'target_branches' : IDL.Vec(IDL.Text),
                }),
                'Schedule' : IDL.Record({ 'cron_expression' : IDL.Text }),
                'Manual' : IDL.Null,
              })
            ),
          }),
        ],
        [],
        [],
      ),
    'updatePipelineTriggers' : IDL.Func(
        [
          IDL.Text,
          IDL.Vec(
            IDL.Variant({
              'Release' : IDL.Record({ 'tag_pattern' : IDL.Opt(IDL.Text) }),
              'Push' : IDL.Record({ 'branches' : IDL.Vec(IDL.Text) }),
              'PullRequest' : IDL.Record({
                'target_branches' : IDL.Vec(IDL.Text),
              }),
              'Schedule' : IDL.Record({ 'cron_expression' : IDL.Text }),
              'Manual' : IDL.Null,
            })
          ),
        ],
        [],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
