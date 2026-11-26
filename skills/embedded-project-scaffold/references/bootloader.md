# Bootloader 项目

用于 bootloader、app image、DFU、OTA、双镜像、向量重定位和 flash 布局工作。

## 必需事实

- Flash 页/扇区布局和 erase/write 约束。
- Boot ROM 行为、boot 引脚/选项和向量地址规则。
- 应用起始地址和链接脚本 offset。
- VTOR/向量重定位支持，或架构特定等价机制。
- 如有要求，记录 image header、checksum/signature、version、rollback 和 update transport。

## 脚手架规则

- 将 bootloader 和应用的链接脚本分开。
- 尽可能在单一事实来源中定义 flash 区域。
- 没有来源支持的扇区边界时，不要添加 flash erase/write 操作。
- 在添加烧写命令前，先提供非破坏性的构建路径。

## 风险点

- 错误扇区擦除可能毁掉 bootloader 或校准数据。
- Option bytes/fuses/security bits 可能锁死调试访问。
- 向量重定位前发生中断可能跳到错误 handler。
- Cache/MPU 设置可能影响 flash 编程和 app jump。
