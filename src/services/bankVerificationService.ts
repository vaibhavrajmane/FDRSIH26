import {
  Instrument,
  VerificationRecord,
  VerificationResultStatus,
  BankAdapterConfig,
} from '../types';
import { formatINR } from '../utils/rules';

export interface BankVerificationResponse {
  providerName: string;
  status: VerificationResultStatus;
  referenceId: string;
  timestamp: string;
  latencyMs: number;
  bankConfirmedData?: {
    fdrNumber: string;
    depositAmount: number;
    accountHolderName: string;
    issueDate: string;
    maturityDate: string;
    lienMarkedInFavourOfAICTE: boolean;
    branch: string;
  };
  certificateMessage: string;
}

export interface BankVerificationProvider {
  verifyInstrument(instrument: Instrument): Promise<BankVerificationResponse>;
  getAdapterRegistry(): BankAdapterConfig[];
}

export const BANK_ADAPTER_REGISTRY: BankAdapterConfig[] = [
  {
    bankName: 'State Bank of India',
    ifscPrefix: 'SBIN',
    adapterStatus: 'Live Simulated',
    supportedBehavior: 'Match',
    averageLatencyMs: 420,
  },
  {
    bankName: 'Punjab National Bank',
    ifscPrefix: 'PUNB',
    adapterStatus: 'Live Simulated',
    supportedBehavior: 'Match',
    averageLatencyMs: 480,
  },
  {
    bankName: 'Bank of Baroda',
    ifscPrefix: 'BARB',
    adapterStatus: 'Live Simulated',
    supportedBehavior: 'Match',
    averageLatencyMs: 450,
  },
  {
    bankName: 'Canara Bank',
    ifscPrefix: 'CNRB',
    adapterStatus: 'Live Simulated',
    supportedBehavior: 'Match',
    averageLatencyMs: 510,
  },
  {
    bankName: 'Union Bank of India',
    ifscPrefix: 'UBIN',
    adapterStatus: 'Live Simulated',
    supportedBehavior: 'Match',
    averageLatencyMs: 490,
  },
  {
    bankName: 'HDFC Bank',
    ifscPrefix: 'HDFC',
    adapterStatus: 'Live Simulated',
    supportedBehavior: 'Mismatch',
    averageLatencyMs: 390,
  },
  {
    bankName: 'ICICI Bank',
    ifscPrefix: 'ICIC',
    adapterStatus: 'Live Simulated',
    supportedBehavior: 'Match',
    averageLatencyMs: 410,
  },
  {
    bankName: 'Axis Bank',
    ifscPrefix: 'UTIB',
    adapterStatus: 'Live Simulated',
    supportedBehavior: 'Match',
    averageLatencyMs: 440,
  },
  {
    bankName: 'Kotak Mahindra Bank',
    ifscPrefix: 'KKBK',
    adapterStatus: 'Planned CBS API',
    supportedBehavior: 'Unable to verify',
    averageLatencyMs: 650,
  },
  {
    bankName: 'Saraswat Co-operative Bank',
    ifscPrefix: 'SRCB',
    adapterStatus: 'Manual Only',
    supportedBehavior: 'Not-supported',
    averageLatencyMs: 250,
  },
];

export interface PlannedIntegrationItem {
  id: string;
  name: string;
  category: 'Banking & Treasury' | 'Identity & e-Gov' | 'Regulatory Ecosystem' | 'Messaging';
  protocol: string;
  status: 'Simulated Adapter Active' | 'Sandbox Ready' | 'Planned Phase-II';
  description: string;
  endpointPattern: string;
}

