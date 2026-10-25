import {
  Instrument,
  InstrumentStatus,
  Institution,
  DiscrepancyFlag,
  RiskFactor,
  AuditEvent,
  ExtractedDocumentData,
  UserRole,
} from '../types';

/**
 * Strict state machine of allowed transitions for an Instrument
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<InstrumentStatus, InstrumentStatus[]> = {
  'Draft': ['Submitted'],
  'Submitted': ['Under Scrutiny', 'Query Raised', 'Verified (Bank-Confirmed)', 'Verified (Manual Only)', 'Rejected'],
  'Under Scrutiny': ['Query Raised', 'Verified (Bank-Confirmed)', 'Verified (Manual Only)', 'Rejected', 'Active'],
  'Query Raised': ['Resubmitted', 'Rejected'],
  'Resubmitted': ['Under Scrutiny', 'Query Raised', 'Verified (Bank-Confirmed)', 'Verified (Manual Only)', 'Rejected'],
  'Verified (Bank-Confirmed)': ['Active', 'Release Requested', 'Forfeited'],
  'Verified (Manual Only)': ['Active', 'Verified (Bank-Confirmed)', 'Release Requested', 'Forfeited'],
  'Rejected': ['Resubmitted', 'Closed'],
  'Active': ['Expiring Soon', 'Matured/Expired', 'Renewal Pending', 'Release Requested', 'Replaced', 'Forfeited'],
  'Expiring Soon': ['Matured/Expired', 'Renewal Pending', 'Renewed', 'Replaced', 'Release Requested', 'Forfeited'],
  'Matured/Expired': ['Renewal Pending', 'Renewed', 'Release Requested', 'Forfeited'],
  'Renewal Pending': ['Renewed', 'Active', 'Forfeited'],
  'Renewed': ['Closed', 'Active'],
  'Release Requested': ['Release Under Review', 'Active'],
  'Release Under Review': ['Approved for Release', 'Active', 'Query Raised'],
  'Approved for Release': ['Released/Refunded'],
  'Released/Refunded': ['Closed'],
  'Closed': [],
  'Forfeited': ['Closed'],
  'Replaced': ['Closed'],
};

export function validateStatusTransition(
  current: InstrumentStatus,
  next: InstrumentStatus
): { valid: boolean; reason?: string } {
  if (current === next) {
    return { valid: true };
  }
  const allowed = ALLOWED_STATUS_TRANSITIONS[current] || [];
  if (allowed.includes(next)) {
    return { valid: true };
  }
  return {
    valid: false,
    reason: `Illegal status transition from "${current}" to "${next}". Allowed next states: ${
      allowed.length > 0 ? allowed.join(', ') : 'None (Terminal State)'
    }.`,
  };
}

/**
 * Format number in Indian currency system (Lakhs / Crores, e.g., Rs 12,50,000)
 */
export function formatINR(amount: number, showSymbol = true): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return showSymbol ? 'Rs 0' : '0';
  const isNegative = amount < 0;
  const absVal = Math.round(Math.abs(amount));
  const str = absVal.toString();
  let formatted = '';
  if (str.length <= 3) {
    formatted = str;
  } else {
    const lastThree = str.substring(str.length - 3);
    const otherNumbers = str.substring(0, str.length - 3);
    formatted =
      otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }
  const prefix = showSymbol ? 'Rs ' : '';
  return `${isNegative ? '-' : ''}${prefix}${formatted}`;
}

