const mcuNew = require('./commands/mcu-new');
const mcuDriver = require('./commands/mcu-driver');
const mcuBuild = require('./commands/mcu-build');
const mcuFlash = require('./commands/mcu-flash');
const mcuDebug = require('./commands/mcu-debug');
const { SKILLS, getAllSkills, getSkillsByCategory, getSkillsByPlatform, listSkillNames } = require('./skills/registry');

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

  skills: {
    registry: SKILLS,
    getAll,
    getByCategory: getSkillsByCategory,
    getByPlatform: getSkillsByPlatform,
    listNames: listSkillNames
  },

  async init(context) {
    console.log('MCU-Workbench 插件已加载');
    console.log(`已加载 ${Object.keys(SKILLS).length} 个嵌入式技能包`);
  }
};
