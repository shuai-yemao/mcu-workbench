# letter_shell 命令导出与移植指南

> letter_shell 是 NevermindZZT 开源的轻量级嵌入式 shell。官方仓库：https://github.com/NevermindZZT/letter-shell（v3.2.4）。
>
> 支持命令段导出、参数自动转换、历史命令、Tab 补全、双击 Tab 显示帮助、密码登录、按键绑定、变量导出、伴生对象等。

## 1. 命令注册：`SHELL_EXPORT_CMD`

```c
#include "shell.h"

static int userCmdHello(int argc, char *argv[])
{
    if (argc > 1)
        shellPrint(shellGetCurrent(), "hello %s!\r\n", argv[1]);
    else
        shellPrint(shellGetCurrent(), "hello world!\r\n");
    return 0;
}
SHELL_EXPORT_CMD(SHELL_CMD_PERMISSION(0)|SHELL_CMD_TYPE(SHELL_TYPE_CMD_MAIN),
                 hello, userCmdHello, say hello);
```

- 推荐**段导出**（`SHELL_USING_CMD_EXPORT 1`）：宏自动把命令结构体放进链接脚本的 `shellCommand` 段，shell 启动时扫描该段，零样板代码。
- 另一种是**命令表**：手工维护全局数组，加命令要改表，容易漏。

### `argc` / `argv`

- `argc`：用户输入了几个词（含命令名本身）；`argv[0]` 是命令名；`argv[argc]` 恒为 `NULL`。
- 输入 `hello zhang` → `argc==2`，`argv[1]=="zhang"`。shell 用空格分词，参数间必须有空格。

## 2. 命令属性（SHELL_EXPORT_CMD 第一个参数）

位域 union，常用两个位：

| 位 | 含义 |
| -- | ---- |
| `SHELL_CMD_PERMISSION(0)` | 权限等级 0~255，0 表示任何登录用户都能调用 |
| `SHELL_CMD_TYPE(SHELL_TYPE_CMD_MAIN)` | 命令类型 |

| 类型 | 函数签名 | 用途 |
| ---- | -------- | ---- |
| `SHELL_TYPE_CMD_MAIN` | `int func(int argc, char *argv[])` | 类 main 命令，最常用 |
| `SHELL_TYPE_CMD_FUNC` | `int func(void)` | 无参命令，最简 |
| `SHELL_TYPE_VAR_INT` | 变量（int） | 直接读写变量 |
| `SHELL_TYPE_VAR_STRING` | 变量（字符串） | 直接读写字符串 |

记住 `SHELL_TYPE_CMD_MAIN` 一种就够写 90% 的命令。

## 3. 常用模板

### 带参数命令（校验参数 → 执行 → 打印 → 返回值）

```c
static int userCmdAdc(int argc, char *argv[])
{
    if (argc < 2) {
        shellPrint(shellGetCurrent(), "usage: adc <channel>\r\n");
        return -1;
    }
    int ch = atoi(argv[1]);
    uint32_t val = read_adc_channel(ch);
    shellPrint(shellGetCurrent(), "adc[%d] = %lu\r\n", ch, val);
    return 0;
}
SHELL_EXPORT_CMD(SHELL_CMD_PERMISSION(0)|SHELL_CMD_TYPE(SHELL_TYPE_CMD_MAIN),
                 adc, userCmdAdc, read adc channel);
```

### 命令调用其他命令：`shellRun`

```c
static int userCmdAll(void)
{
    shellRun(shellGetCurrent(), "adc 0\r");
    shellRun(shellGetCurrent(), "led on\r");
    return 0;
}
SHELL_EXPORT_CMD(SHELL_CMD_PERMISSION(0)|SHELL_CMD_TYPE(SHELL_TYPE_CMD_FUNC),
                 all, userCmdAll, run several commands);
```

`shellRun` 第二个参数必须以 `\r` 或 `\n` 结尾。

### 导出变量：`SHELL_EXPORT_VAR`

```c
int g_loopInterval = 1000;
SHELL_EXPORT_VAR(SHELL_CMD_PERMISSION(0)|SHELL_CMD_TYPE(SHELL_TYPE_VAR_INT),
                 interval, &g_loopInterval, loop interval in ms);
```

