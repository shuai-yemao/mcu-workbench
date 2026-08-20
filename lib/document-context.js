const fs = require('fs');
const path = require('path');
const { DOCUMENT_CONTEXT_CONFIG_RELATIVE_PATH, runReadmeContext } = require('./document-context-readme');
const {
  readContextStore,
  writeCollection,
  appendContextEvent,
  storeError
} = require('./document-context-store');

function requireId(value, name, prefix) {
  if (typeof value !== 'string' || !value.trim() || (prefix && !value.startsWith(prefix))) {
    throw storeError('IDENTIFIER_INVALID', `${name} 必须是 ${prefix || ''} 标识。`);
  }
  return value.trim();
}

function mutateItems(root, collection, mutate, expectedRevision) {
  const store = readContextStore(root);
  const current = store[collection];
  const items = Array.isArray(current.items) ? current.items.slice() : [];
  const result = mutate(items, current);
  const next = writeCollection(root, collection, { ...current, items: result.items }, expectedRevision);
  return { store: next, item: result.item };
}

function upsertItem(items, item, key) {
  const index = items.findIndex((entry) => entry[key] === item[key]);
  if (index < 0) return [...items, item];
  const next = items.slice();
  next[index] = item;
  return next;
}

function registerDocument(root, input = {}) {
  const document = {
    ...input,
    document_id: requireId(input.document_id, 'document_id', 'DOC-'),
    request_id: requireId(input.request_id, 'request_id', 'REQ-'),
    conversation_id: requireId(input.conversation_id, 'conversation_id', 'CONV-'),
    document_kind: input.document_kind || 'evidence',
    path: typeof input.path === 'string' && input.path.trim() ? input.path.replace(/\\/g, '/') : null,
    status: input.status || 'draft',
    authority: input.authority || 'draft',
    generated_by: input.generated_by || 'workflow-document-context',
    related_documents: Array.isArray(input.related_documents) ? input.related_documents : []
  };
  if (!document.path) throw storeError('DOCUMENT_PATH_REQUIRED', '登记文档必须包含 path。');
  const result = mutateItems(root, 'documents', (items) => ({ items: upsertItem(items, document, 'document_id'), item: document }), input.expected_revision);
  appendContextEvent(root, { event: 'document_registered', request_id: document.request_id, document_id: document.document_id, status: document.status });
  return { document, store: result.store };
}

function registerConversation(root, input = {}) {
  const conversation = {
    ...input,
    conversation_id: requireId(input.conversation_id, 'conversation_id', 'CONV-'),
    requests: Array.isArray(input.requests) ? input.requests : [],
    status: input.status || 'active'
  };
  if (!conversation.requests.length) throw storeError('REQUEST_BINDING_REQUIRED', '对话至少要绑定一个 request。');
  if (conversation.requests.some((item) => !item || typeof item.request_id !== 'string' || !item.request_id.startsWith('REQ-'))) {
    throw storeError('REQUEST_BINDING_INVALID', '对话 requests 必须包含有效 REQ-* 标识。');
  }
  const result = mutateItems(root, 'conversations', (items) => ({ items: upsertItem(items, conversation, 'conversation_id'), item: conversation }), input.expected_revision);
  appendContextEvent(root, { event: 'conversation_registered', conversation_id: conversation.conversation_id, request_ids: conversation.requests.map((item) => item.request_id) });
  return { conversation, store: result.store };
}

function registerDecision(root, input = {}) {
  const decision = {
    ...input,
    decision_id: requireId(input.decision_id, 'decision_id', 'DEC-'),
    related_requests: Array.isArray(input.related_requests) ? input.related_requests : [],
    status: input.status || 'active'
  };
  if (!decision.related_requests.length || decision.related_requests.some((id) => typeof id !== 'string' || !id.startsWith('REQ-'))) {
    throw storeError('REQUEST_BINDING_REQUIRED', '共享决策必须关联一个或多个 REQ-*。');
  }
  const result = mutateItems(root, 'decisions', (items) => ({ items: upsertItem(items, decision, 'decision_id'), item: decision }), input.expected_revision);
  appendContextEvent(root, { event: 'decision_registered', decision_id: decision.decision_id, request_ids: decision.related_requests });
  return { decision, store: result.store };
}

