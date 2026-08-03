const { runClaudeLayer } = require('../lib/claude-layering');

function run(options = {}) {
  return runClaudeLayer({
    action: options.action,
    root: options.root,
    configPath: options.config,
    write: Boolean(options.write),
    strict: Boolean(options.strict)
  });
}

module.exports = {
  name: 'claude-layer',
  description: '扫描、同步和校验目标工程的 Claude 分层规则',
  options: [
    { name: '--root', description: '固件工程根目录', required: true },
    { name: '--config', description: '分层配置文件，相对 root 解析' },
    { name: '--write', description: '将 init 或 sync 的预览写入工程' },
    { name: '--strict', description: '将未确认路径视为校验错误' }
  ],
  handler: run
};

module.exports.run = run;
