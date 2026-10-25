import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  X,
  Search,
  Compass,
  ArrowRight,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { DEMO_SCENARIOS } from '../data/seedData';
import {
  translateNaturalLanguageQuery,
  StructuredPortalFilter,
} from '../services/aiService';
import { formatINR, formatDateDDMMMYYYY, daysBetween } from '../utils/rules';
import {
  VerificationProvenanceBadge,
  StatusLabel,
  AiAssistanceBanner,
} from './CommonBadges';

const SAMPLE_NL_QUERIES = [
  'Which FDRs over 30 lakh mature in the next 45 days in Maharashtra?',
  'Show institutions with lapsed coverage or overdue maturity',
  'List all instruments with discrepancies or duplicate FDR numbers',
  'Show manual verification co-operative bank instruments',
];

/**
 * "Ask the Portal" Natural-Language to Structured Filter Assistant Drawer
 */
export const AskPortalModal: React.FC = () => {
  const {
    isAskPortalOpen,
    setIsAskPortalOpen,
    instruments,
    institutions,
    systemDate,
    setSelectedInstrumentId,
    setActiveTab,
    logAudit,
  } = usePortal();

  const [query, setQuery] = useState<string>(SAMPLE_NL_QUERIES[0]);
  const [appliedFilter, setAppliedFilter] = useState<StructuredPortalFilter | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [notice, setNotice] = useState<string>('');

  const availableStates = useMemo(
    () => Array.from(new Set(institutions.map((i) => i.state))),
    [institutions]
  );
  const availableBanks = useMemo(
    () => Array.from(new Set(instruments.map((i) => i.issuingBank))),
    [instruments]
  );

  const handleRunQuery = async (qText: string) => {
    setQuery(qText);
    setIsTranslating(true);
    const res = await translateNaturalLanguageQuery(
      qText,
      availableStates,
      availableBanks
    );
    setAppliedFilter(res.filter);
    setNotice(res.notice || 'Translated query into structured JSON filter.');
    logAudit(
      'ASK_PORTAL_NL_QUERY',
      'AI-Assist',
      'NL-FILTER-ENGINE',
      `Query: "${qText}"`,
      `AI-assisted JSON Filter: ${JSON.stringify(res.filter)}`
    );
    setIsTranslating(false);
  };

  const matchingInstruments = useMemo(() => {
    if (!appliedFilter) return instruments.slice(0, 8);
    return instruments.filter((item) => {
      const inst = institutions.find((x) => x.id === item.institutionId);
      if (appliedFilter.state && inst?.state.toLowerCase() !== appliedFilter.state.toLowerCase()) {
        return false;
      }
      if (appliedFilter.bank && !item.issuingBank.toLowerCase().includes(appliedFilter.bank.toLowerCase())) {
        return false;
      }
      if (appliedFilter.minAmount && item.depositAmount < appliedFilter.minAmount) {
        return false;
      }
      if (appliedFilter.maturingWithinDays !== undefined) {
        const d = daysBetween(systemDate, item.maturityDate);
        if (d < -30 || d > appliedFilter.maturingWithinDays) return false;
      }
      if (appliedFilter.lapsedOnly) {
        if (item.status !== 'Matured/Expired' && (item.coverageGapDays || 0) === 0) return false;
      }
      if (appliedFilter.hasDiscrepancy) {
        if (item.discrepancies.length === 0 && item.verificationLevel !== 'Discrepancy-Flagged') {
          return false;
        }
      }
      if (appliedFilter.minRiskScore && item.riskScore < appliedFilter.minRiskScore) {
        return false;
      }
      if (appliedFilter.status && item.status !== appliedFilter.status) {
        return false;
      }
      return true;
    });
  }, [appliedFilter, instruments, institutions, systemDate]);

  if (!isAskPortalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-portal-title"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full flex flex-col shadow-2xl border-l border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 id="ask-portal-title" className="text-sm font-bold text-slate-900 dark:text-white">
              Ask the Portal — Natural-Language to Structured Filter Engine
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsAskPortalOpen(false)}
            aria-label="Close Ask the Portal drawer"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <AiAssistanceBanner
            notice={
              notice ||
              'Gemini translates officer questions into a structured JSON filter executed against local custody data — zero hallucinated records.'
            }
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunQuery(query);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask e.g. Which FDRs over 30 lakh mature in the next 45 days?"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
            <button
              type="submit"
              disabled={isTranslating}
              className="px-4 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-semibold cursor-pointer whitespace-nowrap shrink-0"
            >
              {isTranslating ? 'Translating...' : 'Execute Query'}
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_NL_QUERIES.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => handleRunQuery(sq)}
                className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer text-left"
              >
                "{sq}"
              </button>
            ))}
          </div>

          {appliedFilter && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-mono text-[11px] space-y-1">
              <div className="text-indigo-700 dark:text-indigo-400 font-bold">
                Structured Filter JSON (Executed Against Local Store):
              </div>
              <div>{JSON.stringify(appliedFilter, null, 2)}</div>
            </div>
          )}

          <div className="space-y-2">
            <div className="font-bold text-slate-900 dark:text-white">
              Matching Custody Records ({matchingInstruments.length})
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {matchingInstruments.map((item) => {
                const inst = institutions.find((x) => x.id === item.institutionId);
                return (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div>
                      <div className="font-mono font-bold text-blue-900 dark:text-blue-400">
                        {item.id} · {item.fdrNumber} ({formatINR(item.depositAmount)})
                      </div>
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        {inst?.name} ({inst?.state})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Maturity: {formatDateDDMMMYYYY(item.maturityDate)} · Status: {item.status}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInstrumentId(item.id);
                        setActiveTab('scrutiny');
                        setIsAskPortalOpen(false);
                      }}
                      className="px-3 py-1.5 rounded bg-blue-900 text-white font-semibold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Inspect
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Guided "Demo Tour" Modal Walking Through All 10 Required Demo Scenarios
 */
export const DemoTourModal: React.FC = () => {
  const {
    activeTourStep,
    setActiveTourStep,
    switchRoleInstant,
    setActiveTab,
    setSelectedInstrumentId,
    setStatusFilter,
  } = usePortal();

  if (activeTourStep === null) return null;

  const currentScenario =
    DEMO_SCENARIOS.find((s) => s.id === activeTourStep) || DEMO_SCENARIOS[0];

  const handleLaunchScenario = (scenario = currentScenario) => {
    switchRoleInstant(scenario.recommendedRole);
    setStatusFilter('ALL');
    if (scenario.targetInstrumentId) {
      setSelectedInstrumentId(scenario.targetInstrumentId);
    }
    setActiveTab(scenario.targetTab);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-tour-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Interactive Evaluator Walkthrough · 10 Seeded Test Scenarios
            </div>
            <h3 id="demo-tour-title" className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {currentScenario.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setActiveTourStep(null)}
            aria-label="Close Guided Demo Tour"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scenario Selector Pills (1..10) */}
        <div className="flex flex-wrap gap-1.5">
          {DEMO_SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setActiveTourStep(sc.id)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded cursor-pointer ${
                sc.id === currentScenario.id
                  ? 'bg-blue-900 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              #{sc.id}: {sc.badge}
            </button>
          ))}
        </div>

        {/* Current Scenario Details */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
            {currentScenario.summary}
          </p>
          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-500">
            <span>Recommended Persona: <strong>{currentScenario.recommendedRole}</strong></span>
            <span>Target Module: <strong>{currentScenario.targetTab.toUpperCase()}</strong></span>
            {currentScenario.targetInstrumentId && (
              <span>Seeded Record: <strong>{currentScenario.targetInstrumentId}</strong></span>
            )}
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="font-bold text-slate-900 dark:text-white">
              Step-by-Step Verification Instructions:
            </div>
            {currentScenario.instructions.map((inst, idx) => (
              <div key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{inst}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentScenario.id <= 1}
              onClick={() => setActiveTourStep(currentScenario.id - 1)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Previous Scenario
            </button>
            <button
              type="button"
              disabled={currentScenario.id >= 10}
              onClick={() => setActiveTourStep(currentScenario.id + 1)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Next Scenario
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              handleLaunchScenario(currentScenario);
              setActiveTourStep(null);
            }}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Jump to Scenario #{currentScenario.id} Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