串口里 `vars` 列出，`setVar interval 500` 直接改值。

## 4. 内置命令

| 命令 | 作用 |
| ---- | ---- |
| `help` / `cmds` | 列出所有命令（`SHELL_HELP_LIST_USER/VAR/KEY 1` 时含用户/变量/按键） |
| `vars` | 列出导出变量 |
| `users` / `keys` | 列出用户 / 按键绑定 |
| `clear` | 清屏 |
| `setVar` | 修改导出变量 |
| `echo` | 回显字符串 |

按键：`↑/↓` 历史（`SHELL_HISTORY_MAX_NUMBER`，默认 10），`Tab` 补全，`Tab Tab` 显示 help，`Ctrl+L` 清屏，`Ctrl+U` 删整行。

## 5. 移植：inc/src/port 三层

```text
Middlewares/letter_shell/
├── inc/                   # 上游公共头（不可改）
│   ├── shell.h / shell_cfg.h / shell_ext.h
├── src/                   # 上游核心实现
│   ├── shell.c / shell_cmd_list.c / shell_companion.c / shell_ext.c
└── port/                  # 项目专用配置与端口
    ├── shell_cfg_user.h   # 被 shell_cfg.h 通过 #include SHELL_CFG_USER 拉取
    ├── shell_port.c       # UART DMA+IDLE + 环形缓冲 + OSAL 任务
    └── shell_port.h
```

- 上游 `inc/`、`src/` 物理隔离，升级时只覆盖这两层，不动 `port/`。
- 上游 `shell_ext.h` 引用 `size_t` 但漏了 `<stddef.h>`，需在顶部补 `#include <stddef.h>`。

## 6. 端口层四个回调

```c
s_shell.write  = userShellWrite;   /* 阻塞发送回串口 */
s_shell.read   = userShellRead;    /* 环形缓冲弹一字节，环空阻塞信号量 */
s_shell.lock   = userShellLock;    /* OSAL 互斥锁保护多任务并发打印 */
s_shell.unlock = userShellUnlock;
shellInit(&s_shell, s_shellBuffer, sizeof(s_shellBuffer));
shellStartReceive();
```

- 输入链路：USART DMA + 空闲中断 → 环形缓冲 → OSAL 二值信号量 give → `shellTask` take → `shell->read` 弹字节 → `shellHandler` → `shell->write`。
- 接收中断钩子：先判 IDLE 标志再 `HAL_UART_IRQHandler`，`HAL_UART_DMAStop` → 读 `__HAL_DMA_GET_COUNTER` 得长度 → 推环形缓冲 → 重启 `shellStartReceive()` → give 信号量。
- 启动顺序：**先 `shellInit` 再 `shellStartReceive`**，不能反过来（否则首次 IDLE 触发时 DMA 未启动）。

### shell_cfg_user.h（SHELL_CFG_USER 编译宏注入）

```c
#define SHELL_TASK_WHILE            1   /* shell 在任务 while 循环中读 */
#define SHELL_USING_CMD_EXPORT      1   /* 使用 SHELL_EXPORT_CMD 段导出 */
#define SHELL_USING_LOCK            1   /* 启用输出锁，防多任务错乱 */
#define SHELL_ENTER_LF              1   /* 支持 LF 触发回车 */
#define SHELL_ENTER_CR              1   /* 支持 CR 触发回车 */
#define SHELL_ENTER_CRLF            0
#define SHELL_PARAMETER_MAX_NUMBER  8
#define SHELL_HISTORY_MAX_NUMBER    10
#define SHELL_PRINT_BUFFER          256
#define SHELL_HELP_LIST_USER        1
#define SHELL_HELP_LIST_VAR         1
#define SHELL_HELP_LIST_KEY         1
#define SHELL_GET_TICK()            ((unsigned int)shellPortGetTickMs())
```

编译时定义 `SHELL_CFG_USER="shell_cfg_user.h"`，`shell_cfg.h` 的 `#include SHELL_CFG_USER` 就等价于 `#include "shell_cfg_user.h"`。

