/**
 * embedded-framework 基准工程测试。
 *
 * 快照来源：D:\zhuomian\embedded_framework（用户按五层契约手写的实践工程，独立 git 演进）。
 * 用途：作为"黄金样本"守护插件契约校验——真实工程应被插件接受，且不产生新违规。
 * 同步方式：手动复制（剥离 .git/.vscode/.zed/.github）到 tests/fixtures/embedded-framework/。
 *
 * 已知偏差白名单：2026-08-09 四子域分类后清理了头文件注释中的芯片字样
 * （RCC_CSR/STM32F411xE/SCB），platform_common 已达成平台纯度，白名单为空。
 * 若未来出现新的平台层芯片泄漏，白名单测试会立即失败。
 */
const fs = require('fs');
const path = require('path');

const FIXTURE = path.join(__dirname, 'fixtures', 'embedded-framework');

const TOP_LEVEL_DIRS = ['00_Config', '00_Docs', '01_App', '02_Service', '03_Platform', '04_Impl', '05_Vendor', '06_Toolchain', '99_Utils'];
const PLATFORM_SUBDOMAINS = ['platform_bsp', 'platform_common', 'platform_mcu', 'platform_middlewares', 'platform_os'];
const IMPL_SUBDOMAINS = ['impl_board', 'impl_bsp', 'impl_mcu', 'impl_middleware', 'impl_os'];

// Platform 层门禁黑名单：芯片/RTOS/厂商符号（与 scripts/validators/skill-catalog.js 对齐）。
const CHIP_RTOS_PATTERN = /(?:RCC_CSR|SCB\s*->|stm32|STM32|HAL_[A-Za-z_]+|xTask[A-Za-z_]*|CMSIS)/;
const KNOWN_PLATFORM_CHIP_LEAKS = [];

// Vendor 源码目录名：上层（App/Service/Platform/Config/Utils）禁止 include 它们。
const VENDOR_PREFIXES = ['easylogger', 'elog', 'segger', 'rtt', 'SEGGER'];

function listFiles(root, exts, results = []) {
  if (!fs.existsSync(root)) return results;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) listFiles(full, exts, results);
    else if (exts.includes(path.extname(entry.name))) results.push(full);
  }
  return results;
}

function relativePosix(root, file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function collectIncludes(root, exts) {
  const found = [];
  for (const file of listFiles(root, exts)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/#include\s*[<"]([^>"]+)[>"]/);
      if (match) found.push({ file: relativePosix(root, file), include: match[1] });
    }
  }
  return found;
}

