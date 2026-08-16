const fs = require('fs').promises;
const path = require('path');
const { spawnSync } = require('child_process');
const { getPlatformConfig } = require('./platform');

const CORE_PERIPHERALS = ['gpio', 'i2c', 'spi', 'adc', 'tim', 'uart', 'wdg', 'rtc'];
const FORMAT_CONFIG = path.join(
  __dirname,
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
const DEVICE_PROFILES = {
  aht21: { deviceType: 'sensor', cores: ['i2c'] },
  mpu6050: { deviceType: 'sensor', cores: ['i2c'] },
  w25q64: { deviceType: 'externflash', cores: ['spi'] },
  ssd1306: {
    deviceType: 'display',
    cores: ['i2c'],
    template: 'ssd1306-display',
    manifest: {
      handleKind: 'display',
      osalResources: ['mutex'],
      styleProfile: 'style-profile',
      blocking: ['init', 'flush'],
      isrSafe: []
    }
  }
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createError(message, code = 'USAGE') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeCorePeripheral(peripheral) {
  const normalized = String(peripheral || '').trim().toLowerCase();
  const canonical = normalized;
  if (!CORE_PERIPHERALS.includes(canonical)) {
    throw createError(`Unsupported Core peripheral: ${peripheral}. Supported values: ${CORE_PERIPHERALS.join(', ')}.`);
  }
  return canonical;
}

function normalizeDeviceType(deviceType) {
  const normalized = String(deviceType || '').trim().toLowerCase().replace(/-/g, '_');
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw createError('--device-type must use lower snake_case, for example externflash.');
  }
  return normalized;
}

function normalizeDevice(device) {
  const value = String(device || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
    throw createError('--device must start with a letter and contain only letters, numbers, or underscores.');
  }
  return { directory: value.toUpperCase(), stem: value.toLowerCase() };
}

function normalizeCoreList(cores) {
  const values = Array.isArray(cores) ? cores : [cores];
  const normalized = [];
  for (const value of values) {
    const core = normalizeCorePeripheral(value);
    if (!normalized.includes(core)) normalized.push(core);
  }
  if (!normalized.length) throw createError('At least one --core option is required.');
  return normalized;
}

function validateDeviceProfile({ deviceType, device, cores, allowCustomDevice = false }) {
  const profile = DEVICE_PROFILES[device.stem];
  if (!profile) {
    if (!allowCustomDevice) {
      throw createError(`Unknown device ${device.directory}. Add --allow-custom-device after reviewing its bus contract.`);
    }
    return;
  }
  if (profile.deviceType !== deviceType || profile.cores.some((core) => !cores.includes(core))) {
    throw createError(`${device.directory} requires --device-type ${profile.deviceType} and --core ${profile.cores.join(' --core ')}.`);
  }
}

function guard(prefix) {
  return `${prefix.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_H`;
}

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function fileHeader(fileName, summary, flow = '生成的切片参与已声明的分层契约。', dependencies = []) {
  const dependencyLines = dependencies.length
    ? dependencies.map((item) => ` * - ${item}`).join('\n')
    : ' * - 生成的 Platform、Impl 或公共接口';
  return `/******************************************************************************\n * Copyright (C) 2024 ProjectName, Inc.(Gmbh) or its affiliates.\n *\n * All Rights Reserved.\n *\n * @file ${fileName}\n *\n * @par 依赖关系\n${dependencyLines}\n *\n * @author MCU Workbench | 研发部门 | 项目名称\n *\n * @brief ${summary}\n *\n * 处理流程：\n *\n * - ${flow}\n *\n * @version V1.0 ${currentDate()}\n *\n * @note 缩进使用 4 个空格，禁止使用 TAB。\n *\n ******************************************************************************/\n`;
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

function hasRecentStepComment(lines, step) {
  let inspected = 0;
  for (let index = lines.length - 1; index >= 0 && inspected < 3; index -= 1) {
    if (!lines[index].trim()) continue;
    inspected += 1;
    if (hasStepComment(lines[index], step)) return true;
  }
  return false;
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

const FUNCTION_STEP_LABELS = ['清理', '事件', '回调', '转发', '校验', '状态', '结果', '处理'];

const SECONDARY_SECTION_LABELS = new Set([
  '返回值', '超时值', '事件', '配置', '默认值', '初始化', '读写', '回调', '辅助', '接口'
]);

const PRIMARY_SECTION_LABELS = new Set(Object.values(SECTION_LABELS));

function stripInlineComments(line) {
  return line
    .replace(/\/\*[^]*?\*\//g, '')
    .replace(/\/\/.*$/, '')
    .trim();
}

function classifyFunctionSteps(line) {
  const code = stripInlineComments(line);
  if (!code || /^(?:[{}]|case\b|default\s*:)/.test(code)) return [];
  const steps = [];
  const add = (step) => {
    if (!steps.includes(step)) steps.push(step);
  };

  if (/cleanup_|goto\s+cleanup_/.test(code)) add('清理');
  if (/callback\s*\(|event_callback/.test(code)) add('回调');
  if (/^(?:if|switch|for|while)\b/.test(code)
    || /(?:==|!=|<=|>=)\s*(?:NULL|0|false|true)/.test(code)
    || /!\s*[A-Za-z_][\w.\->]*/.test(code)) add('校验');
  if (/(?:pf_[A-Za-z_]\w*|[A-Za-z_]\w*_ops\.[A-Za-z_]\w*|[A-Za-z_]\w*->pf_[A-Za-z_]\w*)\s*\(/.test(code)) {
    add('转发');
  }
  if (/(?:event_pending|pending_event_id|pending_status|event_id)\s*(?:\+?=|-=)/.test(code)) {
    add('事件');
  }
  if (/(?:is_inited|is_ready|s_[A-Za-z_]\w*|status)\s*(?:\+?=|-=)/.test(code)) {
    add('状态');
  }
  if (/^return\b/.test(code) && !steps.includes('转发')) add('结果');
  if (steps.length === 0 && (/\b(?:memset|memcpy|crc|convert)\b/.test(code)
    || /^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*|->\s*[A-Za-z_]\w*)?\s*=/.test(code))) add('处理');
  return steps;
}

function hasStepComment(line, step) {
  return new RegExp(`\\/\\*\\s*${step}\\s*-+\\s*\\*\\/`).test(line);
}

const FUNCTION_STEP_DESCRIPTIONS = {
  清理: '释放已创建资源并恢复可重试状态。',
  事件: '记录待处理事件及其关联状态。',
  回调: '在约定执行上下文中触发回调。',
  转发: '调用注入的底层操作并传播结果。',
  校验: '检查输入参数、依赖和前置状态。',
  状态: '更新模块状态并保持生命周期一致。',
  结果: '整理并返回当前阶段的处理结果。',
  处理: '执行当前阶段的数据或状态处理。'
};

function stepCommentLines(step, indent) {
  return [
    commentLine(step, indent, '/*', COMMENT_WIDTHS.tertiary),
    `${indent}/* ${FUNCTION_STEP_DESCRIPTIONS[step]} */`
  ];
}

function splitCompactFunctionBody(body) {
  if (/\r?\n/.test(body)) return body.split('\n');
  const lines = [];
  let current = '';
  let parenthesisDepth = 0;
  let stringQuote = '';
  let escaped = false;

  for (const character of body) {
    current += character;
    if (stringQuote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === stringQuote) stringQuote = '';
      continue;
    }
    if (character === '"' || character === "'") stringQuote = character;
    else if (character === '(') parenthesisDepth += 1;
    else if (character === ')') parenthesisDepth -= 1;
    else if (character === ';' && parenthesisDepth === 0) {
      lines.push(current.trim());
      current = '';
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function addStepComments(content) {
  content = content.replace(/\*\/(?=(?:static|extern|const|[A-Za-z_]))/g, '*/\n');
  const functionInfos = [...findGeneratedFunctions(content)];
  for (const functionInfo of functionInfos.reverse()) {
    if (functionInfo.openBrace < 0) continue;
    const bodyStart = functionInfo.openBrace + 1;
    const bodyEnd = bodyStart + functionInfo.body.length;
    const lines = splitCompactFunctionBody(functionInfo.body);
    const output = [];
    let currentStep = '';
    let inserted = false;

    for (const line of lines) {
      const steps = classifyFunctionSteps(line);
      if (steps.length > 0) {
        const indent = line.match(/^\s*/)?.[0] || '    ';
        for (const step of steps) {
          if (step === currentStep) continue;
          const isGuardFailureReturn = step === '结果'
            && currentStep === '校验'
            && indent.length > 4;
          if (!isGuardFailureReturn && !hasRecentStepComment(output, step)) {
            output.push(...stepCommentLines(step, indent));
            inserted = true;
          }
          currentStep = step;
        }
      }
      output.push(line);
    }

    if (!inserted && !FUNCTION_STEP_LABELS.some((step) => hasStepComment(functionInfo.body, step))) {
      output.splice(1, 0, ...stepCommentLines('处理', '    '));
    }
    content = `${content.slice(0, bodyStart)}${output.join('\n')}${content.slice(bodyEnd)}`;
  }
  return content;
}

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
      status: '事件处理状态。'
    };
    if (descriptions[name]) return descriptions[name];
    if (/^pf_/.test(name)) return `注入的 ${name.slice(3)} 操作回调。`;
    if (/_ops$/.test(name)) return `${name.replace(/_ops$/, '')} 操作表。`;
    if (kind === 'enum') return `${name} 枚举值。`;
    return `${name} 成员。`;
  };
  return content.replace(/typedef\s+(enum|struct)\s*\{([\s\S]*?)\}\s*([A-Za-z_]\w*)\s*;/g, (match, kind, body, typeName) => {
    const lines = body.split(/\r?\n/);
    const decorated = lines.map((line) => {
      const trimmed = line.trim();
      const isMember = kind === 'struct'
        ? /;\s*$/.test(trimmed)
        : /^[A-Za-z_]\w*(?:\s*=\s*[^,]+)?\s*,?\s*$/.test(trimmed);
      if (!isMember || /\/\*<|\/\*/.test(line)) return line;
      const nameMatch = kind === 'struct'
        ? trimmed.match(/(?:\(\s*\*\s*)?([A-Za-z_]\w*)\s*(?:\)|;)/)
        : trimmed.match(/^([A-Za-z_]\w*)/);
      if (!nameMatch) return line;
      const name = nameMatch[1];
      const suffix = kind === 'struct' ? '' : (trimmed.endsWith(',') ? '' : ',');
      const source = suffix ? line.replace(/\s*$/, suffix) : line;
      return `${source} /**< ${memberDescription(name, kind)} */`;
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
      const inCodeBlock = braceDepth > 0;
      let width = null;
      if (PRIMARY_SECTION_LABELS.has(label)) width = COMMENT_WIDTHS.primary;
      else if (FUNCTION_STEP_LABELS.includes(label)
        && (!SECONDARY_SECTION_LABELS.has(label) || inCodeBlock)) width = COMMENT_WIDTHS.tertiary;
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
  return { code: match[1], comment: match[2].trim() };
}

function alignTrailingComments(content) {
  const lines = content.split(/\r?\n/);
  let group = [];
  const flush = () => {
    if (group.length < 2) {
      group = [];
      return;
    }
    const target = Math.max(...group.map((item) => item.code.length + 2));
    const available = Math.min(...group.map((item) => 80 - item.comment.length));
    if (target > available) {
      group = [];
      return;
    }
    for (const item of group) {
      lines[item.index] = item.code + ' '.repeat(target - item.code.length) + item.comment;
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
    /^\s*[A-Z][A-Z0-9_]*\s*=\s*[^,]+,?\s*(?:\/\*\*<.*\*\/)?\s*$/
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
    if (group.some((item) => target + lines[item.index].length - item[field] > 80)) {
      group = [];
      return;
    }
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
  aligned = alignTrailingComments(aligned);
  return aligned;
}

function applyGeneratedCommentContract(content, { preserveExisting = false } = {}) {
  let documented = normalizeDoxygenBlocks(content);
  documented = addSectionComments(documented);
  documented = addSubsectionComments(addMemberComments(addTypeBriefs(addMacroComments(documented))));
  for (const functionInfo of [...findGeneratedFunctions(documented)].reverse()) {
    documented = preserveExisting
      ? mergeExistingDoxygenTags(documented, functionInfo)
      : addMissingDoxygenTags(documented, functionInfo);
  }
  documented = addStepComments(documented);
  documented = normalizePartitionComments(documented);
  return documented;
}

function formatGeneratedCode(content, fileName, options = {}) {
  let documented = applyGeneratedCommentContract(content, options);
  documented = alignGeneratedCode(documented);
  documented = alignTrailingComments(documented);
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
      return `${alignGeneratedCode(result.stdout.trimEnd())}\n`;
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
  throw createError(`Failed to format generated file ${fileName} with ${FORMAT_CONFIG}. ${failureText}`, 'FORMAT');
}

function formatExistingCode(content, fileName) {
  const baseName = path.basename(fileName || 'source.c');
  const withFileContract = /@file\s+/i.test(String(content).slice(0, 1600))
    ? content
    : `/**\n * @file ${baseName}\n * @brief ${baseName} 的模块接口和实现。\n * @note 质量管线仅统一格式并补齐必要注释，不改变既有行为。\n */\n${content}`;
  return formatGeneratedCode(withFileContract, fileName, { preserveExisting: true });
}

function formatGeneratedFiles(files) {
  const formatted = files.map((file) => ({
    ...file,
    content: formatGeneratedCode(file.content, file.path)
  }));
  if (files.manifest) {
    Object.defineProperty(formatted, 'manifest', {
      enumerable: false,
      value: files.manifest
    });
  }
  return formatted;
}

function coreHeader(core) {
  const prefix = `platform_${core}`;
  return `${fileHeader(`${prefix}.h`, `${core.toUpperCase()} MCU 通信抽象接口。`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Public Types */
typedef enum {
    PLATFORM_ERR_OK            = 0,
    PLATFORM_ERR_PARAM         = 3,
    PLATFORM_ERR_NOT_SUPPORTED = 6,
    PLATFORM_ERR_BUSY          = 9
} platform_err_t;

typedef struct {
    uint32_t event_id;
    platform_err_t status;
    uint32_t sequence;
} ${prefix}_event_t;

typedef struct {
    void *backend_context;
    platform_err_t (*pf_init)(void *backend_context);
    platform_err_t (*pf_transfer)(void *backend_context, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms);
    platform_err_t (*pf_start_async)(void *backend_context, const void *tx_data, void *rx_data, size_t length);
    platform_err_t (*pf_cancel)(void *backend_context);
} ${prefix}_t;

/* Public Functions */
/** @brief 初始化注入的 MCU ${core.toUpperCase()} 后端。 */
platform_err_t ${prefix}_init(${prefix}_t *instance);
/** @brief 以毫秒超时执行同步事务。 */
platform_err_t ${prefix}_transfer(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms);
/** @brief 启动可选的异步事务。 */
platform_err_t ${prefix}_start_async(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length);
/** @brief 取消可选的异步事务。 */
platform_err_t ${prefix}_cancel(${prefix}_t *instance);
/** @brief 将 IRQ 完成转换为上层可消费的值事件。 */
platform_err_t ${prefix}_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event);
/** @brief 将 DMA IRQ 完成转换为上层可消费的值事件。 */
platform_err_t ${prefix}_dma_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event);

#endif
`;
}

function coreSource(core) {
  const prefix = `platform_${core}`;
  return `${fileHeader(`${prefix}.c`, `${core.toUpperCase()} MCU 通信抽象接口实现。`)}
/* Includes */
#include "${prefix}.h"

/* Private Defines */
#define ${prefix.toUpperCase()}_EVENT_IRQ 1U
#define ${prefix.toUpperCase()}_EVENT_DMA_IRQ 2U

/* Public Functions */
platform_err_t ${prefix}_init(${prefix}_t *instance) {
    if (instance == NULL || instance->pf_init == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_init(instance->backend_context);
}

platform_err_t ${prefix}_transfer(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length, uint32_t timeout_ms) {
    if (instance == NULL || instance->pf_transfer == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_transfer(instance->backend_context, tx_data, rx_data, length, timeout_ms);
}

platform_err_t ${prefix}_start_async(${prefix}_t *instance, const void *tx_data, void *rx_data, size_t length) {
    if (instance == NULL || instance->pf_start_async == NULL) {
        return PLATFORM_ERR_NOT_SUPPORTED;
    }
    return instance->pf_start_async(instance->backend_context, tx_data, rx_data, length);
}

platform_err_t ${prefix}_cancel(${prefix}_t *instance) {
    if (instance == NULL || instance->pf_cancel == NULL) {
        return PLATFORM_ERR_NOT_SUPPORTED;
    }
    return instance->pf_cancel(instance->backend_context);
}

platform_err_t ${prefix}_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event) {
    if (instance == NULL || event == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    event->event_id = ${prefix.toUpperCase()}_EVENT_IRQ;
    event->status = PLATFORM_ERR_OK;
    event->sequence += 1U;
    return PLATFORM_ERR_OK;
}

platform_err_t ${prefix}_dma_irq_dispatch(${prefix}_t *instance, ${prefix}_event_t *event) {
    if (instance == NULL || event == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    event->event_id = ${prefix.toUpperCase()}_EVENT_DMA_IRQ;
    event->status = PLATFORM_ERR_OK;
    event->sequence += 1U;
    return PLATFORM_ERR_OK;
}
`;
}

function gpioHeader() {
  const prefix = 'platform_gpio';
  return `${fileHeader(`${prefix}.h`, 'GPIO MCU 引脚级抽象接口。')}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stdint.h>

/* Public Types */
typedef enum {
    PLATFORM_ERR_OK            = 0,
    PLATFORM_ERR_PARAM         = 3,
    PLATFORM_ERR_NOT_SUPPORTED = 6,
    PLATFORM_ERR_BUSY          = 9
} platform_err_t;

typedef struct {
    void *backend_context;
    platform_err_t (*pf_init)(void *backend_context);
    platform_err_t (*pf_configure)(void *backend_context, uint32_t pin, uint32_t mode_flags);
    platform_err_t (*pf_set)(void *backend_context, uint32_t pin, bool level);
    platform_err_t (*pf_get)(void *backend_context, uint32_t pin, bool *level);
    platform_err_t (*pf_toggle)(void *backend_context, uint32_t pin);
} ${prefix}_t;

/* Public Defines */
#define PLATFORM_GPIO_MODE_OUTPUT     (1UL << 0)
#define PLATFORM_GPIO_MODE_INPUT      (1UL << 1)
#define PLATFORM_GPIO_MODE_OPEN_DRAIN (1UL << 2)
#define PLATFORM_GPIO_PULL_UP         (1UL << 3)
#define PLATFORM_GPIO_PULL_DOWN       (1UL << 4)

/* Public Functions */
/** @brief 初始化注入的 MCU GPIO 后端。 */
platform_err_t ${prefix}_init(${prefix}_t *instance);
/** @brief 以平台无关的模式标志配置单个引脚。 */
platform_err_t ${prefix}_configure(${prefix}_t *instance, uint32_t pin, uint32_t mode_flags);
/** @brief 设置单个引脚输出电平。 */
platform_err_t ${prefix}_set_pin(${prefix}_t *instance, uint32_t pin, bool level);
/** @brief 读取单个引脚电平。 */
platform_err_t ${prefix}_get_pin(${prefix}_t *instance, uint32_t pin, bool *level);
/** @brief 翻转单个引脚输出电平。 */
platform_err_t ${prefix}_toggle_pin(${prefix}_t *instance, uint32_t pin);

#endif
`;
}

function gpioSource() {
  const prefix = 'platform_gpio';
  return `${fileHeader(`${prefix}.c`, 'GPIO MCU 引脚级抽象接口实现。')}
/* Includes */
#include "${prefix}.h"

/* Public Functions */
platform_err_t ${prefix}_init(${prefix}_t *instance) {
    if (instance == NULL || instance->pf_init == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_init(instance->backend_context);
}

platform_err_t ${prefix}_configure(${prefix}_t *instance, uint32_t pin, uint32_t mode_flags) {
    if (instance == NULL || instance->pf_configure == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_configure(instance->backend_context, pin, mode_flags);
}

platform_err_t ${prefix}_set_pin(${prefix}_t *instance, uint32_t pin, bool level) {
    if (instance == NULL || instance->pf_set == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_set(instance->backend_context, pin, level);
}

platform_err_t ${prefix}_get_pin(${prefix}_t *instance, uint32_t pin, bool *level) {
    if (instance == NULL || instance->pf_get == NULL || level == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_get(instance->backend_context, pin, level);
}

platform_err_t ${prefix}_toggle_pin(${prefix}_t *instance, uint32_t pin) {
    if (instance == NULL || instance->pf_toggle == NULL) {
        return PLATFORM_ERR_PARAM;
    }
    return instance->pf_toggle(instance->backend_context, pin);
}
`;
}

async function generateCorePeripheral(peripheral, platform) {
  const core = normalizeCorePeripheral(peripheral);
  getPlatformConfig(platform);
  const usePinTemplate = core === 'gpio';
  return formatGeneratedFiles([
    { path: `03_Platform/platform_mcu/Inc/platform_${core}.h`, content: usePinTemplate ? gpioHeader() : coreHeader(core) },
    { path: `03_Platform/platform_mcu/Src/platform_${core}.c`, content: usePinTemplate ? gpioSource() : coreSource(core) }
  ]);
}

function driverConfig(device) {
  const prefix = `IMPL_${device.stem.toUpperCase()}`;
  return `${fileHeader(`impl_${device.stem}_config.h`, `${device.directory} 器件配置。`)}
#ifndef ${guard(`impl_${device.stem}_config`)}
#define ${guard(`impl_${device.stem}_config`)}

/* Public Defines */
#define ${prefix}_DEFAULT_TIMEOUT_MS 100U
#define ${prefix}_DMA_ENABLED 1U
#define ${prefix}_IRQ_ENABLED 1U

#endif
`;
}

function driverHeader(device, primaryCore) {
  const prefix = `impl_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.h`, `${device.directory} 协议驱动接口。`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stdint.h>

/* Public Types */
typedef struct {
    int32_t (*pf_transaction)(void *context);
    void *context;
} ${prefix}_core_ops_t;
typedef struct {
    int32_t (*pf_chip_feature)(void *context);
    void *context;
} ${prefix}_mcu_ops_t;
typedef struct {
    bool is_inited;
    ${prefix}_core_ops_t core_ops;
    ${prefix}_mcu_ops_t mcu_ops;
    int32_t (*pf_read_id)(void *context, uint32_t *device_id);
    void *context;
} ${prefix}_t;

/* Public Functions */
/** @brief 返回按实例化的 ${device.directory} 驱动函数表。 */
${prefix}_t *${prefix}_inst(void);
/** @brief 将事务级 Core 操作绑定到驱动实例。 */
int32_t ${prefix}_register_core_ops(${prefix}_t *driver, const ${prefix}_core_ops_t *ops);
/** @brief 将 Core 无法表达的仅 MCU 操作绑定到驱动实例。 */
int32_t ${prefix}_register_mcu_ops(${prefix}_t *driver, const ${prefix}_mcu_ops_t *ops);

#endif
`;
}

function driverSource(device) {
  const prefix = `impl_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.c`, `${device.directory} 协议驱动实现。`)}
/* Includes */
#include "${prefix}.h"
#include "impl_${device.stem}_config.h"

/* Private State */
static ${prefix}_t s_${device.stem}_driver;

/* Private Functions */
static int32_t ${device.stem}_driver_read_id(void *context, uint32_t *device_id) {
    ${prefix}_t *driver = context;
    if (driver == NULL || device_id == NULL || !driver->is_inited
        || driver->core_ops.pf_transaction == NULL || driver->mcu_ops.pf_chip_feature == NULL) {
        return -1;
    }
    if (driver->core_ops.pf_transaction(driver->core_ops.context) != 0
        || driver->mcu_ops.pf_chip_feature(driver->mcu_ops.context) != 0) {
        return -1;
    }
    *device_id = 0U;
    return 0;
}

/* Public Functions */
${prefix}_t *${prefix}_inst(void) {
    s_${device.stem}_driver.is_inited = true;
    s_${device.stem}_driver.pf_read_id = ${device.stem}_driver_read_id;
    s_${device.stem}_driver.context = &s_${device.stem}_driver;
    return &s_${device.stem}_driver;
}

int32_t ${prefix}_register_core_ops(${prefix}_t *driver, const ${prefix}_core_ops_t *ops) {
    if (driver == NULL || ops == NULL || ops->pf_transaction == NULL) {
        return -1;
    }
    driver->core_ops = *ops;
    return 0;
}

int32_t ${prefix}_register_mcu_ops(${prefix}_t *driver, const ${prefix}_mcu_ops_t *ops) {
    if (driver == NULL || ops == NULL || ops->pf_chip_feature == NULL) {
        return -1;
    }
    driver->mcu_ops = *ops;
    return 0;
}
`;
}

function handleHeader(type) {
  const prefix = `impl_${type}_handle`;
  return `${fileHeader(`${prefix}.h`, `${type} 生命周期与事件句柄接口。`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdbool.h>
#include <stdint.h>

/* Public Types */
typedef void (*${prefix}_event_callback_t)(void *context, uint32_t event_id, int32_t status);
typedef struct {
    int32_t (*pf_read_id)(void *context, uint32_t *device_id);
    void *context;
} ${prefix}_driver_ops_t;
typedef struct {
    int32_t (*pf_notify_from_isr)(void *context);
    void *context;
} ${prefix}_osal_ops_t;
typedef struct {
    bool is_inited;
    ${prefix}_osal_ops_t osal_ops;
    ${prefix}_driver_ops_t driver_ops;
    ${prefix}_event_callback_t event_callback;
    void *event_context;
    bool event_pending;
    uint32_t pending_event_id;
    int32_t pending_status;
} ${prefix}_t;

/* Public Functions */
/** @brief 返回 ${type} 句柄实例。 */
${prefix}_t *${prefix}_inst(void);
/** @brief 将驱动操作表绑定到句柄。 */
int32_t ${prefix}_register_driver(${prefix}_t *handle, const ${prefix}_driver_ops_t *ops);
/** @brief 绑定 Handler 生命周期使用的 OS Wrapper 操作。 */
int32_t ${prefix}_register_osal_ops(${prefix}_t *handle, const ${prefix}_osal_ops_t *ops);
/** @brief 为当前实例注册一个任务上下文事件回调。 */
int32_t ${prefix}_set_event_callback(${prefix}_t *handle, ${prefix}_event_callback_t callback, void *context);
/** @brief 通过注入的驱动操作执行同步 ID 读取。 */
int32_t ${prefix}_read_id(${prefix}_t *handle, uint32_t *device_id);
/** @brief 延迟处理 ISR 事件且不调用用户回调。 */
int32_t ${prefix}_notify_from_isr(${prefix}_t *handle, uint32_t event_id, int32_t status);
/** @brief 在锁释放后于任务上下文投递延迟事件。 */
int32_t ${prefix}_process(${prefix}_t *handle);

#endif
`;
}

function handleSource(type) {
  const prefix = `impl_${type}_handle`;
  return `${fileHeader(`${prefix}.c`, `${type} 生命周期与事件句柄实现。`)}
/* Includes */
#include "${prefix}.h"

/* Private State */
static ${prefix}_t s_${type}_handle;

/* Public Functions */
${prefix}_t *${prefix}_inst(void) {
    s_${type}_handle.is_inited = true;
    return &s_${type}_handle;
}

int32_t ${prefix}_register_driver(${prefix}_t *handle, const ${prefix}_driver_ops_t *ops) {
    if (handle == NULL || ops == NULL || ops->pf_read_id == NULL) {
        return -1;
    }
    handle->driver_ops = *ops;
    return 0;
}

int32_t ${prefix}_register_osal_ops(${prefix}_t *handle, const ${prefix}_osal_ops_t *ops) {
    if (handle == NULL || ops == NULL || ops->pf_notify_from_isr == NULL) {
        return -1;
    }
    handle->osal_ops = *ops;
    return 0;
}

int32_t ${prefix}_set_event_callback(${prefix}_t *handle, ${prefix}_event_callback_t callback, void *context) {
    if (handle == NULL || callback == NULL) {
        return -1;
    }
    if (handle->event_callback != NULL) {
        return -2; /* 已注册 */
    }
    handle->event_callback = callback;
    handle->event_context = context;
    return 0;
}

int32_t ${prefix}_read_id(${prefix}_t *handle, uint32_t *device_id) {
    if (handle == NULL || device_id == NULL || handle->driver_ops.pf_read_id == NULL) {
        return -1;
    }
    return handle->driver_ops.pf_read_id(handle->driver_ops.context, device_id);
}

int32_t ${prefix}_notify_from_isr(${prefix}_t *handle, uint32_t event_id, int32_t status) {
    if (handle == NULL || handle->osal_ops.pf_notify_from_isr == NULL) {
        return -1;
    }
    if (handle->osal_ops.pf_notify_from_isr(handle->osal_ops.context) != 0) {
        return -1;
    }
    handle->pending_event_id = event_id;
    handle->pending_status = status;
    handle->event_pending = true; /* 替换为注入的 osal_*_from_isr 队列通知。 */
    return 0;
}

int32_t ${prefix}_process(${prefix}_t *handle) {
    ${prefix}_event_callback_t callback;
    void *context;
    uint32_t event_id;
    int32_t status;
    if (handle == NULL || !handle->event_pending) {
        return -1;
    }
    event_id = handle->pending_event_id;
    status = handle->pending_status;
    callback = handle->event_callback;
    context = handle->event_context;
    handle->event_pending = false; /* 若已注入锁，则在回调前释放。 */
    if (callback != NULL) {
        callback(context, event_id, status);
    }
    return 0;
}
`;
}

function wrapperHeader(type) {
  const prefix = `platform_${type}_wrapper`;
  return `${fileHeader(`${prefix}.h`, `${type} 平台无关 BSP 封装层。`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stddef.h>
#include <stdint.h>

/* Public Types */
typedef void (*${prefix}_event_callback_t)(void *context, uint32_t event_id, int32_t status);
typedef struct {
    int32_t (*pf_read_id)(uint32_t *device_id);
    int32_t (*pf_set_event_callback)(${prefix}_event_callback_t callback, void *context);
} ${prefix}_ops_t;

/* Public Functions */
/** @brief 注册一个平台实现函数表。 */
int32_t ${prefix}_register(const ${prefix}_ops_t *ops);
/** @brief 通过已注册的 Port 实现读取器件 ID。 */
int32_t ${prefix}_read_id(uint32_t *device_id);
/** @brief 通过已注册的 Port 注册应用事件回调。 */
int32_t ${prefix}_set_event_callback(${prefix}_event_callback_t callback, void *context);

#endif
`;
}

function wrapperSource(type) {
  const prefix = `platform_${type}_wrapper`;
  return `${fileHeader(`${prefix}.c`, `${type} 平台无关 BSP 封装层实现。`)}
/* Includes */
#include "${prefix}.h"

/* Private State */
static ${prefix}_ops_t s_${type}_ops;
static uint8_t s_${type}_registered;

/* Public Functions */
int32_t ${prefix}_register(const ${prefix}_ops_t *ops) {
    if (ops == NULL || ops->pf_read_id == NULL || ops->pf_set_event_callback == NULL) {
        return -1;
    }
    s_${type}_ops = *ops;
    s_${type}_registered = 1U;
    return 0;
}

int32_t ${prefix}_read_id(uint32_t *device_id) {
    if (s_${type}_registered == 0U) {
        return -1;
    }
    return s_${type}_ops.pf_read_id(device_id);
}

int32_t ${prefix}_set_event_callback(${prefix}_event_callback_t callback, void *context) {
    if (s_${type}_registered == 0U) {
        return -1;
    }
    return s_${type}_ops.pf_set_event_callback(callback, context);
}
`;
}

function portHeader(type) {
  const prefix = `impl_${type}_port`;
  return `${fileHeader(`${prefix}.h`, `${type} BSP Port 注册接口。`)}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdint.h>

/* Public Functions */
/** @brief 注入 Core/MCU/OS/Driver 操作，然后注册 Wrapper 操作。 */
int32_t ${prefix}_register(void);

#endif
`;
}

function portSource(type, device) {
  const prefix = `impl_${type}_port`;
  const handle = `impl_${type}_handle`;
  const driver = `impl_${device.stem}_driver`;
  const wrapper = `platform_${type}_wrapper`;
  return `${fileHeader(`${prefix}.c`, `${type} BSP Port 组装与 Wrapper 注册。`)}
/* Includes */
#include "${prefix}.h"
#include "${handle}.h"
#include "${driver}.h"
#include "${wrapper}.h"

/* Private Composition */
static ${handle}_t *s_${type}_handle;

extern int32_t ${type}_platform_core_transaction(void *context);
extern int32_t ${type}_platform_mcu_feature(void *context);
extern int32_t ${type}_platform_osal_notify_from_isr(void *context);

static int32_t ${type}_port_core_transaction(void *context) {
    return ${type}_platform_core_transaction(context);
}

static int32_t ${type}_port_mcu_feature(void *context) {
    return ${type}_platform_mcu_feature(context);
}

static int32_t ${type}_port_osal_notify_from_isr(void *context) {
    return ${type}_platform_osal_notify_from_isr(context);
}

/* Private Functions */
static int32_t ${type}_port_read_id(uint32_t *device_id) {
    return ${handle}_read_id(s_${type}_handle, device_id);
}

static int32_t ${type}_port_set_event_callback(${wrapper}_event_callback_t callback, void *context) {
    return ${handle}_set_event_callback(s_${type}_handle, callback, context);
}

/* Public Functions */
int32_t ${prefix}_register(void) {
    ${driver}_t *driver = ${driver}_inst();
    ${driver}_core_ops_t core_ops;
    ${driver}_mcu_ops_t mcu_ops;
    ${handle}_driver_ops_t driver_ops;
    ${handle}_osal_ops_t osal_ops;
    ${wrapper}_ops_t wrapper_ops;
    s_${type}_handle = ${handle}_inst();
    core_ops.pf_transaction = ${type}_port_core_transaction;
    core_ops.context = NULL;
    mcu_ops.pf_chip_feature = ${type}_port_mcu_feature;
    mcu_ops.context = NULL;
    driver_ops.pf_read_id = driver->pf_read_id;
    driver_ops.context = driver->context;
    osal_ops.pf_notify_from_isr = ${type}_port_osal_notify_from_isr;
    osal_ops.context = NULL;
    if (${driver}_register_core_ops(driver, &core_ops) != 0
        || ${driver}_register_mcu_ops(driver, &mcu_ops) != 0
        || ${handle}_register_osal_ops(s_${type}_handle, &osal_ops) != 0
        || ${handle}_register_driver(s_${type}_handle, &driver_ops) != 0) {
        return -1;
    }
    wrapper_ops.pf_read_id = ${type}_port_read_id;
    wrapper_ops.pf_set_event_callback = ${type}_port_set_event_callback;
    return ${wrapper}_register(&wrapper_ops);
}
`;
}

function platformDeviceClass(deviceType, deviceStem) {
  const classes = {
    display: 'PLATFORM_DEVICE_CLASS_DISPLAY',
    touch: 'PLATFORM_DEVICE_CLASS_TOUCH',
    imu: 'PLATFORM_DEVICE_CLASS_IMU',
    sensor: deviceStem === 'aht21' ? 'PLATFORM_DEVICE_CLASS_TEMP_HUMI' : 'PLATFORM_DEVICE_CLASS_IMU',
    externflash: 'PLATFORM_DEVICE_CLASS_STORAGE',
    storage: 'PLATFORM_DEVICE_CLASS_STORAGE',
    backlight: 'PLATFORM_DEVICE_CLASS_BACKLIGHT',
    battery: 'PLATFORM_DEVICE_CLASS_BATTERY'
  };
  return classes[deviceType] || 'PLATFORM_DEVICE_CLASS_EVENT';
}

function modelHeaderV2(type) {
  const prefix = `platform_${type}`;
  return `${fileHeader(`${prefix}_model.h`, `${type} Platform BSP 设备模型。`, 'Model 只定义设备身份、四元组和 typed Ops；Driver、Handle 和板级资源由 Impl 装配。', ['<stddef.h>', '<stdint.h>', 'platform_device.h', 'platform_error.h', 'platform_lifecycle.h', 'platform_type.h'])}
#ifndef ${guard(`${prefix}_model`)}
#define ${guard(`${prefix}_model`)}

/* Includes */
#include <stddef.h>
#include <stdint.h>
#include "platform_device.h"
#include "platform_error.h"
#include "platform_lifecycle.h"
#include "platform_type.h"

/* Public Types */
typedef struct ${prefix}_device ${prefix}_device_t;

typedef struct {
    const void *p_resource_profile; /**< Impl/resource 所有的资源描述，Model 不解释。 */
    uint32_t driver_count;          /**< 已装配的同类 Driver 数量。 */
} ${prefix}_cfg_t;

typedef struct {
    void *backend_context; /**< Impl Handle 上下文，Platform 只借用。 */
    uint8_t ready;
} ${prefix}_ctx_t;

typedef struct {
    uint32_t active_driver;
    uint32_t last_device_id;
    platform_err_t last_error;
} ${prefix}_data_t;

typedef struct {
    platform_err_t (*init)(${prefix}_device_t *p_dev);
    platform_err_t (*deinit)(${prefix}_device_t *p_dev);
    platform_err_t (*read_id)(${prefix}_device_t *p_dev, uint32_t driver_index, uint32_t *p_device_id);
    platform_err_t (*process)(${prefix}_device_t *p_dev);
} ${prefix}_ops_t;

struct ${prefix}_device {
    platform_device_t base;
    const ${prefix}_cfg_t *cfg;
    ${prefix}_ctx_t ctx;
    ${prefix}_data_t data;
    const ${prefix}_ops_t *ops;
};

/* Public Functions */
platform_err_t ${prefix}_init(${prefix}_device_t *p_dev, const char *p_name,
                              const ${prefix}_cfg_t *p_cfg,
                              const ${prefix}_ops_t *p_ops,
                              const platform_lifecycle_ops_t *p_lifecycle);
platform_err_t ${prefix}_register_default(${prefix}_device_t *p_dev);
${prefix}_device_t *${prefix}_get_default(void);

#endif /* ${guard(`${prefix}_model`)} */
`;
}

function modelSourceV2(type, deviceType, deviceStem) {
  const prefix = `platform_${type}`;
  const className = platformDeviceClass(deviceType, deviceStem);
  return `${fileHeader(`${prefix}_model.c`, `${type} Platform BSP 设备模型实现。`, 'Model 仅初始化公共对象身份和四元组，不承担器件协议、缓存、任务或资源绑定。', [`${prefix}_model.h`, 'platform_def.h'])}
/* Includes */
#include "${prefix}_model.h"

/* Private State */
static ${prefix}_device_t *s_${type}_default;

/* Public Functions */
platform_err_t ${prefix}_init(${prefix}_device_t *p_dev, const char *p_name,
                              const ${prefix}_cfg_t *p_cfg,
                              const ${prefix}_ops_t *p_ops,
                              const platform_lifecycle_ops_t *p_lifecycle) {
    platform_err_t ret;
    if ((p_dev == NULL) || (p_name == NULL) || (p_cfg == NULL) || (p_ops == NULL)) {
        return PLATFORM_ERR_PARAM;
    }
    ret = platform_device_init(&p_dev->base, p_name, ${className},
                               PLATFORM_DEVICE_CAP_READ | PLATFORM_DEVICE_CAP_WRITE |
                                   PLATFORM_DEVICE_CAP_CONTROL | PLATFORM_DEVICE_CAP_IRQ |
                                   PLATFORM_DEVICE_CAP_DMA,
                               p_dev, p_lifecycle);
    if (ret != PLATFORM_ERR_OK) {
        return ret;
    }
    p_dev->cfg = p_cfg;
    p_dev->ops = p_ops;
    p_dev->ctx.backend_context = NULL;
    p_dev->ctx.ready = 0U;
    p_dev->data.active_driver = 0U;
    p_dev->data.last_device_id = 0U;
    p_dev->data.last_error = PLATFORM_ERR_OK;
    return PLATFORM_ERR_OK;
}

platform_err_t ${prefix}_register_default(${prefix}_device_t *p_dev) {
    if (p_dev == NULL) return PLATFORM_ERR_PARAM;
    if (s_${type}_default != NULL) {
        return (s_${type}_default == p_dev) ? PLATFORM_ERR_ALREADY_INIT : PLATFORM_ERR_BUSY;
    }
    s_${type}_default = p_dev;
    return PLATFORM_ERR_OK;
}

${prefix}_device_t *${prefix}_get_default(void) {
    return s_${type}_default;
}
`;
}

function driverHeaderV2(device) {
  const prefix = `impl_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.h`, `${device.directory} 协议 Driver 四元组。`, 'Driver 是一个具体物理设备实例；只对 Port 暴露构造函数，IRQ/DMA 通过注入的 MCU Ops 进入协议实现。', ['<stdint.h>', 'platform_error.h'])}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdint.h>
#include "platform_error.h"

/* Public Types */
typedef struct ${prefix}_ops ${prefix}_ops_t;
typedef struct {
    uint32_t timeout_ms;
} ${prefix}_cfg_t;
typedef struct {
    platform_err_t (*pf_transaction)(void *p_context);
    void *p_context;
    platform_err_t (*pf_chip_feature)(void *p_context);
    void *p_mcu_context;
} ${prefix}_ctx_t;
typedef struct {
    uint32_t last_device_id;
    platform_err_t last_error;
    uint8_t is_inited;
} ${prefix}_data_t;
typedef struct {
    const ${prefix}_cfg_t *cfg;
    ${prefix}_ctx_t ctx;
    ${prefix}_data_t data;
    const ${prefix}_ops_t *ops;
} ${prefix}_t;

struct ${prefix}_ops {
    platform_err_t (*read_id)(void *p_context, uint32_t *p_device_id);
};

/* Public Functions */
/** @brief 构造一个由调用者持有的 ${device.directory} Driver 实例。 */
platform_err_t ${prefix}_construct(${prefix}_t *p_driver,
                                   const ${prefix}_cfg_t *p_cfg,
                                   const ${prefix}_ctx_t *p_ctx);

#endif /* ${guard(prefix)} */
`;
}

function driverSourceV2(device) {
  const prefix = `impl_${device.stem}_driver`;
  return `${fileHeader(`${prefix}.c`, `${device.directory} 协议 Driver 实现。`, 'Driver 只执行器件协议；Core/MCU 的事务、IRQ 和 DMA 能力由 Port 注入。', [`${prefix}.h`, `impl_${device.stem}_config.h`])}
/* Includes */
#include "${prefix}.h"
#include "impl_${device.stem}_config.h"

/* Private Functions */
static platform_err_t ${device.stem}_driver_read_id(void *p_context, uint32_t *p_device_id) {
    ${prefix}_t *p_driver = p_context;
    if ((p_driver == NULL) || (p_device_id == NULL) ||
        (p_driver->ctx.pf_transaction == NULL) || (p_driver->ctx.pf_chip_feature == NULL)) {
        return PLATFORM_ERR_PARAM;
    }
    if ((p_driver->ctx.pf_transaction(p_driver->ctx.p_context) != PLATFORM_ERR_OK) ||
        (p_driver->ctx.pf_chip_feature(p_driver->ctx.p_mcu_context) != PLATFORM_ERR_OK)) {
        p_driver->data.last_error = PLATFORM_ERR_FAIL;
        return p_driver->data.last_error;
    }
    *p_device_id = 0U;
    p_driver->data.last_device_id = *p_device_id;
    p_driver->data.is_inited = 1U;
    p_driver->data.last_error = PLATFORM_ERR_OK;
    return PLATFORM_ERR_OK;
}

/* Private State */
static const ${prefix}_ops_t s_${device.stem}_driver_ops = {
    .read_id = ${device.stem}_driver_read_id
};

/* Public Functions */
platform_err_t ${prefix}_construct(${prefix}_t *p_driver,
                                   const ${prefix}_cfg_t *p_cfg,
                                   const ${prefix}_ctx_t *p_ctx) {
    if ((p_driver == NULL) || (p_cfg == NULL) || (p_ctx == NULL)) {
        return PLATFORM_ERR_PARAM;
    }
    p_driver->cfg = p_cfg;
    p_driver->ctx = *p_ctx;
    p_driver->data.last_device_id = 0U;
    p_driver->data.last_error = PLATFORM_ERR_OK;
    p_driver->data.is_inited = 0U;
    p_driver->ops = &s_${device.stem}_driver_ops;
    return PLATFORM_ERR_OK;
}
`;
}

function handleHeaderV2(type) {
  const prefix = `impl_${type}_handle`;
  const model = `platform_${type}_model`;
  return `${fileHeader(`${prefix}.h`, `${type} 同类 Driver Handle 四元组。`, 'Handle 只组合一个设备类别的 Driver 集合；其 ops 为 Impl 内部行为表，Platform-facing 函数以独立声明暴露。', ['<stddef.h>', '<stdint.h>', 'platform_error.h', `${model}.h`])}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stddef.h>
#include <stdint.h>
#include "platform_error.h"
#include "${model}.h"

/* Public Types */
typedef struct {
    void *p_context;
    platform_err_t (*read_id)(void *p_context, uint32_t *p_device_id);
} ${prefix}_driver_ref_t;
typedef struct ${prefix}_ops ${prefix}_ops_t;
typedef struct {
    const ${prefix}_driver_ref_t *p_drivers;
    size_t driver_count;
    void *p_os_context;
} ${prefix}_cfg_t;
typedef struct {
    uint32_t active_driver;
    uint8_t is_inited;
} ${prefix}_ctx_t;
typedef struct {
    uint32_t last_device_id;
    platform_err_t last_error;
    uint32_t successful_reads;
} ${prefix}_data_t;
typedef struct {
    const ${prefix}_cfg_t *cfg;
    ${prefix}_ctx_t ctx;
    ${prefix}_data_t data;
    const ${prefix}_ops_t *ops;
} ${prefix}_t;

struct ${prefix}_ops {
    platform_err_t (*init)(${prefix}_t *p_handle);
    platform_err_t (*deinit)(${prefix}_t *p_handle);
    platform_err_t (*read_id)(${prefix}_t *p_handle, uint32_t driver_index, uint32_t *p_device_id);
    platform_err_t (*process)(${prefix}_t *p_handle);
};

/* 组合根装配接口 */
platform_err_t ${prefix}_construct(${prefix}_t *p_handle,
                                   const ${prefix}_cfg_t *p_cfg,
                                   const ${prefix}_ctx_t *p_ctx);

/* Public Functions */
/* 平台适配接口：函数签名直接匹配 platform_${type}_ops_t。 */
platform_err_t ${prefix}_init(platform_${type}_device_t *p_dev);
platform_err_t ${prefix}_deinit(platform_${type}_device_t *p_dev);
platform_err_t ${prefix}_read_id(platform_${type}_device_t *p_dev,
                                 uint32_t driver_index, uint32_t *p_device_id);
platform_err_t ${prefix}_process(platform_${type}_device_t *p_dev);

#endif /* ${guard(prefix)} */
`;
}

function handleSourceV2(type) {
  const prefix = `impl_${type}_handle`;
  return `${fileHeader(`${prefix}.c`, `${type} 同类 Driver Handle 实现。`, 'Handle 聚合同类 Driver 的生命周期、读取结果和事件状态；不实现器件协议。', [`${prefix}.h`])}
/* Includes */
#include "${prefix}.h"

/* Private Functions */
static platform_err_t ${type}_handle_init_impl(${prefix}_t *p_handle) {
    if ((p_handle == NULL) || (p_handle->cfg == NULL) ||
        (p_handle->cfg->p_drivers == NULL) || (p_handle->cfg->driver_count == 0U)) {
        return PLATFORM_ERR_PARAM;
    }
    p_handle->ctx.is_inited = 1U;
    return PLATFORM_ERR_OK;
}

static platform_err_t ${type}_handle_deinit_impl(${prefix}_t *p_handle) {
    if (p_handle == NULL) return PLATFORM_ERR_PARAM;
    p_handle->ctx.is_inited = 0U;
    return PLATFORM_ERR_OK;
}

static platform_err_t ${type}_handle_read_id_impl(${prefix}_t *p_handle,
                                                 uint32_t driver_index,
                                                 uint32_t *p_device_id) {
    const ${prefix}_driver_ref_t *p_ref;
    platform_err_t ret;
    if ((p_handle == NULL) || (p_device_id == NULL) || (p_handle->cfg == NULL) ||
        (p_handle->ctx.is_inited == 0U) || (driver_index >= p_handle->cfg->driver_count)) {
        return PLATFORM_ERR_PARAM;
    }
    p_ref = &p_handle->cfg->p_drivers[driver_index];
    if ((p_ref->read_id == NULL) || (p_ref->p_context == NULL)) return PLATFORM_ERR_PARAM;
    ret = p_ref->read_id(p_ref->p_context, p_device_id);
    p_handle->ctx.active_driver = (uint32_t)driver_index;
    p_handle->data.last_error = ret;
    if (ret == PLATFORM_ERR_OK) {
        p_handle->data.last_device_id = *p_device_id;
        p_handle->data.successful_reads++;
    }
    return ret;
}

static platform_err_t ${type}_handle_process_impl(${prefix}_t *p_handle) {
    if ((p_handle == NULL) || (p_handle->ctx.is_inited == 0U)) return PLATFORM_ERR_NOT_INITIALIZED;
    return PLATFORM_ERR_OK;
}

/* Private State */
static const ${prefix}_ops_t s_${type}_handle_ops = {
    .init = ${type}_handle_init_impl,
    .deinit = ${type}_handle_deinit_impl,
    .read_id = ${type}_handle_read_id_impl,
    .process = ${type}_handle_process_impl
};

/* Public Functions */
platform_err_t ${prefix}_construct(${prefix}_t *p_handle,
                                   const ${prefix}_cfg_t *p_cfg,
                                   const ${prefix}_ctx_t *p_ctx) {
    if ((p_handle == NULL) || (p_cfg == NULL) || (p_ctx == NULL)) return PLATFORM_ERR_PARAM;
    p_handle->cfg = p_cfg;
    p_handle->ctx = *p_ctx;
    p_handle->data.last_device_id = 0U;
    p_handle->data.last_error = PLATFORM_ERR_OK;
    p_handle->data.successful_reads = 0U;
    p_handle->ops = &s_${type}_handle_ops;
    return PLATFORM_ERR_OK;
}

static ${prefix}_t *${type}_handle_from_device(platform_${type}_device_t *p_dev) {
    return (p_dev == NULL) ? NULL : ((${prefix}_t *)p_dev->ctx.backend_context);
}

platform_err_t ${prefix}_init(platform_${type}_device_t *p_dev) {
    ${prefix}_t *p_handle = ${type}_handle_from_device(p_dev);
    return (p_handle == NULL) ? PLATFORM_ERR_PARAM : p_handle->ops->init(p_handle);
}

platform_err_t ${prefix}_deinit(platform_${type}_device_t *p_dev) {
    ${prefix}_t *p_handle = ${type}_handle_from_device(p_dev);
    return (p_handle == NULL) ? PLATFORM_ERR_PARAM : p_handle->ops->deinit(p_handle);
}

platform_err_t ${prefix}_read_id(platform_${type}_device_t *p_dev,
                                 uint32_t driver_index, uint32_t *p_device_id) {
    ${prefix}_t *p_handle = ${type}_handle_from_device(p_dev);
    return (p_handle == NULL) ? PLATFORM_ERR_PARAM :
        p_handle->ops->read_id(p_handle, driver_index, p_device_id);
}

platform_err_t ${prefix}_process(platform_${type}_device_t *p_dev) {
    ${prefix}_t *p_handle = ${type}_handle_from_device(p_dev);
    return (p_handle == NULL) ? PLATFORM_ERR_PARAM : p_handle->ops->process(p_handle);
}
`;
}

function portHeaderV2(type) {
  const prefix = `impl_${type}_handle_port`;
  return `${fileHeader(`${prefix}.h`, `${type} BSP Port 注册接口。`, 'Port 从 resource 获取 MCU/Core 实例，构造 Driver 与同类 Handle，并注册 Platform Device。', ['<stdint.h>', 'platform_error.h'])}
#ifndef ${guard(prefix)}
#define ${guard(prefix)}

/* Includes */
#include <stdint.h>
#include "platform_error.h"

/* Public Functions */
platform_err_t ${prefix}_register(void);

#endif /* ${guard(prefix)} */
`;
}

function portSourceV2(type, device, primaryCore) {
  const prefix = `impl_${type}_handle_port`;
  const driverPrefix = `impl_${device.stem}_driver`;
  const handlePrefix = `impl_${type}_handle`;
  const modelPrefix = `platform_${type}`;
  return `${fileHeader(`${prefix}.c`, `${type} BSP Port 组合根。`, 'Port 只做 resource 注入、对象构造、函数绑定和 Platform Device 注册，不实现协议或运行时策略。', [`${prefix}.h`, `${driverPrefix}.h`, `${handlePrefix}.h`, `${modelPrefix}_model.h`])}
/* Includes */
#include "${prefix}.h"
#include "${driverPrefix}.h"
#include "${handlePrefix}.h"
#include "${modelPrefix}_model.h"

/* 资源注入接口：具体 resource.c 提供已注册的 MCU/Core 操作与上下文。 */
/* Private Types */
typedef struct {
    platform_err_t (*pf_transaction)(void *p_context);
    void *p_context;
    platform_err_t (*pf_chip_feature)(void *p_context);
    void *p_mcu_context;
} ${type}_resource_ops_t;

extern const ${type}_resource_ops_t *${type}_resource_get_ops(void);

/* Private Composition */
static ${driverPrefix}_t s_${device.stem}_driver;
static ${handlePrefix}_driver_ref_t s_${type}_driver_refs[1];
static ${handlePrefix}_t s_${type}_handle;
static ${modelPrefix}_device_t s_${type}_device;
static const ${driverPrefix}_cfg_t s_${device.stem}_driver_cfg = { .timeout_ms = 100U };
static const ${modelPrefix}_cfg_t s_${type}_model_cfg = {
    .p_resource_profile = NULL,
    .driver_count = 1U
};

/* Public Functions */
platform_err_t ${prefix}_register(void) {
    const ${type}_resource_ops_t *p_resource_ops = ${type}_resource_get_ops();
    ${driverPrefix}_ctx_t driver_ctx;
    ${handlePrefix}_cfg_t handle_cfg;
    ${handlePrefix}_ctx_t handle_ctx = { .active_driver = 0U, .is_inited = 0U };
    ${modelPrefix}_ops_t model_ops = {
        .init = ${handlePrefix}_init,
        .deinit = ${handlePrefix}_deinit,
        .read_id = ${handlePrefix}_read_id,
        .process = ${handlePrefix}_process
    };
    platform_err_t ret;
    if ((p_resource_ops == NULL) || (p_resource_ops->pf_transaction == NULL) ||
        (p_resource_ops->pf_chip_feature == NULL)) {
        return PLATFORM_ERR_NO_RESOURCE;
    }
    driver_ctx.pf_transaction = p_resource_ops->pf_transaction;
    driver_ctx.p_context = p_resource_ops->p_context;
    driver_ctx.pf_chip_feature = p_resource_ops->pf_chip_feature;
    driver_ctx.p_mcu_context = p_resource_ops->p_mcu_context;
    ret = ${driverPrefix}_construct(&s_${device.stem}_driver, &s_${device.stem}_driver_cfg, &driver_ctx);
    if (ret != PLATFORM_ERR_OK) return ret;
    s_${type}_driver_refs[0].p_context = &s_${device.stem}_driver;
    s_${type}_driver_refs[0].read_id = s_${device.stem}_driver.ops->read_id;
    handle_cfg.p_drivers = s_${type}_driver_refs;
    handle_cfg.driver_count = 1U;
    handle_cfg.p_os_context = NULL;
    ret = ${handlePrefix}_construct(&s_${type}_handle, &handle_cfg, &handle_ctx);
    if (ret != PLATFORM_ERR_OK) return ret;
    ret = ${modelPrefix}_init(&s_${type}_device, "${type}", &s_${type}_model_cfg, &model_ops, NULL);
    if (ret != PLATFORM_ERR_OK) return ret;
    s_${type}_device.ctx.backend_context = &s_${type}_handle;
    ret = ${modelPrefix}_register_default(&s_${type}_device);
    if (ret != PLATFORM_ERR_OK) return ret;
    return ${handlePrefix}_init(&s_${type}_device);
}
`;
}

function generateModelFirstBsp({ deviceType, device, cores }) {
  const primaryCore = cores[0];
  const driverRoot = `04_Impl/impl_bsp/impl_bsp_hal_driver/${device.directory}`;
  const handleRoot = `04_Impl/impl_bsp/impl_bsp_handle/${deviceType}`;
  const portRoot = '04_Impl/impl_bsp/impl_bsp_port';
  const modelRoot = `03_Platform/platform_bsp/${deviceType}`;
  const files = [
    { path: `${modelRoot}/Inc/platform_${deviceType}_model.h`, content: modelHeaderV2(deviceType) },
    { path: `${modelRoot}/Src/platform_${deviceType}_model.c`, content: modelSourceV2(deviceType, deviceType, device.stem) },
    { path: `${driverRoot}/Inc/impl_${device.stem}_config.h`, content: driverConfig(device) },
    { path: `${driverRoot}/Inc/impl_${device.stem}_driver.h`, content: driverHeaderV2(device, primaryCore) },
    { path: `${driverRoot}/Src/impl_${device.stem}_driver.c`, content: driverSourceV2(device) },
    { path: `${handleRoot}/Inc/impl_${deviceType}_handle.h`, content: handleHeaderV2(deviceType) },
    { path: `${handleRoot}/Src/impl_${deviceType}_handle.c`, content: handleSourceV2(deviceType) },
    { path: `${portRoot}/Inc/impl_${deviceType}_handle_port.h`, content: portHeaderV2(deviceType) },
    { path: `${portRoot}/Src/impl_${deviceType}_handle_port.c`, content: portSourceV2(deviceType, device, primaryCore) }
  ];
  Object.defineProperty(files, 'manifest', {
    enumerable: false,
    value: {
      device: device.directory, deviceType, cores,
      osalResources: [], styleProfile: 'style-profile',
      apiMapping: ['Platform Device Model -> Handle', 'Handle -> same-class Driver set', 'Driver -> Core/MCU Ops'],
      blocking: [], isrSafe: [],
      unresolved: ['UNRESOLVED_RESOURCE_API: bind resource-provided MCU/Core instances before production integration']
    }
  });
  return formatGeneratedFiles(files);
}

function ssd1306Config() {
  return `${fileHeader('impl_ssd1306_config.h', 'SSD1306 器件配置。', 'Port 将器件几何参数注入显示句柄。')}
#ifndef IMPL_SSD1306_CONFIG_H
#define IMPL_SSD1306_CONFIG_H

/* Public Defines */
#ifndef IMPL_SSD1306_WIDTH
#define IMPL_SSD1306_WIDTH 128U
#endif
#ifndef IMPL_SSD1306_HEIGHT
#define IMPL_SSD1306_HEIGHT 64U
#endif
#ifndef IMPL_SSD1306_I2C_ADDRESS_7BIT
#define IMPL_SSD1306_I2C_ADDRESS_7BIT 0x3CU
#endif
#ifndef IMPL_SSD1306_COLUMN_OFFSET
#define IMPL_SSD1306_COLUMN_OFFSET 0U
#endif
#ifndef IMPL_SSD1306_TIMEOUT_MS
#define IMPL_SSD1306_TIMEOUT_MS 100U
#endif
#define IMPL_SSD1306_PAGE_COUNT (IMPL_SSD1306_HEIGHT / 8U)
#define IMPL_SSD1306_FRAMEBUFFER_SIZE ((IMPL_SSD1306_WIDTH * IMPL_SSD1306_HEIGHT) / 8U)

#endif
`;
}

function ssd1306DriverHeader() {
  return `${fileHeader('impl_ssd1306_driver.h', 'SSD1306 协议驱动 API。', 'Port 注入 Core I2C 操作；驱动发出控制器命令与帧事务。', ['<stddef.h>', '<stdint.h>'])}
#ifndef IMPL_SSD1306_DRIVER_H
#define IMPL_SSD1306_DRIVER_H

/* Includes */
#include <stddef.h>
#include <stdint.h>

/* Public Types */
typedef struct {
    void *p_context; /**< 由 Port 选定的 Core 总线实例。 */
    /**
     * @brief 写入一次 SSD1306 命令或数据事务。
     * @param p_context Core 总线实例。
     * @param address_7bit 7 位器件地址。
     * @param control SSD1306 控制字节。
     * @param p_data 待传输的数据。
     * @param length p_data 的字节数。
     * @param timeout_ms 阻塞超时；禁止在 ISR 中调用。
     * @return Core 定义的事务状态。
     */
    int32_t (*pf_write)(void *p_context, uint8_t address_7bit,
                        uint8_t control, const uint8_t *p_data,
                        size_t length, uint32_t timeout_ms);
} impl_ssd1306_bus_ops_t;

typedef struct {
    void *p_context; /**< 驱动私有状态。 */
    /** @brief 绑定 Core 总线操作。 @return 成功返回零。 */
    int32_t (*pf_bind_bus)(void *p_context,
                           const impl_ssd1306_bus_ops_t *p_ops);
    /** @brief 初始化控制器。 @warning 阻塞操作；不可在 ISR 中调用。 */
    int32_t (*pf_init)(void *p_context);
    /** @brief 写入一帧完整的页格式画面。 @warning 阻塞操作；不可在 ISR 中调用。 */
    int32_t (*pf_write_frame)(void *p_context,
                              const uint8_t *p_framebuffer,
                              size_t length);
} impl_ssd1306_driver_api_t;

/* Public Functions */
/**
 * @brief 返回上下文优先的 SSD1306 驱动操作。
 * @param[out] p_api 目标 API 表。
 * @return 成功返回零；输入无效返回负值。
 */
int32_t impl_ssd1306_driver_inst(impl_ssd1306_driver_api_t *p_api);

#endif
`;
}

function ssd1306DriverSource() {
  return `${fileHeader('impl_ssd1306_driver.c', 'SSD1306 协议实现。', '初始化发送 SSD1306 命令；帧刷新使用注入的事务级 Core I2C 操作。', ['impl_ssd1306_driver.h', 'impl_ssd1306_config.h'])}
/* Includes */
#include "impl_ssd1306_driver.h"
#include "impl_ssd1306_config.h"

/* Private Defines */
#define SSD1306_OK 0
#define SSD1306_ERROR (-1)
#define SSD1306_CONTROL_COMMAND 0x00U
#define SSD1306_CONTROL_DATA 0x40U

/* Private Types */
typedef struct {
    impl_ssd1306_bus_ops_t bus_ops;
    uint8_t is_inited; /**< 仅在初始命令序列成功后才置位。 */
} ssd1306_driver_state_t;

/* Private State */
static ssd1306_driver_state_t s_ssd1306_state;

/* Private Functions */
/**
 * @brief 绑定事务级 Core I2C 操作。
 * @param p_context 由 API 表提供的驱动状态。
 * @param p_ops 由 Port 提供的上下文优先 Core 总线操作。
 * @return 成功返回零；任一操作不可用时返回负值。
 */
static int32_t ssd1306_bind_bus(void *p_context,
                                const impl_ssd1306_bus_ops_t *p_ops) {
    ssd1306_driver_state_t *p_state = p_context;
    if ((p_state == NULL) || (p_ops == NULL) || (p_ops->pf_write == NULL)) return SSD1306_ERROR;
    p_state->bus_ops = *p_ops;
    return SSD1306_OK;
}

/**
 * @brief 发送 SSD1306 初始化命令序列。
 * @param p_context 由 API 表提供的驱动状态。
 * @return 控制器接受命令序列时返回零。
 * @warning 通过 Core I2C 阻塞执行；不可在 ISR 中调用。
 */
static int32_t ssd1306_init(void *p_context) {
    static const uint8_t commands[] = {
        0xAEU, 0x20U, 0x00U, 0x21U, IMPL_SSD1306_COLUMN_OFFSET,
        (uint8_t)(IMPL_SSD1306_COLUMN_OFFSET + IMPL_SSD1306_WIDTH - 1U),
        0x22U, 0x00U, (uint8_t)(IMPL_SSD1306_PAGE_COUNT - 1U),
        0xA1U, 0xC8U, 0xAFU
    };
    ssd1306_driver_state_t *p_state = p_context;
    if ((p_state == NULL) || (p_state->bus_ops.pf_write == NULL)) return SSD1306_ERROR;
    if (p_state->bus_ops.pf_write(p_state->bus_ops.p_context, IMPL_SSD1306_I2C_ADDRESS_7BIT,
                                  SSD1306_CONTROL_COMMAND, commands, sizeof(commands),
                                  IMPL_SSD1306_TIMEOUT_MS) != SSD1306_OK) return SSD1306_ERROR;
    p_state->is_inited = 1U;
    return SSD1306_OK;
}

/**
 * @brief 通过 Core I2C 写入页格式的全帧画面。
 * @param p_context 由 API 表提供的驱动状态。
 * @param p_framebuffer 由句柄持有的页格式帧缓冲。
 * @param length 配置的确切帧缓冲长度。
 * @return Core 事务状态或负的校验错误。
 * @warning 通过 Core I2C 阻塞执行；不可在 ISR 中调用。
 */
static int32_t ssd1306_write_frame(void *p_context, const uint8_t *p_framebuffer,
                                   size_t length) {
    static const uint8_t window[] = {
        0x21U, IMPL_SSD1306_COLUMN_OFFSET,
        (uint8_t)(IMPL_SSD1306_COLUMN_OFFSET + IMPL_SSD1306_WIDTH - 1U),
        0x22U, 0x00U, (uint8_t)(IMPL_SSD1306_PAGE_COUNT - 1U)
    };
    ssd1306_driver_state_t *p_state = p_context;
    if ((p_state == NULL) || (p_framebuffer == NULL) ||
        (length != IMPL_SSD1306_FRAMEBUFFER_SIZE) || (p_state->is_inited == 0U)) return SSD1306_ERROR;
    if (p_state->bus_ops.pf_write(p_state->bus_ops.p_context,
                                  IMPL_SSD1306_I2C_ADDRESS_7BIT,
                                  SSD1306_CONTROL_COMMAND, window, sizeof(window),
                                  IMPL_SSD1306_TIMEOUT_MS) != SSD1306_OK) return SSD1306_ERROR;
    return p_state->bus_ops.pf_write(p_state->bus_ops.p_context,
                                     IMPL_SSD1306_I2C_ADDRESS_7BIT,
                                     SSD1306_CONTROL_DATA, p_framebuffer, length,
                                     IMPL_SSD1306_TIMEOUT_MS);
}

/* Public Functions */
/**
 * @brief 仅向 Port 暴露上下文优先的驱动操作。
 * @param[out] p_api 目标驱动 API 表。
 * @return 成功返回零；输入无效返回负值。
 */
int32_t impl_ssd1306_driver_inst(impl_ssd1306_driver_api_t *p_api) {
    if (p_api == NULL) return SSD1306_ERROR;
    p_api->p_context = &s_ssd1306_state;
    p_api->pf_bind_bus = ssd1306_bind_bus;
    p_api->pf_init = ssd1306_init;
    p_api->pf_write_frame = ssd1306_write_frame;
    return SSD1306_OK;
}
`;
}

function displayHandleHeader() {
  return `${fileHeader('impl_display_handle.h', '显示类句柄 API。', 'Port 注入 OSAL 与驱动操作；句柄持有帧缓冲并串行化显示请求。', ['<stdbool.h>', '<stddef.h>', '<stdint.h>'])}
#ifndef IMPL_DISPLAY_HANDLE_H
#define IMPL_DISPLAY_HANDLE_H

/* Includes */
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/* Public Defines */
#define IMPL_DISPLAY_HANDLE_MAX_FRAMEBUFFER_SIZE 2048U
#define IMPL_DISPLAY_LOCK_TIMEOUT_MS 100U

/* Public Types */
typedef struct { uint16_t width; uint16_t height; size_t framebuffer_length; } impl_display_geometry_t;
typedef struct { void *p_context; int32_t (*pf_init)(void *p_context); int32_t (*pf_write_frame)(void *p_context, const uint8_t *p_data, size_t length); } impl_display_driver_ops_t;
typedef struct { void *p_mutex; int32_t (*pf_lock)(void *p_mutex, uint32_t timeout_ms); int32_t (*pf_unlock)(void *p_mutex); } impl_display_osal_ops_t;
typedef struct {
    void *p_context;
    int32_t (*pf_bind_driver)(void *p_context, const impl_display_driver_ops_t *p_ops);
    int32_t (*pf_bind_osal)(void *p_context, const impl_display_osal_ops_t *p_ops);
    int32_t (*pf_configure)(void *p_context, const impl_display_geometry_t *p_geometry);
    int32_t (*pf_init)(void *p_context);
    int32_t (*pf_clear)(void *p_context);
    int32_t (*pf_set_pixel)(void *p_context, uint16_t x, uint16_t y, bool enabled);
    int32_t (*pf_flush)(void *p_context);
} impl_display_handle_api_t;

/* Public Functions */
/** @brief 返回显示类上下文优先的 Handler 操作。 */
int32_t impl_display_handle_inst(impl_display_handle_api_t *p_api);

#endif
`;
}

function displayHandleSource() {
  return `${fileHeader('impl_display_handle.c', '显示类帧缓冲与串行化实现。', '句柄持有帧缓冲，用注入的 OSAL 操作加锁，再调用通用驱动操作。', ['impl_display_handle.h', '<string.h>'])}
/* Includes */
#include "impl_display_handle.h"
#include <string.h>

/* Private Defines */
#define DISPLAY_OK 0
#define DISPLAY_ERROR (-1)

/* Private Types */
typedef struct { impl_display_geometry_t geometry; impl_display_driver_ops_t driver_ops; impl_display_osal_ops_t osal_ops; uint8_t framebuffer[IMPL_DISPLAY_HANDLE_MAX_FRAMEBUFFER_SIZE]; uint8_t configured; uint8_t inited; uint8_t dirty; } display_handle_state_t;

/* Private State */
static display_handle_state_t s_display_handle;

/* Private Functions */
/** @brief 存储通用驱动操作，不依赖具体驱动头文件。 */
static int32_t display_bind_driver(void *p_context, const impl_display_driver_ops_t *p_ops) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_ops == NULL) || (p_ops->pf_init == NULL) || (p_ops->pf_write_frame == NULL)) return DISPLAY_ERROR; p_handle->driver_ops = *p_ops; return DISPLAY_OK; }
/** @brief 存储由 Port 创建的 OSAL 互斥锁操作。 */
static int32_t display_bind_osal(void *p_context, const impl_display_osal_ops_t *p_ops) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_ops == NULL) || (p_ops->pf_lock == NULL) || (p_ops->pf_unlock == NULL)) return DISPLAY_ERROR; p_handle->osal_ops = *p_ops; return DISPLAY_OK; }
/** @brief 接收由 Port 注入的型号专属几何参数。 */
static int32_t display_configure(void *p_context, const impl_display_geometry_t *p_geometry) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_geometry == NULL) || (p_geometry->framebuffer_length > IMPL_DISPLAY_HANDLE_MAX_FRAMEBUFFER_SIZE)) return DISPLAY_ERROR; p_handle->geometry = *p_geometry; p_handle->configured = 1U; return DISPLAY_OK; }
/** @brief 初始化驱动并清空句柄持有的帧缓冲。 */
static int32_t display_init(void *p_context) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_handle->configured == 0U) || (p_handle->driver_ops.pf_init == NULL)) return DISPLAY_ERROR; if (p_handle->driver_ops.pf_init(p_handle->driver_ops.p_context) != DISPLAY_OK) return DISPLAY_ERROR; memset(p_handle->framebuffer, 0, p_handle->geometry.framebuffer_length); p_handle->dirty = 1U; p_handle->inited = 1U; return DISPLAY_OK; }
/** @brief 在显示实例互斥锁保护下清空帧缓冲。 @warning 不可在 ISR 中调用。 */
static int32_t display_clear(void *p_context) { display_handle_state_t *p_handle = p_context; if ((p_handle == NULL) || (p_handle->inited == 0U)) return DISPLAY_ERROR; if (p_handle->osal_ops.pf_lock(p_handle->osal_ops.p_mutex, IMPL_DISPLAY_LOCK_TIMEOUT_MS) != DISPLAY_OK) return DISPLAY_ERROR; memset(p_handle->framebuffer, 0, p_handle->geometry.framebuffer_length); p_handle->dirty = 1U; return p_handle->osal_ops.pf_unlock(p_handle->osal_ops.p_mutex); }
/** @brief 在显示实例互斥锁保护下设置单个像素。 @warning 不可在 ISR 中调用。 */
static int32_t display_set_pixel(void *p_context, uint16_t x, uint16_t y, bool enabled) { display_handle_state_t *p_handle = p_context; size_t index; uint8_t mask; if ((p_handle == NULL) || (p_handle->inited == 0U) || (x >= p_handle->geometry.width) || (y >= p_handle->geometry.height)) return DISPLAY_ERROR; if (p_handle->osal_ops.pf_lock(p_handle->osal_ops.p_mutex, IMPL_DISPLAY_LOCK_TIMEOUT_MS) != DISPLAY_OK) return DISPLAY_ERROR; index = (size_t)x + ((size_t)(y / 8U) * p_handle->geometry.width); mask = (uint8_t)(1U << (y % 8U)); if (enabled) p_handle->framebuffer[index] |= mask; else p_handle->framebuffer[index] &= (uint8_t)~mask; p_handle->dirty = 1U; return p_handle->osal_ops.pf_unlock(p_handle->osal_ops.p_mutex); }
/** @brief 在持有显示实例互斥锁期间刷新脏帧缓冲。 @warning 不可在 ISR 中调用。 */
static int32_t display_flush(void *p_context) { display_handle_state_t *p_handle = p_context; int32_t status = DISPLAY_OK; if ((p_handle == NULL) || (p_handle->inited == 0U)) return DISPLAY_ERROR; if (p_handle->osal_ops.pf_lock(p_handle->osal_ops.p_mutex, IMPL_DISPLAY_LOCK_TIMEOUT_MS) != DISPLAY_OK) return DISPLAY_ERROR; if (p_handle->dirty != 0U) { status = p_handle->driver_ops.pf_write_frame(p_handle->driver_ops.p_context, p_handle->framebuffer, p_handle->geometry.framebuffer_length); if (status == DISPLAY_OK) p_handle->dirty = 0U; } if (p_handle->osal_ops.pf_unlock(p_handle->osal_ops.p_mutex) != DISPLAY_OK) return DISPLAY_ERROR; return status; }

