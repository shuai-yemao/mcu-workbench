const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

describe('workflow lifecycle', () => {
  test('archived workflows have been removed and no legacy active entry remains', () => {
    expect(fs.existsSync(path.join(ROOT, 'workflows', 'embedded-ai-collab'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'archive'))).toBe(false);
  });
});
