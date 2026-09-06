// Standalone materials checks: node --test test/context-check.check.js
// Not named *.test.js: npm run verify remains the two-test runtime baseline.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const html=read('context-check.html');
const engine=html.match(/<script id="context-engine">([\s\S]*?)<\/script>/)[1];
const context=vm.createContext({});vm.runInContext(engine,context);
const C=context.ContextCheck;
const clean=value=>JSON.parse(JSON.stringify(value));
const all=value=>Array(10).fill(value);
function memory(initial={}){
  const values=new Map(Object.entries(initial));const calls=[];
  return {values,calls,getItem(key){calls.push(['get',key]);return values.get(key)??null;},setItem(key,value){calls.push(['set',key]);values.set(key,value);},removeItem(key){calls.push(['remove',key]);values.delete(key);}};
}

test('ten ordered steps and matching export titles, no checkbox preselected',()=>{
  const steps=[...html.matchAll(/<article class="step" id="step-(\d+)" data-step="(\d+)">\s*<h2>(\d+)\. ([^<]+)<\/h2>/g)];
  assert.equal(steps.length,10);
  steps.forEach((s,i)=>{assert.equal(Number(s[1]),i+1);assert.equal(s[1],s[2]);assert.equal(s[2],s[3]);assert.equal(s[4],C.TITLES[i]);});
  assert.equal([...html.matchAll(/data-check="\d+"/g)].length,10);
  assert.doesNotMatch(html,/<input[^>]*\schecked(?:[\s=>])/);
});

test('every step has an action, expected observation and checkbox condition',()=>{
  const steps=[...html.matchAll(/<article class="step"[\s\S]*?<\/article>/g)];
  for(const [step]of steps){assert.match(step,/Що робити\./);assert.match(step,/Що має бути видно\./);assert.match(step,/<label class="check">[\s\S]*?Познач/);}
});

test('initial progress is empty, opt-in and does not write browser storage',()=>{
  const storage=memory(),state=C.createProgress(()=>storage),value=state.load();
  assert.equal(value.count,0);assert.equal(value.remember,false);assert.equal(value.warning,'');
  assert.deepEqual(clean(value.checked),all(false));
  state.update(0,true);assert.equal(storage.calls.filter(x=>x[0]==='set').length,0);
});

test('partial and complete progress count only explicit boolean checkmarks',()=>{
  const state=C.createProgress(()=>memory());
  state.update(0,true);state.update(9,true);assert.equal(state.snapshot().count,2);
  for(let i=0;i<10;i++)state.update(i,true);
  assert.equal(state.snapshot().count,10);
  state.update(4,false);assert.equal(state.snapshot().count,9);
  for(const args of [[-1,true],[10,true],[1,'true'],[1,null],[NaN,true]])assert.throws(()=>state.update(...args));
});

test('snapshots do not allow accidental mutation of the saved state',()=>{
  const state=C.createProgress(()=>memory());const snapshot=state.snapshot();snapshot.checked[0]=true;
  assert.equal(state.snapshot().count,0);
});

test('opt-in saves only version and ten booleans; reload restores them',()=>{
  const storage=memory(),state=C.createProgress(()=>storage);
  state.update(3,true);state.setRemember(true);state.update(8,true);
  const payload=JSON.parse(storage.values.get(C.KEY));
  assert.deepEqual(Object.keys(payload).sort(),['checked','version']);assert.equal(payload.checked.length,10);
  assert.ok(payload.checked.every(x=>typeof x==='boolean'));
  const fresh=C.createProgress(()=>storage).load();assert.equal(fresh.count,2);assert.equal(fresh.remember,true);
});

test('turning off saving preserves current checkmarks and removes only its own key',()=>{
  const storage=memory({unrelated:'keep'}),state=C.createProgress(()=>storage);
  state.update(2,true);state.setRemember(true);state.setRemember(false);
  assert.equal(state.snapshot().count,1);assert.equal(state.snapshot().remember,false);
  assert.equal(storage.values.has(C.KEY),false);assert.equal(storage.values.get('unrelated'),'keep');
});

test('denied storage getter or read leaves a working in-memory checklist',()=>{
  for(const get of [()=>{throw Error('denied');},()=>({getItem(){throw Error('read denied');}})]){
    const state=C.createProgress(get),loaded=state.load();assert.equal(loaded.count,0);assert.match(loaded.warning,/недоступні/);
    assert.equal(state.update(4,true).count,1);
    assert.match(state.setRemember(true).warning,/не дозволив зберегти/);
    assert.equal(state.update(5,true).count,2);
  }
});