/* Public Functions */
/** @brief 暴露类级操作；此处不出现任何 SSD1306 符号。 */
int32_t impl_display_handle_inst(impl_display_handle_api_t *p_api) { if (p_api == NULL) return DISPLAY_ERROR; p_api->p_context = &s_display_handle; p_api->pf_bind_driver = display_bind_driver; p_api->pf_bind_osal = display_bind_osal; p_api->pf_configure = display_configure; p_api->pf_init = display_init; p_api->pf_clear = display_clear; p_api->pf_set_pixel = display_set_pixel; p_api->pf_flush = display_flush; return DISPLAY_OK; }
`;
}

function displayWrapperHeader() {
  return `${fileHeader('platform_display_wrapper.h', '平台无关显示封装层。', 'APP 调用稳定的显示 API；封装层通过已注册的上下文优先操作表转发。', ['<stdbool.h>', '<stdint.h>'])}
#ifndef PLATFORM_DISPLAY_WRAPPER_H
#define PLATFORM_DISPLAY_WRAPPER_H

/* Includes */
#include <stdbool.h>
#include <stdint.h>

/* Public Types */
typedef struct { void *p_context; int32_t (*pf_init)(void *p_context); int32_t (*pf_clear)(void *p_context); int32_t (*pf_set_pixel)(void *p_context, uint16_t x, uint16_t y, bool enabled); int32_t (*pf_flush)(void *p_context); } platform_display_wrapper_ops_t;

