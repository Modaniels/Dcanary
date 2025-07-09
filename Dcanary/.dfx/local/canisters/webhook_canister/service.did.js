export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'getBuildTrigger' : IDL.Func([IDL.Text], [], ['query']),
    'getBuildTriggers' : IDL.Func([IDL.Text], [], ['query']),
    'getRepository' : IDL.Func([IDL.Text], [], ['query']),
    'handleWebhookEvent' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text, IDL.Opt(IDL.Text)],
        [],
        [],
      ),
    'listRepositoriesByProject' : IDL.Func([IDL.Text], [], ['query']),
    'registerRepository' : IDL.Func(
        [
          IDL.Text,
          IDL.Variant({ 'GitHub' : IDL.Null, 'GitLab' : IDL.Null }),
          IDL.Text,
          IDL.Text,
          IDL.Text,
          IDL.Bool,
          IDL.Bool,
          IDL.Vec(IDL.Text),
        ],
        [],
        [],
      ),
    'setVerificationCanister' : IDL.Func([IDL.Principal], [], []),
    'updateRepository' : IDL.Func(
        [IDL.Text, IDL.Bool, IDL.Bool, IDL.Vec(IDL.Text)],
        [],
        [],
      ),
  });
};
export const init = ({ IDL }) => { return []; };
