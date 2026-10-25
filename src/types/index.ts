export type UserRole =
  | 'INSTITUTION_USER'
  | 'SCRUTINY_OFFICER'
  | 'APPROVING_AUTHORITY'
  | 'ACCOUNTS_OFFICER'
  | 'SYSTEM_ADMIN';

export type InstitutionType =
  | 'Engineering'
  | 'Management'
  | 'Pharmacy'
  | 'Architecture'
  | 'Others';

export interface Institution {
  id: string;
  aicteId: string; // e.g. 1-12345678901
  name: string;
  state: string;
  district: string;
  type: InstitutionType;
  nodalOfficerName: string;
  email: string;
  mobile: string;
  approvalYear: string;
  trustName?: string;
}

export type InstrumentType =
  | 'FDR'
  | 'Bank Guarantee'
  | 'Security Deposit'
  | 'Other';

export type InstrumentStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Scrutiny'
  | 'Query Raised'
  | 'Resubmitted'
  | 'Verified (Bank-Confirmed)'
  | 'Verified (Manual Only)'
  | 'Rejected'
  | 'Active'
  | 'Expiring Soon'
  | 'Matured/Expired'
  | 'Renewal Pending'
  | 'Renewed'
  | 'Release Requested'
  | 'Release Under Review'
  | 'Approved for Release'
  | 'Released/Refunded'
  | 'Closed'
  | 'Forfeited'
  | 'Replaced';

export type VerificationLevel =
  | 'Institution-Submitted'
  | 'AI-Extracted Only'
  | 'Manual-Verified'
  | 'Bank-Confirmed'
  | 'Discrepancy-Flagged';

export interface RiskFactor {
  factor: string;
  weight: number; // contribution to 0-100 score
  description: string;
}

export interface DiscrepancyFlag {
  id: string;
  ruleCode: string;
  field: string;
  severity: 'Info' | 'Minor' | 'Major' | 'Critical';
  title: string;
  explanation: string;
  declaredValue?: string;
  comparedValue?: string;
}

export interface Instrument {
  id: string;
  institutionId: string;
  instrumentType: InstrumentType;
  fdrNumber: string;
  issuingBank: string;
  branch: string;
  ifsc: string;
  accountHolderName: string;
  depositAmount: number;
  issueDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  validityEndDate: string; // YYYY-MM-DD
  interestRate: number;
  autoRenewalFlag: boolean;
  lienMarkedInFavourOfAICTE: boolean;
  requiredAmount: number;
  purpose: string; // e.g. "New Institution Approval 2024-25"
  status: InstrumentStatus;
  verificationLevel: VerificationLevel;
  riskScore: number;
  riskFactors: RiskFactor[];
  discrepancies: DiscrepancyFlag[];
  previousInstrumentId?: string; // links old -> new in renewal/replacement
  replacedByInstrumentId?: string;
  coverageGapDays?: number;
  investigationFlag?: boolean;
  pendingComplianceFlag?: boolean;
  demoScenarioId?: number; // 1..10 for Demo Tour
  demoScenarioLabel?: string;
  assignedOfficerId?: string;
  acknowledgementRef?: string;
  createdAt: string;
  updatedAt: string;
}

export type VerificationSource =
  | 'Institution-Declared'
  | 'Document-AI-Extracted'
  | 'Bank-API-Confirmed'
  | 'Officer-Manual';

export type VerificationResultStatus =
  | 'Match'
  | 'Mismatch'
  | 'Unable to verify'
  | 'Not-supported';

export interface FieldComparison {
  field: string;
  label: string;
  declared: string;
  aiExtracted?: string;
  aiConfidence?: number;
  bankConfirmed?: string;
  matchStatus: 'MATCH' | 'MISMATCH' | 'UNVERIFIED';
}

export interface VerificationRecord {
  id: string;
  instrumentId: string;
  source: VerificationSource;
  result: VerificationResultStatus;
  fieldsCompared: FieldComparison[];
  confirmedBy: string;
  timestamp: string;
  referenceId: string;
  remarks?: string;
}

export type DocumentType =
  | 'FDR Copy'
  | 'Lien Letter'
  | 'Bank Confirmation'
  | 'Board Resolution'
  | 'Release Request Letter'
  | 'Renewal Receipt'
  | 'Discharge Letter';

