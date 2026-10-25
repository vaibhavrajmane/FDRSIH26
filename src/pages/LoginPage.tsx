import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Landmark,
  Building2,
  UserCheck,
  FileSearch,
  Wallet,
  ShieldAlert,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  Sun,
  Moon,
  Languages,
} from 'lucide-react';
import { usePortal } from '../context/PortalContext';
import { UserRole } from '../types';

const ROLE_CARDS: {
  role: UserRole;
  title: string;
  subtitle: string;
  officerName: string;
  permissions: string;
  icon: React.ReactNode;
}[] = [
  {
    role: 'SCRUTINY_OFFICER',
    title: 'Scrutiny Officer',
    subtitle: 'AICTE Regulation Bureau — Scrutiny Cell II',
    officerName: 'Shri Arvind Kumar Sinha',
    permissions: 'Command Centre, CBS Bank Verification, Discrepancy Flags, Observations, Bulk Reminders',
    icon: <FileSearch className="w-5 h-5 text-blue-700 dark:text-blue-400" />,
  },
  {
    role: 'INSTITUTION_USER',
    title: 'Institution Nodal Officer',
    subtitle: 'Pragati Institute of Engineering & Technology (1-21004500100)',
    officerName: 'Prof. Rajeshwari Deshmukh',
    permissions: 'Submit New FDR (AI OCR Wizard), Respond to Queries, Submit Renewal, Request Release',
    icon: <Building2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />,
  },
  {
    role: 'APPROVING_AUTHORITY',
    title: 'Competent Authority / Advisor-I',
    subtitle: 'AICTE HQ — Final Sanctioning Authority',
    officerName: 'Dr. Meenakshi Sundaram, IAS',
    permissions: 'Final Verification Approval, Sanction Release / Forfeiture Orders, L4/L5 Escalations',
    icon: <UserCheck className="w-5 h-5 text-amber-700 dark:text-amber-400" />,
  },
  {
    role: 'ACCOUNTS_OFFICER',
    title: 'Accounts & Finance Officer',
    subtitle: 'AICTE Finance & Custody Division',
    officerName: 'Smt. Kavita Nair, ICAS',
    permissions: 'Financial Dues Clearance, Record Bank Lien Discharge Reference & Refund Settlement',
    icon: <Wallet className="w-5 h-5 text-purple-700 dark:text-purple-400" />,
  },
  {
    role: 'SYSTEM_ADMIN',
    title: 'System Admin / Vigilance Auditor',
    subtitle: 'NIC / AICTE Digital Vigilance Cell (Read-Only Business Data)',
    officerName: 'Shri Vikramaditya Rao',
    permissions: 'Verify Tamper-Evident SHA-256 Audit Chain, Configure Reminder & Escalation Rules',
    icon: <ShieldAlert className="w-5 h-5 text-slate-700 dark:text-slate-300" />,
  },
];

