import React from 'react';
import {
  Server,
  Database,
  ShieldCheck,
  Cpu,
  Layers,
  GitBranch,
  CheckCircle2,
  Landmark,
} from 'lucide-react';

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-2">
        <div className="text-xs font-bold text-blue-900 dark:text-blue-400 uppercase tracking-wider">
          Smart India Hackathon Problem Statement #26265 · AICTE Regulation Bureau
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          FDR-Setu: Target Production Architecture, Lifecycle State Machine &amp; Rollout Roadmap
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Engineered for deployment on <strong>MeghRaj (GI Cloud) / NIC National Data Centre</strong> with strict adherence to GIGW 3.0, WCAG 2.1 AA, and the Digital Personal Data Protection (DPDP) Act 2023.
        </p>
      </div>

      {/* Layered Production Architecture Diagram */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-800" />
          <span>1. Proposed MeghRaj / NIC Production Cloud Architecture</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-blue-900 dark:text-blue-300">
              Layer 1: Access &amp; Identity
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>• React 19 + TypeScript WCAG 2.1 AA Bilingual SPA</li>
              <li>• NIC Parichay / JanParichay OIDC + 2FA SSO</li>
              <li>• API Gateway (Kong / NIC WAF) with Rate Limiting</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-emerald-800 dark:text-emerald-300">
              Layer 2: Core Microservices
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>• Custody &amp; State-Machine Service</li>
              <li>• Gemini Multimodal OCR &amp; Discrepancy Service</li>
              <li>• Temporal / BullMQ Alert &amp; Escalation Scheduler</li>
              <li>• Multi-Stage Release &amp; e-Sign Service</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-amber-800 dark:text-amber-300">
              Layer 3: Encrypted Persistence
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>• PostgreSQL 16 HA Cluster (Row-Level Security)</li>
              <li>• S3-Compatible Object Storage (AES-256-GCM)</li>
              <li>• Immutable WORM Audit Ledger (SHA-256 Chain)</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-purple-900 dark:text-purple-300">
              Layer 4: External National Bridges
            </div>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <li>• API Setu / Scheduled Bank CBS Lien Gateways</li>
              <li>• AICTE Approval Bureau Master Sync</li>
              <li>• PFMS / Bharatkosh &amp; MeitY DigiLocker</li>
              <li>• NIC Sandes / DLT SMS &amp; Gov.in SMTP</li>
            </ul>
          </div>
        </div>
      </div>

      {/* End-to-End Lifecycle State Machine Diagram */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          <span>2. Strict End-to-End Deposit Lifecycle State Machine</span>
        </h3>
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 font-mono text-xs leading-relaxed overflow-x-auto">
          <div className="font-semibold">
            [Draft] ──► [Submitted (Institution-Declared)] ──► [Under Scrutiny (AI OCR + Rules)]
          </div>
          <div className="text-amber-700 dark:text-amber-300 my-1 font-medium">
            &nbsp;&nbsp;&nbsp;├──► (Discrepancy Found) ──► [Query Raised] ◄──► [Resubmitted]
          </div>
          <div className="text-emerald-700 dark:text-emerald-400 my-1 font-medium">
            &nbsp;&nbsp;&nbsp;└──► (CBS Match / Manual Letter) ──► [Verified (Bank-Confirmed) / Verified (Manual Only)] ──► [Active]
          </div>
          <div className="text-blue-800 dark:text-blue-300 my-1 font-medium">
            [Active] ──► (T-90..T-1 Alerts) ──► [Expiring Soon] ──► [Renewal Pending] ──► [Renewed (v2 Linked, 0d Gap)]
          </div>
          <div className="text-red-700 dark:text-red-400 my-1 font-medium">
            [Expiring Soon] ──► (No Renewal Past Maturity) ──► [Matured/Expired (Coverage Gap · L3–L5 Escalation)]
          </div>
          <div className="text-purple-800 dark:text-purple-300 mt-1 font-medium">
            [Active / Matured] ──► [Release Requested] ──► [Release Under Review] ──► [Approved for Release] ──► [Released/Refunded] ──► [Closed]
          </div>
        </div>
      </div>

      {/* Success Metrics & Phased Rollout Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            3. Success-Metric Definitions &amp; SLA Benchmarks
          </h3>
          <div className="space-y-2 text-slate-600 dark:text-slate-300">
            <div>
              <strong className="text-slate-900 dark:text-white">• Record Provenance Accuracy (%):</strong> Ratio of instruments where declared principal, maturity, and AICTE lien match Bank CBS confirmation (Target: &gt;99.5%).
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">• Verification Turnaround Time (Days):</strong> Elapsed time from institution submission to Bank-Confirmed / Manual-Verified status (Reduced from 21 days to &lt;48 hours).
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">• Zero-Gap Renewal Continuity (%):</strong> Percentage of expiring instruments renewed prior to maturity date with 0 uncovered days.
            </div>
            <div>
              <strong className="text-slate-900 dark:text-white">• Release SLA Compliance (%):</strong> Eligible release requests processed within the 15-working-day statutory window.
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            4. National Rollout Roadmap
          </h3>
          <div className="space-y-2.5">
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-blue-900 dark:text-blue-400">
                Phase 1: Regional Pilot (Months 1–3)
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Deploy across AICTE Western &amp; Southern Regional Offices (2,500 institutions) with Gemini OCR, manual bank letter verification, and automated T-90 reminders.
              </p>
            </div>
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-emerald-800 dark:text-emerald-400">
                Phase 2: Scheduled Bank CBS Bridge (Months 4–6)
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Live API Setu / CBS integration with top 12 Public &amp; Private Sector Banks (SBI, PNB, BoB, Canara, HDFC, ICICI) covering 88% of deposit volume.
              </p>
            </div>
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-amber-800 dark:text-amber-400">
                Phase 3: Full National Scale-Out (Months 7–12)
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                All 10,000+ AICTE institutions live with automated EoA portal hold enforcement, DigiLocker pull, and PFMS/Bharatkosh settlement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
