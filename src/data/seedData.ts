import {
  Institution,
  Instrument,
  VerificationRecord,
  PortalDocument,
  ScrutinyObservation,
  ReleaseRequest,
  NotificationAlert,
  AuditEvent,
  PortalUser,
  ReminderRuleConfig,
  EscalationRuleConfig,
  DepositNormConfig,
  InstitutionType,
  InstrumentStatus,
} from '../types';
import {
  evaluateDiscrepancies,
  calculateRiskScore,
  computeAuditEventHash,
  formatINR,
} from '../utils/rules';

export const BASE_SYSTEM_DATE = '2026-10-24';

export interface DemoScenarioStep {
  id: number;
  title: string;
  badge: string;
  summary: string;
  recommendedRole: PortalUser['role'];
  targetTab: string;
  targetInstrumentId?: string;
  instructions: string[];
}

export const DEMO_SCENARIOS: DemoScenarioStep[] = [
  {
    id: 1,
    title: 'Scenario 1: New FDR Submission with AI Extraction & Bank Verification',
    badge: 'AI + CBS Match',
    summary: 'Demonstrates multi-step FDR submission with Gemini OCR pre-fill, SHA-256 document hash, and instant SBI Core Banking API confirmation.',
    recommendedRole: 'SCRUTINY_OFFICER',
    targetTab: 'scrutiny',
    targetInstrumentId: 'FDR-2026-0001',
    instructions: [
      'Inspect FDR-2026-0001 ( Pragati Institute of Engineering & Tech, Maharashtra ).',
      'Open the Verification tab to view side-by-side Institution-Declared vs AI-Extracted vs Bank-Confirmed fields.',
      'Click "Run Bank Verification" to trigger the SBI CBS Adapter and confirm 100% field match.',
    ],
  },
  {
    id: 2,
    title: 'Scenario 2: Validity Tracking — Validity Ending in 28 Days',
    badge: 'T-30 Alert Active',
    summary: 'Shows an active FDR whose AICTE lock-in validity expires in 28 days (21-Nov-2026), triggering T-30 multi-channel reminders.',
    recommendedRole: 'SCRUTINY_OFFICER',
    targetTab: 'alerts',
    targetInstrumentId: 'FDR-2026-0002',
    instructions: [
      'View FDR-2026-0002 ( Nalanda College of Pharmacy, Bihar ) in Monitoring & Alerts.',
      'Observe the T-30 Bilingual Reminder (English & Hindi) dispatched via In-App, Email, and SMS.',
      'Use the "Simulate Time (+15 Days)" control to watch it escalate automatically.',
    ],
  },
  {
    id: 3,
    title: 'Scenario 3: Approaching Maturity (12 Days) with L3 Escalation',
    badge: 'L3 Escalated',
    summary: 'FDR maturing in 12 days (05-Nov-2026) with no renewal submitted yet; escalated to L3 Scrutiny Officer with SLA timer.',
    recommendedRole: 'SCRUTINY_OFFICER',
    targetTab: 'scrutiny',
    targetInstrumentId: 'FDR-2026-0003',
    instructions: [
      'Inspect FDR-2026-0003 ( Cauvery Institute of Management, Karnataka ).',
      'Notice the high risk score and L3 Escalation badge.',
      'Use AI Smart Drafting to generate a bilingual urgent renewal notice.',
    ],
  },
  {
    id: 4,
    title: 'Scenario 4: Seamless Renewal — Version Chain Linked, Zero Coverage Gap',
    badge: '0d Gap Chain',
    summary: 'Prior FDR matured on 15-Oct-2026; institution submitted renewed FDR on 14-Oct-2026. Version history linked with 0-day gap.',
    recommendedRole: 'SCRUTINY_OFFICER',
    targetTab: 'renewals',
    targetInstrumentId: 'FDR-2026-0004',
    instructions: [
      'Navigate to Renewal & Continuity and view FDR-2026-0004 ( linked to prior FDR-2018-0094 ).',
      'Review the continuous green Coverage Continuity Timeline bar with 0 gap days.',
    ],
  },
  {
    id: 5,
    title: 'Scenario 5: Critical Coverage Gap — Lapsed 10 Days Ago Without Replacement',
    badge: '10d Lapsed · L4',
    summary: 'FDR matured on 14-Oct-2026 (10 days ago) with no replacement uploaded. Flagged Critical in red and escalated to L4 Regional Head.',
    recommendedRole: 'APPROVING_AUTHORITY',
    targetTab: 'renewals',
    targetInstrumentId: 'FDR-2026-0005',
    instructions: [
      'Examine FDR-2026-0005 ( Aravalli School of Architecture, Rajasthan ).',
      'See the red 10-day coverage gap alert and SLA breach timer.',
    ],
  },
  {
    id: 6,
    title: 'Scenario 6: Discrepancy Identification — Shortfall, Name Mismatch & Cross-Institution Duplicate',
    badge: 'Fraud / Mismatch',
    summary: 'Highlights three critical discrepancies across FDR-2026-0006A & FDR-2026-0006B: Deposit shortfall (Rs 10L vs Rs 15L norm), third-party trust name mismatch, and duplicate FDR number used across two institutions.',
    recommendedRole: 'SCRUTINY_OFFICER',
    targetTab: 'scrutiny',
    targetInstrumentId: 'FDR-2026-0006A',
    instructions: [
      'Open FDR-2026-0006A in Scrutiny Workspace.',
      'Check the red discrepancy banners for Cross-Institution Duplicate FDR Number, Amount Shortfall, and Holder Name Mismatch.',
      'Click "Flag for Investigation" or "Raise Observation".',
    ],
  },
  {
    id: 7,
    title: 'Scenario 7: Authorized Release — End-to-End Multi-Stage Workflow & Printable Order',
    badge: 'Release Order Ready',
    summary: 'Complete release lifecycle from eligibility check, Scrutiny review, Accounts verification, and Competent Authority approval to printable Release Order and discharge reference.',
    recommendedRole: 'ACCOUNTS_OFFICER',
    targetTab: 'releases',
    targetInstrumentId: 'FDR-2026-0007',
    instructions: [
      'Open Release & Refund and select Release Request REL-2026-01 for FDR-2026-0007.',
      'Preview the formal AICTE Release Order letter with QR code and record final bank discharge reference.',
    ],
  },
  {
    id: 8,
    title: 'Scenario 8: Blocked Release — Automatically Halted Due to Open Scrutiny Observation',
    badge: 'Auto-Blocked',
    summary: 'Institution requested release on FDR-2026-0008, but the engine automatically blocks approval because of an unresolved Critical observation and pending compliance check.',
    recommendedRole: 'APPROVING_AUTHORITY',
    targetTab: 'releases',
    targetInstrumentId: 'FDR-2026-0008',
    instructions: [
      'Select Release Request REL-2026-02 for FDR-2026-0008.',
      'Observe how the "Approve Release" button is blocked by policy with an explicit explanation of the open observation.',
    ],
  },
  {
    id: 9,
    title: 'Scenario 9: Unsupported Co-operative Bank — Verified (Manual Only)',
    badge: 'Manual Verification',
    summary: 'FDR issued by Saraswat Co-operative Bank which does not support automated CBS API verification; officer verifies physical bank confirmation letter and status remains "Verified (Manual Only)".',
    recommendedRole: 'SCRUTINY_OFFICER',
    targetTab: 'scrutiny',
    targetInstrumentId: 'FDR-2026-0009',
    instructions: [
      'Open FDR-2026-0009 and click "Run Bank Verification".',
      'Observe the adapter return "Not-supported" and keep the clear badge "Verified (Manual Only)".',
    ],
  },
  {
    id: 10,
    title: 'Scenario 10: RBAC Denial & Tamper-Evident Audit Hash Chain',
    badge: 'Zero-Trust Audit',
    summary: 'Simulates an unauthorized role attempting a privileged verification/release action, blocks it, logs the security event in the SHA-256 hash chain, and lets Admin verify integrity.',
    recommendedRole: 'SYSTEM_ADMIN',
    targetTab: 'admin',
    targetInstrumentId: 'FDR-2026-0001',
    instructions: [
      'In Admin & Audit Chain, click "Simulate Unauthorized Action (Scenario 10)" or switch to Institution role and attempt an officer action.',
      'Click "Verify Audit Chain Integrity" to recompute all SHA-256 hashes, then click "Tamper Demo Record" to watch tamper detection catch the modification.',
    ],
  },
];

