const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  registerDocument,
  registerConversation,
  registerDecision,
  writeHandoff,
  promoteDraft,
  archiveRequest
} = require('../lib/document-context');
const { readContextStore } = require('../lib/document-context-store');

describe('document-context lifecycle', () => {
  test('binds documents to requests and conversations, promotes with revision checks, and archives', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-lifecycle-'));
    try {
      registerConversation(root, {
        conversation_id: 'CONV-001',
        requests: [{ request_id: 'REQ-001', role: 'primary' }]
      });
      registerDecision(root, {
        decision_id: 'DEC-001',
        related_requests: ['REQ-001', 'REQ-002'],
        status: 'active'
      });
      registerDocument(root, {
        document_id: 'DOC-001',
        request_id: 'REQ-001',
        conversation_id: 'CONV-001',
        document_kind: 'spec',
        path: '00_Docs/04_需求文档/REQ-001/spec.md',
        status: 'pending_review',
        authority: 'draft',
        base_revision: 0
      });
      registerDocument(root, {
        document_id: 'DOC-002',
        request_id: 'REQ-001',
        conversation_id: 'CONV-001',
        document_kind: 'spec',
        path: '00_Docs/04_需求文档/REQ-001/spec-v2.md',
        status: 'pending_review',
        authority: 'draft',
        base_revision: 1
      });
      expect(() => promoteDraft(root, {
        document_id: 'DOC-002',
        request_id: 'REQ-001',
        expected_revision: 2
      })).toThrow(expect.objectContaining({ code: 'PROMOTION_APPROVAL_REQUIRED' }));
      writeHandoff(root, {
        request_id: 'REQ-001',
        conversation_id: 'CONV-001',
        base_revision: 0,
        current_phase: 'spec_review',
        confirmed: ['scope'],
        blockers: [],
        next_handoff: 'review'
      });

      const promoted = promoteDraft(root, {
        document_id: 'DOC-001',
        request_id: 'REQ-001',
        expected_revision: 2,
        approved_by: 'user'
      });
      expect(promoted.document.status).toBe('active');
      expect(fs.existsSync(path.join(root, '.mcu-workbench', 'document-context', 'requests', 'REQ-001', 'conversations', 'CONV-001', 'handoff.json'))).toBe(true);

      expect(() => promoteDraft(root, {
        document_id: 'DOC-001',
        request_id: 'REQ-001',
        expected_revision: 1,
        approved_by: 'user'
      })).toThrow(expect.objectContaining({ code: 'DOCUMENT_NOT_PROMOTABLE' }));

      archiveRequest(root, { request_id: 'REQ-001' });
      const store = readContextStore(root);
      expect(store.documents.items[0].status).toBe('archived');
      expect(store.decisions.items[0].related_requests).toEqual(['REQ-001', 'REQ-002']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
