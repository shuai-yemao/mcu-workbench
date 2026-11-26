# 材料获取

当用户只给出芯片/板卡型号、要求查找材料，或希望下载缺失厂商资料时，使用此参考。

## 目标

收集足够来源材料来搭建最小项目，同时避免把 skill 变成爬虫或 SDK 包管理器。默认查找官方链接并输出用户下载检查清单。仅当用户明确请求，或文件小、直链、公开且低风险时，才自动下载。

## 搜索顺序

1. 官方芯片或板卡厂商产品页。
2. 官方 datasheet、reference manual、programming manual、errata、application note 和硬件设计指南。
3. 官方 SDK、BSP、HAL、CMSIS pack、SVD、寄存器头文件和示例仓库。
4. 官方板级原理图、用户手册、quick-start guide 和 debugger/programmer 说明。
5. 仅当生态标准需要时使用包索引，例如 Zephyr modules、PlatformIO registry、Arduino board package 或 vendor pack index。
6. 第三方仓库仅作为示例，绝不作为电气限制、flash 布局、时钟、引脚或安全敏感行为的权威来源。

## 查询模式

组合使用：

- `<part number> datasheet pdf`
- `<part number> reference manual pdf`
- `<part number> programming manual`
- `<part number> SDK example`
- `<vendor> <part number> HAL github`
- `<board name> schematic pdf`
- `<board name> user manual`
- `<part number> CMSIS pack SVD`
- `<part number> errata`

已知时包含封装、内存大小、板卡版本和外设目标。

## 链接优先策略

- 优先返回官方产品页、SDK 页、pack 页、仓库链接和用户应下载的准确文件名。
- 对 HAL、CMSIS packs、厂商 SDK、RTOS ports、board packages 和 IDE examples 等依赖复杂的栈，请用户提供完整归档、安装器输出、仓库 checkout 或 pack cache 路径。
- 除非用户明确需要这种取舍，否则避免为 HAL/CMSIS/SDK 脚手架零散下载源文件。这些树通常包含隐藏头文件、模板、许可证文件、启动变体、pack 元数据和生成配置。
- 只提供链接时，附上必需文件或目录检查清单，以及应放置的位置。

## 自动下载规则

- 仅对 agent 或用户明确选择的 URL 使用自动下载。
- 优先使用厂商域名上的官方 HTTPS 链接。
- 安全的自动下载包括 datasheet PDF、reference manual PDF、errata PDF、小型直链示例文件和小型公开元数据文件。
- 下载 SDK、HAL/CMSIS 源码树、归档、安装器、packs 或大型仓库前先询问。
- 将文件保存到 `materials/<vendor-or-source>/<part-or-board>/` 下。
- 原文件名可读时保留；否则使用 `part-document-type-version.ext`。
- 创建或更新 `materials-manifest.json`，包含 title、source URL、download time、file path、file size 和选择原因。
- 不要绕过登录、点击同意许可、出口管制确认或 bot 保护。
- 不要代表用户接受许可条款。请用户下载受限 SDK，或提供已批准 URL/文件。
- 不要自动运行下载的安装器。
- 官方来源存在时，不要使用第三方镜像下载手册或 SDK。
- 不要将自动下载用作依赖解析器。

## 何时询问用户

这些情况下请求用户协助：

- 官方 SDK 需要登录、许可接受、出口管制确认或 captcha。
- 材料是 SDK、HAL package、CMSIS pack、RTOS package、IDE installer 或依赖树。
- 多个变体名称相近，且精确封装、内存大小、板卡版本或工具链影响正确性。
- 来源只能作为 GUI 安装器或 IDE package 获取，可能改变本地系统。
- 下载大小足以造成干扰。
- 下一步会写 flash、改变 fuses/option bytes、修改电源设置或对硬件运行厂商工具。

## 输出

获取后报告：

- 已下载材料和本地路径。
- 未下载文件的官方链接和手动下载检查清单。
- 无法下载的材料，以及用户应提供的内容。
- 来源置信度：official、package-index、third-party example 或 unknown。
- 未解决的身份风险，例如封装不匹配、板卡版本不匹配或 SDK family 不匹配。
