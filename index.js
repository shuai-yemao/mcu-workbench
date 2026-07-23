const mcuNew = require('./commands/mcu-new');
const mcuDriver = require('./commands/mcu-driver');
const mcuBuild = require('./commands/mcu-build');
const mcuFlash = require('./commands/mcu-flash');
const mcuDebug = require('./commands/mcu-debug');
const { loadSkillsFromPlugin, getSkillContent, listAvailableSkills } = require('./skills/loader');
const { SKILLS, getSkillsByCategory, getSkillsByPlatform } = require('./skills/registry');
const cli = require('./lib/cli');

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
    loaded: loadSkillsFromPlugin(),
    getContent: getSkillContent,
    list: listAvailableSkills,
    getByCategory: getSkillsByCategory,
    getByPlatform: getSkillsByPlatform
  },

  cli,

  async init(context) {
    const loadedSkills = loadSkillsFromPlugin();
    console.log('MCU-Workbench 插件已加载');
    console.log(`已加载 ${Object.keys(loadedSkills).length} 个嵌入式技能包`);
  }
};