export const SEED_USERS: PortalUser[] = [
  {
    id: 'USR-INST-01',
    name: 'Prof. Rajeshwari Deshmukh',
    email: 'nodal@pragati-engg.edu.in',
    role: 'INSTITUTION_USER',
    designation: 'College Nodal Officer (AICTE Compliance)',
    institutionId: 'INST-001',
    department: 'Pragati Institute of Engineering & Technology, Pune',
    active: true,
  },
  {
    id: 'USR-SCR-01',
    name: 'Shri Arvind Kumar Sinha',
    email: 'arvind.sinha@aicte-india.org',
    role: 'SCRUTINY_OFFICER',
    designation: 'Assistant Director (Regulation Bureau)',
    department: 'AICTE HQ — Scrutiny Cell II',
    active: true,
  },
  {
    id: 'USR-AUTH-01',
    name: 'Dr. Meenakshi Sundaram, IAS',
    email: 'advisor.reg@aicte-india.org',
    role: 'APPROVING_AUTHORITY',
    designation: 'Advisor-I & Competent Authority (Regulation)',
    department: 'AICTE HQ — Regulation Bureau',
    active: true,
  },
  {
    id: 'USR-FIN-01',
    name: 'Smt. Kavita Nair, ICAS',
    email: 'cao.finance@aicte-india.org',
    role: 'ACCOUNTS_OFFICER',
    designation: 'Senior Accounts & Finance Officer',
    department: 'AICTE Finance & Custody Division',
    active: true,
  },
  {
    id: 'USR-ADM-01',
    name: 'Shri Vikramaditya Rao',
    email: 'ciso.audit@aicte-india.org',
    role: 'SYSTEM_ADMIN',
    designation: 'Chief Audit & e-Governance Administrator',
    department: 'AICTE NIC / Digital Vigilance Cell',
    active: true,
  },
];

export const DEFAULT_REMINDER_RULES: ReminderRuleConfig[] = [
  {
    instrumentType: 'FDR',
    preMaturityDays: [90, 60, 30, 15, 7, 1],
    overdueDays: [1, 7, 15],
    channels: ['In-App', 'Email', 'SMS'],
  },
  {
    instrumentType: 'Bank Guarantee',
    preMaturityDays: [90, 60, 45, 30, 15, 7, 1],
    overdueDays: [1, 3, 7, 15],
    channels: ['In-App', 'Email', 'SMS'],
  },
  {
    instrumentType: 'Security Deposit',
    preMaturityDays: [60, 30, 15, 7, 1],
    overdueDays: [1, 7, 15],
    channels: ['In-App', 'Email'],
  },
];

export const DEFAULT_ESCALATION_MATRIX: EscalationRuleConfig[] = [
  {
    level: 'L1',
    targetTitle: 'Institution Nodal Officer',
    role: 'INSTITUTION_USER',
    timeoutDays: 7,
    autoAction: 'Send T-90 / T-60 / T-30 Automated Bilingual Reminder',
  },
  {
    level: 'L2',
    targetTitle: 'Principal / Director & Trust Chairman',
    role: 'INSTITUTION_USER',
    timeoutDays: 14,
    autoAction: 'Escalate unacknowledged T-15 reminder via Registered Email & SMS',
  },
  {
    level: 'L3',
    targetTitle: 'AICTE Scrutiny Officer (Regulation Bureau)',
    role: 'SCRUTINY_OFFICER',
    timeoutDays: 7,
    autoAction: 'Add to Priority Worklist & issue Show-Cause Observation Draft',
  },
  {
    level: 'L4',
    targetTitle: 'Regional Officer / Bureau Section Head',
    role: 'APPROVING_AUTHORITY',
    timeoutDays: 5,
    autoAction: 'Flag Institution for Extension of Approval (EoA) Hold',
  },
  {
    level: 'L5',
    targetTitle: 'Competent Authority / Member Secretary',
    role: 'APPROVING_AUTHORITY',
    timeoutDays: 3,
    autoAction: 'Initiate Statutory Penalty / Security Deposit Forfeiture Order',
  },
];

export const DEFAULT_DEPOSIT_NORMS: DepositNormConfig[] = [
  {
    institutionType: 'Engineering',
    minimumRequiredAmount: 3500000, // 35 Lakh
    minimumLockInYears: 8,
    mandatoryDocuments: ['FDR Copy', 'Lien Letter', 'Bank Confirmation', 'Board Resolution'],
  },
  {
    institutionType: 'Management',
    minimumRequiredAmount: 1500000, // 15 Lakh
    minimumLockInYears: 8,
    mandatoryDocuments: ['FDR Copy', 'Lien Letter', 'Bank Confirmation'],
  },
  {
    institutionType: 'Pharmacy',
    minimumRequiredAmount: 1500000, // 15 Lakh
    minimumLockInYears: 8,
    mandatoryDocuments: ['FDR Copy', 'Lien Letter', 'Bank Confirmation'],
  },
  {
    institutionType: 'Architecture',
    minimumRequiredAmount: 1500000, // 15 Lakh
    minimumLockInYears: 8,
    mandatoryDocuments: ['FDR Copy', 'Lien Letter', 'Bank Confirmation'],
  },
  {
    institutionType: 'Others',
    minimumRequiredAmount: 1000000, // 10 Lakh
    minimumLockInYears: 5,
    mandatoryDocuments: ['FDR Copy', 'Lien Letter'],
  },
];

