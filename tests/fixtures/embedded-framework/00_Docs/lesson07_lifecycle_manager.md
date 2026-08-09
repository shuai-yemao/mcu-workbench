# 第 7 课：manager 层与统一生命周期驱动

> 前置：第 5 课对象模型（`platform_object_t` / `platform_device_t` / `platform_service_t` + `platform_lifecycle_ops_t`）
> 落地目录：`03_Platform/platform_common/`
> 日期：2026-08-08

## 0. 为什么要有 manager 层

第 5 课给了每个对象一张「身份证」（`platform_object_t`）和一组「动作入口」（`platform_lifecycle_ops_t`）。但**有了对象，不代表系统就能稳定运行**：

- **谁注册**？对象不会自己跑到集合里。
- **谁初始化、谁启动、谁停止**？没人编排，回调只是躺在表里的函数指针。
- **启动顺序错了会怎样**？service 的 init 用到还没 init 的 device → 调用异常 / 越界访问。

manager 层回答的正是这四个「谁」：它是对象集合的**管理者**，也是生命周期链路的**唯一执行者**。本课落地三件事：

1. `platform_manager`（通用基类）：对象集合 + 统一驱动 + 结果统计；
2. `platform_device_manager` / `platform_service_manager`（特化）：DEVICE 只能进 device_manager，SERVICE 只能进 service_manager；
3. `platform_board_manager`（编排）：梳理 `board → device → service → app` 的启动主线与逆序停线。

## 1. 生命周期六段含义

统一驱动链：

```text
register → init → start → process → stop → deinit
```

| 段 | 谁发起 | 谁执行 | 前置 state | 成功 state | 失败 state |
| --- | --- | --- | --- | --- | --- |
| register | BSP/启动期代码 | manager（登记，非回调） | CREATED | REGISTERED | 不适用 |
| init | board_manager | `p_lifecycle->init` | REGISTERED | INITIALIZED | ERROR |
| start | board_manager | `p_lifecycle->start` | INITIALIZED | STARTED | ERROR |
| process | 主循环/RTOS task | `p_lifecycle->process` | STARTED | 保持 STARTED | 保持 STARTED（只上报） |
| stop | board_manager（关机） | `p_lifecycle->stop` | STARTED | STOPPED | 保持 STARTED（只上报） |
| deinit | board_manager | `p_lifecycle->deinit` | INITIALIZED / STOPPED / STARTED | DEINITIALIZED | ERROR |

关键点：

- **register 不是对象回调**。它是 manager 的登记动作：对象 `state → REGISTERED`，`p_parent → manager`。回调表里没有 register。
- **process / stop 失败不降级 state**：对象仍在运行（process 失败只上报，stop 失败说明还没停住），保证 state 永远真实反映可观测阶段。
- **deinit 前置最宽松**：已初始化、已停止、仍在运行的对象都可以直接回收资源。

## 2. state vs lifecycle：manager 是唯一执行者

两条容易混淆的概念：

- **state 是记录，不执行动作**。`PLATFORM_OBJECT_STARTED` 只是一个字段，写上它不会让硬件跑起来。
- **lifecycle 是动作入口**。`p_lifecycle->start` 才是真正去打开硬件的那段代码。

manager 把两者串起来，并且是**唯一**串起来的人：

```text
manager 动作流程：
  1. 校验对象合法（magic + 类型双校验）
  2. 校验前置 state（规则表，非法跳转 → PLATFORM_ERR_BUSY）
  3. 调 lifecycle 回调（拿 p_self）
  4. 只有回调成功，才 set_state 推进
```

动作与状态严格配对、成功才推进，从机制上杜绝了「状态说已经启动、硬件其实没启动」的不一致窗口。规则表见第 6 节。

## 3. manager 层组件

```text
platform_object_t（第 5 课）
        │ 首字段内嵌
        ├─────────────────────────────┐
        │                             │
platform_manager_t（通用基类）        platform_device_t / platform_service_t
  - 对象槽数组指针                      （被管理的叶子对象，含 p_lifecycle）
  - register/unregister/find/count
  - 单对象 drive + 五段批量驱动
        ▲ 内嵌
        │
platform_device_manager_t              platform_service_manager_t
  - 仅收 DEVICE                        - 仅收 SERVICE
  - 容量 16（可裁剪宏）                 - 容量 8
        ▲                              ▲
        └──────────────┬───────────────┘
                platform_board_manager_t
                  - 内嵌 device/service 两个子 manager
                  - init/start/process/stop/deinit 编排
                  - get_device_manager/get_service_manager 访问器
```

设计决策：

- **数组归特化层、基类存指针**：device(16) 与 service(8) 容量不同，不浪费槽位；容量宏用 `#ifndef` 放在各自特化头内，将来可由 00_Config 配置头预先定义覆盖。
- **manager 自身也是对象**（`PLATFORM_OBJECT_MANAGER`），有独立的 state。`init_all` 驱动后 manager 自身 state 置 `INITIALIZED`，**关闭注册窗口**——注册只在启动期有效。
- **manager 的集合驱动走显式函数调用**（`board_start()` 里直接调 `device_mgr.init_all()`），不走 lifecycle 回调，避免「manager 的 init 再被 manager 驱动」的递归。

## 4. 启动主线与停线