/* Public Functions */
/** @brief 注册一个生产或 Fake Port 实现。 */
int32_t platform_display_wrapper_register(const platform_display_wrapper_ops_t *p_ops);
/** @brief 初始化显示。 @warning 不可在 ISR 中调用。 */
int32_t platform_display_wrapper_init(void);
/** @brief 清空显示帧缓冲。 @warning 不可在 ISR 中调用。 */
int32_t platform_display_wrapper_clear(void);
/** @brief 更新单个帧缓冲像素。 @warning 不可在 ISR 中调用。 */
int32_t platform_display_wrapper_set_pixel(uint16_t x, uint16_t y, bool enabled);
/** @brief 刷新帧缓冲变更。 @warning 不可在 ISR 中调用。 */
int32_t platform_display_wrapper_flush(void);

#endif
`;
}

function displayWrapperSource() {
  return `${fileHeader('platform_display_wrapper.c', '显示封装层转发实现。', '封装层仅存储抽象公共操作表，绝不引用 Port、Core、Handler 或 Driver。', ['platform_display_wrapper.h'])}
/* Includes */
#include "platform_display_wrapper.h"

/* Private Defines */
#define DISPLAY_WRAPPER_ERROR (-1)

/* Private Types */

/* Private State */
static platform_display_wrapper_ops_t s_display_ops;
static uint8_t s_display_registered;

