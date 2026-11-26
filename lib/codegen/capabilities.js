const CAPABILITIES = Object.freeze([
  { id: 'app', skill: 'app-architecture', status: 'planned', renderer: 'contract.app' },
  { id: 'service', skill: 'service_*', status: 'planned', renderer: 'contract.service' },
  { id: 'platform_common', skill: 'platform_common', status: 'partial', renderer: 'platform-common.foundation' },
  { id: 'platform_mcu', skill: 'platform_mcu', status: 'partial', renderer: 'platform-mcu.core' },
  { id: 'platform_os', skill: 'platform_os', status: 'contract-only', renderer: 'contract.platform_os' },
  { id: 'platform_bsp', skill: 'platform_bsp', status: 'partial', renderer: 'platform-bsp.model' },
  { id: 'platform_middleware', skill: 'platform_middleware', status: 'planned', renderer: 'contract.platform_middleware' },
  { id: 'impl_mcu', skill: 'impl_mcu', status: 'missing-contract', renderer: 'contract.impl_mcu' },
  { id: 'impl_os', skill: 'impl_os', status: 'contract-only', renderer: 'contract.impl_os' },
  { id: 'impl_bsp_driver', skill: 'impl_bsp', status: 'partial', renderer: 'impl-bsp.driver' },
  { id: 'impl_bsp_handle', skill: 'impl_bsp', status: 'partial', renderer: 'impl-bsp.handle' },
  { id: 'impl_bsp_port', skill: 'impl_bsp', status: 'partial', renderer: 'impl-bsp.port' },
  { id: 'impl_board', skill: 'impl_board', status: 'partial', renderer: 'impl-board.composition' },
  { id: 'impl_middleware', skill: 'impl_middleware', status: 'planned', renderer: 'contract.impl_middleware' },
  { id: 'vendor', skill: 'vendor_*', status: 'mapping-only', renderer: 'contract.vendor' },
  { id: 'build', skill: 'tools-build', status: 'planned', renderer: 'contract.build' }
]);

function listCapabilities() {
  return CAPABILITIES.map((capability) => ({ ...capability }));
}

function getCapability(id) {
  const capability = CAPABILITIES.find((item) => item.id === id);
  if (!capability) throw new Error(`Unknown codegen capability: ${id}`);
  return { ...capability };
}

module.exports = { getCapability, listCapabilities };
