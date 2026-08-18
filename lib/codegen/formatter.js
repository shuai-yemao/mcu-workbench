const path = require('path');
const { spawnSync } = require('child_process');
const { fileHeader } = require('./source-style');

const FORMAT_CONFIG = path.join(
  __dirname,
  '..',
  '..',
  'skills',
  'tools',
  'tools-quality',
  'references',
  'capabilities',
  'quality-format-check',
  '.clang-format'
);
const COMMENT_WIDTHS = Object.freeze({
  primary: 80,
  secondary: 60,
  tertiary: 40
});

function formatterError(message, code = 'FORMAT') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitFunctionParameters(parameters) {
  const result = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < parameters.length; index += 1) {
    if (parameters[index] === '(') depth += 1;
    if (parameters[index] === ')') depth -= 1;
    if (parameters[index] === ',' && depth === 0) {
      result.push(parameters.slice(start, index).trim());
      start = index + 1;
    }
  }
  const last = parameters.slice(start).trim();
  if (last) result.push(last);
  return result.filter((parameter) => parameter !== 'void' && parameter !== '...');
}

function findGeneratedFunctions(content) {
  const expression = /(^|\n)[ \t]*(?:(?:static|extern)\s+)?(?:const\s+)?[A-Za-z_]\w*(?:[ \t]+|\s*\*)+([A-Za-z_]\w*)\s*\(([\s\S]*?)\)\s*(;|\{)/g;
  const functions = [];
  for (const match of content.matchAll(expression)) {
    const name = match[2];
    if (['if', 'for', 'while', 'switch', 'return', 'void'].includes(name)
      || /\breturn\s+[A-Za-z_]\w*\s*\(/.test(match[0])
      || /\(\s*\*\s*\w+\s*\)/.test(match[0])) continue;
    const lineStart = (match.index || 0) + (match[1] === '\n' ? 1 : 0);
    const nameStart = lineStart + match[0].slice(lineStart - (match.index || 0)).indexOf(name);
    const terminator = match[4];
    const openBrace = terminator === '{' ? (match.index || 0) + match[0].lastIndexOf('{') : -1;
    let body = '';
    if (openBrace >= 0) {
      let depth = 0;
      let cursor = openBrace;
      for (; cursor < content.length; cursor += 1) {
        if (content[cursor] === '{') depth += 1;
        else if (content[cursor] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      body = content.slice(openBrace + 1, cursor);
    }
    const signatureStart = lineStart;
    const signatureEnd = terminator === ';'
      ? (match.index || 0) + match[0].length
      : openBrace + 1;
    functions.push({
      name,
      isStatic: /^\s*static\b/.test(match[0]),
      lineStart,
      nameStart,
      signatureStart,
      signatureEnd,
      returnType: content.slice(lineStart, nameStart).trim(),
      parameters: match[3],
      body,
      openBrace
    });
  }
  return functions;
}

function isHeaderFile(fileName) {
  return /\.(?:h|hpp)$/i.test(String(fileName || ''));
}

function isPrivateHeaderFile(fileName) {
  const normalized = String(fileName || '').replace(/\\/g, '/').toLowerCase();
  const baseName = path.posix.basename(normalized);
  return /(?:^|\/)(?:private|priv|internal)(?:\/|$)/.test(normalized)
    || /(?:^|[-_])(?:private|priv|internal)(?:[-_.]|$)/.test(baseName);
}

function isCoreFunction(functionInfo) {
  const source = `${functionInfo.name} ${functionInfo.parameters} ${functionInfo.body}`;
  const bodyLines = functionInfo.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^\/\//.test(line) && !/^\/\*/.test(line));
  const controlFlowCount = (source.match(/\b(?:if|for|while|switch|case|return)\b/g) || []).length;
  const callCount = (functionInfo.body.match(/\b[A-Za-z_]\w*\s*\(/g) || []).length;
  const riskyOperation = /(?:dma|irq|isr|callback|queue|mutex|semaphore|timeout|retry|state|error|cleanup|register|volatile)/i.test(source);
  const coreName = /(?:^|_)(?:init|deinit|register|unregister|process|dispatch|notify|transfer|flush|start|stop|cancel|handle|recover|reset|configure|bind|open|close|destroy|create|read|write|get|set)(?:_|$)/i.test(functionInfo.name);

  return coreName || bodyLines.length >= 8 || controlFlowCount >= 3 || callCount >= 3 || riskyOperation;
}

function shouldDocumentFunction(functionInfo, options = {}) {
  if (options.isHeader) return !options.isPrivateHeader;
  return functionInfo.openBrace >= 0 && isCoreFunction(functionInfo);
}

function findPrecedingDoxygen(content, start) {
  const prefix = content.slice(0, start);
  const end = prefix.length;
  const commentEnd = prefix.lastIndexOf('*/');
  if (commentEnd < 0 || /\S/.test(prefix.slice(commentEnd + 2))) return null;
  const commentStart = prefix.lastIndexOf('/**', commentEnd);
  if (commentStart < 0 || prefix.lastIndexOf('/*', commentEnd) !== commentStart) return null;
  const text = prefix.slice(commentStart, end).trim();
  if (/@file\b/.test(text)) return null;
  return { start: commentStart, end, text };
}

function parameterName(parameter) {
  const withoutDefault = parameter.replace(/\s*=.*$/, '').trim();
  const match = withoutDefault.match(/([A-Za-z_]\w*)(?:\s*\[[^\]]*\])?$/);
  return match ? match[1] : null;
}

function parameterDirection(parameter, name) {
  if (!/\*/.test(parameter) || /\bconst\b/.test(parameter)) return '[in]';
  if (/^(?:rx_|out|level|event|device_id|p_data|framebuffer)/i.test(name)) return '[out]';
  if (/^(?:callback|context|driver|handle|instance|ops|p_(?:api|context|handle|ops|state))$/i.test(name)) return '[in]';
  return '[in,out]';
}

function parameterDescription(name) {
  const descriptions = {
    callback: '事件回调函数',
    context: '传递给底层操作的用户上下文',
    device_id: '用于接收设备标识的输出地址',
    driver: '待操作的驱动实例',
    event: '用于接收事件结果的事件对象',
    event_id: '待通知的事件标识',
    handle: '待操作的 Handler 实例',
    instance: '待初始化或操作的接口实例',
    length: '待传输的数据长度',
    ops: '调用方注入的操作表',
    p_api: '用于接收操作表的输出地址',
    p_context: '传递给底层操作的用户上下文',
    p_handle: '待操作的 Handler 实例',
    p_ops: '调用方注入的操作表',
    p_state: '模块私有状态实例',
    p_data: '待处理的数据缓冲区',
    p_framebuffer: '待传输的帧缓冲区',
    rx_data: '用于接收数据的缓冲区',
    status: '事件对应的状态码',
    timeout_ms: '同步操作的超时时间，单位为毫秒',
    tx_data: '待发送的数据缓冲区'
  };
  return descriptions[name] || `调用方提供的 ${name} 参数`;
}

function functionBrief(name) {
  const rules = [
    [/_(?:driver|handle)_inst$/, '获取模块的静态实例。'],
    [/register.*ops|wrapper_register/, '注册模块依赖的操作表。'],
    [/read_id/, '读取设备标识。'],
    [/notify_from_isr/, '在中断上下文通知待处理事件。'],
    [/set_event_callback/, '设置事件回调及其用户上下文。'],
    [/process/, '处理待处理事件并执行回调。'],
    [/dma_irq_dispatch/, '处理 DMA 完成事件并生成上层事件。'],
    [/irq_dispatch/, '处理 IRQ 完成事件并生成上层事件。'],
    [/start_async/, '启动异步数据传输。'],
    [/transfer/, '执行带超时约束的同步数据传输。'],
    [/cancel/, '取消当前数据传输。'],
    [/init/, '初始化模块实例及其依赖。'],
    [/port_/, '通过板级 Port 转发底层操作。'],
    [/wrapper_/, '执行平台无关的 Wrapper 操作。']
  ];
  const rule = rules.find(([pattern]) => pattern.test(name));
  return rule ? rule[1] : `执行 ${name} 的模块操作。`;
}

function returnDescription(value) {
  if (/^0$|(?:PLATFORM_ERR_)?(?:OK|SUCCESS)$/.test(value)) return '操作成功。';
  if (/^-1$|(?:ERROR|ERR|FAIL|PARAM|NOT_SUPPORTED|TIMEOUT)/i.test(value)) return '参数非法、实例未就绪或底层操作失败。';
  if (/^-2$/.test(value)) return '回调已注册，不允许重复设置。';
  if (/^&s_/.test(value)) return '返回模块静态实例地址。';
  if (/^NULL$/.test(value)) return '未找到有效实例。';
  return '操作结果。';
}

function returnValues(functionInfo) {
  const values = [...functionInfo.body.matchAll(/\breturn\s+([^;]+);/g)]
    .map((match) => match[1].trim())
    .filter((value) => !value.includes('('));
  if (values.length) return [...new Set(values)];
  if (/\bplatform_err_t\b/.test(functionInfo.returnType)) {
    return ['PLATFORM_ERR_OK', 'PLATFORM_ERR_PARAM', 'PLATFORM_ERR_NOT_SUPPORTED'];
  }
  if (/\*/.test(functionInfo.returnType)) return ['NULL', '非空实例地址'];
  return ['0', '-1'];
}

function requiredFunctionNotes(functionInfo) {
  const source = `${functionInfo.name} ${functionInfo.parameters} ${functionInfo.body}`;
  const notes = [];
  const warnings = [];
  if (/from_isr|\b(?:irq|isr)\b/i.test(source)) {
    warnings.push('仅允许在中断上下文使用，不得调用阻塞接口或执行复杂业务逻辑。');
  }
  if (/timeout|transfer|flush|\block\b|\bunlock\b/i.test(source)) {
    notes.push('调用可能受底层同步机制或超时参数影响。');
  }
  if (/register|callback/i.test(source)) {
    notes.push('调用者需保证注入的操作表、回调和上下文在实例生命周期内有效。');
  }
  if (/dma/i.test(source)) {
    warnings.push('DMA 缓冲区必须满足目标平台的可访问、对齐和缓存一致性要求。');
  }
  return { notes, warnings };
}

function addMissingDoxygenTags(content, functionInfo) {
  const existing = findPrecedingDoxygen(content, functionInfo.lineStart);
  const params = splitFunctionParameters(functionInfo.parameters)
    .map(parameterName)
    .filter(Boolean);
  const lines = [];
  const brief = existing && existing.text.match(/@brief\s+([^\n*]+)/);
  lines.push(` * @brief ${brief ? brief[1].trim() : functionBrief(functionInfo.name)}`);
  for (const parameter of params) {
    const original = splitFunctionParameters(functionInfo.parameters)
      .find((item) => parameterName(item) === parameter) || parameter;
    lines.push(` * @param ${parameterDirection(original, parameter)} ${parameter} ${parameterDescription(parameter)}。`);
  }
  if (!/\bvoid\b/.test(functionInfo.returnType) || /\*/.test(functionInfo.returnType)) {
    for (const value of returnValues(functionInfo)) {
      lines.push(` * @retval ${value} ${returnDescription(value)}`);
    }
  }
  const { notes, warnings } = requiredFunctionNotes(functionInfo);
  for (const note of notes) {
    lines.push(` * @note ${note}`);
  }
  for (const warning of warnings) {
    lines.push(` * @warning ${warning}`);
  }
  const block = `/**\n${lines.join('\n')}\n */`;
  if (existing) return `${content.slice(0, existing.start)}${block}${content.slice(existing.end)}`;
  return `${content.slice(0, functionInfo.lineStart)}${block}\n${content.slice(functionInfo.lineStart)}`;
}

function mergeExistingDoxygenTags(content, functionInfo) {
  const existing = findPrecedingDoxygen(content, functionInfo.lineStart);
  if (!existing) return addMissingDoxygenTags(content, functionInfo);

  const params = splitFunctionParameters(functionInfo.parameters)
    .map(parameterName)
    .filter(Boolean);
  const originalLines = existing.text.split('\n');
  const closingIndex = originalLines.length - 1;
  const additions = [];
  if (!originalLines.some((line) => /@brief\s+/.test(line))) {
    additions.push(` * @brief ${functionBrief(functionInfo.name)}`);
  }
  for (const parameter of params) {
    const parameterPattern = new RegExp(`@param(?:\\s*\\[[^\\]]+\\])?\\s+${escapeRegExp(parameter)}\\b`);
    if (originalLines.some((line) => parameterPattern.test(line))) continue;
    const original = splitFunctionParameters(functionInfo.parameters)
      .find((item) => parameterName(item) === parameter) || parameter;
    additions.push(` * @param ${parameterDirection(original, parameter)} ${parameter} ${parameterDescription(parameter)}。`);
  }
  if (!/\bvoid\b/.test(functionInfo.returnType) || /\*/.test(functionInfo.returnType)) {
    const hasReturnTag = originalLines.some((line) => /@(return|retval)\s+/.test(line));
    if (!hasReturnTag) {
      for (const value of returnValues(functionInfo)) {
        additions.push(` * @retval ${value} ${returnDescription(value)}`);
      }
    }
  }
  const { notes, warnings } = requiredFunctionNotes(functionInfo);
  for (const note of notes) {
    if (!originalLines.some((line) => line.includes(`@note ${note}`))) additions.push(` * @note ${note}`);
  }
  for (const warning of warnings) {
    if (!originalLines.some((line) => line.includes(`@warning ${warning}`))) additions.push(` * @warning ${warning}`);
  }
  if (!additions.length) return content;
  originalLines.splice(closingIndex, 0, ...additions);
  const block = originalLines.join('\n');
  return `${content.slice(0, existing.start)}${block}${content.slice(existing.end)}`;
}

function addTypeBriefs(content) {
  return content.replace(/(^|\n)([ \t]*)(typedef\s+(?:enum|struct)\s*\{)/g, (match, prefix, indent, declaration, offset) => {
    const before = content.slice(0, offset + prefix.length);
    const previous = before.match(/\/\*[\s\S]*?\*\/\s*$/);
    if (previous && /@brief\b/.test(previous[0])) return match;
    return `${prefix}${indent}/**\n${indent} * @brief 生成类型的状态、配置或操作成员定义。\n${indent} */\n${indent}${declaration}`;
  });
}

function commentLine(text, indent = '', marker = '/*', width = COMMENT_WIDTHS.primary) {
  const suffix = ' */';
  const prefix = `${marker} ${text} `;
  const padding = Math.max(1, width - prefix.length - suffix.length);
  return `${indent}${prefix}${'-'.repeat(padding)}${suffix}`;
}

function sectionComment(name, width = COMMENT_WIDTHS.primary) {
  return commentLine(name, '', '/*', width);
}

const SECTION_LABELS = {
  Includes: '包含文件',
  'Public Types': '公开类型',
  'Public Defines': '公开宏定义',
  'Public Functions': '公开函数',
  'Private Defines': '私有宏定义',
  'Private Types': '私有类型',
  'Private State': '私有状态',
  'Private Composition': '私有组合对象',
  'Private Functions': '私有函数'
};

function macroDescription(name) {
  if (/_TIMEOUT/.test(name)) return '同步操作超时参数';
  if (/_DMA/.test(name)) return 'DMA 功能开关';
  if (/_IRQ/.test(name)) return 'IRQ 功能开关或事件标识';
  if (/_EVENT/.test(name)) return '事件标识定义';
  if (/_ERROR|_ERR/.test(name)) return '错误结果定义';
  if (/_OK|_SUCCESS/.test(name)) return '成功结果定义';
  if (/_MODE|_PULL/.test(name)) return 'GPIO 模式或上下拉标志';
  return '宏定义用途';
}

function addSectionComments(content) {
  const sections = /^(\s*)\/\* (Includes|Public Types|Public Defines|Public Functions|Private Defines|Private Types|Private State|Private Composition|Private Functions) \*\/$/gm;
  return content.replace(sections, (match, indent, name) => `${indent}${sectionComment(SECTION_LABELS[name])}`);
}

function macroGroup(name) {
  if (/_ERROR|_ERR|_OK|_SUCCESS|_STATUS_/.test(name)) return '返回值';
  if (/_TIMEOUT/.test(name)) return '超时值';
  if (/_DMA|_IRQ|_EVENT/.test(name)) return '事件';
  if (/_MODE|_PULL/.test(name)) return '配置';
  return '默认值';
}

function functionGroup(name, isPrivate) {
  const lowerName = name.toLowerCase();
  if (/callback|irq|event/.test(lowerName)) return '回调';
  if (/init|deinit|inst|register/.test(lowerName)) return '初始化';
  if (/configure|bind|set_|get_/.test(lowerName)) return '配置';
  if (/read|write|transfer|clear|flush|cancel|start/.test(lowerName)) return '读写';
  return isPrivate ? '辅助' : '接口';
}

function primarySectionName(line) {
  const trimmed = line.trim();
  return Object.values(SECTION_LABELS)
    .find((label) => trimmed.startsWith(`/* ${label} `) && trimmed.endsWith('*/')) || '';
}

function precedingDoxygenStart(lines) {
  let index = lines.length - 1;
  if (index < 0 || lines[index].trim() !== '*/') return lines.length;
  while (index >= 0 && !lines[index].trim().startsWith('/**')) index -= 1;
  return index >= 0 ? index : lines.length;
}

function previousMeaningfulLine(lines) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].trim()) return lines[index];
  }
  return '';
}

function paddedSectionLabel(line) {
  const match = line.match(/^\s*\/\*\s+([^*]+?)-+\s+\*\/\s*$/);
  return match ? match[1].trim() : '';
}

function hasPaddedSubsectionComment(line) {
  const label = paddedSectionLabel(line);
  return Boolean(label) && !PRIMARY_SECTION_LABELS.has(label);
}

function addSubsectionComments(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  let currentSection = '';
  let currentGroup = '';
  for (const line of lines) {
    const section = primarySectionName(line);
    if (section) {
      currentSection = section;
      currentGroup = '';
      result.push(line);
      continue;
    }
    const macroMatch = line.match(/^\s*#define\s+([A-Z][A-Z0-9_]*)\b/);
    const isMacroSection = /宏定义$/.test(currentSection);
    if (macroMatch && !/_H$/.test(macroMatch[1]) && isMacroSection) {
      const group = macroGroup(macroMatch[1]);
      if (group !== currentGroup) {
        const previous = previousMeaningfulLine(result);
        if (!hasPaddedSubsectionComment(previous)) {
          const insertAt = result.length > 0 && /^\s*\/\*/.test(result[result.length - 1])
            ? result.length - 1
            : result.length;
          result.splice(insertAt, 0, sectionComment(group, COMMENT_WIDTHS.secondary));
        }
        currentGroup = group;
      }
    }
    const functionMatch = line.match(
      /^\s*(?:static\s+)?[A-Za-z_][\w\s*]*\s+([A-Za-z_]\w*)\s*\([^;{}]*\)(?:\s*;|\s*\{)/
    );
    const isFunctionSection = /函数$/.test(currentSection);
    if (functionMatch && isFunctionSection) {
      const isPrivate = currentSection === SECTION_LABELS['Private Functions'];
      const group = functionGroup(functionMatch[1], isPrivate);
      if (group !== currentGroup) {
        const insertAt = precedingDoxygenStart(result);
        const previous = previousMeaningfulLine(result.slice(0, insertAt));
        if (!hasPaddedSubsectionComment(previous)) {
          result.splice(insertAt, 0, sectionComment(group, COMMENT_WIDTHS.secondary));
        }
        currentGroup = group;
      }
    }
    result.push(line);
  }
  return addMultilineFunctionSubsections(result.join('\n'));
}

function addMultilineFunctionSubsections(content) {
  const declarationPattern = /^([ \t]*)(?:(?:static|extern)\s+)?[A-Za-z_][\w\s*]*\s+([A-Za-z_]\w*)\s*\(([\s\S]*?)\)\s*;/gm;
  const declarations = [...content.matchAll(declarationPattern)];
  for (const declaration of declarations.reverse()) {
    const start = declaration.index || 0;
    const preceding = content.slice(0, start);
    const sectionMatches = [...preceding.matchAll(/\/\* (公开函数|私有函数) -+ \*\//g)];
    const section = sectionMatches.at(-1)?.[1];
    if (!section) continue;

    const isPrivate = section === SECTION_LABELS['Private Functions'];
    const group = functionGroup(declaration[2], isPrivate);
    const functionComment = findPrecedingDoxygen(content, start);
    const insertAt = functionComment ? functionComment.start : start;
    const prefix = content.slice(0, insertAt);
    const sectionStart = prefix.lastIndexOf(`/* ${section} `);
    const sectionContent = prefix.slice(sectionStart >= 0 ? sectionStart : 0);
    const previousLines = prefix.split(/\r?\n/).slice(-4);
    if (new RegExp(`\\/\\* ${group} -+ \\*\\/`).test(sectionContent)
      || previousLines.some(hasPaddedSubsectionComment)) continue;
    content = `${content.slice(0, insertAt)}${sectionComment(group, 40)}\n${content.slice(insertAt)}`;
  }
  return content;
}

function addMacroComments(content) {
  const lines = content.split(/\r?\n/);
  const result = [];
  for (const line of lines) {
    const match = line.match(/^(\s*)#define\s+([A-Z][A-Z0-9_]*)\b/);
    const previous = result[result.length - 1] || '';
    if (match && !/_H$/.test(match[2]) && !/宏定义用途/.test(previous)
      && !/\/\*/.test(line) && !hasPaddedSubsectionComment(previous)) {
      result.push(`${match[1]}${commentLine(macroDescription(match[2]), '', '/*')}`);
    }
    result.push(line);
  }
  return result.join('\n');
}

const SECONDARY_SECTION_LABELS = new Set([
  '返回值', '超时值', '事件', '配置', '默认值', '初始化', '读写', '回调', '辅助', '接口'
]);

const PRIMARY_SECTION_LABELS = new Set(Object.values(SECTION_LABELS));

function addMemberComments(content) {
  const memberDescription = (name, kind) => {
    const descriptions = {
      backend_context: '底层实现上下文，由调用方拥有。',
      context: '操作表绑定的用户上下文。',
      event_id: '待处理的事件标识。',
      event_pending: '是否存在待处理事件。',
      event_context: '事件回调使用的用户上下文。',
      event_callback: '任务上下文中的事件回调。',
      is_inited: '模块是否已完成初始化。',
      pending_event_id: '延迟事件的标识。',
      pending_status: '延迟事件的状态码。',
      sequence: '事件序号。',
      status: '事件处理状态。',
      p_drivers: '同类 Driver 数组。',
      driver_count: '同类 Driver 数量。',
      p_os_context: 'OS 资源上下文。',
      active_driver: '当前 Driver 索引。',
      is_inited: '是否完成初始化。',
      last_device_id: '最近设备标识。',
      last_error: '最近错误码。',
      successful_reads: '成功读取次数。',
      cfg: '配置对象。',
      ctx: '上下文对象。',
      data: '数据对象。',
      ops: '操作表对象。'
    };
    if (descriptions[name]) return descriptions[name];
    if (/^pf_/.test(name)) return `注入的 ${name.slice(3)} 操作回调。`;
    if (/_ops$/.test(name)) return `${name.replace(/_ops$/, '')} 操作表。`;
    if (kind === 'enum') return '枚举值说明。';
    return '成员说明。';
  };
  return content.replace(/typedef\s+(enum|struct)\s*\{([\s\S]*?)\}\s*([A-Za-z_]\w*)\s*;/g, (match, kind, body, typeName) => {
    const lines = body.split(/\r?\n/);
    const decorated = lines.map((line) => {
      const trimmed = line.trim();
      const isMember = kind === 'struct'
        ? /;\s*$/.test(trimmed)
        : /^[A-Za-z_]\w*(?:\s*=\s*[^,]+)?\s*,?\s*$/.test(trimmed);
      const legacyComment = line.match(/\/\*\*<\s*([^]*?)\s*\*\/\s*$/);
      if (legacyComment) return line.replace(legacyComment[0], `/* ${legacyComment[1].trim()} */`);
      if (!isMember || /\/\*/.test(line)) return line;
      const nameMatch = kind === 'struct'
        ? trimmed.match(/(?:\(\s*\*\s*)?([A-Za-z_]\w*)\s*(?:\)|;)/)
        : trimmed.match(/^([A-Za-z_]\w*)/);
      if (!nameMatch) return line;
      const name = nameMatch[1];
      const suffix = kind === 'struct' ? '' : (trimmed.endsWith(',') ? '' : ',');
      const source = suffix ? line.replace(/\s*$/, suffix) : line;
      return `${source} /* ${memberDescription(name, kind)} */`;
    });
    return `typedef ${kind} {${decorated.join('\n')}} ${typeName};`;
  });
}

function normalizeDoxygenBlocks(content) {
  return content.replace(/^([ \t]*)\/\*\*(?![*/<])([\s\S]*?)\*\/(?=\s*(?:\r?\n|$))/gm,
    (match, indent, body) => {
      const lines = body.split(/\r?\n/).map((line) => line.trim().replace(/^\*\s?/, ''));
      while (lines.length && !lines[0]) lines.shift();
      while (lines.length && !lines.at(-1)) lines.pop();
      const normalized = lines.map((line) => line ? indent + ' * ' + line : indent + ' *');
      return indent + '/**\n' + normalized.join('\n') + '\n' + indent + ' */';
    });
}

function normalizePartitionComments(content) {
  let braceDepth = 0;
  return content.split(/\r?\n/).map((line) => {
    const match = line.match(/^(\s*)\/\*\s+([^*]+?)\s+-+\s+\*\/\s*$/);
    let normalized = line;
    if (match) {
      const indent = match[1];
      const label = match[2];
      let width = null;
      if (PRIMARY_SECTION_LABELS.has(label)) width = COMMENT_WIDTHS.primary;
      else if (SECONDARY_SECTION_LABELS.has(label)) width = COMMENT_WIDTHS.secondary;
      if (width) normalized = indent + commentLine(label, '', '/*', width);
    }

    const code = line.replace(/\/\*[^]*?\*\//g, '').replace(/\/\/.*$/, '');
    braceDepth += (code.match(/{/g) || []).length;
    braceDepth -= (code.match(/}/g) || []).length;
    braceDepth = Math.max(0, braceDepth);
    return normalized;
  }).join('\n');
}

function trailingComment(line) {
  const match = line.match(/^(\s*.*?\S)\s+(\/\*\*?<[^]*?\*\/|\/\*[^]*?\*\/|\/\/.*)\s*$/);
  if (!match || /^\s*\/\//.test(match[1]) || /^\s*\/\*/.test(match[1])) return null;
  const comment = match[2].trim();
  const legacyComment = comment.match(/^\/\*\*<\s*([^]*?)\s*\*\/$/);
  return {
    code: match[1],
    comment: legacyComment ? `/* ${legacyComment[1].trim()} */` : comment
  };
}

function normalizeTrailingCommentSpacing(content) {
  return content.split(/\r?\n/).map((line) => {
    const match = line.match(/^(.*?)(\s+)(\/\*\*?<[^]*?\*\/|\/\*[^]*?\*\/)(\s*)$/);
    if (!match) return line;
    const rawComment = match[3];
    const legacyComment = rawComment.match(/^\/\*\*<\s*([^]*?)\s*\*\/$/);
    const body = legacyComment
      ? legacyComment[1].trim()
      : rawComment.slice(2, -2).trim();
    return `${match[1]} /* ${body} */`;
  }).join('\n');
}

function expandTabsInContent(content, tabWidth = 4) {
  return content.split(/\r?\n/).map((line) => {
    let column = 0;
    let expanded = '';
    for (const character of line) {
      if (character === '\t') {
        const spaces = tabWidth - (column % tabWidth);
        expanded += ' '.repeat(spaces);
        column += spaces;
      } else {
        expanded += character;
        column += 1;
      }
    }
    return expanded;
  }).join('\n');
}

function compressLeadingIndent(content, tabWidth = 4) {
  return content.split(/\r?\n/).map((line) => {
    const match = line.match(/^( +)(.*)$/);
    if (!match) return line;
    const tabCount = Math.floor(match[1].length / tabWidth);
    return `${'\t'.repeat(tabCount)}${' '.repeat(match[1].length % tabWidth)}${match[2]}`;
  }).join('\n');
}

function alignTrailingComments(content) {
  const lines = content.split(/\r?\n/);
  let group = [];
  const flush = () => {
    if (group.length < 2) {
      group = [];
      return;
    }
    const target = Math.max(...group.map((item) => item.code.length + 1));
    const commentsAreBlocks = group.every((item) => /^\/\*/.test(item.comment));
    const longestComment = Math.max(...group.map((item) => item.comment.length));
    if (commentsAreBlocks && target + longestComment > 80) {
      group = [];
      return;
    }
    for (const item of group) {
      const comment = commentsAreBlocks
        ? (() => {
          const body = item.comment.slice(2, -2).trim();
          const padding = Math.max(1, 80 - target - 6 - body.length);
          return `/* ${body}${' '.repeat(padding)} */`;
        })()
        : item.comment;
      lines[item.index] = item.code + ' '.repeat(target - item.code.length) + comment;
    }
    group = [];
  };

  lines.forEach((line, index) => {
    const parsed = trailingComment(line);
    if (!parsed) {
      flush();
      return;
    }
    group.push({ ...parsed, index });
  });
  flush();
  return lines.join('\n');
}

function alignFunctionCommentGroups(content) {
  const lines = content.split(/\r?\n/);
  const codeLines = content.split(/\r?\n/).map((line) => (
    line.replace(/\/\*[^]*?\*\//g, '').replace(/\/\/.*$/, '')
  ));
  let braceDepth = 0;
  let group = [];

  const flush = () => {
    if (group.length > 1) {
      const targetEnd = Math.max(...group.map((item) => item.endColumn));
      if (targetEnd <= 80) {
        for (const item of group) {
          const body = item.comment.slice(2, -2).trim();
          const padding = Math.max(1, targetEnd - item.startColumn - 4 - body.length);
          lines[item.index] = `${item.indent}/* ${body}${' '.repeat(padding)} */`;
        }
      }
    }
    group = [];
  };

  lines.forEach((line, index) => {
    if (braceDepth === 0) {
      flush();
    } else {
      const match = line.match(/^(\s*)\/(\*(?!\*)[^]*?\*\/\s*)$/);
      if (match) {
        const startColumn = match[1].length;
        if (group.length > 0 && group.at(-1).startColumn !== startColumn) flush();
        group.push({
          index,
          indent: match[1],
          comment: match[2].trim(),
          startColumn,
          endColumn: line.lastIndexOf('*/') + 2
        });
      } else {
        flush();
      }
    }

    const code = codeLines[index] || '';
    braceDepth += (code.match(/{/g) || []).length;
    braceDepth -= (code.match(/}/g) || []).length;
    braceDepth = Math.max(0, braceDepth);
  });
  flush();
  return lines.join('\n');
}

const ALIGNMENT_KEYWORDS = new Set([
  'case', 'do', 'else', 'for', 'goto', 'if', 'return', 'switch', 'while'
]);

function parseSimpleDeclaration(line) {
  const code = line.replace(/\s*\/\*.*\*\/\s*$/, '');
  const trimmed = code.trim();
  if (!trimmed.endsWith(';') || /[(),{}]/.test(trimmed)) return null;
  const firstToken = trimmed.match(/^([A-Za-z_]\w*)/)?.[1];
  if (!firstToken || ALIGNMENT_KEYWORDS.has(firstToken)) return null;
  const match = code.match(/([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*(=|);\s*$/);
  if (!match || !/\s|\*/.test(code.slice(0, match.index))
    || /->|\./.test(code.slice(0, match.index))) return null;
  return {
    nameColumn: match.index,
    operatorColumn: match[2] === '=' ? code.indexOf('=', match.index) : null
  };
}

function parseSimpleAssignment(line) {
  if (/^\s*(?:#|(?:if|for|while|switch)\s*\()/.test(line)) return null;
  const match = line.match(
    /^(\s*)([^;{}()]+?)(\+=|-=|\*=|\/=|%=|<<=|>>=|&=|\^=|\|=|=(?!=))\s*[^;]*;\s*(?:\/\*.*\*\/)?$/
  );
  return match ? { operatorColumn: line.indexOf(match[3]) } : null;
}

function parseEnumValue(line) {
  const match = line.match(
    /^\s*[A-Z][A-Z0-9_]*\s*=\s*[^,]+,?\s*(?:\/\*.*\*\/)?\s*$/
  );
  return match ? { operatorColumn: line.indexOf('=') } : null;
}

function alignCodeGroups(content, parser, field) {
  const lines = content.split(/\r?\n/);
  let group = [];

  const flush = () => {
    if (group.length < 2) {
      group = [];
      return;
    }
    const target = Math.max(...group.map((item) => item[field]));
    for (const item of group) {
      const current = lines[item.index];
      const prefix = current.slice(0, item[field]).replace(/\s*$/, '');
      lines[item.index] = `${prefix}${' '.repeat(target - prefix.length)}${current.slice(item[field])}`;
    }
    group = [];
  };

  lines.forEach((line, index) => {
    const parsed = parser(line);
    if (!parsed || parsed[field] === null) {
      flush();
      return;
    }
    group.push({ ...parsed, index });
  });
  flush();
  return lines.join('\n');
}

function alignGeneratedCode(content) {
  let aligned = alignCodeGroups(content, parseSimpleDeclaration, 'nameColumn');
  aligned = alignCodeGroups(aligned, parseSimpleDeclaration, 'operatorColumn');
  aligned = alignCodeGroups(aligned, parseSimpleAssignment, 'operatorColumn');
  aligned = alignCodeGroups(aligned, parseEnumValue, 'operatorColumn');
  return aligned;
}

function applyGeneratedCommentContract(content, options = {}) {
  const { preserveExisting = false } = options;
  let documented = normalizeDoxygenBlocks(content);
  documented = addSectionComments(documented);
  documented = addSubsectionComments(addMemberComments(addTypeBriefs(addMacroComments(documented))));
  for (const functionInfo of [...findGeneratedFunctions(documented)].reverse()) {
    if (!shouldDocumentFunction(functionInfo, options)) continue;
    documented = preserveExisting
      ? mergeExistingDoxygenTags(documented, functionInfo)
      : addMissingDoxygenTags(documented, functionInfo);
  }
  documented = normalizePartitionComments(documented);
  return documented;
}

function formatGeneratedCode(content, fileName, options = {}) {
  const formatOptions = {
    ...options,
    isHeader: options.isHeader ?? isHeaderFile(fileName),
    isPrivateHeader: options.isPrivateHeader ?? isPrivateHeaderFile(fileName)
  };
  let documented = applyGeneratedCommentContract(content, formatOptions);
  documented = normalizeTrailingCommentSpacing(documented);
  documented = alignGeneratedCode(documented);
  const guardMatch = documented.match(/#define\s+([A-Z0-9_]+_H)\b/);
  if (guardMatch) documented = documented.replace(/#endif\s*$/, `#endif /* ${guardMatch[1]} */`);
  const candidates = process.env.MCUWB_CLANG_FORMAT
    ? [process.env.MCUWB_CLANG_FORMAT]
    : process.platform === 'win32'
      ? ['C:\\Program Files\\LLVM\\bin\\clang-format.exe', 'clang-format']
      : ['clang-format'];
  const failures = [];
  for (const executable of candidates) {
    const result = spawnSync(executable, [
      `-style=file:${FORMAT_CONFIG}`,
      `-assume-filename=${fileName}`
    ], { input: documented, encoding: 'utf8' });
    if (result.status === 0) {
      const normalized = expandTabsInContent(result.stdout.trimEnd());
      const formatted = alignFunctionCommentGroups(
        alignTrailingComments(alignGeneratedCode(normalized))
      );
      return `${compressLeadingIndent(formatted)}\n`;
    }
    failures.push({
      executable,
      status: result.status,
      signal: result.signal,
      error: result.error?.message || '',
      stderr: String(result.stderr || '').trim()
    });
  }
  const failureText = failures
    .map((failure) => `${failure.executable}: status=${failure.status ?? 'null'}${failure.signal ? ` signal=${failure.signal}` : ''}${failure.error ? ` error=${failure.error}` : ''}${failure.stderr ? ` stderr=${failure.stderr}` : ''}`)
    .join('; ');
  throw formatterError(`Failed to format generated file ${fileName} with ${FORMAT_CONFIG}. ${failureText}`, 'FORMAT');
}

function formatExistingCode(content, fileName) {
  const baseName = path.basename(fileName || 'source.c');
  const withFileContract = /@file\s+/i.test(String(content).slice(0, 1600))
    ? content
    : `${fileHeader(baseName, `${baseName} module interface and implementation.`)}${content}`;
  return formatGeneratedCode(withFileContract, fileName, { preserveExisting: true });
}

function formatGeneratedFiles(files) {
  const formatted = files.map((file) => ({
    ...file,
    content: formatGeneratedCode(file.content, file.path, {
      isHeader: isHeaderFile(file.path),
      isPrivateHeader: isPrivateHeaderFile(file.path)
    })
  }));
  if (files.manifest) {
    Object.defineProperty(formatted, 'manifest', {
      enumerable: false,
      value: files.manifest
    });
  }
  return formatted;
}



module.exports = { formatGeneratedCode, formatExistingCode, formatGeneratedFiles };