/* Private Functions */

/* Public Functions */
/** @brief 注册唯一的显示公共操作表。 */
int32_t platform_display_wrapper_register(const platform_display_wrapper_ops_t *p_ops) { if ((p_ops == NULL) || (p_ops->pf_init == NULL) || (p_ops->pf_clear == NULL) || (p_ops->pf_set_pixel == NULL) || (p_ops->pf_flush == NULL) || (s_display_registered != 0U)) return DISPLAY_WRAPPER_ERROR; s_display_ops = *p_ops; s_display_registered = 1U; return 0; }
/** @brief 通过已注册操作表转发显示初始化。 */
int32_t platform_display_wrapper_init(void) { return (s_display_registered == 0U) ? DISPLAY_WRAPPER_ERROR : s_display_ops.pf_init(s_display_ops.p_context); }
/** @brief 通过已注册操作表转发帧缓冲清空。 */
int32_t platform_display_wrapper_clear(void) { return (s_display_registered == 0U) ? DISPLAY_WRAPPER_ERROR : s_display_ops.pf_clear(s_display_ops.p_context); }
/** @brief 通过已注册操作表转发像素更新。 */
int32_t platform_display_wrapper_set_pixel(uint16_t x, uint16_t y, bool enabled) { return (s_display_registered == 0U) ? DISPLAY_WRAPPER_ERROR : s_display_ops.pf_set_pixel(s_display_ops.p_context, x, y, enabled); }
/** @brief 通过已注册操作表转发帧缓冲刷新。 */
int32_t platform_display_wrapper_flush(void) { return (s_display_registered == 0U) ? DISPLAY_WRAPPER_ERROR : s_display_ops.pf_flush(s_display_ops.p_context); }
`;
}

function displayPortHeader() {
  return `${fileHeader('impl_display_port.h', '显示 BSP Port 注册 API。', 'Port 创建 OSAL 资源、注入 Core 与驱动操作，然后注册 Wrapper 公共操作。', ['<stdint.h>'])}
