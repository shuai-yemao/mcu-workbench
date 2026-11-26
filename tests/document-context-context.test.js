const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerDocument, registerConversation, registerDecision, writeHandoff } = require('../lib/document-context');
const { selectContext } = require('../lib/document-context-context-selector');

describe('document-context selector', () => {
  test('loads the smallest valid project, request, and conversation context', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-selector-'));
    try {
      registerConversation(root, { conversation_id: 'CONV-001', requests: [{ request_id: 'REQ-001', role: 'primary' }] });
      registerDecision(root, { decision_id: 'DEC-001', related_requests: ['REQ-001', 'REQ-002'], summary: 'shared decision' });
      registerDocument(root, { document_id: 'DOC-001', request_id: 'REQ-001', conversation_id: 'CONV-001', document_kind: 'spec', path: 'REQ-001/spec.md', status: 'active', authority: 'formal' });
      registerDocument(root, { document_id: 'DOC-002', request_id: 'REQ-002', conversation_id: 'CONV-001', document_kind: 'spec', path: 'REQ-002/spec.md', status: 'active', authority: 'formal' });
      registerDocument(root, { document_id: 'DOC-003', request_id: 'REQ-001', conversation_id: 'CONV-001', document_kind: 'old', path: 'REQ-001/old.md', status: 'archived', authority: 'formal' });
      writeHandoff(root, { request_id: 'REQ-001', conversation_id: 'CONV-001', current_phase: 'review', blockers: ['one blocker'] });

      const project = selectContext(root, { profile: 'project' });
      expect(project.documents.map((item) => item.document_id)).toEqual(expect.arrayContaining(['DOC-001', 'DOC-002']));
      expect(project.documents.map((item) => item.document_id)).not.toContain('DOC-003');

      const request = selectContext(root, { profile: 'request', request_id: 'REQ-001' });
      expect(request.documents.map((item) => item.document_id)).toEqual(['DOC-001']);
      expect(request.decisions.map((item) => item.decision_id)).toContain('DEC-001');

      const conversation = selectContext(root, { profile: 'conversation', request_id: 'REQ-001', conversation_id: 'CONV-001' });
      expect(conversation.handoffs).toHaveLength(1);
      expect(conversation.documents.map((item) => item.document_id)).toEqual(['DOC-001']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('summarizes instead of returning all entries when the budget is exceeded', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-selector-budget-'));
    try {
      for (let index = 1; index <= 3; index += 1) {
        registerDocument(root, { document_id: `DOC-00${index}`, request_id: 'REQ-001', conversation_id: 'CONV-001', document_kind: 'evidence', path: `REQ-001/evidence-${index}.md`, status: 'active', authority: 'plugin', summary: 'long '.repeat(100) });
      }
      const result = selectContext(root, { profile: 'request', request_id: 'REQ-001', budget: 120 });
      expect(result.truncated).toBe(true);
      expect(result.summaries.length).toBeGreaterThan(0);
      expect(result.estimated_size).toBeLessThanOrEqual(120);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
