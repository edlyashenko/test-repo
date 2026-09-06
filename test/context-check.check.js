// Standalone materials checks: node --test test/context-check.check.js
// Not named *.test.js: npm run verify remains the two-test runtime baseline.
// Release-only starter checks. Do not add to learner CI: survey creates
// the initially absent documents and later lessons intentionally evolve the app.
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
  for(const text of [partial,complete]){assert.match(text,/не підтвердження виконання команд або якості коду/);assert.match(text,/Фактичні результати нижче записані мною/);assert.doesNotMatch(text,/PASS|APPROVED|NaN|score|балів/);}
  assert.throws(()=>C.markdown([true]));assert.throws(()=>C.markdown(all(true),'<img src=x>'));
});

test('safe rendering and copy fallback use text, not HTML injection',()=>{
  assert.doesNotMatch(html,/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\s*\(/);
  assert.match(html,/\.textContent=/);assert.match(html,/range\.selectNodeContents\(block\)/);
  assert.match(html,/window\.confirm\(/);assert.match(html,/Браузер не дозволив автоматичне копіювання/);
});

test('page has no uploads, external assets or network calls',()=>{
  assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+href=|<iframe|type="(?:file|email|tel)"|\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/);
  assert.ok(html.includes("connect-src 'none'"));
  for(const [,href] of html.matchAll(/href="([^"]+)"/g))assert.match(href,/^https:\/\//);
});

test('new semantic version never restores old exercise checkmarks',()=>{
  assert.equal(C.VERSION,'context-check-v3-curated');
  const storage=memory({'ai-work-check:context-check-v1':JSON.stringify({version:'context-check-v1',checked:all(true)})});
  assert.equal(C.createProgress(()=>storage).load().count,0);
  assert.ok(storage.values.has('ai-work-check:context-check-v1'));
  assert.match(html,/старі позначки попередньої вправи не переносяться/);
});

test('all copy controls and evidence fields have real unique DOM targets',()=>{
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,new Set(ids).size);
  for(const [,target]of html.matchAll(/data-copy="([^"]+)"/g))assert.ok(html.includes('<pre id="'+target+'">'));
  for(const id of ['completion','evidence','evidence-agent','evidence-checks','evidence-fresh','evidence-limits','remember','progress','progress-text','storage-status','copy-status','download','reset'])assert.ok(ids.includes(id),id);
  const exported=C.markdown(all(false),'2026-09-06T12:00:00.000Z',{agent:'Codex',checks:'tests 2',fresh:'Явно прочитано views/AGENTS.md',limits:'Автозавантаження не перевірено'});
  for(const text of ['Codex','tests 2','Явно прочитано views/AGENTS.md','Автозавантаження не перевірено'])assert.ok(exported.includes(text));
  assert.throws(()=>C.markdown(all(false),undefined,{agent:'x'.repeat(3001)}));
  assert.throws(()=>C.markdown(all(false),undefined,{other:'x'}));
  assert.throws(()=>C.markdown(all(false),undefined,{fresh:42}));
  assert.ok(html.includes("if(result.reset)evidenceFields.forEach"));
  assert.ok(html.includes("field.value=''"));
});

test('clone and ZIP both reach a real own Git root before SDD',()=>{
  for(const path of ['context-check.html','docs/lesson-2/setup.md']){
    const source=read(path);
    for(const command of ['git clone https://github.com/genkovich/agentic-engineering-mini-kit.git','git init','git rev-parse --show-toplevel','git config user.name','git config user.email','git commit -m "Start mini-course practice"','git rev-parse HEAD'])assert.ok(source.includes(command),path+': '+command);
    assert.ok(source.indexOf('git clone ')<source.indexOf('Code → Download ZIP'));
    assert.ok(source.includes('батьківськ')||source.includes('батьківським'));
  }
});

test('setup and page include version checks and exact OS installers',()=>{
  for(const path of ['context-check.html','docs/lesson-2/setup.md']){
    const source=read(path);
    for(const command of ['node --version','npm --version','git --version','claude --version','curl -fsSL https://claude.ai/install.sh | bash','irm https://claude.ai/install.ps1 | iex','/login'])assert.ok(source.includes(command),path+': '+command);
    assert.ok(source.includes('Windows, саме PowerShell'));
  }
});

