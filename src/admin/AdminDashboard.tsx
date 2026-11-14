import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  ArrowLeftRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  DatabaseBackup,
  ExternalLink,
  FileText,
  Globe,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  Lock,
  LogOut,
  Menu,
  Palette,
  PenSquare,
  Receipt,
  Settings,
  Shield,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { OperationType, db, handleFirestoreError } from '../config/firebase';
import { useApp } from '../context/AppContext';
import {
  Account,
  AdminPermissionKey,
  AuditLog,
  BackupLog,
  ContactMessage,
  ExpenseEntry,
  FinancialYear,
  Fund,
  FundTransfer,
  IncomeEntry,
  SubscriptionPayment,
} from '../types/models';
import { formatTakaFromPoisha, toBengaliDigits } from '../utils/bengali';
import { AdminCmsDesignModule } from './AdminCmsDesignModule';
import { AdminFinanceModule } from './AdminFinanceModule';
import { AdminReportsSettingsModule } from './AdminReportsSettingsModule';
import { AdminUsersMembersModule } from './AdminUsersMembersModule';

export type AdminMenuId =
  | 'overview'
  | 'content'
  | 'design'
  | 'builder'
  | 'pages'
  | 'menus'
  | 'media'
  | 'users'
  | 'members'
  | 'subadmins'
  | 'income'
  | 'expenses'
  | 'calculator'
  | 'ledger'
  | 'subscriptions'
  | 'accounts'
  | 'receipts'
  | 'approvals'
  | 'reports'
  | 'audit'
  | 'notifications'
  | 'backup'
  | 'seo'
  | 'pwa'
  | 'settings'
  | 'security';

interface MenuItemDef {
  id: AdminMenuId;
  labelBn: string;
  icon: React.ComponentType<{ className?: string }>;
  reqPerm?: AdminPermissionKey;
  superOnly?: boolean;
}

const ADMIN_MENUS: MenuItemDef[] = [
  { id: 'overview', labelBn: '১. ওভারভিউ ড্যাশবোর্ড', icon: LayoutDashboard },
  { id: 'content', labelBn: '২. ওয়েবসাইট কনটেন্ট', icon: PenSquare, reqPerm: 'cms' },
  { id: 'design', labelBn: '৩. ভিজ্যুয়াল ডিজাইন কন্ট্রোল', icon: Palette, reqPerm: 'design' },
  { id: 'builder', labelBn: '৪. ভিজ্যুয়াল পেজ বিল্ডার', icon: Layers, reqPerm: 'cms' },
  { id: 'pages', labelBn: '৫. পেজ ম্যানেজমেন্ট', icon: FileText, reqPerm: 'cms' },
  { id: 'menus', labelBn: '৬. মেনু ম্যানেজমেন্ট', icon: Menu, reqPerm: 'cms' },
  { id: 'media', labelBn: '৭. লোগো, মিডিয়া ও নোটিশ', icon: ImageIcon, reqPerm: 'cms' },
  { id: 'users', labelBn: '৮. ইউজার ম্যানেজমেন্ট', icon: Users, reqPerm: 'users' },
  { id: 'members', labelBn: '৯. সদস্য ও কমিটি', icon: UserCheck, reqPerm: 'members' },
  { id: 'subadmins', labelBn: '১০. সাব-অ্যাডমিন নিয়োগ', icon: ShieldCheck, superOnly: true },
  { id: 'income', labelBn: '১১. আয় ব্যবস্থাপনা', icon: TrendingUp, reqPerm: 'finance' },
  { id: 'expenses', labelBn: '১২. ব্যয় ব্যবস্থাপনা', icon: TrendingDown, reqPerm: 'finance' },
  { id: 'calculator', labelBn: '১৩. স্মার্ট ব্যয় ক্যালকুলেটর', icon: Calculator, reqPerm: 'finance' },
  { id: 'ledger', labelBn: '১৪. দাতা ও সদস্য লেজার', icon: BookOpen, reqPerm: 'finance' },
  { id: 'subscriptions', labelBn: '১৫. মাসিক চাঁদা', icon: CalendarCheck, reqPerm: 'finance' },
  { id: 'accounts', labelBn: '১৬. অ্যাকাউন্ট ও ট্রান্সফার', icon: ArrowLeftRight, reqPerm: 'finance' },
  { id: 'receipts', labelBn: '১৭. রশিদ ও ভাউচার', icon: Receipt, reqPerm: 'finance' },
  { id: 'approvals', labelBn: '১৮. ব্যয় অনুমোদন', icon: CheckCircle2, reqPerm: 'approvals' },
  { id: 'reports', labelBn: '১৯. আর্থিক প্রতিবেদন', icon: BarChart3, reqPerm: 'reports' },
  { id: 'audit', labelBn: '২০. অডিট লগ', icon: History, reqPerm: 'reports' },
  { id: 'notifications', labelBn: '২১. নোটিফিকেশন ও ইনবক্স', icon: Bell },
  { id: 'backup', labelBn: '২২. ব্যাকআপ ও রিস্টোর', icon: DatabaseBackup, reqPerm: 'settings' },
  { id: 'seo', labelBn: '২৩. SEO সেটিংস', icon: Globe, reqPerm: 'settings' },
  { id: 'pwa', labelBn: '২৪. PWA অ্যাপ সেটিংস', icon: Smartphone, reqPerm: 'settings' },
  { id: 'settings', labelBn: '২৫. ওয়েবসাইট সেটিংস', icon: Settings, reqPerm: 'settings' },
  { id: 'security', labelBn: '২৬. নিরাপত্তা সেটিংস', icon: Lock },
];

