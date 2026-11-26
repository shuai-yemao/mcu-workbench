'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateDescriptor } = require('../../../packages/contracts');
const { validateSkillLinks, collectMarkdownFiles, mapMarkdownLinks } = require('../../../lib/skill-links');

const DEFAULT_PLUGIN_ROOT = path.resolve(__dirname, '..');
const PLUGIN_ID = 'mcu-workbench-workflow';
const HOST_MANIFESTS = ['.codex-plugin/plugin.json', '.cursor-plugin/plugin.json'];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const slash = value => value.split(path.sep).join('/');
const inside = (root,target) => { const rel=path.relative(root,target); return rel===''||(!rel.startsWith(`..${path.sep}`)&&rel!=='..'&&!path.isAbsolute(rel)); };
const filesUnder = root => !fs.existsSync(root)?[]:fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>{if(e.isDirectory()&&e.name==='.git')return [];const f=path.join(root,e.name);return e.isDirectory()?filesUnder(f):e.isFile()?[f]:[];}).sort();

function readJson(pluginRoot, relativePath, errors) {
  try { return JSON.parse(fs.readFileSync(path.join(pluginRoot, relativePath), 'utf8')); }
  catch (error) { errors.push(`${relativePath}: ${error.message}`); return null; }
}
function skillRoots(manifest) { return Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills]; }
function validateWorkflowPlugin(options={}) {
  const pluginRoot=path.resolve(options.pluginRoot||DEFAULT_PLUGIN_ROOT);
  const projectRoot=path.resolve(options.projectRoot||path.resolve(pluginRoot,'../..'));
  const errors=[];
  const descriptor=readJson(pluginRoot,'descriptor.json',errors), pkg=readJson(pluginRoot,'package.json',errors), plugin=readJson(pluginRoot,'plugin.json',errors), map=readJson(pluginRoot,'skill-map.json',errors);
  const hosts=HOST_MANIFESTS.map(relativePath=>({relativePath,manifest:readJson(pluginRoot,relativePath,errors)}));
  if(descriptor)errors.push(...validateDescriptor(descriptor).errors);
  for(const [name,value] of [['package.json',pkg],['plugin.json',plugin],...hosts.map(x=>[x.relativePath,x.manifest])]){
    if(!value)continue;
    if((value.name||value.id)!==PLUGIN_ID)errors.push(`${name}: plugin ID mismatch`);
    if(descriptor&&value.version!==descriptor.version)errors.push(`${name}: version mismatch`);
  }
  if(pkg&&pkg.name!==PLUGIN_ID)errors.push('package.json: package name mismatch');
  if(plugin&&plugin.id!==PLUGIN_ID)errors.push('plugin.json: plugin ID mismatch');
  for(const {relativePath,manifest} of hosts)if(manifest&&!skillRoots(manifest).includes('./skills/'))errors.push(`${relativePath}: missing ./skills/ root`);
  const skills=map&&Array.isArray(map.skills)?map.skills:[];
  if(!map||map.plugin!==PLUGIN_ID)errors.push('skill-map.json: plugin ID mismatch');
  const ids=skills.map(skill=>skill&&skill.id);
  if(new Set(ids).size!==ids.length)errors.push('skill-map.json: duplicate Skill ID');
  let expectedIds=[];
  if(Array.isArray(options.expectedIds))expectedIds=options.expectedIds;
  else try{expectedIds=require(path.join(projectRoot,'skills/catalog')).pluginSkills(PLUGIN_ID).map(skill=>skill.id);}catch(error){errors.push(`catalog: ${error.message}`);}
  if(expectedIds.length&&JSON.stringify(ids)!==JSON.stringify(expectedIds))errors.push('skill-map.json: IDs differ from catalog registration or ordering');
  const missingSkills=[];
  for(const skill of skills){
    if(!skill||!skill.id||!skill.sourcePath||!skill.projectionPath){errors.push('skill-map.json: invalid Skill mapping');continue;}
    const source=path.resolve(projectRoot,skill.sourcePath);
    if(!inside(path.join(pluginRoot,'skills'),source))errors.push(`Skill source escapes plugin root: ${skill.id}`);
    if(!fs.existsSync(path.join(source,'SKILL.md')))missingSkills.push(skill.id);
    const expectedSource=slash(path.relative(projectRoot,source));
    if(skill.sourcePath!==expectedSource)errors.push(`Skill source path is not canonical: ${skill.id}`);
  }
  if(missingSkills.length)errors.push(`missing plugin Skill sources: ${missingSkills.join(', ')}`);

  const linkResult=validateSkillLinks({root:pluginRoot,boundaryRoot:pluginRoot});
  if(linkResult.summary.errors)errors.push(`Workflow plugin has ${linkResult.summary.errors} invalid Markdown links`);
  const shared=readJson(pluginRoot,'references/shared-sources.json',errors), external=readJson(pluginRoot,'references/external-dependencies.json',errors);
  const sharedFiles=shared&&Array.isArray(shared.files)?shared.files:[];
  if(shared&&shared.plugin!==PLUGIN_ID)errors.push('shared-sources.json: plugin ID mismatch');
  for(const file of sharedFiles){
    const snapshot=path.resolve(pluginRoot,'references/shared',file.packagePath), source=path.resolve(projectRoot,file.sourcePath);
    if(!inside(path.join(pluginRoot,'references/shared'),snapshot)||!fs.existsSync(snapshot)||sha(fs.readFileSync(snapshot))!==file.sha256)errors.push(`invalid shared snapshot: ${file.packagePath}`);
    if(!inside(projectRoot,source)||!fs.existsSync(source)||sha(fs.readFileSync(source))!==file.sourceSha256)errors.push(`shared source hash mismatch: ${file.sourcePath}`);
    if(file.ownerPluginSourcePath&&file.ownerPluginSha256){const owner=path.resolve(projectRoot,file.ownerPluginSourcePath);if(!inside(projectRoot,owner)||!fs.existsSync(owner)||sha(fs.readFileSync(owner))!==file.ownerPluginSha256)errors.push(`shared owner hash mismatch: ${file.ownerPluginSourcePath}`);}
  }
  if(external&&external.plugin!==PLUGIN_ID)errors.push('external-dependencies.json: plugin ID mismatch');
  const dependencies=external&&Array.isArray(external.dependencies)?external.dependencies:[];
  const depKeys=new Set(dependencies.map(item=>`${item.source}\0${item.declaredAs}`));
  const sharedByPackage=sharedFiles;
  const sourceIdentity=packageFile=>{
    for(const skill of skills){const sourceRoot=path.resolve(projectRoot,skill.sourcePath);if(inside(sourceRoot,packageFile)){const oldRoot=path.resolve(projectRoot,skill.projectionPath);return slash(path.relative(projectRoot,path.join(oldRoot,path.relative(sourceRoot,packageFile))));}}
    const sharedRoot=path.resolve(pluginRoot,'references/shared');
    if(inside(sharedRoot,packageFile)){
      const rel=slash(path.relative(sharedRoot,packageFile));const entry=sharedByPackage.find(item=>item.packagePath===rel||rel.startsWith(`${item.packagePath}/`));
      if(entry)return entry.sourcePath;
    }
    return null;
  };
  const observedExternal=[];
  for(const file of collectMarkdownFiles(pluginRoot)){
    const content=fs.readFileSync(file,'utf8');
    mapMarkdownLinks(content,({target})=>{if(target.startsWith('external:')){const source=sourceIdentity(file);observedExternal.push({source,target});if(!source||!depKeys.has(`${source}\0${target}`))errors.push(`unregistered external Markdown dependency: ${slash(path.relative(pluginRoot,file))} -> ${target}`);}return null;});
  }
  for(const item of dependencies){if(!item.source||!item.declaredAs||!item.declaredAs.startsWith('external:'))errors.push('invalid external dependency declaration');if(!observedExternal.some(ref=>ref.source===item.source&&ref.target===item.declaredAs))errors.push(`unused external dependency declaration: ${item.source} -> ${item.declaredAs}`);}

  const markerPath=path.join(projectRoot,'skills/.workflow-projections.json');let projectionFileCount=0;
  if(!fs.existsSync(markerPath))errors.push('missing Workflow projection marker');
  else{
    let marker;try{marker=JSON.parse(fs.readFileSync(markerPath,'utf8'));}catch(error){errors.push(`Workflow marker: ${error.message}`);}
    if(marker){
      if(marker.schemaVersion!=='1.0.0'||marker.plugin!==PLUGIN_ID||!Array.isArray(marker.files))errors.push('Workflow marker identity/schema invalid');
      const seen=new Set();const expected=[];
      for(const skill of skills){const sourceRoot=path.resolve(projectRoot,skill.sourcePath),targetRoot=path.resolve(projectRoot,skill.projectionPath);for(const source of filesUnder(sourceRoot))expected.push({source,target:path.resolve(targetRoot,path.relative(sourceRoot,source))});}
      projectionFileCount=marker.files.length;
      if(marker.files.length!==expected.length)errors.push(`Workflow marker file count mismatch: expected ${expected.length}, found ${marker.files.length}`);
      for(const entry of marker.files){
        const target=path.resolve(projectRoot,entry.path),source=path.resolve(projectRoot,entry.source),key=entry.path;
        if(seen.has(key))errors.push(`duplicate Workflow marker path: ${key}`);seen.add(key);
        if(!inside(path.join(projectRoot,'skills'),target)||!fs.existsSync(target)||sha(fs.readFileSync(target))!==entry.sha256)errors.push(`Workflow projection hash mismatch: ${key}`);
        if(!inside(path.join(pluginRoot,'skills'),source)||!fs.existsSync(source)||sha(fs.readFileSync(source))!==entry.sourceSha256)errors.push(`Workflow projection source mismatch: ${entry.source}`);
        if(!expected.some(item=>item.source===source&&item.target===target))errors.push(`unregistered Workflow projection: ${key}`);
      }
    }
  }
  return {valid:errors.length===0,skillCount:skills.length,missingSkills,sharedFileCount:sharedFiles.length,externalDependencyCount:dependencies.length,projectionFileCount,linkErrors:linkResult.summary.errors,linkFindings:linkResult.findings,errors};
}

if(require.main===module){const result=validateWorkflowPlugin();if(!result.valid){console.error(result.errors.join('\n'));process.exitCode=1;}else console.log(`Workflow plugin validation passed: ${result.skillCount} Skills, ${result.sharedFileCount} shared files, ${result.projectionFileCount} projections, ${result.externalDependencyCount} external references`);}
module.exports={validateWorkflowPlugin};
