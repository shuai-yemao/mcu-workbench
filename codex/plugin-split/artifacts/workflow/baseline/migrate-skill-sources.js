'use strict';
const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
const repo=path.resolve(__dirname,'../../../../..');
const baseline=require('./skill-files.json');
const targetRoot=path.join(repo,'plugins/mcu-workbench-workflow/skills');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const list=root=>{const out=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name); if(e.isDirectory()) walk(f); else out.push({path:path.relative(d,f).replaceAll('\\','/'),sha256:hash(f)});}}; walk(root); return out.sort((a,b)=>a.path.localeCompare(b.path));};
for(const [id,sourceRel] of Object.entries(baseline.roots)){
  const source=path.join(repo,sourceRel), target=path.join(targetRoot,id);
  if(!fs.existsSync(path.join(source,'SKILL.md'))) throw new Error(`source missing: ${sourceRel}/SKILL.md`);
  if(fs.existsSync(target)) throw new Error(`target already exists; refusing overwrite: ${path.relative(repo,target)}`);
}
for(const [id,sourceRel] of Object.entries(baseline.roots)){
  fs.cpSync(path.join(repo,sourceRel),path.join(targetRoot,id),{recursive:true,errorOnExist:true,force:false});
  const a=list(path.join(repo,sourceRel)), b=list(path.join(targetRoot,id));
  if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error(`source hash mismatch after migration: ${id}`);
}
console.log(`Copied and hash-verified ${Object.keys(baseline.roots).length} Skill trees from the frozen baseline.`);
