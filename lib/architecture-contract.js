const fs = require('fs');
const path = require('path');

const SOURCE_FILE = /\.(?:c|h)$/i;
const SKIP_DIRECTORIES = new Set(['.git', 'build', 'Build', 'cmake-build-debug', 'node_modules']);
const DEFAULT_LAYOUT = {
  ignore: [
    /(?:^|\/)(?:Drivers|Vendor|Third_Party|ThirdParty|third-party|external)(?:\/|$)/i
  ],
  app: [/(?:^|\/)(?:App|Application|User_Task)(?:\/|$)/i],
  middleware: [/(?:^|\/)Middlewares?(?:\/|$)/i],
  bsp: [/(?:^|\/)Bsp(?:\/|$)/i],
  bspDriver: [/^Bsp\/(?:Driver|Drivers|Borad_drive|Board_drive|BoardDriver)(?:\/|$)/i],
  bspHandler: [/^Bsp\/(?:Handler|Handle|Handlers)(?:\/|$)/i],
  bspPort: [/^Bsp\/(?:Port|Porting)(?:\/|$)/i, /^Bsp\/.*\/[^/]*port[^/]*\.[ch]$/i],
  bspWrapper: [/^Bsp\/Wrapper(?:\/|$)/i, /^Bsp\/.*\/[^/]*wrapper[^/]*\.[ch]$/i],
  wrapper: [/(?:^|\/)Wrapper(?:\/|$)/i, /(?:^|\/)[^/]*wrapper[^/]*\.[ch]$/i],
  appFacade: [/(?:^|\/)User_Task\/.*\/Platform\/[^/]*_port(?:\/|$)/i],
  corePublic: [/^Core\/(?:.*\/)?(?:Inc|Include|Public)\/.*\.h$/i, /^Core\/[^/]+\.h$/i],
  osWrapper: [/(?:^|\/)os_adapter\/(?:inc|shared)(?:\/|$)/i, /^OS\/Wrapper(?:\/|$)/i, /(?:^|\/)osal_[^/]*\.[ch]$/i],
  osPort: [/(?:^|\/)os_adapter\/(?:FreeRTOS|RT-Thread|RTThread|BareMetal)(?:\/|$)/i, /^OS\/Port(?:\/|$)/i]
};

