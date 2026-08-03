const { getVersions } = require('../scripts/sync-plugin-versions');

describe('plugin version single source', () => {
  test('all plugin manifests match package.json version', () => {
    const versions = getVersions();
    expect(versions.claude).toBe(versions.package);
    expect(versions.codex).toBe(versions.package);
    expect(versions.package).toBe('1.0.0');
  });

  test('index.js reads version from package.json', () => {
    const plugin = require('../index');
    expect(plugin.version).toBe(getVersions().package);
  });
});
