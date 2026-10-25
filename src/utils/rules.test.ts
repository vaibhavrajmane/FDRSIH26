import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStatusTransition,
  formatINR,
  formatDateDDMMMYYYY,
  isValidIFSC,
  isValidFDRNumber,
  computeAuditEventHash,
  verifyAuditChain,
  evaluateDiscrepancies,
  calculateRiskScore,
  canRolePerform,
  validateBankReplyVersion,
} from './rules';
import { generateSeedData } from '../data/seedData';
import { AuditEvent, Instrument, Institution } from '../types';

test('strict state machine allows valid transitions and blocks illegal ones', () => {
  const ok = validateStatusTransition('Submitted', 'Under Scrutiny');
  assert.equal(ok.valid, true);

  const illegal = validateStatusTransition('Submitted', 'Released/Refunded');
  assert.equal(illegal.valid, false);
  assert.match(illegal.reason || '', /Illegal status transition/);
});

test('Indian currency formatter formats lakhs and crores accurately', () => {
  assert.equal(formatINR(1250000), 'Rs 12,50,000');
  assert.equal(formatINR(35000000), 'Rs 3,50,00,000');
  assert.equal(formatINR(500), 'Rs 500');
});

test('DD-MMM-YYYY date formatting and IFSC/FDR validation', () => {
  assert.equal(formatDateDDMMMYYYY('2026-10-24'), '24-Oct-2026');
  assert.equal(isValidIFSC('SBIN0001234'), true);
  assert.equal(isValidIFSC('SBIN1234567'), false); // 5th char must be 0
  assert.equal(isValidFDRNumber('FDR/SBI/2026/90812'), true);
  assert.equal(isValidFDRNumber('12'), false);
});

test('tamper-evident audit hash chain detects single record tampering', () => {
  const genesis = '0000000000000000000000000000000000000000000000000000000000000000';
  const e1Base = {
    id: 'aud-1',
    timestamp: '2026-10-24T10:00:00Z',
    actorId: 'usr-1',
    actorName: 'R. Sharma',
    actorRole: 'SCRUTINY_OFFICER' as const,
    action: 'RUN_BANK_VERIFICATION',
    entityType: 'Instrument' as const,
    entityId: 'inst-101',
    beforeValue: 'Submitted',
    afterValue: 'Verified (Bank-Confirmed)',
    ipAddress: '10.24.11.8',
    previousHash: genesis,
  };
  const e1: AuditEvent = {
    ...e1Base,
    eventHash: computeAuditEventHash(genesis, e1Base),
  };

  const e2Base = {
    id: 'aud-2',
    timestamp: '2026-10-24T10:05:00Z',
    actorId: 'usr-2',
    actorName: 'Dr. K. Verma',
    actorRole: 'APPROVING_AUTHORITY' as const,
    action: 'APPROVE_FINAL_VERIFICATION',
    entityType: 'Instrument' as const,
    entityId: 'inst-101',
    beforeValue: 'Verified (Bank-Confirmed)',
    afterValue: 'Active',
    ipAddress: '10.24.11.9',
    previousHash: e1.eventHash,
  };
  const e2: AuditEvent = {
    ...e2Base,
    eventHash: computeAuditEventHash(e1.eventHash, e2Base),
  };

  const verifyClean = verifyAuditChain([e1, e2]);
  assert.equal(verifyClean.valid, true);

  // Tamper with e1 afterValue
  const tamperedE1: AuditEvent = { ...e1, afterValue: 'Released/Refunded' };
  const verifyTampered = verifyAuditChain([tamperedE1, e2]);
  assert.equal(verifyTampered.valid, false);
  assert.equal(verifyTampered.brokenAtIndex, 0);
});

