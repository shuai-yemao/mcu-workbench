const fs = require('fs');
const path = require('path');

function loadSkillsFromPlugin() {
  const skillsDir = path.join(__dirname, 'embedded');
  const skills = {};

  if (!fs.existsSync(skillsDir)) {
    return skills;
  }

  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of skillDirs) {
    const skillFile = path.join(skillsDir, dir, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      const content = fs.readFileSync(skillFile, 'utf-8');
      const meta = parseSkillMeta(content);
      skills[dir] = {
        name: meta.name || dir,
        description: meta.description || '',
        path: path.join(skillsDir, dir),
        content: content,
        category: meta.category || 'general',
        platforms: meta.platforms || ['all']
      };
    }
  }

  return skills;
}

function parseSkillMeta(content) {
  const meta = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (match) {
    const lines = match[1].split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        meta[key.trim()] = valueParts.join(':').trim();
      }
    }
  }
  return meta;
}

function getSkillContent(skillName) {
  const skillFile = path.join(__dirname, 'embedded', skillName, 'SKILL.md');
  if (fs.existsSync(skillFile)) {
    return fs.readFileSync(skillFile, 'utf-8');
  }
  return null;
}

function listAvailableSkills() {
  const skillsDir = path.join(__dirname, 'embedded');
  if (!fs.existsSync(skillsDir)) {
    return [];
  }

  return fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

module.exports = {
  loadSkillsFromPlugin,
  getSkillContent,
  listAvailableSkills,
  parseSkillMeta
};