export const INTEGRATION_READINESS_LIST: PlannedIntegrationItem[] = [
  {
    id: 'INT-CBS',
    name: 'Scheduled Commercial Bank CBS / API Setu Confirmation Gateway',
    category: 'Banking & Treasury',
    protocol: 'REST / ISO 20022 Mutual-TLS Signed JSON',
    status: 'Simulated Adapter Active',
    description: 'Real-time verification of FDR principal, maturity date, joint holder, and AICTE lien encumbrance flag directly from issuing bank Core Banking System.',
    endpointPattern: 'POST /v2/cbs/fdr-lien-verify',
  },
  {
    id: 'INT-AICTE',
    name: 'AICTE Approval Bureau Portal (EoA / New Institution Master)',
    category: 'Regulatory Ecosystem',
    protocol: 'Internal gRPC / OAuth2 Service Mesh',
    status: 'Simulated Adapter Active',
    description: 'Syncs institution AICTE Permanent ID, approved intake norms, course closure status, and auto-places EoA hold on lapsed security deposits.',
    endpointPattern: 'GET /api/v1/aicte-master/institutions/{aicteId}',
  },
  {
    id: 'INT-PFMS',
    name: 'PFMS & Bharatkosh (Non-Tax Receipt Portal)',
    category: 'Banking & Treasury',
    protocol: 'Signed XML / SFTP & REST Webhook',
    status: 'Sandbox Ready',
    description: 'Tracks electronic security deposit remittances, forfeiture credit realization, and direct refund discharge settlements.',
    endpointPattern: 'POST /pfms/bharatkosh/settlement-Advice',
  },
  {
    id: 'INT-DIGILOCKER',
    name: 'MeitY DigiLocker & Entity Locker',
    category: 'Identity & e-Gov',
    protocol: 'OpenAPI OAuth 2.0 Pull URI',
    status: 'Simulated Adapter Active',
    description: 'Pulls digitally signed Trust Registration Deeds, Board Resolutions, and AICTE Approval Letters directly from Entity Locker.',
    endpointPattern: 'POST /digilocker/v1/entity/pull-document',
  },
  {
    id: 'INT-ESIGN',
    name: 'CCA / Aadhaar e-Sign (CDAC / NSDL ESP)',
    category: 'Identity & e-Gov',
    protocol: 'PKCS#7 XML Digital Signature v2.1',
    status: 'Simulated Adapter Active',
    description: 'Cryptographic signing of Nodal Officer declarations during FDR submission and Competent Authority Release Orders.',
    endpointPattern: 'POST /esign/v2.1/sign-hash',
  },
  {
    id: 'INT-NIC-MSG',
    name: 'NIC Sandes / DLT SMS & Gov.in SMTP Relay',
    category: 'Messaging',
    protocol: 'HTTPS REST / SMPP v3.4',
    status: 'Simulated Adapter Active',
    description: 'Dispatches bilingual (English/Hindi) T-90 to T-1 maturity reminders and L1–L5 escalation alerts with delivery receipts.',
    endpointPattern: 'POST /nic-gateway/dlt-notify',
  },
  {
    id: 'INT-PARICHAY',
    name: 'NIC Parichay / JanParichay Single Sign-On (SSO)',
    category: 'Identity & e-Gov',
    protocol: 'SAML 2.0 / OIDC with 2FA',
    status: 'Simulated Adapter Active',
    description: 'Centralized multi-factor authentication and role claim assertion for AICTE Scrutiny Officers, Finance, and Competent Authority.',
    endpointPattern: 'GET /parichay/oidc/authorize',
  },
];

class MockBankVerificationProvider implements BankVerificationProvider {
  getAdapterRegistry(): BankAdapterConfig[] {
    return BANK_ADAPTER_REGISTRY;
  }

