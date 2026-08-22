const { getVersions, isCodexDevelopmentVersion } = require('../scripts/sync-plugin-versions');

describe('plugin version single source', () => {
  test('all plugin manifests match package.json version', () => {
    const versions = getVersions();
    expect(versions.claude).toBe(versions.package);
    expect(isCodexDevelopmentVersion(versions.codex, versions.package)).toBe(true);
    expect(versions.package).toBe('1.0.0');
  });

  test('index.js reads version from package.json', () => {
    const plugin = require('../index');
    expect(plugin.version).toBe(getVersions().package);
  });
});
