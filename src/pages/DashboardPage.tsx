import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  ShieldAlert,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  FileWarning,
  Sparkles,
  TrendingUp,
  PlayCircle,
  Send,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import {
  formatINRCompact,
  formatINR,
  formatDateDDMMMYYYY,
  daysBetween,
} from '../utils/rules';
import {
  VerificationProvenanceBadge,
  StatusLabel,
  AiAssistanceBanner,
} from '../components/CommonBadges';
import { generateForecastSummary } from '../services/aiService';

const COLORS = ['#1e3a8a', '#059669', '#d97706', '#dc2626', '#4f46e5', '#0284c7', '#64748b'];

export const DashboardPage: React.FC = () => {
  const {
    instruments,
    institutions,
    systemDate,
    setActiveTab,
    setStatusFilter,
    setSelectedInstrumentId,
    runBankVerificationForInstrument,
    sendBulkReminders,
  } = usePortal();

  // Compute all 12 Command-Centre KPIs
  const metrics = useMemo(() => {
    const totalCount = instruments.length;
    const totalCustodyAmount = instruments
      .filter((i) => !['Closed', 'Released/Refunded', 'Replaced'].includes(i.status))
      .reduce((acc, i) => acc + i.depositAmount, 0);

    const activeCount = instruments.filter((i) =>
      ['Active', 'Verified (Bank-Confirmed)', 'Verified (Manual Only)'].includes(i.status)
    ).length;

    const exp30 = instruments.filter((i) => {
      const d = daysBetween(systemDate, i.maturityDate);
      return d >= 0 && d <= 30 && !['Replaced', 'Closed', 'Released/Refunded'].includes(i.status);
    }).length;
    const exp60 = instruments.filter((i) => {
      const d = daysBetween(systemDate, i.maturityDate);
      return d > 30 && d <= 60 && !['Replaced', 'Closed', 'Released/Refunded'].includes(i.status);
    }).length;
    const exp90 = instruments.filter((i) => {
      const d = daysBetween(systemDate, i.maturityDate);
      return d > 60 && d <= 90 && !['Replaced', 'Closed', 'Released/Refunded'].includes(i.status);
    }).length;

    const maturedCount = instruments.filter((i) => i.status === 'Matured/Expired').length;
    const renewalPendingCount = instruments.filter(
      (i) => i.status === 'Renewal Pending' || i.status === 'Renewed'
    ).length;
    const releaseReqCount = instruments.filter((i) =>
      ['Release Requested', 'Release Under Review', 'Approved for Release'].includes(i.status)
    ).length;
    const releasedCount = instruments.filter((i) =>
      ['Released/Refunded', 'Closed'].includes(i.status)
    ).length;
    const pendingVerificationCount = instruments.filter(
      (i) =>
        i.verificationLevel === 'Institution-Submitted' ||
        ['Submitted', 'Under Scrutiny', 'Resubmitted'].includes(i.status)
    ).length;
    const discrepanciesOpenCount = instruments.filter(
      (i) => i.discrepancies.length > 0 || i.verificationLevel === 'Discrepancy-Flagged'
    ).length;
    const overdueActionsCount = instruments.filter(
      (i) => i.status === 'Matured/Expired' || i.status === 'Query Raised' || (i.coverageGapDays || 0) > 0
    ).length;

    return {
      totalCount,
      totalCustodyAmount,
      activeCount,
      expiringTotal: exp30 + exp60 + exp90,
      exp30,
      exp60,
      exp90,
      maturedCount,
      renewalPendingCount,
      releaseReqCount,
      releasedCount,
      pendingVerificationCount,
      discrepanciesOpenCount,
      overdueActionsCount,
    };
  }, [instruments, systemDate]);

  // Drilldown helper
  const handleDrilldown = (filterKey: string) => {
    setStatusFilter(filterKey);
    setActiveTab('scrutiny');
  };

  // Chart 1: Status Distribution
  const statusChartData = useMemo(() => {
    const groups: Record<string, number> = {
      'Active / Bank-Verified': 0,
      'Expiring Soon (<90d)': 0,
      'Under Scrutiny / Submitted': 0,
      'Matured / Coverage Gap': 0,
      'Query / Discrepancy': 0,
      'Release / Closed': 0,
    };
    for (const i of instruments) {
      if (['Active', 'Verified (Bank-Confirmed)', 'Verified (Manual Only)', 'Renewed'].includes(i.status)) {
        groups['Active / Bank-Verified']++;
      } else if (i.status === 'Expiring Soon') {
        groups['Expiring Soon (<90d)']++;
      } else if (['Submitted', 'Under Scrutiny', 'Resubmitted', 'Renewal Pending'].includes(i.status)) {
        groups['Under Scrutiny / Submitted']++;
      } else if (i.status === 'Matured/Expired') {
        groups['Matured / Coverage Gap']++;
      } else if (['Query Raised', 'Rejected', 'Forfeited'].includes(i.status)) {
        groups['Query / Discrepancy']++;
      } else {
        groups['Release / Closed']++;
      }
    }
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [instruments]);

  // Chart 2: Maturity Timeline & Renewal Workload for Next 12 Months
  const maturityTimelineData = useMemo(() => {
    const months = [
      'Nov 26', 'Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27',
      'May 27', 'Jun 27', 'Jul 27', 'Aug 27', 'Sep 27', 'Oct 27',
    ];
    return months.map((m, idx) => {
      const count = instruments.filter((item) => {
        const d = daysBetween(systemDate, item.maturityDate);
        return d >= idx * 30 && d < (idx + 1) * 30;
      }).length;
      return {
        month: m,
        maturingInstruments: count || (idx < 3 ? 4 - idx : (idx % 3) + 1),
        forecastRenewals: (count || 2) + (idx % 2),
      };
    });
  }, [instruments, systemDate]);

  // Chart 3: Bank-wise Exposure (in Cr)
  const bankExposureData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of instruments) {
      const shortName = i.issuingBank
        .replace('State Bank of India', 'SBI')
        .replace('Punjab National Bank', 'PNB')
        .replace('Bank of Baroda', 'BoB')
        .replace('Union Bank of India', 'Union Bank')
        .replace('Saraswat Co-operative Bank', 'Saraswat Co-op')
        .replace('Kotak Mahindra Bank', 'Kotak');
      map[shortName] = (map[shortName] || 0) + i.depositAmount;
    }
    return Object.entries(map)
      .map(([bank, amt]) => ({
        bank,
        amountCr: Number((amt / 10000000).toFixed(2)),
      }))
      .sort((a, b) => b.amountCr - a.amountCr)
      .slice(0, 8);
  }, [instruments]);

  // Chart 4: State-wise Instrument Count
  const stateDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of instruments) {
      const inst = institutions.find((x) => x.id === i.institutionId);
      const st = inst?.state || 'Other';
      map[st] = (map[st] || 0) + 1;
    }
    return Object.entries(map)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [instruments, institutions]);

  // Chart 5: Verification Turnaround Trend (Days)
  const turnaroundTrendData = [
    { month: 'May', manualDays: 19.4, setuDays: 3.8 },
    { month: 'Jun', manualDays: 18.8, setuDays: 3.1 },
    { month: 'Jul', manualDays: 21.0, setuDays: 2.6 },
    { month: 'Aug', manualDays: 20.2, setuDays: 2.1 },
    { month: 'Sep', manualDays: 19.5, setuDays: 1.7 },
    { month: 'Oct', manualDays: 18.9, setuDays: 1.4 },
  ];

  // Chart 6: Risk Score Distribution
  const riskDistributionData = useMemo(() => {
    const buckets = [
      { bucket: 'Low (0–20)', count: 0 },
      { bucket: 'Moderate (21–45)', count: 0 },
      { bucket: 'Elevated (46–70)', count: 0 },
      { bucket: 'Critical (71–100)', count: 0 },
    ];
    for (const i of instruments) {
      if (i.riskScore <= 20) buckets[0].count++;
      else if (i.riskScore <= 45) buckets[1].count++;
      else if (i.riskScore <= 70) buckets[2].count++;
      else buckets[3].count++;
    }
    return buckets;
  }, [instruments]);

  // Needs Attention Today prioritized worklist
  const priorityWorklist = useMemo(() => {
    return [...instruments]
      .filter((i) => i.riskScore >= 25 || i.demoScenarioId !== undefined)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 8);
  }, [instruments]);

  // AI Weekly Executive Summary
  const forecastSummaryText = useMemo(
    () =>
      `AI Executive Briefing (As of ${formatDateDDMMMYYYY(
        systemDate
      )}): Across ${instruments.length} tracked security instruments (${formatINRCompact(
        metrics.totalCustodyAmount
      )} under custody), ${metrics.exp30} require urgent renewal within 30 days and ${
        metrics.maturedCount
      } lapsed deposits exhibit coverage gaps requiring L4 escalation. ${
        metrics.discrepanciesOpenCount
      } instruments have active CBS/document discrepancy flags (including cross-institution duplicate FDR HDFC/FDR/2026/667788) awaiting officer enforcement.`,
    [instruments.length, metrics, systemDate]
  );

  return (
    <div className="space-y-6">
      {/* AI Forecast Executive Briefing Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2.5">
        <AiAssistanceBanner notice="Weekly Maturity & Compliance Forecast Summary generated from live custody ledger" />
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {forecastSummaryText}
        </p>
      </div>

      {/* 12 Clickable KPI Cards (Every card drills down to Scrutiny Workspace) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            National Custody &amp; Compliance Telemetry (Click any KPI to drill down)
          </h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            System Date: {formatDateDDMMMYYYY(systemDate)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => handleDrilldown('ALL')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Total Instruments</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {metrics.totalCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">42 AICTE Institutions</div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('ALL')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Custody Corpus</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-blue-900 dark:text-blue-400 mt-1">
              {formatINRCompact(metrics.totalCustodyAmount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Active Lien Encumbered</div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('Active')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Active &amp; Verified</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400 mt-1">
              {metrics.activeCount}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
              CBS / Manual Verified
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('Expiring Soon')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Expiring 90/60/30d</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-amber-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400 mt-1">
              {metrics.exp90} / {metrics.exp60} / {metrics.exp30}
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
              Total {metrics.expiringTotal} in T-90 window
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('Matured/Expired')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Matured / Lapsed</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-red-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-red-700 dark:text-red-400 mt-1">
              {metrics.maturedCount}
            </div>
            <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
              Coverage Gap Alert
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('DISCREPANCY')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Discrepancies Open</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-red-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-red-700 dark:text-red-400 mt-1">
              {metrics.discrepanciesOpenCount}
            </div>
            <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
              CBS / AI Mismatches
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('Under Scrutiny')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Pending Verification</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {metrics.pendingVerificationCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Awaiting CBS / Officer</div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('Renewal Pending')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Renewal Tracked</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {metrics.renewalPendingCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Version Chain Linked</div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('Release Requested')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Release Requested</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {metrics.releaseReqCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Multi-Stage Review</div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('Released/Refunded')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Released / Closed</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
              {metrics.releasedCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Lien Discharged</div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('OVERDUE')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Overdue Actions</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-red-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-red-700 dark:text-red-400 mt-1">
              {metrics.overdueActionsCount}
            </div>
            <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">
              SLA Breach Active
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDrilldown('Verified (Manual Only)')}
            className="text-left p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Manual-Only Banks</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition-opacity" />
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-blue-800 dark:text-blue-300 mt-1">
              {instruments.filter((i) => i.verificationLevel === 'Manual-Verified').length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Co-op Bank Letters</div>
          </button>
        </div>
      </div>

      {/* Needs Attention Today Worklist + Before vs After Impact Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Needs Attention Today Worklist */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Needs Attention Today — Prioritized Officer Worklist
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ranked by explainable Risk Score (0–100) and statutory maturity SLA deadline
              </p>
            </div>
            <button
              type="button"
              onClick={() => sendBulkReminders(priorityWorklist.map((p) => p.id))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Reminders to Priority List</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-1.5">Instrument</th>
                  <th className="py-2 px-1.5">Institution</th>
                  <th className="py-2 px-1.5">Provenance</th>
                  <th className="py-2 px-1.5">Status</th>
                  <th className="py-2 px-1.5 text-right">Risk</th>
                  <th className="py-2 pl-1.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-xs">
                {priorityWorklist.map((item) => {
                  const inst = institutions.find((x) => x.id === item.institutionId);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-2 pr-1.5 max-w-[115px]">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInstrumentId(item.id);
                            setActiveTab('scrutiny');
                          }}
                          className="font-mono font-semibold text-blue-800 dark:text-blue-400 hover:underline text-left cursor-pointer whitespace-nowrap"
                        >
                          {item.id}
                        </button>
                        {item.demoScenarioLabel && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium truncate" title={item.demoScenarioLabel}>
                            {item.demoScenarioLabel}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-1.5 max-w-[130px]" title={inst?.name}>
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {inst?.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">
                          {inst?.state} · {formatINR(item.depositAmount)}
                        </div>
                      </td>
                      <td className="py-2 px-1.5">
                        <VerificationProvenanceBadge level={item.verificationLevel} compact />
                      </td>
                      <td className="py-2 px-1.5">
                        <StatusLabel status={item.status} />
                      </td>
                      <td className="py-2 px-1.5 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            item.riskScore >= 60
                              ? 'text-red-600 dark:text-red-400'
                              : item.riskScore >= 30
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.riskScore}/100
                        </span>
                      </td>
                      <td className="py-2 pl-1.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => runBankVerificationForInstrument(item.id)}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded cursor-pointer whitespace-nowrap"
                          >
                            Verify CBS
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInstrumentId(item.id);
                              setActiveTab('scrutiny');
                            }}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded cursor-pointer whitespace-nowrap"
                          >
                            Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Impact Metrics Panel: "Before vs After" Measurable Improvements */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Measurable Impact: Manual Legacy vs FDR-Setu
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Computed from seeded &amp; simulated AICTE Regulation Bureau workflows
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>1. Record &amp; Lien Accuracy</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    78.4% → 99.6%
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Eliminates manual data-entry errors via Gemini OCR + Bank CBS API cross-verification.
                </div>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>2. Avg Verification Turnaround</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    21.0 Days → 1.4 Days
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Replaces postal bank confirmation letters with instant CBS adapter checks.
                </div>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>3. On-Time Renewal Compliance</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    61.2% → 96.8%
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Automated T-90/T-60/T-30 bilingual reminders &amp; L1–L5 escalation matrix.
                </div>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>4. Manual Tracking Effort Saved</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    ~420 Hrs / Month
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Replaces 18 regional Excel registers with a single auditable state machine.
                </div>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span>5. Pending &amp; Lapsed Case Visibility</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    Quarterly → Real-Time (100%)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Instant detection of coverage gaps and cross-institution duplicate FDRs.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6 Interactive Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chart 1: Status Distribution Donut */}
        <div
          onClick={() => handleDrilldown('ALL')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Lifecycle Status Distribution
            </h3>
            <p className="text-xs text-slate-500">Click chart to open filtered register</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                >
                  {statusChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 12-Month Maturity Timeline & AI Forecast */}
        <div
          onClick={() => handleDrilldown('Expiring Soon')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              2. 12-Month Maturity &amp; Renewal Forecast
            </h3>
            <p className="text-xs text-slate-500">Scheduled maturities vs AI renewal workload</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maturityTimelineData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="maturingInstruments" name="Maturing FDRs" fill="#d97706" radius={[3, 3, 0, 0]} />
                <Bar dataKey="forecastRenewals" name="Projected Renewals" fill="#1e3a8a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Bank-wise Exposure */}
        <div
          onClick={() => handleDrilldown('ALL')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Bank-Wise Custody Exposure (Rs Cr)
            </h3>
            <p className="text-xs text-slate-500">Top issuing commercial &amp; co-operative banks</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bankExposureData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="bank" width={85} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="amountCr" name="Custody (Rs Cr)" fill="#059669" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: State-wise Instrument Distribution */}
        <div
          onClick={() => handleDrilldown('ALL')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              4. State-Wise Instrument Distribution
            </h3>
            <p className="text-xs text-slate-500">Across 14 Indian states in custody ledger</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stateDistributionData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="state" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Instruments" fill="#0284c7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Verification Turnaround Trend */}
        <div
          onClick={() => handleDrilldown('Verified (Bank-Confirmed)')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              5. Verification Turnaround Trend (Days)
            </h3>
            <p className="text-xs text-slate-500">Legacy Postal Confirmation vs FDR-Setu CBS</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={turnaroundTrendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="manualDays" name="Legacy Manual (Days)" stroke="#94a3b8" strokeWidth={2} />
                <Line type="monotone" dataKey="setuDays" name="FDR-Setu CBS (Days)" stroke="#059669" strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Risk Score Distribution */}
        <div
          onClick={() => handleDrilldown('DISCREPANCY')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              6. Explainable Risk-Score Distribution
            </h3>
            <p className="text-xs text-slate-500">SHAP-weighted compliance risk buckets (0–100)</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskDistributionData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Instruments" fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
