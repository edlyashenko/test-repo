// Read-only comparison with an untouched extraction of the same kit version.
import * as fs from 'node:fs';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ignoredDirectories = new Set(['node_modules', '.git']);
const ignoredFiles = new Set(['.DS_Store', 'Thumbs.db']);

function checkedRoot(input) {
  const root = resolve(input);
  // Reject symbolic links in the root and its ancestors as well as inside the tree.
  let current = parse(root).root;
  for (const part of root.slice(current.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw Error(`Symbolic link is not allowed: ${current}`);
  }
  if (!fs.lstatSync(root).isDirectory()) throw Error(`Not a kit directory: ${root}`);
  const manifestPath = join(root, 'package.json');
  const manifestStat = fs.lstatSync(manifestPath);
  if (manifestStat.isSymbolicLink()) throw Error(`Symbolic link is not allowed: ${manifestPath}`);
  if (!manifestStat.isFile()) throw Error(`Not a regular package.json file: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.name !== 'agent-ops-dashboard') throw Error(`Wrong package.name in ${manifestPath}`);
  return root;
}

function filesIn(root) {
  const files = new Map();
  function walk(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = join(dir, name);
      const stat = fs.lstatSync(full);
      if (stat.isSymbolicLink()) throw Error(`Symbolic link is not allowed: ${full}`);
      if (stat.isDirectory()) {
        if (!ignoredDirectories.has(name)) walk(full);
      } else if (stat.isFile()) {
        if (!ignoredFiles.has(name)) files.set(relative(root, full).split(sep).join('/'), fs.readFileSync(full));
      } else {
        throw Error(`Unsupported filesystem entry: ${full}`);
      }
    }
  }
  walk(root);
  return files;
}

export function compareKit(currentPath, baselinePath) {
  const current = checkedRoot(currentPath);
  const baseline = checkedRoot(baselinePath);
  const nested = (a, b) => { const rel = relative(a, b); return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel)); };
  if (nested(current, baseline) || nested(baseline, current)) throw Error('Use separate, non-nested kit directories.');
  const now = filesIn(current);
  const before = filesIn(baseline);
  const changes = [];
  for (const path of [...new Set([...now.keys(), ...before.keys()])].sort()) {
    if (!before.has(path)) changes.push({ status: 'ADDED', path });
    else if (!now.has(path)) changes.push({ status: 'REMOVED', path });
    else if (!now.get(path).equals(before.get(path))) changes.push({ status: 'CHANGED', path });
  }
  return changes;
}

export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  if (args.length !== 1) {
    console.error('Usage: node scripts/compare-kit.mjs "<path to unpacked untouched kit>"');
    return 2;
  }
  try {
    const changes = compareKit(cwd, args[0]);
    for (const entry of changes) console.log(`${entry.status}\t${entry.path}`);
    console.log(`SUMMARY added=${changes.filter(x => x.status === 'ADDED').length} changed=${changes.filter(x => x.status === 'CHANGED').length} removed=${changes.filter(x => x.status === 'REMOVED').length}`);
    return changes.length ? 1 : 0;
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
