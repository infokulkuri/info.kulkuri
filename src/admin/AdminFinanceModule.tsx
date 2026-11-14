import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Ban,
  Calculator,
  Check,
  FileText,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DocumentModal } from '../receipts/DocumentModal';
import {
  createExpenseTransaction,
  createFundTransferTransaction,
  createIncomeTransaction,
  processExpenseApproval,
  recordMultiMonthSubscriptionPayment,
  saveAccount,
  saveFund,
  voidFinancialTransaction,
} from '../services/firestoreService';
import {
  Account,
  ExpenseEntry,
  ExpenseLineItem,
  FinancialYear,
  Fund,
  FundTransfer,
  IncomeEntry,
  SubscriptionPayment,
} from '../types/models';
import {
  BN_MONTHS,
  formatDateBn,
  formatTakaFromPoisha,
  generateDocId,
  takaToPoisha,
  toBengaliDigits,
} from '../utils/bengali';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Props {
  activeMenu:
    | 'income'
    | 'expenses'
    | 'calculator'
    | 'ledger'
    | 'subscriptions'
    | 'accounts'
    | 'receipts'
    | 'approvals';
  accounts: Account[];
  funds: Fund[];
  incomes: IncomeEntry[];
  expenses: ExpenseEntry[];
  transfers: FundTransfer[];
  subscriptions: SubscriptionPayment[];
  financialYears: FinancialYear[];
}

const INCOME_CATEGORIES = ['মাসিক চাঁদা', 'সাধারণ অনুদান', 'বিশেষ তহবিল', 'জরুরি অনুদান', 'অন্যান্য আয়'];
const EXPENSE_CATEGORIES = ['খাদ্যসামগ্রী', 'যাতায়াত', 'চিকিৎসা', 'সমাজসেবা', 'শিক্ষা', 'অনুষ্ঠান', 'অফিস খরচ', 'অন্যান্য'];
const PAYMENT_METHODS = ['নগদ (Cash)', 'ব্যাংক (Bank)', 'বিকাশ (bKash)', 'নগদ (Nagad)', 'অন্যান্য'];