test('one survey workflow has explicit cross-host commands and installers',()=>{
  for(const path of ['context-check.html','docs/lesson-2/setup.md']){
    const source=read(path);
    for(const value of ['/plugin marketplace add genkovich/sdd','/plugin install sdd@sdd','/reload-plugins','/sdd:survey','$sdd-survey','bash -s -- codex','bash -s -- cursor','Git Bash або WSL'])assert.ok(source.includes(value),path+': '+value);
    assert.doesNotMatch(source,/\/sdd:interview|\/init/);
  }
  for(const path of ['context-check.html','docs/lesson-2/prompts.md','docs/lesson-2/README.md','README.md'])assert.ok(read(path).includes('docs/architecture-map.md'),path);
});

test('curated canonical files exist and Claude wrappers import them without duplication',()=>{
  for(const path of ['AGENTS.md','CLAUDE.md','views/AGENTS.md','views/CLAUDE.md','docs/rules/session-data.md','.claude/rules/session-index.md','.cursor/rules/session-data.mdc','CONTEXT.md','.claude/sdd.local.example.md'])assert.ok(fs.existsSync(new URL(path,root)),path);
  for(const path of ['docs/architecture-map.md','docs/idea-brief.md','docs/roadmap.md','templates/02-context-pack.md','docs/lesson-2/context-pack.example.md','docs/lesson-2/handoff.example.md','docs/lesson-2/decision-map.md'])assert.equal(fs.existsSync(new URL(path,root)),false,path);
  for(const path of ['CLAUDE.md','views/CLAUDE.md']){
    const source=read(path);assert.match(source,/^@AGENTS\.md$/m);
    assert.ok(source.split('\n').length<=6);
  }
  const base=read('AGENTS.md');assert.ok(base.includes('views/AGENTS.md'));assert.ok(base.includes('docs/rules/session-data.md'));
  const nested=read('views/AGENTS.md');for(const rule of ['layout()','esc()','Content-Security-Policy'])assert.ok(nested.includes(rule));
});

test('new session has real host actions and honestly records explicit reading',()=>{
  for(const path of ['context-check.html','docs/lesson-2/prompts.md','docs/lesson-2/setup.md']){
    const source=read(path);
    for(const phrase of ['/exit','/new','resume або continue','новий чат'])assert.ok(source.includes(phrase),path+': '+phrase);
    assert.ok(source.includes('явно'));
  }
  assert.ok(html.includes('залиш крок 9 незавершеним'));
  assert.ok(C.markdown(all(false)).includes('Крок 9 лишається незавершеним'));
  const prompt=read('docs/lesson-2/prompts.md');
  assert.ok(prompt.includes('Не вигадуй результатів команд і не використовуй попередню розмову.'));
  assert.ok(prompt.includes('Необовʼязково: адаптація до свого проєкту'));
});

test('survey preserves curated instructions and does not implement the feature',()=>{
  for(const path of ['context-check.html','docs/lesson-2/prompts.md']){
    const source=read(path);
    for(const phrase of ['Карта має описувати поточний код','без реалізації нової фічі','Не змінюй код, тести й залежності','Наявні інструкції не переписуй','спочатку запропонуй правку'])assert.ok(source.includes(phrase),path+': '+phrase);
  }
});

test('optional prompting examples come from visible current files',()=>{
  for(const path of ['context-check.html','docs/lesson-2/prompts.md']){
    const source=read(path);
    for(const term of ['Zero-shot','One-shot','Few-shot','Chain-of-thought','Список сесій | бажана зміна | README.md','GET / показує порожню сторінку | є зараз | server.js'])assert.ok(source.includes(term),path+': '+term);
  }
});

test('Git review includes committed, uncommitted and untracked changes',()=>{
  for(const path of ['context-check.html','docs/lesson-2/setup.md']){
    const source=read(path);
    for(const command of ['git log --oneline BASE_COMMIT..HEAD','git diff BASE_COMMIT HEAD','git diff HEAD','git status --short','git diff --cached'])assert.ok(source.includes(command),path+': '+command);
    assert.ok(source.includes('повним хешем'));
    assert.ok(source.includes('невідстежувані'));
  }
  assert.doesNotMatch(html,/лише два (?:додані|ADDED)/);
});

