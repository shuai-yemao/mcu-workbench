#!/usr/bin/env node
/**
 * validate-harness-adapter —— 适配器校验 CLI 壳(D5-2)。
 * 用法:
 *   node scripts/validate-harness-adapter.js --kind engine <module-path>
 *   node scripts/validate-harness-adapter.js --kind target <module-path>
 * 模块需导出工厂函数(createXxxEngine / createXxxTarget),自动调用后校验实例。
 */

const path = require('path');
const { validateEngineAdapter, validateTargetAdapter } = require('../harness/lib/adapter-check');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function main() {
  const args = process.argv.slice(2);
  const kindIndex = args.indexOf('--kind');
  if (kindIndex === -1 || !args[kindIndex + 1]) {
    fail('用法: node scripts/validate-harness-adapter.js --kind engine|target <module-path>');
    return;
  }
  const kind = args[kindIndex + 1];
  const modulePath = args.filter((a) => a !== '--kind' && a !== kind).pop();
  if (!modulePath) {
    fail('缺少模块路径');
    return;
  }

  const mod = require(path.resolve(modulePath));
  const factory = Object.entries(mod).find(([name, fn]) => /^create.*(Engine|Target)$/.test(name) && typeof fn === 'function');
  if (!factory) {
    fail(`模块 ${modulePath} 未导出 create*Engine/create*Target 工厂函数`);
    return;
  }
  const [factoryName, factoryFn] = factory;
  const adapter = factoryFn();

  const verdict = kind === 'target' ? validateTargetAdapter(adapter) : validateEngineAdapter(adapter);
  if (!verdict.ok) {
    fail(`❌ ${kind} 适配器 ${adapter.id || '(no id)'} 校验失败:\n  - ${verdict.errors.join('\n  - ')}`);
    return;
  }
  console.log(`✅ ${kind} 适配器校验通过: ${adapter.id}(工厂 ${factoryName})`);
}

main();
