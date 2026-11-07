#!/usr/bin/env node
// Maintenance helper: copy the portable kit without overwriting target files.
const fs = require('fs');
const path = require('path');
const SOURCE = path.resolve(__dirname, '..', 'kit');

function noSymlinkAncestors(target) {
  const absolute = path.resolve(target);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`Refusing to write through a symlink: ${current}`);
  }
}

function copyKit(destination) {
  if (!destination) throw new Error('Usage: node scripts/copy-kit.js <target-project-root>');
  const target = path.resolve(destination);
  const relative = path.relative(SOURCE, target);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('The destination cannot be inside the source kit.');
  noSymlinkAncestors(target);
  const result = { copied: [], skipped: [] };
  function copy(source, output) {
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error(`Source symlinks are not supported: ${source}`);
    if (stat.isDirectory()) {
      noSymlinkAncestors(output);
      if (fs.existsSync(output) && !fs.statSync(output).isDirectory()) throw new Error(`Directory conflicts with an existing file: ${output}`);
      fs.mkdirSync(output, { recursive: true });
      for (const name of fs.readdirSync(source)) copy(path.join(source, name), path.join(output, name));
    } else {
      const name = path.relative(target, output).split(path.sep).join('/');
      if (fs.existsSync(output) || (() => { try { fs.lstatSync(output); return true; } catch { return false; } })()) result.skipped.push(name);
      else { fs.copyFileSync(source, output, fs.constants.COPYFILE_EXCL); result.copied.push(name); }
    }
  }
  const entries = fs.readdirSync(SOURCE).sort();
  if (JSON.stringify(entries) !== JSON.stringify(['.aidlc', 'AGENTS.md'])) throw new Error('Kit payload must contain only AGENTS.md and .aidlc/.');
  for (const name of entries) copy(path.join(SOURCE, name), path.join(target, name));
  return result;
}

if (require.main === module) {
  try {
    const result = copyKit(process.argv[2]);
    console.log(`Copied ${result.copied.length} files. Preserved ${result.skipped.length} existing files.`);
    if (result.skipped.length) console.log('Review and merge these files manually:\n' + result.skipped.join('\n'));
    console.log('No project dependency manifests or Git hooks were changed. Start with .aidlc/docs/AI_DLC_START_HERE.md in the target project.');
  } catch (error) { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
}

module.exports = { copyKit };