## 7. 链接脚本 `.shellCommand` 段

`SHELL_EXPORT_CMD` 把命令结构体放到 `shellCommand` 段，GCC 需显式收集并给起止符号：

```ld
  .shellCommand ALIGN(4) :
  {
    . = ALIGN(4);
    _shell_command_start = .;
    KEEP(*(shellCommand))
    . = ALIGN(4);
    _shell_command_end = .;
  } >FLASH
```

`shell.c` 在 `__GNUC__` 分支用 `_shell_command_start/_shell_command_end` 计算命令数量，符号名必须一致。验证：`arm-none-eabi-nm <elf> | Select-String "_shell_command"` 应看到起止符号之间的命令结构体。

## 8. 启动与任务

```c
void letter_shell_startup(void)
{
    osal_sema_binary_create(&s_rxSem);
    osal_mutex_create(&s_shellMutex);
    s_shell.write = userShellWrite;   /* 绑定四个回调 */
    s_shell.read  = userShellRead;
    s_shell.lock  = userShellLock;
    s_shell.unlock = userShellUnlock;
    shellInit(&s_shell, s_shellBuffer, sizeof(s_shellBuffer));
    shellStartReceive();
    osal_task_create("shellTask", shellTaskEntry, SHELL_TASK_STACK_SIZE, SHELL_TASK_PRIORITY, ...);
}
```

- shell 任务栈：本工程 1024B；命令函数里若有大数据，需调大 `SHELL_TASK_STACK_SIZE`。
- 在 FreeRTOS `StartDefaultTask` 中调用 `letter_shell_startup()` 后自销毁；启动后可 `shellRun(shellGetCurrent(), "help\r")` 自检。

## 9. 常见问题

| 现象 | 根因 | 解决 |
| ---- | ---- | ---- |
| `error: unknown type name 'size_t'` | `shell_ext.h` 漏 `<stddef.h>` | 在 `inc/shell_ext.h` 顶部补 include |
| `_shell_command_start undefined` | 链接脚本未加 `.shellCommand` 段 | 在 `.ld` 加段并定义起止符号 |
| 命令没出现在 `help` 列表 | 宏属性不对 / 链接脚本没段 | 检查属性与 `.shellCommand` 段 |
| 串口只见 banner，输入无回显 | TX/RX 接反或终端本地回显开着 | 关闭终端本地回显，让 shell 自己回显 |
| 回车无反应 | 终端换行符不被识别 | 三个换行宏至少开一个（LF/CR/CRLF） |
| 方向键出现 `^[[A` | 终端未发标准 ANSI 序列 | 换 Tera Term/MobaXterm |
| 多任务打印乱码 | 锁未启用 | `SHELL_USING_LOCK 1` 并实现 lock/unlock |
| 命令函数不返回 | 函数里有 `while(1)` 死循环 | 命令函数必须返回，否则 shell 任务卡死 |
| DMA 接收长度总是 0 | `__HAL_DMA_GET_COUNTER` 句柄传错 | 用 `&hdma_usart1_rx`，不是 `huart1.hdmarx` |
| ISR 里调 shellPrint 破坏锁 | shell 跑在任务里，不是 ISR | ISR 打印用 RTT 或 elog |

## 10. 验收

- 串口 115200 8N1 连 `COMx`，复位后能看到 letter_shell banner 与 `letter:/>` 提示符。
- 输入 `hello` → `hello world!`；`hello zhang` → `hello zhang!`。
- `help` 能列出已注册命令与变量。
- 多任务并发打印不交错（锁生效）。
- 链接脚本起止符号之间存在命令结构体（nm 验证）。

## 参考资料

- 官方仓库：https://github.com/NevermindZZT/letter-shell
- 官方 README（中文）：https://github.com/NevermindZZT/letter-shell/blob/master/README.md
- STM32 FreeRTOS 移植示例：https://github.com/NevermindZZT/letter-shell/blob/master/demo/stm32-freertos/shell_port.c
- 命令导出宏详解：https://github.com/NevermindZZT/letter-shell/blob/master/src/shell.h
