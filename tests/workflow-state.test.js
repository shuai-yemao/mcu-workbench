const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  WORKFLOW_STATE_VERSION,
  appendWorkflowEvent,
  createWorkflowState,
  readWorkflowState,
  validateWorkflowState,
  writeWorkflowState,
} = require('../lib/workflow-state');

describe('workflow-state', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-workflow-state-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('creates and validates a complete workflow state', () => {
    const state = createWorkflowState({
      requestId: 'REQ-STATE-001',
      projectRoot: root,
      specVersion: 'v1.0',
    });

    expect(state.state_version).toBe(WORKFLOW_STATE_VERSION);
    expect(validateWorkflowState(state)).toEqual({ valid: true, errors: [] });
  });

  test('rejects a request id mismatch', () => {
    const statePath = path.join(root, 'state.json');
    const state = createWorkflowState({
      requestId: 'REQ-STATE-001',
      projectRoot: root,
    });
    writeWorkflowState(statePath, state);

    expect(() => readWorkflowState(statePath, {
      expectedRequestId: 'REQ-OTHER',
    })).toThrow(/request_id mismatch/);
  });

  test('writes and reads a state snapshot', () => {
    const statePath = path.join(root, 'state.json');
    const state = createWorkflowState({
      requestId: 'REQ-STATE-002',
      projectRoot: root,
    });

    writeWorkflowState(statePath, state);

    expect(readWorkflowState(statePath)).toEqual(state);
    expect(fs.existsSync(statePath)).toBe(true);
  });

  test('rejects malformed JSON', () => {
    const statePath = path.join(root, 'state.json');
    fs.writeFileSync(statePath, '{invalid', 'utf8');

    expect(() => readWorkflowState(statePath)).toThrow(/JSON/);
  });

  test('appends JSONL events', () => {
    const eventsPath = path.join(root, 'events.jsonl');

    appendWorkflowEvent(eventsPath, {
      event: 'state-created',
      request_id: 'REQ-STATE-003',
    });
    appendWorkflowEvent(eventsPath, {
      event: 'spec-approved',
      request_id: 'REQ-STATE-003',
    });

    const events = fs.readFileSync(eventsPath, 'utf8')
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));

    expect(events).toHaveLength(2);
    expect(events[1].event).toBe('spec-approved');
  });
});
