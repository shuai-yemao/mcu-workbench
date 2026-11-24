'use strict';

function maskInlineCode(line) { return line.replace(/(`+)(.*?)\1/g, match => ' '.repeat(match.length)); }

function mapMarkdownLinks(content, mapper) {
  const lines=content.split(/(?<=\n)/); let fenced=false;
  return lines.map((line,lineIndex)=>{
    const body=line.replace(/\r?\n$/,'');
    if(/^\s*(?:```|~~~)/.test(body)){fenced=!fenced;return line;}
    if(fenced)return line;
    const masked=maskInlineCode(body), pattern=/!?\[[^\]]*\]\((?<target><[^>]+>|[^)\s]+)(?<tail>[^)]*)\)/g, replacements=[];
    for(const match of masked.matchAll(pattern)){
      const raw=match.groups.target, target=raw.startsWith('<')?raw.slice(1,-1):raw;
      const replacement=mapper({target,line:lineIndex+1,column:match.index+match[0].lastIndexOf(raw)+1});
      if(replacement&&replacement!==target){
        const start=match.index+match[0].lastIndexOf(raw);
        replacements.push({start,end:start+raw.length,value:raw.startsWith('<')?`<${replacement}>`:replacement});
      }
    }
    let rewritten=body;
    for(const item of replacements.reverse())rewritten=rewritten.slice(0,item.start)+item.value+rewritten.slice(item.end);
    return rewritten+line.slice(body.length);
  }).join('');
}

module.exports={mapMarkdownLinks};
