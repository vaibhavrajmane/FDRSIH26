import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Institution,
  Instrument,
  InstrumentStatus,
  VerificationRecord,
  PortalDocument,
  ScrutinyObservation,
  ReleaseRequest,
  NotificationAlert,
  AuditEvent,
  PortalUser,
  ReminderRuleConfig,
  EscalationRuleConfig,
  DepositNormConfig,
  UserRole,
  ExtractedDocumentData,
  ReleaseReason,
} from '../types';
import { generateSeedData } from '../data/seedData';
import {
  validateStatusTransition,
  computeAuditEventHash,
  evaluateDiscrepancies,
  calculateRiskScore,
  canRolePerform,
  PermissionAction,
  addDaysToIso,
  daysBetween,
  formatINR,
  formatDateDDMMMYYYY,
} from '../utils/rules';
import {
  bankVerificationService,
  buildVerificationRecordFromResponse,
  BankVerificationResponse,
} from '../services/bankVerificationService';
import { Language } from '../utils/i18n';

const STORAGE_KEY = 'fdr_setu_portal_state_v1';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

interface PortalState {
  systemDate: string;
  institutions: Institution[];
  instruments: Instrument[];
  verifications: VerificationRecord[];
  documents: PortalDocument[];
  observations: ScrutinyObservation[];
  releaseRequests: ReleaseRequest[];
  notifications: NotificationAlert[];
  auditEvents: AuditEvent[];
  users: PortalUser[];
  reminderRules: ReminderRuleConfig[];
  escalationMatrix: EscalationRuleConfig[];
  depositNorms: DepositNormConfig[];
}

interface PortalContextValue extends PortalState {
  currentUser: PortalUser | null;
  isAuthenticated: boolean;
  language: Language;
  darkMode: boolean;
  activeTab: string;
  selectedInstrumentId: string | null;
  statusFilter: string;
  searchQuery: string;
  revealedFields: Record<string, boolean>;
  toasts: ToastMessage[];
  activeTourStep: number | null;
  isAskPortalOpen: boolean;

