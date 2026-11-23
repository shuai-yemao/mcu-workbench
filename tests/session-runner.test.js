const { EventEmitter } = require('events');

jest.mock('child_process');

const { spawnSession, waitForExit, delay } = require('../lib/session-runner');
const cp = require('child_process');

function fakeChild(pid = 4242) {
  const child = new EventEmitter();
  child.pid = pid;
  child.exitCode = null;
  child.signalCode = null;
  child.kill = jest.fn(() => true);
  const originalEmit = child.emit.bind(child);
  child.emit = (event, code, signal) => {
    if (event === 'exit') {
      child.exitCode = code;
      child.signalCode = signal;
    }
    return originalEmit(event, code, signal);
  };
  return child;
}

describe('lib/session-runner', () => {
  beforeEach(() => {
    cp.spawn.mockReset();
  });

  test('spawns a process with stdio inherit and reports exit', () => {
    const child = fakeChild();
    cp.spawn.mockReturnValue(child);
    const onExit = jest.fn();
    const session = spawnSession({ command: 'gdb', args: ['-ex', 'target remote :3333'], onExit });

    expect(cp.spawn).toHaveBeenCalledWith(
      'gdb',
      ['-ex', 'target remote :3333'],
      expect.objectContaining({ stdio: 'inherit', windowsHide: true })
    );
    expect(session.pid).toBe(child.pid);

    child.emit('exit', 0, null);
    expect(onExit).toHaveBeenCalledWith({ code: 0, signal: null });
  });

  test('waitForExit resolves when the child has already exited', async () => {
    const child = fakeChild();
    child.exitCode = 0;
    cp.spawn.mockReturnValue(child);

    const session = spawnSession({ command: 'gdb' });
    await expect(waitForExit(session)).resolves.toEqual({ code: 0, signal: null });
  });

  test('waitForExit resolves on a later exit event', async () => {
    const child = fakeChild();
    cp.spawn.mockReturnValue(child);

    const session = spawnSession({ command: 'gdb' });
    const pending = waitForExit(session);
    child.emit('exit', 5, 'SIGTERM');
    await expect(pending).resolves.toEqual({ code: 5, signal: 'SIGTERM' });
  });

  test('stop() terminates the child process tree', async () => {
    const child = fakeChild();
    const killer = fakeChild(9000);
    cp.spawn.mockImplementation((command) => {
      if (command === 'taskkill') {
        setImmediate(() => {
          child.emit('exit', 0, null);
          killer.emit('exit', 0, null);
        });
        return killer;
      }
      return child;
    });

    const session = spawnSession({ command: 'gdb' });
    const result = await session.stop();

    if (process.platform === 'win32') {
      expect(cp.spawn).toHaveBeenCalledWith('taskkill', expect.any(Array), expect.anything());
      expect(result.code).toBe(0);
    } else {
      expect(child.kill).toHaveBeenCalledWith('SIGTERM');
    }
  });

  test('stop() resolves immediately for an already-exited process', async () => {
    const child = fakeChild();
    child.exitCode = 1;
    cp.spawn.mockReturnValue(child);

    const session = spawnSession({ command: 'gdb' });
    await expect(session.stop()).resolves.toEqual({ code: 1, signal: null });
  });

  test('reports spawn errors through onError', () => {
    const child = fakeChild();
    cp.spawn.mockReturnValue(child);
    const onError = jest.fn();
    spawnSession({ command: 'missing-tool', onError });
    const error = new Error('ENOENT');
    child.emit('error', error);
    expect(onError).toHaveBeenCalledWith(error);
  });
});
