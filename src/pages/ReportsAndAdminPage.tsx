import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Download,
  Printer,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CalendarClock,
  Lock,
  CheckCircle2,
  XCircle,
  Users,
  Sliders,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import {
  formatINR,
  formatDateDDMMMYYYY,
  daysBetween,
  verifyAuditChain,
} from '../utils/rules';
import { exportRowsToCSV } from '../utils/i18n';
import {
  VerificationProvenanceBadge,
  StatusLabel,
} from '../components/CommonBadges';

const REPORT_TYPES = [
  { id: 'pending_verifications', label: '1. Pending Verifications' },
  { id: 'upcoming_maturities', label: '2. Upcoming Maturities (30/60/90d)' },
  { id: 'missing_documents', label: '3. Missing / Flagged Documents' },
  { id: 'discrepancy_register', label: '4. Discrepancy & Fraud Register' },
  { id: 'overdue_actions', label: '5. Overdue Actions & Lapsed FDRs' },
  { id: 'institution_statement', label: '6. Institution-Wise Custody Statement' },
  { id: 'bank_exposure', label: '7. Bank-Wise Exposure Register' },
  { id: 'release_register', label: '8. Release & Refund Register' },
  { id: 'renewal_compliance', label: '9. Renewal & Continuity Compliance' },
  { id: 'officer_workload', label: '10. Officer Workload & SLA Performance' },
  { id: 'audit_extract', label: '11. Immutable Audit Trail Extract' },
] as const;

type ReportTypeId = (typeof REPORT_TYPES)[number]['id'];

/**
 * Module I: Reports Centre (11 Statutory Reports with Chart, Table, CSV/Print Export & Scheduled Report Config)
 */
