import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Printer,
  ShieldCheck,
  AlertTriangle,
  FileText,
  MessageSquareWarning,
  History,
  RefreshCw,
  Unlock,
  Lock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Flag,
  Edit3,
  Send,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { InstrumentStatus } from '../types';
import {
  formatINR,
  formatDateDDMMMYYYY,
  daysBetween,
  ALLOWED_STATUS_TRANSITIONS,
} from '../utils/rules';
import { exportRowsToCSV } from '../utils/i18n';
import {
  VerificationProvenanceBadge,
  StatusLabel,
  MaskedField,
  AiAssistanceBanner,
} from '../components/CommonBadges';
import { generateSmartDraft } from '../services/aiService';

export const ScrutinyWorkspacePage: React.FC = () => {
  const {
    instruments,
    institutions,
    verifications,
    documents,
    observations,
    releaseRequests,
    auditEvents,
    systemDate,
    selectedInstrumentId,
    setSelectedInstrumentId,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    runBankVerificationForInstrument,
    transitionInstrumentStatus,
    updatePermittedInstrumentFields,
    raiseObservation,
    closeObservation,
    sendBulkReminders,
    logAudit,
    setActiveTab,
  } = usePortal();

  const [stateFilter, setStateFilter] = useState<string>('ALL');
  const [bankFilter, setBankFilter] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'risk' | 'amount' | 'maturity'>('risk');
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // Detail Drawer Tabs
  const [detailTab, setDetailTab] = useState<
    'overview' | 'documents' | 'verification' | 'observations' | 'timeline' | 'renewals' | 'release' | 'audit'
  >('overview');

  // Observation Form State
  const [obsText, setObsText] = useState<string>('');
  const [obsSeverity, setObsSeverity] = useState<'Info' | 'Minor' | 'Major' | 'Critical'>('Major');
  const [isDraftingAi, setIsDraftingAi] = useState<boolean>(false);
  const [aiDraftNotice, setAiDraftNotice] = useState<string>('');

  // Status Transition & Edit Field State
  const [targetNextStatus, setTargetNextStatus] = useState<InstrumentStatus | ''>('');
  const [transitionReason, setTransitionReason] = useState<string>('Verified against bank confirmation record');
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editMaturity, setEditMaturity] = useState<string>('');
  const [editLien, setEditLien] = useState<boolean>(true);
  const [editReason, setEditReason] = useState<string>('');
  const [isVerifyingBank, setIsVerifyingBank] = useState<boolean>(false);

  const uniqueStates = useMemo(
    () => Array.from(new Set(institutions.map((i) => i.state))).sort(),
    [institutions]
  );
  const uniqueBanks = useMemo(
    () => Array.from(new Set(instruments.map((i) => i.issuingBank))).sort(),
    [instruments]
  );

  // Filtered & sorted instruments
  const filteredInstruments = useMemo(() => {
    return instruments
      .filter((item) => {
        const inst = institutions.find((x) => x.id === item.institutionId);
        if (statusFilter !== 'ALL') {
          if (statusFilter === 'DISCREPANCY') {
            if (item.discrepancies.length === 0 && item.verificationLevel !== 'Discrepancy-Flagged') {
              return false;
            }
          } else if (statusFilter === 'OVERDUE') {
            if (item.status !== 'Matured/Expired' && item.status !== 'Query Raised') {
              return false;
            }
          } else if (item.status !== statusFilter) {
            return false;
          }
        }
        if (stateFilter !== 'ALL' && inst?.state !== stateFilter) return false;
        if (bankFilter !== 'ALL' && item.issuingBank !== bankFilter) return false;
        if (verificationFilter !== 'ALL' && item.verificationLevel !== verificationFilter) return false;
        if (riskFilter === 'HIGH' && item.riskScore < 50) return false;
        if (riskFilter === 'LOW' && item.riskScore >= 50) return false;

        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchInst = inst?.name.toLowerCase().includes(q) || inst?.aicteId.toLowerCase().includes(q);
          const matchFdr = item.fdrNumber.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
          if (!matchInst && !matchFdr) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'risk') return b.riskScore - a.riskScore;
        if (sortBy === 'amount') return b.depositAmount - a.depositAmount;
        return new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime();
      });
  }, [
    instruments,
    institutions,
    statusFilter,
    stateFilter,
    bankFilter,
    verificationFilter,
    riskFilter,
    searchQuery,
    sortBy,
  ]);

  const selectedInstrument = useMemo(
    () =>
      instruments.find((i) => i.id === selectedInstrumentId) ||
      filteredInstruments[0] ||
      instruments[0],
    [instruments, selectedInstrumentId, filteredInstruments]
  );

  const selectedInstitution = useMemo(
    () =>
      institutions.find((i) => i.id === selectedInstrument?.institutionId) ||
      institutions[0],
    [institutions, selectedInstrument]
  );

  const selectedVerification = useMemo(
    () => verifications.find((v) => v.instrumentId === selectedInstrument?.id),
    [verifications, selectedInstrument]
  );

  const selectedDocs = useMemo(
    () => documents.filter((d) => d.instrumentId === selectedInstrument?.id),
    [documents, selectedInstrument]
  );

  const selectedObs = useMemo(
    () => observations.filter((o) => o.instrumentId === selectedInstrument?.id),
    [observations, selectedInstrument]
  );

  const selectedAudits = useMemo(
    () => auditEvents.filter((a) => a.entityId === selectedInstrument?.id),
    [auditEvents, selectedInstrument]
  );

  const handleTriggerBankVerify = async () => {
    if (!selectedInstrument) return;
    setIsVerifyingBank(true);
    await runBankVerificationForInstrument(selectedInstrument.id);
    setIsVerifyingBank(false);
    setDetailTab('verification');
  };

  const handleAiSmartDraftObservation = async () => {
    if (!selectedInstrument || !selectedInstitution) return;
    setIsDraftingAi(true);
    const res = await generateSmartDraft(
      'scrutiny_observation',
      selectedInstrument,
      selectedInstitution
    );
    setObsText(res.bodyEnglish);
    setObsSeverity(res.recommendedSeverity);
    setAiDraftNotice(res.notice || 'Drafted by Gemini AI Assistant');
    logAudit(
      'AI_SMART_DRAFT_GENERATED',
      'AI-Assist',
      selectedInstrument.id,
      'Prompt: SCRUTINY_OBSERVATION_LETTER',
      'AI-assisted draft generated for officer confirmation'
    );
    setIsDraftingAi(false);
  };

  const handleRaiseObservationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstrument || !obsText.trim()) return;
    raiseObservation(selectedInstrument.id, obsText, obsSeverity);
    setObsText('');
    setAiDraftNotice('');
  };

  const openEditFieldsModal = () => {
    if (!selectedInstrument) return;
    setEditAmount(selectedInstrument.depositAmount);
    setEditMaturity(selectedInstrument.maturityDate);
    setEditLien(selectedInstrument.lienMarkedInFavourOfAICTE);
    setEditReason('');
    setIsEditModalOpen(true);
  };

  const handleSaveEditedFields = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstrument) return;
    const res = updatePermittedInstrumentFields(
      selectedInstrument.id,
      {
        depositAmount: Number(editAmount),
        maturityDate: editMaturity,
        lienMarkedInFavourOfAICTE: editLien,
      },
      editReason
    );
    if (res.ok) {
      setIsEditModalOpen(false);
    }
  };

  const handleExportCSV = () => {
    const rows = filteredInstruments.map((i) => {
      const inst = institutions.find((x) => x.id === i.institutionId);
      return {
        InstrumentID: i.id,
        AICTE_ID: inst?.aicteId || '',
        Institution: inst?.name || '',
        State: inst?.state || '',
        Type: i.instrumentType,
        FDR_Number: i.fdrNumber,
        Bank: i.issuingBank,
        IFSC: i.ifsc,
        Deposit_INR: i.depositAmount,
        MaturityDate: i.maturityDate,
        Status: i.status,
        Provenance: i.verificationLevel,
        RiskScore: i.riskScore,
      };
    });
    exportRowsToCSV(`FDR_Setu_Scrutiny_Register_${systemDate}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Saved Presets Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-700" />
              <span>Saved Views:</span>
            </span>
            {[
              { key: 'ALL', label: 'All Instruments' },
              { key: 'DISCREPANCY', label: 'Discrepancy / Fraud Flags' },
              { key: 'Under Scrutiny', label: 'Under Scrutiny' },
              { key: 'Expiring Soon', label: 'Expiring Soon' },
              { key: 'Matured/Expired', label: 'Matured / Lapsed' },
              { key: 'Verified (Manual Only)', label: 'Manual-Only (Co-op)' },
            ].map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setStatusFilter(preset.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === preset.key
                    ? 'bg-blue-900 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {selectedRowIds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  sendBulkReminders(selectedRowIds);
                  setSelectedRowIds([]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Bulk Remind ({selectedRowIds.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
          </div>
        </div>

        {/* Multi-Faceted Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Filter instruments by institution, AICTE ID, or FDR number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Institution, AICTE ID, or FDR..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <select
            aria-label="Filter by State"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All States ({uniqueStates.length})</option>
            {uniqueStates.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            aria-label="Filter by Issuing Bank"
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Issuing Banks</option>
            {uniqueBanks.map((bk) => (
              <option key={bk} value={bk}>{bk}</option>
            ))}
          </select>

          <select
            aria-label="Filter by Provenance Level"
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Provenance Levels</option>
            <option value="Bank-Confirmed">Bank-Confirmed (CBS)</option>
            <option value="Institution-Submitted">Institution-Submitted</option>
            <option value="Manual-Verified">Verified (Manual Only)</option>
            <option value="Discrepancy-Flagged">Discrepancy-Flagged</option>
          </select>

          <select
            aria-label="Sort Instruments"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="risk">Sort: Highest Risk First</option>
            <option value="maturity">Sort: Earliest Maturity</option>
            <option value="amount">Sort: Highest Principal</option>
          </select>
        </div>
      </div>

      {/* Master-Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Instruments Table (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Showing {filteredInstruments.length} of {instruments.length} Instruments
            </span>
            <button
              type="button"
              onClick={() => {
                if (selectedRowIds.length === filteredInstruments.length) {
                  setSelectedRowIds([]);
                } else {
                  setSelectedRowIds(filteredInstruments.slice(0, 15).map((i) => i.id));
                }
              }}
              className="text-xs text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {selectedRowIds.length > 0 ? 'Clear Selection' : 'Select Top 15'}
            </button>
          </div>

          <div className="max-h-[680px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredInstruments.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No instruments match current filter criteria
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setStateFilter('ALL');
                    setBankFilter('ALL');
                    setVerificationFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded-md cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              filteredInstruments.map((item) => {
                const inst = institutions.find((x) => x.id === item.institutionId);
                const isSelected = selectedInstrument?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedInstrumentId(item.id)}
                    className={`p-3.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.id}`}
                          checked={selectedRowIds.includes(item.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedRowIds((prev) =>
                              prev.includes(item.id)
                                ? prev.filter((x) => x !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-mono text-xs font-bold text-blue-900 dark:text-blue-300">
                          {item.id}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          · {item.issuingBank}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold tabular-nums ${
                          item.riskScore >= 60
                            ? 'text-red-600 dark:text-red-400'
                            : item.riskScore >= 30
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        Risk {item.riskScore}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1 truncate">
                      {inst?.name}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                      <VerificationProvenanceBadge level={item.verificationLevel} compact />
                      <span className="text-xs font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                        {formatINR(item.depositAmount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-500">
                      <StatusLabel status={item.status} />
                      <span className="font-mono tabular-nums">
                        Mat: {formatDateDDMMMYYYY(item.maturityDate)}
                      </span>
                    </div>

                    {item.demoScenarioLabel && (
                      <div className="mt-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        {item.demoScenarioLabel}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Instrument Detail Workspace with 8 Tabs (7 cols) */}
        {selectedInstrument && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5">
            {/* Instrument Header & Primary Officer Actions */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                    {selectedInstrument.id}
                  </h2>
                  <VerificationProvenanceBadge level={selectedInstrument.verificationLevel} />
                  <StatusLabel status={selectedInstrument.status} />
                </div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedInstitution?.name} ({selectedInstitution?.aicteId})
                </div>
                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                  <span>{selectedInstitution?.state}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedInstrument.issuingBank} ({selectedInstrument.ifsc})</span>
                  <span aria-hidden="true">·</span>
                  <span>FDR No: <MaskedField entityId={selectedInstrument.id} fieldName="fdrNumber" value={selectedInstrument.fdrNumber} /></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isVerifyingBank}
                  onClick={handleTriggerBankVerify}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isVerifyingBank ? 'Calling Bank CBS...' : 'Run Bank Verification'}</span>
                </button>
                <button
                  type="button"
                  onClick={openEditFieldsModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Fields</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updatePermittedInstrumentFields(
                      selectedInstrument.id,
                      { investigationFlag: !selectedInstrument.investigationFlag },
                      selectedInstrument.investigationFlag
                        ? 'Cleared vigilance flag after review'
                        : 'Flagged for duplicate/discrepancy vigilance investigation'
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedInstrument.investigationFlag
                      ? 'bg-red-700 text-white'
                      : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>
                    {selectedInstrument.investigationFlag ? 'Investigation Active' : 'Flag Investigation'}
                  </span>
                </button>
              </div>
            </div>

            {/* State-Machine Status Transition Bar */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  State Machine Transition:
                </span>
                <select
                  aria-label="Select target status transition"
                  value={targetNextStatus}
                  onChange={(e) => setTargetNextStatus(e.target.value as InstrumentStatus)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="">-- Choose Allowed Next State --</option>
                  {(ALLOWED_STATUS_TRANSITIONS[selectedInstrument.status] || []).map((st) => (
                    <option key={st} value={st}>
                      {st} (Allowed)
                    </option>
                  ))}
                  <option value="Released/Refunded">
                    Released/Refunded (Test Illegal Direct Jump)
                  </option>
                </select>
                <input
                  type="text"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="Audit remarks..."
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs w-44"
                />
              </div>
              <button
                type="button"
                disabled={!targetNextStatus}
                onClick={() => {
                  if (targetNextStatus) {
                    transitionInstrumentStatus(
                      selectedInstrument.id,
                      targetNextStatus,
                      transitionReason
                    );
                  }
                }}
                className="px-3 py-1 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-40 rounded cursor-pointer whitespace-nowrap shrink-0"
              >
                Apply Transition
              </button>
            </div>

            {/* 8 Detail Tabs Navigation */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800 pb-1">
              {[
                { id: 'overview', label: 'Overview & Risk' },
                { id: 'verification', label: 'Declared vs AI vs Bank' },
                { id: 'documents', label: `Documents (${selectedDocs.length})` },
                { id: 'observations', label: `Observations (${selectedObs.length})` },
                { id: 'timeline', label: 'Timeline' },
                { id: 'renewals', label: 'Renewals' },
                { id: 'release', label: 'Release' },
                { id: 'audit', label: `Audit (${selectedAudits.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDetailTab(t.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    detailTab === t.id
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW & EXPLAINABLE RISK SCORE */}
            {detailTab === 'overview' && (
              <div className="space-y-5">
                {/* Discrepancy Flags Alert Box */}
                {selectedInstrument.discrepancies.length > 0 && (
                  <div className="p-4 rounded-lg bg-red-50/90 dark:bg-red-950/40 border border-red-200 dark:border-red-800 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-900 dark:text-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        Hybrid Discrepancy Engine Detected {selectedInstrument.discrepancies.length} Issue(s)
                      </span>
                    </div>
                    <div className="space-y-2">
                      {selectedInstrument.discrepancies.map((disc) => (
                        <div
                          key={disc.id}
                          className="p-2.5 rounded bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 text-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-red-800 dark:text-red-300">
                            <span>{disc.title}</span>
                            <span className="font-mono text-[11px]">{disc.severity} · {disc.ruleCode}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mt-1">{disc.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Instrument Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-slate-500">Principal Deposit Amount</div>
                    <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {formatINR(selectedInstrument.depositAmount)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Required Norm: {formatINR(selectedInstrument.requiredAmount)}
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-slate-500">Issue &amp; Maturity Dates</div>
                    <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                      {formatDateDDMMMYYYY(selectedInstrument.issueDate)} → {formatDateDDMMMYYYY(selectedInstrument.maturityDate)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      ROI: {selectedInstrument.interestRate}% · Auto-Renew: {selectedInstrument.autoRenewalFlag ? 'Yes' : 'No'}
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                    <div className="text-slate-500">AICTE Lien Endorsement</div>
                    <div className="font-semibold mt-0.5">
                      {selectedInstrument.lienMarkedInFavourOfAICTE ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          Marked in Favour of AICTE
                        </span>
                      ) : (
                        <span className="text-red-600 font-bold">No AICTE Lien Marked</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {selectedInstrument.purpose}
                    </div>
                  </div>
                </div>

                {/* Explainable SHAP-Like Risk Score Breakdown */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                  <AiAssistanceBanner
                    compact
                    notice="Explainable Risk Scoring Model (0–100)"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Explainable Compliance Risk Score Breakdown
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Top contributing factors (transparent SHAP-style feature attribution, never a black box)
                      </p>
                    </div>
                    <div className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {selectedInstrument.riskScore} / 100
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedInstrument.riskFactors.map((rf, i) => (
                      <div key={i} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {rf.factor}
                          </span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            +{rf.weight} pts
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              rf.weight >= 25
                                ? 'bg-red-600'
                                : rf.weight >= 15
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, rf.weight * 2.5)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500">{rf.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SIDE-BY-SIDE DECLARED VS AI-EXTRACTED VS BANK-CONFIRMED */}
            {detailTab === 'verification' && (
              <div className="space-y-4">
                <AiAssistanceBanner notice="Side-by-Side Provenance Comparison: Institution-Declared vs Document-AI-Extracted vs Bank-CBS-Confirmed" />

                <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Latest Verification Reference:
                    </span>{' '}
                    <span className="font-mono text-blue-800 dark:text-blue-300">
                      {selectedVerification?.referenceId || 'Pending'}
                    </span>{' '}
                    · <span>Confirmed By: {selectedVerification?.confirmedBy}</span>
                  </div>
                  <span className="font-mono font-bold">
                    Result: {selectedVerification?.result || 'Pending'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                        <th className="py-2 pr-3">Field</th>
                        <th className="py-2 px-3">1. Institution-Declared</th>
                        <th className="py-2 px-3">2. Gemini AI-Extracted (OCR)</th>
                        <th className="py-2 px-3">3. Bank CBS Confirmed</th>
                        <th className="py-2 pl-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(selectedVerification?.fieldsCompared || []).map((row) => (
                        <tr
                          key={row.field}
                          className={
                            row.matchStatus === 'MISMATCH'
                              ? 'bg-red-50/70 dark:bg-red-950/30'
                              : ''
                          }
                        >
                          <td className="py-2.5 pr-3 font-semibold text-slate-800 dark:text-slate-200">
                            {row.label}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {row.declared}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            <div>{row.aiExtracted || row.declared}</div>
                            {row.aiConfidence !== undefined && (
                              <span
                                className={`text-[10px] ${
                                  row.aiConfidence < 80
                                    ? 'text-amber-700 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                Confidence: {row.aiConfidence}%
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                            {row.bankConfirmed || '—'}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono font-bold">
                            {row.matchStatus === 'MATCH' ? (
                              <span className="text-emerald-700 dark:text-emerald-400">MATCH</span>
                            ) : row.matchStatus === 'MISMATCH' ? (
                              <span className="text-red-600 dark:text-red-400">MISMATCH</span>
                            ) : (
                              <span className="text-amber-600">MANUAL</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: DOCUMENTS & VERSION HISTORY */}
            {detailTab === 'documents' && (
              <div className="space-y-4">
                {selectedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                          {doc.type} (Version v{doc.version}.0)
                        </span>
                        <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                          {doc.fileName} · {doc.fileSizeKb} KB
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Uploaded: {formatDateDDMMMYYYY(doc.uploadedAt)} by {doc.uploadedBy}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all">
                      <strong>SHA-256 Checksum:</strong> {doc.hash}
                    </div>

                    {/* Simulated Official Bank FDR Preview Card */}
                    <div className="p-4 rounded border-2 border-double border-slate-300 dark:border-slate-700 bg-amber-50/30 dark:bg-slate-950 text-xs space-y-1.5">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5">
                        <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          {selectedInstrument.issuingBank} — TERM DEPOSIT RECEIPT (SCAN PREVIEW)
                        </span>
                        <span className="font-mono text-[11px]">IFSC: {selectedInstrument.ifsc}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        <div>FDR Receipt No: {selectedInstrument.fdrNumber}</div>
                        <div>Principal: {formatINR(selectedInstrument.depositAmount)}</div>
                        <div>Holder: {selectedInstrument.accountHolderName}</div>
                        <div>Maturity: {formatDateDDMMMYYYY(selectedInstrument.maturityDate)}</div>
                      </div>
                      <div className="pt-1 text-[11px] font-semibold text-blue-900 dark:text-blue-400">
                        Endorsement: {selectedInstrument.lienMarkedInFavourOfAICTE ? 'JOINT LIEN NOTED IN FAVOUR OF MEMBER SECRETARY, AICTE NEW DELHI' : 'NO LIEN ENDORSEMENT'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: SCRUTINY OBSERVATIONS & AI SMART DRAFTING */}
            {detailTab === 'observations' && (
              <div className="space-y-4">
                <form
                  onSubmit={handleRaiseObservationSubmit}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Raise Scrutiny Observation / Deficiency Query
                    </h4>
                    <button
                      type="button"
                      disabled={isDraftingAi}
                      onClick={handleAiSmartDraftObservation}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-900 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-md cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>
                        {isDraftingAi ? 'Drafting with Gemini...' : 'Smart Draft Letter with AI'}
                      </span>
                    </button>
                  </div>

                  {aiDraftNotice && <AiAssistanceBanner notice={aiDraftNotice} />}

                  <textarea
                    rows={4}
                    value={obsText}
                    onChange={(e) => setObsText(e.target.value)}
                    placeholder="Enter formal scrutiny observation or click 'Smart Draft Letter with AI'..."
                    className="w-full p-2.5 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    required
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <label htmlFor="obs-sev" className="font-semibold">Severity:</label>
                      <select
                        id="obs-sev"
                        value={obsSeverity}
                        onChange={(e) => setObsSeverity(e.target.value as any)}
                        className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="Info">Info</option>
                        <option value="Minor">Minor</option>
                        <option value="Major">Major</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-md cursor-pointer"
                    >
                      Confirm &amp; Issue Observation
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {selectedObs.length === 0 ? (
                    <p className="text-xs text-slate-500 py-4 text-center">
                      No scrutiny observations recorded for this instrument.
                    </p>
                  ) : (
                    selectedObs.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {obs.id} · Severity: {obs.severity} · Status: {obs.status}
                          </span>
                          {obs.status !== 'Closed' && (
                            <button
                              type="button"
                              onClick={() => closeObservation(obs.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded cursor-pointer"
                            >
                              Mark Closed
                            </button>
                          )}
                        </div>
                        <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">
                          {obs.text}
                        </p>
                        {obs.responseText && (
                          <div className="p-2.5 rounded bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                            <div className="font-semibold text-blue-900 dark:text-blue-300">
                              Institution Response:
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                              {obs.responseText}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: TIMELINE / HISTORY */}
            {detailTab === 'timeline' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    1. Instrument Submitted by Institution ({formatDateDDMMMYYYY(selectedInstrument.createdAt)})
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Provenance: Institution-Submitted · Ack Ref: {selectedInstrument.acknowledgementRef || 'N/A'}
                  </div>
                </div>
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    2. Document AI Extraction &amp; Checksum Computed
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    SHA-256 verified · {selectedInstrument.discrepancies.length} discrepancy flags raised
                  </div>
                </div>
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white">
                    3. Current Verification &amp; Custody State ({formatDateDDMMMYYYY(selectedInstrument.updatedAt)})
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Status: {selectedInstrument.status} · Provenance: {selectedInstrument.verificationLevel}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: RENEWALS */}
            {detailTab === 'renewals' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Version &amp; Continuity Chain for {selectedInstrument.id}
                  </div>
                  <div>
                    Prior Linked Instrument:{' '}
                    <span className="font-mono font-semibold">
                      {selectedInstrument.previousInstrumentId || 'None (Original Deposit)'}
                    </span>
                  </div>
                  <div>
                    Replaced By Instrument:{' '}
                    <span className="font-mono font-semibold">
                      {selectedInstrument.replacedByInstrumentId || 'Active Current Version'}
                    </span>
                  </div>
                  <div>
                    Coverage Continuity Gap:{' '}
                    <span
                      className={`font-mono font-bold ${
                        (selectedInstrument.coverageGapDays || 0) > 0
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {selectedInstrument.coverageGapDays || 0} Days
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('renewals')}
                    className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded cursor-pointer"
                  >
                    Open Full Continuity Visual Timeline
                  </button>
                </div>
              </div>
            )}

            {/* TAB 7: RELEASE */}
            {detailTab === 'release' && (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Release &amp; Lien Discharge Eligibility
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    Open Observations: {selectedObs.filter((o) => o.status !== 'Closed').length} · Investigation Flag: {selectedInstrument.investigationFlag ? 'Yes (Blocked)' : 'No'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('releases')}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded cursor-pointer"
                  >
                    Manage in Release &amp; Refund Workflow
                  </button>
                </div>
              </div>
            )}

            {/* TAB 8: AUDIT */}
            {detailTab === 'audit' && (
              <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
                {selectedAudits.map((aud) => (
                  <div
                    key={aud.id}
                    className="p-2.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px]"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                      <span>{aud.action}</span>
                      <span>{aud.actorName} ({aud.actorRole})</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                      {aud.beforeValue} → {aud.afterValue}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      SHA-256: {aud.eventHash}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Permitted Fields Modal */}
      {isEditModalOpen && selectedInstrument && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 id="edit-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
              Update Permitted Fields — {selectedInstrument.id}
            </h3>
            <form onSubmit={handleSaveEditedFields} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Principal Deposit Amount (INR)</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Maturity Date</label>
                <input
                  type="date"
                  value={editMaturity}
                  onChange={(e) => setEditMaturity(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-lien"
                  type="checkbox"
                  checked={editLien}
                  onChange={(e) => setEditLien(e.target.checked)}
                />
                <label htmlFor="edit-lien" className="font-semibold">
                  AICTE Joint Lien Marked on Instrument
                </label>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-red-700 dark:text-red-400">
                  Mandatory Audit Trail Reason (Required)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g., Rectified amount per physical bank confirmation letter"
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-900 text-white font-semibold cursor-pointer"
                >
                  Save &amp; Log in Audit Chain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
