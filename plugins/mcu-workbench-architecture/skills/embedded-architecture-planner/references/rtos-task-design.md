# RTOS Task Design

Use this reference when the target architecture uses FreeRTOS, RT-Thread, Zephyr, CMSIS-RTOS, or a similar RTOS.

## When RTOS Is Justified

Recommend RTOS when the system has several natural blocking activities with different timing and failure behavior:

- Network or wireless stack
- UI rendering/input
- Storage writes or filesystem operations
- Sensor sampling and filtering
- Control loop with timing requirements
- OTA or long-running upgrade flow
- Multiple protocols or external modules

Do not recommend RTOS only because the code has many functions.

## Task Boundary Rules

Create tasks around timing and blocking behavior:

- Fast control loop
- Communication receive/transmit
- UI or display refresh
- Storage/logging
- Power management
- Health/watchdog supervision

Do not create one task per feature by default. Each task costs stack, scheduling overhead, and synchronization complexity.

## Task Table Template

| Task | Responsibility | Priority | Stack Basis | Wakeup | Communication | Failure Policy |
|---|---|---:|---|---|---|---|
| `task_control` | Control loop | High | Worst-case algorithm + ISR handoff | periodic timer/notification | queue from sensors | safe output on timeout |
| `task_comm` | Protocol and transport | Medium | RX/TX buffers + parser depth | queue/stream buffer | events to app | reconnect/backoff |
| `task_storage` | Flash/filesystem/log writes | Low | erase/write buffer + FS stack | queue | ack/status events | retry and mark degraded |

## IPC Selection

Use the lightest primitive that expresses ownership:

- Direct task notification: one-to-one signal or counter
- Queue: structured messages with ownership transfer
- Stream/message buffer: byte streams or variable-length frames
- Event group: wait for bit combinations
- Mutex: shared peripheral or state; keep hold time short
- Semaphore: ISR-to-task or resource counting

## Priority Rules

- Assign high priority only to latency-sensitive, bounded work.
- Keep storage, logs, cloud, and UI below real-time control.
- Avoid priority inversion with mutexes; confirm priority inheritance exists and is enabled when needed.
- Never let a high-priority task spin on a flag.

## Stack and Memory

For each task, document:

- Stack size basis
- Worst-case call depth
- Large local buffers
- Library calls such as printf, TLS, filesystem, JSON, GUI
- Runtime stack watermark validation plan

## Watchdog Integration

Use a health supervisor rather than letting every task kick the watchdog freely. Each critical task should report liveness; the supervisor kicks the hardware watchdog only when the system is coherent.
