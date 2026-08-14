#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  generateBspDriver,
  generateCorePeripheral,
  normalizeCorePeripheral,
  normalizeDevice,
  normalizeDeviceType
} = require('../lib/generator');

const STANDARD_HEADERS = new Set(['stdbool.h', 'stddef.h', 'stdint.h', 'inttypes.h', 'limits.h']);

// Platform Common 是共享基础层：其类型/错误码/宏出口是 wrapper 按 skill 规范
// （platform_common/SKILL.md 输出契约）必须 include 的依赖，不属于越层泄漏。
// 仍禁止 wrapper include platform_mcu/platform_bsp/impl_*/vendor/HAL/RTOS 头。
const PLATFORM_COMMON_HEADERS = new Set(['platform_type.h', 'platform_error.h', 'platform_def.h']);

function maskCommentsAndStrings(content) {
  let result = '';
  let index = 0;
  let state = 'code';
  while (index < content.length) {
    const current = content[index];
    const next = content[index + 1];
    if (state === 'code' && current === '/' && next === '*') {
      result += '  ';
      index += 2;
      state = 'block';
    } else if (state === 'code' && current === '/' && next === '/') {
      result += '  ';
      index += 2;
      state = 'line';
    } else if (state === 'code' && (current === '"' || current === "'")) {
      result += ' ';
      index += 1;
      state = current === '"' ? 'string' : 'char';
    } else if (state === 'block' && current === '*' && next === '/') {
      result += '  ';
      index += 2;
      state = 'code';
    } else if ((state === 'string' || state === 'char') && current === '\\') {
      result += '  ';
      index += 2;
    } else if ((state === 'string' && current === '"') || (state === 'char' && current === "'")) {
      result += ' ';
      index += 1;
      state = 'code';
    } else {
      result += (state === 'code' || current === '\n' || current === '\r') ? current : ' ';
      if (state === 'line' && current === '\n') state = 'code';
      index += 1;
    }
  }
  return result;
}

