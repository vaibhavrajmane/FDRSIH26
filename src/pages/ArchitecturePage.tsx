import React from 'react';
import {
  Layers,
  GitBranch,
  Cpu,
  FileText,
  ArrowDown,
  CheckCircle2,
  Server,
} from 'lucide-react';

const ALGORITHMS_TABLE = [
  {
    part: 'Login',
    algo: 'Password hashing (Argon2 or bcrypt) + TOTP one-time code',
    simple: 'Keeps passwords unreadable and adds a second check',
  },
  {
    part: 'Permissions',
    algo: 'Role-based access control (RBAC)',
    simple: 'Each role has a list of allowed actions; anything else is refused',
  },
  {
    part: 'Status control',
    algo: 'Finite state machine',
    simple: 'A status can only move along allowed steps, e.g. you cannot jump from Submitted to Released',
  },
  {
    part: 'Reading FDR scans',
    algo: 'OCR + multimodal AI (Gemini) with confidence scores',
    simple: 'Reads the document and says how sure it is about each field',
  },
  {
    part: 'Error checking',
    algo: 'Rule engine (if-then rules)',
    simple: 'Flags things like amount too low, maturity before issue date, or no lien to AICTE',
  },
  {
    part: 'Duplicate and name matching',
    algo: 'Hash lookup + fuzzy matching (Levenshtein, Jaro-Winkler)',
    simple: 'Finds the same FDR number used twice, or names that are almost the same',
  },
  {
    part: 'Risk score (0–100)',
    algo: 'Weighted scoring in the prototype; gradient-boosted trees (XGBoost) with SHAP in production',
    simple: 'Adds up risk points and shows which factors pushed the score up',
  },
  {
    part: 'Unusual patterns',
    algo: 'Isolation Forest (optional)',
    simple: 'Spots cases that look unlike normal ones',
  },
  {
    part: 'Alerts',
    algo: 'Scheduled job (cron) + date arithmetic',
    simple: 'Every night, subtracts today from each due date and sends reminders',
  },
  {
    part: 'Escalation',
    algo: 'Timer-based escalation ladder',
    simple: 'If nobody acts within the set days, the case moves up one level',
  },
  {
    part: 'Priority list',
    algo: 'Weighted sort (risk × urgency)',
    simple: 'Puts the most dangerous and most urgent cases on top',
  },
  {
    part: 'Ask the Portal',
    algo: 'LLM turns the question into a JSON filter, and the app runs it on the database',
    simple: 'The AI only writes the filter, so it cannot invent data',
  },
  {
    part: 'Forecast',
    algo: 'Aggregation + moving average',
    simple: 'Counts upcoming maturities month by month and projects the workload',
  },
  {
    part: 'Tamper-proof audit',
    algo: 'SHA-256 hash chain',
    simple: 'Each log entry includes the fingerprint of the previous one, so any edit breaks the chain',
  },
  {
    part: 'Document integrity',
    algo: 'SHA-256 file hash',
    simple: 'Shows whether an uploaded file was changed later',
  },
  {
    part: 'Data protection',
    algo: 'AES-256 at rest, TLS 1.3 in transit',
    simple: 'Stored and transferred data is encrypted',
  },
];

