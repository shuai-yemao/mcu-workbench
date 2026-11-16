#!/usr/bin/env node
/**
 * MCU-Workbench stdio MCP。
 * 只暴露 catalog 中的 active skills：23 个 canonical skill 和 hardware skills。
 */
const fs = require('fs');
const path = require('path');
const { CANONICAL_SKILLS, SKILL_BY_ID, resolveSkillId } = require('../skills/catalog');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_LIMIT = 100000;
const PREVIEW_LIMIT = 1500;

const ROUTE_HINTS = [
  [/链接脚本|scatter|内存布局|\blinker\b/i, 'tools-linker'],
  [/烧录|j-?link|st-?link|openocd|\bflash\b/i, 'tools-flash'],
  [/调试|\bdebug\b|\bgdb\b|ozone|崩溃|hardfault|backtrace/i, 'tools-debug'],
  [/rtt|systemview|elog|串口|观测/i, 'tools-observability'],
  [/代码审查|静态分析|unity|代码质量|\bmap\b/i, 'tools-quality'],
  [/ota|发布|回滚/i, 'tools-release'],
  [/obsidian|学习笔记|学习辅导/i, 'tools-learning-tutor'],
  [/编译|构建|cmake|keil|\biar\b|platformio|esp-idf|\bbuild\b/i, 'tools-build'],
  [/freertos/i, 'rtos-freertos'],
  [/osal|os wrapper|os port|任务队列/i, 'os-abstraction'],
  [/lvgl|图形界面/i, 'middleware-lvgl'],
  [/mqtt|\bble\b|\bcan\b|modbus|wifi|lora|ymodem/i, 'middleware-communication'],
  [/fatfs|sfud|文件系统/i, 'middleware-storage'],
  [/\bdsp\b|\bfft\b/i, 'middleware-algorithms'],
  [/多实例|睡眠恢复|\bhandler\b/i, 'bsp-handler'],
  [/hal_driver|器件协议|传感器驱动/i, 'bsp-hal-driver'],
  [/bsp wrapper|bsp port|平台绑定|\badapter\b/i, 'bsp-adapter'],
  [/原理图|\bpcb\b|网表/i, 'hardware-pcb-analysis'],
  [/visa|scpi|仪器/i, 'hardware-visa-debug'],
  [/cmsis|寄存器|\bhal\b|\bsdk\b|stm32/i, 'driver-vendor'],
  [/中断|\bdma\b|cortex|启动文件/i, 'core-mcu'],
  [/bootloader|低功耗|看门狗|\baes\b|固件签名/i, 'software-system'],
  [/gr5526|manager|\bprofile\b/i, 'app-architecture'],
  [/分层|集成|移植|架构审计/i, 'workflow-project-integration']
];

const TOOLS = [
  {
    name: 'list_skills',
    description: '列出 mcu-workbench 当前可调用的嵌入式 skills，包含 id、层级、说明和别名。',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'get_skill',
    description: '按 canonical id、旧名称或别名读取 SKILL.md。可用 reference 读取该 skill 目录内的参考文献。',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: '例如 workflow-router、build-keil、pcb-analysis'
        },
        reference: {
          type: 'string',
          description: '可选。skill 目录内的相对路径，例如 references/usage.md'
        }
      },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'route_request',
    description: '根据嵌入式开发请求推荐一个主 skill，并返回简短预览。完整正文再用 get_skill 读取。',
    inputSchema: {
      type: 'object',
      properties: {
        request: {
          type: 'string',
          description: '用户的嵌入式开发请求'
        }
      },
      required: ['request'],
      additionalProperties: false
    }
  }
];

function activeSkills() {
  const skills = [...CANONICAL_SKILLS];
  for (const skill of Object.values(SKILL_BY_ID)) {
    if (skill.layer === 'hardware' && !skill.archived && !skills.some((item) => item.id === skill.id)) {
      skills.push(skill);
    }
  }
  return skills;
}

function aliasesFor(skill) {
  const aliases = new Set(skill.aliases || []);
  if (skill.legacyId && skill.legacyId !== skill.id) aliases.add(skill.legacyId);
  return [...aliases];
}

function summarize(skill) {
  return {
    id: skill.id,
    layer: skill.layer,
    description: skill.description,
    aliases: aliasesFor(skill),
    path: skill.path
  };
}

function listSkills() {
  return activeSkills().map(summarize);
}

function skillByResolvedId(id) {
  const resolved = resolveSkillId(id);
  if (!resolved) return { error: `未知 skill：${id}` };
  const skill = SKILL_BY_ID[resolved];
  if (!skill) return { error: `未知 skill：${id}` };
  if (skill.archived) return { error: `skill ${id} 已归档，请使用 canonical skill ${resolved}` };
  return { skill, resolved };
}

function resolveInside(root, relativePath) {
  const normalized = path.normalize(String(relativePath || '')).replace(/^([/\\])+/, '');
  if (!normalized || normalized === '.') return path.join(root, 'SKILL.md');
  if (path.isAbsolute(normalized) || normalized === '..' || normalized.startsWith(`..${path.sep}`)) {
    throw new Error('引用路径必须位于 skill 目录内');
  }
  const target = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new Error('引用路径必须位于 skill 目录内');
  }
  return target;
}