function directIncludes(content) {
  return [...content.matchAll(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map((match) => match[1]);
}

function findFunctionDefinitions(content) {
  const code = maskCommentsAndStrings(content);
  const definitions = [];
  const expression = /(^|\n)\s*((?:static\s+)?[A-Za-z_][\w\s*]*?)\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g;
  for (const match of code.matchAll(expression)) {
    const prefix = match[2];
    const start = (match.index || 0) + match[0].lastIndexOf(match[3]);
    let cursor = code.indexOf('{', start);
    let depth = 0;
    for (; cursor < code.length; cursor += 1) {
      if (code[cursor] === '{') depth += 1;
      else if (code[cursor] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    definitions.push({
      name: match[3],
      isStatic: /\bstatic\b/.test(prefix),
      body: code.slice(code.indexOf('{', start) + 1, cursor)
    });
  }
  return definitions;
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

function parameterName(parameter) {
  const match = parameter.replace(/\s*=.*$/, '').trim().match(/([A-Za-z_]\w*)(?:\s*\[[^\]]*\])?$/);
  return match ? match[1] : null;
}

function findFunctionComments(content, start) {
  const prefix = content.slice(0, start);
  const commentEnd = prefix.lastIndexOf('*/');
  if (commentEnd < 0) return '';
  const afterComment = prefix.slice(commentEnd + 2);
  if (/[^\s]/.test(afterComment)) return '';
  const commentStart = prefix.lastIndexOf('/**', commentEnd);
  return commentStart >= 0 ? prefix.slice(commentStart, commentEnd + 2) : '';
}

function findFunctionContracts(content) {
  const code = maskCommentsAndStrings(content);
  const lines = code.split('\n');
  const offsets = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }
  const contracts = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const openParen = line.indexOf('(');
    if (openParen < 0) continue;
    const prefix = line.slice(0, openParen);
    if (/^[ \t]*typedef\b/.test(line) || /\(\s*\*/.test(line)) continue;
    const nameMatch = prefix.match(/([A-Za-z_]\w*)[ \t]*$/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const returnType = prefix.slice(0, nameMatch.index).trim();
    if (/^\s*#/.test(line)
      || !returnType || /\breturn\b|->|\.|[|&!+\-/=%<>]/.test(returnType)) continue;
    let signature = line;
    let endLine = lineIndex;
    while (endLine + 1 < lines.length && endLine - lineIndex < 20
      && !/\)\s*[;{]\s*$/.test(signature)) {
      endLine += 1;
      signature += `\n${lines[endLine]}`;
    }
    const terminatorMatch = signature.match(/\)\s*([;{])\s*$/);
    if (!terminatorMatch) continue;
    if (['if', 'for', 'while', 'switch', 'return', 'void'].includes(name)
      || /\breturn\s+[A-Za-z_]\w*\s*\(/.test(line)
      || /\(\s*\*\s*\w+\s*\)/.test(line)) continue;
    const lineStart = offsets[lineIndex] + line.search(/\S/);
    const nameStart = offsets[lineIndex] + prefix.lastIndexOf(name);
    const terminator = terminatorMatch[1];
    const openBrace = terminator === '{'
      ? offsets[endLine] + lines[endLine].lastIndexOf('{')
      : -1;
    let body = '';
    if (openBrace >= 0) {
      let depth = 0;
      let cursor = openBrace;
      for (; cursor < code.length; cursor += 1) {
        if (code[cursor] === '{') depth += 1;
        else if (code[cursor] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      body = content.slice(openBrace + 1, cursor);
    }
    const closeParen = signature.lastIndexOf(')');
    contracts.push({
      name,
      start: lineStart,
      returnType: code.slice(lineStart, nameStart).trim(),
      parameters: signature.slice(openParen + 1, closeParen),
      body,
      comment: findFunctionComments(content, lineStart),
      isDefinition: terminator === '{'
    });
    lineIndex = endLine;
  }
  return contracts;
}

function validateCommentCompleteness(files, errors) {
  for (const file of Object.values(files)) {
    if (!file.content.includes('@version')) continue;
    for (const tag of ['Copyright', 'All Rights Reserved.', '@file', '@brief', '@author', '@version']) {
      if (!file.content.includes(tag)) {
        addError(errors, 'LAYER_FILE_DOC', file.relative,
          `Generated file header must contain ${tag}.`);
      }
    }
    if (!/@par\s+(?:依赖关系|dependencies)/.test(file.content)) {
      addError(errors, 'LAYER_FILE_DOC', file.relative,
        'Generated file header must contain @par 依赖关系.');
    }
    if (!/处理流程：|Processing flow:/.test(file.content)) {
      addError(errors, 'LAYER_FILE_DOC', file.relative,
        'Generated file header must contain a processing flow section.');
    }
    const contracts = findFunctionContracts(file.content);
    for (const contract of contracts) {
      if (!contract.comment || !/@brief\b/.test(contract.comment)) {
        addError(errors, 'LAYER_FUNCTION_DOC', file.relative,
          `Function ${contract.name} must have a Doxygen @brief comment.`);
        continue;
      }
      for (const parameter of splitFunctionParameters(contract.parameters)) {
        const name = parameterName(parameter);
        if (!name) continue;
        if (!new RegExp(`@param\\s+[^\\n]*\\b${name}\\b`).test(contract.comment)) {
          addError(errors, 'LAYER_FUNCTION_PARAM_DOC', file.relative,
            `Function ${contract.name} must document parameter ${name} with @param.`);
        }
      }
      if (!/\bvoid\b/.test(contract.returnType) || /\*/.test(contract.returnType)) {
        if (!/@retval\b/.test(contract.comment)) {
          addError(errors, 'LAYER_FUNCTION_RETVAL_DOC', file.relative,
            `Function ${contract.name} must document its return value with @retval.`);
        }
      }
      const source = `${contract.name} ${contract.parameters} ${contract.body}`;
      if (/from_isr|\b(?:irq|isr)\b/i.test(source) && !/@warning\b/.test(contract.comment)) {
        addError(errors, 'LAYER_FUNCTION_WARNING_DOC', file.relative,
          `Function ${contract.name} must document its ISR restriction with @warning.`);
      }
      if (/timeout|transfer|flush|\block\b|\bunlock\b/i.test(source) && !/@note\b/.test(contract.comment)) {
        addError(errors, 'LAYER_FUNCTION_NOTE_DOC', file.relative,
          `Function ${contract.name} must document blocking or timeout behavior with @note.`);
      }
      if (/dma/i.test(source) && !/@warning\b/.test(contract.comment)) {
        addError(errors, 'LAYER_FUNCTION_WARNING_DOC', file.relative,
          `Function ${contract.name} must document DMA prerequisites with @warning.`);
      }
    }
    if (file.relative.endsWith('.c') && !/\/\*[\s\S]*-{3,}/.test(file.content)) {
      addError(errors, 'LAYER_SOURCE_STEP_DOC', file.relative,
        'Generated source must contain at least one dashed step comment for key logic.');
    }
    if (file.relative.endsWith('.c') && /入口检查与核心处理/.test(file.content)) {
      addError(errors, 'LAYER_SOURCE_STEP_DOC', file.relative,
        'Generated source must use a semantic step comment instead of the generic placeholder.');
    }
    const typePattern = /typedef\s+(?:enum|struct)\s*\{/g;
    for (const match of file.content.matchAll(typePattern)) {
      const preceding = file.content.slice(0, match.index);
      const comment = preceding.match(/\/\*[\s\S]*?\*\/\s*$/);
      if (!comment || !/@brief\b/.test(comment[0])) {
        addError(errors, 'LAYER_TYPE_DOC', file.relative, 'Enum or struct typedef must have a Doxygen @brief comment.');
      }
    }
    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!/^\s*#define\s+[A-Z][A-Z0-9_]*\b/.test(line) || /_H\b/.test(line)) return;
      const previous = lines[index - 1] || '';
      const sectionPattern = /(?:Includes|Public|Private|Functions|Types|Defines|State|Composition|包含文件|公开类型|公开宏定义|公开函数|私有宏定义|私有类型|私有状态|私有组合对象|私有函数)/;
      const isSectionComment = /^\s*\/\*\s*.*(?: -+)?\s*\*\/$/.test(previous)
        && sectionPattern.test(previous);
      const subsectionPattern = /(?:返回值|超时值|事件|配置|默认值)\s+-+\s*\*\/$/;
      const isSubsectionComment = /^\s*\/\*\s*/.test(previous)
        && subsectionPattern.test(previous);
      if (!/^\s*\/\*/.test(previous) || isSectionComment || isSubsectionComment) {
        addError(errors, 'LAYER_MACRO_DOC', file.relative,
          `Macro on line ${index + 1} must have a preceding block comment.`);
      }
    });
  }
}

function createLayerError(message) {
  const error = new Error(message);
  error.code = 'LAYER';
  return error;
}

function expectedPaths({ core, deviceType, device }) {
  const type = normalizeDeviceType(deviceType);
  const normalizedDevice = normalizeDevice(device);
  const driverRoot = `04_Impl/impl_bsp/${type}/${normalizedDevice.directory}`;
  const handleRoot = `04_Impl/impl_bsp_handler/${type}`;
  const portRoot = `04_Impl/impl_board/${type}`;
  const wrapperRoot = `03_Platform/platform_bsp/${type}`;
  return {
    coreHeader: `03_Platform/platform_mcu/Inc/platform_${core}.h`,
    coreSource: `03_Platform/platform_mcu/Src/platform_${core}.c`,
    driverConfig: `${driverRoot}/Inc/impl_${normalizedDevice.stem}_config.h`,
    driverHeader: `${driverRoot}/Inc/impl_${normalizedDevice.stem}_driver.h`,
    driverSource: `${driverRoot}/Src/impl_${normalizedDevice.stem}_driver.c`,
    handleHeader: `${handleRoot}/Inc/impl_${type}_handle.h`,
    handleSource: `${handleRoot}/Src/impl_${type}_handle.c`,
    portHeader: `${portRoot}/Inc/impl_${type}_port.h`,
    portSource: `${portRoot}/Src/impl_${type}_port.c`,
    wrapperHeader: `${wrapperRoot}/Inc/platform_${type}_wrapper.h`,
    wrapperSource: `${wrapperRoot}/Src/platform_${type}_wrapper.c`
  };
}

const SLICE_ROLES = {
  wrapper: ['wrapperHeader', 'wrapperSource'],
  driver: ['driverConfig', 'driverHeader', 'driverSource'],
  handle: ['handleHeader', 'handleSource'],
  port: ['portHeader', 'portSource'],
  all: null
};

function filterSlice(paths, slice) {
  if (!slice || slice === 'all') return paths;
  const roles = SLICE_ROLES[slice];
  if (!roles) throw createLayerError(`Unknown slice: ${slice}. Expected wrapper, driver, handle, port, or all.`);
  return Object.fromEntries(Object.entries(paths).filter(([role]) => roles.includes(role)));
}

function readSlice(root, paths, errors) {
  const files = {};
  for (const [role, relative] of Object.entries(paths)) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) {
      errors.push({ ruleId: 'LAYER_REQUIRED_FILE', file: relative, message: 'Required generated file is missing.' });
    } else {
      files[role] = { relative, content: fs.readFileSync(absolute, 'utf8') };
    }
  }
  return files;
}

function addError(errors, ruleId, file, message) {
  errors.push({ ruleId, file, message });
}

function extractCommentText(content) {
  const blocks = [];
  const pattern = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;
  let match;
  while ((match = pattern.exec(content))) blocks.push(match[0]);
  return blocks.join('\n');
}

function validateCommentLanguage(files, errors, { rulePrefix = 'LAYER', skipRoles = ['coreHeader', 'coreSource'] } = {}) {
  for (const [role, file] of Object.entries(files)) {
    if (skipRoles.includes(role)) continue;
    const englishOnly = [...file.content.matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g)].some((match) => {
      const text = match[0].replace(/\/\*|\*\/|\/\//g, ' ').replace(/\s+/g, ' ').trim();
      if (/^(?:Includes|Public|Private|Functions|Types|Defines|State|Composition|Composition Root|Functions|Defines)\b/.test(text)) return false;
      if (/^[A-Z0-9_]+_H$/.test(text)) return false;
      return /[A-Za-z]{2,}/.test(text) && !/[\u4e00-\u9fff]/.test(text);
    });
    if (englishOnly) {
      addError(errors, `${rulePrefix}_COMMENT_LANGUAGE`, file.relative,
        'Generated comments must be written in Chinese by default (style-profile rule 8). Use English only when the project explicitly requires it.');
    }
  }
}

function validateSections(files, errors) {
  for (const file of Object.values(files)) {
    if (!file.content.includes('@file')) addError(errors, 'LAYER_FILE_DOC', file.relative, 'Generated file must have an @file documentation header.');
    if (file.relative.endsWith('.c')) {
      for (const section of [
        ['Includes', '包含文件'],
        ['Public Functions', '公开函数']
      ]) {
        const sectionPattern = new RegExp(`/\\* (?:${section[0]}|${section[1]})(?: -+)? \\*/`);
        if (!sectionPattern.test(file.content)) {
          addError(errors, 'LAYER_SOURCE_SECTION', file.relative,
            `Generated source must contain ${section[1]} section.`);
        }
      }
    }
  }
}

const ALIGNMENT_KEYWORDS = new Set([
  'case', 'do', 'else', 'for', 'goto', 'if', 'return', 'switch', 'while'
]);

function parseDeclarationAlignment(line) {
  const code = line.replace(/\s*\/\*.*\*\/\s*$/, '');
  const trimmed = code.trim();
  if (!trimmed.endsWith(';') || /[(),{}]/.test(trimmed)) return null;
  const firstToken = trimmed.match(/^([A-Za-z_]\w*)/)?.[1];
  if (!firstToken || ALIGNMENT_KEYWORDS.has(firstToken)) return null;
  const match = code.match(/([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*(=|);\s*$/);
  if (!match || !/\s|\*/.test(code.slice(0, match.index))
    || /->|\./.test(code.slice(0, match.index))) return null;
  const assignment = match[2] === '=' ? code.indexOf('=', match.index) : -1;
  return {
    nameColumn: match.index,
    operatorColumn: assignment >= 0 ? assignment : null
  };
}

function parseAssignmentAlignment(line) {
  if (/^\s*(?:#|(?:if|for|while|switch)\s*\()/.test(line)) return null;
  const match = line.match(
    /^(\s*)([^;{}()]+?)(\+=|-=|\*=|\/=|%=|<<=|>>=|&=|\^=|\|=|=(?!=))\s*[^;]*;\s*(?:\/\*.*\*\/)?$/
  );
  if (!match) return null;
  return { operatorColumn: line.indexOf(match[3]) };
}

function parseEnumAlignment(line) {
  const match = line.match(
    /^\s*[A-Z][A-Z0-9_]*\s*=\s*[^,]+,?\s*(?:\/\*\*<.*\*\/)?\s*$/
  );
  return match ? { operatorColumn: line.indexOf('=') } : null;
}

function validateAlignmentGroups(lines, file, errors, parser, ruleId, field, description) {
  let group = [];

  const flush = () => {
    if (group.length < 2) {
      group = [];
      return;
    }
    const columns = new Set(group.map((item) => item[field]));
    const target = Math.max(...group.map((item) => item[field]));
    if (group.some((item) => target + lines[item.index].length - item[field] > 80)) {
      group = [];
      return;
    }
    if (columns.size > 1) {
      addError(errors, ruleId, file.relative,
        `${description} must align within one consecutive code group (line ${group[0].index + 1}).`);
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
}

function validateGeneratedStyle(files, errors) {
  const datePattern = new RegExp(`@version\\s+V1\\.0\\s+${new Date().toISOString().slice(0, 10)}`);
  const functionDefinition = /^\s*(?:static\s+)?[A-Za-z_][\w\s*]*\s+[A-Za-z_]\w*\s*\([^;{}]*\)\s*\{/;
  const primaryLabels = Object.values({
    includes: '包含文件',
    publicTypes: '公开类型',
    publicDefines: '公开宏定义',
    publicFunctions: '公开函数',
    privateDefines: '私有宏定义',
    privateTypes: '私有类型',
    privateState: '私有状态',
    privateComposition: '私有组合对象',
    privateFunctions: '私有函数'
  });
  const secondaryLabels = ['返回值', '超时值', '事件', '配置', '默认值', '初始化', '读写', '回调', '辅助', '接口'];
  const tertiaryLabels = ['清理', '事件', '回调', '转发', '校验', '状态', '处理'];
  const validatePartitionWidth = (line, labels, width, ruleId, currentFile) => {
    const start = line.indexOf('/*');
    if (start < 0) return;
    const comment = line.slice(start);
    for (const label of labels) {
      const isMatch = new RegExp(`^/\\* ${label} -+ \\*/$`).test(comment);
      const isShortOverlappingLabel = ['事件', '回调'].includes(label)
        && width === 40 && comment.length <= 25;
      const isLongOverlappingLabel = ['事件', '回调'].includes(label)
        && width === 20 && comment.length >= 30;
      if (isMatch && !isShortOverlappingLabel && !isLongOverlappingLabel
        && comment.length !== width) {
        addError(errors, ruleId, currentFile.relative,
          `${label} partition must be ${width} columns from /*.`);
      }
    }
  };
  for (const file of Object.values(files)) {
    const lines = file.content.split(/\r?\n/);
    const isGeneratedFile = file.content.includes('@version');
    if (!isGeneratedFile) continue;
    validateAlignmentGroups(
      lines, file, errors, parseDeclarationAlignment,
      'LAYER_FORMAT_DECLARATION_ALIGNMENT', 'nameColumn', 'Declaration names'
    );
    validateAlignmentGroups(
      lines, file, errors, parseDeclarationAlignment,
      'LAYER_FORMAT_DECLARATION_ASSIGNMENT', 'operatorColumn', 'Declaration initializers'
    );
    validateAlignmentGroups(
      lines, file, errors, parseAssignmentAlignment,
      'LAYER_FORMAT_ASSIGNMENT_ALIGNMENT', 'operatorColumn', 'Assignment operators'
    );
    validateAlignmentGroups(
      lines, file, errors, parseEnumAlignment,
      'LAYER_FORMAT_ENUM_ALIGNMENT', 'operatorColumn', 'Enum initializers'
    );
    if (file.content.includes('@version') && !datePattern.test(file.content)) {
      addError(errors, 'LAYER_FILE_DATE', file.relative,
        'Generated file header must contain the current date in @version.');
    }
    lines.forEach((line, index) => {
      if (line.includes('\t')) {
        addError(errors, 'LAYER_FORMAT_TAB', file.relative,
          `Generated source must not contain TAB characters (line ${index + 1}).`);
      }
      if (line.length > 80) {
        addError(errors, 'LAYER_FORMAT_WIDTH', file.relative,
          `Generated source must not exceed 80 columns (line ${index + 1}).`);
      }
      if (/typedef\s+(?:struct|enum)\s*\{/.test(line)) {
        addError(errors, 'LAYER_FORMAT_TYPE_BRACE', file.relative,
          `Type definition brace must be on its own line (line ${index + 1}).`);
      }
      if (functionDefinition.test(line)) {
        addError(errors, 'LAYER_FORMAT_FUNCTION_BRACE', file.relative,
          `Function brace must be on its own line (line ${index + 1}).`);
      }
      if (/\/\*\*<.*\*\//.test(line) && line.lastIndexOf('*/') !== 78) {
        addError(errors, 'LAYER_FORMAT_TAIL_COMMENT', file.relative,
          `Trailing comment terminator must be aligned to column 80 (line ${index + 1}).`);
      }
      validatePartitionWidth(line, primaryLabels, 80, 'LAYER_FORMAT_PRIMARY_PARTITION', file);
      validatePartitionWidth(line, secondaryLabels, 40, 'LAYER_FORMAT_SECONDARY_PARTITION', file);
      validatePartitionWidth(line, tertiaryLabels, 20, 'LAYER_FORMAT_TERTIARY_PARTITION', file);
    });
  }
}

function validateCore(files, errors) {
  if (!files.coreHeader) return;
  const forbidden = /#\s*include\s*[<"][^>"]*(?:stm32\w*_hal|stm32|FreeRTOS|cmsis_os|task|queue|semphr)[^>"]*[>"]|\b(?:I2C|SPI|UART|GPIO|DMA|TIM|ADC|RTC)_\w*TypeDef\b/i;
  if (forbidden.test(files.coreHeader.content)) {
    addError(errors, 'LAYER_CORE_PUBLIC_LEAK', files.coreHeader.relative, 'Core public header must not expose HAL, RTOS, or vendor types.');
  }
}

function validateWrapper(files, errors) {
  for (const role of ['wrapperHeader', 'wrapperSource']) {
    const file = files[role];
    if (!file) continue;
    for (const include of directIncludes(file.content)) {
      const includeName = path.basename(include);
      const ownHeader = role === 'wrapperSource' && includeName === path.basename(files.wrapperHeader.relative);
      if (!ownHeader && !STANDARD_HEADERS.has(includeName) && !PLATFORM_COMMON_HEADERS.has(includeName)) {
        addError(errors, 'LAYER_WRAPPER_DEPENDENCY', file.relative, `Wrapper include is not allowed: ${include}.`);
      }
    }
  }
}

function validateFourTuple(files, errors) {
  const wrapper = files.wrapperHeader;
  if (!wrapper) return;
  const code = maskCommentsAndStrings(wrapper.content);
  const definesDeviceObject = /\bplatform_device_t\b|\bplatform_service_t\b/.test(code);
  if (definesDeviceObject) {
    for (const slot of ['cfg', 'ctx', 'data', 'ops']) {
      if (!new RegExp(`\\b${slot}\\s*;`).test(code)) {
        addError(errors, 'LAYER_WRAPPER_FOUR_TUPLE', wrapper.relative,
          `Device object struct must declare the ${slot} slot (four-tuple: base + cfg/ctx/data/ops).`);
      }
    }
  }
}

function validateHalDriver(files, errors) {
  for (const role of ['driverHeader', 'driverSource']) {
    const file = files[role];
    if (!file) continue;
    const code = maskCommentsAndStrings(file.content);
    if (/\bHAL_[A-Za-z0-9_]+\s*\(|#\s*include\s*[<"][^>"]*(?:stm32|hal|freertos|rtthread|cmsis_os)[^>"]*[>"]/i.test(code)) {
      addError(errors, 'LAYER_HAL_DRIVER_CONCRETE_DEPENDENCY', file.relative, 'HAL Driver must use injected Core and MCU Ops rather than HAL or RTOS dependencies.');
    }
  }
  if (files.driverHeader && !/(?:^|_)register_core_ops\s*\(/m.test(files.driverHeader.content)) {
    addError(errors, 'LAYER_HAL_DRIVER_CORE_OPS', files.driverHeader.relative, 'HAL Driver must expose Core Ops injection.');
  }
  if (files.driverHeader && !/(?:^|_)register_mcu_ops\s*\(/m.test(files.driverHeader.content)) {
    addError(errors, 'LAYER_HAL_DRIVER_MCU_OPS', files.driverHeader.relative, 'HAL Driver must expose MCU Ops injection.');
  }
  if (files.driverSource && !/driver->core_ops\.pf_transaction\s*\(\s*driver->core_ops\.context\s*\)/.test(files.driverSource.content)) {
    addError(errors, 'LAYER_HAL_DRIVER_EFFECTIVE_CORE_OPS', files.driverSource.relative, 'HAL Driver must invoke injected Core Ops in its protocol path.');
  }
  if (files.driverSource && !/driver->mcu_ops\.pf_chip_feature\s*\(\s*driver->mcu_ops\.context\s*\)/.test(files.driverSource.content)) {
    addError(errors, 'LAYER_HAL_DRIVER_EFFECTIVE_MCU_OPS', files.driverSource.relative, 'HAL Driver must invoke injected MCU Ops in its chip-specific protocol path.');
  }
}

function validateHandler(files, errors) {
  for (const role of ['handleHeader', 'handleSource']) {
    const file = files[role];
    if (!file) continue;
    const code = maskCommentsAndStrings(file.content);
    if (/#\s*include\s*[<"][^>"]*(?:drv_adapter_(?:port|wrapper)|core_|mcu_|stm32|hal|freertos|rtthread|osal_internal)[^>"]*[>"]/i.test(code)) {
      addError(errors, 'LAYER_HANDLER_CONCRETE_DEPENDENCY', file.relative, 'Handler must use injected OS Wrapper and HAL Driver Ops only.');
    }
  }
  if (files.handleHeader && !/(?:^|_)register_osal_ops\s*\(/m.test(files.handleHeader.content)) {
    addError(errors, 'LAYER_HANDLER_OS_WRAPPER_OPS', files.handleHeader.relative, 'Handler must expose OS Wrapper Ops injection.');
  }
  if (files.handleSource && !/handle->osal_ops\.pf_notify_from_isr\s*\(\s*handle->osal_ops\.context\s*\)/.test(files.handleSource.content)) {
    addError(errors, 'LAYER_HANDLER_EFFECTIVE_OS_WRAPPER_OPS', files.handleSource.relative, 'Handler must invoke injected OS Wrapper Ops in its public processing path.');
  }
  if (files.handleSource && !/handle->driver_ops\.pf_read_id\s*\(\s*handle->driver_ops\.context\s*,\s*device_id\s*\)/.test(files.handleSource.content)) {
    addError(errors, 'LAYER_HANDLER_EFFECTIVE_HAL_DRIVER_OPS', files.handleSource.relative, 'Handler must invoke injected HAL Driver Ops in its public processing path.');
  }
}

function validatePort(files, type, errors) {
  if (!files.portSource) return;
  const expected = `impl_${type}_port_register`;
  const definitions = findFunctionDefinitions(files.portSource.content);
  const publicDefinitions = definitions.filter((definition) => !definition.isStatic);
  if (publicDefinitions.length !== 1 || publicDefinitions[0].name !== expected) {
    addError(errors, 'LAYER_PORT_PUBLIC_API', files.portSource.relative, `Port must define exactly one non-static function: ${expected}.`);
  }
  const coreOpsBindings = new Set(
    [...files.portSource.content.matchAll(/\bcore_ops\.[A-Za-z_]\w*\s*=\s*([A-Za-z_]\w*)\s*;/g)].map((match) => match[1])
  );
  for (const definition of definitions.filter((entry) => entry.isStatic)) {
    const callsDriverDirectly = /\bimpl_[a-z0-9_]+_driver\b/i.test(definition.body);
    const callsCoreDirectly = /\bplatform_[a-z0-9_]+\b/i.test(definition.body);
    if (callsDriverDirectly || (callsCoreDirectly && !coreOpsBindings.has(definition.name))) {
      addError(errors, 'LAYER_PORT_RUNTIME_BYPASS', files.portSource.relative, `Port runtime function ${definition.name} must call Handle APIs only.`);
    }
    if (/port_(?:core|mcu|osal)/i.test(definition.name)
      && /\breturn\s+(?:\(\s*[A-Za-z_]\w*\s*\)\s*)*0(?:[uUlL]+)?\s*;/.test(definition.body)) {
      addError(errors, 'LAYER_PORT_STUB_OPS', files.portSource.relative, `Port operation ${definition.name} must bind a real platform operation instead of returning success.`);
    }
  }
  if (/\bHAL_[A-Za-z0-9_]+\s*\(/.test(maskCommentsAndStrings(files.portSource.content))) {
    addError(errors, 'LAYER_PORT_HAL', files.portSource.relative, 'Generated Port must not directly call HAL APIs.');
  }
  const requiredInjections = [
    ['LAYER_PORT_CORE_OPS_INJECTION', /driver_register_core_ops\s*\(/, 'Port must inject Core Ops into the HAL Driver.'],
    ['LAYER_PORT_MCU_OPS_INJECTION', /driver_register_mcu_ops\s*\(/, 'Port must inject MCU Ops into the HAL Driver.'],
    ['LAYER_PORT_OS_WRAPPER_OPS_INJECTION', /handle_register_osal_ops\s*\(/, 'Port must inject OS Wrapper Ops into the Handler.'],
    ['LAYER_PORT_HAL_DRIVER_OPS_INJECTION', /handle_register_driver\s*\(/, 'Port must inject HAL Driver Ops into the Handler.'],
    ['LAYER_PORT_WRAPPER_REGISTRATION', /platform_[a-z0-9_]+_wrapper_register\s*\(/i, 'Port must register BSP public Ops with the Wrapper.']
  ];
  for (const [ruleId, pattern, message] of requiredInjections) {
    if (!pattern.test(files.portSource.content)) addError(errors, ruleId, files.portSource.relative, message);
  }
}

function validateHandle(files, type, errors) {
  if (!files.handleSource) return;
  const prefix = `impl_${type}_handle`;
  const definitions = findFunctionDefinitions(files.handleSource.content);
  const notify = definitions.find((definition) => definition.name === `${prefix}_notify_from_isr`);
  const process = definitions.find((definition) => definition.name === `${prefix}_process`);
  if (!notify || /event_callback|\bcallback\s*\(/.test(notify.body) || !/from_isr|event_pending/i.test(notify.body)) {
    addError(errors, 'LAYER_HANDLE_ISR_DEFERRAL', files.handleSource.relative, 'Handle ISR notification must defer work and must not call the user callback.');
  }
  if (!process || !/callback\s*\(/.test(process.body) || !/event_pending\s*=\s*false/.test(process.body)) {
    addError(errors, 'LAYER_HANDLE_TASK_CALLBACK', files.handleSource.relative, 'Handle process function must release deferred state before task-context callback.');
  }
}

function validateSsd1306Display(files, errors) {
  for (const role of ['handleHeader', 'handleSource']) {
    const file = files[role];
    if (file && /impl_ssd1306_(?:driver|config)/i.test(file.content)) {
      addError(errors, 'LAYER_HANDLE_DEVICE_DEPENDENCY', file.relative, 'Display Handle must not depend on SSD1306 files or configuration.');
    }
  }
  if (files.driverSource && /\bHAL_[A-Za-z0-9_]+\s*\(|#\s*include\s*[<"][^>"]*(?:stm32|hal|freertos|rtthread|cmsis_os)[^>"]*[>"]/i.test(maskCommentsAndStrings(files.driverSource.content))) {
    addError(errors, 'LAYER_HAL_DRIVER_CONCRETE_DEPENDENCY', files.driverSource.relative, 'SSD1306 Driver must use injected Core Bus Ops only.');
  }
  if (files.portSource) {
    const source = files.portSource.content;
    for (const [ruleId, pattern, message] of [
      ['LAYER_PORT_OSAL_CONSTRUCTION', /osal_mutex_create\s*\(/, 'Display Port must create its declared OSAL mutex.'],
      ['LAYER_PORT_OSAL_INJECTION', /pf_bind_osal\s*\(/, 'Display Port must inject OSAL Ops into the Handle.'],
      ['LAYER_PORT_OSAL_CLEANUP', /osal_mutex_destroy\s*\(/, 'Display Port must release the created OSAL mutex on assembly failure.'],
      ['LAYER_PORT_DIRECT_CONTEXT_OPS', /pf_bind_bus\(driver_api\.p_context/, 'Port must bind context-first Driver Ops directly.'],
      ['LAYER_PORT_WRAPPER_REGISTRATION', /platform_display_wrapper_register\s*\(/, 'Port must register display public Ops with the Wrapper.']
    ]) {
      if (!pattern.test(source)) addError(errors, ruleId, files.portSource.relative, message);
    }
    if (/\(\s*int32_t\s*\(\s*\*\s*\)/.test(source)) {
      addError(errors, 'LAYER_PORT_FUNCTION_POINTER_CAST', files.portSource.relative, 'Port must not use function-pointer casts for context-first Ops.');
    }
  }
  if (files.handleSource && (!/pf_lock\(/.test(files.handleSource.content)
    || !/pf_unlock\(/.test(files.handleSource.content))) {
    addError(errors, 'LAYER_HANDLER_OSAL_MUTEX_USE', files.handleSource.relative, 'Display Handle must use injected OSAL mutex operations around framebuffer access.');
  }
}

function validateLayerContract({ root, core, deviceType, device, slice = 'all' } = {}) {
  if (!root || !core || !deviceType || !device) throw createLayerError('--root, --core, --device-type, and --device are required.');
  const normalizedCore = normalizeCorePeripheral(core);
  const type = normalizeDeviceType(deviceType);
  const normalizedDevice = normalizeDevice(device);
  const allPaths = expectedPaths({ core: normalizedCore, deviceType: type, device });
  const paths = filterSlice(allPaths, slice);
  const errors = [];
  const resolvedRoot = path.resolve(root);
  const files = readSlice(resolvedRoot, paths, errors);
  validateSections(files, errors);
  validateGeneratedStyle(files, errors);
  validateCommentCompleteness(files, errors);
  validateCommentLanguage(files, errors);
  validateCore(files, errors);
  validateWrapper(files, errors);
  validateFourTuple(files, errors);
  if (slice === 'wrapper') {
    validateCommentLanguage(files, errors, { rulePrefix: 'LAYER_WRAPPER' });
    return { root: resolvedRoot, slice, paths, errors, valid: errors.length === 0 };
  }
  if (normalizedDevice.stem === 'ssd1306') {
    validateSsd1306Display(files, errors);
  } else {
    validateHalDriver(files, errors);
    validateHandler(files, errors);
    validatePort(files, type, errors);
    validateHandle(files, type, errors);
  }
  return { root: resolvedRoot, slice, paths, errors, valid: errors.length === 0 };
}

function parseArgs(argv, cwd = process.cwd()) {
  if (argv.length === 1 && argv[0] === '--self-check') return { selfCheck: true };
  const options = { root: null, core: null, deviceType: null, device: null, json: false, slice: 'all' };
  const names = { '--root': 'root', '--core': 'core', '--device-type': 'deviceType', '--device': 'device', '--slice': 'slice' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    // package.json 的 validate:layer 脚本固定注入 --self-check；
    // 当用户附加真实参数（--root/--core/...）时该默认参数被忽略，走真实校验。
    if (argument === '--self-check') continue;
    if (argument === '--json') options.json = true;
    else if (names[argument]) {
      const value = argv[++index];
      if (!value) throw createLayerError(`${argument} requires a value.`);
      options[names[argument]] = argument === '--root' ? path.resolve(cwd, value) : value;
    }
    else throw createLayerError(`Unknown argument: ${argument}`);
  }
  if (!options.root || !options.core || !options.deviceType || !options.device) {
    throw createLayerError('--root, --core, --device-type, and --device are required.');
  }
  if (options.slice !== 'all' && !SLICE_ROLES[options.slice]) {
    throw createLayerError(`Unknown --slice value: ${options.slice}. Expected wrapper, driver, handle, port, or all.`);
  }
  return options;
}

async function runSelfCheck() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-layer-contract-self-check-'));
  try {
    const files = [
      ...(await generateCorePeripheral('spi', 'stm32f4')),
      ...(await generateBspDriver({
        deviceType: 'externflash', device: 'W25Q64', cores: ['spi'], platform: 'stm32f4'
      }))
    ];
    for (const file of files) {
      const target = path.join(root, file.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.content, 'utf8');
    }
    return validateLayerContract({ root, core: 'spi', deviceType: 'externflash', device: 'W25Q64' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = options.selfCheck ? await runSelfCheck() : validateLayerContract(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else if (result.valid) console.log(`Layer contract valid: ${result.root}${options.selfCheck ? ' (generated self-check)' : ''}`);
  else result.errors.forEach((error) => console.error(`${error.ruleId} ${error.file}: ${error.message}`));
  process.exitCode = result.valid ? 0 : 3;
  return result;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Layer validation failed: ${error.message}`);
    process.exitCode = error.code === 'LAYER' || error.code === 'USAGE' ? 3 : 1;
  });
}

module.exports = {
  SLICE_ROLES,
  directIncludes,
  expectedPaths,
  extractCommentText,
  filterSlice,
  findFunctionContracts,
  findFunctionDefinitions,
  maskCommentsAndStrings,
  parseArgs,
  validateCommentCompleteness,
  runSelfCheck,
  validateCommentLanguage,
  validateGeneratedStyle,
  validateFourTuple,
  validateHalDriver,
  validateHandler,
  validateSsd1306Display,
  validateLayerContract
};
