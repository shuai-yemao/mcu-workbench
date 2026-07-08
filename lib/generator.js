const fs = require('fs').promises;
const path = require('path');
const { getPlatformConfig } = require('./platform');

const BSP_TEMPLATES = {
  oled: {
    name: 'OLED',
    header: 'bsp_oled_driver.h',
    source: 'bsp_oled_driver.c'
  },
  w25q64: {
    name: 'W25Q64',
    header: 'bsp_w25q64_driver.h',
    source: 'bsp_w25q64_driver.c'
  },
  sensor: {
    name: 'Sensor',
    header: 'bsp_sensor_driver.h',
    source: 'bsp_sensor_driver.c'
  },
  key: {
    name: 'Key',
    header: 'bsp_key_driver.h',
    source: 'bsp_key_driver.c'
  }
};

async function readTemplate(templateName, fileName) {
  const templatePath = path.join(__dirname, '..', 'templates', templateName, fileName);
  return await fs.readFile(templatePath, 'utf-8');
}

async function generateBspDriver(peripheral, platform) {
  if (!BSP_TEMPLATES[peripheral]) {
    throw new Error(`Unsupported peripheral: ${peripheral}`);
  }

  const template = BSP_TEMPLATES[peripheral];
  const config = getPlatformConfig(platform);

  const files = [];

  const headerContent = await readTemplate(`bsp-${peripheral}`, template.header);
  files.push({
    path: `BSP/${peripheral.toUpperCase()}/Inc/${template.header}`,
    content: headerContent
  });

  const sourceContent = await readTemplate(`bsp-${peripheral}`, template.source);
  files.push({
    path: `BSP/${peripheral.toUpperCase()}/Src/${template.source}`,
    content: sourceContent
  });

  return files;
}

async function generateSystemAdapter(platform) {
  const config = getPlatformConfig(platform);

  const files = [];

  files.push({
    path: `System/system_oled.h`,
    content: `#ifndef __SYSTEM_OLED_H__
#define __SYSTEM_OLED_H__

#include "bsp_oled_driver.h"

// OLED 硬件操作接口（${config.name} 实现）
int32_t oled_init_myown(void);
int32_t oled_display_on_myown(void);
int32_t oled_display_off_myown(void);
int32_t oled_set_cursor_myown(uint8_t x, uint8_t y);
int32_t oled_write_string_myown(const char* str);
int32_t oled_write_data_myown(uint8_t data);

// OLED 操作接口实例（${config.name} 实现）
extern oled_operations_t oled_operations_myown;

// OLED 域初始化
int32_t system_oled_resources_init(void);

#endif // __SYSTEM_OLED_H__`
  });

  files.push({
    path: `System/system_oled.c`,
    content: `#include "system_oled.h"
#include "system_i2c.h"

// OLED 硬件操作实现（${config.name} 特定）
int32_t oled_init_myown(void) {
    // TODO: 初始化 ${config.name} I2C
    return 0;
}

int32_t oled_display_on_myown(void) {
    // TODO: 实现开显示
    return 0;
}

int32_t oled_display_off_myown(void) {
    // TODO: 实现关显示
    return 0;
}

int32_t oled_set_cursor_myown(uint8_t x, uint8_t y) {
    // TODO: 实现设置光标
    return 0;
}

int32_t oled_write_string_myown(const char* str) {
    // TODO: 实现写字符串
    return 0;
}

int32_t oled_write_data_myown(uint8_t data) {
    // TODO: 实现写数据
    return 0;
}

// OLED 操作接口实例（${config.name} 实现）
oled_operations_t oled_operations_myown = {
    .pf_oled_init = oled_init_myown,
    .pf_oled_display_on = oled_display_on_myown,
    .pf_oled_display_off = oled_display_off_myown,
    .pf_oled_set_cursor = oled_set_cursor_myown,
    .pf_oled_write_string = oled_write_string_myown,
    .pf_oled_write_data = oled_write_data_myown
};

// OLED 域初始化（${config.name} 特定）
int32_t system_oled_resources_init(void) {
    // TODO: 初始化 OLED 资源
    return 0;
}`
  });

  return files;
}

module.exports = {
  BSP_TEMPLATES,
  generateBspDriver,
  generateSystemAdapter
};
