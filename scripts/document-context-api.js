#!/usr/bin/env node
/**
 * document-context-api —— 项目 README、文档登记、会话交接与最小上下文入口。
 */

const path = require('path');
const context = require('../lib/document-context');
const { runDocumentContext } = context;
const { selectContext } = require('../lib/document-context-context-selector');

const ACTIONS = ['design', 'init', 'scan', 'sync', 'validate', 'register-document', 'register-conversation', 'register-decision', 'handoff', 'promote', 'context', 'archive'];

function parseArgs(argv) {
  const options = { action: argv[0] };
  const valueOptions = new Set(['root', 'config', 'data', 'request-id', 'conversation-id', 'document-id', 'profile', 'budget', 'base-revision', 'approved-by', 'spec-status']);
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (valueOptions.has(token.replace(/^--/, ''))) {
      const key = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[key] = argv[index + 1];
      index += 1;
    } else if (token === '--write' || token === '--strict') {
      options[token.slice(2)] = true;
    } else {
      const error = new Error(`未知参数: ${token}`);
      error.code = 'USAGE';
      throw error;
    }
  }
  return options;
}

function parseData(options) {
  if (!options.data) throw Object.assign(new Error('该 action 缺少 --data JSON。'), { code: 'USAGE' });
  try { return JSON.parse(options.data); } catch (error) { throw Object.assign(new Error('--data 不是合法 JSON。'), { code: 'USAGE', cause: error }); }
}

function requireRoot(options) {
  if (!options.root) throw Object.assign(new Error('缺少 --root'), { code: 'USAGE' });
  return path.resolve(options.root);
}

function execute(options = {}) {
  if (!ACTIONS.includes(options.action)) throw Object.assign(new Error(`action 必须是 ${ACTIONS.join('、')}`), { code: 'USAGE' });
  const root = requireRoot(options);
  const common = { root, write: Boolean(options.write), strict: Boolean(options.strict), configPath: options.config };
  if (['design', 'init', 'scan', 'sync', 'validate'].includes(options.action)) return { ...runDocumentContext({ ...common, action: options.action }) };
  if (options.action === 'register-document') return { exitCode: 0, result: context.registerDocument(root, parseData(options)) };
  if (options.action === 'register-conversation') return { exitCode: 0, result: context.registerConversation(root, parseData(options)) };
  if (options.action === 'register-decision') return { exitCode: 0, result: context.registerDecision(root, parseData(options)) };
  if (options.action === 'handoff') return { exitCode: 0, result: context.writeHandoff(root, parseData(options)) };
  if (options.action === 'promote') return { exitCode: 0, result: context.promoteDraft(root, { document_id: options.documentId, request_id: options.requestId, expected_revision: options.baseRevision === undefined ? undefined : Number(options.baseRevision), approved_by: options.approvedBy, spec_status: options.specStatus }) };
  if (options.action === 'archive') return { exitCode: 0, result: context.archiveRequest(root, { request_id: options.requestId }) };
  const result = selectContext(root, { profile: options.profile || 'project', request_id: options.requestId, conversation_id: options.conversationId, budget: options.budget === undefined ? undefined : Number(options.budget) });
  return { exitCode: 0, result };
}

function main() {
  try {
    const result = execute(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.exitCode || 0);
  } catch (error) {
    const exitCode = error.code === 'USAGE' ? 2 : 1;
    console.error(JSON.stringify({ success: false, action: null, errors: [{ code: error.code || 'RUNTIME', message: error.message }], exitCode }));
    process.exit(exitCode);
  }
}

if (require.main === module) main();

module.exports = { ACTIONS, parseArgs, execute };
