import React, { useState } from 'react';
import {
  Landmark,
  LayoutDashboard,
  FileSearch,
  Building2,
  RefreshCw,
  Unlock,
  Bell,
  Server,
  BarChart3,
  ShieldAlert,
  Layers,
  Sparkles,
  Compass,
  Sun,
  Moon,
  Languages,
  LogOut,
  RotateCcw,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { PortalProvider, usePortal } from './context/PortalContext';
import { TRANSLATIONS } from './utils/i18n';
import { formatDateDDMMMYYYY } from './utils/rules';
import { UserRole } from './types';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ScrutinyWorkspacePage } from './pages/ScrutinyWorkspacePage';
import { InstitutionPortalPage } from './pages/InstitutionPortalPage';
import { RenewalsPage, ReleaseWorkflowPage } from './pages/RenewalsAndReleasePage';
import { MonitoringAlertsPage, BankSimulatorPage } from './pages/MonitoringAndBankSimPage';
import { ReportsCentrePage, AdminAuditPage } from './pages/ReportsAndAdminPage';
import { ArchitecturePage } from './pages/ArchitecturePage';
import { AskPortalModal, DemoTourModal } from './components/GlobalModals';

const MainShell: React.FC = () => {
  const {
    isAuthenticated,
    currentUser,
    language,
    setLanguage,
    darkMode,
    setDarkMode,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    systemDate,
    notifications,
    toasts,
    dismissToast,
    switchRoleInstant,
    logout,
    resetDemoData,
    setActiveTourStep,
    setIsAskPortalOpen,
  } = usePortal();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const t = TRANSLATIONS[language];

  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'scrutiny', label: t.navScrutiny, icon: <FileSearch className="w-4 h-4" /> },
    { id: 'institution', label: t.navInstitution, icon: <Building2 className="w-4 h-4" /> },
    { id: 'renewals', label: t.navRenewals, icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'releases', label: t.navReleases, icon: <Unlock className="w-4 h-4" /> },
    { id: 'alerts', label: t.navAlerts, icon: <Bell className="w-4 h-4" /> },
    { id: 'banksim', label: t.navBankSim, icon: <Server className="w-4 h-4" /> },
    { id: 'reports', label: t.navReports, icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'admin', label: t.navAdmin, icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'architecture', label: t.navArchitecture, icon: <Layers className="w-4 h-4" /> },
  ];

  const activeNavLabel = navItems.find((n) => n.id === activeTab)?.label || t.navDashboard;

  const handleGlobalSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('scrutiny');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Government Identity Strip */}
      <div className="bg-slate-900 text-white border-b-2 border-amber-500 px-4 sm:px-6 py-1.5 text-[11px] no-print">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Landmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold tracking-wide">{t.govTitle}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-slate-300 hidden md:inline">{t.bureauTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-amber-300">
              System Clock: {formatDateDDMMMYYYY(systemDate)}
            </span>
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

      {/* Main Workspace Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 no-print">
        {/* Left: Brand + Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Sidebar"
            className="lg:hidden p-1.5 rounded border border-slate-200 dark:border-slate-700"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-blue-950 dark:text-white whitespace-nowrap">
                {t.appTitle}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                {activeNavLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Global Search */}
        <form onSubmit={handleGlobalSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label="Global Search"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70"
            />
          </div>
        </form>

        {/* Right: Guided Demo Tour, Ask Portal AI, Role Switcher, Notifications, Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTourStep(1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t.demoTour} (10)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAskPortalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.askPortal}</span>
          </button>

          {/* Active Persona Switcher */}
          <select
            aria-label="Switch Active User Role"
            value={currentUser?.role || 'SCRUTINY_OFFICER'}
            onChange={(e) => switchRoleInstant(e.target.value as UserRole)}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value="SCRUTINY_OFFICER">Role: Scrutiny Officer</option>
            <option value="INSTITUTION_USER">Role: Institution Nodal Officer</option>
            <option value="APPROVING_AUTHORITY">Role: Competent Authority</option>
            <option value="ACCOUNTS_OFFICER">Role: Accounts Officer</option>
            <option value="SYSTEM_ADMIN">Role: System Admin / Auditor</option>
          </select>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            aria-label={`View ${notifications.length} Alerts`}
            className="relative p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Bell className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <span className="sr-only">{notifications.length} alerts</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            title="Reset Demo Data to Initial Seed"
            aria-label="Reset Demo Data"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </button>

          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            aria-label="Sign Out"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-red-50 text-red-600 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Sidebar + Main Content Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? 'block' : 'hidden'
          } lg:block w-60 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-3 no-print`}
        >
          <nav className="space-y-1" aria-label="Main Portal Navigation">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Active User Persona Card */}
          <div className="mt-6 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
            <div className="text-[10px] font-mono uppercase text-slate-400">
              Authenticated Session
            </div>
            <div className="font-bold text-slate-900 dark:text-white truncate">
              {currentUser?.name}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {currentUser?.designation}
            </div>
            <div className="text-[10px] font-mono text-blue-800 dark:text-blue-400">
              {currentUser?.role}
            </div>
          </div>
        </aside>

        {/* Main Screen Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-[1440px] mx-auto">
            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'scrutiny' && <ScrutinyWorkspacePage />}
            {activeTab === 'institution' && <InstitutionPortalPage />}
            {activeTab === 'renewals' && <RenewalsPage />}
            {activeTab === 'releases' && <ReleaseWorkflowPage />}
            {activeTab === 'alerts' && <MonitoringAlertsPage />}
            {activeTab === 'banksim' && <BankSimulatorPage />}
            {activeTab === 'reports' && <ReportsCentrePage />}
            {activeTab === 'admin' && <AdminAuditPage />}
            {activeTab === 'architecture' && <ArchitecturePage />}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      <AskPortalModal />
      <DemoTourModal />

      {/* Confirmation Dialog for Reset Demo Data */}
      {confirmResetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 id="reset-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
              Reset Demo Data to Initial State?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This will restore all 42 seeded institutions, 88 instruments, 10 guided Demo Scenarios, system clock (24-Oct-2026), and a clean SHA-256 audit hash chain in localStorage.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  setConfirmResetOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded bg-red-700 text-white cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Messages Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full no-print">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3.5 rounded-lg shadow-lg border text-xs flex items-start justify-between gap-3 ${
                toast.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950 text-red-950 dark:text-white border-red-300 dark:border-red-700'
                  : toast.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950 text-amber-950 dark:text-white border-amber-300 dark:border-amber-700'
                  : toast.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-950 dark:text-white border-emerald-300 dark:border-emerald-700'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'
              }`}
            >
              <div>
                <div className="font-bold">{toast.title}</div>
                <div className="opacity-90 mt-0.5">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="opacity-70 hover:opacity-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <PortalProvider>
      <MainShell />
    </PortalProvider>
  );
}