test('discrepancy engine flags amount shortfall, missing lien, and duplicate FDRs', () => {
  const inst: Institution = {
    id: 'COL-01',
    aicteId: '1-9988776655',
    name: 'Vishwakarma Institute of Engineering',
    state: 'Maharashtra',
    district: 'Pune',
    type: 'Engineering',
    nodalOfficerName: 'Prof. Kulkarni',
    email: 'nodal@vie.edu.in',
    mobile: '9822011223',
    approvalYear: '2025-26',
  };

  const fdr1: Instrument = {
    id: 'FDR-001',
    institutionId: 'COL-01',
    instrumentType: 'FDR',
    fdrNumber: 'SBIN/FDR/2025/778899',
    issuingBank: 'State Bank of India',
    branch: 'Pune Main',
    ifsc: 'SBIN0000454',
    accountHolderName: 'Unrelated Private Ltd',
    depositAmount: 1000000, // 10L < 15L required
    issueDate: '2025-01-10',
    maturityDate: '2026-11-05',
    validityEndDate: '2026-11-05',
    interestRate: 7.1,
    autoRenewalFlag: false,
    lienMarkedInFavourOfAICTE: false,
    requiredAmount: 1500000,
    purpose: 'Extension of Approval',
    status: 'Under Scrutiny',
    verificationLevel: 'Discrepancy-Flagged',
    riskScore: 0,
    riskFactors: [],
    discrepancies: [],
    createdAt: '2025-01-11',
    updatedAt: '2025-01-11',
  };

  const fdrDuplicate: Instrument = {
    ...fdr1,
    id: 'FDR-002',
    institutionId: 'COL-02', // Different institution claiming same FDR!
  };

  const flags = evaluateDiscrepancies(fdr1, inst, [fdr1, fdrDuplicate]);
  const ruleCodes = flags.map((f) => f.ruleCode);
  assert.ok(ruleCodes.includes('RULE_SHORTFALL_AMOUNT'));
  assert.ok(ruleCodes.includes('RULE_MISSING_AICTE_LIEN'));
  assert.ok(ruleCodes.includes('RULE_CROSS_INST_DUPLICATE_FDR'));
  assert.ok(ruleCodes.includes('RULE_HOLDER_NAME_MISMATCH'));

  const risk = calculateRiskScore(fdr1, '2026-10-24', 2);
  assert.ok(risk.score >= 70);
  assert.ok(risk.factors.length >= 3);
});

test('RBAC matrix enforces strict role boundaries', () => {
  assert.equal(canRolePerform('INSTITUTION_USER', 'SUBMIT_FDR'), true);
  assert.equal(canRolePerform('INSTITUTION_USER', 'MARK_VERIFIED'), false);
  assert.equal(canRolePerform('SYSTEM_ADMIN', 'VERIFY_AUDIT_CHAIN'), true);
  assert.equal(canRolePerform('SYSTEM_ADMIN', 'MARK_VERIFIED'), false);
});

test('F05 / J06: every seeded document SHA-256 checksum is an exact 64-character hex digest', () => {
  const seed = generateSeedData();
  assert.ok(seed.documents.length >= 90);
  for (const doc of seed.documents) {
    assert.equal(
      doc.hash.length,
      64,
      `Document ${doc.id} (${doc.fileName}) has invalid SHA-256 length ${doc.hash.length}: ${doc.hash}`
    );
    assert.match(doc.hash, /^[0-9a-f]{64}$/);
  }
});

test('C02 / J05 / U07: visible risk factor weights sum identically to displayed risk score across all instruments', () => {
  const seed = generateSeedData();
  for (const inst of seed.instruments) {
    const sumOfFactors = inst.riskFactors.reduce((acc, f) => acc + f.weight, 0);
    assert.equal(
      sumOfFactors,
      inst.riskScore,
      `Instrument ${inst.id} has riskScore=${inst.riskScore} but factor sum=${sumOfFactors}`
    );
  }
});

test('Task B / U04 / J07: validateBankReplyVersion blocks stale R1 (v1.0) bank reply when R2 (v2.0) is active', () => {
  const validCurrent = validateBankReplyVersion(1, 1);
  assert.equal(validCurrent.accepted, true);

  const staleReply = validateBankReplyVersion(2, 1);
  assert.equal(staleReply.accepted, false);
  assert.match(staleReply.reason || '', /Stale Bank Reply Blocked/i);
});

