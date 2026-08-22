const { createValidationReport } = require('./validation-report');

function explicitEvidenceStatus(evidence, id) {
  const item = evidence.find((entry) => entry && typeof entry === 'object' && entry.id === id);
  if (!item) return null;
  return item.status === 'confirmed' || item.status === 'confirmed-by-static-scan' ? 'pass' : 'unverified';
}

function validateContractRequest({ layer, metadata, request, projectEvidence = null } = {}) {
  const checks = [];
  const providedEvidence = Array.isArray(request && request.evidence) ? request.evidence : [];
  const requiredEvidence = metadata && Array.isArray(metadata.requiredEvidence) ? metadata.requiredEvidence : [];

  checks.push({
    id: 'contract-layer',
    status: request && Array.isArray(request.requestedLayers) && request.requestedLayers.includes(layer) ? 'pass' : 'fail',
    message: `契约 Renderer 必须与 ${layer} 层一致。`
  });
  checks.push({
    id: 'required-evidence',
    status: requiredEvidence.length ? 'pass' : 'fail',
    message: '契约必须列出进入真实实现前所需的工程证据。'
  });

  for (const evidenceId of requiredEvidence) {
    const explicit = explicitEvidenceStatus(providedEvidence, evidenceId);
    const scanned = projectEvidence && projectEvidence.evidence && projectEvidence.evidence[evidenceId];
    const status = explicit || (scanned && scanned.files.length ? 'pass' : 'unverified');
    checks.push({
      id: `evidence:${evidenceId}`,
      status,
      message: status === 'pass' ? `已找到证据：${evidenceId}` : `尚未确认证据：${evidenceId}`
    });
  }

  return createValidationReport({
    checks,
    unresolved: metadata && metadata.unresolved ? metadata.unresolved : []
  });
}

module.exports = { validateContractRequest };
