const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

describe('workflow lifecycle', () => {
  test('legacy embedded workflow is archived and not an active entry', () => {
    expect(fs.existsSync(path.join(ROOT, 'workflows', 'embedded-ai-collab'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'archive', 'workflows-legacy', 'embedded-ai-collab', 'workflow.js'))).toBe(true);
    expect(fs.readFileSync(path.join(ROOT, 'archive', 'workflows-legacy', 'embedded-ai-collab', 'README.md'), 'utf8')).toContain('归档');
  });
});
