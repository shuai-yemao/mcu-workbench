'use strict';
const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
const {collectMarkdownFiles,localTarget,isExternalOrIgnored}=require('../../../lib/skill-links');
const {mapMarkdownLinks}=require('./markdown-links');
const PLUGIN_ROOT=path.resolve(__dirname,'..'); const PROJECT_ROOT=path.resolve(PLUGIN_ROOT,'../..');
const MAP_PATH=path.join(PLUGIN_ROOT,'skill-map.json'); const SHARED_ROOT=path.join(PLUGIN_ROOT,'references/shared');
const MANIFEST_PATH=path.join(PLUGIN_ROOT,'references/shared-sources.json'); const EXTERNAL_PATH=path.join(PLUGIN_ROOT,'references/external-dependencies.json');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const slash=value=>value.split(path.sep).join('/');
const inside=(root,target)=>{const r=path.relative(root,target);return r===''||(!r.startsWith(`..${path.sep}`)&&r!=='..'&&!path.isAbsolute(r));};
const filesUnder=root=>!fs.existsSync(root)?[]:fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>{const f=path.join(root,e.name);return e.isDirectory()?filesUnder(f):e.isFile()?[f]:[];}).sort();
const relativeLink=(from,to)=>{let r=slash(path.relative(path.dirname(from),to));return r.startsWith('.')?r:`./${r}`;};
const suffixOf=raw=>{const n=raw.indexOf('#');return n<0?'':raw.slice(n);};
const rootTarget=(file,raw)=>path.resolve(path.dirname(file),localTarget(raw));
function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function loadMap(){const map=readJson(MAP_PATH);if(map.plugin!=='mcu-workbench-workflow'||map.skills.length!==18)throw new Error('Workflow skill map must contain exactly 18 Skills.');return map;}
function sourcesFor(map){return map.skills.map(item=>({id:item.id,oldRoot:path.resolve(PROJECT_ROOT,item.projectionPath),packageRoot:path.resolve(PLUGIN_ROOT,'skills',item.id),projection:item.projectionPath}));}
function selectedSource(file,sources){return sources.find(s=>inside(s.oldRoot,file));}
function knownExternal(raw,sourceFile){const resolved=rootTarget(sourceFile,raw);return {source:slash(path.relative(PROJECT_ROOT,sourceFile)),target:raw,resolved:slash(path.relative(PROJECT_ROOT,resolved)),reason:path.isAbsolute(raw)||/^\/(?:home|Users|tmp)\//.test(raw)?'absolute-path-outside-repository':'target-not-present-in-repository'};}
function ownerMetadata(sourceFile){
  const sourcePath=slash(path.relative(PROJECT_ROOT,sourceFile));
  for(const dir of fs.readdirSync(path.join(PROJECT_ROOT,'plugins'),{withFileTypes:true}).filter(x=>x.isDirectory())){
    const mapPath=path.join(PROJECT_ROOT,'plugins',dir.name,'skill-map.json'); if(!fs.existsSync(mapPath))continue;
    const m=readJson(mapPath);
    for(const skill of m.skills||[]){const projection=path.resolve(PROJECT_ROOT,skill.projectionPath);if(inside(projection,sourceFile)){const pluginSource=path.resolve(PROJECT_ROOT,skill.pluginPath,path.relative(projection,sourceFile));return {ownerPlugin:m.plugin,ownerPluginSourcePath:slash(path.relative(PROJECT_ROOT,pluginSource)),ownerPluginSha256:fs.existsSync(pluginSource)?sha(fs.readFileSync(pluginSource)):null};}}
  }
  if(sourcePath.startsWith('skills/app/')||sourcePath.startsWith('skills/platform/')||sourcePath.startsWith('skills/impl/')||sourcePath.startsWith('skills/service/')||sourcePath.startsWith('skills/vendor/')||sourcePath.startsWith('skills/bsp/'))return {ownerPlugin:'mcu-workbench-architecture',ownerPluginSourcePath:null,ownerPluginSha256:null};
  return {ownerPlugin:'repository-shared-or-unassigned',ownerPluginSourcePath:null,ownerPluginSha256:null};
}
function collectClosure(map,sources,baseline){
  const closure=new Set(), queue=[], external=new Map(), sourceHashes=new Map();
  const add=(origin,raw)=>{
    if(isExternalOrIgnored(raw)||!localTarget(raw))return;
    if(path.isAbsolute(raw)||/^\/(?:home|Users|tmp)\//.test(raw)){const x=knownExternal(raw,origin);external.set(`${x.source}\0${raw}`,x);return;}
    const target=rootTarget(origin,raw);
    if(!inside(PROJECT_ROOT,target))throw new Error(`Reference escapes repository root: ${raw} from ${slash(path.relative(PROJECT_ROOT,origin))}`);
    const selected=selectedSource(target,sources);
    if(selected&&fs.existsSync(target))return;
    if(!fs.existsSync(target)){const x=knownExternal(raw,origin);external.set(`${x.source}\0${raw}`,x);return;}
    const stat=fs.statSync(target);
    const files=stat.isDirectory()?filesUnder(target):stat.isFile()?[target]:[];
    for(const file of files)if(!closure.has(file)){closure.add(file);queue.push(file);}
  };
  for(const skill of sources){
    for(const file of filesUnder(skill.oldRoot)){
      const rel=slash(path.relative(PROJECT_ROOT,file)); const expected=baseline.get(rel);
      if(expected&&sha(fs.readFileSync(file))!==expected)throw new Error(`Workflow source changed since frozen baseline: ${rel}`);
      sourceHashes.set(file,sha(fs.readFileSync(file)));
      if(path.extname(file).toLowerCase()==='.md')mapMarkdownLinks(fs.readFileSync(file,'utf8'),({target})=>{add(file,target);return null;});
    }
  }
  while(queue.length){const file=queue.pop();if(path.extname(file).toLowerCase()!=='.md')continue;mapMarkdownLinks(fs.readFileSync(file,'utf8'),({target})=>{add(file,target);return null;});}
  return {closure:[...closure].sort(),external:[...external.values()],sourceHashes};
}
function main(){
  const map=loadMap(), sources=sourcesFor(map);
  const baselineFile=path.join(PROJECT_ROOT,'codex/plugin-split/artifacts/workflow/baseline/skill-files.json');
  if(!fs.existsSync(baselineFile))throw new Error('Missing T-001 frozen source baseline.');
  const baseline=new Map(readJson(baselineFile).files.map(x=>[x.path,x.sha256]));
  const prior=fs.existsSync(MANIFEST_PATH)||fs.existsSync(EXTERNAL_PATH)||fs.existsSync(SHARED_ROOT);
  if(prior){
    if(!fs.existsSync(MANIFEST_PATH)||!fs.existsSync(EXTERNAL_PATH)||!fs.existsSync(SHARED_ROOT))throw new Error('Refusing incomplete Workflow link preparation state.');
    const old=readJson(MANIFEST_PATH), oldExternal=readJson(EXTERNAL_PATH);
    if(old.plugin!==map.plugin||oldExternal.plugin!==map.plugin||!Array.isArray(old.files)||!Array.isArray(old.skillLinks)||!Array.isArray(old.sourceHashes)||!Array.isArray(oldExternal.dependencies))throw new Error('Refusing malformed Workflow link preparation manifest.');
    for(const file of old.files){const snapshot=path.join(SHARED_ROOT,file.packagePath),source=path.resolve(PROJECT_ROOT,file.sourcePath);if(!fs.existsSync(snapshot)||sha(fs.readFileSync(snapshot))!==file.sha256)throw new Error(`Refusing modified Workflow shared snapshot: ${file.packagePath}`);if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==file.sourceSha256)throw new Error(`Refusing changed Workflow shared source: ${file.sourcePath}`);if(file.ownerPluginSourcePath&&file.ownerPluginSha256){const owner=path.resolve(PROJECT_ROOT,file.ownerPluginSourcePath);if(!fs.existsSync(owner)||sha(fs.readFileSync(owner))!==file.ownerPluginSha256)throw new Error(`Refusing changed shared owner source: ${file.ownerPluginSourcePath}`);}}
    for(const file of old.sourceHashes){const source=path.resolve(PROJECT_ROOT,file.sourcePath);if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==file.sourceSha256)throw new Error(`Refusing changed closure source: ${file.sourcePath}`);}
    for(const file of old.skillLinks){const source=path.join(PLUGIN_ROOT,file.packagePath);if(!fs.existsSync(source)||sha(fs.readFileSync(source))!==file.sha256)throw new Error(`Refusing modified rewritten Skill source: ${file.packagePath}`);}
    const expected=new Set(old.files.map(file=>file.packagePath));const actual=filesUnder(SHARED_ROOT).map(file=>slash(path.relative(SHARED_ROOT,file)));if(actual.length!==expected.size||actual.some(file=>!expected.has(file)))throw new Error('Refusing unregistered files in Workflow shared snapshot directory.');
    return {status:'unchanged',sharedFileCount:old.files.length,rewrittenSkillFileCount:old.skillLinks.length,externalDependencyCount:oldExternal.dependencies.length,manifest:MANIFEST_PATH};
  }
  const {closure,external,sourceHashes}=collectClosure(map,sources,baseline), closureSet=new Set(closure);
  const externalMap=new Map(external.map(x=>[`${x.source}\0${x.target}`,x]));
  const remap=(content,origin,packageFile)=>mapMarkdownLinks(content,({target})=>{
    if(isExternalOrIgnored(target)||!localTarget(target))return null;
    if(path.isAbsolute(target)||/^\/(?:home|Users|tmp)\//.test(target)||!fs.existsSync(rootTarget(origin,target))){
      if(!path.isAbsolute(target)&&!/^\/(?:home|Users|tmp)\//.test(target)&&!externalMap.has(`${slash(path.relative(PROJECT_ROOT,origin))}\0${target}`))throw new Error(`Undeclared missing reference: ${target} in ${slash(path.relative(PROJECT_ROOT,origin))}; ledger has ${[...externalMap.keys()].filter(key=>key.includes('skill-template')).join(', ')}`);
      return `external:${target}`;
    }
    const targetFile=rootTarget(origin,target), selected=selectedSource(targetFile,sources);
    let packageTarget;
    if(selected)packageTarget=path.join(selected.packageRoot,path.relative(selected.oldRoot,targetFile));
    else if(closureSet.has(targetFile)||[...closureSet].some(f=>inside(targetFile,f)))packageTarget=path.join(SHARED_ROOT,path.relative(PROJECT_ROOT,targetFile));
    else throw new Error(`Reference missing from declared closure: ${slash(path.relative(PROJECT_ROOT,targetFile))}`);
    return `${relativeLink(packageFile,packageTarget)}${suffixOf(target)}`;
  });
  const stagedSkills=[], generatedShared=[];
  for(const skill of sources)for(const source of filesUnder(skill.packageRoot)){
    const relative=path.relative(skill.packageRoot,source), origin=path.join(skill.oldRoot,relative), content=fs.readFileSync(source), out=path.extname(source).toLowerCase()==='.md'?Buffer.from(remap(content.toString('utf8'),origin,source),'utf8'):content;
    if(!fs.readFileSync(origin).equals(content))throw new Error(`Migrated Skill differs from frozen source: ${slash(path.relative(PROJECT_ROOT,origin))}`);
    if(!out.equals(content))stagedSkills.push({file:source,content:out,originalSha256:sha(content),sha256:sha(out),sourcePath:slash(path.relative(PROJECT_ROOT,origin))});
  }
  for(const source of closure){const packageFile=path.join(SHARED_ROOT,path.relative(PROJECT_ROOT,source)), bytes=fs.readFileSync(source), out=path.extname(source).toLowerCase()==='.md'?Buffer.from(remap(bytes.toString('utf8'),source,packageFile),'utf8'):bytes, owner=ownerMetadata(source);generatedShared.push({sourcePath:slash(path.relative(PROJECT_ROOT,source)),packagePath:slash(path.relative(SHARED_ROOT,packageFile)),sourceSha256:sha(bytes),sha256:sha(out),ownerPlugin:owner.ownerPlugin,ownerPluginSourcePath:owner.ownerPluginSourcePath,ownerPluginSha256:owner.ownerPluginSha256,content:out});}
  const stage=path.join(PLUGIN_ROOT,`.workflow-link-stage-${process.pid}`);fs.mkdirSync(stage,{recursive:false});const applied=[],backups=[];
  try{
    for(const item of generatedShared){const dest=path.join(stage,'shared',item.packagePath);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,item.content);}
    for(let i=0;i<stagedSkills.length;i++){const item=stagedSkills[i],dest=path.join(stage,'skills',String(i));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,item.content);}
    const manifest={schemaVersion:'1.0.0',plugin:map.plugin,generatedAt:new Date().toISOString(),files:generatedShared.map(({content,...x})=>x),sourceHashes:closure.map(sourcePath=>({sourcePath:slash(path.relative(PROJECT_ROOT,sourcePath)),sourceSha256:sha(fs.readFileSync(sourcePath)),...ownerMetadata(sourcePath)})),skillLinks:stagedSkills.map(({content,...x})=>({...x,packagePath:slash(path.relative(PLUGIN_ROOT,x.file))}))};
    const externalManifest={schemaVersion:'1.0.0',plugin:map.plugin,generatedAt:manifest.generatedAt,dependencies:external.map(x=>({...x,declaredAs:`external:${x.target}`}))};
    manifest.skillLinks=stagedSkills.map(({file,originalSha256,sha256,sourcePath})=>({packagePath:slash(path.relative(PLUGIN_ROOT,file)),sourcePath,sourceSha256:originalSha256,sha256}));
    fs.writeFileSync(path.join(stage,'shared-sources.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(stage,'external-dependencies.json'),JSON.stringify(externalManifest,null,2)+'\n');
    const changes=[...generatedShared.map(x=>({temp:path.join(stage,'shared',x.packagePath),target:path.join(SHARED_ROOT,x.packagePath)})),...stagedSkills.map((x,i)=>({temp:path.join(stage,'skills',String(i)),target:x.file})),{temp:path.join(stage,'shared-sources.json'),target:MANIFEST_PATH},{temp:path.join(stage,'external-dependencies.json'),target:EXTERNAL_PATH}];
    if(fs.existsSync(SHARED_ROOT)||fs.existsSync(MANIFEST_PATH)||fs.existsSync(EXTERNAL_PATH))throw new Error('Refusing to replace existing Workflow link artifacts.');
    for(const change of changes){fs.mkdirSync(path.dirname(change.target),{recursive:true});if(fs.existsSync(change.target)){const backup=path.join(stage,'backups',String(backups.length));fs.mkdirSync(path.dirname(backup),{recursive:true});fs.renameSync(change.target,backup);backups.push({backup,target:change.target});}else applied.push(change.target);fs.renameSync(change.temp,change.target);}
  }catch(error){for(const target of applied.reverse())if(fs.existsSync(target))fs.rmSync(target,{recursive:true,force:true});for(const b of backups.reverse())if(fs.existsSync(b.backup))fs.renameSync(b.backup,b.target);throw error;}finally{fs.rmSync(stage,{recursive:true,force:true});}
  return {status:'created',sharedFileCount:generatedShared.length,rewrittenSkillFileCount:stagedSkills.length,externalDependencyCount:external.length,manifest:MANIFEST_PATH};
}
if(require.main===module){try{console.log(JSON.stringify(main(),null,2));}catch(error){console.error(`Workflow link preparation failed: ${error.message}`);process.exitCode=1;}}
module.exports={prepareSkillLinks:main};
