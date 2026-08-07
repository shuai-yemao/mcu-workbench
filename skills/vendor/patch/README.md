# patch/ — Vendor 补丁目录

> 依据 `vendor_mapping.md`（D7：源码只登记不复制，改动只进补丁）。

## 结构

```text
patch/
├── stm32f4-hal/    STM32F4 HAL 补丁
├── esp-idf/        ESP-IDF 补丁
├── cmsis/          CMSIS 补丁
├── lvgl/           LVGL 补丁
├── stack/          通信协议栈补丁
├── fatfs/          FatFs 补丁
├── sfud/           SFUD 补丁
├── fal/            FAL 补丁
├── flashdb/        FlashDB 补丁
├── letter_shell/   letter_shell 补丁
└── cmsis-dsp/      CMSIS-DSP 补丁
```

## 规则

1. 每个补丁文件头部必须注明：目的、适用版本、应用方式（`git apply` / `patch -p1`）；
2. 不得直接修改 Vendor 源码——一律以补丁形式落盘；
3. 补丁与 `vendor_mapping.md` 登记表同步维护（换版本时校验并更新）。
