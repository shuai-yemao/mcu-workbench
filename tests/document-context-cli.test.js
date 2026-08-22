const fs = require('fs');
const os = require('os');
const path = require('path');
const { execute } = require('../scripts/document-context-api');

describe('document-context CLI actions', () => {
  test('registers documents and selects request context through structured actions', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-cli-'));
    try {
      const registered = execute({
        action: 'register-document', root,
        data: JSON.stringify({ document_id: 'DOC-001', request_id: 'REQ-001', conversation_id: 'CONV-001', document_kind: 'spec', path: 'REQ-001/spec.md', status: 'active' })
      });
      expect(registered.exitCode).toBe(0);
      const selected = execute({ action: 'context', root, profile: 'request', requestId: 'REQ-001' });
      expect(selected.exitCode).toBe(0);
      expect(selected.result.documents[0].document_id).toBe('DOC-001');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects missing root and unsupported actions with usage exit code', () => {
    expect(() => execute({ action: 'context' })).toThrow(expect.objectContaining({ code: 'USAGE' }));
    expect(() => execute({ action: 'unknown', root: process.cwd() })).toThrow(expect.objectContaining({ code: 'USAGE' }));
  });
});
