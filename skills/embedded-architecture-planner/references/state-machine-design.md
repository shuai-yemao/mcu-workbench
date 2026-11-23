# State Machine Design

Use this reference when product behavior has modes, lifecycle, protocol phases, UI flow, low-power transitions, or fault recovery.

## Good State Machine Candidates

- Boot and self-test
- Pairing/connection lifecycle
- OTA upgrade
- Battery charging
- Motor/control operation modes
- Door lock or actuator workflow
- UI page flow
- Fault handling and recovery
- Low-power entry/wakeup

## State Definition Template

For each state, define:

- Entry action
- Exit action
- Accepted events
- Ignored events
- Timeout behavior
- Fault behavior
- Next states

Example:

```text
STATE_CONNECTED
  entry: start heartbeat, enable cloud commands
  events:
    EVT_LINK_LOST -> STATE_RECONNECTING
    EVT_OTA_REQUEST -> STATE_OTA_PREPARE
    EVT_LOW_BATTERY -> STATE_LOW_POWER_PENDING
  timeout:
    heartbeat timeout -> STATE_RECONNECTING
  fault:
    storage fault -> STATE_DEGRADED
```

## Coding Guidance

Small state machine:

```c
switch (ctx->state) {
case APP_STATE_IDLE:
    if (event == APP_EVT_START) {
        app_enter_running(ctx);
    }
    break;
default:
    break;
}
```

Large state machine:

- Use a transition table or hierarchical state machine.
- Keep guards and actions small.
- Avoid scattering state changes across modules.
- Route external triggers into events.

## Anti-Patterns

- Many boolean flags replacing explicit states
- State transitions inside drivers
- Entering low power from random service code
- OTA and fault flow added as special cases in every state
- State names that describe actions instead of stable conditions

## Review Checklist

- Can a tester draw valid paths from the document?
- Are invalid events defined?
- Are timeout and fault paths explicit?
- Is reset or power loss during the state considered?
- Are persisted state and volatile state separated?
