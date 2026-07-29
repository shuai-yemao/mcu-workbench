const fs = require('fs');
const path = require('path');

function collectMarkdownFiles(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectMarkdownFiles(current));
    else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') files.push(current);
  }
  return files.sort();
}

function maskInlineCode(line) {
  return line.replace(/(`+)(.*?)\1/g, (match) => ' '.repeat(match.length));
}

function mapMarkdownLinks(content, mapper) {
  const lines = content.split(/(?<=\n)/);
  let fenced = false;
  return lines.map((line, lineIndex) => {
    const body = line.replace(/\r?\n$/, '');
    if (/^\s*(?:```|~~~)/.test(body)) {
      fenced = !fenced;
      return line;
    }
    if (fenced) return line;

    const masked = maskInlineCode(body);
    const pattern = /!?\[[^\]]*\]\((?<target><[^>]+>|[^)\s]+)(?<tail>[^)]*)\)/g;
    const replacements = [];
    for (const match of masked.matchAll(pattern)) {
      const rawTarget = match.groups.target;
      const target = rawTarget.startsWith('<') ? rawTarget.slice(1, -1) : rawTarget;
      const replacement = mapper({
        target,
        line: lineIndex + 1,
        column: match.index + match[0].indexOf(rawTarget) + 1
      });
      if (replacement && replacement !== target) {
        const start = match.index + match[0].indexOf(rawTarget);
        replacements.push({
          start,
          end: start + rawTarget.length,
          value: rawTarget.startsWith('<') ? `<${replacement}>` : replacement
        });
      }
    }

    let rewritten = body;
    for (const replacement of replacements.reverse()) {
      rewritten = rewritten.slice(0, replacement.start)
        + replacement.value
        + rewritten.slice(replacement.end);
    }
    return rewritten + line.slice(body.length);
  }).join('');
}

function isExternalOrIgnored(target) {
  return !target
    || target.startsWith('#')
    || /^(?:https?:|mailto:|data:)/i.test(target)
    || target.includes('$')
    || target.includes('{');
}

function isInsideOrEqual(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`)
    && relative !== '..'
    && !path.isAbsolute(relative));
}

function localTarget(target) {
  const withoutAnchor = target.split('#')[0];
  try {
    return decodeURIComponent(withoutAnchor).replace(/\\/g, '/');
  } catch (_error) {
    return withoutAnchor.replace(/\\/g, '/');
  }
}

function validateSkillLinks({ root, boundaryRoot = root } = {}) {
  const resolvedRoot = path.resolve(root || process.cwd());
  const resolvedBoundary = path.resolve(boundaryRoot || resolvedRoot);
  const findings = [];

  for (const filePath of collectMarkdownFiles(resolvedRoot)) {
    findings.push(...validateMarkdownFileLinks({
      filePath,
      displayRoot: resolvedRoot,
      boundaryRoot: resolvedBoundary
    }));
  }

  findings.sort((left, right) => left.file.localeCompare(right.file)
    || left.line - right.line
    || left.column - right.column
    || left.ruleId.localeCompare(right.ruleId));
  return {
    root: resolvedRoot,
    summary: { files: collectMarkdownFiles(resolvedRoot).length, errors: findings.length },
    findings
  };
}

function validateMarkdownFileLinks({ filePath, displayRoot, boundaryRoot }) {
  const resolvedDisplayRoot = path.resolve(displayRoot || path.dirname(filePath));
  const resolvedBoundary = path.resolve(boundaryRoot || resolvedDisplayRoot);
  const findings = [];
  const content = fs.readFileSync(filePath, 'utf8');
  mapMarkdownLinks(content, ({ target, line, column }) => {
    if (isExternalOrIgnored(target)) return null;
    const relativeTarget = localTarget(target);
    if (!relativeTarget) return null;
    const resolvedTarget = path.resolve(path.dirname(filePath), relativeTarget);
    const common = {
      file: path.relative(resolvedDisplayRoot, filePath).split(path.sep).join('/'),
      line,
      column,
      target
    };
    if (!isInsideOrEqual(resolvedBoundary, resolvedTarget)) {
      findings.push({
        ruleId: 'LINK_OUTSIDE_ROOT',
        severity: 'error',
        ...common,
        message: 'Relative Markdown link escapes the declared repository boundary.'
      });
    } else if (!fs.existsSync(resolvedTarget)) {
      findings.push({
        ruleId: 'LINK_NOT_FOUND',
        severity: 'error',
        ...common,
        message: 'Relative Markdown link target does not exist.'
      });
    }
    return null;
  });
  return findings;
}

module.exports = {
  collectMarkdownFiles,
  isExternalOrIgnored,
  localTarget,
  mapMarkdownLinks,
  validateMarkdownFileLinks,
  validateSkillLinks
};