function writeHandoff(root, input = {}) {
  const requestId = requireId(input.request_id, 'request_id', 'REQ-');
  const conversationId = requireId(input.conversation_id, 'conversation_id', 'CONV-');
  const handoff = {
    ...input,
    request_id: requestId,
    conversation_id: conversationId,
    confirmed: Array.isArray(input.confirmed) ? input.confirmed : [],
    inferred: Array.isArray(input.inferred) ? input.inferred : [],
    unverified: Array.isArray(input.unverified) ? input.unverified : [],
    blockers: Array.isArray(input.blockers) ? input.blockers : [],
    changed_files: Array.isArray(input.changed_files) ? input.changed_files : []
  };
  const filePath = path.join(path.resolve(root || process.cwd()), '.mcu-workbench', 'document-context', 'requests', requestId, 'conversations', conversationId, 'handoff.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, filePath);
  appendContextEvent(root, { event: 'handoff_written', request_id: requestId, conversation_id: conversationId });
  return { handoff, path: filePath };
}

function promoteDraft(root, input = {}) {
  const documentId = requireId(input.document_id, 'document_id', 'DOC-');
  const requestId = requireId(input.request_id, 'request_id', 'REQ-');
  const store = readContextStore(root);
  const current = store.documents;
  const document = current.items.find((item) => item.document_id === documentId);
  if (!document || document.request_id !== requestId) throw storeError('DOCUMENT_NOT_FOUND', '找不到可提升的需求文档。');
  if (!['draft', 'pending_review'].includes(document.status)) throw storeError('DOCUMENT_NOT_PROMOTABLE', `文档当前状态不可提升：${document.status}`);
  if (['spec', 'plan'].includes(document.document_kind) && input.approved_by !== 'user') {
    throw storeError('PROMOTION_APPROVAL_REQUIRED', 'Spec/Plan 提升必须由用户确认。');
  }
  if (input.expected_revision !== undefined && input.expected_revision !== current.revision) {
    throw storeError('STALE_REVISION', '正式文档提升基于过期 revision。', { expectedRevision: input.expected_revision, actualRevision: current.revision });
  }
  if (document.document_kind === 'plan' && input.spec_status !== 'approved') throw storeError('PROMOTION_GATE_REQUIRED', 'Plan 提升前必须确认 Spec 已批准。');
  const promoted = { ...document, status: 'active', authority: 'formal', approved_by: input.approved_by || 'workflow', promoted_at: new Date().toISOString() };
  const items = current.items.map((item) => {
    if (item.request_id === requestId && item.document_kind === document.document_kind && item.document_id !== documentId && item.status === 'active') {
      return { ...item, status: 'superseded', superseded_by: documentId };
    }
    return item.document_id === documentId ? promoted : item;
  });
  const next = writeCollection(root, 'documents', { ...current, items }, current.revision);
  appendContextEvent(root, { event: 'document_promoted', request_id: requestId, document_id: documentId, status: 'active' });
  return { document: promoted, store: next };
}

function archiveRequest(root, input = {}) {
  const requestId = requireId(input.request_id, 'request_id', 'REQ-');
  const store = readContextStore(root);
  const current = store.documents;
  const items = current.items.map((item) => item.request_id === requestId ? { ...item, status: 'archived' } : item);
  const next = writeCollection(root, 'documents', { ...current, items }, current.revision);
  appendContextEvent(root, { event: 'request_archived', request_id: requestId });
  return { request_id: requestId, store: next };
}

/**
 * README 与项目文档上下文的独立 Programmatic API。
 *
 * 这里复用静态扫描的兼容实现，但只允许生成/校验 README 和文档上下文状态，
 * 不创建 Claude.md、Claude rules、架构报告或其他 Claude 分层产物。
 */
function runDocumentContext({
  action,
  root,
  write = false,
  strict = false,
  configPath = DOCUMENT_CONTEXT_CONFIG_RELATIVE_PATH
} = {}) {
  return runReadmeContext({
    action,
    root: path.resolve(root || process.cwd()),
    write,
    strict,
    configPath
  });
}

module.exports = {
  DOCUMENT_CONTEXT_CONFIG_RELATIVE_PATH,
  runDocumentContext,
  registerDocument,
  registerConversation,
  registerDecision,
  writeHandoff,
  promoteDraft,
  archiveRequest
};
