const { exec } = require('child_process');

function runShellCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const failure = new Error(stderr.trim() || stdout.trim() || error.message);
        failure.code = error.code;
        failure.stdout = stdout;
        failure.stderr = stderr;
        reject(failure);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

module.exports = { runShellCommand };
