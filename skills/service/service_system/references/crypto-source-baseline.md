# 固件安全与 AES 源码基线

- 主要仓库：[Mbed-TLS/mbedtls](https://github.com/Mbed-TLS/mbedtls)
- 分支：`development`
- 复核 commit：`3bb373867917b674265067cbd38b9d252c43d014`
- 关注：PSA Crypto、AES、配置文件、硬件加速回调和测试

## 分层归属

```text
APP / software-system
  → 密钥、版本、完整性和升级状态机
  → Mbed TLS PSA Crypto 或厂商 Crypto API
  → Driver / BSP hal_driver 的硬件加速
```

AES 算法和密钥生命周期属于系统安全能力；STM32 CRYP 等硬件寄存器和 HAL 调用仍属于 `driver-vendor`。不要恢复一个同时包含 AES、RSA、签名、OTA 和密钥管理的“大而全” Skill。

## 必查规则

- 先确定用途：传输加密、固件包加密、完整性校验、密钥存储还是认证。
- 明确模式、Nonce/IV、Tag、密钥来源、轮换和失败处理；禁止 ECB 用于需要保密的业务数据。
- 锁定 Mbed TLS/PSA 配置，记录裁剪后的模块、硬件加速路径和随机数来源。
- 目标板验收必须包含错误 Tag、错误版本、回滚和密钥不可用路径。
- 不在 APP 或 Middleware 中直接操作 CRYP 寄存器；通过系统安全公共接口和已有层边界交接。
