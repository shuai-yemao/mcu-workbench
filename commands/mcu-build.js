const { buildProject } = require('../lib/builder');

module.exports = {
  name: 'mcu-build',
  description: '构建嵌入式项目',
  options: [
    { name: '--platform', description: '目标平台' },
    { name: '--clean', description: '清理构建', default: false }
  ],
  handler: async (options) => {
    const { platform, clean } = options;

    if (!platform) {
      throw new Error('Platform is required');
    }

    return await buildProject(process.cwd(), platform, {
      clean: Boolean(clean),
      execute: Boolean(options.execute),
      logger: options.quiet ? () => {} : console.log
    });
  }
};