```text
[Phase0] platform_board_manager_init()       板级身份 + 两个子 manager 就绪
[Phase1] BSP/服务层 register（仅启动期）       device: CREATED→REGISTERED
                                               service: CREATED→REGISTERED
[Phase2] device_mgr.init_all()                硬件能力先置备
       → service_mgr.init_all()               service 组合 device，此时 device 已 init
[Phase3] device_mgr.start_all()               硬件先运行
       → service_mgr.start_all()              业务再运行
[Phase4] App 层启动（本课仅文档占位，不建代码）

主循环 / RTOS task：
  platform_board_manager_process()
    → device.process_all()   先刷传感器/硬件数据
    → service.process_all()  再基于数据算策略

关机：
  platform_board_manager_stop()
    → service.stop_all()  → device.stop_all()     逆序
  platform_board_manager_deinit()
    → service.deinit_all() → device.deinit_all()  逆序
```

**4 条顺序论证**：

1. **board 在最前**：它是硬件存在的总前提，两个子 manager 依赖它初始化。
2. **device 先于 service**：service 组合 device（init 时要用设备指针、读设备能力），设备必须先注册、先初始化。
3. **init 全量先于 start 全量**：先把所有资源置备完成再整体运行，避免「跑一半、另一半还没 init」的半初始化窗口，保证任意时刻资源状态确定性。
4. **app 最后**：app 消费 service 能力，service 未 start 之前 app 不应启动。

**逆序停线**：service 运行时持有 device 引用。若先停 device，service 的下一次 process 会读到已停止的硬件（越界/异常）。逆序保证「生产者最后停」——service 先退出业务逻辑，device 再关闭硬件，是稳定关机、无越界访问的关键。

## 5. 为什么生命周期设计是系统稳定运行的关键

六问：

1. **谁能注册？** 只有启动期（manager 自身 state 为 CREATED）可注册；`init_all` 驱动后窗口关闭，注册返回 `PLATFORM_ERR_BUSY`。杜绝运行期往集合里塞对象导致的未定义行为。
2. **谁初始化、谁启动？** board_manager 统一编排，device→service 两段式。顺序写在编排函数里，任何人改动顺序都需要过 code review。
3. **谁停止？** 逆序停线：service 先停、device 后停；deinit 同理。保证无悬挂引用。
4. **出错怎么办？** 批量驱动 continue-on-error：单个对象失败不阻塞其它对象；统计 `first_error / p_fail_name / ok / skip / fail`，失败对象 state 置 `ERROR`，可被巡检发现。
5. **如何避免启动顺序异常？** 三重防线：magic+type 双校验（`platform_object_is_valid`）拒非法对象；前置 state 规则表拒非法跳转（未 init 就 start → `PLATFORM_ERR_BUSY`）；成功才推进 state。
6. **可观测性？** 每个对象有 `name + state`，manager 提供 `count/find`，任一时刻可查询谁在什么阶段、谁失败了。

一句话总结：**生命周期设计把「每个对象自己瞎折腾」变成「一个管理者按表驱动」，顺序、权限、错误、观测全部收敛到一条链路上——这正是嵌入式系统稳定性（不越界、不悬空、不跑飞）的组织保障。**

## 6. 驱动规则表（代码对应 `platform_manager.c` 的 `manager_rules[]`）

| 动作 | 允许前置 state（位掩码） | 成功 state | 失败 state | keep_on_fail |
| --- | --- | --- | --- | --- |
| init | REGISTERED | INITIALIZED | ERROR | FALSE |
| start | INITIALIZED | STARTED | ERROR | FALSE |
| process | STARTED | STARTED | STARTED | TRUE |
| stop | STARTED | STOPPED | STARTED | TRUE |
| deinit | INITIALIZED \| STOPPED \| STARTED | DEINITIALIZED | ERROR | FALSE |

`drive_all` 中，对象「不在适用阶段」（前置不满足，返回 BUSY）按 **skip** 统计——例如 process_all 对未 start 的对象跳过，不误报为失败。

## 7. 失败路径与观测样例

| 场景 | 期望返回 | 说明 |
| --- | --- | --- |
| 重复注册同一对象 | `PLATFORM_ERR_ALREADY_INIT` | 指针或 name 重复都拒 |
| 容量写满 | `PLATFORM_ERR_NO_RESOURCE` | 槽数组已满 |
| 注册窗口关闭后注册 | `PLATFORM_ERR_BUSY` | 已 init_all |
| 未 init 就 start | `PLATFORM_ERR_BUSY` | 前置 state 不满足 |
| 查询不存在的对象 | `PLATFORM_ERR_NOT_FOUND` | find/get |

## 8. 实验（smoke 验证）

`00_Docs/lesson07_lifecycle_smoke.c` 为临时 host 端验证（编译进 `/tmp`，不进固件构建）：

```text
happy path：board_init → register×3 → start → process → stop → deinit
  校验各对象 state 流转、回调顺序（dev:init,dev:init,svc:init,dev:start,dev:start,svc:start）、
  逆序停线（svc 先、dev 后）、get/get_by_class 查询。
failure paths：ALREADY_INIT / NO_RESOURCE / BUSY 三条全部命中。
```

运行结果：`ALL PASS`（exit 0）。验证命令：

```bash
gcc -std=c11 -I00_Config \
    -I03_Platform/platform_common/core \
    -I03_Platform/platform_common/diag \
    -I03_Platform/platform_common/object \
    -I03_Platform/platform_common/manager \
    -I04_Impl/impl_board \
    00_Docs/lesson07_lifecycle_smoke.c <platform_common sources> -o /tmp/lesson07_smoke \
    && /tmp/lesson07_smoke
```

## 9. 遗留与下一步

- **sleep / wakeup 未纳入批量驱动**：它们是低功耗切面，留给后续 power 课；届时按 `caps & PLATFORM_DEVICE_CAP_SLEEP` 过滤接入。
- **App 层启动**：`[Phase4]` 本课仅占位，后续在 01_App 落地 `app_main` 生命周期时接入 board_manager。
- **`platform_common/README.md` 与顶层 `README.md`**：本课同步更新了落地文件表与进度。
