'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  isDashboardProjectRoot,
  runtimePaths,
  startDashboard,
  statusDashboard,
  stopDashboard,
  ensureDashboardStarted,
} = require('../lib/workflow-dashboard-manager');

describe('workflow dashboard manager', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-dashboard-manager-'));
    fs.mkdirSync(path.join(root, '00_Docs'), { recursive: true });
    fs.mkdirSync(path.join(root, '01_App'), { recursive: true });
  });

  afterEach(() => {
    const paths = runtimePaths(root);
    stopDashboard({ root });
    fs.rmSync(paths.directory, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('recognizes an embedded project root without creating dashboard metadata in the project', () => {
    expect(isDashboardProjectRoot(root)).toBe(true);
    expect(ensureDashboardStarted({ root: path.dirname(root) })).toMatchObject({ skipped: true });
    expect(fs.readdirSync(root)).toEqual(expect.arrayContaining(['00_Docs', '01_App']));
    expect(fs.readdirSync(root)).not.toContain('workflow-dashboard.html');
  });

  test('starts only one watcher and supports status and stop lifecycle', async () => {
    const first = startDashboard({ root });
    expect(first).toMatchObject({ started: true, root });
    const second = startDashboard({ root });
    expect(second).toMatchObject({ alreadyRunning: true, pid: first.pid });
    expect(statusDashboard({ root })).toMatchObject({ running: true, pid: first.pid });
    expect(fs.existsSync(path.join(root, 'workflow-dashboard.html'))).toBe(true);

    expect(stopDashboard({ root })).toMatchObject({ stopped: true, pid: first.pid });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(statusDashboard({ root }).running).toBe(false);
  }, 10000);
});
