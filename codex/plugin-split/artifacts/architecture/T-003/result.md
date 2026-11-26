# T-003 Architecture Skill source migration

- cwd: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
- Input baseline: T-001 `source-baseline.json`, HEAD `6cd4fadc93ddaff5b03efbf7b32fa6a72b97883b`.
- Test first: `node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-skills.test.js`; exit 1 as expected because all 39 plugin `SKILL.md` sources were absent and catalog ownership was empty.
- Migration: copied complete trees for 31 canonical + 8 matrix-owned external Skills into `plugins/mcu-workbench-architecture/skills/<id>/` through a temporary staging directory. Every source file was checked against T-001 SHA-256 before copying and every destination hash checked after copying.
- Result: 39 Skill directories, 249 files; old `skills/` sources were not changed or removed.
- Source map: `plugins/mcu-workbench-architecture/skill-map.json` records all 39 source IDs, plugin paths and previous root projection paths; SHA-256 `A125EBB5CE673A66D8009D8D3EB710BEBB1F5DA7AFA60E4EA2EA5E80A5FF6501`.
- Verification: `node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-skills.test.js -t "source map|stores all selected Skill sources"`; exit 0, 2 selected tests passed (catalog ownership tests remain for T-006).
- Migration manifest: `import-manifest.json`, SHA-256 `3A004AB88CB7910A085F5C8B8EFB4D42E165680912C7C7CCA78D3856DA7D1133`.
- Evidence level: static/host. Package links are not yet validated; they are addressed by T-004.