const VENDOR_CALL = /\bHAL_[A-Za-z0-9_]+\s*\(/g;
const HAL_CONFIGURATION_CALL = /^HAL_(?:(?:GPIO|I2C|SPI|UART|USART|DMA|ADC|TIM|RTC)_(?:Init|DeInit)|NVIC_(?:SetPriority|EnableIRQ|DisableIRQ)|(?:GetTick|Delay)|RCC_[A-Za-z0-9_]+)$/;
const HAL_BUS_TRANSACTION_CALL = /^HAL_(?:(?:I2C|SPI|UART|USART)_(?:(?:Master|Slave|Mem)_(?:Transmit|Receive)|Transmit|Receive)(?:_(?:IT|DMA))?)$/;
const VENDOR_TYPE = /\b(?:I2C|GPIO|SPI|UART|USART|TIM|DMA|ADC|RTC)_\w*TypeDef\b/g;
const CORE_PUBLIC_VENDOR_INCLUDE = /#\s*include\s*[<"][^>"]*(?:stm32\w*_hal|stm32|freertos|cmsis_os|task|queue|semphr)[^>"]*[>"]/gi;
const NATIVE_RTOS = /#\s*include\s*[<"](?:FreeRTOS|task|queue|semphr|event_groups|timers|rtthread)\.h[>"]|\b(?:xTask|vTask|xQueue|xSemaphore|xEventGroup|xTimer|pvPortMalloc|vPortFree|rt_[a-zA-Z0-9_]+)\w*\s*\(/g;
const NATIVE_RTOS_TYPE = /\b(?:SemaphoreHandle_t|QueueHandle_t|TaskHandle_t|TimerHandle_t|EventGroupHandle_t|Static\w+_t|rt_(?:thread|mutex|sem|mq)_t)\b/g;
const SOFT_I2C_PRIMITIVE = /\b[A-Za-z0-9_]*(?:i2c|iic)[A-Za-z0-9_]*(?:start(?!_async)|stop|wait_?ack|send_?(?:not_?|no_?)?ack|send_?byte|receive_?byte)\w*\s*\(/gi;
const SOFT_I2C_DECLARATION = /^[ \t]*(?:(?:static|inline|extern)\s+)*(?:[A-Za-z_]\w*[ \t*]+)+(?:[A-Za-z0-9_]*(?:i2c|iic)[A-Za-z0-9_]*(?:start(?!_async)|stop|wait_?ack|send_?(?:not_?|no_?)?ack|send_?byte|receive_?byte)\w*)\s*\(/gim;
const CONCRETE_WRAPPER_TYPE = /#\s*include\s*[<"][^>"]*(?:driver|handler)[^>"]*[>"]|\b\w+_(?:driver|handler)_t\b/g;
const WRAPPER_PLATFORM_DEPENDENCY = /#\s*include\s*[<"][^>"]*(?:port|driver|handler|core|osal|freertos|stm32|hal)[^>"]*[>"]/gi;
const BSP_WRAPPER_CONCRETE_DEPENDENCY = /#\s*include\s*[<"][^>"]*(?:drv_adapter_port|(?:^|[_/])(?:handler|handle|driver)(?:[_./]|$)|(?:^|[_/])(?:core|mcu)(?:[_./]|$)|osal|freertos|rtthread|stm32|hal)[^>"]*[>"]/gi;
const BSP_HANDLER_INJECTION_DEPENDENCY = /#\s*include\s*[<"][^>"]*(?:drv_adapter_(?:port|wrapper)|core_|mcu_|stm32|hal|freertos|rtthread|osal_internal|bsp_[^>"]*_driver)[^>"]*[>"]/gi;
const BSP_HAL_DRIVER_CONCRETE_DEPENDENCY = /#\s*include\s*[<"][^>"]*(?:stm32|hal|freertos|rtthread|cmsis_os|osal|drv_adapter)[^>"]*[>"]/gi;
const APP_FACADE_CONCRETE_DEPENDENCY = /#\s*include\s*[<"][^>"]*(?:driver|handler|core|osal|freertos|stm32|hal)[^>"]*[>"]/gi;
const DUPLICATE_DEVICE_CACHE = /^[ \t]*static\s+(?:(?:const|volatile)\s+)*(?:struct\s+)?[A-Za-z_]\w*(?:\s*\*+)?\s+[A-Za-z_]\w*(?:latest|cache|temperature|humidity)[A-Za-z_0-9]*\s*(?:\[[^\]]*\])?\s*[;=]/gim;
const PORT_THREAD_ENTRY_DEFINITION = /^[ \t]*(?:static\s+)?void\s+[A-Za-z_]\w*(?:handler|worker|thread)[A-Za-z_0-9]*\s*\([^;]*\)\s*\{/gim;
const LEGACY_OS_IMPL_NAME = /\bos_impl_[a-zA-Z0-9_]+\s*\(/g;
const CONST_OUTPUT_PARAMETER = /\b(?:osal_)?[A-Za-z0-9_]*(?:receive|recv|read|get)[A-Za-z0-9_]*\s*\([^;{]*?\bconst\s+void\s*\*\s*(?:data|buffer|buf|out|output|message|msg)\b/gs;
const AMBIGUOUS_TIMEOUT = /\b(?:const\s+)?(?:u?int(?:8|16|32|64)?_t|size_t|TickType_t|osal_tick_type_t|unsigned(?:\s+(?:int|long))?|int)\s+(?:const\s+)?timeout\b/g;
const IGNORED_ISR_TOKEN = /^[ \t]*(?:\(void\)\s*)?(?:taskENTER_CRITICAL_FROM_ISR|portSET_INTERRUPT_MASK_FROM_ISR)\s*\([^;]*\)\s*;/gm;
const GLOBAL_IRQ_LOCK = /\b(?:__disable_irq|__set_PRIMASK)\s*\(/g;

function collectSourceFiles(root) {
  const files = [];
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(current));
    else if (entry.isFile() && SOURCE_FILE.test(entry.name)) files.push(current);
  }
  return files.sort();
}

function relativePath(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join('/');
}

function sortFindings(findings) {
  return findings.sort((left, right) => left.file.localeCompare(right.file)
    || left.line - right.line
    || left.ruleId.localeCompare(right.ruleId));
}

function findingIdentity(finding) {
  return {
    ruleId: finding.ruleId,
    severity: finding.severity,
    file: finding.file,
    line: finding.line
  };
}

function compareExpectedFindings(findings, expected) {
  const expectedFindings = Array.isArray(expected) ? expected : expected.findings;
  if (!Array.isArray(expectedFindings)) throw new Error('Expected finding manifest must contain a findings array.');
  const actual = findings.map(findingIdentity);
  const planned = expectedFindings.map(findingIdentity);
  const key = (finding) => JSON.stringify(finding);
  const remainingActual = new Map();
  for (const finding of actual) {
    remainingActual.set(key(finding), (remainingActual.get(key(finding)) || 0) + 1);
  }
  const missing = [];
  for (const finding of planned) {
    const identity = key(finding);
    const count = remainingActual.get(identity) || 0;
    if (count) remainingActual.set(identity, count - 1);
    else missing.push(finding);
  }
  const unexpected = [];
  for (const finding of actual) {
    const identity = key(finding);
    const count = remainingActual.get(identity) || 0;
    if (count) {
      unexpected.push(finding);
      remainingActual.set(identity, count - 1);
    }
  }
  return { matches: missing.length === 0 && unexpected.length === 0, missing, unexpected };
}

function normalizeLayout(layout = {}) {
  const configuredLayout = layout || {};
  return Object.fromEntries(Object.entries(DEFAULT_LAYOUT).map(([role, defaults]) => {
    const configured = configuredLayout[role] || defaults;
    const values = Array.isArray(configured) ? configured : [configured];
    return [role, values.map((value) => (value instanceof RegExp ? value : new RegExp(value, 'i')))];
  }));
}

function normalizePortDeviceProtocolPatterns(layout = {}) {
  const values = layout && layout.portDeviceProtocolPatterns;
  if (!values) return [];
  const entries = Array.isArray(values) ? values : [values];
  return entries.map((entry, index) => {
    if (entry instanceof RegExp) {
      return { id: `pattern-${index + 1}`, pattern: entry, message: null };
    }
    if (typeof entry === 'string') {
      return { id: `pattern-${index + 1}`, pattern: new RegExp(entry, 'g'), message: null };
    }
    if (!entry || typeof entry.pattern !== 'string') {
      throw new Error('portDeviceProtocolPatterns entries require a regex pattern string.');
    }
    return {
      id: entry.id || `pattern-${index + 1}`,
      pattern: new RegExp(entry.pattern, entry.flags || 'g'),
      message: entry.message || null
    };
  });
}

function matchesRole(relative, patterns) {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(relative);
  });
}

function lineDetails(content, index) {
  const before = content.slice(0, index);
  const line = before.split(/\r?\n/).length;
  const start = Math.max(content.lastIndexOf('\n', index - 1) + 1, 0);
  const endIndex = content.indexOf('\n', index);
  const end = endIndex === -1 ? content.length : endIndex;
  return { line, evidence: content.slice(start, end).trim() };
}

function maskComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\r\n]/g, ' '))
    .replace(/\/\/[^\r\n]*/g, (comment) => ' '.repeat(comment.length));
}

