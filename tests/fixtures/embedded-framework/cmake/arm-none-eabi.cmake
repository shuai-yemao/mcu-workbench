# ARM Cortex-M 交叉编译工具链 — STM32F4 (GCC)
#
# 用法: cmake -B build -G Ninja -DCMAKE_TOOLCHAIN_FILE=cmake/arm-none-eabi.cmake
#
# 本文件仅在 toolchain 首次配置时加载一次。

# ---- 基础设定 ----
set(CMAKE_SYSTEM_NAME               Generic)
set(CMAKE_SYSTEM_PROCESSOR          arm)

# ---- 工具链路径 (STM32CubeCLT) ----
set(TOOLCHAIN_PREFIX                "arm-none-eabi-")
set(TOOLCHAIN_ROOT                  "F:/STM32CubeCLT_1.21.0/GNU-tools-for-STM32/bin")

# 支持从环境变量覆盖
if(DEFINED ENV{ARM_TOOLCHAIN_PATH})
    set(TOOLCHAIN_ROOT              "$ENV{ARM_TOOLCHAIN_PATH}")
endif()

# ---- 编译器与工具 ----
set(CMAKE_TRY_COMPILE_TARGET_TYPE  STATIC_LIBRARY)

find_program(CMAKE_C_COMPILER      NAMES ${TOOLCHAIN_PREFIX}gcc    PATHS ${TOOLCHAIN_ROOT} REQUIRED)
find_program(CMAKE_CXX_COMPILER    NAMES ${TOOLCHAIN_PREFIX}g++    PATHS ${TOOLCHAIN_ROOT} REQUIRED)
find_program(CMAKE_ASM_COMPILER    NAMES ${TOOLCHAIN_PREFIX}gcc    PATHS ${TOOLCHAIN_ROOT} REQUIRED)
find_program(CMAKE_OBJCOPY         NAMES ${TOOLCHAIN_PREFIX}objcopy PATHS ${TOOLCHAIN_ROOT})
find_program(CMAKE_OBJDUMP         NAMES ${TOOLCHAIN_PREFIX}objdump PATHS ${TOOLCHAIN_ROOT})
find_program(CMAKE_SIZE            NAMES ${TOOLCHAIN_PREFIX}size    PATHS ${TOOLCHAIN_ROOT})
find_program(CMAKE_GDB             NAMES ${TOOLCHAIN_PREFIX}gdb     PATHS ${TOOLCHAIN_ROOT})

# ---- 编译器标志 (STM32F411CEU6: Cortex-M4 + FPU) ----
set(ARCH_FLAGS                     "-mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16")
set(WARNING_FLAGS                  "-Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers")

set(CMAKE_C_FLAGS_INIT             "${ARCH_FLAGS} ${WARNING_FLAGS} -std=gnu11 -fno-common -ffunction-sections -fdata-sections -fno-strict-aliasing")
set(CMAKE_CXX_FLAGS_INIT           "${ARCH_FLAGS} ${WARNING_FLAGS} -std=gnu++17 -fno-common -ffunction-sections -fdata-sections -fno-strict-aliasing -fno-rtti -fno-exceptions")
set(CMAKE_ASM_FLAGS_INIT           "${ARCH_FLAGS} -x assembler-with-cpp")

# ---- 链接器 ----
set(CMAKE_EXE_LINKER_FLAGS_INIT    "${ARCH_FLAGS} -Wl,-gc-sections,--print-memory-usage,-Map=${CMAKE_PROJECT_NAME}.map")
set(CMAKE_SHARED_LIBRARY_LINK_C_FLAGS "")
set(CMAKE_SHARED_LIBRARY_LINK_CXX_FLAGS "")

# ---- 搜索规则 (只查目标目录，不查宿主系统) ----
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
