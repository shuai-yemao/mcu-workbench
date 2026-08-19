'use strict';

const fs = require('node:fs');
const path = require('node:path');

const WORKFLOW_STATE_VERSION = 1;

function createWorkflowState({
  requestId,
  projectRoot,
  specVersion = 'v1.0',
  planVersion = 'v1.0',
  taskVersion = 'v1.0',
} = {}) {
  if (!requestId || !projectRoot) {
    throw new TypeError('requestId and projectRoot are required');
  }

  return {
    request_id: requestId,
    state_version: WORKFLOW_STATE_VERSION,
    project_root: path.resolve(projectRoot),
    spec_version: specVersion,
    plan_version: planVersion,
    task_version: taskVersion,
    current_stage: 'requirements',
    current_status: 'draft',
    spec_rigor: 'full',
    spec_overlays: ['human_review', 'versioned'],
    requirements: [],
    constraints: [],
    evidence: [],
    decisions: [],
    open_questions: [],
    user_gates: {
      spec: 'awaiting_user_review',
      plan: 'awaiting_user_review',
      hard_blocker: 'none',
    },
    task_summary: {
      total: 0,
      completed: 0,
      current_task: null,
    },
    verify_summary: {
      status: 'pending',
      deviations: [],
    },
    final_review_summary: {
      status: 'pending',
      findings: [],
    },
    blockers: [],
    updated_at: new Date().toISOString(),
  };
}

function validateWorkflowState(state) {
  const errors = [];

  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { valid: false, errors: ['state must be an object'] };
  }

  if (!state.request_id || typeof state.request_id !== 'string') {
    errors.push('request_id is required');
  }
  if (state.state_version !== WORKFLOW_STATE_VERSION) {
    errors.push(`unsupported state_version: ${state.state_version}`);
  }
  if (!state.project_root || typeof state.project_root !== 'string') {
    errors.push('project_root is required');
  }
  for (const field of ['spec_version', 'plan_version', 'task_version']) {
    if (!state[field] || typeof state[field] !== 'string') {
      errors.push(`${field} is required`);
    }
  }
  for (const field of ['requirements', 'constraints', 'evidence', 'decisions', 'open_questions', 'blockers']) {
    if (!Array.isArray(state[field])) {
      errors.push(`${field} must be an array`);
    }
  }
  if (!state.user_gates || typeof state.user_gates !== 'object') {
    errors.push('user_gates must be an object');
  }
  if (!state.task_summary || typeof state.task_summary !== 'object') {
    errors.push('task_summary must be an object');
  }
  if (!state.verify_summary || typeof state.verify_summary !== 'object') {
    errors.push('verify_summary must be an object');
  }
  if (!state.final_review_summary || typeof state.final_review_summary !== 'object') {
    errors.push('final_review_summary must be an object');
  }

  return { valid: errors.length === 0, errors };
}

function readWorkflowState(filePath, { expectedRequestId } = {}) {
  const text = fs.readFileSync(filePath, 'utf8');
  let state;
  try {
    state = JSON.parse(text);
  } catch (error) {
    throw new Error(`workflow state JSON is invalid: ${error.message}`);
  }

  const result = validateWorkflowState(state);
  if (!result.valid) {
    throw new Error(`workflow state is invalid: ${result.errors.join('; ')}`);
  }
  if (expectedRequestId && state.request_id !== expectedRequestId) {
    throw new Error(`workflow state request_id mismatch: ${state.request_id}`);
  }

  return state;
}

function writeWorkflowState(filePath, state) {
  const result = validateWorkflowState(state);
  if (!result.valid) {
    throw new Error(`workflow state is invalid: ${result.errors.join('; ')}`);
  }

  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const backupPath = `${filePath}.previous`;

  fs.writeFileSync(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  try {
    if (fs.existsSync(filePath)) {
      fs.rmSync(backupPath, { force: true });
      fs.renameSync(filePath, backupPath);
    }
    fs.renameSync(temporaryPath, filePath);
    fs.rmSync(backupPath, { force: true });
  } catch (error) {
    if (!fs.existsSync(filePath) && fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, filePath);
    }
    throw error;
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

function appendWorkflowEvent(filePath, event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new TypeError('workflow event must be an object');
  }
  if (!event.event || typeof event.event !== 'string') {
    throw new TypeError('workflow event.event is required');
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const record = {
    ...event,
    recorded_at: event.recorded_at || new Date().toISOString(),
  };
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');
}

function getWorkflowStatePaths(projectRoot, requestId) {
  if (!projectRoot || !requestId) {
    throw new TypeError('projectRoot and requestId are required');
  }

  const directory = path.join(
    path.resolve(projectRoot),
    '.mcu-workbench',
    'workflows',
    requestId,
  );
  return {
    directory,
    statePath: path.join(directory, 'state.json'),
    eventsPath: path.join(directory, 'events.jsonl'),
  };
}

module.exports = {
  WORKFLOW_STATE_VERSION,
  appendWorkflowEvent,
  createWorkflowState,
  getWorkflowStatePaths,
  readWorkflowState,
  validateWorkflowState,
  writeWorkflowState,
};
