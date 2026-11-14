import React, { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  CheckCircle2,
  CheckSquare,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  KeyRound,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { Timestamp, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { FirebaseConnectionStatus } from '../components/FirebaseConnectionStatus';
import { db } from '../config/firebase';
import { useApp } from '../context/AppContext';
import {
  createVerifiedBackupPayload,
  markContactMessageRead,
  resetOrganizationToFresh,
  saveWebsiteSettings,
  uploadFileToStorage,
} from '../services/firestoreService';
import {
  Account,
  AuditLog,
  BackupLog,
  ContactMessage,
  ExpenseEntry,
  Fund,
  IncomeEntry,
  SubscriptionPayment,
  WebsiteSettings,
} from '../types/models';
import { formatDateBn, formatTakaFromPoisha, toBengaliDigits } from '../utils/bengali';

interface Props {
  activeMenu: 'reports' | 'audit' | 'notifications' | 'backup' | 'seo' | 'pwa' | 'settings' | 'security';
  accounts: Account[];
  funds: Fund[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  subscriptions: SubscriptionPayment[];
  auditLogs: AuditLog[];
  contactMessages: ContactMessage[];
  backupLogs: BackupLog[];
}

type ReportType =
  | 'daily_income'
  | 'daily_expense'
  | 'monthly_income'
  | 'monthly_expense'
  | 'yearly'
  | 'donor'
  | 'member_contribution'
  | 'outstanding_subscription'
  | 'category_wise'
  | 'account_wise'
  | 'cash_book'
  | 'bank_book'
  | 'fund_wise'
  | 'transaction_history'
  | 'audit_report';

const REPORT_LABELS: { id: ReportType; label: string }[] = [
  { id: 'daily_income', label: 'Daily Income Report' },
  { id: 'daily_expense', label: 'Daily Expense Report' },
  { id: 'monthly_income', label: 'Monthly Income Report' },
  { id: 'monthly_expense', label: 'Monthly Expense Report' },
  { id: 'yearly', label: 'Yearly Financial Report' },
  { id: 'donor', label: 'Donor Report' },
  { id: 'member_contribution', label: 'Member Contribution Report' },
  { id: 'outstanding_subscription', label: 'Outstanding Subscription Report' },
  { id: 'category_wise', label: 'Category Wise Report' },
  { id: 'account_wise', label: 'Account Wise Report' },
  { id: 'cash_book', label: 'Cash Book' },
  { id: 'bank_book', label: 'Bank Book' },
  { id: 'fund_wise', label: 'Fund Wise Report' },
  { id: 'transaction_history', label: 'Transaction History' },
  { id: 'audit_report', label: 'Audit Report' },
];

export const AdminReportsSettingsModule: React.FC<Props> = ({
  activeMenu,
  accounts,
  funds,
  incomes,
  expenses,
  subscriptions,
  auditLogs,
  contactMessages,
  backupLogs,
}) => {
  const { websiteSettings, members, firebaseUser, userProfile, isSuperAdmin } = useApp();
  const actorUid = firebaseUser?.uid || '';
  const actorName = userProfile?.displayName || firebaseUser?.email || 'Admin';

  const [siteForm, setSiteForm] = useState<WebsiteSettings>(websiteSettings);
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [uploadingOg, setUploadingOg] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const siteDirtyRef = useRef(false);

  useEffect(() => {
    if (!siteDirtyRef.current) {
      setSiteForm(websiteSettings);
    }
  }, [websiteSettings]);

  const updateSiteForm = (updater: (prev: WebsiteSettings) => WebsiteSettings) => {
    siteDirtyRef.current = true;
    setSyncState('syncing');
    setSiteForm(updater);
  };

  useEffect(() => {
    if (!siteDirtyRef.current || !actorUid) return;
    const timer = setTimeout(async () => {
      try {
        await saveWebsiteSettings(siteForm, actorUid, actorName, { skipAuditLog: true });
        siteDirtyRef.current = false;
        setSyncState('synced');
      } catch {
        setSyncState('error');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [siteForm, actorUid, actorName]);

  // Security & Password State
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Fresh Start Reset State
  const [confirmFresh, setConfirmFresh] = useState(false);
  const [resettingFresh, setResettingFresh] = useState(false);

  // Report Filters
  const [reportType, setReportType] = useState<ReportType>('monthly_income');
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  // Monthly Reminder Checklist State
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false, false, false, false]);

  const notify = (t: string) => {
    setErr('');
    setMsg(t);
    setTimeout(() => setMsg(''), 5000);
  };

  // Compute Report Rows dynamically from Firestore records
  const reportRows = useMemo(() => {
    const inRange = (d: string) => (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    const activeInc = incomes.filter((i) => i.status !== 'voided' && inRange(i.date));
    const activeExp = expenses.filter((e) => e.status !== 'voided' && e.approvalStatus === 'approved' && inRange(e.date));

    switch (reportType) {
      case 'daily_income':
      case 'monthly_income':
        return activeInc.map((i) => ({
          col1: i.receiptNumber,
          col2: i.date,
          col3: `${i.donorName} (${i.category})`,
          col4: formatTakaFromPoisha(i.amountPoisha, 'en'),
          rawAmount: i.amountPoisha / 100,
        }));
      case 'daily_expense':
      case 'monthly_expense':
        return activeExp.map((e) => ({
          col1: e.voucherNumber,
          col2: e.date,
          col3: `${e.titleBn} (${e.category})`,
          col4: formatTakaFromPoisha(e.totalAmountPoisha, 'en'),
          rawAmount: e.totalAmountPoisha / 100,
        }));
      case 'yearly':
      case 'transaction_history': {
        const rows = [
          ...activeInc.map((i) => ({
            col1: i.receiptNumber,
            col2: i.date,
            col3: `[আয়] ${i.donorName} — ${i.category}`,
            col4: `+${formatTakaFromPoisha(i.amountPoisha, 'en')}`,
            rawAmount: i.amountPoisha / 100,
          })),
          ...activeExp.map((e) => ({
            col1: e.voucherNumber,
            col2: e.date,
            col3: `[ব্যয়] ${e.titleBn} — ${e.category}`,
            col4: `-${formatTakaFromPoisha(e.totalAmountPoisha, 'en')}`,
            rawAmount: -(e.totalAmountPoisha / 100),
          })),
        ];
        return rows.sort((a, b) => b.col2.localeCompare(a.col2));
      }
      case 'donor':
      case 'member_contribution': {
        const filtered = reportType === 'member_contribution' ? activeInc.filter((i) => Boolean(i.memberId)) : activeInc;
        const map = new Map<string, number>();
        filtered.forEach((i) => map.set(i.donorName, (map.get(i.donorName) || 0) + i.amountPoisha));
        return Array.from(map.entries()).map(([name, poisha]) => ({
          col1: reportType === 'member_contribution' ? 'Member' : 'Donor',
          col2: `${fromDate} → ${toDate}`,
          col3: name,
          col4: formatTakaFromPoisha(poisha, 'en'),
          rawAmount: poisha / 100,
        }));
      }
      case 'outstanding_subscription': {
        const curYear = new Date().getFullYear();
        const curMonth = new Date().getMonth() + 1;
        return members.map((m) => {
          const paidMonths = subscriptions.filter((s) => s.memberId === m.memberId && s.year === curYear && s.status === 'paid').length;
          const dueMonths = Math.max(0, curMonth - paidMonths);
          const duePoisha = dueMonths * m.monthlyFeePoisha;
          return {
            col1: m.displayCode,
            col2: `${curYear}`,
            col3: `${m.nameBn} (${dueMonths} মাস বকেয়া)`,
            col4: formatTakaFromPoisha(duePoisha, 'en'),
            rawAmount: duePoisha / 100,
          };
        });
      }
      case 'category_wise': {
        const catMap = new Map<string, number>();
        activeInc.forEach((i) => catMap.set(`আয়: ${i.category}`, (catMap.get(`আয়: ${i.category}`) || 0) + i.amountPoisha));
        activeExp.forEach((e) => catMap.set(`ব্যয়: ${e.category}`, (catMap.get(`ব্যয়: ${e.category}`) || 0) + e.totalAmountPoisha));
        return Array.from(catMap.entries()).map(([cat, poisha]) => ({
          col1: 'Category',
          col2: `${fromDate} → ${toDate}`,
          col3: cat,
          col4: formatTakaFromPoisha(poisha, 'en'),
          rawAmount: poisha / 100,
        }));
      }
      case 'account_wise':
        return accounts.map((a) => ({
          col1: a.type.toUpperCase(),
          col2: 'Current',
          col3: a.nameBn,
          col4: formatTakaFromPoisha(a.currentBalancePoisha, 'en'),
          rawAmount: a.currentBalancePoisha / 100,
        }));
      case 'cash_book':
      case 'bank_book': {
        const targetIds = new Set(
          accounts.filter((a) => (reportType === 'cash_book' ? a.type === 'cash' : a.type === 'bank')).map((a) => a.id)
        );
        return [
          ...activeInc.filter((i) => targetIds.has(i.accountId)).map((i) => ({
            col1: i.receiptNumber,
            col2: i.date,
            col3: `[জমা] ${i.donorName}`,
            col4: `+${formatTakaFromPoisha(i.amountPoisha, 'en')}`,
            rawAmount: i.amountPoisha / 100,
          })),
          ...activeExp.filter((e) => targetIds.has(e.accountId)).map((e) => ({
            col1: e.voucherNumber,
            col2: e.date,
            col3: `[খরচ] ${e.titleBn}`,
            col4: `-${formatTakaFromPoisha(e.totalAmountPoisha, 'en')}`,
            rawAmount: -(e.totalAmountPoisha / 100),
          })),
        ];
      }
      case 'fund_wise':
        return funds.map((f) => ({
          col1: f.id,
          col2: 'Current',
          col3: f.nameBn,
          col4: formatTakaFromPoisha(f.balancePoisha, 'en'),
          rawAmount: f.balancePoisha / 100,
        }));
      case 'audit_report':
        return auditLogs.map((l) => ({
          col1: l.module,
          col2: l.action,
          col3: `${l.actorName}: ${l.details || l.targetId}`,
          col4: l.reason || '-',
          rawAmount: 0,
        }));
      default:
        return [];
    }
  }, [reportType, fromDate, toDate, incomes, expenses, members, subscriptions, accounts, funds, auditLogs]);

  // 1. Financial Reports Dashboard
  if (activeMenu === 'reports') {
    const exportCsv = () => {
      const header = ['Reference', 'Date/Meta', 'Description', 'Amount (BDT)'];
      const csvLines = [header.join(','), ...reportRows.map((r) => [r.col1, r.col2, `"${r.col3.replace(/"/g, '""')}"`, r.rawAmount].join(','))];
      const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${toDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    const exportExcel = () => {
      const ws = XLSX.utils.json_to_sheet(
        reportRows.map((r) => ({ Reference: r.col1, Date: r.col2, Description: r.col3, Amount_BDT: r.rawAmount }))
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${reportType}_${toDate}.xlsx`);
    };

    const exportPdf = () => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.text(websiteSettings.orgNameEn || 'Kulkuri Ideal Society Implementation Council', 15, 18);
      pdf.setFontSize(11);
      pdf.text(`Report: ${REPORT_LABELS.find((x) => x.id === reportType)?.label} (${fromDate} to ${toDate})`, 15, 26);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      let y = 36;
      reportRows.slice(0, 35).forEach((r) => {
        pdf.text(`${r.col1} | ${r.col2} | ${r.col3.slice(0, 48)} | ${r.rawAmount}`, 15, y);
        y += 6;
      });
      pdf.save(`${reportType}_${toDate}.pdf`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">আর্থিক প্রতিবেদন ড্যাশবোর্ড (১৫টি রিপোর্ট)</h2>
          <div className="flex flex-wrap gap-2 no-print">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white cursor-pointer">
              <Printer className="h-3.5 w-3.5" /> প্রিন্ট
            </button>
            <button onClick={exportPdf} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={exportExcel} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer">
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 no-print">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          >
            {REPORT_LABELS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
        </div>

        <div className="print-area rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold">{websiteSettings.orgNameBn} — {REPORT_LABELS.find((x) => x.id === reportType)?.label}</h3>
            <p className="text-xs text-slate-500">সময়কাল: {formatDateBn(fromDate)} থেকে {formatDateBn(toDate)}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">রেফারেন্স</th>
                <th className="px-4 py-3 text-left">তারিখ / তথ্য</th>
                <th className="px-4 py-3 text-left">বিবরণ</th>
                <th className="px-4 py-3 text-right">পরিমাণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {reportRows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.col1}</td>
                  <td className="px-4 py-2.5 text-xs">{r.col2}</td>
                  <td className="px-4 py-2.5">{r.col3}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{r.col4}</td>
                </tr>
              ))}
              {reportRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500">এই সময়কালে কোনো তথ্য পাওয়া যায়নি।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. Audit Logs
  if (activeMenu === 'audit') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">অডিট লগ (Immutable Audit Trail)</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">মডিউল ও অ্যাকশন</th>
                <th className="px-4 py-3 text-left">পরিচালনাকারী</th>
                <th className="px-4 py-3 text-left">বিস্তারিত বিবরণ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {auditLogs.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">
                    {l.module} · {l.action}
                  </td>
                  <td className="px-4 py-3 text-xs">{l.actorName}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                    {l.details} {l.reason ? `(কারণ: ${l.reason})` : ''}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-xs text-slate-500">কোনো অডিট লগ এখনো তৈরি হয়নি।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 3. Notifications & Monthly Checklist & Contact Inbox
  if (activeMenu === 'notifications') {
    const items = [
      '১. মাসিক আয়-ব্যয় মিলিয়ে দেখা',
      '২. Cash, Bank ও Mobile Banking Balance যাচাই',
      '৩. Receipt এবং Voucher Number যাচাই',
      '৪. সংশোধিত ও বাতিল Transaction পরীক্ষা',
      '৫. সদস্যদের মাসিক চাঁদা ও বকেয়া পরীক্ষা',
      '৬. Monthly Report Export',
      '৭. Firestore Database Backup তৈরি ও সংরক্ষণ যাচাই',
    ];
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">মাসিক হিসাব যাচাই রিমাইন্ডার ও ইনবক্স</h2>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-700" />
            প্রতি মাসের ১ তারিখের হিসাব যাচাই চেকলিস্ট
          </h3>
          {items.map((label, idx) => (
            <label key={idx} className="flex items-center gap-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={checklist[idx]}
                onChange={() => {
                  const next = [...checklist];
                  next[idx] = !next[idx];
                  setChecklist(next);
                }}
                className="h-4 w-4 accent-emerald-700"
              />
              <span className={checklist[idx] ? 'line-through text-slate-400' : ''}>{label}</span>
            </label>
          ))}
          <p className="text-xs text-slate-500 pt-2">
            সর্বশেষ যাচাইকৃত ব্যাকআপ: {backupLogs.length > 0 ? `${toBengaliDigits(backupLogs[0].recordCount)} রেকর্ড (Checksum: ${backupLogs[0].checksum})` : 'এখনো কোনো ব্যাকআপ তৈরি হয়নি'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h3 className="text-sm font-bold mb-3">যোগাযোগ ফর্ম থেকে প্রাপ্ত বার্তা ({toBengaliDigits(contactMessages.length)})</h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {contactMessages.map((m) => (
              <div key={m.id} className="py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm">
                    {m.name} {m.phone ? `(${m.phone})` : ''} {!m.isRead && <span className="text-xs text-emerald-700 font-bold">· নতুন</span>}
                  </p>
                  <p className="text-xs text-slate-500">{m.subject || 'বার্তা'} · {m.email}</p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{m.message}</p>
                </div>
                {!m.isRead && (
                  <button onClick={() => markContactMessageRead(m.id)} className="text-xs font-semibold text-emerald-700 hover:underline shrink-0 cursor-pointer">
                    পঠিত চিহ্নিত করুন
                  </button>
                )}
              </div>
            ))}
            {contactMessages.length === 0 && <p className="text-xs text-slate-500">কোনো বার্তা নেই।</p>}
          </div>
        </div>
      </div>
    );
  }

  // 4. Verified Backup & Restore
  if (activeMenu === 'backup') {
    const handleExportBackup = async () => {
      try {
        const res = await createVerifiedBackupPayload(actorUid);
        const blob = new Blob([res.jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kulkuri_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        notify(`যাচাইকৃত ব্যাকআপ সফল! মোট ${toBengaliDigits(res.recordCount)}টি ডকুমেন্ট (Checksum: ${res.checksum})।`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    };

    const handleRestoreFile = async (file: File) => {
      if (!isSuperAdmin) {
        setErr('শুধুমাত্র সুপার অ্যাডমিন ব্যাকআপ রিস্টোর করতে পারেন।');
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as { collections?: Record<string, Record<string, unknown>[]> };
        if (!parsed.collections) throw new Error('সঠিক ব্যাকআপ JSON ফাইল নয়।');
        const allowedCollections = new Set([
          'websiteSettings',
          'pages',
          'pageSections',
          'menus',
          'notices',
          'news',
          'galleries',
          'members',
          'accounts',
          'funds',
          'financialYears',
          'dashboardSummaries',
        ]);
        const rehydrateValue = (val: unknown): unknown => {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            const obj = val as Record<string, unknown>;
            if (typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number') {
              return new Timestamp(obj.seconds, obj.nanoseconds);
            }
          }
          return val;
        };

        const batch = writeBatch(db);
        let restored = 0;
        for (const [colName, docsList] of Object.entries(parsed.collections)) {
          if (!allowedCollections.has(colName)) continue;
          for (const d of docsList) {
            const docId = String(d._docId || '');
            if (!docId) continue;
            const copy: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(d)) {
              if (k === '_docId') continue;
              copy[k] = rehydrateValue(v);
            }
            if ('updatedAt' in copy) copy.updatedAt = serverTimestamp();
            batch.set(doc(db, colName, docId), copy, { merge: true });
            restored++;
            if (restored >= 400) break;
          }
        }
        await batch.commit();
        notify(`${toBengaliDigits(restored)}টি কনফিগারেশন/সিএমএস/অ্যাকাউন্ট রেকর্ড সফলভাবে রিস্টোর করা হয়েছে!`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      }
    };

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <DatabaseBackup className="h-5 w-5 text-emerald-700" />
          Firestore ডাটাবেজ ব্যাকআপ ও রিস্টোর
        </h2>
        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
            <h3 className="text-base font-bold">নতুন যাচাইকৃত ব্যাকআপ তৈরি করুন</h3>
            <p className="text-xs text-slate-500">সকল কালেকশনের রিয়েল-টাইম ডেটা JSON আকারে ডাউনলোড হবে এবং SHA-256 Checksum সহ ব্যাকআপ লগে সংরক্ষিত হবে।</p>
            <button onClick={handleExportBackup} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer">
              <Download className="h-4 w-4" />
              ব্যাকআপ ডাউনলোড করুন
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
            <h3 className="text-base font-bold">JSON ব্যাকআপ থেকে রিস্টোর করুন</h3>
            <p className="text-xs text-slate-500">পূর্বের ডাউনলোড করা ব্যাকআপ ফাইল নির্বাচন করে ডেটা পুনরুদ্ধার করুন (সুপার অ্যাডমিন)।</p>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold cursor-pointer hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              ব্যাকআপ ফাইল আপলোড
              <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleRestoreFile(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-sm font-bold mb-3">ব্যাকআপ ইতিহাস (Verified Backup Status)</h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {backupLogs.map((b) => (
              <div key={b.id} className="py-2.5 flex justify-between">
                <span>ব্যাকআপ আইডি: <strong className="font-mono">{b.id}</strong> · Checksum: <span className="font-mono">{b.checksum}</span></span>
                <span>{toBengaliDigits(b.recordCount)} রেকর্ড</span>
              </div>
            ))}
            {backupLogs.length === 0 && <p className="text-slate-500">এখনো কোনো যাচাইকৃত ব্যাকআপ তৈরি হয়নি।</p>}
          </div>
        </div>
      </div>
    );
  }

  // 5. Security Settings, Password Management, Live Firebase Diagnostic & Fresh Reset
  if (activeMenu === 'security') {
    const hasPasswordProvider = Boolean(
      firebaseUser?.providerData.some((p) => p.providerId === 'password')
    );

    const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!firebaseUser || !firebaseUser.email) {
        setErr('পাসওয়ার্ড সেট/পরিবর্তন করতে বৈধ ইমেইলযুক্ত অ্যাকাউন্টে লগইন থাকতে হবে।');
        return;
      }
      if (newPw.length < 6) {
        setErr('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        return;
      }
      if (newPw !== confirmPw) {
        setErr('নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।');
        return;
      }

      setPwSaving(true);
      setErr('');
      try {
        if (hasPasswordProvider) {
          if (!currentPw) {
            setErr('পাসওয়ার্ড পরিবর্তন করতে বর্তমান পাসওয়ার্ড লিখুন।');
            setPwSaving(false);
            return;
          }
          const cred = EmailAuthProvider.credential(firebaseUser.email, currentPw);
          await reauthenticateWithCredential(firebaseUser, cred);
          await updatePassword(firebaseUser, newPw);
          notify('আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
        } else {
          const cred = EmailAuthProvider.credential(firebaseUser.email, newPw);
          await linkWithCredential(firebaseUser, cred);
          notify('আপনার অ্যাকাউন্টে Email/Password লগইন সফলভাবে সেট করা হয়েছে! এখন ইমেইল ও পাসওয়ার্ড দিয়েও লগইন করতে পারবেন।');
        }
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        if (raw.includes('auth/operation-not-allowed')) {
          setErr(
            'Firebase Console > Authentication > Sign-in method থেকে Email/Password প্রোভাইডার এখনো চালু (Enable) করা হয়নি। সেটি চালু করে আবার চেষ্টা করুন।'
          );
        } else if (raw.includes('auth/wrong-password') || raw.includes('auth/invalid-credential')) {
          setErr('বর্তমান পাসওয়ার্ড সঠিক নয়।');
        } else if (raw.includes('auth/requires-recent-login')) {
          setErr('নিরাপত্তার স্বার্থে অনুগ্রহ করে লগআউট করে পুনরায় লগইন করুন এবং তারপর পাসওয়ার্ড পরিবর্তন করুন।');
        } else {
          setErr(raw);
        }
      } finally {
        setPwSaving(false);
      }
    };

    const handleFreshReset = async () => {
      if (!isSuperAdmin) return;
      setResettingFresh(true);
      setErr('');
      try {
        const deleted = await resetOrganizationToFresh(actorUid, actorName);
        setConfirmFresh(false);
        notify(
          `সফলভাবে ${toBengaliDigits(deleted)}টি পুরোনো ডেমো কনটেন্ট/ছবি মুছে সম্পূর্ণ নতুন শুরু করা হয়েছে!`
        );
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setResettingFresh(false);
      }
    };

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          নিরাপত্তা, পাসওয়ার্ড ও Firebase সংযোগ নিয়ন্ত্রণ
        </h2>

        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Set / Change Password */}
          <form
            onSubmit={handlePasswordSubmit}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
          >
            <div>
              <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <KeyRound className="h-4 w-4 text-emerald-700" />
                {hasPasswordProvider ? 'আমার পাসওয়ার্ড পরিবর্তন করুন' : 'ইমেইল ও পাসওয়ার্ড সেট করুন'}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                বর্তমান লগইনকৃত ইমেইল: <strong className="font-mono">{firebaseUser?.email}</strong>
                {!hasPasswordProvider && ' (Google দিয়ে লগইনকৃত — এখান থেকে ইমেইল+পাসওয়ার্ড লগইন যুক্ত করতে পারবেন)'}
              </p>
            </div>

            {hasPasswordProvider && (
              <div>
                <label className="block text-xs font-medium mb-1">বর্তমান পাসওয়ার্ড *</label>
                <input
                  type="password"
                  required
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1">নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *</label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="উদাহরণ: কমপক্ষে ৬ অক্ষর বা সংখ্যা"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">নতুন পাসওয়ার্ড নিশ্চিত করুন *</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={pwSaving}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
            >
              {pwSaving ? 'সংরক্ষণ হচ্ছে...' : hasPasswordProvider ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'পাসওয়ার্ড সেট করুন'}
            </button>
          </form>

          {/* Firebase Connection & Multi-Service Permission-Aware Verification */}
          <FirebaseConnectionStatus />
        </div>

        {/* Super Admin Fresh Start Reset */}
        {isSuperAdmin && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 p-6 space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2 text-amber-950 dark:text-amber-200">
              <RotateCcw className="h-4 w-4" />
              সম্পূর্ণ নতুন শুরু (Fresh Start — পুরোনো ডেমো ডাটা পরিষ্কার করুন)
            </h3>
            <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
              আগে তৈরি হওয়া নমুনা নোটিশ, সংবাদ, গ্যালারি, নমুনা সদস্য, পেজ সেকশন এবং পুরোনো লোগো/ব্যানার লিংক মুছে ওয়েবসাইটটিকে সম্পূর্ণ ফাঁকা (Clean Slate) অবস্থায় নিয়ে আসুন—যাতে আজ থেকে একদম নতুনভাবে সমস্ত লেখা ও ছবি সেট করতে পারেন। (আপনার অ্যাকাউন্ট ও অনুমোদিত আর্থিক রেকর্ড নিরাপদ থাকবে)।
            </p>
            {!confirmFresh ? (
              <button
                type="button"
                onClick={() => setConfirmFresh(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-800 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                ডেমো কনটেন্ট মুছে নতুন শুরু করুন
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={resettingFresh}
                  onClick={handleFreshReset}
                  className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 cursor-pointer"
                >
                  {resettingFresh ? 'পরিষ্কার হচ্ছে...' : 'হ্যাঁ, নিশ্চিতভাবে পরিষ্কার করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmFresh(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  বাতিল করুন
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // 6. SEO, PWA & Website Settings
  const saveOperationalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    siteDirtyRef.current = false;
    setSyncState('syncing');
    await saveWebsiteSettings(siteForm, actorUid, actorName);
    setSyncState('synced');
    notify('সেটিংস সফলভাবে Firebase-এ সংরক্ষিত হয়েছে!');
  };

  return (
    <form onSubmit={saveOperationalSettings} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {activeMenu === 'seo' ? 'SEO ও সোশ্যাল শেয়ারিং সেটিংস' : activeMenu === 'pwa' ? 'PWA ও অ্যাপ ইনস্টল সেটিংস' : 'ওয়েবসাইট অপারেশনাল সেটিংস'}
        </h2>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              syncState === 'synced'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : syncState === 'syncing'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {syncState === 'synced' ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <RefreshCw className={`h-3.5 w-3.5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
            )}
            {syncState === 'synced' ? 'Firebase-এ লাইভ সংরক্ষিত' : syncState === 'syncing' ? 'সিঙ্ক হচ্ছে...' : 'সিঙ্ক ত্রুটি'}
          </span>
          <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white cursor-pointer">
            <Save className="h-4 w-4" /> সেভ করুন
          </button>
        </div>
      </div>
      {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
      {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        {activeMenu === 'seo' && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1">Meta Title</label>
              <input value={siteForm.metaTitle} onChange={(e) => updateSiteForm((prev) => ({ ...prev, metaTitle: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Meta Description</label>
              <textarea rows={3} value={siteForm.metaDescription} onChange={(e) => updateSiteForm((prev) => ({ ...prev, metaDescription: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">OG Social Share Image URL / আপলোড</label>
              <div className="flex flex-wrap gap-2 items-center">
                <input value={siteForm.ogImageUrl} onChange={(e) => updateSiteForm((prev) => ({ ...prev, ogImageUrl: e.target.value }))} className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
                <label className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingOg ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !actorUid) return;
                      setUploadingOg(true);
                      try {
                        const url = await uploadFileToStorage(file, 'public', 'seo', actorUid, { maxDim: 1080 });
                        siteDirtyRef.current = false;
                        setSiteForm((prev) => ({ ...prev, ogImageUrl: url }));
                        await saveWebsiteSettings({ ogImageUrl: url }, actorUid, actorName);
                        setSyncState('synced');
                        notify('OG সোশ্যাল ছবি আপলোড ও সংরক্ষিত হয়েছে!');
                      } catch (ex) {
                        setErr(ex instanceof Error ? ex.message : String(ex));
                      } finally {
                        setUploadingOg(false);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </>
        )}

        {activeMenu === 'pwa' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">App Name</label>
                <input value={siteForm.pwaAppName} onChange={(e) => updateSiteForm((prev) => ({ ...prev, pwaAppName: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Short Name (≤ 12 chars)</label>
                <input value={siteForm.pwaShortName} onChange={(e) => updateSiteForm((prev) => ({ ...prev, pwaShortName: e.target.value }))} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={siteForm.pwaInstallBannerEnabled} onChange={(e) => updateSiteForm((prev) => ({ ...prev, pwaInstallBannerEnabled: e.target.checked }))} className="accent-emerald-700" />
              পাবলিক ওয়েবসাইটে &ldquo;অ্যাপটি ডাউনলোড করুন&rdquo; ইনস্টল ব্যানার প্রদর্শন করুন
            </label>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={siteForm.apkDownloadEnabled} onChange={(e) => updateSiteForm((prev) => ({ ...prev, apkDownloadEnabled: e.target.checked }))} className="accent-emerald-700" />
                ঐচ্ছিক Android APK ডাউনলোড বাটন সক্রিয় করুন (শুধুমাত্র বৈধ HTTPS URL থাকলে সক্রিয় হবে)
              </label>
              <input
                placeholder="https://example.com/kulkuri.apk"
                value={siteForm.apkDownloadUrl}
                onChange={(e) => updateSiteForm((prev) => ({ ...prev, apkDownloadUrl: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        {activeMenu === 'settings' && (
          <div className="space-y-3">
            {[
              ['maintenanceMode', 'ওয়েবসাইট রক্ষণাবেক্ষণ মোড (Maintenance Mode)'],
              ['publicWebsiteEnabled', 'পাবলিক ওয়েবসাইট চালু রাখুন'],
              ['registrationEnabled', 'নতুন সদস্য নিবন্ধন (Sign Up) চালু রাখুন'],
              ['memberLoginEnabled', 'সাধারণ সদস্য লগইন চালু রাখুন'],
              ['publicFinancialSummaryEnabled', 'পাবলিক আর্থিক স্বচ্ছতা সারসংক্ষেপ প্রদর্শন করুন'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(siteForm[key as keyof WebsiteSettings])}
                  onChange={(e) => updateSiteForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="h-4 w-4 accent-emerald-700"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </form>
  );
};
