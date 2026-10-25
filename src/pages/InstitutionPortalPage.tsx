import React, { useState, useMemo } from 'react';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Printer,
  Send,
  RefreshCw,
  Unlock,
  Bell,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { ExtractedDocumentData, InstrumentType, ReleaseReason } from '../types';
import {
  formatINR,
  formatDateDDMMMYYYY,
  isValidIFSC,
  isValidFDRNumber,
  daysBetween,
} from '../utils/rules';
import { computeBrowserSha256 } from '../utils/i18n';
import { extractDocumentWithAI } from '../services/aiService';
import {
  VerificationProvenanceBadge,
  StatusLabel,
  MaskedField,
  AiAssistanceBanner,
  DeterministicQrCode,
} from '../components/CommonBadges';

export const InstitutionPortalPage: React.FC = () => {
  const {
    currentUser,
    institutions,
    instruments,
    observations,
    notifications,
    submitNewInstrument,
    respondToObservation,
    createReleaseRequest,
    logAudit,
  } = usePortal();

  const myInstitution = useMemo(() => {
    const instId = currentUser?.institutionId || 'INST-001';
    return institutions.find((i) => i.id === instId) || institutions[0];
  }, [currentUser, institutions]);

  // Enforce RBAC data scoping: Institution User sees ONLY their own institution's records
  const myInstruments = useMemo(
    () => instruments.filter((i) => i.institutionId === myInstitution.id),
    [instruments, myInstitution]
  );

  const myObservations = useMemo(
    () =>
      observations.filter((o) =>
        myInstruments.some((inst) => inst.id === o.instrumentId)
      ),
    [observations, myInstruments]
  );

  const myNotifications = useMemo(
    () =>
      notifications.filter(
        (n) => !n.institutionId || n.institutionId === myInstitution.id
      ),
    [notifications, myInstitution]
  );

  const [subTab, setSubTab] = useState<
    'my_instruments' | 'submit_wizard' | 'observations' | 'release_wizard' | 'inbox'
  >('my_instruments');

  // 5-Step Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('FDR');
  const [previousInstrumentId, setPreviousInstrumentId] = useState<string>('');
  const [issuingBank, setIssuingBank] = useState<string>('State Bank of India');
  const [branch, setBranch] = useState<string>('Pune Camp Treasury Branch');
  const [ifsc, setIfsc] = useState<string>('SBIN0000454');
  const [fdrNumber, setFdrNumber] = useState<string>('SBIN/FDR/2026/994501');
  const [accountHolderName, setAccountHolderName] = useState<string>(
    `${myInstitution.name} & Member Secretary AICTE`
  );
  const [depositAmount, setDepositAmount] = useState<number>(3500000);
  const [issueDate, setIssueDate] = useState<string>('2026-10-24');
  const [maturityDate, setMaturityDate] = useState<string>('2034-10-24');
  const [interestRate, setInterestRate] = useState<number>(7.25);
  const [autoRenewalFlag, setAutoRenewalFlag] = useState<boolean>(true);
  const [lienMarked, setLienMarked] = useState<boolean>(true);
  const [purpose, setPurpose] = useState<string>('Extension of Approval 2026-27');

  // Step 2: Document Upload & AI OCR State
  const [uploadedFileName, setUploadedFileName] = useState<string>('SBI_FDR_Signed_Receipt_2026.pdf');
  const [fileSha256, setFileSha256] = useState<string>(
    '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  );
  const [isExtractingAi, setIsExtractingAi] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData | undefined>(
    undefined
  );
  const [aiNotice, setAiNotice] = useState<string>('');

  // Step 4: Declaration & e-Sign
  const [declarationChecked, setDeclarationChecked] = useState<boolean>(false);
  const [esignAadhaarOtp, setEsignAadhaarOtp] = useState<string>('123456');
  const [esignCompleted, setEsignCompleted] = useState<boolean>(false);

  // Step 5: Submitted Receipt
  const [submittedRecord, setSubmittedRecord] = useState<any>(null);
  const [validationError, setValidationError] = useState<string>('');

  // Observation response state
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyFiles, setReplyFiles] = useState<Record<string, string>>({});

  // Release Wizard State
  const [releaseTargetId, setReleaseTargetId] = useState<string>(
    myInstruments[0]?.id || 'FDR-2026-0001'
  );
  const [releaseReason, setReleaseReason] = useState<ReleaseReason>('Approval period complete');
  const [releaseRemarks, setReleaseRemarks] = useState<string>(
    'Completed mandatory 8-year lock-in period with full academic and financial compliance.'
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const hash = await computeBrowserSha256(`${file.name}-${file.size}-${file.lastModified}`);
    setFileSha256(hash);
  };

  const handleRunAiOcr = async (
    preset: 'clean_sbi' | 'low_confidence_mismatch' | 'coop_manual'
  ) => {
    setIsExtractingAi(true);
    const hash = await computeBrowserSha256(`${uploadedFileName}-${preset}-${Date.now()}`);
    setFileSha256(hash);

    const res = await extractDocumentWithAI({
      fileName: uploadedFileName,
      presetScenario: preset,
      institutionName: myInstitution.name,
    });

    setExtractedData(res.data);
    setAiNotice(res.notice || 'Extracted fields via Gemini Document Intelligence.');

    // Pre-fill form fields from AI extraction
    if (res.data.issuingBank) setIssuingBank(res.data.issuingBank);
    if (res.data.branch) setBranch(res.data.branch);
    if (res.data.ifsc) setIfsc(res.data.ifsc);
    if (res.data.fdrNumber) setFdrNumber(res.data.fdrNumber);
    if (res.data.accountHolderName) setAccountHolderName(res.data.accountHolderName);
    if (res.data.depositAmount) setDepositAmount(res.data.depositAmount);
    if (res.data.issueDate) setIssueDate(res.data.issueDate);
    if (res.data.maturityDate) setMaturityDate(res.data.maturityDate);
    if (res.data.interestRate) setInterestRate(res.data.interestRate);
    if (res.data.lienMarkedInFavourOfAICTE !== undefined) {
      setLienMarked(res.data.lienMarkedInFavourOfAICTE);
    }

    logAudit(
      'AI_OCR_PREFILL_EXECUTED',
      'AI-Assist',
      uploadedFileName,
      `Preset: ${preset}`,
      'AI-assisted extraction pre-filled wizard fields; queued for human review'
    );
    setIsExtractingAi(false);
    setWizardStep(3);
  };

  const validateStep1 = (): boolean => {
    if (!isValidIFSC(ifsc)) {
      setValidationError(
        'Invalid IFSC format. Must be 4 letters + 0 + 6 alphanumeric characters (e.g., SBIN0000454).'
      );
      return false;
    }
    if (!isValidFDRNumber(fdrNumber)) {
      setValidationError('Invalid FDR Number format (6–22 alphanumeric/slash characters).');
      return false;
    }
    if (daysBetween(issueDate, maturityDate) <= 0) {
      setValidationError('Maturity date must be strictly after the issue date.');
      return false;
    }
    if (depositAmount < 100000) {
      setValidationError('Deposit amount must be at least Rs 1,00,000.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleFinalSubmit = () => {
    if (!declarationChecked || !esignCompleted) {
      setValidationError('Please complete statutory declaration and Aadhaar e-Sign simulation.');
      return;
    }
    const res = submitNewInstrument({
      instrumentType,
      fdrNumber,
      issuingBank,
      branch,
      ifsc,
      accountHolderName,
      depositAmount,
      issueDate,
      maturityDate,
      interestRate,
      autoRenewalFlag,
      lienMarkedInFavourOfAICTE: lienMarked,
      purpose,
      fileName: uploadedFileName,
      fileHash: fileSha256,
      extractedData,
      previousInstrumentId: previousInstrumentId || undefined,
    });
    if (res.ok && res.instrument) {
      setSubmittedRecord(res.instrument);
      setWizardStep(5);
    }
  };

  return (
    <div className="space-y-6">
      {/* Institution Context Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-blue-800 dark:text-blue-400 font-semibold">
            AICTE Permanent ID: {myInstitution.aicteId} · {myInstitution.type} Institution
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {myInstitution.name}
          </h2>
          <div className="text-xs text-slate-500">
            Nodal Officer: {myInstitution.nodalOfficerName} ({myInstitution.email}) · State: {myInstitution.state}
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'my_instruments', label: `My Instruments (${myInstruments.length})` },
            { id: 'submit_wizard', label: '+ Submit New FDR / Renewal' },
            { id: 'observations', label: `Observations (${myObservations.length})` },
            { id: 'release_wizard', label: 'Request Release / Refund' },
            { id: 'inbox', label: `Notifications (${myNotifications.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                subTab === t.id
                  ? 'bg-blue-900 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. MY INSTRUMENTS LIST */}
      {subTab === 'my_instruments' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Institution Security Deposits &amp; Next Required Actions
            </h3>
            <button
              type="button"
              onClick={() => {
                setPreviousInstrumentId('');
                setWizardStep(1);
                setSubTab('submit_wizard');
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              + Submit New FDR / Deposit
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                  <th className="py-2 pr-3">Instrument ID</th>
                  <th className="py-2 px-3">FDR Number</th>
                  <th className="py-2 px-3">Issuing Bank</th>
                  <th className="py-2 px-3 text-right">Principal</th>
                  <th className="py-2 px-3">Maturity</th>
                  <th className="py-2 px-3">Provenance</th>
                  <th className="py-2 px-3">Lifecycle Status</th>
                  <th className="py-2 pl-3 text-right">Next Required Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {myInstruments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 pr-3 font-mono font-bold text-blue-900 dark:text-blue-400">
                      {item.id}
                    </td>
                    <td className="py-3 px-3">
                      <MaskedField
                        entityId={item.id}
                        fieldName="fdrNumber"
                        value={item.fdrNumber}
                      />
                    </td>
                    <td className="py-3 px-3">{item.issuingBank}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums">
                      {formatINR(item.depositAmount)}
                    </td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      {formatDateDDMMMYYYY(item.maturityDate)}
                    </td>
                    <td className="py-3 px-3">
                      <VerificationProvenanceBadge level={item.verificationLevel} compact />
                    </td>
                    <td className="py-3 px-3">
                      <StatusLabel status={item.status} />
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviousInstrumentId(item.id);
                            setWizardStep(1);
                            setSubTab('submit_wizard');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded cursor-pointer"
                        >
                          Submit Renewal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReleaseTargetId(item.id);
                            setSubTab('release_wizard');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                        >
                          Request Release
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. 5-STEP SUBMIT NEW FDR / DEPOSIT WIZARD */}
      {subTab === 'submit_wizard' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-6">
          {/* Step Progress Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
            {[
              { step: 1, title: '1. Instrument Details' },
              { step: 2, title: '2. Upload & AI OCR' },
              { step: 3, title: '3. Review AI vs Entered' },
              { step: 4, title: '4. Declaration & e-Sign' },
              { step: 5, title: '5. Receipt & QR' },
            ].map((s) => (
              <div
                key={s.step}
                className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md ${
                  wizardStep === s.step
                    ? 'bg-blue-900 text-white'
                    : wizardStep > s.step
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                <span>{s.title}</span>
              </div>
            ))}
          </div>

          {validationError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 font-semibold">
              {validationError}
            </div>
          )}

          {/* STEP 1: INSTRUMENT DETAILS */}
          {wizardStep === 1 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Instrument Type</label>
                  <select
                    value={instrumentType}
                    onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="FDR">Fixed Deposit Receipt (FDR)</option>
                    <option value="Bank Guarantee">Bank Guarantee (BG)</option>
                    <option value="Security Deposit">Security Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Link to Prior Instrument (If Renewal/Replacement)
                  </label>
                  <select
                    value={previousInstrumentId}
                    onChange={(e) => setPreviousInstrumentId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  >
                    <option value="">-- New Fresh Deposit (No Prior Link) --</option>
                    {myInstruments.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.id} ({inst.fdrNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">FDR / Receipt Number</label>
                  <input
                    type="text"
                    value={fdrNumber}
                    onChange={(e) => setFdrNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Issuing Bank</label>
                  <input
                    type="text"
                    value={issuingBank}
                    onChange={(e) => setIssuingBank(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Branch Name</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">IFSC Code (11 Chars)</label>
                  <input
                    type="text"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Principal Amount (INR)</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Maturity Date</label>
                  <input
                    type="date"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Joint Account Holder Name</label>
                  <input
                    type="text"
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Approval Cycle / Purpose</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={lienMarked}
                    onChange={(e) => setLienMarked(e.target.checked)}
                  />
                  <span>Joint Lien Marked in Favour of Member Secretary, AICTE</span>
                </label>
                <label className="inline-flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={autoRenewalFlag}
                    onChange={(e) => setAutoRenewalFlag(e.target.checked)}
                  />
                  <span>Auto-Renewal Clause Enabled</span>
                </label>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setWizardStep(2);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg cursor-pointer"
                >
                  <span>Next: Upload Document &amp; AI Extraction</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD DOCUMENTS & RUN GEMINI MULTIMODAL EXTRACTION */}
          {wizardStep === 2 && (
            <div className="space-y-5 text-xs">
              <AiAssistanceBanner notice="Gemini Multimodal Document Intelligence extracts FDR fields with per-field confidence scores and computes browser SHA-256 checksum." />

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center space-y-3">
                <Upload className="w-8 h-8 text-blue-800 dark:text-blue-400 mx-auto" />
                <div>
                  <label
                    htmlFor="fdr-file-upload"
                    className="font-bold text-blue-900 dark:text-blue-300 hover:underline cursor-pointer"
                  >
                    Click to select FDR PDF / Image Scan
                  </label>
                  <input
                    id="fdr-file-upload"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-slate-500 mt-1">
                    Active File: <strong className="font-mono">{uploadedFileName}</strong>
                  </p>
                  <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                    Browser SHA-256: {fileSha256}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="font-bold text-indigo-950 dark:text-indigo-200">
                  Run Gemini Document Intelligence (Choose Demo Scan Preset or Extract Uploaded File):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    disabled={isExtractingAi}
                    onClick={() => handleRunAiOcr('clean_sbi')}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-600 text-left cursor-pointer"
                  >
                    <div className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>1. Clean SBI FDR Scan (High Confidence)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Extracts Rs 35,00,000 SBI FDR with 97%+ confidence across all 10 fields.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isExtractingAi}
                    onClick={() => handleRunAiOcr('low_confidence_mismatch')}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:border-amber-600 text-left cursor-pointer"
                  >
                    <div className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>2. Smudged Scan (Low-Confidence Fields)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Demonstrates amber highlighting on low-confidence (&lt;80%) amount &amp; lien clause.
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isExtractingAi}
                    onClick={() => handleRunAiOcr('coop_manual')}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 hover:border-blue-600 text-left cursor-pointer"
                  >
                    <div className="font-bold text-blue-800 dark:text-blue-400 flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>3. Saraswat Co-op Bank Scan</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Extracts Co-operative Bank FDR for Manual-Only verification scenario.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-blue-900 text-white font-semibold cursor-pointer"
                >
                  <span>Skip OCR / Proceed to Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW AI-EXTRACTED VALUES VS ENTERED VALUES */}
          {wizardStep === 3 && (
            <div className="space-y-4 text-xs">
              <AiAssistanceBanner
                notice={
                  aiNotice ||
                  'Compare AI-extracted document fields with your entered values. Low-confidence fields (<80%) are highlighted in amber for mandatory human verification.'
                }
              />

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500">
                      <th className="py-2 pr-3">Field Name</th>
                      <th className="py-2 px-3">AI-Extracted Value</th>
                      <th className="py-2 px-3">AI Confidence</th>
                      <th className="py-2 pl-3">Your Confirmed Value (Editable)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      {
                        label: 'FDR Number',
                        aiVal: extractedData?.fdrNumber || fdrNumber,
                        conf: extractedData?.confidences?.fdrNumber ?? 97,
                        val: fdrNumber,
                        setter: setFdrNumber,
                      },
                      {
                        label: 'Issuing Bank',
                        aiVal: extractedData?.issuingBank || issuingBank,
                        conf: extractedData?.confidences?.issuingBank ?? 99,
                        val: issuingBank,
                        setter: setIssuingBank,
                      },
                      {
                        label: 'Principal Amount (INR)',
                        aiVal: String(extractedData?.depositAmount ?? depositAmount),
                        conf: extractedData?.confidences?.depositAmount ?? 98,
                        val: String(depositAmount),
                        setter: (v: string) => setDepositAmount(Number(v) || 0),
                      },
                      {
                        label: 'Account Holder Name',
                        aiVal: extractedData?.accountHolderName || accountHolderName,
                        conf: extractedData?.confidences?.accountHolderName ?? 95,
                        val: accountHolderName,
                        setter: setAccountHolderName,
                      },
                    ].map((row) => {
                      const isLowConf = row.conf < 80;
                      return (
                        <tr
                          key={row.label}
                          className={isLowConf ? 'bg-amber-50/80 dark:bg-amber-950/30' : ''}
                        >
                          <td className="py-2.5 pr-3 font-semibold">{row.label}</td>
                          <td className="py-2.5 px-3 font-mono">{row.aiVal}</td>
                          <td className="py-2.5 px-3 font-mono">
                            <span
                              className={`font-bold ${
                                isLowConf ? 'text-amber-700' : 'text-emerald-700'
                              }`}
                            >
                              {row.conf}% {isLowConf ? '(Review Required)' : ''}
                            </span>
                          </td>
                          <td className="py-2.5 pl-3">
                            <input
                              type="text"
                              value={row.val}
                              onChange={(e) => row.setter(e.target.value)}
                              className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 rounded bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(4)}
                  className="px-5 py-2 rounded bg-blue-900 text-white font-semibold cursor-pointer"
                >
                  Confirm Reviewed Values &amp; Proceed to e-Sign
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: STATUTORY DECLARATION & E-SIGN SIMULATION */}
          {wizardStep === 4 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Statutory Undertaking by Institution Nodal Officer
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  I, <strong>{myInstitution.nodalOfficerName}</strong>, on behalf of{' '}
                  <strong>{myInstitution.name} ({myInstitution.aicteId})</strong>, solemnly affirm that Fixed Deposit Receipt No.{' '}
                  <strong className="font-mono">{fdrNumber}</strong> for{' '}
                  <strong className="font-mono">{formatINR(depositAmount)}</strong> issued by{' '}
                  <strong>{issuingBank}</strong> is genuine, unencumbered by any third-party loan, and carries an explicit joint lien in favour of Member Secretary, AICTE.
                </p>
                <label className="inline-flex items-center gap-2 font-bold text-slate-900 dark:text-white pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarationChecked}
                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                  />
                  <span>I accept the statutory declaration under AICTE Approval Process Handbook norms</span>
                </label>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="font-bold text-slate-900 dark:text-white">
                  CDAC / NSDL Aadhaar e-Sign Simulation (PKCS#7 Digital Signature)
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={esignAadhaarOtp}
                    onChange={(e) => setEsignAadhaarOtp(e.target.value)}
                    placeholder="Enter e-Sign OTP (123456)"
                    className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setEsignCompleted(true)}
                    className="px-4 py-1.5 rounded bg-emerald-700 text-white font-semibold cursor-pointer"
                  >
                    {esignCompleted ? 'Digitally Signed (DSC/Aadhaar Verified)' : 'Verify OTP & Apply e-Sign'}
                  </button>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2 rounded bg-slate-100 dark:bg-slate-800 font-semibold cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 rounded bg-blue-900 hover:bg-blue-800 text-white font-bold cursor-pointer"
                >
                  Submit FDR to AICTE Regulation Bureau
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: PRINTABLE ACKNOWLEDGEMENT RECEIPT WITH QR CODE */}
          {wizardStep === 5 && submittedRecord && (
            <div className="space-y-4">
              <div className="p-6 rounded-xl border-2 border-slate-800 dark:border-slate-600 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-400">
                      ALL INDIA COUNCIL FOR TECHNICAL EDUCATION · REGULATION BUREAU
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      Statutory Security Deposit Submission Acknowledgement Receipt
                    </h3>
                    <div className="text-xs font-mono text-slate-500 mt-1">
                      Acknowledgement Ref: <strong>{submittedRecord.acknowledgementRef}</strong> · Instrument ID: <strong>{submittedRecord.id}</strong>
                    </div>
                  </div>
                  <DeterministicQrCode
                    value={`${submittedRecord.acknowledgementRef}|${submittedRecord.id}|${submittedRecord.fdrNumber}`}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Institution:</span>
                    <div className="font-semibold">{myInstitution.name}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">FDR Number:</span>
                    <div className="font-mono font-bold">{submittedRecord.fdrNumber}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Principal Amount:</span>
                    <div className="font-mono font-bold">{formatINR(submittedRecord.depositAmount)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Issuing Bank &amp; IFSC:</span>
                    <div>{submittedRecord.issuingBank} ({submittedRecord.ifsc})</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Current Provenance Badge:</span>
                    <div className="mt-0.5">
                      <VerificationProvenanceBadge level={submittedRecord.verificationLevel} compact />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Document SHA-256 Hash:</span>
                    <div className="font-mono text-[10px] truncate">{fileSha256}</div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 no-print">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-md cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubTab('my_instruments')}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-md cursor-pointer"
                  >
                    Return to My Instruments
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. RESPOND TO SCRUTINY OBSERVATIONS */}
      {subTab === 'observations' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Scrutiny Observations &amp; Queries Raised by AICTE Officers
          </h3>
          {myObservations.length === 0 ? (
            <p className="text-xs text-slate-500">No scrutiny observations for your institution.</p>
          ) : (
            myObservations.map((obs) => (
              <div
                key={obs.id}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {obs.id} · Instrument: {obs.instrumentId} · Severity: {obs.severity}
                  </span>
                  <span className="font-mono font-semibold text-amber-700">
                    Status: {obs.status}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300">{obs.text}</p>
                {obs.status === 'Open' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <textarea
                      rows={2}
                      value={replyTexts[obs.id] || ''}
                      onChange={(e) =>
                        setReplyTexts((prev) => ({ ...prev, [obs.id]: e.target.value }))
                      }
                      placeholder="Enter institution clarification response..."
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <input
                        type="text"
                        value={replyFiles[obs.id] || 'Rectified_Bank_Lien_Confirmation_v2.pdf'}
                        onChange={(e) =>
                          setReplyFiles((prev) => ({ ...prev, [obs.id]: e.target.value }))
                        }
                        className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 font-mono text-xs w-72"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          respondToObservation(
                            obs.id,
                            replyTexts[obs.id] || 'Uploaded rectified bank lien endorsement certificate.',
                            replyFiles[obs.id] || 'Rectified_Bank_Lien_Confirmation_v2.pdf'
                          )
                        }
                        className="px-4 py-1.5 rounded bg-blue-900 text-white font-semibold cursor-pointer"
                      >
                        Submit Response &amp; Document
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. RELEASE / REFUND REQUEST WIZARD */}
      {subTab === 'release_wizard' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Apply for Statutory Security Deposit Release / Lien Discharge
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold mb-1">Select Instrument</label>
              <select
                value={releaseTargetId}
                onChange={(e) => setReleaseTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
              >
                {myInstruments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.id} — {inst.fdrNumber} ({formatINR(inst.depositAmount)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Statutory Release Reason</label>
              <select
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value as ReleaseReason)}
                className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="Approval period complete">Approval period complete (8-Year Lock-In Matured)</option>
                <option value="Course closure">Approved Course Closure</option>
                <option value="Replacement">Replaced by New FDR Instrument</option>
                <option value="Institution closure">Progressive Institution Closure</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Supporting Remarks &amp; University NOC Details</label>
            <textarea
              rows={3}
              value={releaseRemarks}
              onChange={(e) => setReleaseRemarks(e.target.value)}
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <button
            type="button"
            onClick={() => createReleaseRequest(releaseTargetId, releaseReason, releaseRemarks)}
            className="px-5 py-2 rounded bg-blue-900 text-white font-semibold cursor-pointer"
          >
            Run Auto-Eligibility Check &amp; Submit Release Request
          </button>
        </div>
      )}

      {/* 5. NOTIFICATIONS INBOX */}
      {subTab === 'inbox' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Institution Bilingual Compliance Notifications Inbox
          </h3>
          {myNotifications.map((n) => (
            <div
              key={n.id}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5"
            >
              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                <span>{n.title}</span>
                <span className="font-mono text-[11px]">{n.channel} · {n.triggerRule}</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300">{n.messageEn}</p>
              <p className="text-slate-500 dark:text-slate-400">{n.messageHi}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
