# 厂商代码裁剪

将厂商 SDK 或示例转化为小型脚手架时使用。

## 裁剪策略

1. 从同一板卡、芯片系列、编译器和外设的最接近可工作示例开始。
2. 清点源文件、include paths、defines、链接脚本、启动文件和生成配置文件。
3. 保留启动、系统时钟、中断向量、低层驱动和请求 demo 路径所需文件。
4. 移除 middleware、未使用的板级 demo、额外示例、生成的项目缓存和 IDE metadata，除非它们必需。
5. 当许可证或 include paths 依赖目录名时，保留厂商目录名。
6. 对 HAL/CMSIS/SDK 项目，优先从完整官方包、pack cache 或仓库 checkout 裁剪，而不是下载单个文件。

## 复制规则

- 保留许可证头。
- 复制文件时，在来源映射或简短注释中记录原始路径。
- 除非用户要求 clean-room rewrite，否则不要把生成配置文件合并为手写代码。
- 如果其他文件按路径 include 厂商头文件，不要重命名这些头文件。
- 优先在小型 `bsp_` 或 `platform_` 文件中包装厂商 API，而不是编辑厂商驱动。

## 常见隐藏依赖

- `system_<chip>.c`、时钟配置和 CMSIS core headers。
- 器件头文件和编译器抽象头文件。
- 中断向量启动汇编或 C 文件。
- 控制驱动功能的 SDK config header。
- 当器件头文件 include 系统头文件时，与之配套的 device system header 和 `system_<chip>.c`。
- Assert、retarget、syscall 或 semihosting stubs。
- 启动代码引用的 linker symbols。
- 间接 include 的板级引脚和时钟头文件。

## 完成标准

当请求的 demo 能构建、未使用示例已移除，并且每个保留的厂商目录都有明确存在理由时，脚手架裁剪程度就足够了。
