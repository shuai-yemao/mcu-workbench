const { loadSkillsFromPlugin, getSkillContent, listAvailableSkills } = require('./skills/loader');
const { SKILLS, getSkillsByCategory, getSkillsByPlatform } = require('./skills/registry');
const { ensureDashboardStarted, startDashboard, statusDashboard, stopDashboard, renderDashboard, openDashboard } = require('./lib/workflow-dashboard-manager');

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

  dashboard: { ensureDashboardStarted, startDashboard, statusDashboard, stopDashboard, renderDashboard, openDashboard },

  async init(context) {
    const loadedSkills = loadSkillsFromPlugin();
    const dashboard = ensureDashboardStarted({ root: context?.directory || context?.worktree });
    console.log('MCU-Workbench 插件已加载');
    console.log(`已加载 ${Object.keys(loadedSkills).length} 个嵌入式技能包`);
    if (dashboard.started || dashboard.alreadyRunning) console.log(`项目工作台已${dashboard.alreadyRunning ? '在运行' : '启动'}：${dashboard.root}`);
  }
};
