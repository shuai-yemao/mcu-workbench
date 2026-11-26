const fs = require('fs');
const path = require('path');

const SKILL_PATHS = Object.freeze({
  platform_common: 'skills/platform/platform_common/SKILL.md',
  platform_mcu: 'skills/platform/platform_mcu/SKILL.md',
  platform_os: 'skills/platform/platform_os/SKILL.md',
  platform_bsp: 'skills/platform/platform_bsp/SKILL.md',
  impl_bsp: 'skills/impl/impl_bsp/SKILL.md',
  impl_board: 'skills/impl/impl_board/SKILL.md',
  impl_os: 'skills/impl/impl_os/SKILL.md',
  app: 'skills/app/app-architecture/SKILL.md'
});

function loadSkillContract(skillId, root = path.resolve(__dirname, '..', '..')) {
  const relativePath = SKILL_PATHS[skillId];
  if (!relativePath) {
    return { skillId, status: 'unregistered', path: null, content: null };
  }
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return { skillId, status: 'missing', path: absolutePath, content: null };
  }
  return {
    skillId,
    status: 'available',
    path: absolutePath,
    content: fs.readFileSync(absolutePath, 'utf8')
  };
}

module.exports = { SKILL_PATHS, loadSkillContract };
