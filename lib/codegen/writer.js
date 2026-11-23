const fs = require('fs').promises;
const path = require('path');

function writerError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function writeGeneratedFiles(files, outputDir, { force = false } = {}) {
  const written = [];
  const root = path.resolve(outputDir);
  const targets = files.map((file) => ({ ...file, target: path.resolve(root, file.path) }));
  for (const file of targets) {
    if (!file.target.startsWith(`${root}${path.sep}`)) {
      throw writerError(`Generated path escapes output directory: ${file.path}`, 'INTERNAL');
    }
    try {
      await fs.access(file.target);
      if (!force) {
        throw writerError(`Refusing to overwrite existing file: ${file.target}. Use --force after review.`, 'COLLISION');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  for (const file of targets) {
    await fs.mkdir(path.dirname(file.target), { recursive: true });
    await fs.writeFile(file.target, file.content, 'utf8');
    written.push(file.target);
  }
  return written;
}

module.exports = { writeGeneratedFiles };