export interface ExtractedDocumentData {
  issuingBank?: string;
  branch?: string;
  ifsc?: string;
  fdrNumber?: string;
  accountHolderName?: string;
  depositAmount?: number;
  issueDate?: string;
  maturityDate?: string;
  interestRate?: number;
  lienText?: string;
  lienMarkedInFavourOfAICTE?: boolean;
  signaturesPresent?: boolean;
  stampPresent?: boolean;
  confidences?: Record<string, number>;
}

export interface PortalDocument {
  id: string;
  instrumentId: string;
  type: DocumentType;
  fileName: string;
  fileSizeKb: number;
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  hash: string; // SHA-256
  extractedData?: ExtractedDocumentData;
  aiFlags: string[];
}

export interface ScrutinyObservation {
  id: string;
  instrumentId: string;
  officerId: string;
  officerName: string;
  text: string;
  severity: 'Info' | 'Minor' | 'Major' | 'Critical';
  status: 'Open' | 'Responded' | 'Closed';
  createdAt: string;
  responseText?: string;
  respondedAt?: string;
}

export type ReleaseReason =
  | 'Course closure'
  | 'Approval period complete'
  | 'Replacement'
  | 'Institution closure'
  | 'Other';

export interface ReleaseConditionItem {
  id: string;
  label: string;
  passed: boolean;
  details: string;
}

export interface ReleaseStage {
  stageName:
    | 'Eligibility Auto-Check'
    | 'Scrutiny Review'
    | 'Accounts Verification'
    | 'Competent Authority Approval'
    | 'Discharge & Closure';
  approverRole: UserRole;
  approverName?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Sent Back';
  remarks?: string;
  timestamp?: string;
  slaHoursRemaining?: number;
}

export interface ReleaseRequest {
  id: string;
  instrumentId: string;
  institutionId: string;
  reason: ReleaseReason;
  remarks: string;
  conditionsChecklist: ReleaseConditionItem[];
  documents: string[];
  stages: ReleaseStage[];
  finalDecision: 'Pending' | 'Approved' | 'Rejected' | 'Blocked' | 'Released';
  blockedReason?: string;
  releaseOrderNumber?: string;
  paymentDischargeRef?: string;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type EscalationLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface NotificationAlert {
  id: string;
  recipientRole: UserRole;
  institutionId?: string;
  channel: 'In-App' | 'Email' | 'SMS';
  type:
    | 'Maturity Reminder'
    | 'Validity Expiry'
    | 'Overdue Renewal'
    | 'Scrutiny Query'
    | 'Discrepancy Alert'
    | 'Release Update'
    | 'Escalation Breach';
  title: string;
  messageEn: string;
  messageHi: string;
  instrumentId: string;
  dueDate: string;
  triggerRule: string; // e.g. "T-30", "+7 Overdue"
  severity: 'Info' | 'Warning' | 'Critical';
  status: 'Pending' | 'Sent' | 'Acknowledged' | 'Escalated';
  escalationLevel: EscalationLevel;
  slaHoursOverdue?: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'Instrument' | 'Verification' | 'Observation' | 'Release' | 'Config' | 'Auth' | 'Security' | 'AI-Assist';
  entityId: string;
  beforeValue: string;
  afterValue: string;
  ipAddress: string;
  previousHash: string;
  eventHash: string;
  tampered?: boolean;
}

export interface ReminderRuleConfig {
  instrumentType: InstrumentType;
  preMaturityDays: number[]; // e.g. [90, 60, 30, 15, 7, 1]
  overdueDays: number[]; // e.g. [1, 7, 15]
  channels: ('In-App' | 'Email' | 'SMS')[];
}

export interface EscalationRuleConfig {
  level: EscalationLevel;
  targetTitle: string;
  role: UserRole;
  timeoutDays: number;
  autoAction: string;
}

export interface DepositNormConfig {
  institutionType: InstitutionType;
  minimumRequiredAmount: number;
  minimumLockInYears: number;
  mandatoryDocuments: DocumentType[];
}

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  institutionId?: string;
  department: string;
  active: boolean;
}

export interface BankAdapterConfig {
  bankName: string;
  ifscPrefix: string;
  adapterStatus: 'Live Simulated' | 'Manual Only' | 'Planned CBS API';
  supportedBehavior: 'Match' | 'Mismatch' | 'Unable to verify' | 'Not-supported';
  averageLatencyMs: number;
}
