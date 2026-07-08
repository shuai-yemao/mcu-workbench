const mcuNew = require('./commands/mcu-new');
const mcuDriver = require('./commands/mcu-driver');
const mcuBuild = require('./commands/mcu-build');
const mcuFlash = require('./commands/mcu-flash');
const mcuDebug = require('./commands/mcu-debug');

module.exports = {
  name: 'mcu-workbench',
  version: '0.1.0',
  description: '嵌入式开发生命周期全覆盖的 Claude Code 插件',

  commands: [
    mcuNew,
    mcuDriver,
    mcuBuild,
    mcuFlash,
    mcuDebug
  ],

  async init(context) {
    console.log('MCU-Workbench 插件已加载');
  }
};
