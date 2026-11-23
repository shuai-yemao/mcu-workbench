# Reference Interface Generation

Use this reference after the user confirms generation of the first reference interface set. Use it for broad source skeleton generation only when the user explicitly asks for implementation scaffolding or `.c` files.

## Goal

Create the first safe increment that establishes architecture boundaries without changing runtime behavior. The default output is a small set of reference interfaces, not a complete source scaffold.

Prefer:

- Directories
- Public headers
- Small shared contract headers
- Optional integration notes or `docs/architecture.md`
- For CubeMX projects, an independent `User/` tree that keeps product architecture out of `Core/`, `Drivers/`, `.ioc`, and toolchain folders

Avoid:

- Generating many files at once
- Creating `.c` source stubs by default
- Creating empty module implementations by default
- Creating adapter source files by default
- Moving large existing files
- Rewriting vendor-generated code
- Changing interrupt priorities
- Changing linker/startup files
- Changing runtime behavior without explicit approval

## Default Interface Set

The first increment usually includes only 3-8 files total:

- One `app/` lifecycle or state public header when application behavior needs a boundary
- One or two `services/` public headers for the highest-value product capabilities
- One product driver interface header for the first wrapped hardware capability
- One `bsp/board.h` or board boundary header when board variation or HAL leakage is visible
- One `platform/` public header only when OS/time/critical/assert abstraction is immediately needed
- One `common/` or neutral shared-types header when types are shared across layers
- Optional `docs/architecture.md` when the repository already has docs or the user asks for a document

Adapt names to repository conventions. Do not instantiate every layer just because the target architecture mentions it. Generate only the interfaces needed to explain the next safe migration step.

For CubeMX projects that are still near the generated layout, default to uppercase `User/` subfolders:

```text
User/
  App/
  Services/
  AppDrivers/
  Bsp/
  Platform/
  Common/
  Docs/
```

Avoid `drivers/` beside vendor `Drivers/` on Windows. Use `User/AppDrivers/` for product drivers and `User/Bsp/` for board-specific pin/peripheral boundaries. When an RTOS/productized architecture needs several contracts at once, 6-10 header/doc files is acceptable if each file establishes a real boundary and no `.c` stubs are created.

## Typical Minimal File Set

```text
User/App/
  app_main.h
  app_state.h

User/Services/
  svc_log.h

User/AppDrivers/
  drv_sensor.h

User/Bsp/
  board.h

User/Platform/
  timebase.h
  critical.h

User/Common/
  fault_codes.h
```

This is a menu, not a checklist. Pick the smallest subset that clarifies the chosen architecture.

## Broad Skeleton Escalation

Generate `.c` files, empty implementations, adapter source files, or complete directory trees only when the user explicitly asks for phrases such as:

- "generate complete skeleton"
- "generate code skeleton"
- "also create .c files"
- "create scaffold directly"
- "full skeleton"
- "implementation skeleton"

Even then, keep the first increment narrow and report why each created source file is necessary.

## Generation Rules

- Keep headers self-contained when practical, but do not invent hardware behavior.
- For generated `.h` files, write file headers, API comments, enum/struct field comments, and integration notes in Chinese when the user communicates in Chinese.
- For generated `.md` files, write headings, descriptions, tables, risks, and integration notes in Chinese when the user communicates in Chinese.
- Keep C identifiers, include guards, macro names, typedef names, enum constants, and function names in the repository's existing naming style, usually concise English.
- Use `TODO` sparingly and only for integration points the user must fill.
- Keep module APIs small and product-oriented.
- Keep ISR handoff, RTOS wrappers, and HAL callbacks as interface boundaries until real wiring is requested.
- When codebase style is clear, match naming, include guards, formatting, and folder conventions.

## Chinese Comment Style

Use short, engineering-oriented Chinese comments. Prefer comments that explain ownership, timing, safety constraints, and integration responsibilities.

Good examples:

```c
/* 传感器服务的公开接口：负责采样请求、数据缓存和错误上报。 */
typedef enum {
    SENSOR_STATUS_OK = 0,      /* 操作成功 */
    SENSOR_STATUS_TIMEOUT,     /* 总线或设备响应超时 */
} sensor_status_t;

/* 初始化传感器服务。应在板级外设初始化完成后调用。 */
sensor_status_t svc_sensor_init(void);
```

Avoid:

- Translating identifiers into Chinese pinyin.
- Long narrative comments that repeat the function name.
- English placeholder comments such as "TODO: implement later" when a Chinese note is clearer.

## Completion Report

After generation, report:

- Files created or edited
- How the reference interfaces map to the chosen architecture
- What still needs manual integration
- Suggested verification command or build step
- Dependency self-check results and any violations fixed or left unresolved