const STATES_DATA = [
  { state: 'Maharashtra', districts: ['Pune', 'Nagpur', 'Mumbai Suburban', 'Nashik'] },
  { state: 'Karnataka', districts: ['Bengaluru Urban', 'Mysuru', 'Belagavi', 'Dharwad'] },
  { state: 'Tamil Nadu', districts: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli'] },
  { state: 'Uttar Pradesh', districts: ['Lucknow', 'Kanpur Nagar', 'Gautam Buddha Nagar', 'Varanasi'] },
  { state: 'Telangana', districts: ['Hyderabad', 'Rangareddy', 'Warangal'] },
  { state: 'Gujarat', districts: ['Ahmedabad', 'Vadodara', 'Surat', 'Rajkot'] },
  { state: 'Rajasthan', districts: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'] },
  { state: 'Madhya Pradesh', districts: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior'] },
  { state: 'West Bengal', districts: ['Kolkata', 'Howrah', 'Paschim Bardhaman'] },
  { state: 'Kerala', districts: ['Thiruvananthapuram', 'Ernakulam', 'Kozhikode'] },
  { state: 'Bihar', districts: ['Patna', 'Gaya', 'Muzaffarpur'] },
  { state: 'Odisha', districts: ['Khordha', 'Cuttack', 'Sundargarh'] },
  { state: 'Punjab', districts: ['Ludhiana', 'Patiala', 'Amritsar'] },
  { state: 'Assam', districts: ['Kamrup Metropolitan', 'Dibrugarh'] },
];

const BANKS_DATA = [
  { name: 'State Bank of India', prefix: 'SBIN000', code: 'SBI' },
  { name: 'Punjab National Bank', prefix: 'PUNB001', code: 'PNB' },
  { name: 'Bank of Baroda', prefix: 'BARB000', code: 'BOB' },
  { name: 'Canara Bank', prefix: 'CNRB000', code: 'CNB' },
  { name: 'Union Bank of India', prefix: 'UBIN053', code: 'UBI' },
  { name: 'HDFC Bank', prefix: 'HDFC000', code: 'HDFC' },
  { name: 'ICICI Bank', prefix: 'ICIC000', code: 'ICIC' },
  { name: 'Axis Bank', prefix: 'UTIB000', code: 'AXIS' },
  { name: 'Kotak Mahindra Bank', prefix: 'KKBK000', code: 'KTK' },
  { name: 'Saraswat Co-operative Bank', prefix: 'SRCB000', code: 'SRCB' },
];

const COLLEGE_PREFIXES = [
  'Pragati', 'Nalanda', 'Cauvery', 'Aravalli', 'Vindhya', 'Sahyadri', 'Konark',
  'Deccan', 'Indraprastha', 'Bharati', 'Kalinga', 'Sabarmati', 'Godavari', 'Narmada',
  'Chola', 'Magadh', 'Satpura', 'Malwa', 'Coromandel', 'Doaba', 'Brahmaputra',
  'Vidarbha', 'Marathwada', 'Bundelkhand', 'Rohilkhand', 'Travancore', 'Malabar',
  'Hoysala', 'Kakatiya', 'Pallava', 'Maurya', 'Vikramshila', 'Takshashila', 'Utkal',
  'Saurashtra', 'Mewar', 'Marwar', 'Hadoti', 'Awadh', 'Purvanchal', 'Mithila', 'Kamrup',
];

const TYPE_SUFFIXES: { type: InstitutionType; suffix: string; reqAmt: number }[] = [
  { type: 'Engineering', suffix: 'Institute of Engineering & Technology', reqAmt: 3500000 },
  { type: 'Management', suffix: 'School of Management Studies', reqAmt: 1500000 },
  { type: 'Pharmacy', suffix: 'College of Pharmaceutical Sciences', reqAmt: 1500000 },
  { type: 'Architecture', suffix: 'Academy of Architecture & Planning', reqAmt: 1500000 },
  { type: 'Others', suffix: 'Polytechnic & Applied Institute', reqAmt: 1000000 },
];

const NODAL_NAMES = [
  'Prof. R. Deshmukh', 'Dr. S. K. Sharma', 'Prof. M. Subramanian', 'Dr. A. K. Verma',
  'Prof. P. Venkataraman', 'Dr. N. Patel', 'Prof. R. S. Rathore', 'Dr. V. K. Tiwari',
  'Prof. S. Chatterjee', 'Dr. K. M. Nair', 'Prof. A. K. Jha', 'Dr. B. K. Mohanty',
];

export function generateSeedData() {
  const institutions: Institution[] = [];
  const instruments: Instrument[] = [];
  const verifications: VerificationRecord[] = [];
  const documents: PortalDocument[] = [];
  const observations: ScrutinyObservation[] = [];
  const releaseRequests: ReleaseRequest[] = [];
  const notifications: NotificationAlert[] = [];
  const auditEvents: AuditEvent[] = [];

  // 1. Generate 42 realistic fictional institutions across 14 states
  for (let i = 0; i < 42; i++) {
    const stateObj = STATES_DATA[i % STATES_DATA.length];
    const district = stateObj.districts[i % stateObj.districts.length];
    const typeObj = TYPE_SUFFIXES[i % TYPE_SUFFIXES.length];
    const prefix = COLLEGE_PREFIXES[i % COLLEGE_PREFIXES.length];
    const id = `INST-${String(i + 1).padStart(3, '0')}`;
    const aicteId = `1-${String(21004500100 + i * 1379)}`;
    const name = `${prefix} ${typeObj.suffix}, ${district}`;

    institutions.push({
      id,
      aicteId,
      name,
      state: stateObj.state,
      district,
      type: typeObj.type,
      nodalOfficerName: NODAL_NAMES[i % NODAL_NAMES.length],
      email: `compliance@${prefix.toLowerCase()}-${district.toLowerCase().replace(/\s+/g, '')}.edu.in`,
      mobile: `98${String(20112200 + i * 313).slice(0, 8)}`,
      approvalYear: i % 3 === 0 ? '2018-19' : i % 2 === 0 ? '2022-23' : '2025-26',
      trustName: `${prefix} Charitable Education Trust`,
    });
  }

  // Helper to push instrument + initial docs + verification
  const addInstrument = (
    partial: Omit<Instrument, 'riskScore' | 'riskFactors' | 'discrepancies'> & {
      extractedOverride?: Partial<PortalDocument['extractedData']>;
      skipMandatoryDoc?: boolean;
      bankResult?: VerificationRecord['result'];
      bankConfirmedAmt?: number;
      bankConfirmedHolder?: string;
    }
  ) => {
    const inst = institutions.find((x) => x.id === partial.institutionId) || institutions[0];
    const {
      extractedOverride,
      skipMandatoryDoc,
      bankResult,
      bankConfirmedAmt,
      bankConfirmedHolder,
      ...baseInstrument
    } = partial;

    const extractedData = {
      issuingBank: baseInstrument.issuingBank,
      branch: baseInstrument.branch,
      ifsc: baseInstrument.ifsc,
      fdrNumber: baseInstrument.fdrNumber,
      accountHolderName: baseInstrument.accountHolderName,
      depositAmount: baseInstrument.depositAmount,
      issueDate: baseInstrument.issueDate,
      maturityDate: baseInstrument.maturityDate,
      interestRate: baseInstrument.interestRate,
      lienText: baseInstrument.lienMarkedInFavourOfAICTE
        ? 'LIEN MARKED IN FAVOUR OF MEMBER SECRETARY, AICTE NEW DELHI'
        : 'NO ENCUMBRANCE / LIEN RECORDED',
      lienMarkedInFavourOfAICTE: baseInstrument.lienMarkedInFavourOfAICTE,
      signaturesPresent: true,
      stampPresent: true,
      confidences: {
        issuingBank: 99,
        branch: 96,
        ifsc: 98,
        fdrNumber: 97,
        accountHolderName: 94,
        depositAmount: 98,
        issueDate: 96,
        maturityDate: 97,
        interestRate: 92,
        lienText: baseInstrument.lienMarkedInFavourOfAICTE ? 95 : 64,
      },
      ...extractedOverride,
    };

    documents.push({
      id: `DOC-${baseInstrument.id}-1`,
      instrumentId: baseInstrument.id,
      type: 'FDR Copy',
      fileName: `${baseInstrument.id}_Signed_FDR_Receipt.pdf`,
      fileSizeKb: 420,
      version: 1,
      uploadedBy: inst.nodalOfficerName,
      uploadedAt: baseInstrument.createdAt,
      hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b${String(documents.length + 10).slice(-3)}`,
      extractedData,
      aiFlags:
        extractedData.depositAmount !== baseInstrument.depositAmount
          ? ['Extracted amount differs from declared amount']
          : !baseInstrument.lienMarkedInFavourOfAICTE
          ? ['Lien endorsement clause missing on scan']
          : [],
    });

    if (!skipMandatoryDoc) {
      documents.push({
        id: `DOC-${baseInstrument.id}-2`,
        instrumentId: baseInstrument.id,
        type: 'Lien Letter',
        fileName: `${baseInstrument.id}_Bank_Lien_Certificate.pdf`,
        fileSizeKb: 285,
        version: 1,
        uploadedBy: inst.nodalOfficerName,
        uploadedAt: baseInstrument.createdAt,
        hash: `a94a8fe5ccb19ba61c4c0873d391e987982fbbd3f1e2d3c4b5a6978877665${String(documents.length + 10).slice(-3)}`,
        aiFlags: [],
      });
    }

    const vRes: VerificationRecord['result'] =
      bankResult ||
      (baseInstrument.verificationLevel === 'Bank-Confirmed'
        ? 'Match'
        : baseInstrument.verificationLevel === 'Discrepancy-Flagged'
        ? 'Mismatch'
        : baseInstrument.verificationLevel === 'Manual-Verified'
        ? 'Not-supported'
        : 'Unable to verify');

    const confirmedAmt = bankConfirmedAmt ?? baseInstrument.depositAmount;
    const confirmedHolder = bankConfirmedHolder ?? baseInstrument.accountHolderName;

    verifications.push({
      id: `VER-${baseInstrument.id}`,
      instrumentId: baseInstrument.id,
      source:
        baseInstrument.verificationLevel === 'Bank-Confirmed'
          ? 'Bank-API-Confirmed'
          : baseInstrument.verificationLevel === 'Manual-Verified'
          ? 'Officer-Manual'
          : 'Document-AI-Extracted',
      result: vRes,
      confirmedBy:
        baseInstrument.verificationLevel === 'Bank-Confirmed'
          ? `${baseInstrument.issuingBank} CBS Gateway`
          : 'Shri Arvind Kumar Sinha (Scrutiny Officer)',
      timestamp: baseInstrument.updatedAt,
      referenceId: `CBS-REF-${baseInstrument.id.replace(/[^0-9]/g, '')}-2026`,
      fieldsCompared: [
        {
          field: 'fdrNumber',
          label: 'FDR / BG Number',
          declared: baseInstrument.fdrNumber,
          aiExtracted: extractedData.fdrNumber,
          aiConfidence: extractedData.confidences?.fdrNumber ?? 97,
          bankConfirmed: vRes === 'Not-supported' ? 'N/A (Manual)' : baseInstrument.fdrNumber,
          matchStatus: 'MATCH',
        },
        {
          field: 'depositAmount',
          label: 'Principal Deposit Amount',
          declared: formatINR(baseInstrument.depositAmount),
          aiExtracted: formatINR(extractedData.depositAmount || baseInstrument.depositAmount),
          aiConfidence: extractedData.confidences?.depositAmount ?? 98,
          bankConfirmed:
            vRes === 'Not-supported'
              ? 'N/A (Manual)'
              : formatINR(confirmedAmt),
          matchStatus:
            confirmedAmt === baseInstrument.depositAmount &&
            extractedData.depositAmount === baseInstrument.depositAmount
              ? 'MATCH'
              : 'MISMATCH',
        },
        {
          field: 'accountHolderName',
          label: 'Joint Account Holder Name',
          declared: baseInstrument.accountHolderName,
          aiExtracted: extractedData.accountHolderName,
          aiConfidence: extractedData.confidences?.accountHolderName ?? 94,
          bankConfirmed: vRes === 'Not-supported' ? 'N/A (Manual)' : confirmedHolder,
          matchStatus:
            confirmedHolder === baseInstrument.accountHolderName ? 'MATCH' : 'MISMATCH',
        },
        {
          field: 'maturityDate',
          label: 'Maturity Date',
          declared: baseInstrument.maturityDate,
          aiExtracted: extractedData.maturityDate,
          aiConfidence: 97,
          bankConfirmed: vRes === 'Not-supported' ? 'N/A (Manual)' : baseInstrument.maturityDate,
          matchStatus: 'MATCH',
        },
        {
          field: 'lienMarkedInFavourOfAICTE',
          label: 'AICTE Lien Endorsement',
          declared: baseInstrument.lienMarkedInFavourOfAICTE ? 'Yes (Marked to AICTE)' : 'No',
          aiExtracted: extractedData.lienMarkedInFavourOfAICTE ? 'Yes (Marked to AICTE)' : 'No',
          aiConfidence: extractedData.confidences?.lienText ?? 95,
          bankConfirmed:
            vRes === 'Not-supported'
              ? 'Verified via Physical Bank Letter'
              : baseInstrument.lienMarkedInFavourOfAICTE
              ? 'Active Lien: Member Secretary AICTE'
              : 'No Lien Found',
          matchStatus: baseInstrument.lienMarkedInFavourOfAICTE ? 'MATCH' : 'MISMATCH',
        },
      ],
    });

    const fullInstrument: Instrument = {
      ...baseInstrument,
      riskScore: 10,
      riskFactors: [],
      discrepancies: [],
    };
    instruments.push(fullInstrument);
  };

  // =========================================================================
  // EXPLICIT 10 DEMO SCENARIOS (FDR-2026-0001 through FDR-2026-0009 + Prior)
  // =========================================================================

  // Scenario 1: New FDR submission with AI extraction & successful bank verification
  addInstrument({
    id: 'FDR-2026-0001',
    institutionId: 'INST-001',
    instrumentType: 'FDR',
    fdrNumber: 'SBIN/FDR/2026/901122',
    issuingBank: 'State Bank of India',
    branch: 'Pune Camp Treasury Branch',
    ifsc: 'SBIN0000454',
    accountHolderName: 'Pragati Institute of Engineering & Technology & Member Secretary AICTE',
    depositAmount: 3500000,
    issueDate: '2026-10-15',
    maturityDate: '2034-10-15',
    validityEndDate: '2034-10-15',
    interestRate: 7.25,
    autoRenewalFlag: true,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 3500000,
    purpose: 'New B.Tech Intake Approval 2026-27',
    status: 'Verified (Bank-Confirmed)',
    verificationLevel: 'Bank-Confirmed',
    demoScenarioId: 1,
    demoScenarioLabel: 'Scenario 1: AI Extraction + SBI CBS Confirmed',
    assignedOfficerId: 'USR-SCR-01',
    acknowledgementRef: 'ACK-AICTE-2026-0001',
    createdAt: '2026-10-16',
    updatedAt: '2026-10-20',
  });

  // Scenario 2: Validity tracking — FDR with validity ending in 28 days (2026-11-21)
  addInstrument({
    id: 'FDR-2026-0002',
    institutionId: 'INST-011',
    instrumentType: 'FDR',
    fdrNumber: 'PUNB/FDR/2018/441209',
    issuingBank: 'Punjab National Bank',
    branch: 'Patna Secretariat Branch',
    ifsc: 'PUNB0014200',
    accountHolderName: 'Nalanda College of Pharmaceutical Sciences & AICTE',
    depositAmount: 1500000,
    issueDate: '2018-11-21',
    maturityDate: '2026-11-21',
    validityEndDate: '2026-11-21', // 28 days from 2026-10-24
    interestRate: 6.9,
    autoRenewalFlag: false,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 1500000,
    purpose: 'B.Pharm Initial Approval 2018-26',
    status: 'Expiring Soon',
    verificationLevel: 'Bank-Confirmed',
    demoScenarioId: 2,
    demoScenarioLabel: 'Scenario 2: Validity Ending in 28 Days (T-30 Alert)',
    assignedOfficerId: 'USR-SCR-01',
    acknowledgementRef: 'ACK-AICTE-2018-0412',
    createdAt: '2018-11-22',
    updatedAt: '2026-10-24',
  });

  // Scenario 3: Approaching maturity in 12 days (2026-11-05) with L3 escalation
  addInstrument({
    id: 'FDR-2026-0003',
    institutionId: 'INST-002',
    instrumentType: 'FDR',
    fdrNumber: 'CNRB/FDR/2018/773410',
    issuingBank: 'Canara Bank',
    branch: 'Bengaluru MG Road Corporate',
    ifsc: 'CNRB0000412',
    accountHolderName: 'Cauvery School of Management Studies & Member Secretary AICTE',
    depositAmount: 1500000,
    issueDate: '2018-11-05',
    maturityDate: '2026-11-05', // 12 days from 2026-10-24
    validityEndDate: '2026-11-05',
    interestRate: 7.0,
    autoRenewalFlag: false,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 1500000,
    purpose: 'PGDM / MBA Approval 2018-26',
    status: 'Expiring Soon',
    verificationLevel: 'Bank-Confirmed',
    demoScenarioId: 3,
    demoScenarioLabel: 'Scenario 3: Maturing in 12 Days (Escalated to L3)',
    assignedOfficerId: 'USR-SCR-01',
    acknowledgementRef: 'ACK-AICTE-2018-0819',
    createdAt: '2018-11-06',
    updatedAt: '2026-10-24',
  });

  // Scenario 4: Renewal — Old FDR (FDR-2018-0094) linked to new FDR (FDR-2026-0004) with 0 gap
  addInstrument({
    id: 'FDR-2018-0094',
    institutionId: 'INST-003',
    instrumentType: 'FDR',
    fdrNumber: 'BARB/FDR/2018/119082',
    issuingBank: 'Bank of Baroda',
    branch: 'Chennai Mount Road',
    ifsc: 'BARB0000211',
    accountHolderName: 'Sahyadri College of Pharmaceutical Sciences & AICTE',
    depositAmount: 1500000,
    issueDate: '2018-10-15',
    maturityDate: '2026-10-15',
    validityEndDate: '2026-10-15',
    interestRate: 6.85,
    autoRenewalFlag: true,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 1500000,
    purpose: 'Initial Approval 2018-26 (Prior Cycle)',
    status: 'Replaced',
    verificationLevel: 'Bank-Confirmed',
    replacedByInstrumentId: 'FDR-2026-0004',
    coverageGapDays: 0,
    createdAt: '2018-10-16',
    updatedAt: '2026-10-15',
  });

  addInstrument({
    id: 'FDR-2026-0004',
    institutionId: 'INST-003',
    instrumentType: 'FDR',
    fdrNumber: 'BARB/FDR/2026/884512',
    issuingBank: 'Bank of Baroda',
    branch: 'Chennai Mount Road',
    ifsc: 'BARB0000211',
    accountHolderName: 'Sahyadri College of Pharmaceutical Sciences & AICTE',
    depositAmount: 1500000,
    issueDate: '2026-10-14',
    maturityDate: '2034-10-14',
    validityEndDate: '2034-10-14',
    interestRate: 7.3,
    autoRenewalFlag: true,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 1500000,
    purpose: 'Renewal of Approval 2026-34',
    status: 'Renewed',
    verificationLevel: 'Bank-Confirmed',
    previousInstrumentId: 'FDR-2018-0094',
    coverageGapDays: 0,
    demoScenarioId: 4,
    demoScenarioLabel: 'Scenario 4: Seamless Renewal Chain (0d Coverage Gap)',
    assignedOfficerId: 'USR-SCR-01',
    acknowledgementRef: 'ACK-AICTE-2026-0004',
    createdAt: '2026-10-14',
    updatedAt: '2026-10-16',
  });

  // Scenario 5: Coverage gap — FDR lapsed 10 days ago (2026-10-14) with no replacement
  addInstrument({
    id: 'FDR-2026-0005',
    institutionId: 'INST-004',
    instrumentType: 'FDR',
    fdrNumber: 'UBIN/FDR/2018/550192',
    issuingBank: 'Union Bank of India',
    branch: 'Lucknow Hazratganj',
    ifsc: 'UBIN0531012',
    accountHolderName: 'Aravalli Academy of Architecture & Planning & AICTE',
    depositAmount: 1500000,
    issueDate: '2018-10-14',
    maturityDate: '2026-10-14', // Lapsed 10 days ago
    validityEndDate: '2026-10-14',
    interestRate: 6.75,
    autoRenewalFlag: false,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 1500000,
    purpose: 'B.Arch Statutory Deposit 2018-26',
    status: 'Matured/Expired',
    verificationLevel: 'Bank-Confirmed',
    coverageGapDays: 10,
    demoScenarioId: 5,
    demoScenarioLabel: 'Scenario 5: Lapsed 10 Days Ago — Critical Coverage Gap (L4)',
    assignedOfficerId: 'USR-SCR-01',
    acknowledgementRef: 'ACK-AICTE-2018-0550',
    createdAt: '2018-10-15',
    updatedAt: '2026-10-24',
  });

  // Scenario 6: Discrepancy identification (Amount mismatch, Holder name mismatch, & Duplicate FDR number across two institutions)
  addInstrument({
    id: 'FDR-2026-0006A',
    institutionId: 'INST-006',
    instrumentType: 'FDR',
    fdrNumber: 'HDFC/FDR/2026/667788', // Duplicate number also used in FDR-2026-0006B!
    issuingBank: 'HDFC Bank',
    branch: 'Ahmedabad Navrangpura',
    ifsc: 'HDFC0000006',
    accountHolderName: 'Zenith Private Commercial Ventures LLP', // Holder name mismatch!
    depositAmount: 2000000, // Declared 20L, required is 35L, and AI/Bank says 12L!
    issueDate: '2026-09-01',
    maturityDate: '2034-09-01',
    validityEndDate: '2034-09-01',
    interestRate: 7.0,
    autoRenewalFlag: false,
    lienMarkedInFavourOfAICTE: false, // Missing lien too!
    requiredAmount: 3500000,
    purpose: 'Engineering Approval 2026-27',
    status: 'Under Scrutiny',
    verificationLevel: 'Discrepancy-Flagged',
    investigationFlag: true,
    demoScenarioId: 6,
    demoScenarioLabel: 'Scenario 6: Multi-Discrepancy & Duplicate FDR Fraud Flag',
    assignedOfficerId: 'USR-SCR-01',
    acknowledgementRef: 'ACK-AICTE-2026-006A',
    createdAt: '2026-09-05',
    updatedAt: '2026-10-22',
    extractedOverride: {
      depositAmount: 1200000,
      accountHolderName: 'Zenith Private Commercial Ventures LLP',
      confidences: {
        issuingBank: 98,
        branch: 95,
        ifsc: 97,
        fdrNumber: 92,
        accountHolderName: 62,
        depositAmount: 58,
        issueDate: 91,
        maturityDate: 90,
        interestRate: 88,
        lienText: 45,
      },
    },
    bankResult: 'Mismatch',
    bankConfirmedAmt: 1200000,
    bankConfirmedHolder: 'Zenith Private Commercial Ventures LLP',
  });

  addInstrument({
    id: 'FDR-2026-0006B',
    institutionId: 'INST-007', // Different institution claiming same FDR number!
    instrumentType: 'FDR',
    fdrNumber: 'HDFC/FDR/2026/667788',
    issuingBank: 'HDFC Bank',
    branch: 'Ahmedabad Navrangpura',
    ifsc: 'HDFC0000006',
    accountHolderName: 'KonarkSchool of Management Studies',
    depositAmount: 1500000,
    issueDate: '2026-09-10',
    maturityDate: '2034-09-10',
    validityEndDate: '2034-09-10',
    interestRate: 7.0,
    autoRenewalFlag: false,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 1500000,
    purpose: 'Management Intake 2026-27',
    status: 'Query Raised',
    verificationLevel: 'Discrepancy-Flagged',
    investigationFlag: true,
    assignedOfficerId: 'USR-SCR-01',
    createdAt: '2026-09-12',
    updatedAt: '2026-10-22',
    bankResult: 'Mismatch',
    bankConfirmedAmt: 1200000,
    bankConfirmedHolder: 'Zenith Private Commercial Ventures LLP',
  });

  // Scenario 7: Authorized Release — Complete workflow from request to Competent Authority approval
  addInstrument({
    id: 'FDR-2026-0007',
    institutionId: 'INST-001',
    instrumentType: 'FDR',
    fdrNumber: 'SBIN/FDR/2016/300911',
    issuingBank: 'State Bank of India',
    branch: 'Pune Camp Treasury Branch',
    ifsc: 'SBIN0000454',
    accountHolderName: 'Pragati Institute of Engineering & Technology & Member Secretary AICTE',
    depositAmount: 3500000,
    issueDate: '2016-07-01',
    maturityDate: '2024-07-01',
    validityEndDate: '2024-07-01',
    interestRate: 7.4,
    autoRenewalFlag: false,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 3500000,
    purpose: '8-Year Lock-In Completed (2016-2024 Batch)',
    status: 'Approved for Release',
    verificationLevel: 'Bank-Confirmed',
    demoScenarioId: 7,
    demoScenarioLabel: 'Scenario 7: Authorized Release — Ready for Discharge Order',
    assignedOfficerId: 'USR-SCR-01',
    acknowledgementRef: 'ACK-AICTE-2016-0300',
    createdAt: '2016-07-02',
    updatedAt: '2026-10-21',
  });

  // Scenario 8: Blocked Release — Blocked because of an open critical scrutiny observation
  addInstrument({
    id: 'FDR-2026-0008',
    institutionId: 'INST-008',
    instrumentType: 'FDR',
    fdrNumber: 'ICIC/FDR/2018/509123',
    issuingBank: 'ICICI Bank',
    branch: 'Bhopal MP Nagar',
    ifsc: 'ICIC0000281',
    accountHolderName: 'Deccan College of Pharmaceutical Sciences & AICTE',
    depositAmount: 1500000,
    issueDate: '2018-08-10',
    maturityDate: '2026-08-10',
    validityEndDate: '2026-08-10',
    interestRate: 7.1,
    autoRenewalFlag: false,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 1500000,
    purpose: 'Course Closure Release Application',
    status: 'Release Requested',
    verificationLevel: 'Bank-Confirmed',
    pendingComplianceFlag: true,
    demoScenarioId: 8,
    demoScenarioLabel: 'Scenario 8: Release Automatically Blocked (Open Observation)',
    assignedOfficerId: 'USR-SCR-01',
    createdAt: '2018-08-12',
    updatedAt: '2026-10-23',
  });

  // Scenario 9: Bank that does not support CBS API verification -> Verified (Manual Only)
  addInstrument({
    id: 'FDR-2026-0009',
    institutionId: 'INST-001',
    instrumentType: 'FDR',
    fdrNumber: 'SRCB/FDR/2026/710045',
    issuingBank: 'Saraswat Co-operative Bank',
    branch: 'Pune Kothrud Branch',
    ifsc: 'SRCB0000042',
    accountHolderName: 'Pragati Institute of Engineering & Technology & Member Secretary AICTE',
    depositAmount: 1500000,
    issueDate: '2026-08-01',
    maturityDate: '2034-08-01',
    validityEndDate: '2034-08-01',
    interestRate: 7.6,
    autoRenewalFlag: true,
    lienMarkedInFavourOfAICTE: true,
    requiredAmount: 1500000,
    purpose: 'Additional MBA Programme Security Deposit 2026',
    status: 'Verified (Manual Only)',
    verificationLevel: 'Manual-Verified',
    demoScenarioId: 9,
    demoScenarioLabel: 'Scenario 9: Co-op Bank CBS Unsupported — Verified (Manual Only)',
    assignedOfficerId: 'USR-SCR-01',
    acknowledgementRef: 'ACK-AICTE-2026-0009',
    createdAt: '2026-08-03',
    updatedAt: '2026-10-18',
    bankResult: 'Not-supported',
  });

  // =========================================================================
  // GENERATE 77 ADDITIONAL REALISTIC INSTRUMENTS (Total = 88 Instruments)
  // =========================================================================
  const statusPool: InstrumentStatus[] = [
    'Active', 'Active', 'Active', 'Active', 'Active',
    'Verified (Bank-Confirmed)', 'Verified (Bank-Confirmed)',
    'Verified (Manual Only)',
    'Under Scrutiny', 'Under Scrutiny',
    'Submitted', 'Submitted',
    'Query Raised', 'Resubmitted',
    'Expiring Soon', 'Expiring Soon', 'Expiring Soon',
    'Matured/Expired', 'Renewal Pending', 'Renewed',
    'Release Requested', 'Release Under Review', 'Released/Refunded', 'Closed', 'Forfeited',
  ];

  for (let k = 10; k <= 86; k++) {
    const inst = institutions[k % institutions.length];
    const bank = BANKS_DATA[k % BANKS_DATA.length];
    const status = statusPool[k % statusPool.length];
    const isCoop = bank.code === 'SRCB';

    // Determine realistic dates relative to 2026-10-24
    let issueDate = '2022-06-15';
    let maturityDate = '2030-06-15';
    if (status === 'Expiring Soon') {
      const daysAhead = 15 + (k % 70); // between 15 and 85 days from 2026-10-24
      const d = new Date('2026-10-24T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + daysAhead);
      maturityDate = d.toISOString().split('T')[0];
      issueDate = '2018-11-01';
    } else if (status === 'Matured/Expired' || status === 'Renewal Pending') {
      const daysAgo = 5 + (k % 25);
      const d = new Date('2026-10-24T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - daysAgo);
      maturityDate = d.toISOString().split('T')[0];
      issueDate = '2018-09-01';
    } else if (status === 'Active' && k % 4 === 0) {
      // Spread maturities across next 12 months for the 12-month forecast chart
      const monthsAhead = (k % 11) + 1;
      const d = new Date('2026-10-24T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth() + monthsAhead);
      maturityDate = d.toISOString().split('T')[0];
      issueDate = '2019-04-10';
    }

    const reqAmt =
      inst.type === 'Engineering'
        ? 3500000
        : inst.type === 'Others'
        ? 1000000
        : 1500000;

    const verificationLevel =
      status === 'Submitted' || status === 'Draft'
        ? 'Institution-Submitted'
        : status === 'Query Raised'
        ? 'Discrepancy-Flagged'
        : isCoop || status === 'Verified (Manual Only)'
        ? 'Manual-Verified'
        : 'Bank-Confirmed';

    addInstrument({
      id: `FDR-2026-${String(k + 1).padStart(4, '0')}`,
      institutionId: inst.id,
      instrumentType: k % 9 === 0 ? 'Bank Guarantee' : k % 13 === 0 ? 'Security Deposit' : 'FDR',
      fdrNumber: `${bank.code}/FDR/2026/${String(300000 + k * 719)}`,
      issuingBank: bank.name,
      branch: `${inst.district} Main Treasury`,
      ifsc: `${bank.prefix}${String(100 + k).padStart(3, '0')}`,
      accountHolderName: `${inst.name} & Member Secretary AICTE`,
      depositAmount: status === 'Query Raised' ? reqAmt - 500000 : reqAmt,
      issueDate,
      maturityDate,
      validityEndDate: maturityDate,
      interestRate: Number((6.7 + (k % 9) * 0.1).toFixed(2)),
      autoRenewalFlag: k % 2 === 0,
      lienMarkedInFavourOfAICTE: status !== 'Query Raised',
      requiredAmount: reqAmt,
      purpose: `Extension of Approval ${inst.approvalYear}`,
      status,
      verificationLevel,
      coverageGapDays: status === 'Matured/Expired' ? (k % 18) + 2 : 0,
      assignedOfficerId: 'USR-SCR-01',
      acknowledgementRef: `ACK-AICTE-2026-${String(k + 1).padStart(4, '0')}`,
      createdAt: issueDate,
      updatedAt: '2026-10-19',
    });
  }

  // Seed Scrutiny Observations
  observations.push(
    {
      id: 'OBS-2026-01',
      instrumentId: 'FDR-2026-0006A',
      officerId: 'USR-SCR-01',
      officerName: 'Shri Arvind Kumar Sinha',
      text: 'Critical Discrepancy: (1) Principal amount Rs 20,00,000 declared on portal differs from bank CBS confirmation of Rs 12,00,000 and is below the Rs 35,00,000 Engineering norm. (2) Account holder is a private LLP instead of the AICTE-approved Trust. (3) Same FDR number is claimed by INST-007.',
      severity: 'Critical',
      status: 'Open',
      createdAt: '2026-10-22T11:20:00Z',
    },
    {
      id: 'OBS-2026-02',
      instrumentId: 'FDR-2026-0008',
      officerId: 'USR-SCR-01',
      officerName: 'Shri Arvind Kumar Sinha',
      text: 'Release Blocked: Institution has not submitted the No-Dues / Student Redistribution Compliance Certificate from the affiliating University prior to course closure release.',
      severity: 'Critical',
      status: 'Open',
      createdAt: '2026-10-23T09:45:00Z',
    },
    {
      id: 'OBS-2026-03',
      instrumentId: 'FDR-2026-0001',
      officerId: 'USR-SCR-01',
      officerName: 'Shri Arvind Kumar Sinha',
      text: 'Initial scan had slight glare on the branch seal; re-verified directly via SBI CBS API (Ref: CBS-REF-20260001-2026). Closed.',
      severity: 'Info',
      status: 'Closed',
      createdAt: '2026-10-17T14:00:00Z',
      responseText: 'Uploaded high-resolution 300 DPI scan of original FDR and Lien certificate.',
      respondedAt: '2026-10-18T10:15:00Z',
    }
  );

  // Seed Release Requests (Scenario 7 & Scenario 8)
  releaseRequests.push(
    {
      id: 'REL-2026-01',
      instrumentId: 'FDR-2026-0007',
      institutionId: 'INST-001',
      reason: 'Approval period complete',
      remarks: 'Completed mandatory 8-year lock-in period (2016–2024) with zero compliance defaults.',
      conditionsChecklist: [
        { id: 'c1', label: 'Mandatory 8-year statutory lock-in period completed', passed: true, details: 'Issued 01-Jul-2016; completed 8 years on 01-Jul-2024' },
        { id: 'c2', label: 'No pending scrutiny observations or discrepancy flags', passed: true, details: '0 open observations' },
        { id: 'c3', label: 'No active CBI / Vigilance / Court litigation flag', passed: true, details: 'Verified clear by Regulation Vigilance Cell' },
        { id: 'c4', label: 'No pending faculty salary or student fee refund dues', passed: true, details: 'Affiliating university NOC attached' },
      ],
      documents: ['DOC-FDR-2026-0007-1', 'DOC-FDR-2026-0007-2'],
      stages: [
        {
          stageName: 'Eligibility Auto-Check',
          approverRole: 'SCRUTINY_OFFICER',
          approverName: 'FDR-Setu Policy Engine',
          status: 'Approved',
          remarks: 'All 4 statutory release conditions passed automatically.',
          timestamp: '2026-10-18T10:00:00Z',
        },
        {
          stageName: 'Scrutiny Review',
          approverRole: 'SCRUTINY_OFFICER',
          approverName: 'Shri Arvind Kumar Sinha',
          status: 'Approved',
          remarks: 'Original physical FDR verified in AICTE Vault Locker #B-14.',
          timestamp: '2026-10-19T15:30:00Z',
        },
        {
          stageName: 'Accounts Verification',
          approverRole: 'ACCOUNTS_OFFICER',
          approverName: 'Smt. Kavita Nair, ICAS',
          status: 'Approved',
          remarks: 'No financial recovery pending against INST-001.',
          timestamp: '2026-10-20T12:10:00Z',
        },
        {
          stageName: 'Competent Authority Approval',
          approverRole: 'APPROVING_AUTHORITY',
          approverName: 'Dr. Meenakshi Sundaram, IAS',
          status: 'Approved',
          remarks: 'Approved for Lien Discharge and Release Order issuance.',
          timestamp: '2026-10-21T16:45:00Z',
        },
        {
          stageName: 'Discharge & Closure',
          approverRole: 'ACCOUNTS_OFFICER',
          status: 'Pending',
          slaHoursRemaining: 36,
        },
      ],
      finalDecision: 'Approved',
      releaseOrderNumber: 'F.No.AICTE/REG/FDR-REL/2026/0007',
      createdAt: '2026-10-18T09:55:00Z',
      updatedAt: '2026-10-21T16:45:00Z',
    },
    {
      id: 'REL-2026-02',
      instrumentId: 'FDR-2026-0008',
      institutionId: 'INST-008',
      reason: 'Course closure',
      remarks: 'Requesting FDR release following voluntary closure of B.Pharm shift-II.',
      conditionsChecklist: [
        { id: 'c1', label: 'Mandatory 8-year statutory lock-in period completed', passed: true, details: 'Issued 10-Aug-2018; matured 10-Aug-2026' },
        { id: 'c2', label: 'No pending scrutiny observations or discrepancy flags', passed: false, details: 'CRITICAL: Open Observation OBS-2026-02 pending response' },
        { id: 'c3', label: 'No active CBI / Vigilance / Court litigation flag', passed: true, details: 'Clear' },
        { id: 'c4', label: 'No pending faculty salary or student fee refund dues', passed: false, details: 'Affiliating University Student Redistribution NOC missing' },
      ],
      documents: ['DOC-FDR-2026-0008-1'],
      stages: [
        {
          stageName: 'Eligibility Auto-Check',
          approverRole: 'SCRUTINY_OFFICER',
          approverName: 'FDR-Setu Policy Engine',
          status: 'Rejected',
          remarks: 'Auto-Blocked: Open Critical Observation (OBS-2026-02) & Pending University NOC.',
          timestamp: '2026-10-23T10:00:00Z',
        },
        {
          stageName: 'Scrutiny Review',
          approverRole: 'SCRUTINY_OFFICER',
          status: 'Pending',
          slaHoursRemaining: 48,
        },
      ],
      finalDecision: 'Blocked',
      blockedReason: 'Release is automatically blocked by AICTE Regulation Policy because Observation OBS-2026-02 is Open and Pending Compliance Flag is active.',
      createdAt: '2026-10-23T09:50:00Z',
      updatedAt: '2026-10-23T10:00:00Z',
    }
  );

  // Compute discrepancies & explainable risk scores for all instruments
  for (const item of instruments) {
    const inst = institutions.find((i) => i.id === item.institutionId) || institutions[0];
    const doc = documents.find((d) => d.instrumentId === item.id && d.type === 'FDR Copy');
    const openObs = observations.filter(
      (o) => o.instrumentId === item.id && o.status === 'Open'
    ).length;

    item.discrepancies = evaluateDiscrepancies(
      item,
      inst,
      instruments,
      doc?.extractedData,
      true
    );
    const risk = calculateRiskScore(item, BASE_SYSTEM_DATE, openObs);
    item.riskScore = risk.score;
    item.riskFactors = risk.factors;
  }

  // Seed Notifications & Escalations
  notifications.push(
    {
      id: 'ALT-2026-001',
      recipientRole: 'INSTITUTION_USER',
      institutionId: 'INST-011',
      channel: 'Email',
      type: 'Validity Expiry',
      title: 'T-30 Statutory Validity Expiry Reminder — FDR-2026-0002',
      messageEn: 'Dear Nodal Officer (Nalanda College of Pharmaceutical Sciences), your AICTE Security Deposit FDR PUNB/FDR/2018/441209 (Rs 15,00,000) expires in 28 days on 21-Nov-2026. Please submit renewal receipt before maturity to prevent coverage gap.',
      messageHi: 'प्रिय नोडल अधिकारी, आपकी AICTE सुरक्षा जमा FDR PUNB/FDR/2018/441209 (रु 15,00,000) की वैधता 28 दिनों में 21-Nov-2026 को समाप्त हो रही है। कृपया कवरेज अंतराल से बचने के लिए परिपक्वता से पूर्व नवीनीकरण रसीद अपलोड करें।',
      instrumentId: 'FDR-2026-0002',
      dueDate: '2026-11-21',
      triggerRule: 'T-30 Pre-Maturity Rule',
      severity: 'Warning',
      status: 'Sent',
      escalationLevel: 'L1',
      createdAt: '2026-10-22T08:00:00Z',
    },
    {
      id: 'ALT-2026-002',
      recipientRole: 'SCRUTINY_OFFICER',
      institutionId: 'INST-002',
      channel: 'In-App',
      type: 'Maturity Reminder',
      title: 'L3 Escalation: FDR Maturing in 12 Days Without Renewal (FDR-2026-0003)',
      messageEn: 'Escalated to L3 Scrutiny Officer: Cauvery School of Management Studies FDR CNRB/FDR/2018/773410 (Rs 15,00,000) matures on 05-Nov-2026 (12 days remaining). L1 & L2 reminders unacknowledged.',
      messageHi: 'L3 स्क्रूटनी अधिकारी को एस्केलेट किया गया: कावेरी स्कूल ऑफ मैनेजमेंट स्टडीज का FDR CNRB/FDR/2018/773410 (रु 15,00,000) 05-Nov-2026 (12 दिन शेष) को परिपक्व हो रहा है।',
      instrumentId: 'FDR-2026-0003',
      dueDate: '2026-11-05',
      triggerRule: 'T-15 Unacknowledged -> L3 Escalation',
      severity: 'Critical',
      status: 'Escalated',
      escalationLevel: 'L3',
      slaHoursOverdue: 18,
      createdAt: '2026-10-23T08:00:00Z',
    },
    {
      id: 'ALT-2026-003',
      recipientRole: 'APPROVING_AUTHORITY',
      institutionId: 'INST-004',
      channel: 'SMS',
      type: 'Overdue Renewal',
      title: 'L4 Critical Breach: FDR Lapsed 10 Days Ago With No Replacement (FDR-2026-0005)',
      messageEn: 'URGENT L4 ESCALATION: Aravalli Academy of Architecture FDR UBIN/FDR/2018/550192 (Rs 15,00,000) matured on 14-Oct-2026 (+10 days overdue). Coverage gap active. Recommend EoA Hold.',
      messageHi: 'तत्काल L4 एस्केलेशन: अरावली एकेडमी ऑफ आर्किटेक्चर का FDR UBIN/FDR/2018/550192 14-Oct-2026 को समाप्त हो चुका है (+10 दिन अतिदेय)। कोई प्रतिस्थापन प्रस्तुत नहीं किया गया है।',
      instrumentId: 'FDR-2026-0005',
      dueDate: '2026-10-14',
      triggerRule: '+7 Days Overdue -> L4 Escalation',
      severity: 'Critical',
      status: 'Escalated',
      escalationLevel: 'L4',
      slaHoursOverdue: 72,
      createdAt: '2026-10-24T06:30:00Z',
    },
    {
      id: 'ALT-2026-004',
      recipientRole: 'SCRUTINY_OFFICER',
      institutionId: 'INST-006',
      channel: 'In-App',
      type: 'Discrepancy Alert',
      title: 'Cross-Institution Duplicate FDR & Amount Mismatch Detected (FDR-2026-0006A)',
      messageEn: 'Hybrid AI + Rule Engine flagged FDR HDFC/FDR/2026/667788 for duplicate usage across INST-006 and INST-007 plus Rs 8,00,000 discrepancy against HDFC CBS.',
      messageHi: 'हाइब्रिड AI इंजन ने FDR HDFC/FDR/2026/667788 को दो संस्थानों (INST-006 और INST-007) में डुप्लिकेट उपयोग और राशि विसंगति के लिए चिह्नित किया है।',
      instrumentId: 'FDR-2026-0006A',
      dueDate: '2026-10-25',
      triggerRule: 'RULE_CROSS_INST_DUPLICATE_FDR',
      severity: 'Critical',
      status: 'Pending',
      escalationLevel: 'L3',
      createdAt: '2026-10-22T11:25:00Z',
    },
    {
      id: 'ALT-2026-005',
      recipientRole: 'INSTITUTION_USER',
      institutionId: 'INST-001',
      channel: 'In-App',
      type: 'Release Update',
      title: 'Competent Authority Approved FDR Release Order — FDR-2026-0007',
      messageEn: 'Your release application REL-2026-01 for FDR SBIN/FDR/2016/300911 (Rs 35,00,000) has been approved by Competent Authority. Order No: F.No.AICTE/REG/FDR-REL/2026/0007.',
      messageHi: 'आपका FDR SBIN/FDR/2016/300911 (रु 35,00,000) रिलीज़ आवेदन सक्षम प्राधिकारी द्वारा स्वीकृत कर दिया गया है।',
      instrumentId: 'FDR-2026-0007',
      dueDate: '2026-10-26',
      triggerRule: 'STAGE_AUTHORITY_APPROVED',
      severity: 'Info',
      status: 'Sent',
      escalationLevel: 'L1',
      createdAt: '2026-10-21T16:50:00Z',
    }
  );

  // Seed Tamper-Evident Audit Chain
  const rawAuditSeeds: Omit<AuditEvent, 'previousHash' | 'eventHash'>[] = [
    {
      id: 'AUD-2026-0001',
      timestamp: '2026-10-16T10:12:00Z',
      actorId: 'USR-INST-01',
      actorName: 'Prof. Rajeshwari Deshmukh',
      actorRole: 'INSTITUTION_USER',
      action: 'SUBMIT_NEW_INSTRUMENT',
      entityType: 'Instrument',
      entityId: 'FDR-2026-0001',
      beforeValue: 'Draft',
      afterValue: 'Submitted (Rs 35,00,000 · SBIN/FDR/2026/901122)',
      ipAddress: '117.239.44.18',
    },
    {
      id: 'AUD-2026-0002',
      timestamp: '2026-10-16T10:12:15Z',
      actorId: 'USR-INST-01',
      actorName: 'Prof. Rajeshwari Deshmukh',
      actorRole: 'INSTITUTION_USER',
      action: 'AI_DOCUMENT_EXTRACTION_CONFIRMED',
      entityType: 'AI-Assist',
      entityId: 'FDR-2026-0001',
      beforeValue: 'Prompt: DOCUMENT_OCR_EXTRACT',
      afterValue: 'AI-assisted - Officer/User confirmed 10/10 extracted fields (97.4% avg confidence)',
      ipAddress: '117.239.44.18',
    },
    {
      id: 'AUD-2026-0003',
      timestamp: '2026-10-20T11:30:00Z',
      actorId: 'USR-SCR-01',
      actorName: 'Shri Arvind Kumar Sinha',
      actorRole: 'SCRUTINY_OFFICER',
      action: 'RUN_BANK_CBS_VERIFICATION',
      entityType: 'Verification',
      entityId: 'FDR-2026-0001',
      beforeValue: 'Institution-Submitted',
      afterValue: 'Bank-Confirmed (Ref: CBS-REF-20260001-2026 · Match)',
      ipAddress: '10.24.112.9',
    },
    {
      id: 'AUD-2026-0004',
      timestamp: '2026-10-21T16:45:00Z',
      actorId: 'USR-AUTH-01',
      actorName: 'Dr. Meenakshi Sundaram, IAS',
      actorRole: 'APPROVING_AUTHORITY',
      action: 'APPROVE_RELEASE_ORDER',
      entityType: 'Release',
      entityId: 'REL-2026-01',
      beforeValue: 'Release Under Review',
      afterValue: 'Approved for Release (Order: F.No.AICTE/REG/FDR-REL/2026/0007)',
      ipAddress: '10.24.110.2',
    },
    {
      id: 'AUD-2026-0005',
      timestamp: '2026-10-22T11:20:00Z',
      actorId: 'USR-SCR-01',
      actorName: 'Shri Arvind Kumar Sinha',
      actorRole: 'SCRUTINY_OFFICER',
      action: 'FLAG_INVESTIGATION_DISCREPANCY',
      entityType: 'Observation',
      entityId: 'FDR-2026-0006A',
      beforeValue: 'Submitted',
      afterValue: 'Discrepancy-Flagged (Duplicate FDR & Shortfall)',
      ipAddress: '10.24.112.9',
    },
    {
      id: 'AUD-2026-0006',
      timestamp: '2026-10-23T14:05:00Z',
      actorId: 'USR-INST-01',
      actorName: 'Prof. Rajeshwari Deshmukh',
      actorRole: 'INSTITUTION_USER',
      action: 'RBAC_UNAUTHORIZED_ACTION_DENIED',
      entityType: 'Security',
      entityId: 'FDR-2026-0001',
      beforeValue: 'Attempted: MARK_VERIFIED by INSTITUTION_USER',
      afterValue: 'DENIED (403 Forbidden — Privileged Scrutiny Action Blocked)',
      ipAddress: '117.239.44.18',
    },
  ];

  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  for (const seed of rawAuditSeeds) {
    const eventHash = computeAuditEventHash(prevHash, seed);
    auditEvents.push({
      ...seed,
      previousHash: prevHash,
      eventHash,
    });
    prevHash = eventHash;
  }

  return {
    systemDate: BASE_SYSTEM_DATE,
    institutions,
    instruments,
    verifications,
    documents,
    observations,
    releaseRequests,
    notifications,
    auditEvents,
    users: SEED_USERS,
    reminderRules: DEFAULT_REMINDER_RULES,
    escalationMatrix: DEFAULT_ESCALATION_MATRIX,
    depositNorms: DEFAULT_DEPOSIT_NORMS,
  };
}
