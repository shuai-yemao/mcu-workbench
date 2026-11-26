'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { localTarget, isExternalOrIgnored } = require('../../../lib/skill-links');
const { mapMarkdownLinks } = require('./markdown-links');

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const slash = value => value.split(path.sep).join('/');
const inside = (root, target) => { const rel=path.relative(root,target); return rel===''||(!rel.startsWith(`..${path.sep}`)&&rel!=='..'&&!path.isAbsolute(rel)); };
const filesUnder = root => !fs.existsSync(root)?[]:fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>{if(e.isDirectory()&&e.name==='.git')return [];const f=path.join(root,e.name);return e.isDirectory()?filesUnder(f):e.isFile()?[f]:[];}).sort();

function rewriteMarkdown(content, source, target, skills, pluginRoot, projectRoot, sharedSources) {
  return mapMarkdownLinks(content, ({ target: raw }) => {
    if (isExternalOrIgnored(raw)) return null;
    const local=localTarget(raw);
    if (!local) return null;
    const sourceTarget=path.resolve(path.dirname(source),local);
    let targetTarget=null;
    for(const skill of skills){
      if(inside(skill.source,sourceTarget)) targetTarget=path.join(skill.target,path.relative(skill.source,sourceTarget));
    }
    if(!targetTarget){
      const sharedRoot=path.join(pluginRoot,'references','shared');
      if(inside(sharedRoot,sourceTarget)){
        const relative=slash(path.relative(sharedRoot,sourceTarget));
        const record=sharedSources.find(entry=>entry.packagePath===relative||relative.startsWith(`${entry.packagePath}/`));
        if(!record) throw new Error(`Unregistered Workflow shared reference: ${relative}`);
        targetTarget=path.resolve(projectRoot,record.sourcePath,...relative.slice(record.packagePath.length).split('/').filter(Boolean));
      } else if(path.isAbsolute(raw)||raw.includes(':')) return null;
      else throw new Error(`Unmapped local Workflow link in ${path.relative(pluginRoot,source)}: ${raw}`);
    }
    let relative=slash(path.relative(path.dirname(target),targetTarget));
    if(!relative.startsWith('.')) relative=`./${relative}`;
    const hashAt=raw.indexOf('#'); const suffix=hashAt>=0?raw.slice(hashAt):'';
    return `${relative}${suffix}`;
  });
}

function loadBaseline(projectRoot, explicit) {
  if(explicit) return explicit instanceof Map?explicit:new Map(Object.entries(explicit));
  const file=path.join(projectRoot,'codex/plugin-split/artifacts/workflow/baseline/skill-files.json');
  const hashes=new Map();
  if(fs.existsSync(file)){
    const baseline=JSON.parse(fs.readFileSync(file,'utf8'));
    for(const entry of baseline.files) hashes.set(entry.path,entry.sha256);
  }
  const external=path.join(projectRoot,'codex/plugin-split/artifacts/external-skill-ownership/baseline-v1.5.json');
  if(fs.existsSync(external)){
    const baseline=JSON.parse(fs.readFileSync(external,'utf8'));
    for(const skill of baseline.items||[]) for(const entry of skill.rootFiles||[]) hashes.set(entry.path,entry.sha256);
  }
  return hashes;
}