test('write quota failure keeps new progress and warns that only this tab has it',()=>{
  const storage=memory();storage.setItem=()=>{throw Error('quota exceeded');};
  const state=C.createProgress(()=>storage);state.setRemember(true);const next=state.update(7,true);
  assert.equal(next.count,1);assert.match(next.warning,/цій вкладці/);assert.match(next.warning,/завантаж чекліст/);
});

test('malformed, oversized, wrong-version or unsafe saved content is not restored',()=>{
  for(const raw of ['oops','null','[]','{}',' '.repeat(2049),JSON.stringify({version:'old',checked:all(true)}),JSON.stringify({version:C.VERSION,checked:all('<img src=x onerror=alert(1)>')}),JSON.stringify({version:C.VERSION,checked:[true]}),JSON.stringify({version:C.VERSION,checked:all(true),html:'<script>alert(1)</script>'})]){
    assert.throws(()=>C.parse(raw));const state=C.createProgress(()=>memory({[C.KEY]:raw}));
    assert.equal(state.load().count,0);assert.equal(state.snapshot().remember,false);
  }
});

test('reset cancellation leaves current and saved values unchanged',()=>{
  const storage=memory(),state=C.createProgress(()=>storage);state.update(0,true);state.setRemember(true);
  const before=storage.values.get(C.KEY),count=storage.calls.length;
  assert.equal(state.reset(()=>false).reset,false);assert.equal(state.snapshot().count,1);
  assert.equal(storage.values.get(C.KEY),before);assert.equal(storage.calls.length,count);
});

test('confirmed reset clears checks and saving preference, not unrelated browser data',()=>{
  const storage=memory({other:'untouched'}),state=C.createProgress(()=>storage);state.update(0,true);state.setRemember(true);
  const reset=state.reset(()=>true);assert.equal(reset.reset,true);assert.equal(reset.count,0);assert.equal(reset.remember,false);
  assert.equal(storage.values.has(C.KEY),false);assert.equal(storage.values.get('other'),'untouched');
});

test('failed reset removal admits stale stored checks may return after reload',()=>{
  const storage=memory(),state=C.createProgress(()=>storage);state.update(0,true);state.setRemember(true);
  storage.removeItem=()=>{throw Error('remove denied');};
  const result=state.reset(()=>true);assert.equal(result.count,0);assert.match(result.warning,/можуть повернутися/);
  assert.equal(C.createProgress(()=>storage).load().count,1);
});

test('Markdown supports partial and complete progress without verified-proof claims',()=>{
  const checked=all(false);checked[0]=true;
  const partial=C.markdown(checked,'2026-09-06T12:00:00.000Z');assert.match(partial,/Позначено: 1 із 10/);
  assert.equal([...partial.matchAll(/^- \[x\]/gm)].length,1);assert.equal([...partial.matchAll(/^- \[ \]/gm)].length,9);
  const complete=C.markdown(all(true));assert.equal([...complete.matchAll(/^- \[x\]/gm)].length,10);
  for(const text of [partial,complete]){assert.match(text,/не підтвердження виконання команд або якості коду/);assert.match(text,/Фактичні результати зберігаю окремо/);assert.doesNotMatch(text,/PASS|APPROVED|NaN|score|балів/);}
  assert.throws(()=>C.markdown([true]));assert.throws(()=>C.markdown(all(true),'<img src=x>'));
});

