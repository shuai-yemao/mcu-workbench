# Clarification Patterns

Seed catalog of common ambiguities in embedded customer requirements, with example option sets. Use these as starting points and adapt the labels, descriptions, and tradeoffs to the specific feature.

The patterns below are generic. In a real run, replace bracketed placeholders with concrete content from the requirement.

## How to use this file

1. During Phase 2, match each detected ambiguity to one or more patterns below.
2. Borrow the option structure, then rewrite every option so it is specific to the feature.
3. Keep each menu to 2-4 options.
4. Mark one option as recommended only when there is a real engineering reason.

---

## Category A - Lifecycle And Default State

### A1. Power-on / boot behavior

Use when the requirement says the feature exists but does not define what happens after power-on.

```yaml
question: "What state should this feature enter after power-on?"
options:
  - label: "Auto start"
    description: "Enter the active working state immediately after boot, without user action."
    tradeoff: "Good for always-on devices; may waste power on battery devices."
    recommended_when: "always-on product"
  - label: "Wait user"
    description: "Boot into idle and start only after a button, scan, app action, or command."
    tradeoff: "Saves power and avoids surprise behavior; first action takes longer."
    recommended_when: "battery-powered or user-operated product"
  - label: "Restore last"
    description: "Restore the last pre-power-loss state."
    tradeoff: "Better continuity; requires persistence policy."
    recommended_when: "user-facing appliance"
  - label: "Factory default"
    description: "Return to a known default state every boot."
    tradeoff: "Predictable behavior; user changes may not survive reboot."
```

### A2. Start trigger when several are possible

Use when a feature could start from a button, schedule, upstream command, sensor threshold, or UI entry.

```yaml
question: "Which event is allowed to start the feature?"
options:
  - label: "Manual only"
    description: "Only user action can start it."
  - label: "Auto only"
    description: "Only system events can start it."
  - label: "Both"
    description: "Manual and automatic triggers are both accepted; arrival order decides."
    recommended_when: "requirement is unclear and both paths are useful"
  - label: "Manual wins"
    description: "Both are accepted, but user action interrupts or overrides automatic flow."
```

### A3. Stop / cancel behavior

```yaml
question: "How should the feature stop while it is running?"
options:
  - label: "Hard stop"
    description: "Stop immediately and discard unfinished work."
  - label: "Graceful"
    description: "Finish the current safe cycle, then return to idle."
    recommended_when: "mechanical or multi-step operation"
  - label: "Confirm"
    description: "Ask the user to confirm before stopping."
  - label: "No cancel"
    description: "Once started, the operation must finish its full cycle."
```

### A4. Resume after interruption

```yaml
question: "How should the feature recover after power loss or abnormal reset?"
options:
  - label: "Restart"
    description: "Treat it as a fresh boot and discard progress."
  - label: "Resume"
    description: "Continue from the saved checkpoint."
  - label: "Ask user"
    description: "Prompt the user to resume or restart."
    recommended_when: "the interrupted work is user-visible"
```

---

## Category B - Conflict Resolution

### B1. Two triggers arrive at the same time

```yaml
question: "Which event wins when two triggers arrive at nearly the same time?"
options:
  - label: "User wins"
    description: "Button, UI, or app action interrupts automatic flow."
    recommended_when: "user control is safety-relevant"
  - label: "Auto wins"
    description: "Automatic flow finishes first; user action is queued or ignored."
  - label: "First wins"
    description: "The earliest event owns the flow until it finishes or releases ownership."
  - label: "Safe wins"
    description: "The event that leads to the safer device state wins."
```

### B2. Conflicting parameter sources

```yaml
question: "What wins when local settings and remote settings conflict?"
options:
  - label: "Remote"
    description: "Remote command overwrites local setting."
  - label: "Local"
    description: "Local setting refuses remote overwrite until the user unlocks it."
  - label: "Newest"
    description: "The latest timestamp wins."
  - label: "Locked"
    description: "A locked local state rejects remote changes until explicitly unlocked."
```

---

## Category C - Failure And Error UX

### C1. Operation timeout

```yaml
question: "What should happen after an operation times out?"
options:
  - label: "Retry quiet"
    description: "Retry in the background N times before showing an error."
  - label: "Show error"
    description: "Show a user-visible failure on the first timeout."
    recommended_when: "user-facing operation"
  - label: "Hard fail"
    description: "Stop immediately and wait for manual intervention."
    recommended_when: "safety-critical operation"
  - label: "Degrade"
    description: "Switch to a limited-function mode and continue."
```

### C2. Sensor or input out of range

