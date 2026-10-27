#!/usr/bin/env node
// Stand-in for the `gh` CLI. The tests copy it onto PATH as `gh`.
// State lives in the JSON file named by FAKE_GH_STATE:
//   { login, id, issues: { "<n>": { number, state, labels: [names], pull_request? } },
//     comments: { "<n>": [ { user: { login, id }, body } ] }, prs: [] }
// Every call is appended to the file named by FAKE_GH_LOG as one JSON line.
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const statePath = process.env.FAKE_GH_STATE;
const state = JSON.parse(readFileSync(statePath, 'utf8'));
const args = process.argv.slice(2);
if (process.env.FAKE_GH_LOG) appendFileSync(process.env.FAKE_GH_LOG, JSON.stringify(args) + '\n');
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (msg) => {
  process.stderr.write(msg + '\n');
  process.exit(1);
};
const labelObjs = (issue) => issue.labels.map((name) => ({ name }));

if (args[0] === 'api') {
  const path = args.find((a) => a.startsWith('repos/'));
  const slurp = args.includes('--slurp');
  let m;
  if ((m = /^repos\/[^/]+\/[^/]+\/issues\/(\d+)\/comments$/.exec(path))) {
    const list = state.comments[m[1]] || [];
    process.stdout.write(JSON.stringify(slurp ? [list] : list));
  } else if ((m = /^repos\/[^/]+\/[^/]+\/issues\/(\d+)$/.exec(path))) {
    const issue = state.issues[m[1]];
    if (!issue) fail('HTTP 404: Not Found');
    process.stdout.write(JSON.stringify({ ...issue, labels: labelObjs(issue) }));
  } else if (/^repos\/[^/]+\/[^/]+\/issues\?/.test(path)) {
    const list = Object.values(state.issues).filter((i) => i.state === 'open').map((i) => ({ ...i, labels: labelObjs(i) }));
    process.stdout.write(JSON.stringify(slurp ? [list] : list));
  } else fail(`fake gh: unknown api path ${path}`);
} else if (args[0] === 'issue' && args[1] === 'comment') {
  const n = args[2];
  if (!state.issues[n]) fail('issue not found');
  const body = readFileSync(flag('--body-file'), 'utf8');
  (state.comments[n] ||= []).push({ user: { login: state.login, id: state.id }, body });
  save();
  process.stdout.write(`https://github.com/acme/notebook-app/issues/${n}#issuecomment-1\n`);
} else if (args[0] === 'issue' && args[1] === 'edit') {
  const issue = state.issues[args[2]];
  if (!issue) fail('issue not found');
  const add = flag('--add-label');
  const remove = flag('--remove-label');
  if (remove) issue.labels = issue.labels.filter((l) => !remove.split(',').includes(l));
  if (add) for (const l of add.split(',')) if (!issue.labels.includes(l)) issue.labels.push(l);
  save();
} else if (args[0] === 'pr' && args[1] === 'create') {
  if (!args.includes('--draft')) fail('fake gh: non-draft PR');
  state.prs = state.prs || [];
  state.prs.push({ head: flag('--head'), base: flag('--base'), title: flag('--title'), body: readFileSync(flag('--body-file'), 'utf8') });
  save();
  process.stdout.write(`https://github.com/acme/notebook-app/pull/${state.prs.length}\n`);
} else fail(`fake gh: unsupported ${args.join(' ')}`);