  async verifyInstrument(instrument: Instrument): Promise<BankVerificationResponse> {
    const adapter =
      BANK_ADAPTER_REGISTRY.find(
        (a) =>
          instrument.ifsc.startsWith(a.ifscPrefix) ||
          instrument.issuingBank.toLowerCase().includes(a.bankName.toLowerCase())
      ) || BANK_ADAPTER_REGISTRY[0];

    const latencyMs = Math.min(450, adapter.averageLatencyMs);
    await new Promise((r) => setTimeout(r, latencyMs));

    const refId = `CBS-${adapter.ifscPrefix}-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    // Co-operative bank or unsupported
    if (adapter.supportedBehavior === 'Not-supported' || instrument.id === 'FDR-2026-0009') {
      return {
        providerName: `${instrument.issuingBank} Adapter`,
        status: 'Not-supported',
        referenceId: `MANUAL-REQ-${Date.now().toString().slice(-5)}`,
        timestamp: nowIso,
        latencyMs,
        certificateMessage: `${instrument.issuingBank} is a Co-operative/Regional bank not onboarded to the automated CBS verification bridge. Officer must verify physical Bank Confirmation Letter (Status remains "Verified (Manual Only)").`,
      };
    }

    if (adapter.supportedBehavior === 'Unable to verify') {
      return {
        providerName: `${instrument.issuingBank} CBS Gateway`,
        status: 'Unable to verify',
        referenceId: refId,
        timestamp: nowIso,
        latencyMs,
        certificateMessage: `Gateway timeout / CBS maintenance window at ${instrument.issuingBank}. Retry scheduled or fallback to manual confirmation.`,
      };
    }

    // Discrepancy scenario (FDR-2026-0006A or 6B or Query Raised)
    if (
      instrument.id === 'FDR-2026-0006A' ||
      instrument.id === 'FDR-2026-0006B' ||
      instrument.verificationLevel === 'Discrepancy-Flagged'
    ) {
      const actualAmt = instrument.id.startsWith('FDR-2026-0006')
        ? 1200000
        : instrument.depositAmount;
      const actualHolder = instrument.id.startsWith('FDR-2026-0006')
        ? 'Zenith Private Commercial Ventures LLP'
        : instrument.accountHolderName;

      return {
        providerName: `${instrument.issuingBank} CBS API v2.4`,
        status: 'Mismatch',
        referenceId: refId,
        timestamp: nowIso,
        latencyMs,
        bankConfirmedData: {
          fdrNumber: instrument.fdrNumber,
          depositAmount: actualAmt,
          accountHolderName: actualHolder,
          issueDate: instrument.issueDate,
          maturityDate: instrument.maturityDate,
          lienMarkedInFavourOfAICTE: false,
          branch: instrument.branch,
        },
        certificateMessage: `CRITICAL MISMATCH: Bank CBS reports Principal ${formatINR(
          actualAmt
        )} (Declared: ${formatINR(
          instrument.depositAmount
        )}), Holder "${actualHolder}", and NO AICTE Lien marked.`,
      };
    }

    // Standard Match
    return {
      providerName: `${instrument.issuingBank} CBS API v2.4`,
      status: 'Match',
      referenceId: refId,
      timestamp: nowIso,
      latencyMs,
      bankConfirmedData: {
        fdrNumber: instrument.fdrNumber,
        depositAmount: instrument.depositAmount,
        accountHolderName: instrument.accountHolderName,
        issueDate: instrument.issueDate,
        maturityDate: instrument.maturityDate,
        lienMarkedInFavourOfAICTE: instrument.lienMarkedInFavourOfAICTE,
        branch: instrument.branch,
      },
      certificateMessage: `100% CBS Match Confirmed. Principal ${formatINR(
        instrument.depositAmount
      )} active with Joint Lien Marked in favour of Member Secretary, AICTE.`,
    };
  }
}

export const bankVerificationService = new MockBankVerificationProvider();

export function buildVerificationRecordFromResponse(
  instrument: Instrument,
  resp: BankVerificationResponse,
  officerName: string
): VerificationRecord {
  const b = resp.bankConfirmedData;
  return {
    id: `VER-${instrument.id}-${Date.now().toString().slice(-4)}`,
    instrumentId: instrument.id,
    source: resp.status === 'Not-supported' ? 'Officer-Manual' : 'Bank-API-Confirmed',
    result: resp.status,
    confirmedBy: `${resp.providerName} (Triggered by ${officerName})`,
    timestamp: resp.timestamp,
    referenceId: resp.referenceId,
    remarks: resp.certificateMessage,
    fieldsCompared: [
      {
        field: 'fdrNumber',
        label: 'FDR / BG Number',
        declared: instrument.fdrNumber,
        aiExtracted: instrument.fdrNumber,
        aiConfidence: 98,
        bankConfirmed: b ? b.fdrNumber : 'N/A (Manual)',
        matchStatus: 'MATCH',
      },
      {
        field: 'depositAmount',
        label: 'Principal Deposit Amount',
        declared: formatINR(instrument.depositAmount),
        aiExtracted: formatINR(instrument.depositAmount),
        aiConfidence: 98,
        bankConfirmed: b ? formatINR(b.depositAmount) : 'N/A (Manual)',
        matchStatus: !b
          ? 'UNVERIFIED'
          : b.depositAmount === instrument.depositAmount
          ? 'MATCH'
          : 'MISMATCH',
      },
      {
        field: 'accountHolderName',
        label: 'Joint Account Holder Name',
        declared: instrument.accountHolderName,
        aiExtracted: instrument.accountHolderName,
        aiConfidence: 95,
        bankConfirmed: b ? b.accountHolderName : 'N/A (Manual)',
        matchStatus: !b
          ? 'UNVERIFIED'
          : b.accountHolderName === instrument.accountHolderName
          ? 'MATCH'
          : 'MISMATCH',
      },
      {
        field: 'maturityDate',
        label: 'Maturity Date',
        declared: instrument.maturityDate,
        aiExtracted: instrument.maturityDate,
        aiConfidence: 97,
        bankConfirmed: b ? b.maturityDate : 'N/A (Manual)',
        matchStatus: 'MATCH',
      },
      {
        field: 'lienMarkedInFavourOfAICTE',
        label: 'AICTE Lien Endorsement',
        declared: instrument.lienMarkedInFavourOfAICTE ? 'Yes (Marked to AICTE)' : 'No',
        aiExtracted: instrument.lienMarkedInFavourOfAICTE ? 'Yes (Marked to AICTE)' : 'No',
        aiConfidence: 96,
        bankConfirmed: !b
          ? 'Verified via Physical Bank Letter'
          : b.lienMarkedInFavourOfAICTE
          ? 'Active Lien: Member Secretary AICTE'
          : 'No Lien Found',
        matchStatus: !b
          ? 'MATCH'
          : b.lienMarkedInFavourOfAICTE === instrument.lienMarkedInFavourOfAICTE &&
            b.lienMarkedInFavourOfAICTE
          ? 'MATCH'
          : 'MISMATCH',
      },
    ],
  };
}
