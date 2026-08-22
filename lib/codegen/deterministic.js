const crypto = require('crypto');

function sortGeneratedFiles(files) {
  return [...files].sort((left, right) => left.path.localeCompare(right.path));
}

function hashContent(content) {
  return crypto.createHash('sha256').update(String(content), 'utf8').digest('hex');
}

function hashGeneratedFiles(files) {
  return Object.fromEntries(sortGeneratedFiles(files).map((file) => [file.path, hashContent(file.content)]));
}

module.exports = { hashContent, hashGeneratedFiles, sortGeneratedFiles };
