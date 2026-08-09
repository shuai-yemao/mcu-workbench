# 日志与检测架构设计思路（为什么 / 怎么做 / 出问题怎么办）

> 配套实践工程：`D:\zhuomian\embedded_framework`（分支 feature/log-diagnosis-system）
> 本文以 2026-08-09 对该工程的代码质量检查为真实案例，回答三个问题：
> **为什么这样设计**（动机与权衡）、**我自己怎么做**（实操步骤）、**出问题怎么解决**（排查路径）。

---

## 0. 一次真实检查的记录（先看案例）

对工程全部 23 个 `.c` 按五层契约检查后，结论：**依赖纪律全部合规，发现 3 处文档残留**。

| # | 位置 | 问题 | 级别 |
|---|---|---|---|
| 1 | `03_Platform/platform_common/diag/platform_assert.h` | `@par dependencies` 仍列 `platform_log.h`，实际只依赖 `platform_type.h` | 低（文档漂移） |
| 2 | `03_Platform/platform_common/diag/platform_assert.c` | 同上，P2 落地时改了代码漏改注释 | 低 |
| 3 | `04_Impl/impl_mcu/impl_reset_reason.c` | 同上 | 低 |

已确认合规的关键点（这些才是重点）：

- **Platform 零反向**：03_Platform 所有 include 只指向自身头，唯一外部依赖是 `platform_type.h → board_types.h`（类型出口例外）
- **App 只调 Service**：`app_init.c` 只 include `service_log.h` / `service_system.h`（+ 错误码类型出口）
- **Service 只调 Platform**：service 层零 Vendor/Impl/HAL 符号
- **P2 断言独立**：`platform_assert.c` 无 hook 时走 `platform_assert_output`（RTT 裸写）后停机，不碰日志
- **P5 槽语义**：manager 满槽 `NO_RESOURCE`、重复注册 `ALREADY_INIT`
- **桥接正确**：`platform_log_elog.c` 用 va_list+vsnprintf 组帧（elog 无 va_list 版本）、平台头在前防 bool 冲突

**案例教训**：架构合规不是一次写对就完了——**改代码时必须同步改注释**，否则文档与代码漂移。这也是检查的意义：不是找大问题，而是防小问题积累成大问题。

---

## 1. 为什么要这样设计

### 1.1 五层契约解决什么问题

嵌入式工程最痛的是**换芯片/换板/换 RTOS 全工程跟着动**。五层契约的目标：让"变的"和"不变的"分离。

| 层 | 变不变 | 一句话职责 |
|---|---|---|
| App | 换芯片零改动 | 产品流程、状态机（app_init 组合根） |
| Service | 换芯片零改动 | 带策略的业务抽象（日志门面、启动编排） |
| Platform | **接口永不改** | 统一接口/错误码/对象协议（只定义能力） |
| Impl | 换芯片换整套 | Platform→Vendor 适配（port 注入具体实例） |
| Vendor | 只登记不复制 | 第三方底座（elog/RTT/HAL） |

关键洞察：**Platform 是"稳定契约层"，App/Service 依赖它，Impl 实现它**。日志、断言、复位原因、hardfault 这些"横切可观测能力"放在 `platform_common/diag`，因为它们**被所有层共享、且不绑任何芯片**。

### 1.2 日志为什么分三层放（机制/策略/落地）

日志不是"一个模块"，是三个不同性质的关注点，硬塞一层会互相污染：

| 关注点 | 为什么放这层 | 工程实例 |
|---|---|---|
| 级别/裁剪/格式化/输出通道（**机制**） | Platform：接口永不改，所有层共用 | `platform_log.h`（级别宏 + `PLATFORM_LOG_LEVEL` 裁剪 + `PLATFORM_LOG_A/E/W/I/D/V` 宏） |
| 级别过滤策略、环形缓冲、按需导出（**策略**） | Service：带产品决策，允许后续演进 | `service_log`（App 门面 `SERVICE_LOG_*`） |
| 真正写字节到硬件（**落地**） | Impl：绑定具体中间件/硬件 | `platform_log_elog.c`（桥接 elog/RTT） |

**为什么 App 不能直接用 `PLATFORM_LOG_*`？** 因为依赖铁律 App→Service→Platform：App 若直连 Platform 能力接口，换实现时 App 会跟着动（这是 P3 痛点，工程 8 月 9 日专门修过一次——`app_init.c` 曾直连 4 个 platform 头被拉回 service_log 门面）。