#ifndef IMPL_DISPLAY_PORT_H
#define IMPL_DISPLAY_PORT_H

/* Includes */
#include <stdint.h>

/* Public Functions */
/**
 * @brief 构造并注册 SSD1306 显示组合根。
 * @return 所有依赖组装并注册完成时返回零。
 * @warning 创建 OSAL 互斥锁并执行阻塞初始化；不可在 ISR 中调用。
 */
int32_t impl_display_port_register(void);

#endif
`;
}

function displayPortSource() {
  return `${fileHeader('impl_display_port.c', 'SSD1306 显示组合根。', 'Port 创建 OSAL 互斥锁，向句柄注入 Core 总线与驱动 API，并注册 Wrapper 操作。', ['osal.h', 'impl_ssd1306_driver.h', 'impl_display_handle.h', 'platform_display_wrapper.h'])}
/* Includes */
#include "impl_display_port.h"
#include "osal.h"
#include "impl_ssd1306_config.h"
#include "impl_ssd1306_driver.h"
#include "impl_display_handle.h"
#include "platform_display_wrapper.h"

/* Private Defines */
#define DISPLAY_PORT_ERROR (-1)

/* Private Types */

/* Private State */
static osal_mutex_handle_t s_display_mutex;
static uint8_t s_display_mutex_created;

