const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const FILE = '.aidlc/company.json';
const DEFAULTS = {
  schemaVersion: 1,
  organization: { name: null, ticketSystem: 'jira', repositoryHost: null },
  workflow: { defaultMode: 'autonomous', defaultProfile: 'feature' },
  repository: { baseBranch: null },
  quality: { requiredCommands: [], verificationTimeoutMs: 600000, maxOutputBytes: 10485760 },
  delivery: { mode: 'local-pr-draft', merge: 'human', deploy: 'human' }
};
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clone = value => JSON.parse(JSON.stringify(value));
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function merge(defaults, input, name) {
  if (!object(input)) throw new Error(`${name} must be an object.`);
  for (const key of Object.keys(input)) if (!own(defaults, key)) throw new Error(`Unknown policy field: ${name}.${key}`);
  const result = {};
  for (const [key, value] of Object.entries(defaults)) {
    result[key] = !own(input, key) ? clone(value) : object(value) ? merge(value, input[key], `${name}.${key}`) : clone(input[key]);
  }
  return result;
}
function valid(condition, name, requirement) { if (!condition) throw new Error(`Invalid ${FILE}: ${name} ${requirement}.`); }
function optionalText(value) { return value === null || typeof value === 'string' && value.trim().length > 0; }
function validate(config) {
  valid(config.schemaVersion === 1, 'schemaVersion', 'must be 1');
  valid(optionalText(config.organization.name), 'organization.name', 'must be null or nonempty text');
  valid([null, 'jira'].includes(config.organization.ticketSystem), 'organization.ticketSystem', 'must be jira or null');
  valid([null, 'github', 'gitlab', 'bitbucket'].includes(config.organization.repositoryHost), 'organization.repositoryHost', 'must name a supported host or be null');
  valid(['autonomous', 'reviewed'].includes(config.workflow.defaultMode), 'workflow.defaultMode', 'must be autonomous or reviewed');
  valid(['feature', 'bugfix', 'refactor', 'express'].includes(config.workflow.defaultProfile), 'workflow.defaultProfile', 'must name an existing profile');
  valid(optionalText(config.repository.baseBranch) && (config.repository.baseBranch === null || !/[\r\n\0]/.test(config.repository.baseBranch)), 'repository.baseBranch', 'must be null or a single branch name');
  const commands = config.quality.requiredCommands;
  valid(Array.isArray(commands) && commands.every(item => typeof item === 'string' && item.trim().length > 0 && !item.includes('\0')) && new Set(commands).size === commands.length, 'quality.requiredCommands', 'must be unique nonempty command strings');
  valid(Number.isSafeInteger(config.quality.verificationTimeoutMs) && config.quality.verificationTimeoutMs >= 1 && config.quality.verificationTimeoutMs <= 86400000, 'quality.verificationTimeoutMs', 'must be an integer from 1 to 86400000');
  valid(Number.isSafeInteger(config.quality.maxOutputBytes) && config.quality.maxOutputBytes >= 1 && config.quality.maxOutputBytes <= 67108864, 'quality.maxOutputBytes', 'must be an integer from 1 to 67108864');
  valid(['local-pr-draft', 'pull-request'].includes(config.delivery.mode), 'delivery.mode', 'must be local-pr-draft or pull-request');
  valid(config.delivery.merge === 'human' && config.delivery.deploy === 'human', 'delivery.merge/deploy', 'must remain human');
  return config;
}
function load(root) {
  let input = {}, source = 'defaults';
  const absolute = path.join(root, FILE);
  for (const name of ['.aidlc', FILE]) {
    const file = path.join(root, name);
    try { if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Policy paths cannot be symlinks: ${name}`); }
    catch (error) { if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error; }
  }
  if (fs.existsSync(absolute)) {
    if (!fs.lstatSync(absolute).isFile()) throw new Error(`${FILE} must be a regular file.`);
    try { input = JSON.parse(fs.readFileSync(absolute, 'utf8')); }
    catch { throw new Error(`Invalid JSON in ${FILE}; repair the policy before continuing.`); }
    source = FILE;
  }
  const config = validate(merge(DEFAULTS, input, 'policy'));
  const digest = crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex');
  return { config, digest, source };
}
function doctor(root) {
  const checks = [], warnings = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  const major = Number(process.versions.node.split('.')[0]);
  add('node', major >= 16, process.versions.node);
  const runGit = args => spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
  const git = runGit(['rev-parse', '--show-toplevel']);
  const sameRoot = git.status === 0 && !git.error && (process.platform === 'win32' ? path.resolve(git.stdout.trim()).toLowerCase() === path.resolve(root).toLowerCase() : path.resolve(git.stdout.trim()) === path.resolve(root));
  add('repositoryRoot', sameRoot, sameRoot ? 'Git repository root' : 'Run at a Git repository root; Markdown tracking remains available.');
  for (const name of ['AGENTS.md', '.aidlc/rules', '.aidlc/workflows', '.aidlc/agents', '.aidlc/specs/templates', '.aidlc/tools/cli.js']) {
    let ok = false;
    try { const stat = fs.lstatSync(path.join(root, name)); ok = !stat.isSymbolicLink() && (name.endsWith('.md') || name.endsWith('.js') ? stat.isFile() : stat.isDirectory()); } catch { /* reported below */ }
    add(name, ok, ok ? 'Present' : 'Missing or linked portable entry');
  }
  let loaded;
  try { loaded = load(root); add('policy', true, loaded.source); }
  catch (error) { add('policy', false, error.message); }
  if (loaded) {
    const { config } = loaded;
    if (loaded.source === 'defaults') warnings.push('No company.json: compatibility defaults apply.');
    if (!config.organization.name) warnings.push('Organization name is not configured.');
    if (!config.organization.repositoryHost) warnings.push('Repository provider is not configured.');
    if (!config.organization.ticketSystem) warnings.push('Ticket provider is not configured.');
    if (!config.repository.baseBranch) warnings.push('Target branch is not configured; discover it from repository policy before publication.');
    else if (sameRoot) {
      const branch = runGit(['check-ref-format', '--branch', config.repository.baseBranch]);
      add('baseBranchFormat', branch.status === 0 && !branch.error, branch.status === 0 ? 'Valid Git branch syntax; existence and remote access not checked.' : 'Invalid configured Git branch name.');
    }
    if (!config.quality.requiredCommands.length) warnings.push('Company-wide check commands are not configured; discover actual project/CI checks and record them in each plan.');
    if (config.delivery.mode === 'pull-request' && config.organization.repositoryHost !== 'github') warnings.push('The bundled publication workflow targets GitHub; adapt it for the selected provider.');
  }
  warnings.push('Offline diagnostic only: Jira/GitHub credentials, permissions, remote branches, PR reviews and CI have not been checked. No project check command was executed.');
  return { ok: checks.every(check => check.ok), checks, warnings, policy: loaded || null, integrationStatus: 'not-checked' };
}
module.exports = { load, doctor };
