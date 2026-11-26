# Event-Driven Design

Use this reference when modules need asynchronous coordination without direct coupling.

## When To Use Events

Use events when:

- Connection, UI, storage, OTA, and sensors interact asynchronously.
- Several modules react to one product fact.
- Vendor callbacks need to be moved into a safe execution context.
- The system needs traceable lifecycle transitions.

Avoid events when a direct call is clearer and the dependency is stable.

## Event Naming

Use domain-prefixed names:

```text
EVT_BUTTON_SHORT_PRESS
EVT_BUTTON_LONG_PRESS
EVT_NET_CONNECTED
EVT_NET_DISCONNECTED
EVT_SENSOR_SAMPLE_READY
EVT_STORAGE_WRITE_DONE
EVT_OTA_START
EVT_OTA_VERIFY_FAILED
EVT_POWER_LOW_BATTERY
EVT_FAULT_OVER_CURRENT
```

## Event Table Template

| Event | Publisher | Subscribers | Payload | Dispatch Context | Queue Policy | Log Level |
|---|---|---|---|---|---|---|
| `EVT_NET_CONNECTED` | comm service | app, ota, log | ip, rssi | event task | drop duplicate | info |
| `EVT_FAULT_OVER_CURRENT` | driver/control | app_fault, log | channel, value | high-priority queue | never drop | error |

## Queue Policies

Define behavior before implementation:

- Drop duplicate
- Keep latest
- Backpressure publisher
- Count lost events
- Escalate to fault

Fault and safety events should not silently drop.

## Dispatch Context

Document where handlers run:

- Main loop
- Dedicated event task
- Specific service task
- ISR deferred callback

Handler rules:

- Keep handlers bounded.
- Do not block in generic event dispatch unless explicitly allowed.
- Do not call back into publisher synchronously.
- Log important transitions with event ID and state.

## Debugging Requirements

Event-driven systems need tracing:

- Event ID
- Timestamp or tick
- Publisher
- Target/handler
- Queue depth or overflow count
- Current app state

Without this, field issues become hard to reproduce.
