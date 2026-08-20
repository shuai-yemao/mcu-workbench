const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  readContextStore,
  writeContextStore,
  appendContextEvent,
  updateCollection
} = require('../lib/document-context-store');

describe('document-context store', () => {
  test('creates a valid empty store and rejects stale revisions', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-store-'));
    try {
      const initial = readContextStore(root);
      expect(initial.documents.revision).toBe(0);

      writeContextStore(root, initial);
      const next = updateCollection(root, 'documents', [], 0);
      expect(next.documents.revision).toBe(1);

      expect(() => updateCollection(root, 'documents', [], 0)).toThrow(expect.objectContaining({ code: 'STALE_REVISION' }));
      appendContextEvent(root, { event: 'document_registered', request_id: 'REQ-001' });
      expect(fs.readFileSync(path.join(root, '.mcu-workbench', 'document-context', 'events.jsonl'), 'utf8'))
        .toContain('document_registered');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects malformed collection JSON instead of overwriting it', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-store-invalid-'));
    try {
      const directory = path.join(root, '.mcu-workbench', 'document-context');
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, 'documents.json'), '{broken', 'utf8');
      expect(() => readContextStore(root)).toThrow(expect.objectContaining({ code: 'STORE_JSON_INVALID' }));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
