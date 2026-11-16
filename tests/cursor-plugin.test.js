const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { CANONICAL_SKILLS } = require('../skills/catalog');
const { validateCursorManifest, listCursorSkills } = require('../scripts/validators/manifest');
const { dispatch, getSkill, listSkills, routeRequest } = require('../mcp/server');
const { installCursorPlugin } = require('../scripts/install-cursor-local');

const ROOT = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

describe('Cursor plugin adapter', () => {
  test('declares Cursor skills, agents, marketplace, and MCP without changing Codex or Claude manifests', () => {
    const manifest = readJson('.cursor-plugin/plugin.json');
    const marketplace = readJson('.cursor-plugin/marketplace.json');
    const claude = readJson('.claude-plugin/plugin.json');
    const codex = readJson('.codex-plugin/plugin.json');

    expect(manifest.name).toBe('mcu-workbench');
    expect(manifest.displayName).toBe('MCU-Workbench');
    expect(manifest.skills).toBe('./cursor-skills/');
    expect(manifest.mcpServers).toBe('./mcp.json');
    expect(manifest.agents).toBe('./agents/');
    expect(manifest).not.toHaveProperty('hooks');
    expect(marketplace.plugins).toEqual([
      expect.objectContaining({ name: 'mcu-workbench', source: '.' })
    ]);
    expect(claude).not.toHaveProperty('mcpServers');
    expect(codex).not.toHaveProperty('mcpServers');
    expect(codex.skills).toBe('./skills/');
  });

  test('keeps the packaged MCP global and does not commit a project scope', () => {
    const pluginMcp = readJson('mcp.json');
    expect(pluginMcp.mcpServers.skills).toEqual({
      command: 'node',
      args: ['mcp/server.js'],
      cwd: '${CURSOR_PLUGIN_ROOT}'
    });
    expect(fs.existsSync(path.join(ROOT, '.cursor', 'mcp.json'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, '.cursor', 'skills'))).toBe(false);
  });

  test('cursor manifest validation accepts the adapter', () => {
    const errors = [];
    expect(validateCursorManifest(errors)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('MCP lists canonical skills plus hardware skills', () => {
    const skills = listSkills();
    const ids = skills.map((skill) => skill.id);
    expect(ids).toEqual(expect.arrayContaining(CANONICAL_SKILLS.map((skill) => skill.id)));
    expect(ids).toEqual(expect.arrayContaining(['hardware-pcb-analysis', 'hardware-visa-debug']));
    expect(ids.filter((id) => id === 'tools-quality')).toHaveLength(1);
    expect(skills).toHaveLength(CANONICAL_SKILLS.length + 2);
  });

  test('MCP resolves aliases and refuses paths outside a skill directory', () => {
    const skill = getSkill({ id: 'build-keil' });
    expect(skill.id).toBe('tools-build');
    expect(skill.file).toBe('skills/tools/tools-build/SKILL.md');
    expect(skill.content).toContain('name: tools-build');

    const reference = getSkill({
      id: 'workflow-project-integration',
      reference: 'references/software-layer-contract.md'
    });
    expect(reference.file).toBe('skills/workflow/workflow-project-integration/references/software-layer-contract.md');
    expect(reference.error).toBeUndefined();

    expect(getSkill({ id: 'missing-skill' }).error).toMatch(/未知 skill/);
    expect(getSkill({ id: 'tools-build', reference: '../../catalog.js' }).error).toMatch(/skill 目录内/);
    expect(getSkill({ id: 'tools-build', reference: 'references/../../catalog.js' }).error).toMatch(/skill 目录内/);
  });

  test('MCP routes an embedded request to one primary skill', () => {
    expect(routeRequest('Keil 工程编译失败').skill.id).toBe('tools-build');
    expect(routeRequest('使用 J-Link 烧录固件').skill.id).toBe('tools-flash');
    expect(routeRequest('分析这块 PCB 原理图和网表').skill.id).toBe('hardware-pcb-analysis');
    expect(routeRequest('今天天气怎么样').matchedBy).toBe('default');
    expect(routeRequest('今天天气怎么样').skill.id).toBe('workflow-router');
    expect(routeRequest('').error).toMatch(/不能为空/);
  });

  test('stdio MCP completes initialize and tools/list', async () => {
    const server = spawn(process.execPath, [path.join(ROOT, 'mcp', 'server.js')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const messages = await new Promise((resolve, reject) => {
      let buffer = Buffer.alloc(0);
      const received = [];
      const timeout = setTimeout(() => {
        server.kill();
        reject(new Error('MCP server timed out'));
      }, 5000);
      server.stdout.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length > 0) {
          const headerEnd = buffer.indexOf('\r\n\r\n');
          if (headerEnd === -1) return;
          const match = buffer.slice(0, headerEnd).toString('utf8').match(/Content-Length:\s*(\d+)/i);
          if (!match) {
            buffer = buffer.slice(headerEnd + 4);
            continue;
          }
          const length = Number(match[1]);
          const start = headerEnd + 4;
          if (buffer.length < start + length) return;
          received.push(JSON.parse(buffer.slice(start, start + length).toString('utf8')));
          buffer = buffer.slice(start + length);
          if (received.length === 2) {
            clearTimeout(timeout);
            server.stdin.end();
            resolve(received);
          }
        }
      });
      server.on('error', reject);
      server.stdin.write(encode({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } }
      }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'notifications/initialized' }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    });

    expect(messages[0].result.serverInfo.name).toBe('mcu-workbench');
    expect(messages[0].result.protocolVersion).toBe('2025-06-18');
    expect(messages[1].result.tools.map((tool) => tool.name)).toEqual([
      'list_skills', 'get_skill', 'route_request'
    ]);
    expect(dispatch('tools/call', {
      name: 'get_skill',
      arguments: { id: 'workflow-router' }
    }).isError).toBeUndefined();
  });

  test('installs skills and MCP at user scope for every project', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-cursor-'));
    const mcpPath = path.join(home, '.cursor', 'mcp.json');
    fs.mkdirSync(path.dirname(mcpPath), { recursive: true });
    fs.writeFileSync(mcpPath, JSON.stringify({ mcpServers: { other: { command: 'echo' } } }));
    try {
      const installed = installCursorPlugin({ home });
      expect(installed.scope).toBe('user');
      expect(fs.existsSync(path.join(installed.pluginDir, 'skills', 'workflow', 'workflow-router', 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(installed.pluginDir, 'mcp', 'server.js'))).toBe(true);
      expect(fs.existsSync(path.join(installed.pluginDir, 'mcp.json'))).toBe(true);
      expect(fs.existsSync(path.join(installed.pluginDir, '.cursor'))).toBe(false);
      expect(fs.existsSync(path.join(installed.pluginDir, '.git'))).toBe(false);
      expect(JSON.parse(fs.readFileSync(path.join(installed.pluginDir, '.cursor-plugin', 'plugin.json'), 'utf8')).skills).toBe('./cursor-skills/');
      const installedRecord = JSON.parse(fs.readFileSync(installed.installedJson, 'utf8'));
      expect(installedRecord.user).toContain('mcu-workbench');
      expect(installedRecord.local['mcu-workbench']).toBe(installed.pluginDir);

      const mcp = JSON.parse(fs.readFileSync(installed.mcpPath, 'utf8'));
      expect(mcp.mcpServers.other.command).toBe('echo');
      expect(mcp.mcpServers['mcu-workbench']).toEqual({
        command: 'node',
        args: [path.join(installed.pluginDir, 'mcp', 'server.js')]
      });

      for (const skill of listCursorSkills()) {
        const linkPath = path.join(installed.skillsDir, skill.id);
        expect(fs.lstatSync(linkPath).isSymbolicLink()).toBe(true);
        expect(fs.realpathSync(linkPath)).toBe(path.join(installed.pluginDir, skill.path));
        expect(fs.existsSync(path.join(linkPath, 'SKILL.md'))).toBe(true);
      }
      expect(fs.existsSync(path.join(installed.skillsDir, 'embedded'))).toBe(false);
      expect(fs.existsSync(path.join(installed.skillsDir, 'mcu-workbench'))).toBe(false);
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});

function encode(message) {
  const payload = Buffer.from(JSON.stringify(message));
  return Buffer.concat([
    Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`),
    payload
  ]);
}
