const { buildProject } = require('../lib/builder');

module.exports = {
  name: 'mcu-build',
  description: '构建嵌入式项目',
  options: [
    { name: '--platform', description: '目标平台' },
    { name: '--target', description: '目标平台（兼容别名，推荐使用 --platform）' },
    { name: '--clean', description: '清理构建', default: false }
  ],
  handler: async (options) => {
    const { platform, target, clean } = options;

    if (platform && target && platform !== target) {
      throw new Error('Cannot use both --platform and --target with different values');
    }

    const resolvedPlatform = platform || target;
    if (!resolvedPlatform) {
      throw new Error('Platform is required');
    }

    return await buildProject(process.cwd(), resolvedPlatform, {
      clean: Boolean(clean),
      execute: Boolean(options.execute),
      logger: options.quiet ? () => {} : console.log
    });
  }
};
