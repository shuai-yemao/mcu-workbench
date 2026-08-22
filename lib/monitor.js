const { spawnSync } = require('child_process');
const { spawnSession, waitForExit } = require('./session-runner');

function getMonitorPlan(options) {
  const { channel = 'serial', port = 'COM3', baudRate = 115200, rttChannel = 0, chip, tool } = options;

  if (channel === 'serial') {
    const command = tool || 'pio';
    return {
      channel,
      command,
      args: serialArgs(command, port, baudRate),
      port,
      baudRate
    };
  }

  if (channel === 'rtt') {
    return {
      channel,
      command: tool || 'JLinkRTTClient',
      args: [],
      rttChannel
    };
  }

  if (channel === 'swo') {
    return { channel, command: tool || 'JLinkSWOViewer', args: [] };
  }

  throw new Error(`Unsupported monitor channel: ${channel} (expected serial, rtt or swo)`);
}

function serialArgs(command, port, baudRate) {
  if (command === 'pyserial-miniterm') return [port, String(baudRate)];
  return ['device', 'monitor', '-p', port, '-b', String(baudRate)];
}

function findExecutable(name) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(probe, [name], { windowsHide: true, encoding: 'utf8' });
  if (result.status !== 0 || !result.stdout) return null;
  const lines = result.stdout.split(/\r?\n/).filter(Boolean);
  return lines[0] || null;
}

function resolveMonitorPlan(plan) {
  if (plan.channel === 'serial') {
    const forcedTool = plan.command !== 'pio' && plan.command !== 'pyserial-miniterm';
    if (forcedTool) return findExecutable(plan.command);

    if (findExecutable('pio')) {
      plan.command = 'pio';
      plan.args = serialArgs('pio', plan.port, plan.baudRate);
      return 'pio';
    }
    if (findExecutable('pyserial-miniterm')) {
      plan.command = 'pyserial-miniterm';
      plan.args = serialArgs('pyserial-miniterm', plan.port, plan.baudRate);
      return 'pyserial-miniterm';
    }
    return null;
  }

  return findExecutable(plan.command);
}

async function startMonitorSession(options) {
  const plan = getMonitorPlan(options);
  const cwd = options.cwd || process.cwd();
  const logger = options.logger || console.log;

  const executable = resolveMonitorPlan(plan);
  if (!executable) {
    const hint = plan.channel === 'serial'
      ? 'Install PlatformIO (`pio`) or Python pyserial (`pyserial-miniterm`).'
      : `Install the SEGGER J-Link software package to provide ${plan.command}.`;
    throw new Error(`No monitor tool found for channel '${plan.channel}'. ${hint}`);
  }

  logger(`Starting monitor: ${executable} ${plan.args.join(' ')}`);
  logger('Press Ctrl+C to stop.');
  const session = spawnSession({ command: executable, args: plan.args, cwd, stdio: 'inherit' });
  const result = await waitForExit(session);
  return { success: true, plan, result };
}

module.exports = { getMonitorPlan, resolveMonitorPlan, startMonitorSession };