function syncSkillProjections(options={}) {
  const projectRoot=path.resolve(options.projectRoot||path.resolve(__dirname,'../../..'));
  const pluginRoot=path.resolve(options.pluginRoot||path.join(projectRoot,'plugins/mcu-workbench-workflow'));
  const map=options.map||JSON.parse(fs.readFileSync(path.join(pluginRoot,'skill-map.json'),'utf8'));
  const marker=path.join(projectRoot,'skills','.workflow-projections.json');
  if(map.plugin!=='mcu-workbench-workflow'||!Array.isArray(map.skills)||!map.skills.length) throw new Error('Invalid Workflow skill map.');
  const sharedManifestPath=path.join(pluginRoot,'references/shared-sources.json');
  const sharedManifest=fs.existsSync(sharedManifestPath)?JSON.parse(fs.readFileSync(sharedManifestPath,'utf8')):{files:[]};
  const sharedSources=sharedManifest.files||[];
  for(const entry of sharedSources){
    const snapshot=path.resolve(pluginRoot,'references/shared',entry.packagePath);
    if(!inside(path.join(pluginRoot,'references/shared'),snapshot)||!fs.existsSync(snapshot)||sha(fs.readFileSync(snapshot))!==entry.sha256) throw new Error(`Refusing modified or missing Workflow shared snapshot: ${entry.packagePath}`);
    const source=path.resolve(projectRoot,entry.sourcePath);
    if(!inside(projectRoot,source)||!fs.existsSync(source)||sha(fs.readFileSync(source))!==entry.sourceSha256) throw new Error(`Workflow shared source changed since snapshot: ${entry.sourcePath}`);
    if(entry.ownerPluginSourcePath&&entry.ownerPluginSha256){const owner=path.resolve(projectRoot,entry.ownerPluginSourcePath);if(!inside(projectRoot,owner)||!fs.existsSync(owner)||sha(fs.readFileSync(owner))!==entry.ownerPluginSha256)throw new Error(`Workflow shared owner changed since snapshot: ${entry.ownerPluginSourcePath}`);}
  }
  const skills=map.skills.map(item=>({id:item.id,source:path.resolve(projectRoot,item.pluginPath||item.sourcePath),target:path.resolve(projectRoot,item.projectionPath)}));
  const generated=[];
  for(const skill of skills){
    if(!inside(path.join(pluginRoot,'skills'),skill.source)||!inside(path.join(projectRoot,'skills'),skill.target)) throw new Error(`Projection path escapes managed roots: ${skill.id}`);
    for(const source of filesUnder(skill.source)){
      let content=fs.readFileSync(source);
      const target=path.join(skill.target,path.relative(skill.source,source));
      if(path.extname(source).toLowerCase()==='.md') content=Buffer.from(rewriteMarkdown(content.toString('utf8'),source,target,skills,pluginRoot,projectRoot,sharedSources),'utf8');
      generated.push({source,target,content,sha256:sha(content),sourceSha256:sha(fs.readFileSync(source))});
    }
  }
  if(new Set(generated.map(f=>f.target)).size!==generated.length) throw new Error('Duplicate Workflow projection target.');
  const baseline=loadBaseline(projectRoot,options.baselineHashes);
  let previous=null;
  if(fs.existsSync(marker)){
    try{previous=JSON.parse(fs.readFileSync(marker,'utf8'));}catch(error){throw new Error(`Refusing malformed Workflow marker: ${error.message}`);}
    if(previous.schemaVersion!=='1.0.0'||previous.plugin!==map.plugin||!Array.isArray(previous.files)) throw new Error('Refusing unknown or malformed Workflow projection marker.');
  }
  const managed=new Map();
  for(const entry of previous?.files||[]){
    const target=path.resolve(projectRoot,entry.path);
    if(!inside(path.join(projectRoot,'skills'),target)||!skills.some(skill=>inside(skill.target,target))) throw new Error(`Refusing Workflow marker path escape: ${entry.path}`);
    if(managed.has(entry.path)||!/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Refusing duplicate or invalid Workflow marker entry: ${entry.path}`);
    managed.set(entry.path,entry.sha256);
  }
  const generatedPaths=new Set(generated.map(f=>slash(path.relative(projectRoot,f.target))));
  for(const entry of previous?.files||[]){
    const target=path.resolve(projectRoot,entry.path);
    if(!generatedPaths.has(entry.path)) throw new Error(`Refusing implicit removal of stale Workflow projection: ${entry.path}`);
    if(!fs.existsSync(target)||sha(fs.readFileSync(target))!==entry.sha256) throw new Error(`Refusing to overwrite drifted Workflow projection: ${entry.path}`);
  }
  const expectedBySkill=new Map(skills.map(skill=>[skill,generated.filter(f=>inside(skill.target,f.target))]));
  if(!previous){
    for(const [skill,expected] of expectedBySkill){
      const existing=filesUnder(skill.target);
      const expectedSet=new Set(expected.map(f=>f.target));
      if(existing.some(file=>!expectedSet.has(file))||existing.length>expected.length) throw new Error(`Refusing adoption with unrecognized files: ${slash(path.relative(projectRoot,skill.target))}`);
      for(const file of expected){
        if(!fs.existsSync(file.target)) continue;
        const current=sha(fs.readFileSync(file.target));
        const rel=slash(path.relative(projectRoot,file.target));
        if(current!==file.sha256&&current!==baseline.get(rel)) throw new Error(`Refusing adoption because bytes differ from baseline and generated projection: ${rel}`);
      }
    }
  }else{
    const managedPaths=new Set(managed.keys());
    const previousSources=new Set((previous.files||[]).map(entry=>entry.source.split('/').slice(0,4).join('/')));
    for(const file of generated){
      const rel=slash(path.relative(projectRoot,file.target));
      if(fs.existsSync(file.target)&&!managedPaths.has(rel)){
        const skill=skills.find(item=>inside(item.target,file.target));
        const sourceRoot=slash(path.relative(projectRoot,skill.source));
        if(previousSources.has(sourceRoot)) throw new Error(`Refusing to overwrite unmarked projection: ${rel}`);
      }
    }
    for(const [skill,expected] of expectedBySkill){
      const sourceRoot=slash(path.relative(projectRoot,skill.source));
      if(previousSources.has(sourceRoot)) continue;
      const existing=filesUnder(skill.target);
      const expectedSet=new Set(expected.map(file=>file.target));
      if(existing.some(file=>!expectedSet.has(file))||existing.length>expected.length) throw new Error(`Refusing adoption with unrecognized files: ${slash(path.relative(projectRoot,skill.target))}`);
      for(const file of expected){
        if(!fs.existsSync(file.target)) continue;
        const current=sha(fs.readFileSync(file.target));
        const rel=slash(path.relative(projectRoot,file.target));
        if(current!==file.sha256&&current!==baseline.get(rel)) throw new Error(`Refusing adoption because bytes differ from baseline and generated projection: ${rel}`);
      }
    }
  }
  if(previous&&generated.every(file=>managed.get(slash(path.relative(projectRoot,file.target)))===file.sha256&&fs.existsSync(file.target)&&sha(fs.readFileSync(file.target))===file.sha256)) return {status:'unchanged',fileCount:generated.length,marker};
  const next={schemaVersion:'1.0.0',plugin:map.plugin,generatedAt:new Date().toISOString(),files:generated.map(file=>({path:slash(path.relative(projectRoot,file.target)),source:slash(path.relative(projectRoot,file.source)),sourceSha256:file.sourceSha256,sha256:file.sha256}))};
  const stage=path.join(pluginRoot,`.workflow-projection-stage-${process.pid}`);
  if(fs.existsSync(stage)) throw new Error(`Refusing existing staging directory: ${stage}`);
  const backups=[]; const created=[]; let markerBackup=null; let markerWritten=false;
  try{
    fs.mkdirSync(stage,{recursive:false});
    for(const file of generated){const staged=path.join(stage,'files',slash(path.relative(projectRoot,file.target)));fs.mkdirSync(path.dirname(staged),{recursive:true});fs.writeFileSync(staged,file.content);}
    const markerTemp=path.join(stage,'marker.json');fs.writeFileSync(markerTemp,`${JSON.stringify(next,null,2)}\n`);
    for(const file of generated){
      fs.mkdirSync(path.dirname(file.target),{recursive:true}); const staged=path.join(stage,'files',slash(path.relative(projectRoot,file.target)));
      if(fs.existsSync(file.target)){const backup=path.join(stage,'backups',slash(path.relative(projectRoot,file.target)));fs.mkdirSync(path.dirname(backup),{recursive:true});fs.renameSync(file.target,backup);backups.push({backup,target:file.target});}
      else created.push(file.target);
      fs.renameSync(staged,file.target);
    }
    if(fs.existsSync(marker)){markerBackup=path.join(stage,'marker.previous.json');fs.renameSync(marker,markerBackup);}
    fs.renameSync(markerTemp,marker);markerWritten=true;
  }catch(error){
    if(markerWritten&&fs.existsSync(marker))fs.rmSync(marker,{force:true});
    if(markerBackup&&fs.existsSync(markerBackup))fs.renameSync(markerBackup,marker);
    for(const target of created.reverse())if(fs.existsSync(target))fs.rmSync(target,{force:true});
    for(const item of backups.reverse()){if(fs.existsSync(item.target))fs.rmSync(item.target,{force:true});if(fs.existsSync(item.backup))fs.renameSync(item.backup,item.target);}
    throw error;
  }finally{fs.rmSync(stage,{recursive:true,force:true});}
  return {status:previous?'synchronized':'created',fileCount:generated.length,marker};
}

if(require.main===module){try{console.log(JSON.stringify(syncSkillProjections(),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={syncSkillProjections};