export const AdminDashboard: React.FC<{ onExitAdmin: () => void }> = ({ onExitAdmin }) => {
  const {
    websiteSettings,
    members,
    userProfile,
    isSuperAdmin,
    isAnyAdmin,
    hasPerm,
    logout,
    dbInitialized,
    initializingDb,
    triggerSeedDatabase,
  } = useApp();

  const [activeMenu, setActiveMenu] = useState<AdminMenuId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [transfers, setTransfers] = useState<FundTransfer[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionPayment[]>([]);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);

  useEffect(() => {
    if (!isAnyAdmin) return;
    const unsubs: (() => void)[] = [];

    if (hasPerm('finance') || hasPerm('reports') || hasPerm('approvals')) {
      unsubs.push(
        onSnapshot(collection(db, 'accounts'), (s) => setAccounts(s.docs.map((d) => d.data() as Account)), (e) => handleFirestoreError(e, OperationType.LIST, 'accounts')),
        onSnapshot(collection(db, 'funds'), (s) => setFunds(s.docs.map((d) => d.data() as Fund)), (e) => handleFirestoreError(e, OperationType.LIST, 'funds')),
        onSnapshot(
          collection(db, 'income'),
          (s) => setIncomes(s.docs.map((d) => d.data() as IncomeEntry).sort((a, b) => b.date.localeCompare(a.date))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'income')
        ),
        onSnapshot(
          collection(db, 'expenses'),
          (s) => setExpenses(s.docs.map((d) => d.data() as ExpenseEntry).sort((a, b) => b.date.localeCompare(a.date))),
          (e) => handleFirestoreError(e, OperationType.LIST, 'expenses')
        ),
        onSnapshot(collection(db, 'fundTransfers'), (s) => setTransfers(s.docs.map((d) => d.data() as FundTransfer)), (e) => handleFirestoreError(e, OperationType.LIST, 'fundTransfers')),
        onSnapshot(collection(db, 'subscriptionPayments'), (s) => setSubscriptions(s.docs.map((d) => d.data() as SubscriptionPayment)), (e) => handleFirestoreError(e, OperationType.LIST, 'subscriptionPayments')),
        onSnapshot(collection(db, 'financialYears'), (s) => setFinancialYears(s.docs.map((d) => d.data() as FinancialYear)), (e) => handleFirestoreError(e, OperationType.LIST, 'financialYears'))
      );
    }

    if (isSuperAdmin || hasPerm('reports') || hasPerm('finance')) {
      unsubs.push(
        onSnapshot(collection(db, 'auditLogs'), (s) => setAuditLogs(s.docs.map((d) => d.data() as AuditLog)), (e) => handleFirestoreError(e, OperationType.LIST, 'auditLogs'))
      );
    }

    if (hasPerm('cms') || isSuperAdmin) {
      unsubs.push(
        onSnapshot(collection(db, 'contactMessages'), (s) => setContactMessages(s.docs.map((d) => d.data() as ContactMessage)), (e) => handleFirestoreError(e, OperationType.LIST, 'contactMessages'))
      );
    }

    if (hasPerm('settings') || isSuperAdmin) {
      unsubs.push(
        onSnapshot(collection(db, 'backupLogs'), (s) => setBackupLogs(s.docs.map((d) => d.data() as BackupLog)), (e) => handleFirestoreError(e, OperationType.LIST, 'backupLogs'))
      );
    }

    return () => unsubs.forEach((u) => u());
  }, [isAnyAdmin, isSuperAdmin]);

  // Real-time 10 Financial KPIs
  const kpis = useMemo(() => {
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);
    let totalBalancePoisha = 0;
    let cashPoisha = 0;
    let bankPoisha = 0;
    let mobilePoisha = 0;

    accounts.forEach((a) => {
      if (!a.isActive) return;
      totalBalancePoisha += a.currentBalancePoisha;
      if (a.type === 'cash') cashPoisha += a.currentBalancePoisha;
      else if (a.type === 'bank') bankPoisha += a.currentBalancePoisha;
      else mobilePoisha += a.currentBalancePoisha;
    });

    let totalIncomePoisha = 0;
    let monthIncomePoisha = 0;
    const donors = new Set<string>();
    incomes.forEach((i) => {
      if (i.status === 'voided') return;
      totalIncomePoisha += i.amountPoisha;
      if (i.date.startsWith(thisMonthPrefix)) monthIncomePoisha += i.amountPoisha;
      if (i.donorName) donors.add(i.donorName.trim());
    });

    let totalExpensePoisha = 0;
    let monthExpensePoisha = 0;
    let pendingApprovals = 0;
    expenses.forEach((e) => {
      if (e.status === 'voided') return;
      if (e.approvalStatus === 'pending') pendingApprovals++;
      if (e.approvalStatus === 'approved') {
        totalExpensePoisha += e.totalAmountPoisha;
        if (e.date.startsWith(thisMonthPrefix)) monthExpensePoisha += e.totalAmountPoisha;
      }
    });

    return {
      totalBalancePoisha,
      cashPoisha,
      bankPoisha,
      mobilePoisha,
      totalIncomePoisha,
      totalExpensePoisha,
      monthIncomePoisha,
      monthExpensePoisha,
      totalMembers: members.length,
      totalDonors: donors.size,
      pendingApprovals,
    };
  }, [accounts, incomes, expenses, members]);

  const visibleMenus = ADMIN_MENUS.filter((m) => {
    if (m.superOnly) return isSuperAdmin;
    if (m.reqPerm) return hasPerm(m.reqPerm);
    return true;
  });

  if (!isAnyAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <Shield className="h-12 w-12 text-red-600 mb-3" />
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">অননুমোদিত প্রবেশাধিকার</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md">
          এই অ্যাডমিন প্যানেল শুধুমাত্র যাচাইকৃত সুপার অ্যাডমিন ও অনুমোদিত সাব-অ্যাডমিনদের জন্য সংরক্ষিত।
        </p>
        <button onClick={onExitAdmin} className="mt-5 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer">
          পাবলিক ওয়েবসাইটে ফিরুন
        </button>
      </div>
    );
  }

  const isFirstOfMonth = new Date().getDate() === 1;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-68 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {websiteSettings.logoUrl ? (
              <img
                src={websiteSettings.logoUrl}
                alt={websiteSettings.orgNameBn}
                className="h-8 w-8 rounded-full object-cover border border-emerald-200 shrink-0"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
                ক
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-bold truncate">{websiteSettings.pwaShortName}</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                {isSuperAdmin ? 'Super Admin' : 'Sub Admin'}
              </p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded hover:bg-slate-100 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visibleMenus.map((item) => {
            const Icon = item.icon;
            const active = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-left transition cursor-pointer ${
                  active
                    ? 'bg-emerald-700 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.labelBn}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 p-3 space-y-2">
          <button
            onClick={onExitAdmin}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            পাবলিক ওয়েবসাইট দেখুন
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 py-2 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            লগআউট ({userProfile?.displayName})
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="মেনু খুলুন"
              className="lg:hidden rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm sm:text-base font-bold truncate">
              {ADMIN_MENUS.find((m) => m.id === activeMenu)?.labelBn}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!dbInitialized && isSuperAdmin && (
              <button
                onClick={triggerSeedDatabase}
                disabled={initializingDb}
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                {initializingDb ? 'সেটআপ হচ্ছে...' : 'ডাটাবেজ ইনিশিয়ালাইজ করুন'}
              </button>
            )}
            <button
              onClick={onExitAdmin}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              ওয়েবসাইট
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeMenu === 'overview' && (
            <div className="space-y-6">
              {/* 1st-of-month or Pending Approvals Reminder Banner */}
              {(isFirstOfMonth || kpis.pendingApprovals > 0) && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-amber-900 dark:text-amber-200">
                    <strong>মাসিক হিসাব ও অনুমোদন রিমাইন্ডার:</strong>{' '}
                    {isFirstOfMonth && 'আজ মাসের ১ তারিখ — অনুগ্রহ করে বিগত মাসের আয়-ব্যয়, ব্যালেন্স ও ডাটাবেজ ব্যাকআপ যাচাই করুন। '}
                    {kpis.pendingApprovals > 0 && `${toBengaliDigits(kpis.pendingApprovals)}টি ব্যয় ভাউচার অনুমোদনের অপেক্ষায় আছে।`}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveMenu('notifications')}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      যাচাই চেকলিস্ট দেখুন
                    </button>
                    {kpis.pendingApprovals > 0 && hasPerm('approvals') && (
                      <button
                        onClick={() => setActiveMenu('approvals')}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                      >
                        অনুমোদন তালিকা
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 10 Real-Time Financial & Organizational KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: '১. মোট বর্তমান তহবিল', val: formatTakaFromPoisha(kpis.totalBalancePoisha), icon: Wallet, highlight: true },
                  { label: '২. নগদ ক্যাশ ব্যালেন্স', val: formatTakaFromPoisha(kpis.cashPoisha), icon: Wallet },
                  { label: '৩. ব্যাংক ব্যালেন্স', val: formatTakaFromPoisha(kpis.bankPoisha), icon: Wallet },
                  { label: '৪. মোবাইল ব্যাংকিং ব্যালেন্স', val: formatTakaFromPoisha(kpis.mobilePoisha), icon: Smartphone },
                  { label: '৫. মোট আয়', val: formatTakaFromPoisha(kpis.totalIncomePoisha), icon: TrendingUp },
                  { label: '৬. মোট ব্যয়', val: formatTakaFromPoisha(kpis.totalExpensePoisha), icon: TrendingDown },
                  { label: '৭. এই মাসের আয়', val: formatTakaFromPoisha(kpis.monthIncomePoisha), icon: TrendingUp },
                  { label: '৮. এই মাসের ব্যয়', val: formatTakaFromPoisha(kpis.monthExpensePoisha), icon: TrendingDown },
                  { label: '৯. মোট সদস্য', val: `${toBengaliDigits(kpis.totalMembers)} জন`, icon: Users },
                  { label: '১০. মোট দাতা', val: `${toBengaliDigits(kpis.totalDonors)} জন`, icon: Award },
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-5 ${
                        card.highlight
                          ? 'border-emerald-700 bg-emerald-900 text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs opacity-80">
                        <span>{card.label}</span>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-2.5 text-xl font-bold tabular-nums">{card.val}</p>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveMenu('income')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:border-emerald-600 transition cursor-pointer"
                >
                  <h3 className="font-bold text-sm">+ নতুন আয় / অনুদান ও রশিদ</h3>
                  <p className="text-xs text-slate-500 mt-1">REC-YYYY-NNN সিরিয়ালসহ তাৎক্ষণিক ডিজিটাল রশিদ তৈরি করুন।</p>
                </button>
                <button
                  onClick={() => setActiveMenu('calculator')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:border-emerald-600 transition cursor-pointer"
                >
                  <h3 className="font-bold text-sm">+ স্মার্ট ব্যয় ক্যালকুলেটর ও ভাউচার</h3>
                  <p className="text-xs text-slate-500 mt-1">একাধিক আইটেম যোগ করে VOU-YYYY-NNN ভাউচার তৈরি করুন।</p>
                </button>
                <button
                  onClick={() => setActiveMenu('builder')}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:border-emerald-600 transition cursor-pointer"
                >
                  <h3 className="font-bold text-sm">ভিজ্যুয়াল ওয়েবসাইট বিল্ডার</h3>
                  <p className="text-xs text-slate-500 mt-1">কোডিং ছাড়াই ওয়েবসাইটের যেকোনো সেকশন ড্র্যাগ-ড্রপ ও এডিট করুন।</p>
                </button>
              </div>
            </div>
          )}

          {(activeMenu === 'content' ||
            activeMenu === 'design' ||
            activeMenu === 'builder' ||
            activeMenu === 'pages' ||
            activeMenu === 'menus' ||
            activeMenu === 'media') && <AdminCmsDesignModule activeMenu={activeMenu} />}

          {(activeMenu === 'users' || activeMenu === 'members' || activeMenu === 'subadmins') && (
            <AdminUsersMembersModule activeMenu={activeMenu} />
          )}

          {(activeMenu === 'income' ||
            activeMenu === 'expenses' ||
            activeMenu === 'calculator' ||
            activeMenu === 'ledger' ||
            activeMenu === 'subscriptions' ||
            activeMenu === 'accounts' ||
            activeMenu === 'receipts' ||
            activeMenu === 'approvals') && (
            <AdminFinanceModule
              activeMenu={activeMenu}
              accounts={accounts}
              funds={funds}
              incomes={incomes}
              expenses={expenses}
              transfers={transfers}
              subscriptions={subscriptions}
              financialYears={financialYears}
            />
          )}

          {(activeMenu === 'reports' ||
            activeMenu === 'audit' ||
            activeMenu === 'notifications' ||
            activeMenu === 'backup' ||
            activeMenu === 'seo' ||
            activeMenu === 'pwa' ||
            activeMenu === 'settings' ||
            activeMenu === 'security') && (
            <AdminReportsSettingsModule
              activeMenu={activeMenu}
              accounts={accounts}
              funds={funds}
              incomes={incomes}
              expenses={expenses}
              subscriptions={subscriptions}
              auditLogs={auditLogs}
              contactMessages={contactMessages}
              backupLogs={backupLogs}
            />
          )}
        </main>
      </div>
    </div>
  );
};
