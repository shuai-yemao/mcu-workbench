const path = require('path');
const { collectProjectEvidence } = require('./project-evidence');
const { validateContractRequest } = require('./contract-validator');

const CONTRACT_METADATA = Object.freeze({
  app: {
    skill: 'app-architecture',
    mode: 'contract-only',
    requiredEvidence: ['service_public_contract', 'app_profile', 'startup_call_chain'],
    unresolved: ['UNRESOLVED_APP_PROFILE']
  },
  service: {
    skill: 'service_*',
    mode: 'contract-only',
    requiredEvidence: ['service_public_contract', 'business_policy', 'platform_dependency_map'],
    unresolved: ['UNRESOLVED_SERVICE_PROFILE']
  },
  platform_os: {
    skill: 'platform_os',
    mode: 'contract-only',
    requiredEvidence: ['platform_os_public_headers', 'platform_os_internal_headers', 'impl_os_mapping'],
    unresolved: ['UNRESOLVED_PLATFORM_OS_PUBLIC_HEADER', 'UNRESOLVED_OS_IMPL_MAPPING']
  },
  platform_middleware: {
    skill: 'platform_middleware',
    mode: 'contract-only',
    requiredEvidence: ['middleware_capability_contract', 'vendor_mapping'],
    unresolved: ['UNRESOLVED_PLATFORM_MIDDLEWARE_CONTRACT']
  },
  impl_mcu: {
    skill: 'impl_mcu',
    mode: 'contract-only',
    requiredEvidence: ['chip_exact_model', 'hal_cmsis_version', 'peripheral_instances', 'build_entry'],
    unresolved: ['UNRESOLVED_IMPL_MCU_BACKEND_CONTRACT', 'UNRESOLVED_VENDOR_HAL_API']
  },
  impl_os: {
    skill: 'impl_os',
    mode: 'contract-only',
    requiredEvidence: ['platform_os_public_headers', 'rtos_or_baremetal_backend', 'rtos_config', 'build_entry'],
    unresolved: ['UNRESOLVED_IMPL_OS_BACKEND', 'UNRESOLVED_RTOS_CONFIG']
  },
  impl_middleware: {
    skill: 'impl_middleware',
    mode: 'contract-only',
    requiredEvidence: ['platform_middleware_contract', 'vendor_source_mapping', 'os_resource_mapping'],
    unresolved: ['UNRESOLVED_MIDDLEWARE_VENDOR_MAPPING']
  },
  vendor: {
    skill: 'vendor_*',
    mode: 'mapping-only',
    requiredEvidence: ['vendor_source_root', 'version_or_commit', 'license_record'],
    unresolved: ['UNRESOLVED_VENDOR_SOURCE_MAPPING']
  },
  build: {
    skill: 'tools-build',
    mode: 'contract-only',
    requiredEvidence: ['build_system', 'toolchain', 'target_entry', 'source_file_manifest'],
    unresolved: ['UNRESOLVED_BUILD_ENTRY', 'UNRESOLVED_BUILD_TARGET']
  }
});

function normalizeName(value, fallback) {
  const name = String(value || fallback).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return name.replace(/^-+|-+$/g, '') || fallback;
}

function normalizeEvidence(value) {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => typeof item === 'string' ? item : {
    id: item.id,
    status: item.status || 'unverified',
    source: item.source || null
  });
}

function createContractFile(request, ir, metadata, projectEvidence, validation) {
  const name = normalizeName(request.name || request.module || request.profileName, request.kind);
  const contract = {
    schemaVersion: 'codegen-contract-v1',
    kind: request.kind,
    layer: metadata.layer,
    name,
    skill: metadata.skill,
    mode: metadata.mode,
    renderer: 'contract-only',
    architecture: ir.profiles.architecture,
    lifecycle: ir.profiles.lifecycle,
    resources: ir.profiles.resources,
    requiredEvidence: metadata.requiredEvidence,
    providedEvidence: normalizeEvidence(request.evidence),
    projectEvidence,
    validation,
    unresolved: metadata.unresolved,
    inputs: {
      platform: request.platform || null,
      backend: request.backend || null,
      vendor: request.vendor || null,
      target: request.target || null,
      profile: request.profile || null
    },
    note: '该文件是生成前契约和证据清单，不代表 C 代码已生成、可编译或已完成目标板验证。'
  };
  return {
    path: path.posix.join('00_Docs', '05_Codegen_Contracts', metadata.layer, `${name}.codegen.json`),
    content: `${JSON.stringify(contract, null, 2)}\n`
  };
}

function createContractRenderer(layer, metadata) {
  return Object.freeze({
    id: `contract.${layer}`,
    layer,
    version: '1',
    skill: metadata.skill,
    render: async (request, ir) => {
      const projectEvidence = request.projectRoot
        ? await collectProjectEvidence(request.projectRoot)
        : null;
      const validation = validateContractRequest({ layer, metadata, request, projectEvidence });
      const file = createContractFile(request, ir, { ...metadata, layer }, projectEvidence, validation);
      const files = [file];
      Object.defineProperty(files, 'manifest', {
        enumerable: false,
        value: {
          mode: metadata.mode,
          contractOnly: true,
          requiredEvidence: [...metadata.requiredEvidence],
          unresolved: [...metadata.unresolved],
          validation
        }
      });
      return files;
    }
  });
}

function createContractRenderers() {
  return Object.entries(CONTRACT_METADATA).map(([layer, metadata]) => createContractRenderer(layer, metadata));
}

module.exports = { CONTRACT_METADATA, createContractRenderer, createContractRenderers };
