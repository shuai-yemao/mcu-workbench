const DEVICE_PROFILES = Object.freeze({
  aht21: Object.freeze({ deviceType: 'sensor', cores: Object.freeze(['i2c']) }),
  mpu6050: Object.freeze({ deviceType: 'sensor', cores: Object.freeze(['i2c']) }),
  w25q64: Object.freeze({ deviceType: 'externflash', cores: Object.freeze(['spi']) }),
  ssd1306: Object.freeze({
    deviceType: 'display',
    cores: Object.freeze(['i2c']),
    template: 'ssd1306-display',
    manifest: Object.freeze({
      handleKind: 'display',
      osalResources: Object.freeze(['mutex']),
      styleProfile: 'style-profile',
      blocking: Object.freeze(['init', 'flush']),
      isrSafe: Object.freeze([])
    })
  })
});

function getDeviceProfile(stem) {
  return DEVICE_PROFILES[stem] || null;
}

module.exports = { DEVICE_PROFILES, getDeviceProfile };
