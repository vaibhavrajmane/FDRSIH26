import React, { useState } from 'react';
import {
  Link2,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ShieldAlert,
  ArrowRight,
  Clock,
  FileCheck2,
  XCircle,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { formatINR, formatDateDDMMMYYYY } from '../utils/rules';
import {
  VerificationProvenanceBadge,
  StatusLabel,
  DeterministicQrCode,
} from '../components/CommonBadges';

/**
 * Module G: Renewal & Replacement Tracking + Coverage-Continuity Timeline Visual
 */
export const RenewalsPage: React.FC = () => {
  const { instruments, institutions, setSelectedInstrumentId, setActiveTab } = usePortal();

  const renewalChains = instruments.filter(
    (i) =>
      i.previousInstrumentId ||
      i.replacedByInstrumentId ||
      i.status === 'Matured/Expired' ||
      i.status === 'Expiring Soon' ||
      i.status === 'Renewed'
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Renewal &amp; Replacement Version Chain + Coverage Continuity Monitor
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Tracks version history linking prior FDRs to renewed instruments and automatically flags any coverage lapse (days where an institution had no valid encumbered deposit).
        </p>
      </div>

      {/* Coverage Continuity Timeline Cards */}
      <div className="space-y-4">
        {renewalChains.slice(0, 12).map((item) => {
          const inst = institutions.find((x) => x.id === item.institutionId);
          const prior = instruments.find((x) => x.id === item.previousInstrumentId);
          const hasGap = (item.coverageGapDays || 0) > 0 || item.status === 'Matured/Expired';

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-900 dark:text-blue-400">
                      {item.id}
                    </span>
                    <VerificationProvenanceBadge level={item.verificationLevel} compact />
                    <StatusLabel status={item.status} />
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {inst?.name} ({inst?.aicteId}) · {inst?.state}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasGap ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-red-800 bg-red-50 border border-red-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      <span>Coverage Gap Alert: {item.coverageGapDays || 10} Days Uncovered</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>0-Day Gap · Continuous Coverage</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInstrumentId(item.id);
                      setActiveTab('scrutiny');
                    }}
                    className="px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded cursor-pointer"
                  >
                    Open in Scrutiny
                  </button>
                </div>
              </div>

              {/* Coverage Continuity Visual Timeline Bar */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>
                    {prior
                      ? `Prior: ${prior.id} (${formatDateDDMMMYYYY(prior.issueDate)} → ${formatDateDDMMMYYYY(prior.maturityDate)})`
                      : `Cycle Start: ${formatDateDDMMMYYYY(item.issueDate)}`}
                  </span>
                  <span>
                    Current: {item.fdrNumber} ({formatINR(item.depositAmount)}) → Mat: {formatDateDDMMMYYYY(item.maturityDate)}
                  </span>
                </div>

                <div className="w-full h-4 rounded-md overflow-hidden flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  {prior && (
                    <div
                      className="bg-emerald-600 h-full flex items-center justify-center text-[10px] font-mono text-white"
                      style={{ width: '45%' }}
                    >
                      v1: {prior.id} (2018–2026)
                    </div>
                  )}
                  {hasGap && (
                    <div
                      className="bg-red-600 h-full flex items-center justify-center text-[10px] font-mono font-bold text-white"
                      style={{ width: '20%' }}
                    >
                      GAP ({item.coverageGapDays || 10}d Lapsed)
                    </div>
                  )}
                  <div
                    className={`${
                      hasGap ? 'bg-amber-500' : 'bg-blue-700'
                    } h-full flex-1 flex items-center justify-center text-[10px] font-mono text-white`}
                  >
                    {prior ? `v2 Renewal: ${item.id} (2026–2034)` : `${item.id} (${item.status})`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Module H: Multi-Stage Release / Refund Workflow & Printable Release Order
 */
export const ReleaseWorkflowPage: React.FC = () => {
  const {
    releaseRequests,
    instruments,
    institutions,
    advanceReleaseStage,
  } = usePortal();

  const [selectedRelId, setSelectedRelId] = useState<string>(
    releaseRequests[0]?.id || 'REL-2026-01'
  );
  const [stageRemarks, setStageRemarks] = useState<string>(
    'Verified compliance conditions and original bank custody records.'
  );
  const [dischargeRef, setDischargeRef] = useState<string>('PFMS-UTR-SBIN2026102499812');
  const [dischargeProofFile, setDischargeProofFile] = useState<string>(
    'Bank_Lien_Discharge_Confirmation_Proof.pdf'
  );

  const activeRel =
    releaseRequests.find((r) => r.id === selectedRelId) || releaseRequests[0];
  const activeInstrument = instruments.find((i) => i.id === activeRel?.instrumentId);
  const activeInstitution = institutions.find((i) => i.id === activeRel?.institutionId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Release Requests Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
            Release &amp; Lien Discharge Applications ({releaseRequests.length})
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {releaseRequests.map((req) => {
              const inst = institutions.find((x) => x.id === req.institutionId);
              const isSelected = req.id === activeRel?.id;
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRelId(req.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/90 dark:bg-blue-950/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-blue-900 dark:text-blue-400">
                      {req.id} · {req.instrumentId}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        req.finalDecision === 'Blocked' || req.finalDecision === 'Rejected'
                          ? 'text-red-600'
                          : req.finalDecision === 'Approved' || req.finalDecision === 'Released'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {req.finalDecision}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                    {inst?.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Reason: {req.reason}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Multi-Stage Approval Pipeline & Printable Release Order (8 cols) */}
        {activeRel && activeInstrument && activeInstitution && (
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Application {activeRel.id} — {activeInstitution.name}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Instrument: {activeInstrument.id} ({activeInstrument.fdrNumber}) · Amount: {formatINR(activeInstrument.depositAmount)}
                  </div>
                </div>
                <VerificationProvenanceBadge level={activeInstrument.verificationLevel} />
              </div>

              {/* Accounts & Finance Officer Check: Bank Details & Amount to be Released */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Issuing Bank &amp; Branch:</span>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {activeInstrument.issuingBank} ({activeInstrument.branch})
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">IFSC &amp; FDR No:</span>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {activeInstrument.ifsc} · {activeInstrument.fdrNumber}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Account Holder:</span>
                  <div className="font-semibold text-slate-900 dark:text-white truncate" title={activeInstrument.accountHolderName}>
                    {activeInstrument.accountHolderName}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Amount to be Released:</span>
                  <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {formatINR(activeInstrument.depositAmount)}
                  </div>
                </div>
              </div>

              {/* Automatic Policy Block Banner (Scenario 8) */}
              {activeRel.blockedReason && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-900 dark:text-red-200 space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>RELEASE AUTOMATICALLY BLOCKED BY POLICY ENGINE</span>
                  </div>
                  <p>{activeRel.blockedReason}</p>
                </div>
              )}

              {/* Eligibility Checklist with Policy Source & Version Citation (F08 / J11 / U10) */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Automated Statutory Eligibility Checklist
                  </h4>
                  <span className="font-mono text-[11px] text-slate-500">
                    Policy Catalogue: Configured AICTE APH Rulebook v2026.1 · Clause 8.4 (Case-Specific Lock-In)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {activeRel.conditionsChecklist.map((c) => (
                    <div
                      key={c.id}
                      className={`p-2.5 rounded border ${
                        c.passed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold">
                        {c.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        <span>{c.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 pl-5">{c.details}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* F07 / J10 / J11: Explicit 3-State Separation (Approval vs Order Issuance vs Completed Bank Settlement) */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  Execution State Separation: Approval vs. Order vs. Completed Bank Discharge (F07 / J10 / J11)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">1. Internal Authority Approval</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {activeRel.finalDecision === 'Approved' || activeRel.finalDecision === 'Released'
                        ? 'Sanctioned by Competent Authority'
                        : activeRel.finalDecision === 'Blocked'
                        ? 'Blocked by Policy Engine'
                        : 'Pending Internal Sign-Off'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">2. Release Order Status</div>
                    <div className="font-semibold text-amber-800 dark:text-amber-300 mt-0.5">
                      {activeRel.finalDecision === 'Released'
                        ? 'Issued & Dispatched to Bank'
                        : activeRel.finalDecision === 'Approved'
                        ? 'DRAFT ORDER PREVIEW (Awaiting Stage 5)'
                        : 'Not Yet Generated'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold text-slate-500 uppercase">3. Bank Lien Discharge &amp; Settlement</div>
                    <div className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {activeRel.finalDecision === 'Released' && activeRel.paymentDischargeRef
                        ? `Executed (UTR: ${activeRel.paymentDischargeRef})`
                        : 'NOT EXECUTED — Lien Still Active at Bank'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-Stage Approval Pipeline */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Multi-Stage Approval &amp; Discharge Workflow (Scrutiny → Accounts → Competent Authority → Discharge &amp; Closure)
                </h4>
                <div className="space-y-2">
                  {activeRel.stages.map((st, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          Stage {idx + 1}: {st.stageName} ({st.approverRole})
                        </div>
                        {st.remarks && (
                          <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                            {st.approverName}: "{st.remarks}"
                          </div>
                        )}
                      </div>
                      <div className="font-mono font-bold">
                        {st.status === 'Approved' ? (
                          <span className="text-emerald-700">APPROVED</span>
                        ) : st.status === 'Rejected' ? (
                          <span className="text-red-600">BLOCKED / REJECTED</span>
                        ) : (
                          <span className="text-amber-600">
                            PENDING {st.slaHoursRemaining ? `(SLA: ${st.slaHoursRemaining}h)` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage Action Form */}
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  Record Stage Decision / Accounts Payment &amp; Discharge Proof
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Stage Remarks</label>
                    <input
                      type="text"
                      value={stageRemarks}
                      onChange={(e) => setStageRemarks(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Release / Discharge Reference No. (Accounts)
                    </label>
                    <input
                      type="text"
                      value={dischargeRef}
                      onChange={(e) => setDischargeRef(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Attach Discharge / Payment Proof File
                    </label>
                    <input
                      type="text"
                      value={dischargeProofFile}
                      onChange={(e) => setDischargeProofFile(e.target.value)}
                      className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      advanceReleaseStage(
                        activeRel.id,
                        'Approved',
                        stageRemarks,
                        dischargeRef,
                        dischargeProofFile
                      )
                    }
                    className="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold cursor-pointer"
                  >
                    Approve Current Stage / Confirm Payment &amp; Mark Ready for Closure
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceReleaseStage(activeRel.id, 'Sent Back', stageRemarks)}
                    className="px-4 py-1.5 rounded bg-amber-600 text-white font-semibold cursor-pointer"
                  >
                    Send Back to Institution
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceReleaseStage(activeRel.id, 'Rejected', stageRemarks)}
                    className="px-4 py-1.5 rounded bg-red-700 text-white font-semibold cursor-pointer"
                  >
                    Reject Request
                  </button>
                </div>
              </div>
            </div>

            {/* Printable Official Release Order Letter (Scenario 7) — With Explicit F07 Draft vs Executed Watermark */}
            {(activeRel.finalDecision === 'Approved' || activeRel.finalDecision === 'Released') && (
              <div className="bg-white dark:bg-slate-900 border-2 border-slate-800 dark:border-slate-600 rounded-xl p-6 space-y-4 text-xs">
                {activeRel.finalDecision === 'Approved' ? (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-semibold flex items-center justify-between gap-2">
                    <span>
                      DRAFT AUTHORIZATION PREVIEW ONLY (F07 / J10): Stage 4 Competent Authority Approval is complete, but Stage 5 (Bank Lien Discharge &amp; Settlement) is still PENDING. Do not treat this preview as an executed bank instruction until Stage 5 is recorded.
                    </span>
                    <span className="font-mono font-bold whitespace-nowrap">PENDING STAGE 5 DISCHARGE</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-semibold flex items-center justify-between gap-2">
                    <span>
                      EXECUTED &amp; DISCHARGED ORDER (STAGE 5 COMPLETE): Bank Lien Discharge &amp; Settlement Reference ({activeRel.paymentDischargeRef}) recorded by Accounts Officer.
                    </span>
                    <span className="font-mono font-bold whitespace-nowrap">DISCHARGE EXECUTED</span>
                  </div>
                )}

                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <div className="font-bold text-blue-900 dark:text-blue-400 uppercase">
                      अखिल भारतीय तकनीकी शिक्षा परिषद · ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {activeRel.finalDecision === 'Released'
                        ? 'EXECUTED STATUTORY LIEN DISCHARGE & FDR RELEASE ORDER'
                        : 'DRAFT STATUTORY LIEN DISCHARGE AUTHORIZATION (PENDING STAGE 5 DISCHARGE)'}
                    </h4>
                    <div className="font-mono text-slate-500 mt-1">
                      Order Ref: <strong>{activeRel.releaseOrderNumber}</strong> · Date: 21-Oct-2026 · Doc Version: v{activeInstrument.currentDocVersion || 1}.0
                    </div>
                  </div>
                  <DeterministicQrCode
                    value={`${activeRel.releaseOrderNumber}|${activeInstrument.fdrNumber}|${activeInstrument.depositAmount}`}
                  />
                </div>

                <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                  To,<br />
                  <strong>The Chief Branch Manager, {activeInstrument.issuingBank}</strong>,<br />
                  {activeInstrument.branch} (IFSC: <span className="font-mono">{activeInstrument.ifsc}</span>)<br /><br />
                  <strong>Subject:</strong> Release of Joint Lien Marked in Favour of Member Secretary, AICTE on Fixed Deposit Receipt No.{' '}
                  <strong className="font-mono">{activeInstrument.fdrNumber}</strong> for{' '}
                  <strong className="font-mono">{formatINR(activeInstrument.depositAmount)}</strong>.<br /><br />
                  Consequent upon satisfactory completion of the configured approval lock-in period (APH v2026.1) and clearance from Scrutiny, Vigilance, and Accounts divisions, the Competent Authority, AICTE hereby authorizes the discharge of AICTE's lien on the above FDR held by{' '}
                  <strong>{activeInstitution.name} ({activeInstitution.aicteId})</strong>.
                  {activeRel.paymentDischargeRef ? (
                    <>
                      <br /><br />
                      <strong>Recorded Bank Discharge &amp; Settlement Reference (Stage 5):</strong>{' '}
                      <span className="font-mono">{activeRel.paymentDischargeRef}</span>
                    </>
                  ) : (
                    <>
                      <br /><br />
                      <strong className="text-amber-700 dark:text-amber-400">
                        Downstream Responsibility:
                      </strong>{' '}
                      Accounts &amp; Finance Officer must verify bank settlement / lien discharge confirmation and record the UTR/Reference in Stage 5 before closing custody.
                    </>
                  )}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-mono text-[11px] text-slate-500">
                    Authorized by Dr. Meenakshi Sundaram, IAS (Advisor-I &amp; Competent Authority) · Prototype Demo Output
                  </span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-900 text-white font-semibold cursor-pointer no-print"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Release Order PDF</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