### 1.3 日志流转的三个方向（核心模型）

```text
调用向下：App/Service/Impl ──日志宏──► platform_log（契约内核）
注入由 Impl：impl_middleware port 符号实现 platform_log_* ──► Vendor 底座
输出到底：platform_log 组帧 ──► Impl 通道 ──► elog / SEGGER RTT / HAL UART
```

- **调用向下**：日志产生方在各层，统一汇聚到 `platform_log`，**不是逐层接力**。各层访问面不同：App 用 `SERVICE_LOG_*`（门面），Service/Impl 用 `PLATFORM_LOG_*`（直调合法）。
- **注入由 Impl**：Platform 只声明 `platform_log_output()` 等函数签名，**Impl 写函数体**（符号实现，链接期）。为什么不是运行期 ops 表注册？——更简单：零 RAM、无初始化顺序问题。运行期注册的"多通道动态切换"对这种规模是**过度设计**（架构铁律：不为凑灵活性引入复杂度）。
- **输出到底**：`platform_log_output` 组帧后写 Vendor 底座，**单出口**，无接力。

### 1.4 为什么断言独立于日志（P2，最容易忽略的决策）

断言失败时，**日志系统可能是坏的**（缓冲损坏、未初始化、死在日志代码里）。所以：

```text
PLATFORM_ASSERT(expr) 失败 → platform_assert_fail
  ├─ 有 hook（测试注入）→ 回调后返回（host 冒烟用）
  └─ 无 hook → platform_assert_output（RTT 裸写，独立通道）→ for(;;) 停机
```

**注意对比**：hardfault（硬件异常）用 `PLATFORM_LOG_E` 输出是**可以接受的**——因为 hardfault 发生时日志早已初始化（运行期被动异常），而 assert 可能是 boot 早期或日志自身故障（主动软件检查）。**设计判断要看"故障发生时依赖是否可靠"**，这是 P2 决策背后的思维。

### 1.5 错误码为什么用 enum 不用宏

```c
typedef enum { PLATFORM_ERR_OK = 0, ... } platform_err_t;
```

宏 `#define PLATFORM_ERR_OK 0` 会在预处理期把枚举名替换成数字，导致**同名枚举编译错误**。enum 提供类型检查 + 调试器可读。同理 `PLATFORM_LOG_LVL_*` 却**必须用宏**——因为 `#if` 裁剪在预处理期比较，enum 成员预处理不可见（被视为 0）。**同一个"级别"概念，两个用途两种载体**：裁剪用宏、类型化 API 用 enum。

---

## 2. 我自己怎么做（实操步骤）

### 2.1 拿到一个模块，怎么判断它放哪层（三层判定）

按顺序问三个问题：

1. **它依赖谁？** include 了芯片/HAL/RTOS/Vendor 头 → 只能放 Impl（或 Vendor）。include 了 `platform_*` 头 → 可以放 Service/App 上层。
2. **它带业务策略吗？** 有产品决策（阈值、超时、降级顺序）→ Service。纯机制（驱动、转发、组帧）→ Platform/Impl。
3. **它会被谁调用？** 被 App 直接调 → 必须是 Service 门面（App 只调 Service）。

### 2.2 加一个新的日志输出通道（三步）

假设加一个"串口通道"（impl_bsp 的 uart 实现）：

1. **Platform 头已声明**（`platform_log.h` 的 `platform_log_output` 等）——不用改 Platform！
2. **Impl 写符号实现**：新建 `04_Impl/impl_bsp/platform_log_uart.c`，实现 `platform_log_output()` 函数体，把字节经 HAL UART 发出。注意：链接期同名函数会覆盖——**全工程只能有一个 `platform_log_output` 实现**（选择 elog 或 uart，二选一）。
3. **验证**：gcc -fsyntax-only 编译 + include 白名单检查。

要点：**加通道不改 Platform、不改 Service**——这就是注入模型的价值。

### 2.3 快速验证依赖纪律（两条命令）

```bash
# Platform 层禁止反向（应只有 platform_type.h → board_types.h 一条外部 include）
grep -rn '#include' 03_Platform | grep -v 'platform_\|board_types'

# App 层只允许 service_*（+ platform_error.h 类型出口）
grep -rn '#include' 01_App
```