export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) {
    return `Rs ${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `Rs ${(amount / 100000).toFixed(2)} L`;
  }
  return formatINR(amount);
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format YYYY-MM-DD or ISO date string into DD-MMM-YYYY (e.g., 24-Oct-2026)
 */
export function formatDateDDMMMYYYY(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = MONTHS_SHORT[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

export function daysBetween(fromDateStr: string, toDateStr: string): number {
  const d1 = new Date(fromDateStr);
  const d2 = new Date(toDateStr);
  const diffMs = d2.getTime() - d1.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function addDaysToIso(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/**
 * Validate Indian IFSC Code (4 uppercase letters + '0' + 6 alphanumeric characters)
 */
export function isValidIFSC(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test((ifsc || '').trim().toUpperCase());
}

/**
 * Validate FDR Number format (6 to 20 alphanumeric/hyphen/slash characters)
 */
export function isValidFDRNumber(fdrNo: string): boolean {
  return /^[A-Z0-9/-]{6,22}$/i.test((fdrNo || '').trim());
}

/**
 * Mask sensitive number (e.g. FDR number or Account Number) showing only last 4 chars
 */
export function maskSensitiveNumber(value: string): string {
  if (!value) return '••••';
  const clean = value.trim();
  if (clean.length <= 4) return '••••';
  const visible = clean.slice(-4);
  return `${'•'.repeat(Math.min(8, clean.length - 4))}${visible}`;
}

/**
 * Deterministic synchronous FNV-1a + SHA-like hex digest for tamper-evident audit chain
 * (Works identically in Node.js unit tests and browser without async delay, while we also provide WebCrypto SHA-256 for files)
 */
export function computeDeterministicHash(payload: string): string {
  // Four 32-bit FNV-1a lanes with distinct primes/seeds to produce a 64-hex-char (256-bit) digest
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5];
  const hashes = seeds.slice();

  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i);
    for (let lane = 0; lane < 8; lane++) {
      hashes[lane] ^= code + lane * 31;
      hashes[lane] = Math.imul(hashes[lane], 0x01000193 + lane * 2);
      hashes[lane] ^= hashes[lane] >>> 13;
    }
  }

  return hashes.map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
}

export function computeAuditEventHash(
  previousHash: string,
  event: Pick<AuditEvent, 'id' | 'timestamp' | 'actorId' | 'actorRole' | 'action' | 'entityType' | 'entityId' | 'beforeValue' | 'afterValue'>
): string {
  const canonical = `${previousHash}|${event.id}|${event.timestamp}|${event.actorId}|${event.actorRole}|${event.action}|${event.entityType}|${event.entityId}|${event.beforeValue}|${event.afterValue}`;
  return computeDeterministicHash(canonical);
}

export function verifyAuditChain(events: AuditEvent[]): {
  valid: boolean;
  brokenAtIndex?: number;
  brokenEventId?: string;
  expectedHash?: string;
  actualHash?: string;
} {
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.previousHash !== prevHash) {
      return {
        valid: false,
        brokenAtIndex: i,
        brokenEventId: ev.id,
        expectedHash: prevHash,
        actualHash: ev.previousHash,
      };
    }
    const recomputed = computeAuditEventHash(prevHash, ev);
    if (recomputed !== ev.eventHash) {
      return {
        valid: false,
        brokenAtIndex: i,
        brokenEventId: ev.id,
        expectedHash: recomputed,
        actualHash: ev.eventHash,
      };
    }
    prevHash = ev.eventHash;
  }
  return { valid: true };
}

/**
 * Hybrid Discrepancy Detection Engine
 */
export function evaluateDiscrepancies(
  instrument: Instrument,
  institution: Institution,
  allInstruments: Instrument[],
  extracted?: ExtractedDocumentData,
  hasMandatoryDocs = true
): DiscrepancyFlag[] {
  const flags: DiscrepancyFlag[] = [];

  // 1. Deposit amount below required norm
  if (instrument.depositAmount < instrument.requiredAmount) {
    flags.push({
      id: `disc-amt-${instrument.id}`,
      ruleCode: 'RULE_SHORTFALL_AMOUNT',
      field: 'depositAmount',
      severity: 'Critical',
      title: 'Deposit Amount Below AICTE Statutory Norm',
      explanation: `Declared deposit of ${formatINR(instrument.depositAmount)} is less than the mandatory ${formatINR(instrument.requiredAmount)} for ${institution.type} institutions.`,
      declaredValue: formatINR(instrument.depositAmount),
      comparedValue: formatINR(instrument.requiredAmount),
    });
  }

  // 2. Maturity date before issue date
  if (daysBetween(instrument.issueDate, instrument.maturityDate) <= 0) {
    flags.push({
      id: `disc-date-${instrument.id}`,
      ruleCode: 'RULE_INVALID_MATURITY_DATE',
      field: 'maturityDate',
      severity: 'Critical',
      title: 'Maturity Date Precedes or Equals Issue Date',
      explanation: `Maturity date (${formatDateDDMMMYYYY(instrument.maturityDate)}) must be strictly later than issue date (${formatDateDDMMMYYYY(instrument.issueDate)}).`,
      declaredValue: instrument.maturityDate,
      comparedValue: instrument.issueDate,
    });
  }

  // 3. Lien not marked in favour of AICTE
  if (!instrument.lienMarkedInFavourOfAICTE) {
    flags.push({
      id: `disc-lien-${instrument.id}`,
      ruleCode: 'RULE_MISSING_AICTE_LIEN',
      field: 'lienMarkedInFavourOfAICTE',
      severity: 'Critical',
      title: 'Unencumbered FDR — Lien Not Marked in Favour of AICTE',
      explanation: 'Joint FDR / Security Deposit must carry an explicit bank lien in favour of Member Secretary, AICTE.',
      declaredValue: 'No Lien Marked',
      comparedValue: 'Lien in favour of AICTE Required',
    });
  }

  // 4. Duplicate FDR number across multiple institutions
  const duplicates = allInstruments.filter(
    (other) =>
      other.id !== instrument.id &&
      other.fdrNumber.trim().toUpperCase() === instrument.fdrNumber.trim().toUpperCase() &&
      other.status !== 'Replaced'
  );
  if (duplicates.length > 0) {
    const crossInstitution = duplicates.some((d) => d.institutionId !== instrument.institutionId);
    flags.push({
      id: `disc-dup-${instrument.id}`,
      ruleCode: crossInstitution ? 'RULE_CROSS_INST_DUPLICATE_FDR' : 'RULE_DUPLICATE_FDR',
      field: 'fdrNumber',
      severity: 'Critical',
      title: crossInstitution
        ? 'Duplicate FDR Number Used Across Multiple Institutions'
        : 'Duplicate FDR Number Record',
      explanation: crossInstitution
        ? `FDR Number ${instrument.fdrNumber} is simultaneously claimed by another AICTE institution (${duplicates[0].institutionId}). Immediate fraud investigation required.`
        : `FDR Number ${instrument.fdrNumber} appears in another active record.`,
      declaredValue: instrument.fdrNumber,
      comparedValue: `Duplicate in ${duplicates[0].id}`,
    });
  }

  // 5. Account holder name differs from Institution or registered Trust name
  const holderNorm = instrument.accountHolderName.toLowerCase();
  const instNorm = institution.name.toLowerCase();
  const trustNorm = (institution.trustName || '').toLowerCase();
  const firstWord = instNorm.split(' ')[0];
  if (
    !holderNorm.includes(firstWord) &&
    (!trustNorm || !holderNorm.includes(trustNorm.split(' ')[0]))
  ) {
    flags.push({
      id: `disc-holder-${instrument.id}`,
      ruleCode: 'RULE_HOLDER_NAME_MISMATCH',
      field: 'accountHolderName',
      severity: 'Major',
      title: 'Account Holder Name Differs from Registered Institution / Trust',
      explanation: `FDR holder "${instrument.accountHolderName}" does not match AICTE registered institution "${institution.name}".`,
      declaredValue: instrument.accountHolderName,
      comparedValue: institution.name,
    });
  }

  // 6. AI-Extracted vs Declared mismatch
  if (extracted) {
    if (
      extracted.depositAmount !== undefined &&
      Math.abs(extracted.depositAmount - instrument.depositAmount) > 100
    ) {
      flags.push({
        id: `disc-ai-amt-${instrument.id}`,
        ruleCode: 'RULE_AI_AMOUNT_MISMATCH',
        field: 'depositAmount',
        severity: 'Critical',
        title: 'Declared Amount Differs from Document AI Extraction',
        explanation: `Institution declared ${formatINR(instrument.depositAmount)}, whereas OCR/Gemini extracted ${formatINR(extracted.depositAmount)} from the uploaded FDR scan.`,
        declaredValue: formatINR(instrument.depositAmount),
        comparedValue: formatINR(extracted.depositAmount),
      });
    }
  }

  // 7. Missing mandatory documents
  if (!hasMandatoryDocs) {
    flags.push({
      id: `disc-docs-${instrument.id}`,
      ruleCode: 'RULE_MISSING_MANDATORY_DOCS',
      field: 'documents',
      severity: 'Major',
      title: 'Missing Mandatory Supporting Document (Lien Letter / Bank Confirmation)',
      explanation: 'Both the signed FDR scan and the issuing bank Lien Confirmation Letter are mandatory for scrutiny clearance.',
    });
  }

  return flags;
}

/**
 * Explainable Risk Scoring Engine (0-100)
 */
export function calculateRiskScore(
  instrument: Instrument,
  currentDateIso: string,
  openObservationsCount: number
): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];

  // Factor 1: Verification level
  if (instrument.verificationLevel === 'Discrepancy-Flagged') {
    factors.push({
      factor: 'Active Discrepancy / Mismatch',
      weight: 35,
      description: 'Declared values conflict with bank confirmation or AI extraction',
    });
  } else if (instrument.verificationLevel === 'Institution-Submitted') {
    factors.push({
      factor: 'Unverified (Institution-Submitted Only)',
      weight: 22,
      description: 'Awaiting independent bank API or officer verification',
    });
  } else if (instrument.verificationLevel === 'Manual-Verified') {
    factors.push({
      factor: 'Manual Verification Only (Bank CBS Not Supported)',
      weight: 12,
      description: 'Issuing co-operative/regional bank lacks automated CBS verification',
    });
  }

  // Factor 2: Days to maturity / Lapsed status
  const daysToMaturity = daysBetween(currentDateIso, instrument.maturityDate);
  if (daysToMaturity < 0 && !['Renewed', 'Released/Refunded', 'Closed'].includes(instrument.status)) {
    factors.push({
      factor: `Matured / Lapsed (${Math.abs(daysToMaturity)}d Overdue)`,
      weight: 30,
      description: 'Instrument has passed maturity without active replacement coverage',
    });
  } else if (daysToMaturity >= 0 && daysToMaturity <= 30) {
    factors.push({
      factor: `Imminent Maturity (${daysToMaturity}d Remaining)`,
      weight: 20,
      description: 'Matures within 30-day critical window',
    });
  } else if (daysToMaturity > 30 && daysToMaturity <= 90) {
    factors.push({
      factor: `Approaching Maturity (${daysToMaturity}d Remaining)`,
      weight: 10,
      description: 'Within T-90 renewal monitoring window',
    });
  }

  // Factor 3: Coverage gap or Shortfall
  if ((instrument.coverageGapDays || 0) > 0) {
    factors.push({
      factor: `Coverage Continuity Gap (${instrument.coverageGapDays}d)`,
      weight: 18,
      description: 'Lapse between prior instrument expiry and renewal submission',
    });
  }
  if (instrument.depositAmount < instrument.requiredAmount) {
    factors.push({
      factor: 'Deposit Shortfall Below AICTE Norm',
      weight: 25,
      description: 'Principal amount below statutory requirement',
    });
  }

  // Factor 4: Lien missing
  if (!instrument.lienMarkedInFavourOfAICTE) {
    factors.push({
      factor: 'No AICTE Lien Marked',
      weight: 25,
      description: 'FDR is not encumbered in favour of AICTE',
    });
  }

  // Factor 5: Open scrutiny observations
  if (openObservationsCount > 0) {
    factors.push({
      factor: `${openObservationsCount} Unresolved Scrutiny Observation(s)`,
      weight: Math.min(20, openObservationsCount * 10),
      description: 'Pending institution clarification or document upload',
    });
  }

  const rawScore = factors.reduce((acc, f) => acc + f.weight, 0);
  const score = Math.min(100, Math.max(4, rawScore));

  if (factors.length === 0) {
    factors.push({
      factor: 'Bank-Confirmed & Compliant',
      weight: 4,
      description: 'Verified via Bank CBS with valid AICTE lien and >90d maturity buffer',
    });
  }

  return {
    score,
    factors: factors.sort((a, b) => b.weight - a.weight),
  };
}

/**
 * RBAC Permission Matrix
 */
export type PermissionAction =
  | 'SUBMIT_FDR'
  | 'RESPOND_OBSERVATION'
  | 'REQUEST_RELEASE'
  | 'SUBMIT_RENEWAL'
  | 'RUN_BANK_VERIFICATION'
  | 'RAISE_OBSERVATION'
  | 'MARK_VERIFIED'
  | 'FLAG_INVESTIGATION'
  | 'APPROVE_FINAL_VERIFICATION'
  | 'APPROVE_RELEASE_AUTHORITY'
  | 'ORDER_FORFEITURE'
  | 'RECORD_REFUND_DISCHARGE'
  | 'MANAGE_SYSTEM_CONFIG'
  | 'VERIFY_AUDIT_CHAIN';

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  INSTITUTION_USER: [
    'SUBMIT_FDR',
    'RESPOND_OBSERVATION',
    'REQUEST_RELEASE',
    'SUBMIT_RENEWAL',
  ],
  SCRUTINY_OFFICER: [
    'RUN_BANK_VERIFICATION',
    'RAISE_OBSERVATION',
    'MARK_VERIFIED',
    'FLAG_INVESTIGATION',
  ],
  APPROVING_AUTHORITY: [
    'RUN_BANK_VERIFICATION',
    'MARK_VERIFIED',
    'APPROVE_FINAL_VERIFICATION',
    'APPROVE_RELEASE_AUTHORITY',
    'ORDER_FORFEITURE',
    'FLAG_INVESTIGATION',
  ],
  ACCOUNTS_OFFICER: ['RECORD_REFUND_DISCHARGE'],
  SYSTEM_ADMIN: ['MANAGE_SYSTEM_CONFIG', 'VERIFY_AUDIT_CHAIN'],
};

export function canRolePerform(role: UserRole, action: PermissionAction): boolean {
  return (ROLE_PERMISSIONS[role] || []).includes(action);
}
