import React, { useState } from 'react';
import {
  Clock,
  FastForward,
  Bell,
  ShieldCheck,
  AlertTriangle,
  Server,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { formatDateDDMMMYYYY, formatINR } from '../utils/rules';
import {
  BANK_ADAPTER_REGISTRY,
  INTEGRATION_READINESS_LIST,
  BankVerificationResponse,
} from '../services/bankVerificationService';

/**
 * Module F: Automated Monitoring, Time Simulation & Escalation Engine
 */
export const MonitoringAlertsPage: React.FC = () => {
  const {
    systemDate,
    notifications,
    escalationMatrix,
    reminderRules,
    advanceSimulatedTime,
  } = usePortal();

  const [customDays, setCustomDays] = useState<number>(15);
  const [selectedLangPreview, setSelectedLangPreview] = useState<'both' | 'en' | 'hi'>('both');

  return (
    <div className="space-y-6">
      {/* Simulate Time Control Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-800 dark:text-blue-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Automated Monitoring &amp; "Simulate Time" Engine
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Advance the portal clock by N days to demonstrate T-90/T-60/T-30/T-15 alerts firing, instruments transitioning to Expiring Soon / Matured, and L1–L5 escalations.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-right">
            <div className="text-[11px] text-blue-800 dark:text-blue-300 font-semibold">
              Active Simulated System Clock
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-blue-950 dark:text-white">
              {formatDateDDMMMYYYY(systemDate)}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Quick Time-Jump Presets:
          </span>
          {[7, 15, 30, 60].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => advanceSimulatedTime(d)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Advance +{d} Days</span>
            </button>
          ))}

          <div className="flex items-center gap-2 ml-auto">
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => setCustomDays(Number(e.target.value))}
              aria-label="Custom days to advance"
              className="w-20 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-mono"
            />
            <button
              type="button"
              onClick={() => advanceSimulatedTime(customDays)}
              className="px-3 py-1.5 font-semibold bg-slate-800 text-white rounded-md cursor-pointer"
            >
              Simulate Custom Days
            </button>
          </div>
        </div>
      </div>

      {/* L1 to L5 Escalation Matrix & Reminder Schedules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Statutory Escalation Matrix (L1 → L5)
          </h3>
          <div className="space-y-2 text-xs">
            {escalationMatrix.map((esc) => (
              <div
                key={esc.level}
                className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {esc.level}: {esc.targetTitle}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    {esc.autoAction}
                  </div>
                </div>
                <span className="font-mono text-[11px] font-semibold text-amber-700 whitespace-nowrap shrink-0">
                  SLA Timeout: {esc.timeoutDays}d
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Configured Trigger Cadence by Instrument Type
          </h3>
          <div className="space-y-2.5 text-xs">
            {reminderRules.map((rule) => (
              <div
                key={rule.instrumentType}
                className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1"
              >
                <div className="font-bold text-slate-900 dark:text-white">
                  {rule.instrumentType}
                </div>
                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  Pre-Maturity Triggers: {rule.preMaturityDays.map((d) => `T-${d}`).join(', ')} days
                </div>
                <div className="font-mono text-[11px] text-red-600 dark:text-red-400">
                  Overdue Escalation Triggers: {rule.overdueDays.map((d) => `+${d}`).join(', ')} days
                </div>
                <div className="text-[11px] text-slate-500">
                  Channels: {rule.channels.join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Channel Delivery Log with Bilingual Preview */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Multi-Channel Alert Delivery Log &amp; Bilingual Template Preview ({notifications.length})
          </h3>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs">
            {[
              { id: 'both', label: 'English + Hindi' },
              { id: 'en', label: 'English Only' },
              { id: 'hi', label: 'हिंदी (Hindi)' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedLangPreview(b.id as any)}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  selectedLangPreview === b.id ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {notifications.map((alt) => (
            <div
              key={alt.id}
              className={`p-4 rounded-lg border space-y-2 ${
                alt.severity === 'Critical'
                  ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{alt.title}</span>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                    Escalation: {alt.escalationLevel}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-500">
                  Channel: <strong>{alt.channel}</strong> · Rule: {alt.triggerRule} · Status: <strong>{alt.status}</strong>
                  {alt.slaHoursOverdue ? (
                    <span className="text-red-600 font-bold ml-2">
                      SLA Overdue: {alt.slaHoursOverdue}h
                    </span>
                  ) : null}
                </div>
              </div>

              {(selectedLangPreview === 'both' || selectedLangPreview === 'en') && (
                <div className="text-slate-700 dark:text-slate-300">{alt.messageEn}</div>
              )}
              {(selectedLangPreview === 'both' || selectedLangPreview === 'hi') && (
                <div className="text-slate-600 dark:text-slate-400">{alt.messageHi}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Module E: Bank Verification Simulator & Integration Readiness Registry
 */
export const BankSimulatorPage: React.FC = () => {
  const { instruments, runBankVerificationForInstrument } = usePortal();
  const [selectedInstId, setSelectedInstId] = useState<string>('FDR-2026-0001');
  const [lastSimResponse, setLastSimResponse] = useState<BankVerificationResponse | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleTestAdapter = async () => {
    setIsRunning(true);
    const res = await runBankVerificationForInstrument(selectedInstId);
    if (res.response) {
      setLastSimResponse(res.response);
    }
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      {/* Prototype Simulation Notice */}
      <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-xs text-amber-950 dark:text-amber-200 flex items-center justify-between gap-4">
        <div>
          <strong className="font-bold">PROTOTYPE SIMULATION NOTICE:</strong> This module implements the pluggable <code className="font-mono">BankVerificationProvider</code> adapter interface to simulate real-time Core Banking System (CBS) FDR &amp; Lien verification across Scheduled Commercial and Co-operative Banks.
        </div>
        <span className="font-mono font-bold whitespace-nowrap shrink-0">
          ISO 20022 / API Setu Mock
        </span>
      </div>

      {/* Interactive Adapter Test Console */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Interactive Bank CBS Verification Simulator
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <select
            aria-label="Select instrument to test bank verification"
            value={selectedInstId}
            onChange={(e) => setSelectedInstId(e.target.value)}
            className="px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono flex-1 min-w-[280px]"
          >
            {instruments.slice(0, 15).map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.id} · {inst.issuingBank} ({inst.fdrNumber}) — {formatINR(inst.depositAmount)}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isRunning}
            onClick={handleTestAdapter}
            className="inline-flex items-center gap-2 px-5 py-2 font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRunning ? 'Querying Bank Adapter...' : 'Execute CBS Adapter Verification'}</span>
          </button>
        </div>

        {lastSimResponse && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold">
              <span>Adapter: {lastSimResponse.providerName}</span>
              <span>
                Result: {lastSimResponse.status} ({lastSimResponse.latencyMs}ms) · Ref: {lastSimResponse.referenceId}
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-300">{lastSimResponse.certificateMessage}</div>
          </div>
        )}
      </div>

      {/* Bank Adapter Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Configured Bank Verification Providers (10 Seeded Banks)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                <th className="py-2 pr-3">Bank Name</th>
                <th className="py-2 px-3">IFSC Prefix</th>
                <th className="py-2 px-3">Adapter Status</th>
                <th className="py-2 px-3">Simulated Response Profile</th>
                <th className="py-2 pl-3 text-right">Avg Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {BANK_ADAPTER_REGISTRY.map((b) => (
                <tr key={b.bankName}>
                  <td className="py-2.5 pr-3 font-semibold">{b.bankName}</td>
                  <td className="py-2.5 px-3 font-mono">{b.ifscPrefix}</td>
                  <td className="py-2.5 px-3">{b.adapterStatus}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold">{b.supportedBehavior}</td>
                  <td className="py-2.5 pl-3 text-right font-mono">{b.averageLatencyMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* National e-Gov & Banking Integration Readiness Registry */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Integration Readiness Registry (Config-Driven National Adapters)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {INTEGRATION_READINESS_LIST.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                <span className="font-mono text-[11px] text-blue-800 dark:text-blue-300">
                  {item.status}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">{item.description}</p>
              <div className="font-mono text-[11px] text-slate-500">
                Protocol: {item.protocol} · Endpoint: {item.endpointPattern}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