export const ReportsCentrePage: React.FC = () => {
  const {
    instruments,
    institutions,
    documents,
    releaseRequests,
    auditEvents,
    systemDate,
    addToast,
  } = usePortal();

  const [activeReport, setActiveReport] = useState<ReportTypeId>('pending_verifications');
  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [schedFrequency, setSchedFrequency] = useState<string>('Weekly (Every Monday 08:00 IST)');
  const [schedRecipients, setSchedRecipients] = useState<string>(
    'advisor.reg@aicte-india.org, cao.finance@aicte-india.org'
  );

  const uniqueStates = useMemo(
    () => Array.from(new Set(institutions.map((i) => i.state))).sort(),
    [institutions]
  );

  // Build rows & chart data for active report
  const { rows, chartData } = useMemo(() => {
    const filterByState = (instId: string) => {
      if (stateFilter === 'ALL') return true;
      const inst = institutions.find((x) => x.id === instId);
      return inst?.state === stateFilter;
    };

    if (activeReport === 'pending_verifications') {
      const list = instruments.filter(
        (i) =>
          filterByState(i.institutionId) &&
          (i.verificationLevel === 'Institution-Submitted' ||
            ['Submitted', 'Under Scrutiny', 'Resubmitted'].includes(i.status))
      );
      return {
        rows: list.map((i) => {
          const inst = institutions.find((x) => x.id === i.institutionId);
          return {
            InstrumentID: i.id,
            Institution: inst?.name || '',
            State: inst?.state || '',
            Bank: i.issuingBank,
            FDR_Number: i.fdrNumber,
            Principal_INR: formatINR(i.depositAmount),
            Provenance: i.verificationLevel,
            Status: i.status,
          };
        }),
        chartData: [
          { label: 'Submitted', count: list.filter((x) => x.status === 'Submitted').length },
          { label: 'Under Scrutiny', count: list.filter((x) => x.status === 'Under Scrutiny').length },
          { label: 'Resubmitted', count: list.filter((x) => x.status === 'Resubmitted').length },
        ],
      };
    }

    if (activeReport === 'upcoming_maturities') {
      const list = instruments.filter((i) => {
        if (!filterByState(i.institutionId)) return false;
        const d = daysBetween(systemDate, i.maturityDate);
        return d >= 0 && d <= 90;
      });
      return {
        rows: list.map((i) => {
          const inst = institutions.find((x) => x.id === i.institutionId);
          const d = daysBetween(systemDate, i.maturityDate);
          return {
            InstrumentID: i.id,
            Institution: inst?.name || '',
            State: inst?.state || '',
            MaturityDate: formatDateDDMMMYYYY(i.maturityDate),
            DaysRemaining: `${d} days`,
            Bucket: d <= 30 ? '0–30 Days' : d <= 60 ? '31–60 Days' : '61–90 Days',
            Amount: formatINR(i.depositAmount),
            Provenance: i.verificationLevel,
          };
        }),
        chartData: [
          { label: '0–30 Days', count: list.filter((i) => daysBetween(systemDate, i.maturityDate) <= 30).length },
          { label: '31–60 Days', count: list.filter((i) => { const d = daysBetween(systemDate, i.maturityDate); return d > 30 && d <= 60; }).length },
          { label: '61–90 Days', count: list.filter((i) => daysBetween(systemDate, i.maturityDate) > 60).length },
        ],
      };
    }

    if (activeReport === 'missing_documents') {
      const list = instruments.filter(
        (i) => filterByState(i.institutionId) && (!i.lienMarkedInFavourOfAICTE || i.discrepancies.length > 0)
      );
      return {
        rows: list.map((i) => {
          const inst = institutions.find((x) => x.id === i.institutionId);
          return {
            InstrumentID: i.id,
            Institution: inst?.name || '',
            State: inst?.state || '',
            LienMarked: i.lienMarkedInFavourOfAICTE ? 'Yes' : 'MISSING LIEN',
            DocsUploaded: documents.filter((d) => d.instrumentId === i.id).length,
            Status: i.status,
          };
        }),
        chartData: [
          { label: 'Missing Lien Clause', count: list.filter((x) => !x.lienMarkedInFavourOfAICTE).length },
          { label: 'AI Flagged Scan', count: list.filter((x) => x.discrepancies.length > 0).length },
        ],
      };
    }

    if (activeReport === 'discrepancy_register') {
      const list = instruments.filter(
        (i) =>
          filterByState(i.institutionId) &&
          (i.discrepancies.length > 0 || i.verificationLevel === 'Discrepancy-Flagged')
      );
      return {
        rows: list.map((i) => {
          const inst = institutions.find((x) => x.id === i.institutionId);
          return {
            InstrumentID: i.id,
            Institution: inst?.name || '',
            FDR_Number: i.fdrNumber,
            Bank: i.issuingBank,
            Declared_Amount: formatINR(i.depositAmount),
            Required_Norm: formatINR(i.requiredAmount),
            Flags: i.discrepancies.map((d) => d.ruleCode).join(', ') || 'CBS Mismatch',
            RiskScore: i.riskScore,
          };
        }),
        chartData: list.slice(0, 6).map((i) => ({ label: i.id, count: i.riskScore })),
      };
    }

    if (activeReport === 'overdue_actions') {
      const list = instruments.filter(
        (i) =>
          filterByState(i.institutionId) &&
          (i.status === 'Matured/Expired' || i.status === 'Query Raised' || (i.coverageGapDays || 0) > 0)
      );
      return {
        rows: list.map((i) => {
          const inst = institutions.find((x) => x.id === i.institutionId);
          return {
            InstrumentID: i.id,
            Institution: inst?.name || '',
            State: inst?.state || '',
            Status: i.status,
            CoverageGapDays: i.coverageGapDays || 0,
            MaturityDate: formatDateDDMMMYYYY(i.maturityDate),
            RiskScore: i.riskScore,
          };
        }),
        chartData: list.slice(0, 6).map((i) => ({ label: i.id, count: i.coverageGapDays || 10 })),
      };
    }

    if (activeReport === 'institution_statement') {
      const list = institutions.filter((inst) => stateFilter === 'ALL' || inst.state === stateFilter);
      return {
        rows: list.map((inst) => {
          const instFdrs = instruments.filter((i) => i.institutionId === inst.id);
          const totalAmt = instFdrs.reduce((acc, x) => acc + x.depositAmount, 0);
          return {
            AICTE_ID: inst.aicteId,
            Institution: inst.name,
            State: inst.state,
            Type: inst.type,
            Total_Instruments: instFdrs.length,
            Total_Custody_INR: formatINR(totalAmt),
            Bank_Confirmed_Count: instFdrs.filter((x) => x.verificationLevel === 'Bank-Confirmed').length,
          };
        }),
        chartData: list.slice(0, 8).map((inst) => ({
          label: inst.name.split(' ')[0],
          count: instruments.filter((i) => i.institutionId === inst.id).length,
        })),
      };
    }

    if (activeReport === 'bank_exposure') {
      const banks = Array.from(new Set(instruments.map((i) => i.issuingBank)));
      return {
        rows: banks.map((bk) => {
          const bList = instruments.filter((i) => i.issuingBank === bk && filterByState(i.institutionId));
          const sum = bList.reduce((a, b) => a + b.depositAmount, 0);
          return {
            Issuing_Bank: bk,
            Instruments_Count: bList.length,
            Total_Principal_INR: formatINR(sum),
            CBS_Confirmed: bList.filter((x) => x.verificationLevel === 'Bank-Confirmed').length,
            Manual_Only: bList.filter((x) => x.verificationLevel === 'Manual-Verified').length,
          };
        }),
        chartData: banks.map((bk) => ({
          label: bk.split(' ')[0],
          count: instruments.filter((i) => i.issuingBank === bk).length,
        })),
      };
    }

    if (activeReport === 'release_register') {
      return {
        rows: releaseRequests.map((r) => {
          const inst = institutions.find((x) => x.id === r.institutionId);
          return {
            Release_ID: r.id,
            Instrument_ID: r.instrumentId,
            Institution: inst?.name || '',
            Reason: r.reason,
            Decision: r.finalDecision,
            Order_Number: r.releaseOrderNumber || 'Pending',
            Discharge_Ref: r.paymentDischargeRef || 'Pending',
          };
        }),
        chartData: [
          { label: 'Approved', count: releaseRequests.filter((r) => r.finalDecision === 'Approved').length },
          { label: 'Blocked', count: releaseRequests.filter((r) => r.finalDecision === 'Blocked').length },
          { label: 'Released', count: releaseRequests.filter((r) => r.finalDecision === 'Released').length },
        ],
      };
    }

    if (activeReport === 'renewal_compliance') {
      const list = instruments.filter(
        (i) => i.previousInstrumentId || i.status === 'Renewed' || i.status === 'Matured/Expired'
      );
      return {
        rows: list.map((i) => {
          const inst = institutions.find((x) => x.id === i.institutionId);
          return {
            Instrument_ID: i.id,
            Prior_Instrument: i.previousInstrumentId || 'None',
            Institution: inst?.name || '',
            Status: i.status,
            Coverage_Gap_Days: i.coverageGapDays || 0,
            Compliance: (i.coverageGapDays || 0) === 0 ? 'Continuous (Compliant)' : 'Gap Breach',
          };
        }),
        chartData: [
          { label: 'Zero-Gap Renewals', count: list.filter((x) => (x.coverageGapDays || 0) === 0).length },
          { label: 'Coverage Gap Breach', count: list.filter((x) => (x.coverageGapDays || 0) > 0).length },
        ],
      };
    }

    if (activeReport === 'officer_workload') {
      return {
        rows: [
          {
            Officer: 'Shri Arvind Kumar Sinha (Scrutiny Cell II)',
            Assigned_Instruments: instruments.length,
            CBS_Verified: instruments.filter((i) => i.verificationLevel === 'Bank-Confirmed').length,
            Avg_Turnaround_Days: '1.4 Days',
            SLA_Compliance_Rate: '98.2%',
          },
          {
            Officer: 'Smt. Kavita Nair, ICAS (Finance & Custody)',
            Assigned_Instruments: releaseRequests.length,
            CBS_Verified: releaseRequests.filter((r) => r.finalDecision === 'Approved').length,
            Avg_Turnaround_Days: '1.1 Days',
            SLA_Compliance_Rate: '100%',
          },
        ],
        chartData: [
          { label: 'Scrutiny Cell II', count: 98 },
          { label: 'Finance Cell', count: 100 },
          { label: 'Regional Vigilance', count: 95 },
        ],
      };
    }

    // 11. Audit Extract
    return {
      rows: auditEvents.map((a) => ({
        Audit_ID: a.id,
        Timestamp: a.timestamp,
        Actor: `${a.actorName} (${a.actorRole})`,
        Action: a.action,
        Entity: `${a.entityType}:${a.entityId}`,
        After_Value: a.afterValue,
        Event_SHA256: `${a.eventHash.slice(0, 16)}...`,
      })),
      chartData: [
        { label: 'Instrument', count: auditEvents.filter((a) => a.entityType === 'Instrument').length },
        { label: 'Verification', count: auditEvents.filter((a) => a.entityType === 'Verification').length },
        { label: 'AI-Assist', count: auditEvents.filter((a) => a.entityType === 'AI-Assist').length },
        { label: 'Security', count: auditEvents.filter((a) => a.entityType === 'Security').length },
      ],
    };
  }, [
    activeReport,
    stateFilter,
    instruments,
    institutions,
    documents,
    releaseRequests,
    auditEvents,
    systemDate,
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Statutory Reports Centre (11 Real-Time Regulatory Registers)
            </h2>
            <p className="text-xs text-slate-500">
              Every report distinguishes Institution-Submitted vs Bank-Confirmed data and supports CSV &amp; Print/PDF export
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Filter report by state"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <option value="ALL">All States</option>
              {uniqueStates.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => exportRowsToCSV(`AICTE_${activeReport}_${systemDate}.csv`, rows)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* 11 Report Type Buttons */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.id}
              type="button"
              onClick={() => setActiveReport(rt.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeReport === rt.id
                  ? 'bg-blue-900 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            Report Visual Summary
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scheduled Report Configuration UI */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-blue-700" />
              <span>Scheduled Automated Report Dispatch</span>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Cadence</label>
              <select
                value={schedFrequency}
                onChange={(e) => setSchedFrequency(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option>Daily (08:00 IST)</option>
                <option>Weekly (Every Monday 08:00 IST)</option>
                <option>Monthly (1st Working Day)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Gov.in Recipients</label>
              <input
                type="text"
                value={schedRecipients}
                onChange={(e) => setSchedRecipients(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-[11px]"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                addToast(
                  'success',
                  'Report Schedule Saved',
                  `Scheduled "${activeReport}" (${schedFrequency}) to ${schedRecipients}.`
                )
              }
              className="w-full py-1.5 rounded bg-emerald-700 text-white font-semibold cursor-pointer"
            >
              Save Automated Schedule
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 overflow-x-auto">
          <div className="text-xs font-bold mb-3">
            Report Records ({rows.length} rows)
          </div>
          {rows.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No records found.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                  {Object.keys(rows[0]).map((col) => (
                    <th key={col} className="py-2 px-2.5">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.slice(0, 25).map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {Object.values(r).map((val, cIdx) => (
                      <td key={cIdx} className="py-2 px-2.5 font-mono text-[11px]">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Module J: Admin, Configuration, Tamper-Evident Audit Hash Chain & Data-Protection Panel
 */
export const AdminAuditPage: React.FC = () => {
  const {
    auditEvents,
    users,
    depositNorms,
    reminderRules,
    escalationMatrix,
    simulateUnauthorizedAction,
    tamperSingleAuditRecord,
    resetDemoData,
    createPortalUser,
    updateDepositNorm,
    updateReminderRule,
    updateEscalationRule,
    addToast,
  } = usePortal();

  const [verificationState, setVerificationState] = useState<{
    checked: boolean;
    valid: boolean;
    brokenAtIndex?: number;
    brokenEventId?: string;
    expectedHash?: string;
    actualHash?: string;
  } | null>(null);

  const [entityFilter, setEntityFilter] = useState<string>('ALL');

  // Admin Create User Form State (Page 7 Role 5 Step 1)
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserDesignation, setNewUserDesignation] = useState<string>('Assistant Director (Regulation)');
  const [newUserRole, setNewUserRole] = useState<
    'SCRUTINY_OFFICER' | 'APPROVING_AUTHORITY' | 'ACCOUNTS_OFFICER' | 'INSTITUTION_USER' | 'SYSTEM_ADMIN'
  >('SCRUTINY_OFFICER');

  // Admin Configurable Document Checklist State (Page 2 #14 & Page 7 Role 5 Step 2)
  const [docChecklistItems, setDocChecklistItems] = useState<string[]>([
    'Signed FDR Copy (Mandatory)',
    'Issuing Bank Lien Confirmation Letter in favour of AICTE (Mandatory)',
    'Governing Body / Trust Board Resolution (Mandatory for New/Release)',
    'Affidavit & University NOC (Mandatory for Course/Institution Closure Release)',
  ]);
  const [newChecklistItem, setNewChecklistItem] = useState<string>('');

  const handleVerifyHashChain = () => {
    const res = verifyAuditChain(auditEvents);
    setVerificationState({
      checked: true,
      ...res,
    });
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const res = createPortalUser({
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      designation: newUserDesignation.trim(),
      department: 'AICTE Regulation Bureau',
      role: newUserRole,
    });
    if (res.ok) {
      setNewUserName('');
      setNewUserEmail('');
    }
  };

  const filteredAudits = useMemo(() => {
    return auditEvents.filter((a) => entityFilter === 'ALL' || a.entityType === entityFilter);
  }, [auditEvents, entityFilter]);

  return (
    <div className="space-y-6">
      {/* Cryptographic SHA-256 Audit Chain Verifier Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-800 dark:text-blue-400" />
              <span>Tamper-Evident Cryptographic Audit Hash Chain (SHA-256 Linked Ledger)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Every event stores the deterministic hash of <code className="font-mono">(previousHash + eventPayload)</code>. Any unauthorized database mutation breaks the chain.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleVerifyHashChain}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-md cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Audit Chain Integrity</span>
            </button>
            <button
              type="button"
              onClick={() => {
                tamperSingleAuditRecord();
                setVerificationState(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Tamper Demo Record (#3)</span>
            </button>
            <button
              type="button"
              onClick={simulateUnauthorizedAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Simulate RBAC Denial (Scenario 10)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetDemoData();
                setVerificationState(null);
              }}
              className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-md cursor-pointer"
            >
              Restore Clean Chain
            </button>
          </div>
        </div>

        {/* Verification Result Banner */}
        {verificationState?.checked && (
          <div
            className={`p-4 rounded-lg border text-xs ${
              verificationState.valid
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-950 dark:text-red-200'
            }`}
          >
            {verificationState.valid ? (
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  AUDIT CHAIN INTEGRITY VERIFIED OK: All {auditEvents.length} cryptographic hash links recomputed and matched 100%. Zero tampering detected.
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-300">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    CRITICAL SECURITY ALERT — TAMPERING DETECTED AT RECORD #{Number(verificationState.brokenAtIndex) + 1} ({verificationState.brokenEventId})!
                  </span>
                </div>
                <div className="font-mono text-[11px]">
                  Stored Hash: {verificationState.actualHash} · Recomputed Payload Hash: {verificationState.expectedHash}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Events Table */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="font-semibold">Filter Entity Type:</span>
            {['ALL', 'Instrument', 'Verification', 'Observation', 'Release', 'Security', 'Config', 'AI-Assist'].map(
              (t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEntityFilter(t)}
                  className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                    entityFilter === t
                      ? 'bg-blue-900 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            onClick={() => exportRowsToCSV('FDR_Setu_Audit_Chain.csv', auditEvents)}
            className="text-xs font-semibold text-blue-800 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Export Full Hash Ledger (CSV)
          </button>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                <th className="py-2 pr-3">Event ID</th>
                <th className="py-2 px-3">Actor &amp; Role</th>
                <th className="py-2 px-3">Action &amp; Entity</th>
                <th className="py-2 px-3">Before → After State</th>
                <th className="py-2 pl-3">Prev Hash / Event Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              {filteredAudits.map((ev) => (
                <tr
                  key={ev.id}
                  className={ev.tampered ? 'bg-red-100/80 dark:bg-red-950/60 text-red-900 dark:text-red-200' : ''}
                >
                  <td className="py-2.5 pr-3 font-bold">{ev.id}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <div className="font-semibold">{ev.actorName}</div>
                    <div className="text-[10px] text-slate-500">{ev.actorRole} · IP: {ev.ipAddress}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold">{ev.action}</div>
                    <div className="text-[10px] text-slate-500">{ev.entityType} · {ev.entityId}</div>
                  </td>
                  <td className="py-2.5 px-3 font-sans max-w-xs">
                    <span className="text-slate-500">{ev.beforeValue}</span> →{' '}
                    <strong className="font-semibold">{ev.afterValue}</strong>
                  </td>
                  <td className="py-2.5 pl-3 text-[10px] text-slate-500">
                    <div>Prev: {ev.previousHash.slice(0, 14)}...</div>
                    <div className="text-blue-800 dark:text-blue-400 font-semibold">
                      Curr: {ev.eventHash.slice(0, 14)}...
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Users, Create User Form & Configurable Statutory Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: RBAC Directory + Create User & Assign Role */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-700" />
            <span>1. RBAC User Directory &amp; Role Provisioning (System Admin)</span>
          </h3>

          {/* Create User Form */}
          <form
            onSubmit={handleCreateUserSubmit}
            className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5"
          >
            <div className="font-bold text-slate-900 dark:text-white">
              Create User &amp; Assign Role (Requires SYSTEM_ADMIN)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Officer Full Name"
                className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="official@aicte-india.org"
                className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                required
              />
              <input
                type="text"
                value={newUserDesignation}
                onChange={(e) => setNewUserDesignation(e.target.value)}
                placeholder="Designation"
                className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <select
                aria-label="Assign User Role"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as any)}
                className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
              >
                <option value="SCRUTINY_OFFICER">SCRUTINY_OFFICER</option>
                <option value="APPROVING_AUTHORITY">APPROVING_AUTHORITY</option>
                <option value="ACCOUNTS_OFFICER">ACCOUNTS_OFFICER</option>
                <option value="INSTITUTION_USER">INSTITUTION_USER</option>
                <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-semibold cursor-pointer"
            >
              + Create User &amp; Assign Role
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-2.5 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                  <div className="text-slate-500">{u.designation} · {u.email}</div>
                </div>
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Configurable Reminder Days, Escalation Timings, Minimum Deposit Rules & Document Checklists */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-700" />
            <span>2. Configurable Statutory Rules, Reminder Cadence &amp; Checklists</span>
          </h3>

          {/* Minimum Deposit Norms Config */}
          <div className="space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              Minimum Statutory Security Deposit Norms (Editable by Admin)
            </div>
            {depositNorms.map((n) => (
              <div
                key={n.institutionType}
                className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-b border-slate-100 dark:border-slate-800"
              >
                <span className="font-medium">
                  {n.institutionType} ({n.minimumLockInYears}-Yr Lock-in)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{formatINR(n.minimumRequiredAmount)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateDepositNorm({
                        ...n,
                        minimumRequiredAmount: n.minimumRequiredAmount + 500000,
                      })
                    }
                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 text-[11px] font-semibold cursor-pointer"
                  >
                    +Rs 5L Norm
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Reminder Cadence & Escalation Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                Pre-Maturity Reminder Days
              </div>
              <div className="font-mono text-[11px] text-blue-800 dark:text-blue-300">
                Active Schedule: {reminderRules[0]?.preMaturityDays.join(', ')} days before expiry
              </div>
              <button
                type="button"
                onClick={() =>
                  reminderRules[0] &&
                  updateReminderRule({
                    ...reminderRules[0],
                    preMaturityDays: [90, 60, 30, 15, 7, 1],
                  })
                }
                className="px-2.5 py-1 rounded bg-blue-900 text-white text-[11px] font-semibold cursor-pointer"
              >
                Verify / Save T-90..T-1 Schedule
              </button>
            </div>

            <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <div className="font-bold text-slate-900 dark:text-white">
                Escalation Ladder SLA Timings
              </div>
              <div className="font-mono text-[11px] text-amber-800 dark:text-amber-300">
                L1→L5 Timeouts: {escalationMatrix.map((e) => `${e.level}:${e.timeoutDays}d`).join(' · ')}
              </div>
              <button
                type="button"
                onClick={() =>
                  escalationMatrix[2] &&
                  updateEscalationRule({
                    ...escalationMatrix[2],
                    timeoutDays: Math.max(3, escalationMatrix[2].timeoutDays - 1),
                  })
                }
                className="px-2.5 py-1 rounded bg-amber-700 text-white text-[11px] font-semibold cursor-pointer"
              >
                Tighten L3 SLA (-1 Day)
              </button>
            </div>
          </div>

          {/* Configurable Document Checklist */}
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white">
              Mandatory Document Checklist (Submission &amp; Release)
            </div>
            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              {docChecklistItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                placeholder="Add new mandatory document rule..."
                className="flex-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => {
                  if (newChecklistItem.trim()) {
                    setDocChecklistItems((prev) => [...prev, newChecklistItem.trim()]);
                    setNewChecklistItem('');
                    addToast('success', 'Checklist Rule Added', 'Updated mandatory document checklist.');
                  }
                }}
                className="px-3 py-1 rounded bg-slate-800 text-white font-semibold cursor-pointer"
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