export const AdminFinanceModule: React.FC<Props> = ({
  activeMenu,
  accounts,
  funds,
  incomes,
  expenses,
  transfers,
  subscriptions,
  financialYears,
}) => {
  const { members, firebaseUser, userProfile, isSuperAdmin, hasPerm } = useApp();
  const actorUid = firebaseUser?.uid || '';
  const actorName = userProfile?.displayName || firebaseUser?.email || 'Admin';

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal for Receipt / Voucher
  const [docModal, setDocModal] = useState<{
    mode: 'receipt' | 'voucher';
    income?: IncomeEntry;
    expense?: ExpenseEntry;
  } | null>(null);

  // Void Modal
  const [voidTarget, setVoidTarget] = useState<{ col: 'income' | 'expenses'; id: string; num: string } | null>(null);
  const [voidReason, setVoidReason] = useState('');

  // Income Form
  const [incForm, setIncForm] = useState({
    donorName: '',
    memberId: '',
    phone: '',
    category: INCOME_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    amountTaka: '',
    paymentMethod: PAYMENT_METHODS[0],
    accountId: accounts[0]?.id || 'acc_cash',
    fundId: funds[0]?.id || 'fund_general',
    notes: '',
    proofUrl: '',
  });

  // Multi-Item Expense Calculator Form
  const [expForm, setExpForm] = useState({
    titleBn: '',
    category: EXPENSE_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: PAYMENT_METHODS[0],
    accountId: accounts[0]?.id || 'acc_cash',
    fundId: funds[0]?.id || 'fund_general',
    payeeName: '',
    notes: '',
    billUrl: '',
    autoApprove: isSuperAdmin,
  });
  const [calcItems, setCalcItems] = useState<{ name: string; quantity: number; unit: string; unitPriceTaka: string }[]>([
    { name: 'চাল কেনা', quantity: 1, unit: 'বস্তা', unitPriceTaka: '2500' },
  ]);

  // Transfer Form
  const [trfForm, setTrfForm] = useState({
    fromAccountId: accounts[0]?.id || 'acc_cash',
    toAccountId: accounts[1]?.id || 'acc_bank',
    amountTaka: '',
    date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // New Account / Fund Forms
  const [newAcc, setNewAcc] = useState({ nameBn: '', type: 'other' as Account['type'], accountNumberMasked: '', openingTaka: '0' });
  const [newFund, setNewFund] = useState({ nameBn: '', descriptionBn: '' });
  const [newYear, setNewYear] = useState({ year: new Date().getFullYear(), openingTaka: '0' });

  // Subscription Form & Year Filter
  const [subYear, setSubYear] = useState(new Date().getFullYear());
  const [subPayForm, setSubPayForm] = useState({
    memberId: members[0]?.memberId || '',
    months: [new Date().getMonth() + 1],
    perMonthTaka: '200',
    accountId: accounts[0]?.id || 'acc_cash',
    fundId: funds[0]?.id || 'fund_general',
    paymentMethod: PAYMENT_METHODS[0],
    date: new Date().toISOString().slice(0, 10),
  });

  // Donor Ledger & Receipt Archive Search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');

  useEffect(() => {
    if (accounts.length > 0) {
      setIncForm((p) => (accounts.some((a) => a.id === p.accountId) ? p : { ...p, accountId: accounts[0].id }));
      setExpForm((p) => (accounts.some((a) => a.id === p.accountId) ? p : { ...p, accountId: accounts[0].id }));
      setSubPayForm((p) => (accounts.some((a) => a.id === p.accountId) ? p : { ...p, accountId: accounts[0].id }));
      setTrfForm((p) => ({
        ...p,
        fromAccountId: accounts.some((a) => a.id === p.fromAccountId) ? p.fromAccountId : accounts[0].id,
        toAccountId: accounts.some((a) => a.id === p.toAccountId)
          ? p.toAccountId
          : accounts[1]?.id || accounts[0].id,
      }));
    }
  }, [accounts]);

  useEffect(() => {
    if (funds.length > 0) {
      setIncForm((p) => (funds.some((f) => f.id === p.fundId) ? p : { ...p, fundId: funds[0].id }));
      setExpForm((p) => (funds.some((f) => f.id === p.fundId) ? p : { ...p, fundId: funds[0].id }));
      setSubPayForm((p) => (funds.some((f) => f.id === p.fundId) ? p : { ...p, fundId: funds[0].id }));
    }
  }, [funds]);

  useEffect(() => {
    if (members.length > 0) {
      setSubPayForm((p) =>
        members.some((m) => m.memberId === p.memberId) ? p : { ...p, memberId: members[0].memberId }
      );
    }
  }, [members]);

  const accountNameById = (id: string) => accounts.find((a) => a.id === id)?.nameBn || id;
  const fundNameById = (id: string) => funds.find((f) => f.id === id)?.nameBn || id;

  const notify = (t: string) => {
    setErr('');
    setMsg(t);
    setTimeout(() => setMsg(''), 5000);
  };
  const fail = (e: unknown) => {
    setMsg('');
    setErr(e instanceof Error ? e.message : String(e));
  };

  // Live Multi-Item Calculator Totals (exact integer poisha)
  const computedLineItems: ExpenseLineItem[] = useMemo(() => {
    return calcItems.map((it) => {
      const qty = Math.max(0, Number(it.quantity) || 0);
      const unitPoisha = takaToPoisha(it.unitPriceTaka);
      const totalPricePoisha = Math.round(qty * unitPoisha);
      return {
        name: it.name.trim() || 'আইটেম',
        quantity: qty,
        unit: it.unit.trim() || 'টি',
        unitPricePoisha: unitPoisha,
        totalPricePoisha,
      };
    });
  }, [calcItems]);

  const calcGrandTotalPoisha = useMemo(
    () => computedLineItems.reduce((sum, i) => sum + i.totalPricePoisha, 0),
    [computedLineItems]
  );

  // 1. Income Management
  if (activeMenu === 'income') {
    const handleAddIncome = async (e: React.FormEvent) => {
      e.preventDefault();
      const amountPoisha = takaToPoisha(incForm.amountTaka);
      if (amountPoisha <= 0) {
        fail('সঠিক টাকার পরিমাণ লিখুন।');
        return;
      }
      setSubmitting(true);
      try {
        const created = await createIncomeTransaction({
          donorName: incForm.donorName,
          memberId: incForm.memberId,
          phone: incForm.phone,
          category: incForm.category,
          date: incForm.date,
          amountPoisha,
          paymentMethod: incForm.paymentMethod,
          accountId: incForm.accountId || accounts[0]?.id,
          fundId: incForm.fundId || funds[0]?.id,
          notes: incForm.notes,
          proofUrl: incForm.proofUrl,
          actorUid,
          actorName,
        });
        setIncForm({ ...incForm, donorName: '', memberId: '', phone: '', amountTaka: '', notes: '' });
        notify(`আয় সফলভাবে যুক্ত হয়েছে! রশিদ নম্বর: ${created.receiptNumber}`);
        setDocModal({ mode: 'receipt', income: created });
      } catch (e) {
        fail(e);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">আয় ব্যবস্থাপনা ও ডিজিটাল রশিদ</h2>
        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

        <form onSubmit={handleAddIncome} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-bold">নতুন আয় / অনুদান যুক্ত করুন</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              required
              placeholder="দাতা বা সদস্যের নাম *"
              value={incForm.donorName}
              onChange={(e) => setIncForm({ ...incForm, donorName: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <select
              value={incForm.memberId}
              onChange={(e) => {
                const mem = members.find((m) => m.memberId === e.target.value);
                setIncForm({
                  ...incForm,
                  memberId: e.target.value,
                  donorName: mem ? mem.nameBn : incForm.donorName,
                });
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">সদস্য আইডি (ঐচ্ছিক)</option>
              {members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.displayCode} — {m.nameBn}
                </option>
              ))}
            </select>
            <input
              placeholder="মোবাইল নম্বর"
              value={incForm.phone}
              onChange={(e) => setIncForm({ ...incForm, phone: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <select
              value={incForm.category}
              onChange={(e) => setIncForm({ ...incForm, category: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {INCOME_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="date"
              required
              value={incForm.date}
              onChange={(e) => setIncForm({ ...incForm, date: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.01"
              min="1"
              required
              placeholder="টাকার পরিমাণ (BDT ৳) *"
              value={incForm.amountTaka}
              onChange={(e) => setIncForm({ ...incForm, amountTaka: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
            />
            <select
              value={incForm.paymentMethod}
              onChange={(e) => setIncForm({ ...incForm, paymentMethod: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>{pm}</option>
              ))}
            </select>
            <select
              value={incForm.accountId}
              onChange={(e) => setIncForm({ ...incForm, accountId: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nameBn} (ব্যালেন্স: {formatTakaFromPoisha(a.currentBalancePoisha)})
                </option>
              ))}
            </select>
            <select
              value={incForm.fundId}
              onChange={(e) => setIncForm({ ...incForm, fundId: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.nameBn}</option>
              ))}
            </select>
          </div>
          <input
            placeholder="মন্তব্য / প্রমাণপত্র লিংক (ঐচ্ছিক)"
            value={incForm.notes}
            onChange={(e) => setIncForm({ ...incForm, notes: e.target.value })}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
          >
            {submitting ? 'সংরক্ষণ হচ্ছে...' : 'আয় সংরক্ষণ ও রশিদ তৈরি করুন'}
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">রশিদ নম্বর</th>
                <th className="px-4 py-3 text-left">তারিখ</th>
                <th className="px-4 py-3 text-left">দাতা / সদস্য</th>
                <th className="px-4 py-3 text-left">খাত ও অ্যাকাউন্ট</th>
                <th className="px-4 py-3 text-right">টাকা</th>
                <th className="px-4 py-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {incomes.map((inc) => (
                <tr key={inc.id} className={inc.status === 'voided' ? 'opacity-50 bg-red-50/40 dark:bg-red-950/20' : ''}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{inc.receiptNumber}</td>
                  <td className="px-4 py-3 text-xs">{formatDateBn(inc.date)}</td>
                  <td className="px-4 py-3 font-medium">{inc.donorName}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {inc.category} · {accountNameById(inc.accountId)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatTakaFromPoisha(inc.amountPoisha)}
                    {inc.status === 'voided' && <span className="block text-[10px] text-red-600">বাতিল (Voided)</span>}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setDocModal({ mode: 'receipt', income: inc })}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" /> রশিদ
                    </button>
                    {inc.status !== 'voided' && (
                      <button
                        onClick={() => setVoidTarget({ col: 'income', id: inc.id, num: inc.receiptNumber })}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline cursor-pointer"
                      >
                        <Ban className="h-3.5 w-3.5" /> Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {docModal && (
          <DocumentModal
            mode={docModal.mode}
            income={docModal.income}
            expense={docModal.expense}
            accountName={accountNameById(docModal.income?.accountId || docModal.expense?.accountId || '')}
            fundName={fundNameById(docModal.income?.fundId || docModal.expense?.fundId || '')}
            onClose={() => setDocModal(null)}
          />
        )}
        {voidTarget && (
          <VoidDialog
            docNum={voidTarget.num}
            reason={voidReason}
            setReason={setVoidReason}
            onCancel={() => setVoidTarget(null)}
            onConfirm={async () => {
              await voidFinancialTransaction({
                collectionName: voidTarget.col,
                docId: voidTarget.id,
                reason: voidReason || 'তথ্য সংশোধন',
                actorUid,
                actorName,
              });
              setVoidTarget(null);
              setVoidReason('');
              notify('লেনদেন রিভার্স / Void করা হয়েছে এবং Audit Log-এ সংরক্ষিত হয়েছে।');
            }}
          />
        )}
      </div>
    );
  }

  // 2. Smart Multi-Item Expense Calculator
  if (activeMenu === 'calculator') {
    const selectedCalcAccount = accounts.find((a) => a.id === (expForm.accountId || accounts[0]?.id));
    const willFailBalanceCheck =
      Boolean(expForm.autoApprove && hasPerm('approvals')) &&
      Boolean(selectedCalcAccount) &&
      calcGrandTotalPoisha > (selectedCalcAccount?.currentBalancePoisha || 0);

    const handleSaveVoucher = async (e: React.FormEvent) => {
      e.preventDefault();
      if (calcGrandTotalPoisha <= 0) {
        fail('কমপক্ষে একটি সঠিক আইটেম ও মূল্য যোগ করুন।');
        return;
      }
      setSubmitting(true);
      try {
        const created = await createExpenseTransaction({
          titleBn: expForm.titleBn,
          category: expForm.category,
          date: expForm.date,
          items: computedLineItems,
          paymentMethod: expForm.paymentMethod,
          accountId: expForm.accountId || accounts[0]?.id,
          fundId: expForm.fundId || funds[0]?.id,
          payeeName: expForm.payeeName,
          notes: expForm.notes,
          billUrl: expForm.billUrl,
          autoApprove: expForm.autoApprove && hasPerm('approvals'),
          actorUid,
          actorName,
        });
        setExpForm({ ...expForm, titleBn: '', payeeName: '', notes: '' });
        setCalcItems([{ name: '', quantity: 1, unit: 'টি', unitPriceTaka: '' }]);
        notify(
          `ভাউচার ${created.voucherNumber} তৈরি হয়েছে (${
            created.approvalStatus === 'approved' ? 'অনুমোদিত' : 'অনুমোদনের জন্য প্রেরিত'
          })!`
        );
        setDocModal({ mode: 'voucher', expense: created });
      } catch (e) {
        fail(e);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-700" />
            স্মার্ট মাল্টি-আইটেম ব্যয় ক্যালকুলেটর ও ভাউচার তৈরি
          </h2>
          <p className="text-xs text-slate-500">একটি ভাউচারের অধীনে একাধিক আইটেম যোগ করুন, লাইভ মোট হিসাব হবে এবং স্বয়ংক্রিয় ভাউচার তৈরি হবে।</p>
        </div>

        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

        <form onSubmit={handleSaveVoucher} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              required
              placeholder="ব্যয়ের শিরোনাম (যেমন: ত্রাণ সামগ্রী ক্রয়) *"
              value={expForm.titleBn}
              onChange={(e) => setExpForm({ ...expForm, titleBn: e.target.value })}
              className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <select
              value={expForm.category}
              onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="date"
              required
              value={expForm.date}
              onChange={(e) => setExpForm({ ...expForm, date: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <select
              value={expForm.accountId}
              onChange={(e) => setExpForm({ ...expForm, accountId: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nameBn} (ব্যালেন্স: {formatTakaFromPoisha(a.currentBalancePoisha)})
                </option>
              ))}
            </select>
            <select
              value={expForm.fundId}
              onChange={(e) => setExpForm({ ...expForm, fundId: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>{f.nameBn}</option>
              ))}
            </select>
          </div>

          {/* Dynamic Multi-Item Rows */}
          <div className="space-y-3 border-t border-b border-slate-200 dark:border-slate-800 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">খরচের আইটেম তালিকা</h3>
              <button
                type="button"
                onClick={() => setCalcItems([...calcItems, { name: '', quantity: 1, unit: 'টি', unitPriceTaka: '' }])}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                + আরও আইটেম যোগ করুন
              </button>
            </div>

            {calcItems.map((item, idx) => {
              const rowPoisha = computedLineItems[idx]?.totalPricePoisha || 0;
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    required
                    placeholder="আইটেমের নাম (যেমন: চাল কেনা)"
                    value={item.name}
                    onChange={(e) => {
                      const next = [...calcItems];
                      next[idx].name = e.target.value;
                      setCalcItems(next);
                    }}
                    className="col-span-12 sm:col-span-4 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="পরিমাণ"
                    value={item.quantity}
                    onChange={(e) => {
                      const next = [...calcItems];
                      next[idx].quantity = Number(e.target.value);
                      setCalcItems(next);
                    }}
                    className="col-span-4 sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-mono"
                  />
                  <input
                    placeholder="একক (কেজি/টি)"
                    value={item.unit}
                    onChange={(e) => {
                      const next = [...calcItems];
                      next[idx].unit = e.target.value;
                      setCalcItems(next);
                    }}
                    className="col-span-4 sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="একক দর (৳)"
                    value={item.unitPriceTaka}
                    onChange={(e) => {
                      const next = [...calcItems];
                      next[idx].unitPriceTaka = e.target.value;
                      setCalcItems(next);
                    }}
                    className="col-span-4 sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-mono"
                  />
                  <div className="col-span-10 sm:col-span-1 text-right font-semibold text-xs tabular-nums">
                    {formatTakaFromPoisha(rowPoisha)}
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-right">
                    {calcItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCalcItems(calcItems.filter((_, i) => i !== idx))}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-end gap-4 pt-3">
              <span className="text-sm text-slate-500">সর্বমোট ব্যয় (Grand Total):</span>
              <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                {formatTakaFromPoisha(calcGrandTotalPoisha)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              placeholder="প্রাপকের নাম (Payee)"
              value={expForm.payeeName}
              onChange={(e) => setExpForm({ ...expForm, payeeName: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              placeholder="মন্তব্য"
              value={expForm.notes}
              onChange={(e) => setExpForm({ ...expForm, notes: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>

          {hasPerm('approvals') && (
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={expForm.autoApprove}
                onChange={(e) => setExpForm({ ...expForm, autoApprove: e.target.checked })}
                className="accent-emerald-700"
              />
              সরাসরি অনুমোদন (Approve) করে অ্যাকাউন্ট থেকে টাকা সমন্বয় করুন (বন্ধ রাখলে Pending হিসেবে যাবে)
            </label>
          )}

          {willFailBalanceCheck && selectedCalcAccount && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
              <span>
                সতর্কতা: <strong>{selectedCalcAccount.nameBn}</strong>-এ বর্তমান ব্যালেন্স{' '}
                <strong>{formatTakaFromPoisha(selectedCalcAccount.currentBalancePoisha)}</strong>, যা এই ব্যয়ের (
                {formatTakaFromPoisha(calcGrandTotalPoisha)}) চেয়ে কম। প্রথমে আয়/ব্যালেন্স যুক্ত করুন অথবা Pending হিসেবে জমা দিন।
              </span>
              <button
                type="button"
                onClick={() => setExpForm((p) => ({ ...p, autoApprove: false }))}
                className="rounded bg-amber-700 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800 cursor-pointer"
              >
                Pending মোড নির্বাচন করুন
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
          >
            {submitting ? 'ভাউচার তৈরি হচ্ছে...' : 'ব্যয় ভাউচার সংরক্ষণ করুন'}
          </button>
        </form>

        {docModal && (
          <DocumentModal
            mode={docModal.mode}
            income={docModal.income}
            expense={docModal.expense}
            accountName={accountNameById(docModal.expense?.accountId || '')}
            fundName={fundNameById(docModal.expense?.fundId || '')}
            onClose={() => setDocModal(null)}
          />
        )}
      </div>
    );
  }

  // 3. Expense Management List
  if (activeMenu === 'expenses' || activeMenu === 'approvals') {
    const filteredExpenses =
      activeMenu === 'approvals' ? expenses.filter((e) => e.approvalStatus === 'pending') : expenses;

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {activeMenu === 'approvals' ? 'ব্যয় অনুমোদন তালিকা (Pending Approvals)' : 'ব্যয় ব্যবস্থাপনা ও ভাউচার'}
        </h2>
        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">ভাউচার নং</th>
                <th className="px-4 py-3 text-left">তারিখ</th>
                <th className="px-4 py-3 text-left">শিরোনাম ও খাত</th>
                <th className="px-4 py-3 text-left">অনুমোদন</th>
                <th className="px-4 py-3 text-right">মোট টাকা</th>
                <th className="px-4 py-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className={exp.status === 'voided' ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{exp.voucherNumber}</td>
                  <td className="px-4 py-3 text-xs">{formatDateBn(exp.date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{exp.titleBn}</div>
                    <div className="text-xs text-slate-500">
                      {exp.category} · {toBengaliDigits(exp.items.length)} টি আইটেম · {accountNameById(exp.accountId)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {exp.approvalStatus === 'approved'
                      ? 'অনুমোদিত'
                      : exp.approvalStatus === 'pending'
                      ? 'অপেক্ষমান (Pending)'
                      : exp.approvalStatus === 'rejected'
                      ? 'প্রত্যাখ্যাত'
                      : 'বাতিল'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums">
                    {formatTakaFromPoisha(exp.totalAmountPoisha)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setDocModal({ mode: 'voucher', expense: exp })}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" /> ভাউচার
                    </button>
                    {exp.approvalStatus === 'pending' && hasPerm('approvals') && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await processExpenseApproval({ expenseId: exp.id, decision: 'approved', actorUid, actorName });
                              notify(`${exp.voucherNumber} অনুমোদিত হয়েছে এবং ব্যালেন্স সমন্বয় হয়েছে।`);
                            } catch (e) {
                              fail(e);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white cursor-pointer"
                        >
                          <Check className="h-3 w-3" /> অনুমোদন
                        </button>
                        <button
                          onClick={async () => {
                            await processExpenseApproval({ expenseId: exp.id, decision: 'rejected', actorUid, actorName });
                            notify(`${exp.voucherNumber} প্রত্যাখ্যান করা হয়েছে।`);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 cursor-pointer"
                        >
                          <X className="h-3 w-3" /> বাতিল
                        </button>
                      </>
                    )}
                    {exp.status !== 'voided' && activeMenu === 'expenses' && (
                      <button
                        onClick={() => setVoidTarget({ col: 'expenses', id: exp.id, num: exp.voucherNumber })}
                        className="text-xs text-red-600 hover:underline cursor-pointer"
                      >
                        Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                    {activeMenu === 'approvals' ? 'অনুমোদনের জন্য কোনো অপেক্ষমান ভাউচার নেই।' : 'কোনো ব্যয় ভাউচার পাওয়া যায়নি।'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {docModal && (
          <DocumentModal
            mode={docModal.mode}
            expense={docModal.expense}
            accountName={accountNameById(docModal.expense?.accountId || '')}
            fundName={fundNameById(docModal.expense?.fundId || '')}
            onClose={() => setDocModal(null)}
          />
        )}
        {voidTarget && (
          <VoidDialog
            docNum={voidTarget.num}
            reason={voidReason}
            setReason={setVoidReason}
            onCancel={() => setVoidTarget(null)}
            onConfirm={async () => {
              await voidFinancialTransaction({
                collectionName: voidTarget.col,
                docId: voidTarget.id,
                reason: voidReason || 'সংশোধন',
                actorUid,
                actorName,
              });
              setVoidTarget(null);
              setVoidReason('');
              notify('ভাউচার রিভার্স / Void করা হয়েছে।');
            }}
          />
        )}
      </div>
    );
  }

  // 4. Donor & Member Ledger
  if (activeMenu === 'ledger') {
    const activeIncomes = incomes.filter((i) => i.status !== 'voided');
    const grouped = new Map<
      string,
      { name: string; memberId: string; totalPoisha: number; monthlyPoisha: number; generalPoisha: number; specialPoisha: number; entries: IncomeEntry[] }
    >();

    activeIncomes.forEach((inc) => {
      const key = inc.memberId || inc.donorName;
      if (!grouped.has(key)) {
        grouped.set(key, {
          name: inc.donorName,
          memberId: inc.memberId || 'সাধারণ দাতা',
          totalPoisha: 0,
          monthlyPoisha: 0,
          generalPoisha: 0,
          specialPoisha: 0,
          entries: [],
        });
      }
      const g = grouped.get(key)!;
      g.totalPoisha += inc.amountPoisha;
      if (inc.category === 'মাসিক চাঁদা') g.monthlyPoisha += inc.amountPoisha;
      else if (inc.category === 'বিশেষ তহবিল' || inc.category === 'জরুরি অনুদান') g.specialPoisha += inc.amountPoisha;
      else g.generalPoisha += inc.amountPoisha;
      g.entries.push(inc);
    });

    const rows = Array.from(grouped.values()).filter(
      (r) =>
        !ledgerSearch.trim() ||
        r.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        r.memberId.toLowerCase().includes(ledgerSearch.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">দাতা ও সদস্য লেজার (Donor & Member Ledger)</h2>
            <p className="text-xs text-slate-500">প্রতিটি ব্যক্তি ও সদস্যের মোট জমা, মাসিক চাঁদা, সাধারণ/বিশেষ অনুদান এবং ব্যক্তিগত পেমেন্ট ইতিহাস।</p>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              placeholder="নাম বা মেম্বার আইডি খুঁজুন..."
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">নাম ও মেম্বার আইডি</th>
                <th className="px-4 py-3 text-right">মাসিক চাঁদা</th>
                <th className="px-4 py-3 text-right">সাধারণ অনুদান</th>
                <th className="px-4 py-3 text-right">বিশেষ/জরুরি</th>
                <th className="px-4 py-3 text-right">সর্বমোট জমা</th>
                <th className="px-4 py-3 text-right">লেনদেন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs font-mono text-slate-500">{r.memberId}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTakaFromPoisha(r.monthlyPoisha)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTakaFromPoisha(r.generalPoisha)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatTakaFromPoisha(r.specialPoisha)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                    {formatTakaFromPoisha(r.totalPoisha)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs">{toBengaliDigits(r.entries.length)} বার</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                    কোনো দাতার লেজার তথ্য পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 5. Monthly Subscription Management
  if (activeMenu === 'subscriptions') {
    const toggleMonth = (m: number) => {
      setSubPayForm((prev) => ({
        ...prev,
        months: prev.months.includes(m) ? prev.months.filter((x) => x !== m) : [...prev.months, m],
      }));
    };

    const handleCollect = async (e: React.FormEvent) => {
      e.preventDefault();
      const member = members.find((m) => m.memberId === subPayForm.memberId);
      if (!member || subPayForm.months.length === 0) {
        fail('সদস্য এবং কমপক্ষে একটি মাস নির্বাচন করুন।');
        return;
      }
      setSubmitting(true);
      try {
        const inc = await recordMultiMonthSubscriptionPayment({
          member,
          year: subYear,
          months: subPayForm.months.sort((a, b) => a - b),
          paidPerMonthPoisha: takaToPoisha(subPayForm.perMonthTaka),
          accountId: subPayForm.accountId || accounts[0]?.id,
          fundId: subPayForm.fundId || funds[0]?.id,
          paymentMethod: subPayForm.paymentMethod,
          date: subPayForm.date,
          actorUid,
          actorName,
        });
        notify(`${member.nameBn}-এর ${subPayForm.months.length} মাসের চাঁদা জমা হয়েছে! রশিদ: ${inc.receiptNumber}`);
        setDocModal({ mode: 'receipt', income: inc });
      } catch (e) {
        fail(e);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">মাসিক চাঁদা ব্যবস্থাপনা (Monthly Subscription)</h2>
          <select
            value={subYear}
            onChange={(e) => setSubYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{toBengaliDigits(y)}</option>
            ))}
          </select>
        </div>

        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

        <form onSubmit={handleCollect} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-bold">এক বা একাধিক মাসের চাঁদা গ্রহণ করুন (Partial / Multi-Month)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              required
              value={subPayForm.memberId}
              onChange={(e) => {
                const mem = members.find((m) => m.memberId === e.target.value);
                setSubPayForm({
                  ...subPayForm,
                  memberId: e.target.value,
                  perMonthTaka: mem ? String(mem.monthlyFeePoisha / 100) : subPayForm.perMonthTaka,
                });
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            >
              <option value="">-- সদস্য নির্বাচন --</option>
              {members.map((m) => (
                <option key={m.memberId} value={m.memberId}>
                  {m.displayCode} — {m.nameBn}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              required
              placeholder="প্রতি মাসের টাকা"
              value={subPayForm.perMonthTaka}
              onChange={(e) => setSubPayForm({ ...subPayForm, perMonthTaka: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
            <select
              value={subPayForm.accountId}
              onChange={(e) => setSubPayForm({ ...subPayForm, accountId: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.nameBn}</option>
              ))}
            </select>
            <input
              type="date"
              value={subPayForm.date}
              onChange={(e) => setSubPayForm({ ...subPayForm, date: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {BN_MONTHS.map((mName, idx) => {
              const mNum = idx + 1;
              const active = subPayForm.months.includes(mNum);
              return (
                <button
                  type="button"
                  key={mNum}
                  onClick={() => toggleMonth(mNum)}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold cursor-pointer ${
                    active ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
          >
            চাঁদা জমা করুন ও রশিদ তৈরি করুন
          </button>
        </form>

        {/* Member x 12 Months Matrix */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-3 text-left sticky left-0 bg-slate-50 dark:bg-slate-800">সদস্য</th>
                {BN_MONTHS.map((m) => (
                  <th key={m} className="px-2 py-3 text-center">{m.slice(0, 4)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {members.map((mem) => (
                <tr key={mem.memberId}>
                  <td className="px-3 py-2.5 font-semibold whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900">
                    {mem.displayCode} · {mem.nameBn}
                  </td>
                  {BN_MONTHS.map((_, idx) => {
                    const mNum = idx + 1;
                    const rec = subscriptions.find(
                      (s) => s.memberId === mem.memberId && s.year === subYear && s.month === mNum
                    );
                    const status = rec?.status || 'unpaid';
                    return (
                      <td key={mNum} className="px-2 py-2.5 text-center">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Due'}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {docModal && (
          <DocumentModal
            mode={docModal.mode}
            income={docModal.income}
            accountName={accountNameById(docModal.income?.accountId || '')}
            fundName={fundNameById(docModal.income?.fundId || '')}
            onClose={() => setDocModal(null)}
          />
        )}
      </div>
    );
  }

  // 6. Account Management & Internal Fund Transfer
  if (activeMenu === 'accounts') {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">অ্যাকাউন্ট, তহবিল ও ইন্টারনাল ট্রান্সফার</h2>
        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

        {/* Account Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
              <p className="text-xs text-slate-500 uppercase">{acc.type}</p>
              <h3 className="font-bold text-base mt-0.5">{acc.nameBn}</h3>
              <p className="text-xs text-slate-400">{acc.accountNumberMasked}</p>
              <p className="mt-3 text-xl font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                {formatTakaFromPoisha(acc.currentBalancePoisha)}
              </p>
            </div>
          ))}
        </div>

        {/* Internal Transfer (Not counted as Income or Expense) */}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await createFundTransferTransaction({
                fromAccountId: trfForm.fromAccountId,
                toAccountId: trfForm.toAccountId,
                amountPoisha: takaToPoisha(trfForm.amountTaka),
                date: trfForm.date,
                notes: trfForm.notes,
                actorUid,
                actorName,
              });
              setTrfForm({ ...trfForm, amountTaka: '', notes: '' });
              notify('অ্যাকাউন্ট ট্রান্সফার সম্পন্ন হয়েছে (আয় বা ব্যয় হিসেবে গণনা হয়নি)।');
            } catch (e) {
              fail(e);
            }
          }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-emerald-700" />
            অ্যাকাউন্ট-টু-অ্যাকাউন্ট টাকা স্থানান্তর (Internal Transfer)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={trfForm.fromAccountId}
              onChange={(e) => setTrfForm({ ...trfForm, fromAccountId: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>প্রেরক: {a.nameBn}</option>
              ))}
            </select>
            <select
              value={trfForm.toAccountId}
              onChange={(e) => setTrfForm({ ...trfForm, toAccountId: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>প্রাপক: {a.nameBn}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              required
              placeholder="পরিমাণ (টাকা)"
              value={trfForm.amountTaka}
              onChange={(e) => setTrfForm({ ...trfForm, amountTaka: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-mono"
            />
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer">
              ট্রান্সফার করুন
            </button>
          </div>
        </form>

        {/* Add New Account & New Fund & Financial Year */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const openingPoisha = takaToPoisha(newAcc.openingTaka);
              await saveAccount({
                id: generateDocId('acc'),
                nameBn: newAcc.nameBn,
                type: newAcc.type,
                accountNumberMasked: newAcc.accountNumberMasked,
                openingBalancePoisha: openingPoisha,
                currentBalancePoisha: openingPoisha,
                isActive: true,
              });
              setNewAcc({ nameBn: '', type: 'other', accountNumberMasked: '', openingTaka: '0' });
              notify('নতুন অ্যাকাউন্ট যোগ করা হয়েছে!');
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h3 className="text-sm font-bold">নতুন অ্যাকাউন্ট খুলুন</h3>
            <input
              required
              placeholder="অ্যাকাউন্ট নাম"
              value={newAcc.nameBn}
              onChange={(e) => setNewAcc({ ...newAcc, nameBn: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <select
              value={newAcc.type}
              onChange={(e) => setNewAcc({ ...newAcc, type: e.target.value as Account['type'] })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            >
              <option value="cash">নগদ ক্যাশ</option>
              <option value="bank">ব্যাংক</option>
              <option value="bkash">বিকাশ</option>
              <option value="nagad">নগদ</option>
              <option value="other">অন্যান্য</option>
            </select>
            <input
              type="number"
              placeholder="প্রারম্ভিক স্থিতি (Opening Balance)"
              value={newAcc.openingTaka}
              onChange={(e) => setNewAcc({ ...newAcc, openingTaka: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <button type="submit" className="w-full rounded-lg bg-slate-900 dark:bg-emerald-700 py-2 text-xs font-semibold text-white cursor-pointer">
              অ্যাকাউন্ট যোগ করুন
            </button>
          </form>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveFund({
                id: generateDocId('fund'),
                nameBn: newFund.nameBn,
                descriptionBn: newFund.descriptionBn,
                balancePoisha: 0,
                isActive: true,
              });
              setNewFund({ nameBn: '', descriptionBn: '' });
              notify('নতুন তহবিল (Fund) তৈরি হয়েছে!');
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h3 className="text-sm font-bold">নতুন তহবিল (Fund) তৈরি</h3>
            <input
              required
              placeholder="তহবিলের নাম"
              value={newFund.nameBn}
              onChange={(e) => setNewFund({ ...newFund, nameBn: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              placeholder="বিবরণ"
              value={newFund.descriptionBn}
              onChange={(e) => setNewFund({ ...newFund, descriptionBn: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <button type="submit" className="w-full rounded-lg bg-slate-900 dark:bg-emerald-700 py-2 text-xs font-semibold text-white cursor-pointer">
              তহবিল তৈরি করুন
            </button>
          </form>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const yearId = `fy_${newYear.year}`;
              await setDoc(doc(db, 'financialYears', yearId), {
                id: yearId,
                year: Number(newYear.year),
                openingBalancePoisha: takaToPoisha(newYear.openingTaka),
                isClosed: false,
                updatedAt: serverTimestamp(),
              });
              notify(`${newYear.year} অর্থবছরের প্রারম্ভিক স্থিতি সংরক্ষিত হয়েছে!`);
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <h3 className="text-sm font-bold">অর্থবছরের প্রারম্ভিক স্থিতি</h3>
            <input
              type="number"
              required
              value={newYear.year}
              onChange={(e) => setNewYear({ ...newYear, year: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              type="number"
              required
              placeholder="প্রারম্ভিক স্থিতি (৳)"
              value={newYear.openingTaka}
              onChange={(e) => setNewYear({ ...newYear, openingTaka: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <button type="submit" className="w-full rounded-lg bg-slate-900 dark:bg-emerald-700 py-2 text-xs font-semibold text-white cursor-pointer">
              প্রারম্ভিক স্থিতি সেভ করুন
            </button>
          </form>
        </div>

        {/* Transfer & Financial Year History */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-sm font-bold mb-3">সাম্প্রতিক ইন্টারনাল ট্রান্সফার ({toBengaliDigits(transfers.length)}) · অর্থবছর ({toBengaliDigits(financialYears.length)})</h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            {transfers.slice(0, 8).map((t) => (
              <div key={t.id} className="py-2.5 flex justify-between">
                <span>
                  {accountNameById(t.fromAccountId)} → {accountNameById(t.toAccountId)} ({formatDateBn(t.date)})
                </span>
                <strong className="tabular-nums">{formatTakaFromPoisha(t.amountPoisha)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 7. Receipt & Voucher Archive
  const matchingIncomes = incomes.filter(
    (i) =>
      !archiveSearch.trim() ||
      i.receiptNumber.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      i.verificationCode.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      i.donorName.toLowerCase().includes(archiveSearch.toLowerCase())
  );
  const matchingExpenses = expenses.filter(
    (e) =>
      !archiveSearch.trim() ||
      e.voucherNumber.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      e.verificationCode.toLowerCase().includes(archiveSearch.toLowerCase()) ||
      e.titleBn.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-700" />
          রশিদ ও ভাউচার আর্কাইভ (A4 Print & PDF)
        </h2>
        <input
          value={archiveSearch}
          onChange={(e) => setArchiveSearch(e.target.value)}
          placeholder="REC-2026-001 বা কোড দিয়ে খুঁজুন..."
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-sm font-bold mb-3">আয় রশিদ (Receipts)</h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {matchingIncomes.map((inc) => (
              <div key={inc.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-400">
                    {inc.receiptNumber} · {inc.verificationCode}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{inc.donorName} ({formatDateBn(inc.date)})</p>
                </div>
                <button
                  onClick={() => setDocModal({ mode: 'receipt', income: inc })}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  প্রিন্ট / PDF
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h3 className="text-sm font-bold mb-3">ব্যয় ভাউচার (Vouchers)</h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            {matchingExpenses.map((exp) => (
              <div key={exp.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                    {exp.voucherNumber} · {exp.verificationCode}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{exp.titleBn} ({formatDateBn(exp.date)})</p>
                </div>
                <button
                  onClick={() => setDocModal({ mode: 'voucher', expense: exp })}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  প্রিন্ট / PDF
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {docModal && (
        <DocumentModal
          mode={docModal.mode}
          income={docModal.income}
          expense={docModal.expense}
          accountName={accountNameById(docModal.income?.accountId || docModal.expense?.accountId || '')}
          fundName={fundNameById(docModal.income?.fundId || docModal.expense?.fundId || '')}
          onClose={() => setDocModal(null)}
        />
      )}
    </div>
  );
};

const VoidDialog: React.FC<{
  docNum: string;
  reason: string;
  setReason: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ docNum, reason, setReason, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
      <h3 className="text-base font-bold text-slate-900 dark:text-white">লেনদেন Void / Reversal — {docNum}</h3>
      <p className="text-xs text-slate-500">আর্থিক নিরাপত্তার জন্য কোনো রেকর্ড স্থায়ীভাবে মুছে ফেলা যায় না। Void করলে ব্যালেন্স স্বয়ংক্রিয়ভাবে সমন্বয় হবে ও Audit Log-এ রেকর্ড থাকবে।</p>
      <input
        required
        placeholder="বাতিল বা সংশোধনের কারণ লিখুন..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
      />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold cursor-pointer">
          ফিরে যান
        </button>
        <button onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white cursor-pointer">
          নিশ্চিত Void করুন
        </button>
      </div>
    </div>
  </div>
);
