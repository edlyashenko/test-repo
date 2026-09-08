// Ground truth straight off disk, in plain Node. Shelling out to find / grep / wc / jq would break
// `npm run verify` on Windows and on any machine without jq, so the oracles stay dependency-free.
import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

// `find <dir> -name '*.jsonl' -type f` ; with exactDepth = 2 it is `-mindepth 2 -maxdepth 2`,
// i.e. only <project>/<sessionId>.jsonl, not the subagent transcripts nested deeper.
// lstat, not stat: a symlink is not a session, so the oracle must not follow it.
export function sessionFiles(projectsDir, { exactDepth = null } = {}) {
  const out = [];
  const walk = (dir, depth) => {
    let names;
    try { names = readdirSync(dir); } catch { return; }
    for (const name of names) {
      const p = join(dir, name);
      let st;
      try { st = lstatSync(p); } catch { continue; }
      if (st.isDirectory()) walk(p, depth + 1);
      else if (st.isFile() && name.endsWith('.jsonl') && (exactDepth === null || depth === exactDepth)) out.push(p);
    }
  };
  walk(projectsDir, 1);
  return out.sort();
}

// `grep -o <needle> | wc -l` : occurrences, not lines. `needle` is a string or a global RegExp.
export function countOccurrences(text, needle) {
  if (needle instanceof RegExp) return (text.match(needle) ?? []).length;
  return text.split(needle).length - 1;
}

export function countAcross(files, needle) {
  return files.reduce((n, f) => n + countOccurrences(readFileSync(f, 'utf8'), needle), 0);
}

// `grep -l <needle> files | wc -l`
export function filesContaining(files, needle) {
  return files.filter((f) => countOccurrences(readFileSync(f, 'utf8'), needle) > 0);
}

// One JSON record per line; a line that is not JSON is skipped, like `jq -n inputs` would error on it.
export function jsonlRecords(files) {
  const records = [];
  for (const f of files) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try { records.push(JSON.parse(line)); } catch { /* skip */ }
    }
  }
  return records;
}

const dig = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const num = (v) => (typeof v === 'number' ? v : 0); // jq `// 0`

// jq: [inputs | select(.type=="assistant") | select(.message.usage)] | unique_by(.message.id)
//     | map(.message.usage.<field> // 0) | add
export function dedupUsageSum(files, field) {
  const seen = new Set();
  let sum = 0;
  for (const r of jsonlRecords(files)) {
    if (r?.type !== 'assistant' || !r.message?.usage) continue;
    const id = r.message.id;
    if (seen.has(id)) continue;
    seen.add(id);
    sum += num(dig(r.message.usage, field));
  }
  return sum;
}

// jq: [inputs | select(.type=="assistant") | .message.usage.<field> // 0] | add
export function naiveUsageSum(files, field) {
  let sum = 0;
  for (const r of jsonlRecords(files)) {
    if (r?.type !== 'assistant') continue;
    sum += num(dig(r.message?.usage, field));
  }
  return sum;
}
