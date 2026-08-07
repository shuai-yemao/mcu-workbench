jest.mock('child_process');

const { getMonitorPlan, resolveMonitorPlan } = require('../lib/monitor');
const cp = require('child_process');

describe('lib/monitor', () => {
  beforeEach(() => {
    cp.spawnSync.mockReset();
  });

  test('builds a serial plan with pio defaults', () => {
    const plan = getMonitorPlan({ channel: 'serial', port: 'COM5', baudRate: 9600 });
    expect(plan.channel).toBe('serial');
    expect(plan.command).toBe('pio');
    expect(plan.args).toEqual(['device', 'monitor', '-p', 'COM5', '-b', '9600']);
    expect(plan.port).toBe('COM5');
  });

  test('builds a pyserial-miniterm serial plan when forced', () => {
    const plan = getMonitorPlan({ channel: 'serial', port: 'COM5', baudRate: 115200, tool: 'pyserial-miniterm' });
    expect(plan.command).toBe('pyserial-miniterm');
    expect(plan.args).toEqual(['COM5', '115200']);
  });

  test('builds an RTT plan with the J-Link headless client', () => {
    const plan = getMonitorPlan({ channel: 'rtt' });
    expect(plan.channel).toBe('rtt');
    expect(plan.command).toBe('JLinkRTTClient');
    expect(plan.args).toEqual([]);
  });

  test('builds an SWO plan with the J-Link SWO viewer', () => {
    const plan = getMonitorPlan({ channel: 'swo' });
    expect(plan.command).toBe('JLinkSWOViewer');
  });

  test('rejects unsupported channels', () => {
    expect(() => getMonitorPlan({ channel: 'bluetooth' })).toThrow(/Unsupported monitor channel/);
  });

  test('resolves pio then pyserial-miniterm for serial at runtime', () => {
    cp.spawnSync.mockImplementation((probe) => {
      if (probe === 'where' || probe === 'which') {
        return { status: 0, stdout: 'C:\\tools\\pio\\pio.exe\n' };
      }
      return { status: 1, stdout: '' };
    });
    const plan = getMonitorPlan({ channel: 'serial', port: 'COM5' });
    expect(resolveMonitorPlan(plan)).toBe('pio');
    expect(plan.command).toBe('pio');
  });

  test('falls back to pyserial-miniterm when pio is missing', () => {
    cp.spawnSync.mockImplementation((probe, [name]) => {
      if (name === 'pio') return { status: 1, stdout: '' };
      if (name === 'pyserial-miniterm') return { status: 0, stdout: '/usr/bin/pyserial-miniterm\n' };
      return { status: 1, stdout: '' };
    });
    const plan = getMonitorPlan({ channel: 'serial', port: 'COM5' });
    expect(resolveMonitorPlan(plan)).toBe('pyserial-miniterm');
    expect(plan.command).toBe('pyserial-miniterm');
    expect(plan.args).toEqual(['COM5', '115200']);
  });

  test('returns null when no serial tool is available', () => {
    cp.spawnSync.mockReturnValue({ status: 1, stdout: '' });
    const plan = getMonitorPlan({ channel: 'serial' });
    expect(resolveMonitorPlan(plan)).toBeNull();
  });
});