### 2.4 提交前自检清单（从本次检查提炼）

- [ ] 头注释 `@par dependencies` 与实际 include **逐行一致**（本次就是栽在这）
- [ ] 错误码统一 `platform_err_t` / `PLATFORM_ERR_*`，不压平为 -1
- [ ] 类型/宏出自 `platform_type.h` / `platform_def.h`，不自造
- [ ] include 方向符合依赖铁律（可跑上面两条 grep）
- [ ] 故障路径（assert）不依赖日志
- [ ] gcc -fsyntax-only 通过（含 `-DSTM32F411xE` 目标分支）

---

## 3. 出问题怎么解决（排查路径）

### 3.1 编译错误

| 症状 | 根因 | 解法 |
|---|---|---|
| `fatal error: xxx.h: No such file or directory` | include 路径漏了，或跨层引用了不该引用的头 | 先确认该头在哪个层：跨层引用是架构问题不是路径问题；再补 -I |
| `conflicting types for 'bool'` / `'bool' redefined` | board_types 的 `typedef uint8 bool` 与 `<stdbool.h>` 的 `bool` 宏冲突 | **平台头在前**（先 include `platform_*` 再 include Vendor 头），见 `platform_log_elog.c` 注释 |
| `error: expected identifier before numeric constant` | 宏名被数字替换（enum/宏同名） | 级别裁剪用宏（`PLATFORM_LOG_LVL_*`），类型化 API 用 enum（`platform_log_level_t`） |
| 芯片分支语法错误 | 守卫宏 `STM32F411xE` 未定义，代码块被跳过 | 编译时加 `-DSTM32F411xE` 验证目标分支（工程惯例） |

### 3.2 链接错误

| 症状 | 根因 | 解法 |
|---|---|---|
| `undefined reference to 'platform_log_output'` | **注入缺失**：没有 Impl 文件实现该符号 | 检查是否有 `platform_log_elog.c`（或 uart 版）参与编译；符号实现是链接期覆盖，缺一个就崩 |
| `multiple definition of 'platform_log_output'` | **重复注入**：两个 Impl 都实现了同一符号 | 全工程只能有一个实现；删掉不用的 |

### 3.3 运行期问题（在板上）

| 症状 | 排查路径 |
|---|---|
| 日志完全不输出 | ① `service_log_init()`（elog_init+start）是否在 boot 第一步被调？② 通道是否注册/初始化？③ `PLATFORM_LOG_LEVEL` 是否把该级别裁掉了？ |
| 只有低级别输出 | `PLATFORM_LOG_LEVEL` 编译裁剪生效——检查宏定义 |
| 断言触发但看不到输出 | 断言走的是 `platform_assert_output`（RTT 通道 0 裸写），**不是日志通道**——去 RTT 看，别去串口日志看 |
| 复位原因不对 | `impl_reset_reason.c` 读 RCC_CSR 后写 RMVF 清除标志——检查清除是否执行（不清除下次读到旧的）；判定优先级：上电 > 欠压 > 引脚 > 看门狗 > 软件 > 低功耗 |
| hardfault 后无 dump | dump 走 `PLATFORM_LOG_E`（elog 通道），若日志本身已坏则看不到——这是设计取舍：hardfault 依赖日志，assert 不依赖 |

### 3.4 架构问题排查（比 bug 更难发现）

- **症状**：换芯片时 App 层代码要改 → App 层直连了 Platform 能力实现，违反了"App 只调 Service"。
- **症状**：Platform 文件 include 了 `impl_*` 或 `04_Impl` 路径 → Platform 反向依赖，绝对禁止（唯一例外 `board_types.h` 类型出口）。
- **排查方法**：`grep -rn '#include' <层目录>` 扫一遍，人工确认每一条的外部依赖方向。这条扫描 30 秒，能省掉换芯片时几天的返工。

---

## 4. 一句话总结

> **架构不是画出来的，是"每行 include 都问一次方向"守出来的。**
> 机制放 Platform、策略放 Service、落地放 Impl、故障路径自足（P2）、改代码同步改注释。
> 检查时先跑 grep 看依赖方向，再读代码看实现质量——方向错了，实现再好也是白搭。