test('manual context and handoff are absent; evidence is ephemeral and exported safely',()=>{
  for(const path of ['context-check.html','docs/lesson-2/setup.md','docs/lesson-2/prompts.md','docs/lesson-2/README.md','README.md','AGENTS.md','CLAUDE.md'])assert.doesNotMatch(read(path),/02-context\.md|docs\/practice\/handoff\.md|templates\/02-context-pack\.md|\/sdd:interview/);
  const exported=C.markdown(all(true));assert.match(exported,/docs\/architecture-map\.md/);
  assert.doesNotMatch(exported,/idea-brief\.md|02-context\.md|handoff\.md/);
  assert.equal([...html.matchAll(/data-evidence=/g)].length,4);
  assert.ok(html.includes('Поля не зберігаються автоматично'));
  const storage=memory(),state=C.createProgress(()=>storage);state.setRemember(true);
  assert.deepEqual(Object.keys(JSON.parse(storage.values.get(C.KEY))).sort(),['checked','version']);
  assert.ok(html.includes('Object.fromEntries(evidenceFields.map'));
});

test('one canonical data policy feeds Claude and Cursor selectors plus portable fallback',()=>{
  assert.equal(JSON.parse(read('package.json')).scripts.demo,'node scripts/demo.mjs');
  const policy=read('docs/rules/session-data.md');
  for(const text of ['scripts/demo.mjs','fixtures/claude-home/','~/.claude','метаданих','Вміст JSONL','subagents/','tool-results/','не записує'])assert.ok(policy.includes(text),text);
  const claude=read('.claude/rules/session-index.md'),cursor=read('.cursor/rules/session-data.mdc');
  assert.ok(claude.includes('paths: ["lib/claude/**/*.js"]'));
  assert.ok(claude.includes('@../../docs/rules/session-data.md'));
  assert.ok(cursor.includes('globs: "lib/claude/**/*.js"'));assert.ok(cursor.includes('alwaysApply: false'));assert.ok(cursor.includes('@docs/rules/session-data.md'));
  assert.ok(claude.length<300);assert.ok(cursor.length<450);
  const imported=new URL('../../docs/rules/session-data.md',new URL('.claude/rules/session-index.md',root));
  assert.equal(fs.readFileSync(imported,'utf8'),policy);
  assert.ok(read('AGENTS.md').includes('прочитай \`docs/rules/session-data.md\`'));
});

test('current app keeps two skeleton routes and tests without implementation',()=>{
  const server=read('server.js'),adapter=read('lib/claude/index.js'),pkg=JSON.parse(read('package.json'));
  assert.equal([...server.matchAll(/app\.get\(/g)].length,2);
  assert.ok(server.includes('No slice is wired up yet.'));
  assert.doesNotMatch(adapter,/export (?:async )?function listSessions/);
  assert.equal(pkg.scripts.verify,'node --test --test-reporter=spec "test/*.test.js"');
  assert.deepEqual(fs.readdirSync(new URL('test/',root)).filter(x=>x.endsWith('.test.js')),['skeleton.test.js']);
  assert.equal([...read('test/skeleton.test.js').matchAll(/^test\(/gm)].length,2);
});

test('fixture counts are still six direct files in three projects',()=>{
  const projects=new URL('fixtures/claude-home/projects/',root);
  const dirs=fs.readdirSync(projects,{withFileTypes:true}).filter(x=>x.isDirectory());
  const files=dirs.flatMap(dir=>fs.readdirSync(new URL(dir.name+'/',projects),{withFileTypes:true}).filter(x=>x.isFile()&&x.name.endsWith('.jsonl')));
  assert.equal(dirs.length,3);assert.equal(files.length,6);
});

test('ZIP comparison remains optional, read-only and correctly documents status codes',()=>{
  const setup=read('docs/lesson-2/setup.md');
  assert.ok(setup.includes('Необовʼязкова діагностика ZIP'));
  assert.ok(setup.includes('node scripts/compare-kit.mjs "<path to unpacked untouched kit>"'));
  assert.ok(setup.includes('0 без відмінностей, 1 з відмінностями, 2 помилка'));
  assert.ok(fs.existsSync(new URL('scripts/compare-kit.mjs',root)));
});
