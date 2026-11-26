const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONTEXT_RELATIVE_DIRECTORY = '.mcu-workbench/document-context';
const COLLECTION_FILES = {
  project: 'project-index.json',
  documents: 'documents.json',
  conversations: 'conversations.json',
  decisions: 'decisions.json'
};

function storeError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

function resolveContextDirectory(root) {
  return path.join(path.resolve(root || process.cwd()), CONTEXT_RELATIVE_DIRECTORY);
}

function resolveCollectionPath(root, collection) {
  const file = COLLECTION_FILES[collection];
  if (!file) throw storeError('COLLECTION_UNKNOWN', `未知 Context 集合：${collection}`);
  return path.join(resolveContextDirectory(root), file);
}

function defaultCollection(collection) {
  if (collection === 'project') return { schemaVersion: 1, revision: 0, requests: [], reports: [] };
  return { schemaVersion: 1, revision: 0, items: [] };
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  let value;
  try {
    value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw storeError('STORE_JSON_INVALID', `Context 状态 JSON 无法解析：${filePath}`, { cause: error });
  }
  if (!value || typeof value !== 'object' || !Number.isInteger(value.revision) || value.revision < 0) {
    throw storeError('STORE_SCHEMA_INVALID', `Context 状态结构无效：${filePath}`);
  }
  return value;
}

function atomicWrite(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, content, 'utf8');
    fs.renameSync(temporary, filePath);
  } catch (error) {
    try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch (_) { /* preserve original error */ }
    throw storeError('STORE_WRITE_FAILED', `Context 状态写入失败：${filePath}`, { cause: error });
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readContextStore(root) {
  const store = {};
  for (const collection of Object.keys(COLLECTION_FILES)) {
    store[collection] = readJson(resolveCollectionPath(root, collection), defaultCollection(collection));
  }
  return store;
}

function writeContextStore(root, store) {
  if (!store || typeof store !== 'object') throw storeError('STORE_SCHEMA_INVALID', 'Context store 必须是对象。');
  for (const collection of Object.keys(COLLECTION_FILES)) {
    if (!store[collection]) throw storeError('STORE_SCHEMA_INVALID', `缺少 Context 集合：${collection}`);
    const content = `${JSON.stringify(store[collection], null, 2)}\n`;
    atomicWrite(resolveCollectionPath(root, collection), content);
  }
  return readContextStore(root);
}

function writeCollection(root, collection, value, expectedRevision) {
  if (!value || typeof value !== 'object') throw storeError('STORE_SCHEMA_INVALID', '集合内容必须是对象。');
  const current = readContextStore(root);
  const actual = current[collection].revision;
  if (expectedRevision !== undefined && expectedRevision !== actual) {
    throw storeError('STALE_REVISION', `Context 集合 ${collection} 的 revision 已过期。`, {
      expectedRevision,
      actualRevision: actual
    });
  }
  const next = clone(value);
  next.schemaVersion = Number.isInteger(next.schemaVersion) ? next.schemaVersion : 1;
  next.revision = actual + 1;
  atomicWrite(resolveCollectionPath(root, collection), `${JSON.stringify(next, null, 2)}\n`);
  return readContextStore(root);
}

function updateCollection(root, collection, items, expectedRevision) {
  const current = readContextStore(root);
  const currentCollection = current[collection];
  const next = { ...currentCollection, items: clone(items) };
  return writeCollection(root, collection, next, expectedRevision);
}

function appendContextEvent(root, event) {
  if (!event || typeof event !== 'object' || typeof event.event !== 'string' || !event.event.trim()) {
    throw storeError('EVENT_INVALID', 'Context 事件必须包含非空 event 字段。');
  }
  const directory = resolveContextDirectory(root);
  const filePath = path.join(directory, 'events.jsonl');
  fs.mkdirSync(directory, { recursive: true });
  const payload = { ...event, recorded_at: event.recorded_at || new Date().toISOString() };
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
  return payload;
}

function revisionOf(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

module.exports = {
  CONTEXT_RELATIVE_DIRECTORY,
  COLLECTION_FILES,
  resolveContextDirectory,
  resolveCollectionPath,
  readContextStore,
  writeContextStore,
  writeCollection,
  updateCollection,
  appendContextEvent,
  revisionOf,
  storeError
};
