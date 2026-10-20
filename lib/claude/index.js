// Claude Code adapter. Reads ~/.claude, or whatever CLAUDE_HOME points at.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdirSync, lstatSync } from 'node:fs';
import { registerSource } from '../sources.js';

export function claudeHome() {
  return process.env.CLAUDE_HOME || join(homedir(), '.claude');
}

export function projectsDir() {
  return join(claudeHome(), 'projects');
}

// Session index from file metadata only: one .jsonl file directly under a project folder is one session.
// Nested subagent transcripts, symlinks and unreadable entries are skipped. Newest first, ties by id.
export function listSessions({ limit = 50 } = {}) {
  const root = projectsDir();
  let projects;
  try { projects = readdirSync(root); } catch { return []; }
  const out = [];
  for (const project of projects) {
    const dir = join(root, project);
    let names;
    try { if (!lstatSync(dir).isDirectory()) continue; names = readdirSync(dir); } catch { continue; }
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue;
      let st;
      try { st = lstatSync(join(dir, name)); } catch { continue; }
      if (!st.isFile()) continue;
      out.push({ id: name.slice(0, -'.jsonl'.length), project, size: st.size, mtime: st.mtime.toISOString() });
    }
  }
  out.sort((a, b) => (b.mtime.localeCompare(a.mtime)) || a.id.localeCompare(b.id));
  return out.slice(0, Math.max(1, Math.min(limit, 500)));
}

export const claude = registerSource({
  id: 'claude',
  label: 'Claude Code',
  home: claudeHome,
  listSessions,
});
