'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../../../../..');
const selected = new Set([
  'workflow-requirements-router','workflow-claude-layering','workflow-document-context',
  'workflow-requirements-challenge','workflow-review-gate','workflow-integration-plan',
  'workflow-task-breakdown','workflow-task-execution','workflow-final-review',
  'embed-ai-tool','embedded-change-report','embedded-project-intake','embedded-team-sync','mrd-to-prd'
]);
const ownershipText=fs.readFileSync(path.join(root,'codex/plugin-split/skill-ownership-matrix.md'),'utf8');
const ownership=new Map([...ownershipText.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm)].map(m=>[m[1],m[2]]));
const inferOwner=rel=>{
  const p=rel.split('/');
  if(p[0]==='plugins'&&p[2]==='skills') return p[1];
  if(p[0]!=='skills') return 'repository-shared-or-external';
  const id=p[1]==='workflow'?p[2]:p[1];
  if(id.startsWith('workflow-')) return 'mcu-workbench-workflow';
  if(p[1]==='bsp') return 'mcu-workbench-architecture';
  const byCatalog={'app':'mcu-workbench-architecture','platform':'mcu-workbench-architecture','impl':'mcu-workbench-architecture','service':'mcu-workbench-architecture','vendor':'mcu-workbench-architecture','tools':'mcu-workbench-devops'};
  return ownership.get(id)||byCatalog[p[1]]||'unassigned-or-shared';
};
const roots = [...selected].map(id => ({id, dir: id.startsWith('workflow-') ? `skills/workflow/${id}` : `skills/${id}`}));
const files = [];
const markdown = [];
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for (const {id,dir} of roots) {
  const abs = path.join(root,dir);
  if (!fs.existsSync(path.join(abs,'SKILL.md'))) throw new Error(`missing ${dir}/SKILL.md`);
  const walk = d => { for (const ent of fs.readdirSync(d,{withFileTypes:true})) { const f=path.join(d,ent.name); if(ent.isDirectory()) walk(f); else { const rel=path.relative(root,f).replaceAll('\\','/'); files.push({skill:id,path:rel,sha256:sha(f),bytes:fs.statSync(f).size}); if(/\.md$/i.test(f)) markdown.push(f); } } };
  walk(abs);
}
const targets = new Map();
const linkRe = /!?(?:\[[^\]]*\])\(([^)]+)\)|<((?:\.\.?\/)[^>]+)>|(\/(?:[\w.-]+\/)*[\w.-]+\.[A-Za-z0-9]+)>/g;
for (const file of markdown) {
  const text = fs.readFileSync(file,'utf8'); let m;
  while((m=linkRe.exec(text))) {
    let raw=(m[1]||m[2]||m[3]||'').trim().replace(/^<|>$/g,''); raw=raw.split(/[?#]/,1)[0];
    if(!raw || /^(?:[a-z]+:|#|\/\/)/i.test(raw)) continue;
    const loc=path.resolve(path.dirname(file),raw);
    const rel=path.relative(root,loc).replaceAll('\\','/');
    const kind=!loc.startsWith(root+path.sep) && loc!==root ? 'absolute-external' : fs.existsSync(loc) ? 'local-existing' : 'missing';
    targets.set(`${path.relative(root,file).replaceAll('\\','/')}\0${raw}`,{source:path.relative(root,file).replaceAll('\\','/'),target:raw,resolved:rel,owner:inferOwner(rel),kind,sha256:kind==='local-existing'&&fs.statSync(loc).isFile()?sha(loc):null});
  }
}
const selectedSet=new Set(markdown.map(f=>path.resolve(f)));
const scanned=new Set(markdown.map(f=>path.resolve(f)));
const closureFiles=new Map();
let queue=[...targets.values()].filter(x=>x.kind==='local-existing'&&/\.md$/i.test(x.resolved)).map(x=>path.join(root,x.resolved));
while(queue.length){
  const file=path.resolve(queue.shift());
  if(scanned.has(file)||!fs.existsSync(file)||!fs.statSync(file).isFile()) continue;
  scanned.add(file);
  const rel=path.relative(root,file).replaceAll('\\','/');
  closureFiles.set(rel,{path:rel,sha256:sha(file),bytes:fs.statSync(file).size});
  const text=fs.readFileSync(file,'utf8'); let m;
  while((m=linkRe.exec(text))){
    let raw=(m[1]||m[2]||m[3]||'').trim().replace(/^<|>$/g,''); raw=raw.split(/[?#]/,1)[0];
    if(!raw||/^(?:[a-z]+:|#|\/\/)/i.test(raw)) continue;
    const loc=path.resolve(path.dirname(file),raw), targetRel=path.relative(root,loc).replaceAll('\\','/');
    const kind=!loc.startsWith(root+path.sep)&&loc!==root?'absolute-external':fs.existsSync(loc)?'local-existing':'missing';
    const record={source:rel,target:raw,resolved:targetRel,owner:inferOwner(targetRel),kind,sha256:kind==='local-existing'&&fs.statSync(loc).isFile()?sha(loc):null,closure:true};
    targets.set(`${rel}\\0${raw}`,record);
    if(kind==='local-existing'&&/\\.md$/i.test(targetRel)) queue.push(loc);
  }
}
const map=Object.fromEntries(roots.map(x=>[x.id,x.dir]));
const exists=(p)=>fs.existsSync(path.join(root,p));
const exclusions=['skills/workflow/SKILL.md','skills/workflow/references/usage.md','skills/workflow/scripts/workflow_runner.py'].map(p=>({path:p,exists:exists(p),sha256:exists(p)?sha(path.join(root,p)):null}));
const uniqueTargets=new Set([...targets.values()].map(x=>x.target));
const result={generatedAt:new Date().toISOString(),repository:root,branch:'host_ai',head:'43eb4e731568b606451083b0e479a29a5722fb98',roots:map,files,counts:{skills:roots.length,files:files.length,markdown:markdown.length,directLocalPairs:[...targets.values()].filter(x=>x.kind==='local-existing').length,uniqueTargets:uniqueTargets.size},links:[...targets.values()],exclusions};
fs.writeFileSync(path.join(__dirname,'skill-files.json'),JSON.stringify({generatedAt:result.generatedAt,roots:map,files,counts:result.counts},null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'link-closure.json'),JSON.stringify({generatedAt:result.generatedAt,links:result.links},null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'dependency-closure.json'),JSON.stringify({generatedAt:result.generatedAt,files:[...closureFiles.values()],links:result.links.filter(x=>x.closure)},null,2)+'\n');
fs.writeFileSync(path.join(__dirname,'projection-conflicts.json'),JSON.stringify({generatedAt:result.generatedAt,excludedEntrypoints:exclusions,roots:roots.map(x=>({id:x.id,source:x.dir,pluginTarget:`plugins/mcu-workbench-workflow/skills/${x.id}`}))},null,2)+'\n');
const missing=result.links.filter(x=>x.kind!=='local-existing');
const report=[`# Workflow baseline report`,``,`- generated: ${result.generatedAt}`,`- branch/head: host_ai @ 43eb4e731568b606451083b0e479a29a5722fb98`,`- Skills/files/Markdown: ${roots.length}/${files.length}/${markdown.length}`,`- unique destination targets: ${result.counts.uniqueTargets}; unique source-target pairs: ${targets.size}`,`- non-existing/absolute-external references: ${missing.length}`,``,`## Excluded legacy workflow entry`,...exclusions.map(x=>`- ${x.path}: exists=${x.exists}; sha256=${x.sha256||'n/a'}`),``,`## Non-existing or external links`,...missing.map(x=>`- ${x.source} → ${x.target} (${x.kind}; resolved=${x.resolved})`),``].join('\n');
fs.writeFileSync(path.join(__dirname,'baseline-report.md'),report);
console.log(JSON.stringify({skills:roots.length,files:files.length,markdown:markdown.length,links:targets.size,nonExisting:missing.length},null,2));
