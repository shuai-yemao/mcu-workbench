# RISC-V 交叉编译工具链 — 适用于 RV32/ESP32-C/GD32V/CH32V 等
#
# 用法: cmake -B build -G Ninja -DCMAKE_TOOLCHAIN_FILE=cmake/riscv-none-elf.cmake

# ---- 基础设定 ----
set(CMAKE_SYSTEM_NAME               Generic)
set(CMAKE_SYSTEM_PROCESSOR          riscv)

# ---- 工具链路径 ----
set(TOOLCHAIN_PREFIX                "riscv-none-elf-")
set(TOOLCHAIN_ROOT                  "F:/xpack-riscv-none-elf-gcc/bin")

# 支持从环境变量覆盖
if(DEFINED ENV{RISCV_TOOLCHAIN_PATH})
    set(TOOLCHAIN_ROOT              "$ENV{RISCV_TOOLCHAIN_PATH}")
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

# ---- RISC-V 架构标志 (RV32IMAC + 紧凑指令集) ----
# 常见配置:
#   rv32imac - 通用 MCU (ESP32-C3, GD32V, CH32V103)
#   rv32imafc - 带单精度 FPU (ESP32-C6, K210)
#   rv64imac - 64位 RISC-V (SiFive U54, VisionFive)
# 使用时可在 CMakeLists.txt 中覆盖: set(RISCV_ARCH rv32imafc)
if(NOT DEFINED RISCV_ARCH)
    set(RISCV_ARCH                  "rv32imac")
endif()

set(ARCH_FLAGS                     "-march=${RISCV_ARCH} -mabi=ilp32 -mcmodel=medany")
set(WARNING_FLAGS                  "-Wall -Wextra -Wno-unused-parameter")

set(CMAKE_C_FLAGS_INIT             "${ARCH_FLAGS} ${WARNING_FLAGS} -std=gnu11 -fno-common -ffunction-sections -fdata-sections")
set(CMAKE_CXX_FLAGS_INIT           "${ARCH_FLAGS} ${WARNING_FLAGS} -std=gnu++17 -fno-common -ffunction-sections -fdata-sections -fno-rtti -fno-exceptions")
set(CMAKE_ASM_FLAGS_INIT           "${ARCH_FLAGS} -x assembler-with-cpp")

# ---- 链接器 ----
set(CMAKE_EXE_LINKER_FLAGS_INIT    "${ARCH_FLAGS} -Wl,-gc-sections,--print-memory-usage,-Map=${CMAKE_PROJECT_NAME}.map")

# ---- 搜索规则 ----
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