function readBounded(file) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.length <= CONTENT_LIMIT) return { content, truncated: false };
  return {
    content: content.slice(0, CONTENT_LIMIT),
    truncated: true
  };
}

function getSkill(args) {
  const id = args && args.id;
  if (!id || typeof id !== 'string') return { error: 'id 不能为空' };
  const found = skillByResolvedId(id.trim());
  if (found.error) return found;

  const skillRoot = path.join(ROOT, found.skill.path);
  let file;
  try {
    file = resolveInside(skillRoot, args.reference);
  } catch (error) {
    return { error: error.message };
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return { error: `文件不存在：${path.relative(ROOT, file)}` };
  }

  const loaded = readBounded(file);
  return {
    ...summarize(found.skill),
    requestedId: id,
    file: path.relative(ROOT, file).split(path.sep).join('/'),
    truncated: loaded.truncated,
    content: loaded.content
  };
}

function pickSkill(request) {
  for (const [pattern, id] of ROUTE_HINTS) {
    if (pattern.test(request)) {
      const found = skillByResolvedId(id);
      if (!found.error) return { skill: found.skill, matchedBy: 'hint' };
    }
  }

  const lower = request.toLowerCase();
  for (const skill of activeSkills()) {
    const names = [skill.id, ...aliasesFor(skill)];
    if (names.some((name) => name && lower.includes(String(name).toLowerCase()))) {
      return { skill, matchedBy: 'alias' };
    }
  }

  return { skill: SKILL_BY_ID['workflow-router'], matchedBy: 'default' };
}

function routeRequest(request) {
  const text = typeof request === 'string' ? request.trim() : '';
  if (!text) return { error: 'request 不能为空' };
  const picked = pickSkill(text);
  const loaded = getSkill({ id: picked.skill.id });
  if (loaded.error) return loaded;
  return {
    request: text,
    matchedBy: picked.matchedBy,
    skill: summarize(picked.skill),
    preview: loaded.content.slice(0, PREVIEW_LIMIT),
    previewTruncated: loaded.content.length > PREVIEW_LIMIT
  };
}

function callTool(params) {
  const name = params && params.name;
  const args = (params && params.arguments) || {};
  let payload;
  if (name === 'list_skills') payload = { skills: listSkills() };
  else if (name === 'get_skill') payload = getSkill(args);
  else if (name === 'route_request') payload = routeRequest(args.request);
  else {
    return {
      content: [{ type: 'text', text: `未知工具 ${name}` }],
      isError: true
    };
  }

  if (payload && payload.error) {
    return {
      content: [{ type: 'text', text: payload.error }],
      isError: true
    };
  }
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
  };
}

function initializeResult(params) {
  const clientVersion = params && params.protocolVersion;
  return {
    protocolVersion: typeof clientVersion === 'string' && clientVersion ? clientVersion : '2025-06-18',
    capabilities: {
      tools: { listChanged: false }
    },
    serverInfo: {
      name: 'mcu-workbench',
      version: '1.0.0'
    },
    instructions: '先调用 route_request 选择一个主 skill，再用 get_skill 读取 SKILL.md。需要细节时用 reference 读取该 skill 目录内的文件，不要一次加载全部 skill。'
  };
}

function dispatch(method, params) {
  if (method === 'initialize') return initializeResult(params);
  if (method === 'ping') return {};
  if (method === 'tools/list') return { tools: TOOLS };
  if (method === 'tools/call') return callTool(params);
  const error = new Error(`Method not found: ${method}`);
  error.code = -32601;
  throw error;
}

function encodeMessage(message) {
  const payload = Buffer.from(JSON.stringify(message), 'utf8');
  return Buffer.concat([
    Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`, 'utf8'),
    payload
  ]);
}

function startStdio() {
  let buffer = Buffer.alloc(0);
  process.stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length > 0) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;
      const header = buffer.slice(0, headerEnd).toString('utf8');
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }
      const length = Number(match[1]);
      const start = headerEnd + 4;
      if (buffer.length < start + length) return;
      const body = buffer.slice(start, start + length).toString('utf8');
      buffer = buffer.slice(start + length);
      handleBody(body);
    }
  });
  process.stdin.on('end', () => {
    process.exit(0);
  });
}

function handleBody(body) {
  let message;
  try {
    message = JSON.parse(body);
  } catch (error) {
    process.stdout.write(encodeMessage({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' }
    }));
    return;
  }
  if (!message || typeof message !== 'object' || Array.isArray(message) || !message.method) return;
  if (message.id === undefined || String(message.method).startsWith('notifications/')) return;

  try {
    const result = dispatch(message.method, message.params || {});
    process.stdout.write(encodeMessage({ jsonrpc: '2.0', id: message.id, result }));
  } catch (error) {
    process.stdout.write(encodeMessage({
      jsonrpc: '2.0',
      id: message.id,
      error: { code: error.code || -32603, message: error.message }
    }));
  }
}

if (require.main === module) startStdio();

module.exports = {
  TOOLS,
  listSkills,
  getSkill,
  routeRequest,
  dispatch,
  encodeMessage
};
