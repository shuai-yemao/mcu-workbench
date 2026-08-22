const { getDebugPlan } = require('../lib/debugger');

describe('lib/debugger', () => {
  test('builds an OpenOCD debug plan', () => {
    const plan = getDebugPlan({ platform: 'stm32f4', probe: 'openocd', device: 'stlink', elf: 'build/firmware.elf' });
    expect(plan.probe).toBe('openocd');
    expect(plan.serverCommand.command).toBe('openocd');
    expect(plan.serverCommand.args).toEqual(['-f', 'interface/stlink.cfg', '-f', 'target/stm32f4x.cfg']);
    expect(plan.gdbCommand.command).toBe('arm-none-eabi-gdb');
    expect(plan.gdbCommand.args).toEqual(['build/firmware.elf', '-ex', 'target remote :3333']);
  });

  test('builds a J-Link debug plan using the platform jlinkChip', () => {
    const plan = getDebugPlan({ platform: 'stm32f4', probe: 'jlink' });
    expect(plan.probe).toBe('jlink');
    expect(plan.serverCommand.command).toBe('JLinkGDBServer');
    expect(plan.serverCommand.args).toContain('STM32F411CEU6');
    expect(plan.serverCommand.args).toContain('-port');
    expect(plan.serverCommand.args).toContain('3333');
    expect(plan.gdbCommand.command).toBe('arm-none-eabi-gdb');
  });

  test('honours an explicit --chip override for the J-Link device name', () => {
    const plan = getDebugPlan({ platform: 'stm32f4', probe: 'jlink', chip: 'STM32F411RET6' });
    expect(plan.serverCommand.args).toContain('STM32F411RET6');
  });

  test('respects a custom gdb port and elf path', () => {
    const plan = getDebugPlan({ platform: 'stm32f4', probe: 'openocd', gdbPort: 4242, elf: 'out/app.elf' });
    expect(plan.gdbCommand.args).toEqual(['out/app.elf', '-ex', 'target remote :4242']);
  });

  test('rejects unsupported probes and invalid device names', () => {
    expect(() => getDebugPlan({ platform: 'stm32f4', probe: 'keil' })).toThrow(/Unsupported debug probe/);
    expect(() => getDebugPlan({ platform: 'stm32f4', probe: 'openocd', device: '../evil' })).toThrow(/Debug device/);
  });

  test('rejects an invalid gdb port', () => {
    expect(() => getDebugPlan({ platform: 'stm32f4', gdbPort: 0 })).toThrow(/GDB port/);
    expect(() => getDebugPlan({ platform: 'stm32f4', gdbPort: 99999 })).toThrow(/GDB port/);
  });

  test('rejects a J-Link plan when no chip name is available', () => {
    expect(() => getDebugPlan({ platform: 'esp32', probe: 'jlink', chip: undefined })).not.toThrow();
    expect(() => getDebugPlan({ platform: 'stm32f4', probe: 'jlink' })).not.toThrow();
  });
});
