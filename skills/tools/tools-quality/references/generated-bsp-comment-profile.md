# BSP 生成代码完整注释 Profile

本 profile 只适用于 MCU Workbench 生成的 BSP Driver、Handle、Port 与 Wrapper 文件。
它不覆盖用户工程中的手写源码；手写源码继续按 `style-profile.md` 的证据优先级审查。
注释语言默认为中文（Doxygen 描述、段注释、行尾说明），除非用户或项目明确要求英文。

## 强制结构

每个生成头文件和源文件都包含：

1. `@file`、`@par dependencies`、`@author`、`@brief`、`Processing flow` 和版本；
2. `Includes`、`Private Defines`、`Private Types`、`Private State`、`Private Functions`、`Public Functions` 分区；头文件没有私有实现时可省略私有分区；
3. 每个公开 API 与私有实现函数的 `@brief`、参数方向、返回语义；阻塞 API 标注 `@warning Not ISR-safe`；
4. 结构体、函数表和成员的职责与所有权说明；
5. 非显然资源、锁、总线、错误回收和状态转换的理由注释；GPIO 输出设备还要说明逻辑状态与物理电平的极性映射、Core GPIO 上下文所有权、失败初始化后的状态以及 Port 回滚边界。

## 生成前检查

- 先输出 profile 来源、目标 `osal.h` / Core 公共头证据与未决 API；
- 未读取实际 OSAL 公共头时，manifest 必须带 `UNRESOLVED_OSAL_API`；
- 不以完整注释替代错误检查、Fake 测试、构建或板级验证。
- manifest 只有在以上文件和 API 注释均已生成时才能声明完整注释 Profile；否则应标记为预览或待补全。

## 审查口径

对生成 BSP 切片，`validate:layer` 检查文件头、源文件分区与注释语言（注释必须含中文，见 `LAYER_COMMENT_LANGUAGE`）；
`tools-quality` 审查函数注释是否与实际阻塞、ISR、资源所有权和错误路径一致。
