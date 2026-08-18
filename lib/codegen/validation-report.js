function createValidationReport({ checks = [], unresolved = [] } = {}) {
  const normalizedChecks = checks.map((check) => ({
    id: check.id,
    status: check.status || 'unverified',
    message: check.message || ''
  }));
  return {
    schemaVersion: 'codegen-validation-v1',
    status: normalizedChecks.some((check) => check.status === 'fail') ? 'fail' :
      normalizedChecks.some((check) => check.status === 'unverified') || unresolved.length ? 'unverified' : 'pass',
    checks: normalizedChecks,
    unresolved: [...new Set(unresolved)]
  };
}

module.exports = { createValidationReport };
