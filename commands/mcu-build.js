const { buildProject } = require('../lib/builder');

module.exports = {
  name: 'mcu-build',
  description: '构建嵌入式项目',
  options: [
    { name: '--target', description: '目标平台', required: true },
    { name: '--clean', description: '清理构建', default: false }
  ],
  handler: async (options) => {
    const { target, clean } = options;

    if (!target) {
      throw new Error('Target platform is required');
    }

    return await buildProject(process.cwd(), target, {
      clean: Boolean(clean),
      execute: Boolean(options.execute),
      logger: options.quiet ? () => {} : console.log
    });
  }
};
