const { loadSkillsFromPlugin, getSkillContent, listAvailableSkills } = require('./skills/loader');
const { SKILLS, getSkillsByCategory, getSkillsByPlatform } = require('./skills/registry');

module.exports = {
  name: 'mcu-workbench',
  version: require('./package.json').version,
  description: '嵌入式开发生命周期全覆盖的 Claude Code 插件',

  skills: {
    registry: SKILLS,
    loaded: loadSkillsFromPlugin(),
    getContent: getSkillContent,
    list: listAvailableSkills,
    getByCategory: getSkillsByCategory,
    getByPlatform: getSkillsByPlatform
  },

  async init(context) {
    const loadedSkills = loadSkillsFromPlugin();
    console.log('MCU-Workbench 插件已加载');
    console.log(`已加载 ${Object.keys(loadedSkills).length} 个嵌入式技能包`);
  }
};