function addMatches(findings, { content, file, ruleId, severity = 'error', message, pattern }) {
  const expression = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
  for (const match of content.matchAll(expression)) {
    const details = lineDetails(content, match.index);
    if (findings.some((finding) => finding.ruleId === ruleId
      && finding.file === file
      && finding.line === details.line)) continue;
    findings.push({ ruleId, severity, file, line: details.line, message, evidence: details.evidence });
  }
}

function addPortVendorFindings(findings, { content, file }) {
  const expression = new RegExp(VENDOR_CALL.source, VENDOR_CALL.flags);
  for (const match of content.matchAll(expression)) {
    const call = match[0].replace(/\s*\($/, '');
    const details = lineDetails(content, match.index);
    const ruleId = 'BSP_PORT_HAL_CALL';
    const severity = 'error';
    const message = `Port must bind through Core and Handle rather than call vendor HAL directly (${call}).`;
    if (!findings.some((finding) => finding.ruleId === ruleId
      && finding.file === file
      && finding.line === details.line)) {
      findings.push({ ruleId, severity, file, line: details.line, message, evidence: details.evidence });
    }
  }
}

function addPortProtocolFindings(findings, { content, file, patterns }) {
  for (const configured of patterns) {
    const expression = new RegExp(
      configured.pattern.source,
      configured.pattern.flags.includes('g') ? configured.pattern.flags : `${configured.pattern.flags}g`
    );
    for (const match of content.matchAll(expression)) {
      const details = lineDetails(content, match.index);
      if (findings.some((finding) => finding.ruleId === 'BSP_PORT_DEVICE_PROTOCOL_CALL'
        && finding.file === file
        && finding.line === details.line)) continue;
      findings.push({
        ruleId: 'BSP_PORT_DEVICE_PROTOCOL_CALL',
        severity: 'error',
        file,
        line: details.line,
        message: configured.message || `Port must not contain configured device protocol pattern: ${configured.id}.`,
        evidence: details.evidence
      });
    }
  }
}

function validateArchitectureContract({ root, layout } = {}) {
  const resolvedRoot = path.resolve(root || process.cwd());
  const roles = normalizeLayout(layout);
  const portDeviceProtocolPatterns = normalizePortDeviceProtocolPatterns(layout);
  const files = collectSourceFiles(resolvedRoot)
    .filter((filePath) => !matchesRole(relativePath(resolvedRoot, filePath), roles.ignore));
  const findings = [];
  for (const filePath of files) {
    const file = relativePath(resolvedRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const code = maskComments(content);
    const isApp = matchesRole(file, roles.app);
    const isOsPort = matchesRole(file, roles.osPort);
    const isOsWrapper = matchesRole(file, roles.osWrapper) && !isOsPort;
    const isMiddleware = matchesRole(file, roles.middleware) && !isOsWrapper && !isOsPort;
    const isBspDriver = matchesRole(file, roles.bspDriver);
    const isBspHandler = matchesRole(file, roles.bspHandler);
    const isBspPort = matchesRole(file, roles.bspPort);
    const isBspWrapper = matchesRole(file, roles.bspWrapper);
    const isBsp = matchesRole(file, roles.bsp) || isBspDriver || isBspPort;
    const isWrapper = matchesRole(file, roles.wrapper);
    const isAppFacade = matchesRole(file, roles.appFacade);
    const isCorePublic = matchesRole(file, roles.corePublic);

    if (isApp || isMiddleware) {
      const prefix = isApp ? 'APP' : 'MIDDLEWARE';
      addMatches(findings, {
        content, file, ruleId: `${prefix}_VENDOR_CALL`,
        message: `${prefix} code must call stable BSP/Core wrappers instead of vendor HAL APIs.`,
        pattern: VENDOR_CALL
      });
      addMatches(findings, {
        content, file, ruleId: `${prefix}_NATIVE_RTOS`,
        message: `${prefix} code must call OSAL instead of native RTOS APIs.`,
        pattern: NATIVE_RTOS
      });
    }

    if (isAppFacade) {
      addMatches(findings, {
        content: code, file, ruleId: 'APP_FACADE_CONCRETE_DEPENDENCY',
        message: 'APP Facades may forward only to BSP Wrapper public APIs, not concrete BSP/Core/RTOS dependencies.',
        pattern: APP_FACADE_CONCRETE_DEPENDENCY
      });
    }

    if (isCorePublic) {
      addMatches(findings, {
        content, file, ruleId: 'CORE_PUBLIC_VENDOR_INCLUDE',
        message: 'Core public headers must not include HAL, RTOS, or vendor headers.',
        pattern: CORE_PUBLIC_VENDOR_INCLUDE
      });
      addMatches(findings, {
        content, file, ruleId: 'CORE_PUBLIC_VENDOR_TYPE',
        message: 'Core public headers must not expose vendor handle or peripheral types.',
        pattern: VENDOR_TYPE
      });
      addMatches(findings, {
        content, file, ruleId: 'CORE_PUBLIC_NATIVE_RTOS_TYPE',
        message: 'Core public headers must not expose native RTOS types.',
        pattern: NATIVE_RTOS_TYPE
      });
      addMatches(findings, {
        content, file, ruleId: 'CORE_PUBLIC_SOFT_I2C_PRIMITIVE',
        message: 'Software I2C bit primitives must remain private to the Core backend.',
        pattern: SOFT_I2C_DECLARATION
      });
    }

    if (isBsp && !isBspPort) {
      addMatches(findings, {
        content, file, ruleId: 'BSP_NATIVE_RTOS',
        message: 'BSP Driver, Handler, and Wrapper code must use OSAL instead of native RTOS APIs.',
        pattern: NATIVE_RTOS
      });
      addMatches(findings, {
        content, file, ruleId: 'BSP_VENDOR_CALL',
        message: 'BSP Driver, Handler, and Wrapper code must use Core capabilities instead of vendor HAL calls.',
        pattern: VENDOR_CALL
      });
      addMatches(findings, {
        content, file, ruleId: 'BSP_SOFT_I2C_BACKEND',
        message: 'Software I2C bit-level backends belong in private Core backends rather than BSP code.',
        pattern: SOFT_I2C_DECLARATION
      });
    }

    if (isBspPort) {
      addPortVendorFindings(findings, { content: code, file });
      addPortProtocolFindings(findings, { content: code, file, patterns: portDeviceProtocolPatterns });
      addMatches(findings, {
        content: code, file, ruleId: 'BSP_PORT_SOFT_I2C_PRIMITIVE',
        message: 'BSP Port must not implement or select software I2C bit primitives.',
        pattern: SOFT_I2C_PRIMITIVE
      });
      addMatches(findings, {
        content: code, file, ruleId: 'BSP_PORT_DUPLICATE_DEVICE_CACHE',
        message: 'Port must not retain a business cache that duplicates Handler-owned device state.',
        pattern: DUPLICATE_DEVICE_CACHE
      });
      addMatches(findings, {
        content: code, file, ruleId: 'BSP_PORT_HANDLER_THREAD_BODY',
        message: 'Port may create OSAL resources but Handler worker entry functions must be implemented in Handler.',
        pattern: PORT_THREAD_ENTRY_DEFINITION
      });
      if (/\b[A-Za-z_]\w*_port_register\s*\(/.test(code)) {
        const requiredInjections = [
          ['BSP_PORT_CORE_OPS_INJECTION', /\b[A-Za-z_]\w*_driver_register_core_ops\s*\(/],
          ['BSP_PORT_MCU_OPS_INJECTION', /\b[A-Za-z_]\w*_driver_register_mcu_ops\s*\(/],
          ['BSP_PORT_OS_WRAPPER_OPS_INJECTION', /\b[A-Za-z_]\w*_handle(?:r)?_register_osal_ops\s*\(/],
          ['BSP_PORT_HAL_DRIVER_OPS_INJECTION', /\b[A-Za-z_]\w*_handle(?:r)?_register_driver\s*\(/]
        ];
        for (const [ruleId, pattern] of requiredInjections) {
          if (!pattern.test(code)) {
            findings.push({
              ruleId,
              severity: 'error',
              file,
              line: 1,
              message: 'BSP Port must compose and inject the required operation table.',
              evidence: 'BSP Port registration'
            });
          }
        }
      }
    }

    if (isWrapper) {
      addMatches(findings, {
        content: code, file, ruleId: 'WRAPPER_PLATFORM_DEPENDENCY',
        message: 'Wrapper must remain a pure function-table registry and cannot include Port, HAL, Driver, Handler, Core, or RTOS headers.',
        pattern: WRAPPER_PLATFORM_DEPENDENCY
      });
    }
    if (isBspWrapper) {
      addMatches(findings, {
        content: code, file, ruleId: 'BSP_WRAPPER_CONCRETE_DEPENDENCY',
        message: 'BSP Wrapper must contain only its function table, registration slot, and stable forwarding API.',
        pattern: BSP_WRAPPER_CONCRETE_DEPENDENCY
      });
    }
    if (isBspHandler) {
      addMatches(findings, {
        content: code, file, ruleId: 'BSP_HANDLER_INJECTION_DEPENDENCY',
        message: 'BSP Handler must use injected OS Wrapper Ops and HAL Driver Ops rather than concrete implementations.',
        pattern: BSP_HANDLER_INJECTION_DEPENDENCY
      });
    }
    if (isBspDriver) {
      addMatches(findings, {
        content: code, file, ruleId: 'BSP_HAL_DRIVER_CONCRETE_DEPENDENCY',
        message: 'BSP HAL Driver must use injected Core and MCU Ops rather than HAL, RTOS, or OS Wrapper dependencies.',
        pattern: BSP_HAL_DRIVER_CONCRETE_DEPENDENCY
      });
    }
    if (/(?:^|\/)Wapper(?:\/|$)|\bwapper\b/i.test(file)) {
      addMatches(findings, {
        content: file, file, ruleId: 'BSP_WRAPPER_MISSPELLING',
        message: 'Use Wrapper and wrapper consistently; Wapper is not a supported layer name.',
        pattern: /Wapper|wapper/gi
      });
    }
    if (isWrapper && path.extname(file).toLowerCase() === '.h') {
      addMatches(findings, {
        content, file, ruleId: 'WRAPPER_CONCRETE_TYPE',
        message: 'Wrapper public headers must not expose concrete Driver or Handler types.',
        pattern: CONCRETE_WRAPPER_TYPE
      });
    }

    if (isOsWrapper) {
      addMatches(findings, {
        content, file, ruleId: 'OS_WRAPPER_NATIVE_RTOS',
        message: 'OS Wrapper must call internal os_*_impl functions instead of native RTOS APIs.',
        pattern: NATIVE_RTOS
      });
      if (path.extname(file).toLowerCase() === '.h') {
        addMatches(findings, {
          content: code, file, ruleId: 'OSAL_CONST_OUTPUT_PARAMETER', severity: 'warning',
          message: 'OSAL receive/read output buffers must be writable rather than const-qualified.',
          pattern: CONST_OUTPUT_PARAMETER
        });
      }
    }
    if (/(?:^|\/)os_adapter(?:\/|$)/i.test(file)) {
      addMatches(findings, {
        content, file, ruleId: 'OS_IMPL_NAMING',
        message: 'OS Port internal functions must use os_<operation>_impl naming.',
        pattern: LEGACY_OS_IMPL_NAME
      });
    }

    addMatches(findings, {
      content: code, file, ruleId: 'AMBIGUOUS_TIMEOUT_UNIT', severity: 'warning',
      message: 'Timeout names must encode or document their unit, such as timeout_ms or timeout_ticks.',
      pattern: AMBIGUOUS_TIMEOUT
    });
    addMatches(findings, {
      content: code, file, ruleId: 'ISR_CRITICAL_TOKEN_IGNORED', severity: 'warning',
      message: 'ISR critical-section entry tokens must be saved and restored.',
      pattern: IGNORED_ISR_TOKEN
    });
    if (/(?:debug|log|rtt|observ)/i.test(file)
      && /(?:^|\/)(?:port|ports?|porting)(?:\/|$)|(?:log|rtt|observ)[^/]*port/i.test(file)) {
      addMatches(findings, {
        content: code, file, ruleId: 'LOG_GLOBAL_IRQ_LOCK', severity: 'warning',
        message: 'Logging ports should not disable interrupts globally for ordinary output.',
        pattern: GLOBAL_IRQ_LOCK
      });
    }
  }
  sortFindings(findings);
  const errors = findings.filter((finding) => finding.severity === 'error');
  const warnings = findings.filter((finding) => finding.severity === 'warning');
  return {
    root: resolvedRoot,
    summary: { files: files.length, errors: errors.length, warnings: warnings.length },
    errors,
    warnings,
    findings
  };
}

module.exports = {
  collectSourceFiles,
  compareExpectedFindings,
  DEFAULT_LAYOUT,
  normalizeLayout,
  normalizePortDeviceProtocolPatterns,
  relativePath,
  sortFindings,
  validateArchitectureContract
};
