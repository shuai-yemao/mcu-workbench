const fs = require('fs');
const path = require('path');
const { readContextStore, resolveContextDirectory, storeError } = require('./document-context-store');

const ACTIVE_STATUSES = new Set(['active']);

function readHandoffs(root, requestId, conversationId) {
  const directory = path.join(resolveContextDirectory(root), 'requests', requestId, 'conversations');
  const targets = conversationId ? [conversationId] : (fs.existsSync(directory) ? fs.readdirSync(directory) : []);
  return targets.map((id) => {
    const filePath = path.join(directory, id, 'handoff.json');
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (_) { return { request_id: requestId, conversation_id: id, status: 'invalid', source: filePath }; }
  }).filter(Boolean);
}

function activeDocuments(store, profile, requestId, conversationId) {
  return store.documents.items.filter((item) => {
    if (!ACTIVE_STATUSES.has(item.status)) return false;
    if (profile === 'request' || profile === 'conversation') {
      if (item.request_id !== requestId) return false;
    }
    if (profile === 'conversation' && item.conversation_id !== conversationId) return false;
    return true;
  });
}

function selectContext(root, options = {}) {
  const profile = options.profile || 'project';
  if (!['project', 'request', 'conversation'].includes(profile)) throw storeError('CONTEXT_PROFILE_INVALID', `未知 Context profile：${profile}`);
  const requestId = options.request_id;
  const conversationId = options.conversation_id;
  if ((profile === 'request' || profile === 'conversation') && (!requestId || !requestId.startsWith('REQ-'))) {
    throw storeError('REQUEST_BINDING_REQUIRED', 'request profile 必须提供 request_id。');
  }
  if (profile === 'conversation' && (!conversationId || !conversationId.startsWith('CONV-'))) {
    throw storeError('CONVERSATION_BINDING_REQUIRED', 'conversation profile 必须提供 conversation_id。');
  }
  const store = readContextStore(root);
  const documents = activeDocuments(store, profile, requestId, conversationId);
  const decisions = store.decisions.items.filter((item) => ACTIVE_STATUSES.has(item.status)
    && (!requestId || item.related_requests.includes(requestId)));
  const handoffs = profile === 'project' ? [] : readHandoffs(root, requestId, profile === 'conversation' ? conversationId : undefined);
  const context = {
    profile,
    request_id: requestId || null,
    conversation_id: conversationId || null,
    documents,
    decisions,
    handoffs,
    summaries: [],
    truncated: false,
    estimated_size: 0
  };
  const budget = Number.isFinite(options.budget) && options.budget > 0 ? Math.floor(options.budget) : Infinity;
  context.estimated_size = JSON.stringify([
    context.documents,
    context.decisions,
    context.handoffs
  ]).length;
  if (context.estimated_size <= budget) return context;

  const sourceItems = [
    ...documents.map((item) => `文档 ${item.document_id}: ${item.path} [${item.status}]`),
    ...decisions.map((item) => `决策 ${item.decision_id}: ${item.summary || '共享决策'} [${item.status}]`),
    ...handoffs.map((item) => `交接 ${item.conversation_id}: ${item.current_phase || '未确认'}`)
  ];
  context.documents = [];
  context.decisions = [];
  context.handoffs = [];
  context.summaries = sourceItems.slice(0, 20);
  context.truncated = true;
  const compact = context.summaries.join('\n');
  const summaryBudget = Math.max(1, budget);
  context.summaries = [compact.slice(0, summaryBudget)];
  context.estimated_size = context.summaries[0].length;
  return context;
}

module.exports = {
  ACTIVE_STATUSES,
  selectContext,
  readHandoffs
};
