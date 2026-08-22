const { spawn } = require('child_process');

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForExit(session) {
  return new Promise((resolve) => {
    const child = session.child;
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve({ code: child.exitCode, signal: child.signalCode });
      return;
    }
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

function killTree(child) {
  return new Promise((resolve) => {
    const done = () => resolve({ code: child.exitCode, signal: child.signalCode });
    if (child.exitCode !== null || child.signalCode !== null) {
      done();
      return;
    }
    child.once('exit', done);
    if (process.platform === 'win32') {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      killer.on('error', () => {
        try {
          child.kill();
        } catch (_error) {
          done();
        }
      });
    } else {
      try {
        child.kill('SIGTERM');
      } catch (_error) {
        done();
      }
      setTimeout(done, 50);
    }
  });
}

function spawnSession(options) {
  const {
    command,
    args = [],
    cwd,
    stdio = 'inherit',
    onExit,
    onError
  } = options;

  const child = spawn(command, args, { cwd, stdio, windowsHide: true });

  child.on('error', (error) => {
    if (onError) onError(error);
  });

  child.on('exit', (code, signal) => {
    if (onExit) onExit({ code, signal });
  });

  let stopped = false;
  return {
    command,
    args,
    pid: child.pid,
    child,
    async stop() {
      if (stopped) return { code: child.exitCode, signal: child.signalCode };
      stopped = true;
      if (child.exitCode !== null || child.signalCode !== null) {
        return { code: child.exitCode, signal: child.signalCode };
      }
      return killTree(child);
    }
  };
}

module.exports = { spawnSession, waitForExit, delay };