test('safe rendering and copy fallback use text, not HTML injection',()=>{
  assert.doesNotMatch(html,/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\s*\(/);
  assert.match(html,/\.textContent=/);assert.match(html,/range\.selectNodeContents\(block\)/);
  assert.match(html,/window\.confirm\(/);assert.match(html,/Браузер не дозволив автоматичне копіювання/);
});

test('page has no uploads, contact fields, external assets, network calls or dependencies',()=>{
  assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|<iframe|type="(?:file|email|tel)"|\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/);
  assert.match(html,/connect-src 'none'/);
  const links=[...html.matchAll(/href="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(links,['https://github.com/genkovich/agentic-engineering-mini-kit','https://code.claude.com/docs/en/memory']);
});

test('all copy controls target an inline block, with handoff before fresh session',()=>{
  for(const [,target]of html.matchAll(/data-copy="([^"]+)"/g))assert.ok(html.includes('<pre id="'+target+'">'));
  assert.ok(html.indexOf('id="prompt-8"')<html.indexOf('id="prompt-9"'));
  for(const command of ['npm ci','npm run verify','npm run demo','git status --short','git diff','git diff --cached'])assert.ok(html.includes(command));
  assert.match(html,/SDD чи встановлення плагінів[^<]*не обов’язкові/);
});

test('manual review does not mark the fresh-agent step complete',()=>{
  assert.match(html,/Крок 9 залиш незавершеним/);
  assert.match(C.markdown(all(false)),/Крок 9 залишається незавершеним/);
  assert.doesNotMatch(html,/Якщо використано альтернативний спосіб/);
});

test('required rules, template, maps and instructional examples exist in the same kit',()=>{
  for(const path of ['CLAUDE.md','views/CLAUDE.md','.claude/rules/session-index.md','templates/02-context-pack.md','CONTEXT.md','docs/architecture-map.md','docs/roadmap.md','docs/lesson-2/README.md','docs/lesson-2/context-pack.example.md','docs/lesson-2/handoff.example.md','docs/lesson-2/decision-map.md','docs/lesson-2/prompts.md'])assert.ok(fs.existsSync(new URL(path,root)),path);
});

test('local rule pattern and HTML helpers match the current files',()=>{
  assert.match(read('.claude/rules/session-index.md'),/^---\npaths: \["lib\/claude\/\*\*\/\*\.js"\]\n---/);
  const rule=read('views/CLAUDE.md');for(const name of ['layout()','esc()','Content-Security-Policy'])assert.ok(rule.includes(name));
  const layout=read('views/layout.js');for(const name of ['esc','layout','empty'])assert.ok(layout.includes('export function '+name+'('));
  assert.match(html,/lib\/claude\/\*\*\/\*\.js/);assert.match(html,/автоматичне завантаження саме цим запуском не перевірено/);
});

test('current-code excerpts and skeleton-only route claims match actual implementation',()=>{
  const server=read('server.js'),adapter=read('lib/claude/index.js'),sources=read('lib/sources.js');
  assert.ok(server.includes("import { claudeHome } from './lib/claude/index.js';"));
  assert.ok(server.includes("import { listSources } from './lib/sources.js';"));
  assert.ok(adapter.includes("return join(claudeHome(), 'projects');"));
  assert.ok(sources.includes("for (const field of ['id', 'label', 'home']) {"));
  assert.ok(sources.includes('never imports an adapter directly'));
  assert.ok(server.includes('No slice is wired up yet.'));
  assert.equal([...server.matchAll(/app\.get\(/g)].length,2);
  assert.doesNotMatch(adapter,/export (?:async )?function listSessions/);
});

test('fixture example has six direct session files and nested artifacts are excluded',()=>{
  const projects=new URL('fixtures/claude-home/projects/',root);
  const dirs=fs.readdirSync(projects,{withFileTypes:true}).filter(x=>x.isDirectory());
  const files=dirs.flatMap(dir=>fs.readdirSync(new URL(dir.name+'/',projects),{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.jsonl')));
  assert.equal(dirs.length,3);assert.equal(files.length,6);
  assert.match(html,/шість файлів сесій у трьох проєктах/);
  assert.match(html,/Вкладені <code>subagents\/<\/code> та <code>tool-results\/<\/code> сесіями не вважаємо/);
});

test('D1-D3 present choices are not all treated as newly unresolved decisions',()=>{
  const roadmap=read('docs/roadmap.md');for(const id of ['D1','D2','D3'])assert.ok(roadmap.includes('| '+id+' |'));
  assert.match(roadmap,/Зараз: один рівень/);assert.match(roadmap,/Зараз: похідний шлях із позначкою/);assert.match(roadmap,/Зараз: параметр з розумним дефолтом, без пагінації/);
  assert.match(html,/Конкретне число в цьому записі ще не визначено/);
  assert.match(html,/не оголошуй усі D1–D3 наново невирішеними/);
});

test('new checks do not join the two-test baseline or change its scripts',()=>{
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.scripts.verify,'node --test --test-reporter=spec "test/*.test.js"');
  assert.equal([...read('test/skeleton.test.js').matchAll(/^test\(/gm)].length,2);
  assert.deepEqual(fs.readdirSync(new URL('test/',root)).filter(x=>x.endsWith('.test.js')),['skeleton.test.js']);
});
