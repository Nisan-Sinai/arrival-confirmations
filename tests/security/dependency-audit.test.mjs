import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateAudit, evaluateAuditRun } from '../../scripts/check-dependency-audit.mjs';

const now = Date.parse('2026-10-21T00:00:00Z');
const manifest = { devDependencies: { 'eslint-config-next': '16.4.0' } };
const clean = () => ({
  advisories: {},
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 0, critical: 0 } },
});
const known = () => ({
  advisories: {
    1240992: {
      id: 1240992,
      github_advisory_id: 'GHSA-vfj7-8cjw-p6xm',
      module_name: 'braces',
      severity: 'high',
      patched_versions: null,
      patched_versions_unpublished: true,
      findings: [
        {
          version: '3.0.3',
          dev: true,
          paths: ['.>eslint-config-next>@next/eslint-plugin-next>fast-glob>micromatch>braces'],
        },
      ],
    },
  },
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } },
});
const run = (report, status = 0) => ({ status, stdout: JSON.stringify(report), stderr: '' });

test('clean production and full audits pass, even after the exception expires', () => {
  for (const scope of ['prod', 'full']) {
    assert.deepEqual(evaluateAudit(clean(), scope, manifest, Date.parse('2027-01-01')), {
      exception: false,
    });
    assert.deepEqual(evaluateAuditRun(run(clean()), scope, manifest, now), { exception: false });
  }
});

test('only the exact known dev finding is temporarily accepted; never in production', () => {
  assert.deepEqual(evaluateAuditRun(run(known(), 1), 'full', manifest, now), { exception: true });
  assert.throws(() => evaluateAudit(known(), 'prod', manifest, now));
  for (const level of Object.keys(clean().metadata.vulnerabilities)) {
    const report = clean();
    report.metadata.vulnerabilities[level] = 1;
    for (const scope of ['prod', 'full'])
      assert.throws(() => evaluateAudit(report, scope, manifest, now));
  }
  const report = known();
  report.metadata.vulnerabilities.high = 0;
  assert.throws(() => evaluateAudit(report, 'prod', manifest, now));
});

test('rejects changed advisory identities, findings, versions, paths, and count discrepancies', () => {
  const mutations = [
    (r) => {
      r.advisories.extra = structuredClone(r.advisories[1240992]);
    },
    (r) => {
      r.advisories[1240992].id = 1;
    },
    (r) => {
      r.advisories[1240992].github_advisory_id = 'GHSA-other';
    },
    (r) => {
      r.advisories[1240992].module_name = 'other';
    },
    (r) => {
      r.advisories[1240992].severity = 'low';
    },
    (r) => {
      r.advisories[1240992].patched_versions = '>=3.0.4';
    },
    (r) => {
      r.advisories[1240992].patched_versions_unpublished = false;
    },
    (r) => {
      delete r.advisories[1240992].patched_versions;
    },
    (r) => {
      delete r.advisories[1240992].patched_versions_unpublished;
    },
    (r) => {
      r.advisories[1240992].findings = [];
    },
    (r) => {
      r.advisories[1240992].findings[0].version = '3.0.2';
    },
    (r) => {
      r.advisories[1240992].findings[0].dev = false;
    },
    (r) => {
      delete r.advisories[1240992].findings[0].dev;
    },
    (r) => {
      r.advisories[1240992].findings[0].paths = [];
    },
    (r) => {
      r.advisories[1240992].findings[0].paths.push('.>next>braces');
    },
    (r) => {
      r.advisories[1240992].findings.push({ version: '3.0.3', dev: false, paths: ['.>braces'] });
    },
    (r) => {
      r.metadata.vulnerabilities.high = 2;
    },
    (r) => {
      r.metadata.vulnerabilities.low = 1;
    },
    (r) => {
      r.metadata.vulnerabilities.high = 0;
    },
  ];
  for (const mutate of mutations) {
    const report = known();
    mutate(report);
    assert.throws(() => evaluateAudit(report, 'full', manifest, now));
  }
});

test('requires an exclusively development-time root and enforces the exact expiry boundary', () => {
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    assert.throws(() =>
      evaluateAudit(known(), 'full', { ...manifest, [field]: { 'eslint-config-next': '*' } }, now),
    );
  }
  assert.throws(() => evaluateAudit(known(), 'full', {}, now));
  const boundary = Date.parse('2026-11-04T00:00:00Z');
  assert.deepEqual(evaluateAudit(known(), 'full', manifest, boundary - 1), { exception: true });
  assert.throws(() => evaluateAudit(known(), 'full', manifest, boundary));
  assert.throws(() => evaluateAudit(known(), 'full', manifest, boundary + 1));
});

test('fails closed for malformed or incomplete reports and registry/process failures', () => {
  for (const report of [
    null,
    [],
    {},
    { ...clean(), advisories: [] },
    { ...clean(), error: 'registry' },
    { ...clean(), error: null },
    { ...clean(), errors: [] },
  ]) {
    assert.throws(() => evaluateAudit(report, 'full', manifest, now));
  }
  for (const value of [undefined, null, -1, 0.5, '0', Number.NaN]) {
    const report = clean();
    report.metadata.vulnerabilities.high = value;
    assert.throws(() => evaluateAudit(report, 'full', manifest, now));
  }
  const unknownLevel = clean();
  unknownLevel.metadata.vulnerabilities.unknown = 0;
  assert.throws(() => evaluateAudit(unknownLevel, 'full', manifest, now));
  for (const changes of [
    { status: 2 },
    { status: null },
    { signal: 'SIGTERM' },
    { error: new Error('timeout') },
    { stderr: 'registry unavailable' },
    { stdout: '{' },
    { status: 1 },
  ]) {
    assert.throws(() => evaluateAuditRun({ ...run(clean()), ...changes }, 'full', manifest, now));
  }
  assert.throws(() => evaluateAuditRun(run(known(), 0), 'full', manifest, now));
  assert.throws(() => evaluateAudit(clean(), 'unknown', manifest, now));
  assert.throws(() => evaluateAudit(clean(), 'full', manifest, Number.NaN));
});