```yaml
question: "What should happen when an input value is out of range?"
options:
  - label: "Ignore read"
    description: "Keep the last valid value and record/log the abnormal sample."
  - label: "Fault state"
    description: "Stop dependent behavior and surface a fault."
    recommended_when: "the input is primary for the feature"
  - label: "Safe default"
    description: "Replace with a safe default value and continue."
  - label: "Ask user"
    description: "Ask the user to inspect or confirm before continuing."
```

### C3. Upstream communication failure

```yaml
question: "What should the device do when the upstream link is disconnected?"
options:
  - label: "Local mode"
    description: "Keep working locally and cache data until the link recovers."
    recommended_when: "industrial or field device"
  - label: "Stop"
    description: "Disable features that depend on upstream communication."
  - label: "Wait link"
    description: "Show disconnected status and wait for recovery."
  - label: "Reconnect"
    description: "Retry connection and pause dependent actions while reconnecting."
```

---

## Category D - UI And Presentation

### D1. Menu or scene entry point

```yaml
question: "Where should the user enter the new feature?"
options:
  - label: "Main menu"
    description: "Add a standalone entry in the main menu."
  - label: "Sub menu"
    description: "Place it under an existing related submenu."
  - label: "Hotkey"
    description: "Bind it directly to a physical key or shortcut."
  - label: "Auto show"
    description: "No persistent entry; show it automatically when conditions match."
```

### D2. Idle display content

```yaml
question: "What should the screen show when this feature is idle?"
options:
  - label: "Live data"
    description: "Show the primary real-time value."
  - label: "Summary"
    description: "Show device status such as connection, mode, or time."
  - label: "Brand"
    description: "Show logo, clock, or screensaver-style content."
  - label: "Screen off"
    description: "Turn the screen off to save power."
```

### D3. Error message wording

Use when the requirement says an error is shown but does not define the text. Do not invent wording silently.

```yaml
question: "Which wording style should be used for the user-visible error?"
options:
  - label: "Service"
    description: "\"Sensor error. Please contact service.\""
  - label: "Friendly"
    description: "\"Cannot read the sensor. Please check the connection.\""
  - label: "Code"
    description: "\"ERR-SENS-01\" plus a fault code suitable for engineering mode."
  - label: "Icon only"
    description: "No text; use icon, LED color, or buzzer pattern only."
```

---

## Category E - Ownership And Module Placement

### E1. Which module owns the behavior

```yaml
question: "Which module should own the new behavior?"
options:
  - label: "Module A"
    description: "Extend an existing module because it already owns the related lifecycle."
  - label: "Module B"
    description: "Extend another existing module because it owns the related data."
  - label: "New module"
    description: "Create a focused module under App/ and keep existing modules as providers."
    recommended_when: "behavior is self-contained"
  - label: "Refactor"
    description: "Extract shared logic first, then add the new feature on top."
```

### E2. Periodic processing hook

```yaml
question: "Where should periodic processing run?"
options:
  - label: "Main tick"
    description: "Run from the existing main-loop or 1 ms system tick."
  - label: "RTOS task"
    description: "Create a dedicated task with its own priority and stack."
  - label: "Event only"
    description: "Do not poll; process only incoming events/messages."
  - label: "Timer ISR"
    description: "Drive it from a hardware timer callback."
```

---

## Category F - Persistence And State Recovery

### F1. What persists across reboot

```yaml
question: "Which states should survive reboot?"
multiSelect: true
options:
  - label: "Settings"
    description: "User-edited settings such as threshold, mode, brightness, or volume."
  - label: "Counters"
    description: "Runtime counters, usage duration, or operation counts."
  - label: "Fault log"
    description: "Historical fault records."
  - label: "Progress"
    description: "Checkpoint for unfinished work."
```

### F2. First-boot default

```yaml
question: "What default should be used on first boot when no history exists?"
options:
  - label: "Conservative"
    description: "Use the safest default for the device."
    recommended_when: "safety-relevant feature"
  - label: "Experience"
    description: "Use the default that gives the best first-run user experience."
  - label: "Guided"
    description: "Force the user to complete setup before using the feature."
  - label: "Factory"
    description: "Use factory-programmed calibration or production settings."
```

---

## Category G - Performance And Scheduling

### G1. Update rate tradeoff

```yaml
question: "What update rate should this feature target?"
options:
  - label: "High"
    description: "20 Hz or higher; responsive but consumes more CPU/power."
  - label: "Medium"
    description: "5-10 Hz; balanced for many UI/status features."
    recommended_when: "requirement does not claim real-time behavior"
  - label: "Low"
    description: "Around 1 Hz; saves power for slowly changing values."
  - label: "On change"
    description: "Update only when the input changes."
```

### G2. Latency vs consistency