describe('embedded-framework 基准工程（五层契约黄金样本）', () => {
  test('五层目录与 Platform/Impl 子域齐全', () => {
    for (const dir of TOP_LEVEL_DIRS) {
      expect(fs.existsSync(path.join(FIXTURE, dir))).toBe(true);
    }
    for (const sub of PLATFORM_SUBDOMAINS) {
      expect(fs.existsSync(path.join(FIXTURE, '03_Platform', sub))).toBe(true);
    }
    for (const sub of IMPL_SUBDOMAINS) {
      expect(fs.existsSync(path.join(FIXTURE, '04_Impl', sub))).toBe(true);
    }
  });

  test('App 只依赖 Service（自身/service_*/std + 错误码类型出口）', () => {
    const violations = [];
    const root = path.join(FIXTURE, '01_App');
    const ownHeaders = new Set(listFiles(root, ['.h']).map((f) => path.basename(f)));
    for (const { file, include } of collectIncludes(root, ['.c', '.h'])) {
      if (ownHeaders.has(include)) continue;
      // platform_error.h 是错误码类型出口（platform_err_t），属平台基础类型契约，
      // 全层可用（与 platform_type.h 同类）；App 禁的是 Platform 能力接口/实现。
      if (include === 'platform_error.h') continue;
      if (/^(?:service_|std)/.test(include)) continue;
      violations.push(`${file} 非法 include ${include}（App 只调 Service）`);
    }
    expect(violations).toEqual([]);
  });

  test('Service 依赖自身/platform_*/service_*/std（禁 vendor/impl 直连）', () => {
    const violations = [];
    const root = path.join(FIXTURE, '02_Service');
    const ownHeaders = new Set(listFiles(root, ['.h']).map((f) => path.basename(f)));
    for (const { file, include } of collectIncludes(root, ['.c', '.h'])) {
      if (ownHeaders.has(include)) continue;
      if (/^(?:platform_|service_|std)/.test(include)) continue;
      violations.push(`${file} 非法 include ${include}（Service 只依赖 Platform/Service）`);
    }
    expect(violations).toEqual([]);
  });

  test('Platform 层无新增芯片/RTOS/厂商泄漏（白名单守护）', () => {
    const leaks = [];
    for (const file of listFiles(path.join(FIXTURE, '03_Platform'), ['.c', '.h'])) {
      const content = fs.readFileSync(file, 'utf8');
      if (CHIP_RTOS_PATTERN.test(content)) leaks.push(relativePosix(FIXTURE, file));
    }
    expect(leaks.sort()).toEqual([...KNOWN_PLATFORM_CHIP_LEAKS].sort());
  });

  test('Platform 层零反向依赖（禁 include impl_*/04_Impl 路径）', () => {
    const violations = [];
    const platformRoot = path.join(FIXTURE, '03_Platform');
    const platformHeaders = new Set(listFiles(platformRoot, ['.h']).map((f) => path.basename(f)));
    for (const { file, include } of collectIncludes(platformRoot, ['.c', '.h'])) {
      if (/^(?:impl_|app_|service_)/.test(include) || include.includes('04_Impl')) {
        violations.push(`${file} 反向依赖 Impl: ${include}`);
      }
      if (platformHeaders.has(include)) continue;      // 平台内部头
      // board_types.h 是类型出口唯一例外：platform_type.h 从 impl_board 引出基础类型
      if (include === 'board_types.h' && file.endsWith('platform_type.h')) continue;
      if (/^(?:platform_|std)/.test(include)) continue; // 平台接口/标准库
      violations.push(`${file} 非法 include ${include}（Platform 只依赖自身/std）`);
    }
    expect(violations).toEqual([]);
  });

  test('Impl 只依赖 Platform 接口头（零反向定义/零实现依赖）', () => {
    const violations = [];
    const platformRoot = path.join(FIXTURE, '03_Platform');
    const platformHeaders = new Set(listFiles(platformRoot, ['.h']).map((f) => path.basename(f)));
    const implRoot = path.join(FIXTURE, '04_Impl');
    for (const { file, include } of collectIncludes(implRoot, ['.c', '.h'])) {
      if (include.endsWith('.c')) {
        violations.push(`${file} include 实现文件: ${include}（Impl 只依赖 Platform 接口头）`);
        continue;
      }
      if (/^impl_/.test(include)) continue;          // Impl 内部头
      if (VENDOR_PREFIXES.some((p) => include.includes(p))) continue; // Vendor 源码头
      if (/^(?:platform_|std|vendor)/.test(include)) {
        // platform_* 头必须真实存在于 03_Platform（防幽灵依赖/漂移）
        if (/^platform_/.test(include) && !platformHeaders.has(include)) {
          violations.push(`${file} 引用不存在的 Platform 头: ${include}`);
        }
        continue;
      }
      violations.push(`${file} 非法 include ${include}（Impl 只依赖 Platform/Impl/Vendor）`);
    }
    expect(violations).toEqual([]);
  });

  test('Vendor 源码只被 04_Impl 引用（上层零 vendor include）', () => {
    const violations = [];
    for (const layer of ['00_Config', '01_App', '02_Service', '03_Platform', '99_Utils']) {
      for (const { file, include } of collectIncludes(path.join(FIXTURE, layer), ['.c', '.h'])) {
        if (VENDOR_PREFIXES.some((p) => include.includes(p))) {
          violations.push(`${file} 泄漏 vendor 依赖: ${include}`);
        }
      }
    }
    expect(violations).toEqual([]);
    expect(fs.existsSync(path.join(FIXTURE, '05_Vendor', 'easylogger'))).toBe(true);
    expect(fs.existsSync(path.join(FIXTURE, '05_Vendor', 'segger_rtt'))).toBe(true);
  });
});
