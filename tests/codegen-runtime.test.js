const { createArchitectureProfile } = require('../lib/codegen/architecture-profile');
const { hashGeneratedFiles, sortGeneratedFiles } = require('../lib/codegen/deterministic');
const { createLifecycleModel } = require('../lib/codegen/lifecycle-model');
const { createResourceProfile } = require('../lib/codegen/resource-profile');
const { loadSkillContract } = require('../lib/codegen/skill-contract-loader');
const { createValidationReport } = require('../lib/codegen/validation-report');
const { collectProjectEvidence } = require('../lib/codegen/project-evidence');
const { validateContractRequest } = require('../lib/codegen/contract-validator');
const fs = require('fs').promises;
const os = require('os');
const path = require('path');

describe('Codegen Runtime shared models', () => {
  test('builds architecture dependencies for the requested layers', () => {
    const profile = createArchitectureProfile({
      requestedLayers: ['impl_board', 'impl_bsp_port', 'platform_bsp']
    });
    expect(profile.schemaVersion).toBe('architecture-profile-v1');
    expect(profile.dependencies.impl_board).toEqual(expect.arrayContaining(['impl_bsp_port', 'impl_os']));
  });

  test('keeps unverified resources explicit', () => {
    const profile = createResourceProfile([
      { kind: 'bus', name: 'i2c1', owner: 'impl_mcu', verified: false },
      { kind: 'gpio', name: 'display_reset', verified: true }
    ]);
    expect(profile.unresolved).toEqual(['UNRESOLVED_RESOURCE: bus/i2c1']);
  });

  test('normalizes lifecycle actions and rejects unknown actions', () => {
    expect(createLifecycleModel(['init', 'process', 'init']).actions).toEqual(['init', 'process']);
    expect(() => createLifecycleModel(['resume'])).toThrow('Unsupported lifecycle actions');
  });

  test('loads canonical Skill contract metadata without treating it as a renderer', () => {
    const contract = loadSkillContract('platform_common');
    expect(contract.status).toBe('available');
    expect(contract.content).toContain('Platform Common');
  });

  test('sorts and hashes generated files deterministically', () => {
    const files = [
      { path: 'b.c', content: 'b' },
      { path: 'a.h', content: 'a' }
    ];
    expect(sortGeneratedFiles(files).map((file) => file.path)).toEqual(['a.h', 'b.c']);
    expect(hashGeneratedFiles(files)['a.h']).toMatch(/^[a-f0-9]{64}$/);
  });

  test('reports unverified validation separately from failure', () => {
    expect(createValidationReport({ checks: [{ id: 'compile', status: 'unverified' }] }).status)
      .toBe('unverified');
    expect(createValidationReport({ checks: [{ id: 'syntax', status: 'fail' }] }).status)
      .toBe('fail');
  });

  test('collects project evidence without treating directories as implementation proof', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcu-codegen-evidence-'));
    await fs.mkdir(path.join(root, '03_Platform', 'platform_os'), { recursive: true });
    await fs.mkdir(path.join(root, '04_Impl', 'impl_os'), { recursive: true });
    await fs.writeFile(path.join(root, '03_Platform', 'platform_os', 'platform_os_task.h'), '');
    await fs.writeFile(path.join(root, '04_Impl', 'impl_os', 'impl_os_freertos.c'), '');
    await fs.writeFile(path.join(root, 'CMakeLists.txt'), '');
    const evidence = await collectProjectEvidence(root);
    expect(evidence.evidence.platform_os_public_headers.status).toBe('confirmed-by-static-scan');
    expect(evidence.evidence.impl_os_mapping.status).toBe('confirmed-by-static-scan');
    expect(evidence.evidence.build_entry.status).toBe('confirmed-by-static-scan');
    expect(evidence.evidence.rtos_config.status).toBe('unverified');
  });

  test('validates contract evidence while preserving unverified status', () => {
    const report = validateContractRequest({
      layer: 'platform_os',
      metadata: {
        requiredEvidence: ['platform_os_public_headers'],
        unresolved: ['UNRESOLVED_OS_IMPL_MAPPING']
      },
      request: {
        requestedLayers: ['platform_os'],
        evidence: [{ id: 'platform_os_public_headers', status: 'confirmed' }]
      }
    });
    expect(report.status).toBe('unverified');
    expect(report.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'evidence:platform_os_public_headers', status: 'pass' })
    ]));
  });
});