export const LoginPage: React.FC = () => {
  const { loginWithRole, darkMode, setDarkMode, language, setLanguage } = usePortal();
  const [selectedRole, setSelectedRole] = useState<UserRole>('SCRUTINY_OFFICER');
  const [step, setStep] = useState<'SELECT_ROLE' | 'OTP_VERIFY'>('SELECT_ROLE');
  const [otp, setOtp] = useState<string>('123456');
  const [error, setError] = useState<string>('');

  const activeCard = ROLE_CARDS.find((r) => r.role === selectedRole) || ROLE_CARDS[0];

  const handleProceedToOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('OTP_VERIFY');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const res = loginWithRole(selectedRole, otp);
    if (!res.ok) {
      setError(res.error || 'Invalid OTP');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Government Identity Strip */}
      <div className="bg-slate-900 text-white border-b-2 border-amber-500 px-6 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Landmark className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold tracking-wide">
              भारत सरकार · GOVERNMENT OF INDIA · MINISTRY OF EDUCATION
            </span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-300">All India Council for Technical Education (AICTE)</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <span className="hidden sm:inline">SIH Problem Statement #26265</span>
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              aria-label="Toggle Language English or Hindi"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
            >
              <Languages className="w-3 h-3" />
              <span>{language === 'en' ? 'हिंदी / HI' : 'English / EN'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle Light or Dark Theme"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold cursor-pointer"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>Switch to Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-sky-300" />
                  <span>Switch to Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Portal Introduction & Provenance Architecture */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-md">
            <ShieldCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>AICTE Regulation Bureau — Unified Deposit Custody System</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              FDR-Setu: Security Deposit &amp; FDR Lifecycle Management Portal
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Centralized digital platform for end-to-end submission, AI-assisted scrutiny, Core Banking System (CBS) verification, maturity monitoring, continuous renewal tracking, and authorized release of statutory Fixed Deposit Receipts across AICTE-approved technical institutions.
            </p>
          </div>

          {/* Core Architectural Principle Callout */}
          <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>Core Regulatory Principle: Strict Data Provenance Separation</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Every record, screen, and statutory report in FDR-Setu strictly separates unverified institutional claims from independent bank confirmation:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-md bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  1. Institution-Submitted
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">
                  Self-declared metadata and uploaded scans with Gemini OCR extraction; treated as unverified until confirmed.
                </p>
              </div>
              <div className="p-3 rounded-md bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70">
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  2. Bank-Confirmed (CBS)
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-1">
                  Independently verified principal, maturity, joint holder, and AICTE lien flag via Bank API or authenticated certificate.
                </p>
              </div>
            </div>
          </div>

          {/* Key Capabilities */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold font-mono tabular-nums text-blue-900 dark:text-blue-400">
                42 / 88
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Seeded Institutions &amp; Live Instruments
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                SHA-256
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Tamper-Evident Audit Hash Chain
              </div>
            </div>
            <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
              <div className="text-lg font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                10 Scenarios
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Guided Interactive Demo Tour
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Parichay / Demo RBAC Login Card */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                NIC Parichay / Role-Based Demo Sign In
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select an AICTE or Institution persona to evaluate role-enforced workflows
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded">
              2FA Enabled
            </span>
          </div>

          {step === 'SELECT_ROLE' ? (
            <form onSubmit={handleProceedToOtp} className="space-y-4">
              <div className="space-y-2.5" role="radiogroup" aria-label="Select Demo User Role">
                {ROLE_CARDS.map((card) => {
                  const isSelected = selectedRole === card.role;
                  return (
                    <label
                      key={card.role}
                      onClick={() => setSelectedRole(card.role)}
                      className={`flex items-start gap-3.5 p-3.5 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-700 dark:border-blue-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="demoRole"
                        value={card.role}
                        checked={isSelected}
                        onChange={() => setSelectedRole(card.role)}
                        className="mt-1 accent-blue-800"
                      />
                      <div className="mt-0.5 shrink-0">{card.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {card.title}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            {card.officerName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                          {card.subtitle}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <strong className="font-medium text-slate-700 dark:text-slate-300">Access:</strong>{' '}
                          {card.permissions}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  <span>Proceed to 2FA Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => loginWithRole(selectedRole, '123456')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>One-Click Demo Sign In</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400">Authenticating Persona</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {activeCard.officerName} — {activeCard.title}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {activeCard.subtitle}
                </div>
              </div>

              <div>
                <label
                  htmlFor="otp-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Enter Simulated Parichay / Sandes 6-Digit 2FA OTP (Fixed Demo Code: 123456)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="otp-input"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-base font-mono tracking-widest rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="123456"
                    required
                  />
                </div>
                {error && <p className="text-xs text-red-600 mt-1.5 font-medium">{error}</p>}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep('SELECT_ROLE')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Back to Role Picker
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  <span>Verify OTP &amp; Launch Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