  // Navigation & UI
  setLanguage: (lang: Language) => void;
  setDarkMode: (dark: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSelectedInstrumentId: (id: string | null) => void;
  setStatusFilter: (status: string) => void;
  setSearchQuery: (q: string) => void;
  setActiveTourStep: (step: number | null) => void;
  setIsAskPortalOpen: (open: boolean) => void;
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
  dismissToast: (id: string) => void;

  // Auth & Role
  loginWithRole: (role: UserRole, otpCode: string) => { ok: boolean; error?: string };
  switchRoleInstant: (role: UserRole) => void;
  logout: () => void;

  // Field Masking Reveal (Logged in Audit Trail)
  revealSensitiveField: (entityId: string, fieldName: string) => void;

  // Business Actions
  logAudit: (
    action: string,
    entityType: AuditEvent['entityType'],
    entityId: string,
    beforeValue: string,
    afterValue: string,
    overrideUser?: PortalUser
  ) => void;

  submitNewInstrument: (payload: {
    instrumentType: Instrument['instrumentType'];
    fdrNumber: string;
    issuingBank: string;
    branch: string;
    ifsc: string;
    accountHolderName: string;
    depositAmount: number;
    issueDate: string;
    maturityDate: string;
    interestRate: number;
    autoRenewalFlag: boolean;
    lienMarkedInFavourOfAICTE: boolean;
    purpose: string;
    fileName: string;
    fileHash: string;
    extractedData?: ExtractedDocumentData;
    previousInstrumentId?: string;
  }) => { ok: boolean; instrument?: Instrument; error?: string };

  runBankVerificationForInstrument: (
    instrumentId: string
  ) => Promise<{ ok: boolean; response?: BankVerificationResponse; error?: string }>;

  transitionInstrumentStatus: (
    instrumentId: string,
    nextStatus: InstrumentStatus,
    reason: string
  ) => { ok: boolean; error?: string };

  updatePermittedInstrumentFields: (
    instrumentId: string,
    updates: Partial<Pick<Instrument, 'fdrNumber' | 'depositAmount' | 'maturityDate' | 'lienMarkedInFavourOfAICTE' | 'investigationFlag'>>,
    reason: string
  ) => { ok: boolean; error?: string };

  raiseObservation: (
    instrumentId: string,
    text: string,
    severity: ScrutinyObservation['severity']
  ) => { ok: boolean; error?: string };

  respondToObservation: (
    observationId: string,
    responseText: string,
    newDocFileName?: string
  ) => { ok: boolean; error?: string };

  closeObservation: (observationId: string) => { ok: boolean; error?: string };

  createReleaseRequest: (
    instrumentId: string,
    reason: ReleaseReason,
    remarks: string
  ) => { ok: boolean; request?: ReleaseRequest; error?: string };

  advanceReleaseStage: (
    releaseId: string,
    decision: 'Approved' | 'Rejected' | 'Sent Back',
    remarks: string,
    dischargeRef?: string
  ) => { ok: boolean; error?: string };

  advanceSimulatedTime: (daysToAdd: number) => void;
  sendBulkReminders: (instrumentIds: string[]) => void;

  // Admin & Audit
  simulateUnauthorizedAction: () => void;
  tamperSingleAuditRecord: () => void;
  resetDemoData: () => void;
  updateReminderRule: (updated: ReminderRuleConfig) => void;
}

const PortalContext = createContext<PortalContextValue | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PortalState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.instruments) && parsed.instruments.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage parse error
    }
    return generateSeedData();
  });

  // Check if ?autostart=1 is in URL for instant access
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return true;
      return localStorage.getItem('fdr_setu_authed') === 'true';
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<PortalUser | null>(() => {
    const savedRole =
      typeof window !== 'undefined' ? localStorage.getItem('fdr_setu_role') : null;
    const users = generateSeedData().users;
    return users.find((u) => u.role === (savedRole || 'SCRUTINY_OFFICER')) || users[1];
  });

  const [language, setLanguage] = useState<Language>('en');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fdr_setu_dark_mode') === 'true';
    }
    return false;
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string | null>('FDR-2026-0001');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTourStep, setActiveTourStep] = useState<number | null>(null);
  const [isAskPortalOpen, setIsAskPortalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota error
    }
  }, [state]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem('fdr_setu_dark_mode', String(darkMode));
    } catch {
      // ignore storage error
    }
  }, [darkMode]);

  const addToast = (type: ToastMessage['type'], title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const appendAudit = (
    prevAuditEvents: AuditEvent[],
    action: string,
    entityType: AuditEvent['entityType'],
    entityId: string,
    beforeValue: string,
    afterValue: string,
    overrideUser?: PortalUser
  ): AuditEvent[] => {
    const actor = overrideUser || currentUser || state.users[1];
    const lastEvent = prevAuditEvents[prevAuditEvents.length - 1];
    const previousHash = lastEvent
      ? lastEvent.eventHash
      : '0000000000000000000000000000000000000000000000000000000000000000';
    const base = {
      id: `AUD-2026-${String(prevAuditEvents.length + 1).padStart(4, '0')}`,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      beforeValue,
      afterValue,
      ipAddress: actor.role === 'INSTITUTION_USER' ? '117.239.44.18' : '10.24.112.9',
      previousHash,
    };
    const eventHash = computeAuditEventHash(previousHash, base);
    return [...prevAuditEvents, { ...base, eventHash }];
  };

  const logAudit = (
    action: string,
    entityType: AuditEvent['entityType'],
    entityId: string,
    beforeValue: string,
    afterValue: string,
    overrideUser?: PortalUser
  ) => {
    setState((prev) => ({
      ...prev,
      auditEvents: appendAudit(
        prev.auditEvents,
        action,
        entityType,
        entityId,
        beforeValue,
        afterValue,
        overrideUser
      ),
    }));
  };

  const loginWithRole = (role: UserRole, otpCode: string) => {
    if (otpCode.trim() !== '123456') {
      return { ok: false, error: 'Invalid 2FA OTP code. Use demo code 123456.' };
    }
    const user = state.users.find((u) => u.role === role) || state.users[1];
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('fdr_setu_authed', 'true');
    localStorage.setItem('fdr_setu_role', role);

    if (role === 'INSTITUTION_USER') {
      setActiveTab('institution');
    } else if (role === 'ACCOUNTS_OFFICER') {
      setActiveTab('releases');
    } else if (role === 'SYSTEM_ADMIN') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }

    logAudit(
      'USER_2FA_LOGIN_SUCCESS',
      'Auth',
      user.id,
      'Unauthenticated',
      `Authenticated via Parichay 2FA as ${user.role}`,
      user
    );
    addToast('success', 'Authenticated via 2FA', `Logged in as ${user.name} (${user.designation})`);
    return { ok: true };
  };

  const switchRoleInstant = (role: UserRole) => {
    const user = state.users.find((u) => u.role === role) || state.users[1];
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('fdr_setu_authed', 'true');
    localStorage.setItem('fdr_setu_role', role);
    if (role === 'INSTITUTION_USER' && activeTab === 'dashboard') {
      setActiveTab('institution');
    }
    logAudit(
      'DEMO_ROLE_SWITCH',
      'Auth',
      user.id,
      currentUser?.role || 'NONE',
      role,
      user
    );
    addToast('info', 'Role Switched', `Active persona: ${user.name} (${role})`);
  };

  const logout = () => {
    if (currentUser) {
      logAudit('USER_LOGOUT', 'Auth', currentUser.id, currentUser.role, 'Signed Out');
    }
    setIsAuthenticated(false);
    localStorage.removeItem('fdr_setu_authed');
  };

  const revealSensitiveField = (entityId: string, fieldName: string) => {
    const key = `${entityId}:${fieldName}`;
    if (revealedFields[key]) return;
    setRevealedFields((prev) => ({ ...prev, [key]: true }));
    logAudit(
      'REVEAL_MASKED_SENSITIVE_FIELD',
      'Security',
      entityId,
      `Masked (${fieldName})`,
      `Unmasked for inspection by ${currentUser?.name}`
    );
    addToast('info', 'Sensitive Field Unmasked', `Access to ${fieldName} on ${entityId} logged in audit trail.`);
  };

  const checkPermissionOrDeny = (
    action: PermissionAction,
    entityId: string
  ): boolean => {
    const role = currentUser?.role || 'INSTITUTION_USER';
    if (!canRolePerform(role, action)) {
      logAudit(
        'RBAC_UNAUTHORIZED_ACTION_DENIED',
        'Security',
        entityId,
        `Attempted: ${action} by ${role}`,
        'DENIED (403 Forbidden — Insufficient Role Privileges)'
      );
      addToast(
        'error',
        'RBAC Permission Denied (403)',
        `Role "${role}" is not authorized to perform "${action}". Security incident logged in Audit Chain.`
      );
      return false;
    }
    return true;
  };

  const submitNewInstrument: PortalContextValue['submitNewInstrument'] = (payload) => {
    if (!checkPermissionOrDeny('SUBMIT_FDR', payload.previousInstrumentId || 'NEW-FDR')) {
      return { ok: false, error: 'Permission denied for current role.' };
    }

    const instId = currentUser?.institutionId || 'INST-001';
    const inst = state.institutions.find((i) => i.id === instId) || state.institutions[0];
    const reqAmt =
      inst.type === 'Engineering' ? 3500000 : inst.type === 'Others' ? 1000000 : 1500000;

    const newId = `FDR-2026-${String(state.instruments.length + 10).padStart(4, '0')}`;
    const ackRef = `ACK-AICTE-2026-${String(state.instruments.length + 10).padStart(4, '0')}`;

    let gapDays = 0;
    if (payload.previousInstrumentId) {
      const oldInst = state.instruments.find((x) => x.id === payload.previousInstrumentId);
      if (oldInst) {
        const diff = daysBetween(oldInst.maturityDate, payload.issueDate);
        gapDays = diff > 0 ? diff : 0;
      }
    }

    const baseInstrument: Instrument = {
      id: newId,
      institutionId: inst.id,
      instrumentType: payload.instrumentType,
      fdrNumber: payload.fdrNumber.trim().toUpperCase(),
      issuingBank: payload.issuingBank,
      branch: payload.branch,
      ifsc: payload.ifsc.trim().toUpperCase(),
      accountHolderName: payload.accountHolderName,
      depositAmount: payload.depositAmount,
      issueDate: payload.issueDate,
      maturityDate: payload.maturityDate,
      validityEndDate: payload.maturityDate,
      interestRate: payload.interestRate,
      autoRenewalFlag: payload.autoRenewalFlag,
      lienMarkedInFavourOfAICTE: payload.lienMarkedInFavourOfAICTE,
      requiredAmount: reqAmt,
      purpose: payload.purpose,
      status: payload.previousInstrumentId ? 'Renewed' : 'Submitted',
      verificationLevel: 'Institution-Submitted',
      previousInstrumentId: payload.previousInstrumentId,
      coverageGapDays: gapDays,
      acknowledgementRef: ackRef,
      assignedOfficerId: 'USR-SCR-01',
      riskScore: 20,
      riskFactors: [],
      discrepancies: [],
      createdAt: state.systemDate,
      updatedAt: state.systemDate,
    };

    const discrepancies = evaluateDiscrepancies(
      baseInstrument,
      inst,
      state.instruments,
      payload.extractedData,
      true
    );
    const risk = calculateRiskScore(baseInstrument, state.systemDate, 0);
    baseInstrument.discrepancies = discrepancies;
    baseInstrument.riskScore = risk.score;
    baseInstrument.riskFactors = risk.factors;

    const newDoc: PortalDocument = {
      id: `DOC-${newId}-1`,
      instrumentId: newId,
      type: payload.previousInstrumentId ? 'Renewal Receipt' : 'FDR Copy',
      fileName: payload.fileName || `${newId}_FDR_Receipt.pdf`,
      fileSizeKb: 380,
      version: 1,
      uploadedBy: inst.nodalOfficerName,
      uploadedAt: state.systemDate,
      hash: payload.fileHash,
      extractedData: payload.extractedData,
      aiFlags: discrepancies.map((d) => d.title),
    };

    setState((prev) => {
      const updatedOldInstruments = prev.instruments.map((item) =>
        item.id === payload.previousInstrumentId
          ? {
              ...item,
              status: 'Replaced' as InstrumentStatus,
              replacedByInstrumentId: newId,
              updatedAt: prev.systemDate,
            }
          : item
      );
      const audits1 = appendAudit(
        prev.auditEvents,
        payload.previousInstrumentId ? 'SUBMIT_RENEWAL_INSTRUMENT' : 'SUBMIT_NEW_INSTRUMENT',
        'Instrument',
        newId,
        'Draft',
        `${baseInstrument.status} (${formatINR(baseInstrument.depositAmount)} · ${baseInstrument.fdrNumber})`
      );
      const audits2 = payload.extractedData
        ? appendAudit(
            audits1,
            'AI_DOCUMENT_EXTRACTION_CONFIRMED',
            'AI-Assist',
            newId,
            'Prompt: MULTIMODAL_FDR_SCHEMA',
            'AI-assisted - requires officer confirmation (User reviewed & submitted)'
          )
        : audits1;

      return {
        ...prev,
        instruments: [baseInstrument, ...updatedOldInstruments],
        documents: [newDoc, ...prev.documents],
        auditEvents: audits2,
      };
    });

    setSelectedInstrumentId(newId);
    addToast(
      'success',
      'FDR Submitted Successfully',
      `Acknowledgement Ref: ${ackRef} generated for ${baseInstrument.fdrNumber}.`
    );
    return { ok: true, instrument: baseInstrument };
  };

  const runBankVerificationForInstrument = async (instrumentId: string) => {
    if (!checkPermissionOrDeny('RUN_BANK_VERIFICATION', instrumentId)) {
      return { ok: false, error: 'Unauthorized role.' };
    }
    const target = state.instruments.find((i) => i.id === instrumentId);
    if (!target) return { ok: false, error: 'Instrument not found.' };

    const resp = await bankVerificationService.verifyInstrument(target);
    const officerName = currentUser?.name || 'Scrutiny Officer';
    const verRecord = buildVerificationRecordFromResponse(target, resp, officerName);

    setState((prev) => {
      const updatedInstruments = prev.instruments.map((item) => {
        if (item.id !== instrumentId) return item;
        const nextVerLevel: Instrument['verificationLevel'] =
          resp.status === 'Match'
            ? 'Bank-Confirmed'
            : resp.status === 'Mismatch'
            ? 'Discrepancy-Flagged'
            : resp.status === 'Not-supported'
            ? 'Manual-Verified'
            : item.verificationLevel;

        const nextStatus: InstrumentStatus =
          resp.status === 'Match' && ['Submitted', 'Under Scrutiny', 'Resubmitted'].includes(item.status)
            ? 'Verified (Bank-Confirmed)'
            : resp.status === 'Not-supported' && ['Submitted', 'Under Scrutiny'].includes(item.status)
            ? 'Verified (Manual Only)'
            : item.status;

        const updatedItem: Instrument = {
          ...item,
          verificationLevel: nextVerLevel,
          status: nextStatus,
          updatedAt: prev.systemDate,
        };
        const openObs = prev.observations.filter(
          (o) => o.instrumentId === item.id && o.status === 'Open'
        ).length;
        const risk = calculateRiskScore(updatedItem, prev.systemDate, openObs);
        updatedItem.riskScore = risk.score;
        updatedItem.riskFactors = risk.factors;
        return updatedItem;
      });

      const audits = appendAudit(
        prev.auditEvents,
        'RUN_BANK_CBS_VERIFICATION',
        'Verification',
        instrumentId,
        target.verificationLevel,
        `Adapter Result: ${resp.status} (Ref: ${resp.referenceId})`
      );

      return {
        ...prev,
        instruments: updatedInstruments,
        verifications: [
          verRecord,
          ...prev.verifications.filter((v) => v.instrumentId !== instrumentId),
        ],
        auditEvents: audits,
      };
    });

    addToast(
      resp.status === 'Match' ? 'success' : resp.status === 'Mismatch' ? 'error' : 'warning',
      `Bank Adapter: ${resp.status}`,
      resp.certificateMessage
    );

    return { ok: true, response: resp };
  };

  const transitionInstrumentStatus = (
    instrumentId: string,
    nextStatus: InstrumentStatus,
    reason: string
  ) => {
    if (!checkPermissionOrDeny('MARK_VERIFIED', instrumentId)) {
      return { ok: false, error: 'Unauthorized role.' };
    }
    const target = state.instruments.find((i) => i.id === instrumentId);
    if (!target) return { ok: false, error: 'Instrument not found.' };

    const check = validateStatusTransition(target.status, nextStatus);
    if (!check.valid) {
      addToast('error', 'State Machine Transition Blocked', check.reason || 'Illegal status transition.');
      return { ok: false, error: check.reason };
    }

    setState((prev) => ({
      ...prev,
      instruments: prev.instruments.map((i) =>
        i.id === instrumentId
          ? {
              ...i,
              status: nextStatus,
              verificationLevel:
                nextStatus === 'Verified (Bank-Confirmed)'
                  ? 'Bank-Confirmed'
                  : nextStatus === 'Verified (Manual Only)'
                  ? 'Manual-Verified'
                  : i.verificationLevel,
              updatedAt: prev.systemDate,
            }
          : i
      ),
      auditEvents: appendAudit(
        prev.auditEvents,
        'STATUS_TRANSITION',
        'Instrument',
        instrumentId,
        target.status,
        `${nextStatus} (Reason: ${reason})`
      ),
    }));

    addToast('success', 'Status Updated', `${instrumentId} moved from "${target.status}" to "${nextStatus}".`);
    return { ok: true };
  };

  const updatePermittedInstrumentFields: PortalContextValue['updatePermittedInstrumentFields'] = (
    instrumentId,
    updates,
    reason
  ) => {
    if (!checkPermissionOrDeny('MARK_VERIFIED', instrumentId)) {
      return { ok: false, error: 'Unauthorized role.' };
    }
    if (!reason || reason.trim().length < 5) {
      addToast('error', 'Mandatory Reason Required', 'Please provide an audit reason (min 5 chars) to modify instrument fields.');
      return { ok: false, error: 'Mandatory reason required.' };
    }

    const target = state.instruments.find((i) => i.id === instrumentId);
    if (!target) return { ok: false, error: 'Not found' };

    setState((prev) => {
      const inst = prev.institutions.find((x) => x.id === target.institutionId) || prev.institutions[0];
      const nextInstruments = prev.instruments.map((item) => {
        if (item.id !== instrumentId) return item;
        const merged: Instrument = { ...item, ...updates, updatedAt: prev.systemDate };
        merged.discrepancies = evaluateDiscrepancies(merged, inst, prev.instruments);
        const openObs = prev.observations.filter(
          (o) => o.instrumentId === item.id && o.status === 'Open'
        ).length;
        const risk = calculateRiskScore(merged, prev.systemDate, openObs);
        merged.riskScore = risk.score;
        merged.riskFactors = risk.factors;
        return merged;
      });

      return {
        ...prev,
        instruments: nextInstruments,
        auditEvents: appendAudit(
          prev.auditEvents,
          'UPDATE_INSTRUMENT_FIELDS',
          'Instrument',
          instrumentId,
          JSON.stringify({
            amount: target.depositAmount,
            maturity: target.maturityDate,
            lien: target.lienMarkedInFavourOfAICTE,
            inv: target.investigationFlag,
          }),
          `${JSON.stringify(updates)} | Reason: ${reason}`
        ),
      };
    });

    addToast('success', 'Instrument Updated', `Changes to ${instrumentId} recorded in immutable audit trail.`);
    return { ok: true };
  };

  const raiseObservation = (
    instrumentId: string,
    text: string,
    severity: ScrutinyObservation['severity']
  ) => {
    if (!checkPermissionOrDeny('RAISE_OBSERVATION', instrumentId)) {
      return { ok: false, error: 'Unauthorized role.' };
    }
    const newObs: ScrutinyObservation = {
      id: `OBS-2026-${String(state.observations.length + 1).padStart(2, '0')}`,
      instrumentId,
      officerId: currentUser?.id || 'USR-SCR-01',
      officerName: currentUser?.name || 'Scrutiny Officer',
      text,
      severity,
      status: 'Open',
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      observations: [newObs, ...prev.observations],
      instruments: prev.instruments.map((i) =>
        i.id === instrumentId
          ? {
              ...i,
              status: ['Submitted', 'Under Scrutiny', 'Resubmitted'].includes(i.status)
                ? ('Query Raised' as InstrumentStatus)
                : i.status,
              updatedAt: prev.systemDate,
            }
          : i
      ),
      auditEvents: appendAudit(
        prev.auditEvents,
        'RAISE_SCRUTINY_OBSERVATION',
        'Observation',
        instrumentId,
        'Open Observations',
        `${newObs.id} [${severity}]: ${text.slice(0, 70)}...`
      ),
    }));

    addToast('warning', 'Scrutiny Observation Raised', `Query logged on ${instrumentId} and sent to Institution Nodal Officer.`);
    return { ok: true };
  };

  const respondToObservation = (
    observationId: string,
    responseText: string,
    newDocFileName?: string
  ) => {
    const obs = state.observations.find((o) => o.id === observationId);
    if (!obs) return { ok: false, error: 'Observation not found.' };

    setState((prev) => {
      const nextDocs = [...prev.documents];
      if (newDocFileName) {
        const existingVersions = prev.documents.filter(
          (d) => d.instrumentId === obs.instrumentId
        ).length;
        nextDocs.unshift({
          id: `DOC-${obs.instrumentId}-V${existingVersions + 1}`,
          instrumentId: obs.instrumentId,
          type: 'Bank Confirmation',
          fileName: newDocFileName,
          fileSizeKb: 310,
          version: existingVersions + 1,
          uploadedBy: currentUser?.name || 'Nodal Officer',
          uploadedAt: prev.systemDate,
          hash: `b7c91e44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b${existingVersions + 1}`,
          aiFlags: [],
        });
      }

      return {
        ...prev,
        documents: nextDocs,
        observations: prev.observations.map((o) =>
          o.id === observationId
            ? {
                ...o,
                status: 'Responded',
                responseText,
                respondedAt: new Date().toISOString(),
              }
            : o
        ),
        instruments: prev.instruments.map((i) =>
          i.id === obs.instrumentId && i.status === 'Query Raised'
            ? { ...i, status: 'Resubmitted', updatedAt: prev.systemDate }
            : i
        ),
        auditEvents: appendAudit(
          prev.auditEvents,
          'RESPOND_SCRUTINY_OBSERVATION',
          'Observation',
          obs.instrumentId,
          `Observation ${obs.id} (Open)`,
          `Responded: ${responseText.slice(0, 60)}${newDocFileName ? ` + Uploaded ${newDocFileName}` : ''}`
        ),
      };
    });

    addToast('success', 'Response Submitted', `Clarification for ${obs.id} sent to AICTE Scrutiny Cell.`);
    return { ok: true };
  };

  const closeObservation = (observationId: string) => {
    if (!checkPermissionOrDeny('RAISE_OBSERVATION', observationId)) {
      return { ok: false, error: 'Unauthorized role.' };
    }
    const obs = state.observations.find((o) => o.id === observationId);
    if (!obs) return { ok: false, error: 'Not found' };

    setState((prev) => ({
      ...prev,
      observations: prev.observations.map((o) =>
        o.id === observationId ? { ...o, status: 'Closed' } : o
      ),
      auditEvents: appendAudit(
        prev.auditEvents,
        'CLOSE_SCRUTINY_OBSERVATION',
        'Observation',
        obs.instrumentId,
        `${obs.id} (${obs.status})`,
        'Closed by Scrutiny Officer'
      ),
    }));
    addToast('success', 'Observation Closed', `Observation ${observationId} marked resolved.`);
    return { ok: true };
  };

  const createReleaseRequest: PortalContextValue['createReleaseRequest'] = (
    instrumentId,
    reason,
    remarks
  ) => {
    const inst = state.instruments.find((i) => i.id === instrumentId);
    if (!inst) return { ok: false, error: 'Instrument not found.' };

    const openObs = state.observations.filter(
      (o) => o.instrumentId === instrumentId && o.status !== 'Closed'
    );
    const hasInvestigation = Boolean(inst.investigationFlag);
    const hasPendingCompliance = Boolean(inst.pendingComplianceFlag);
    const isBlocked = openObs.length > 0 || hasInvestigation || hasPendingCompliance;

    const checklist = [
      {
        id: 'c1',
        label: 'Mandatory statutory lock-in / approval period verified',
        passed: true,
        details: `Issued ${formatDateDDMMMYYYY(inst.issueDate)}`,
      },
      {
        id: 'c2',
        label: 'No open scrutiny observations or discrepancy flags',
        passed: openObs.length === 0 && inst.discrepancies.length === 0,
        details:
          openObs.length > 0
            ? `${openObs.length} open observation(s) pending resolution`
            : '0 open observations',
      },
      {
        id: 'c3',
        label: 'No active Vigilance / Duplicate Fraud investigation flag',
        passed: !hasInvestigation,
        details: hasInvestigation ? 'Blocked by active Vigilance investigation' : 'Clear',
      },
      {
        id: 'c4',
        label: 'No pending compliance or student/faculty dues',
        passed: !hasPendingCompliance,
        details: hasPendingCompliance ? 'Pending university NOC / compliance flag' : 'Clear',
      },
    ];

    const newReq: ReleaseRequest = {
      id: `REL-2026-${String(state.releaseRequests.length + 1).padStart(2, '0')}`,
      instrumentId,
      institutionId: inst.institutionId,
      reason,
      remarks,
      conditionsChecklist: checklist,
      documents: state.documents
        .filter((d) => d.instrumentId === instrumentId)
        .map((d) => d.id),
      stages: [
        {
          stageName: 'Eligibility Auto-Check',
          approverRole: 'SCRUTINY_OFFICER',
          approverName: 'FDR-Setu Policy Engine',
          status: isBlocked ? 'Rejected' : 'Approved',
          remarks: isBlocked
            ? 'Auto-Blocked due to unresolved observations or compliance flags.'
            : 'All statutory conditions satisfied.',
          timestamp: new Date().toISOString(),
        },
        {
          stageName: 'Scrutiny Review',
          approverRole: 'SCRUTINY_OFFICER',
          status: 'Pending',
          slaHoursRemaining: 48,
        },
        {
          stageName: 'Accounts Verification',
          approverRole: 'ACCOUNTS_OFFICER',
          status: 'Pending',
          slaHoursRemaining: 72,
        },
        {
          stageName: 'Competent Authority Approval',
          approverRole: 'APPROVING_AUTHORITY',
          status: 'Pending',
          slaHoursRemaining: 96,
        },
        {
          stageName: 'Discharge & Closure',
          approverRole: 'ACCOUNTS_OFFICER',
          status: 'Pending',
          slaHoursRemaining: 120,
        },
      ],
      finalDecision: isBlocked ? 'Blocked' : 'Pending',
      blockedReason: isBlocked
        ? 'Release automatically blocked due to open observations, discrepancies, or investigation flag.'
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      releaseRequests: [newReq, ...prev.releaseRequests],
      instruments: prev.instruments.map((i) =>
        i.id === instrumentId
          ? { ...i, status: 'Release Requested', updatedAt: prev.systemDate }
          : i
      ),
      auditEvents: appendAudit(
        prev.auditEvents,
        'CREATE_RELEASE_REQUEST',
        'Release',
        newReq.id,
        inst.status,
        `Release Requested (${reason}) — Auto-Check: ${newReq.finalDecision}`
      ),
    }));

    addToast(
      isBlocked ? 'warning' : 'success',
      isBlocked ? 'Release Request Logged (Auto-Blocked)' : 'Release Request Submitted',
      `Application ${newReq.id} created for ${instrumentId}.`
    );
    return { ok: true, request: newReq };
  };

  const advanceReleaseStage: PortalContextValue['advanceReleaseStage'] = (
    releaseId,
    decision,
    remarks,
    dischargeRef
  ) => {
    const req = state.releaseRequests.find((r) => r.id === releaseId);
    if (!req) return { ok: false, error: 'Release request not found.' };

    // Enforce automatic block if open observations exist
    const inst = state.instruments.find((i) => i.id === req.instrumentId);
    const openObs = state.observations.filter(
      (o) => o.instrumentId === req.instrumentId && o.status !== 'Closed'
    );
    if (
      decision === 'Approved' &&
      (req.finalDecision === 'Blocked' || openObs.length > 0 || inst?.investigationFlag)
    ) {
      addToast(
        'error',
        'Release Blocked by Policy Engine',
        `Cannot approve release for ${req.instrumentId} while open observations (${openObs.length}) or investigation flags exist.`
      );
      return { ok: false, error: 'Blocked by open observations or investigation flag.' };
    }

    const pendingIdx = req.stages.findIndex((s) => s.status === 'Pending');
    if (pendingIdx === -1) {
      return { ok: false, error: 'All stages already completed.' };
    }

    const currentStage = req.stages[pendingIdx];

    setState((prev) => {
      const nextReleases = prev.releaseRequests.map((r) => {
        if (r.id !== releaseId) return r;
        const updatedStages = r.stages.map((s, idx) =>
          idx === pendingIdx
            ? {
                ...s,
                status: decision,
                approverName: currentUser?.name || 'Officer',
                remarks,
                timestamp: new Date().toISOString(),
              }
            : s
        );

        const isAuthorityStage = currentStage.stageName === 'Competent Authority Approval';
        const isDischargeStage = currentStage.stageName === 'Discharge & Closure';

        const nextDecision: ReleaseRequest['finalDecision'] =
          decision === 'Rejected'
            ? 'Rejected'
            : isDischargeStage && decision === 'Approved'
            ? 'Released'
            : isAuthorityStage && decision === 'Approved'
            ? 'Approved'
            : r.finalDecision;

        return {
          ...r,
          stages: updatedStages,
          finalDecision: nextDecision,
          releaseOrderNumber:
            isAuthorityStage && decision === 'Approved'
              ? `F.No.AICTE/REG/FDR-REL/2026/${r.instrumentId}`
              : r.releaseOrderNumber,
          paymentDischargeRef: dischargeRef || r.paymentDischargeRef,
          paymentDate: dischargeRef ? prev.systemDate : r.paymentDate,
          updatedAt: new Date().toISOString(),
        };
      });

      const nextInstStatus: InstrumentStatus | undefined =
        decision === 'Rejected' || decision === 'Sent Back'
          ? 'Active'
          : currentStage.stageName === 'Discharge & Closure' && decision === 'Approved'
          ? 'Released/Refunded'
          : currentStage.stageName === 'Competent Authority Approval' && decision === 'Approved'
          ? 'Approved for Release'
          : 'Release Under Review';

      return {
        ...prev,
        releaseRequests: nextReleases,
        instruments: prev.instruments.map((i) =>
          i.id === req.instrumentId && nextInstStatus
            ? { ...i, status: nextInstStatus, updatedAt: prev.systemDate }
            : i
        ),
        auditEvents: appendAudit(
          prev.auditEvents,
          `RELEASE_STAGE_${decision.toUpperCase().replace(/\s+/g, '_')}`,
          'Release',
          releaseId,
          `${currentStage.stageName}: Pending`,
          `${currentStage.stageName}: ${decision} (${remarks})${
            dischargeRef ? ` · Discharge Ref: ${dischargeRef}` : ''
          }`
        ),
      };
    });

    addToast(
      decision === 'Approved' ? 'success' : 'warning',
      `${currentStage.stageName}: ${decision}`,
      `Updated ${releaseId} for instrument ${req.instrumentId}.`
    );
    return { ok: true };
  };

  const advanceSimulatedTime = (daysToAdd: number) => {
    const nextDate = addDaysToIso(state.systemDate, daysToAdd);

    setState((prev) => {
      const newAlerts: NotificationAlert[] = [];

      const updatedInstruments = prev.instruments.map((item) => {
        if (
          ['Released/Refunded', 'Closed', 'Replaced', 'Forfeited', 'Renewed'].includes(
            item.status
          )
        ) {
          return item;
        }
        const daysLeft = daysBetween(nextDate, item.maturityDate);
        let nextStatus = item.status;
        let gapDays = item.coverageGapDays || 0;

        if (daysLeft < 0) {
          nextStatus = 'Matured/Expired';
          gapDays = Math.abs(daysLeft);
          if (item.status !== 'Matured/Expired') {
            newAlerts.push({
              id: `ALT-SIM-${Date.now()}-${item.id}`,
              recipientRole: 'APPROVING_AUTHORITY',
              institutionId: item.institutionId,
              channel: 'Email',
              type: 'Overdue Renewal',
              title: `[Simulated Time] Instrument Matured / Lapsed (${gapDays}d Overdue) — ${item.id}`,
              messageEn: `Simulated Date ${formatDateDDMMMYYYY(nextDate)}: FDR ${item.fdrNumber} (${formatINR(item.depositAmount)}) has passed maturity (${formatDateDDMMMYYYY(item.maturityDate)}). Escalated to L4.`,
              messageHi: `सिमुलेटेड तिथि ${formatDateDDMMMYYYY(nextDate)}: FDR ${item.fdrNumber} परिपक्वता तिथि पार कर चुका है। L4 को एस्केलेट किया गया।`,
              instrumentId: item.id,
              dueDate: item.maturityDate,
              triggerRule: `+${gapDays}d Overdue -> L4 Escalation`,
              severity: 'Critical',
              status: 'Escalated',
              escalationLevel: 'L4',
              slaHoursOverdue: gapDays * 24,
              createdAt: new Date().toISOString(),
            });
          }
        } else if (daysLeft <= 90 && item.status === 'Active') {
          nextStatus = 'Expiring Soon';
          newAlerts.push({
            id: `ALT-SIM-${Date.now()}-${item.id}`,
            recipientRole: 'INSTITUTION_USER',
            institutionId: item.institutionId,
            channel: 'In-App',
            type: 'Maturity Reminder',
            title: `[Simulated Time] T-${daysLeft} Maturity Reminder — ${item.id}`,
            messageEn: `Simulated Date ${formatDateDDMMMYYYY(nextDate)}: FDR ${item.fdrNumber} matures in ${daysLeft} days on ${formatDateDDMMMYYYY(item.maturityDate)}.`,
            messageHi: `सिमुलेटेड तिथि: आपका FDR ${item.fdrNumber} ${daysLeft} दिनों में परिपक्व हो रहा है।`,
            instrumentId: item.id,
            dueDate: item.maturityDate,
            triggerRule: `T-${daysLeft <= 15 ? '15' : daysLeft <= 30 ? '30' : '90'} Rule`,
            severity: daysLeft <= 15 ? 'Critical' : 'Warning',
            status: daysLeft <= 15 ? 'Escalated' : 'Sent',
            escalationLevel: daysLeft <= 15 ? 'L3' : 'L1',
            createdAt: new Date().toISOString(),
          });
        }

        const updated: Instrument = {
          ...item,
          status: nextStatus,
          coverageGapDays: gapDays,
          updatedAt: nextDate,
        };
        const openObs = prev.observations.filter(
          (o) => o.instrumentId === item.id && o.status === 'Open'
        ).length;
        const risk = calculateRiskScore(updated, nextDate, openObs);
        updated.riskScore = risk.score;
        updated.riskFactors = risk.factors;
        return updated;
      });

      return {
        ...prev,
        systemDate: nextDate,
        instruments: updatedInstruments,
        notifications: [...newAlerts.slice(0, 12), ...prev.notifications],
        auditEvents: appendAudit(
          prev.auditEvents,
          'SIMULATE_SYSTEM_TIME_ADVANCE',
          'Config',
          'SYSTEM-CLOCK',
          prev.systemDate,
          `${nextDate} (+${daysToAdd} days · ${newAlerts.length} automated alerts/escalations fired)`
        ),
      };
    });

    addToast(
      'info',
      `System Clock Advanced (+${daysToAdd} Days)`,
      `Current Simulated Date: ${formatDateDDMMMYYYY(nextDate)}. Maturity states, escalations, and risk scores recalculated.`
    );
  };

  const sendBulkReminders = (instrumentIds: string[]) => {
    if (instrumentIds.length === 0) return;
    setState((prev) => {
      const generated: NotificationAlert[] = instrumentIds.slice(0, 10).map((id, idx) => {
        const inst = prev.instruments.find((x) => x.id === id) || prev.instruments[0];
        return {
          id: `ALT-BULK-${Date.now()}-${idx}`,
          recipientRole: 'INSTITUTION_USER',
          institutionId: inst.institutionId,
          channel: 'Email',
          type: 'Maturity Reminder',
          title: `Official Renewal / Compliance Reminder — ${inst.id} (${inst.fdrNumber})`,
          messageEn: `Bulk Notice from AICTE Scrutiny Cell: Please review compliance status for FDR ${inst.fdrNumber} (${formatINR(inst.depositAmount)}).`,
          messageHi: `AICTE स्क्रूटनी प्रकोष्ठ से सूचना: कृपया FDR ${inst.fdrNumber} की अनुपालन स्थिति की समीक्षा करें।`,
          instrumentId: inst.id,
          dueDate: inst.maturityDate,
          triggerRule: 'Officer Bulk Dispatch',
          severity: 'Warning',
          status: 'Sent',
          escalationLevel: 'L2',
          createdAt: new Date().toISOString(),
        };
      });

      return {
        ...prev,
        notifications: [...generated, ...prev.notifications],
        auditEvents: appendAudit(
          prev.auditEvents,
          'BULK_REMINDER_DISPATCH',
          'Instrument',
          `BATCH (${instrumentIds.length})`,
          'Pending Notification',
          `Dispatched bilingual reminders to ${instrumentIds.length} institutions`
        ),
      };
    });

    addToast(
      'success',
      'Bulk Reminders Dispatched',
      `Sent bilingual (English/Hindi) notifications for ${instrumentIds.length} selected instrument(s).`
    );
  };

  const simulateUnauthorizedAction = () => {
    const instUser = state.users[0]; // Institution User
    setState((prev) => ({
      ...prev,
      auditEvents: appendAudit(
        prev.auditEvents,
        'RBAC_UNAUTHORIZED_ACTION_DENIED',
        'Security',
        'FDR-2026-0001',
        `Attempted: APPROVE_RELEASE_AUTHORITY by ${instUser.name} (INSTITUTION_USER)`,
        'DENIED (403 Forbidden — Only APPROVING_AUTHORITY may sanction release orders)',
        instUser
      ),
    }));
    addToast(
      'error',
      'Scenario 10: RBAC Denial Logged',
      'Simulated unauthorized release approval attempt by Institution User — blocked with 403 and recorded in the SHA-256 Audit Chain.'
    );
  };

  const tamperSingleAuditRecord = () => {
    setState((prev) => {
      if (prev.auditEvents.length < 3) return prev;
      const targetIdx = 2; // Tamper 3rd record without updating hash chain
      const mutated = prev.auditEvents.map((ev, idx) =>
        idx === targetIdx
          ? {
              ...ev,
              afterValue: 'TAMPERED_VALUE: Released Rs 35,00,000 without Competent Authority Approval',
              tampered: true,
            }
          : ev
      );
      return {
        ...prev,
        auditEvents: mutated,
      };
    });
    addToast(
      'warning',
      'Demo Tampering Injected',
      'Modified payload of Audit Record #3 (AUD-2026-0003) in storage. Click "Verify Audit Chain Integrity" to detect the cryptographic hash mismatch!'
    );
  };

  const resetDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = generateSeedData();
    setState(fresh);
    setRevealedFields({});
    setSelectedInstrumentId('FDR-2026-0001');
    setStatusFilter('ALL');
    setSearchQuery('');
    addToast(
      'success',
      'Demo Data Reset Complete',
      'Restored all 42 institutions, 88 instruments, 10 guided scenarios, and clean SHA-256 audit hash chain.'
    );
  };

  const updateReminderRule = (updated: ReminderRuleConfig) => {
    if (!checkPermissionOrDeny('MANAGE_SYSTEM_CONFIG', updated.instrumentType)) return;
    setState((prev) => ({
      ...prev,
      reminderRules: prev.reminderRules.map((r) =>
        r.instrumentType === updated.instrumentType ? updated : r
      ),
      auditEvents: appendAudit(
        prev.auditEvents,
        'UPDATE_REMINDER_RULE_CONFIG',
        'Config',
        updated.instrumentType,
        'Previous Schedule',
        `Pre-Maturity: T-${updated.preMaturityDays.join('/T-')} | Overdue: +${updated.overdueDays.join('/+')}`
      ),
    }));
    addToast('success', 'Configuration Saved', `Updated reminder rules for ${updated.instrumentType}.`);
  };

  const value = useMemo<PortalContextValue>(
    () => ({
      ...state,
      currentUser,
      isAuthenticated,
      language,
      darkMode,
      activeTab,
      selectedInstrumentId,
      statusFilter,
      searchQuery,
      revealedFields,
      toasts,
      activeTourStep,
      isAskPortalOpen,
      setLanguage,
      setDarkMode,
      setActiveTab,
      setSelectedInstrumentId,
      setStatusFilter,
      setSearchQuery,
      setActiveTourStep,
      setIsAskPortalOpen,
      addToast,
      dismissToast,
      loginWithRole,
      switchRoleInstant,
      logout,
      revealSensitiveField,
      logAudit,
      submitNewInstrument,
      runBankVerificationForInstrument,
      transitionInstrumentStatus,
      updatePermittedInstrumentFields,
      raiseObservation,
      respondToObservation,
      closeObservation,
      createReleaseRequest,
      advanceReleaseStage,
      advanceSimulatedTime,
      sendBulkReminders,
      simulateUnauthorizedAction,
      tamperSingleAuditRecord,
      resetDemoData,
      updateReminderRule,
    }),
    [
      state,
      currentUser,
      isAuthenticated,
      language,
      darkMode,
      activeTab,
      selectedInstrumentId,
      statusFilter,
      searchQuery,
      revealedFields,
      toasts,
      activeTourStep,
      isAskPortalOpen,
    ]
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return ctx;
}