const TECH_STACK_COMPARISON = [
  {
    layer: 'Front end',
    prototype: 'TypeScript, React, Tailwind CSS, Recharts',
    production: 'Same (TypeScript + React)',
  },
  {
    layer: 'Back end',
    prototype: 'A simulated service layer in TypeScript with browser storage',
    production: 'Java (Spring Boot) or Python (FastAPI), exposed as REST APIs',
  },
  {
    layer: 'AI and data science',
    prototype: 'Gemini API called from TypeScript',
    production: 'Python (scikit-learn, XGBoost, SHAP)',
  },
  {
    layer: 'Database',
    prototype: 'localStorage',
    production: 'PostgreSQL (SQL); Redis for caching',
  },
  {
    layer: 'File storage',
    prototype: 'Browser',
    production: 'Encrypted object storage (MinIO or S3-compatible)',
  },
  {
    layer: 'Scheduler and alerts',
    prototype: 'A "simulate time" button in JavaScript',
    production: 'Cron or Celery with RabbitMQ or Kafka',
  },
  {
    layer: 'Search',
    prototype: 'Filters in JavaScript',
    production: 'PostgreSQL full-text or Elasticsearch',
  },
  {
    layer: 'Deployment',
    prototype: 'AI Studio preview',
    production: 'Docker + Kubernetes on MeghRaj/NIC',
  },
];

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header + Official PDF Reference Guide Link */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="text-xs font-bold text-blue-900 dark:text-blue-400 uppercase tracking-wider">
            Smart India Hackathon Problem Statement #26265 · AICTE Regulation Bureau
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            FDR-Setu: Official Guide Flowcharts, Algorithms, Integrations &amp; Production Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Engineered for deployment on <strong>MeghRaj (GI Cloud) / NIC National Data Centre</strong> with 100% parity against the SIH #26265 Reference Guide (23 Problem-Solution mappings, 3 Lifecycle Flowcharts, 5 RBAC Personas, and 16 Core Algorithms).
          </p>
        </div>
        <a
          href="/assets/aistudio/FDR_Guide_aa30c759.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>Open Reference Guide PDF</span>
        </a>
      </div>

      {/* 3 Visual Process Flowcharts from Pages 4 & 5 of the Guide */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>1. End-to-End Lifecycle Flowcharts (Pages 4 &amp; 5 of Reference Guide)</span>
          </h3>
          {/* Color Legend matching Guide Pages 4-5 */}
          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-500 inline-block" />
              <span>Institution</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-purple-100 border border-purple-500 inline-block" />
              <span>AICTE officials</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-stone-100 border border-stone-400 inline-block" />
              <span>System (automatic)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
          {/* Flowchart A: Submission & Verification */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white mb-2">
              Flow 1: Submission, AI Auto-Check &amp; Verification
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-center">
              <div className="font-bold text-emerald-950 dark:text-emerald-200">Institution logs in</div>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300">Password + OTP (2FA)</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-center">
              <div className="font-bold text-emerald-950 dark:text-emerald-200">Submits FDR details and files</div>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300">FDR copy, lien letter</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
              <div className="font-bold text-slate-900 dark:text-white">System auto-checks</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">AI reads, rules run, risk score</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-400 text-center">
              <div className="font-bold text-purple-950 dark:text-purple-200">Scrutiny officer reviews</div>
              <div className="text-[11px] text-purple-800 dark:text-purple-300">Runs bank verification</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-400 text-center">
                <div className="font-bold text-purple-950 dark:text-purple-200">All details match?</div>
                <div className="text-[10px] text-purple-800 dark:text-purple-300">Yes → Authority approves</div>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-400 text-center">
                <div className="font-bold text-red-700 dark:text-red-300">No → Query raised</div>
                <div className="text-[10px] text-purple-800 dark:text-purple-300">Institution resubmits</div>
              </div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
              <div className="font-bold text-slate-900 dark:text-white">FDR becomes Active</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Bank-Confirmed or Manual Only</div>
            </div>
          </div>

          {/* Flowchart B: Daily Scheduler, Renewal & Escalation */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white mb-2">
              Flow 2: Daily Scheduler, Renewal &amp; Escalation
            </div>
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
              <div className="font-bold text-slate-900 dark:text-white">Daily scheduler runs</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">Checks every deposit date</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
              <div className="font-bold text-slate-900 dark:text-white">Reminders sent</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">90, 60, 30, 15, 7, 1 days before</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-center">
                <div className="font-bold text-emerald-950 dark:text-emerald-200">Yes: Uploads Renewal</div>
                <div className="text-[10px] text-emerald-800 dark:text-emerald-300">Linked to old FDR</div>
              </div>
              <div className="p-2 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
                <div className="font-bold text-red-700 dark:text-red-300">No: Escalation L1→L5</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300">Authority: Notice / Forfeiture</div>
              </div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-400 text-center">
              <div className="font-bold text-purple-950 dark:text-purple-200">Officer verifies it</div>
              <div className="text-[11px] text-purple-800 dark:text-purple-300">Old FDR marked Replaced</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
              <div className="font-bold text-slate-900 dark:text-white">Coverage continues</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Full history kept (0-day gap)</div>
            </div>
          </div>

          {/* Flowchart C: Release & Refund */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="font-bold text-slate-900 dark:text-white mb-2">
              Flow 3: Authorized Release &amp; Refund Processing
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-400 text-center">
              <div className="font-bold text-emerald-950 dark:text-emerald-200">Institution requests release</div>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-300">Reason + documents</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
              <div className="font-bold text-slate-900 dark:text-white">System checks eligibility</div>
              <div className="text-[11px] text-slate-600 dark:text-slate-300">Queries, dues, litigation</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-400 text-center">
                <div className="font-bold text-purple-950 dark:text-purple-200">Yes: Scrutiny → Accounts</div>
                <div className="text-[10px] text-purple-800 dark:text-purple-300">Review, then payment check</div>
              </div>
              <div className="p-2 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
                <div className="font-bold text-red-700 dark:text-red-300">No: Release blocked</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-300">Institution fixes issue</div>
              </div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-400 text-center">
              <div className="font-bold text-purple-950 dark:text-purple-200">Authority approves</div>
              <div className="text-[11px] text-purple-800 dark:text-purple-300">Decision with remarks</div>
            </div>
            <ArrowDown className="w-3.5 h-3.5 mx-auto text-slate-400" />
            <div className="p-2.5 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-400 text-center">
              <div className="font-bold text-slate-900 dark:text-white">Release order issued</div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Payment ref, case closed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Algorithms Used, in Simple Words (Pages 7 & 8 of Guide) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-800 dark:text-blue-400" />
          <span>2. Algorithms Used, in Simple Words (Pages 7 &amp; 8 of Reference Guide)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                <th className="py-2 pr-3">Part of the system</th>
                <th className="py-2 px-3">Algorithm or technique</th>
                <th className="py-2 pl-3">What it does in simple words</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {ALGORITHMS_TABLE.map((row) => (
                <tr key={row.part}>
                  <td className="py-2 pr-3 font-bold text-slate-900 dark:text-white">{row.part}</td>
                  <td className="py-2 px-3 font-mono text-blue-900 dark:text-blue-300">{row.algo}</td>
                  <td className="py-2 pl-3 text-slate-600 dark:text-slate-300">{row.simple}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Programming Languages & Tools: Prototype in AI Studio vs Production Version (Page 8 of Guide) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-purple-700 dark:text-purple-400" />
          <span>3. Programming Languages &amp; Tools: Prototype in AI Studio vs Production Version (Page 8)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                <th className="py-2 pr-3">Layer</th>
                <th className="py-2 px-3">Prototype in AI Studio</th>
                <th className="py-2 pl-3">Production version (MeghRaj / NIC Cloud)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {TECH_STACK_COMPARISON.map((row) => (
                <tr key={row.layer}>
                  <td className="py-2 pr-3 font-bold text-slate-900 dark:text-white">{row.layer}</td>
                  <td className="py-2 px-3 text-emerald-800 dark:text-emerald-300 font-medium">{row.prototype}</td>
                  <td className="py-2 pl-3 font-mono text-slate-700 dark:text-slate-300">{row.production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Independent Jury Review & Human-Factors Resolution Register (Purva Gawali Audit) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>4. Independent Jury Review &amp; Human-Factors Audit Resolution Matrix (F01–F08 · J01–J12 · U01–U16 · Task A &amp; B)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Every observed defect, human-factors risk, and verification control from the 14-page Jury Review has been resolved and verified in live code.
            </p>
          </div>
          <a
            href="/assets/aistudio/AICTE_Websites_Complete_Jury_Review_Purva_Gawali_8cafafb7.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-lg hover:bg-emerald-100"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Open Jury Review PDF (Purva Gawali)</span>
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 px-3">Jury Review Finding (FDR-Setu)</th>
                <th className="py-2 px-3">Root Cause Identified in Code</th>
                <th className="py-2 pl-3">Implemented Engineering Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-red-700 dark:text-red-400">F02 / J03</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Filter &amp; Selected Record Diverge (&quot;Kalinga&quot; search retained Pragati FDR-2026-0001)</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Detail view looked up <code>selectedInstrumentId</code> in unfiltered <code>instruments</code> array first.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Bound <code>selectedInstrument</code> strictly to <code>filteredInstruments</code> + auto-sync <code>useEffect</code> + Active Record Context Lock banner.</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-red-700 dark:text-red-400">F05 / J06</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">63-char SHA-256 Checksum Anomaly on FDR-2026-0001 Documents 1 &amp; 2</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400"><code>seedData.ts</code> concatenated a 61-char hex prefix with 2-digit slice (<code>61 + 2 = 63</code> chars).</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Replaced with <code>computeDeterministicHash()</code> producing exact 64-character hex digests (256-bit NIST FIPS 180-4) + bumped storage key to v2.</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-amber-700 dark:text-amber-400">F01 / X01 / J01</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Task &amp; Vocabulary Overload for First-Time Scrutiny Officer</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Officer had to switch across 4 tabs to determine the core blocker and next responsible actor.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Added 1-Glance Officer Assessment Summary Card (1. Core Issue, 2. Evidence &amp; Scope, 3. Active Blocker, 4. Next Responsible Actor).</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-amber-700 dark:text-amber-400">F03 / U05</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Simulation &amp; Verification Authority Confusion</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Badges displayed unqualified &quot;Bank-Confirmed&quot; alongside simulated adapter footnotes.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Updated <code>VerificationProvenanceBadge</code> to explicitly display <code>Bank-Confirmed (Sim CBS)</code> &amp; bound verification to document version (<code>v1.0</code>).</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-amber-700 dark:text-amber-400">F04 / J02 / Task A</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Instrument State Mistaken for Institution Obligation State</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Multiple FDRs per college could look like multiple defaults instead of historical renewals vs active cover.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Added Institution 360° Obligation vs. Instrument Position Breakdown classifying Active Cover, Superseded Renewals, and Lock-In Complete instruments.</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-amber-700 dark:text-amber-400">F06 / C01 / J07</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">FDR Copy &amp; Lien Letter Showed Identical Generic Preview</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Document Vault rendered the same receipt card regardless of <code>doc.type</code>.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Added purpose-specific previews (Official Lien Noting Certificate vs Bank Confirmation Dispatch vs Term Deposit Receipt) + 4-part Evidence Scope strip.</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-amber-700 dark:text-amber-400">F07 / J10 / U10</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Approval, Release Order &amp; Final Bank Discharge Conflation</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Draft release order preview looked like a completed discharge before Stage 5 settlement.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Added 3-State Execution Separation Card + <code>DRAFT AUTHORIZATION PREVIEW ONLY — PENDING STAGE 5 DISCHARGE</code> watermark until Stage 5 completes.</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-amber-700 dark:text-amber-400">F08 / J11 / X06</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Unqualified Impact Claims &amp; Statutory Policy Citations</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Dashboard presented simulated improvements (78.4% → 99.6%) as measured outcomes.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Qualified all metrics as <code>SIMULATED PROJECTION</code> and cited <code>Configured AICTE APH Rulebook v2026.1 · Clause 8.4</code>.</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-blue-700 dark:text-blue-400">C02 / J05 / U07</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Risk Score Arithmetic Reconciliation</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Capping total score at 100 could make raw factor weights sum to &gt;100.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Normalized last factor weight in <code>calculateRiskScore()</code> so visible weights always sum 100% identically to displayed Risk Score.</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono font-bold text-blue-700 dark:text-blue-400">Task B / U04</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">Replacement &amp; Stale R1 Bank Response Race Condition</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-400">Delayed bank confirmation for R1 (v1.0) could overwrite active R2 (v2.0) submission.</td>
                <td className="py-2 pl-3 text-emerald-800 dark:text-emerald-300 font-medium">Implemented <code>validateBankReplyVersion()</code> + interactive 1-click Task B simulator in Scrutiny Workspace Verification tab.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