/* Private Functions */

/* Public Functions */
/**
 * @brief 创建 OSAL 资源，注入全部操作，并注册 Wrapper API。
 * @return 注册成功返回零；失败时释放本调用创建的互斥锁后返回负值。
 * @warning 阻塞式 OSAL 操作；不可在 ISR 中调用。
 */
int32_t impl_display_port_register(void) {
    impl_ssd1306_driver_api_t driver_api;
    impl_display_handle_api_t handle_api;
    impl_ssd1306_bus_ops_t bus_ops;
    impl_display_driver_ops_t driver_ops;
    impl_display_osal_ops_t osal_ops;
    impl_display_geometry_t geometry;
    platform_display_wrapper_ops_t wrapper_ops;
    if (osal_mutex_create(&s_display_mutex) != OSAL_OK) return DISPLAY_PORT_ERROR;
    s_display_mutex_created = 1U;
    if ((impl_ssd1306_driver_inst(&driver_api) != 0) || (impl_display_handle_inst(&handle_api) != 0)) goto cleanup_mutex;
    bus_ops.p_context = NULL;
    bus_ops.pf_write = platform_i2c_write_transaction;
    if (driver_api.pf_bind_bus(driver_api.p_context, &bus_ops) != 0) goto cleanup_mutex;
    osal_ops.p_mutex = s_display_mutex;
    osal_ops.pf_lock = osal_mutex_lock;
    osal_ops.pf_unlock = osal_mutex_unlock;
    driver_ops.p_context = driver_api.p_context;
    driver_ops.pf_init = driver_api.pf_init;
    driver_ops.pf_write_frame = driver_api.pf_write_frame;
    geometry.width = IMPL_SSD1306_WIDTH;
    geometry.height = IMPL_SSD1306_HEIGHT;
    geometry.framebuffer_length = IMPL_SSD1306_FRAMEBUFFER_SIZE;
    if ((handle_api.pf_bind_osal(handle_api.p_context, &osal_ops) != 0) ||
        (handle_api.pf_bind_driver(handle_api.p_context, &driver_ops) != 0) ||
        (handle_api.pf_configure(handle_api.p_context, &geometry) != 0)) goto cleanup_mutex;
    wrapper_ops.p_context = handle_api.p_context;
    wrapper_ops.pf_init = handle_api.pf_init;
    wrapper_ops.pf_clear = handle_api.pf_clear;
    wrapper_ops.pf_set_pixel = handle_api.pf_set_pixel;
    wrapper_ops.pf_flush = handle_api.pf_flush;
    if (platform_display_wrapper_register(&wrapper_ops) != 0) goto cleanup_mutex;
    return 0;
cleanup_mutex:
    if (s_display_mutex_created != 0U) { (void)osal_mutex_destroy(s_display_mutex); s_display_mutex_created = 0U; }
    return DISPLAY_PORT_ERROR;
}
`;
}

function generateSsd1306Display() {
  return generateModelFirstBsp({
    deviceType: 'display',
    device: { directory: 'SSD1306', stem: 'ssd1306' },
    cores: ['i2c']
  });
}

async function generateBspDriver({ deviceType, device: deviceValue, cores, platform, allowCustomDevice = false }) {
  getPlatformConfig(platform);
  const type = normalizeDeviceType(deviceType);
  const device = normalizeDevice(deviceValue);
  const normalizedCores = normalizeCoreList(cores);
  validateDeviceProfile({ deviceType: type, device, cores: normalizedCores, allowCustomDevice });
  const profile = DEVICE_PROFILES[device.stem];
  if (profile && profile.template === 'ssd1306-display') {
    return generateSsd1306Display();
  }
  return generateModelFirstBsp({ deviceType: type, device, cores: normalizedCores });
}

async function writeGeneratedFiles(files, outputDir, { force = false } = {}) {
  const written = [];
  const root = path.resolve(outputDir);
  const targets = files.map((file) => ({ ...file, target: path.resolve(root, file.path) }));
  for (const file of targets) {
    if (!file.target.startsWith(`${root}${path.sep}`)) throw createError(`Generated path escapes output directory: ${file.path}`, 'INTERNAL');
    try {
      await fs.access(file.target);
      if (!force) throw createError(`Refusing to overwrite existing file: ${file.target}. Use --force after review.`, 'COLLISION');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  for (const file of targets) {
    await fs.mkdir(path.dirname(file.target), { recursive: true });
    await fs.writeFile(file.target, file.content, 'utf8');
    written.push(file.target);
  }
  return written;
}

module.exports = {
  CORE_PERIPHERALS,
  DEVICE_PROFILES,
  createError,
  generateSsd1306Display,
  generateBspDriver,
  generateCorePeripheral,
  normalizeCoreList,
  normalizeCorePeripheral,
  normalizeDevice,
  normalizeDeviceType,
  validateDeviceProfile,
  formatExistingCode,
  writeGeneratedFiles
};