```yaml
question: "Which should be prioritized: fast response or consistent data?"
options:
  - label: "Low latency"
    description: "Respond immediately, even if values are still being validated."
  - label: "Consistency"
    description: "Wait until data is fully validated before showing or using it."
    recommended_when: "regulated, audited, or safety-relevant feature"
  - label: "Tiered"
    description: "Use fast data for UI preview and validated data for logs/control."
```

---

## Category H - Scope Boundaries

### H1. What is in scope for this iteration

```yaml
question: "Which adjacent behaviors are included in this iteration?"
multiSelect: true
options:
  - label: "Core only"
    description: "Implement only the main happy path."
  - label: "Settings"
    description: "Include user-configurable settings UI."
  - label: "History"
    description: "Include log/history browsing."
  - label: "Factory"
    description: "Include production or factory-test entry points."
```

### H2. Backward compatibility

```yaml
question: "How should the new behavior affect older configs or protocol versions?"
options:
  - label: "Compatible"
    description: "Old configs and protocol remain usable."
  - label: "Warn"
    description: "Old behavior still works, but user or host is prompted to upgrade."
  - label: "Force upgrade"
    description: "Old versions are blocked because the new feature needs new semantics."
  - label: "Dual path"
    description: "Old and new paths coexist and are selected by config/version."
```

---

## Category I - Downstream Agent Development Mode

Ask this once for every handoff document unless the user already specified the expected development style. This is not an application-logic ambiguity and does not count against the 4-question clarification cap. Record the answer in the document's "Agent Development Mode" section with the stable `mode_id`.

Each `mode_id`'s plain writing guide lives in `references/dev-modes.md`. The chosen mode shapes §2 Development Approach, file ownership wording, §9.1 task grouping, and §10 next-agent instructions.

### I1. Preferred downstream development mode

```yaml
question: "Which agent development mode should later agents use after reading this document?"
options:
  - label: "Serial safe"
    mode_id: "serial_pipeline"
    description: "One main agent executes in order: boundary check, implement smallest slice, build, verify, then continue."
    tradeoff: "Slowest but safest; best when production code, generated code, or hardware risk is high."
    recommended_when: "default for embedded production firmware"
  - label: "Parallel read"
    mode_id: "parallel_exploration"
    description: "Use parallel read-only explorer agents to inspect modules, similar features, build flow, and boundaries; one main agent still writes."
    tradeoff: "Faster project understanding while keeping write conflicts low."
    recommended_when: "large or unfamiliar firmware project"
  - label: "Parallel write"
    mode_id: "parallel_implementation"
    description: "Split implementation across worker agents with disjoint file ownership, then integrate and verify."
    tradeoff: "Fastest when the module/file boundaries are already clear; higher merge and coordination risk."
    recommended_when: "well-scoped feature with independent files"
  - label: "Review first"
    mode_id: "review_gate"
    description: "A reviewer/verifier agent must inspect the logic document and project boundaries before any implementation starts."
    tradeoff: "Adds a gate but catches unsafe assumptions early."
    recommended_when: "safety-critical behavior or unclear ownership"
```

### I2. Output artifact preference

Ask this once for every handoff document unless the user already asked for a specific output format. This is not an application-logic ambiguity and does not count against the 4-question clarification cap.

```yaml
question: "Which output files should this skill generate?"
options:
  - label: "MD only"
    artifact_id: "md_only"
    description: "Generate only the AI-facing application-logic handoff Markdown."
    tradeoff: "Fastest and least noisy; best when the next reader is a coding agent."
    recommended_when: "default"
  - label: "MD + HTML"
    artifact_id: "md_plus_review_html"
    description: "Generate the Markdown plus a human-facing review HTML."
    tradeoff: "More useful for human sign-off, but takes more output work and creates another artifact."
    recommended_when: "the user asks for review, visual summary, HTML, or a human-facing page"
```

---

## Anti-patterns to avoid

- One-option menus. Reframe the question or skip the clarification.
- Five-plus option menus. Split the question or merge similar choices.
- Technical-jargon labels. Labels should be user-readable and short.
- Inventing hardware to make an option work. Mark hardware-dependent choices as `deferred`.
- Skipping clarification because "the answer is obvious".
- Asking more than 4 questions in one round.

## Format reminder

When delivering via a structured question tool, each question becomes one entry in `questions[]`. The `header` field is the short label. Each option is `{label, description}`. Set `multiSelect: true` for "which of these are in scope" questions.

When delivering inline, use this shape:

```text
**[Header] Question text**
1. Option A - description. Recommended when ...
2. Option B - description.
3. Option C - description.
Please reply with the number. For multi-select, reply like: 1,3.
```
