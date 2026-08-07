const { getPlatformConfig } = require('./platform');
const { spawnSession, waitForExit, delay } = require('./session-runner');

function getDebugPlan(options) {
  const {
    platform,
    probe = 'openocd',
    device = 'stlink',
    chip,
    elf = 'build/firmware.elf',
    gdbPort = 3333
  } = options;

  if (!platform) throw new Error('Platform is required');
  const config = getPlatformConfig(platform);

  if (!Number.isInteger(Number(gdbPort)) || Number(gdbPort) < 1 || Number(gdbPort) > 65535) {
    throw new Error('GDB port must be an integer between 1 and 65535');
  }

  const gdbArgs = [elf, '-ex', `target remote :${gdbPort}`];

  if (probe === 'jlink') {
    const jlinkChip = chip || config.jlinkChip;
    if (!jlinkChip) {
      throw new Error('J-Link chip name is required (--chip or platform jlinkChip)');
    }
    return {
      probe: 'jlink',
      serverCommand: {
        command: 'JLinkGDBServer',
        args: ['-device', jlinkChip, '-if', 'SWD', '-speed', '4000', '-port', String(gdbPort)]
      },
      gdbCommand: { command: 'arm-none-eabi-gdb', args: gdbArgs }
    };
  }

  if (probe !== 'openocd') {
    throw new Error(`Unsupported debug probe: ${probe} (expected openocd or jlink)`);
  }
  if (!device || !/^[a-z0-9_-]+$/i.test(device)) {
    throw new Error('Debug device must contain only letters, numbers, hyphens, or underscores');
  }

  return {
    probe: 'openocd',
    serverCommand: {
      command: 'openocd',
      args: ['-f', `interface/${device}.cfg`, '-f', `target/${config.openOcdTarget}.cfg`]
    },
    gdbCommand: { command: 'arm-none-eabi-gdb', args: gdbArgs }
  };
}

async function startDebugSession(options) {
  const plan = getDebugPlan(options);
  const cwd = options.cwd || process.cwd();
  const logger = options.logger || console.log;
  const serverWait = options.serverWait === undefined ? 1500 : options.serverWait;

  logger(`Starting ${plan.probe} GDB server: ${plan.serverCommand.command} ${plan.serverCommand.args.join(' ')}`);
  const server = spawnSession({
    command: plan.serverCommand.command,
    args: plan.serverCommand.args,
    cwd,
    stdio: 'ignore',
    onExit: ({ code, signal }) => {
      if (options.onServerExit) options.onServerExit({ code, signal });
    }
  });

  await delay(serverWait);

  logger(`Starting GDB: ${plan.gdbCommand.command} ${plan.gdbCommand.args.join(' ')}`);
  logger('GDB session attached to your terminal. Quit GDB (q) to end the session.');
  const gdb = spawnSession({
    command: plan.gdbCommand.command,
    args: plan.gdbCommand.args,
    cwd,
    stdio: 'inherit'
  });

  const gdbResult = await waitForExit(gdb);
  logger(`GDB exited (code=${gdbResult.code}, signal=${gdbResult.signal || 'none'}).`);
  await server.stop();

  return { success: true, plan, gdbResult };
}

module.exports = { getDebugPlan, startDebugSession };
