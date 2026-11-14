import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { Download, Printer, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExpenseEntry, IncomeEntry } from '../types/models';
import { formatDateBn, formatTakaFromPoisha, poishaToTakaWordsBn, toBengaliDigits } from '../utils/bengali';

interface DocumentModalProps {
  mode: 'receipt' | 'voucher';
  income?: IncomeEntry;
  expense?: ExpenseEntry;
  accountName?: string;
  fundName?: string;
  onClose: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  mode,
  income,
  expense,
  accountName,
  fundName,
  onClose,
}) => {
  const { websiteSettings } = useApp();
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const docNumber = mode === 'receipt' ? income?.receiptNumber : expense?.voucherNumber;
  const verificationCode = mode === 'receipt' ? income?.verificationCode : expense?.verificationCode;
  const totalPoisha = mode === 'receipt' ? income?.amountPoisha ?? 0 : expense?.totalAmountPoisha ?? 0;
  const docDate = mode === 'receipt' ? income?.date ?? '' : expense?.date ?? '';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setExporting(true);
    try {
      // Build clean A4 vector PDF (plus printable Bengali window fallback for full Unicode shaping)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(websiteSettings.orgNameEn || 'Kulkuri Ideal Society Implementation Council', 105, 22, {
        align: 'center',
      });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(websiteSettings.contactEmail || '', 105, 28, { align: 'center' });
      pdf.line(15, 34, 195, 34);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text(mode === 'receipt' ? 'OFFICIAL MONEY RECEIPT' : 'OFFICIAL PAYMENT VOUCHER', 105, 44, {
        align: 'center',
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Document No: ${docNumber || ''}`, 20, 56);
      pdf.text(`Date: ${docDate}`, 140, 56);
      pdf.text(`Verification Code: ${verificationCode || ''}`, 20, 63);
      pdf.text(`Account: ${accountName || ''}`, 140, 63);

      let y = 76;
      if (mode === 'receipt' && income) {
        pdf.text(`Received From: ${income.donorName}`, 20, y);
        y += 8;
        pdf.text(`Category: ${income.category}`, 20, y);
        y += 8;
        pdf.text(`Payment Method: ${income.paymentMethod || 'Cash'}`, 20, y);
        y += 8;
        pdf.text(`Fund: ${fundName || income.fundId}`, 20, y);
        y += 12;
      } else if (mode === 'voucher' && expense) {
        pdf.text(`Voucher Title: ${expense.titleBn}`, 20, y);
        y += 8;
        pdf.text(`Category: ${expense.category} | Status: ${expense.approvalStatus.toUpperCase()}`, 20, y);
        y += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Item', 20, y);
        pdf.text('Qty', 110, y);
        pdf.text('Unit Price', 135, y);
        pdf.text('Total (BDT)', 170, y);
        y += 4;
        pdf.line(20, y, 190, y);
        y += 6;
        pdf.setFont('helvetica', 'normal');
        expense.items.forEach((item) => {
          pdf.text(item.name.slice(0, 45), 20, y);
          pdf.text(`${item.quantity} ${item.unit}`, 110, y);
          pdf.text((item.unitPricePoisha / 100).toFixed(2), 135, y);
          pdf.text((item.totalPricePoisha / 100).toFixed(2), 170, y);
          y += 7;
        });
        y += 6;
      }

      pdf.line(20, y, 190, y);
      y += 9;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(`Total Amount: BDT ${(totalPoisha / 100).toLocaleString('en-IN')}`, 20, y);

      y += 30;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.line(25, y, 80, y);
      pdf.line(130, y, 185, y);
      pdf.text('Treasurer Signature', 35, y + 6);
      pdf.text('President Signature', 140, y + 6);

      pdf.save(`${docNumber || 'document'}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            <span className="font-semibold text-slate-900">
              {mode === 'receipt' ? 'ডিজিটাল রশিদ (Money Receipt)' : 'ডিজিটাল ভাউচার (Expense Voucher)'} — {docNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              প্রিন্ট / বাংলা PDF
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              {exporting ? 'তৈরি হচ্ছে...' : 'PDF ডাউনলোড'}
            </button>
            <button
              onClick={onClose}
              aria-label="বন্ধ করুন"
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable A4 Sheet */}
        <div ref={printRef} className="print-area p-8 md:p-10 text-slate-900 bg-white">
          <div className="border-2 border-emerald-900/20 p-6 md:p-8 rounded-lg">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-4">
                {websiteSettings.logoUrl ? (
                  <img
                    src={websiteSettings.logoUrl}
                    alt={websiteSettings.orgNameBn}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 rounded-full object-cover border border-emerald-200"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-emerald-800 text-white flex items-center justify-center text-2xl font-bold shrink-0">
                    ক
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-emerald-900">{websiteSettings.orgNameBn}</h2>
                  <p className="text-xs text-slate-600">{websiteSettings.orgNameEn}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{websiteSettings.officeAddressBn}</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <span className="inline-block border border-emerald-800 px-3 py-1 text-xs font-bold tracking-wider text-emerald-900 uppercase">
                  {mode === 'receipt' ? 'অর্থ প্রাপ্তি রশিদ' : 'ব্যয় ভাউচার'}
                </span>
                <p className="mt-1.5 font-mono text-sm font-bold text-slate-900">{docNumber}</p>
                <p className="text-xs text-slate-500">তারিখ: {formatDateBn(docDate)}</p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
              {mode === 'receipt' && income ? (
                <>
                  <div>
                    <span className="text-slate-500">দাতা / সদস্যের নাম: </span>
                    <strong className="text-slate-900">{income.donorName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">আয়ের খাত: </span>
                    <strong className="text-slate-900">{income.category}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">অ্যাকাউন্ট: </span>
                    <strong className="text-slate-900">{accountName || income.accountId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">তহবিল (Fund): </span>
                    <strong className="text-slate-900">{fundName || income.fundId}</strong>
                  </div>
                  {income.memberId && (
                    <div>
                      <span className="text-slate-500">সদস্য আইডি: </span>
                      <strong className="font-mono text-slate-900">{income.memberId}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">পেমেন্ট মাধ্যম: </span>
                    <strong className="text-slate-900">{income.paymentMethod || 'নগদ'}</strong>
                  </div>
                </>
              ) : expense ? (
                <>
                  <div>
                    <span className="text-slate-500">ব্যয়ের শিরোনাম: </span>
                    <strong className="text-slate-900">{expense.titleBn}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">ব্যয়ের খাত: </span>
                    <strong className="text-slate-900">{expense.category}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">অ্যাকাউন্ট: </span>
                    <strong className="text-slate-900">{accountName || expense.accountId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">অনুমোদনের অবস্থা: </span>
                    <strong className="text-slate-900">
                      {expense.approvalStatus === 'approved'
                        ? 'অনুমোদিত (Approved)'
                        : expense.approvalStatus === 'pending'
                        ? 'অপেক্ষমান (Pending)'
                        : 'বাতিল / প্রত্যাখ্যাত'}
                    </strong>
                  </div>
                  {expense.payeeName && (
                    <div>
                      <span className="text-slate-500">প্রাপক: </span>
                      <strong className="text-slate-900">{expense.payeeName}</strong>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Itemized Details */}
            {mode === 'voucher' && expense && (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-sm border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-emerald-900/5 text-left text-xs font-semibold text-slate-700">
                      <th className="border border-slate-200 px-3 py-2">ক্রম</th>
                      <th className="border border-slate-200 px-3 py-2">বিবরণ</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">পরিমাণ</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">একক দর</th>
                      <th className="border border-slate-200 px-3 py-2 text-right">মোট টাকা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expense.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="border border-slate-200 px-3 py-2 tabular-nums">
                          {toBengaliDigits(idx + 1)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2">{item.name}</td>
                        <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                          {toBengaliDigits(item.quantity)} {item.unit}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right tabular-nums">
                          {formatTakaFromPoisha(item.unitPricePoisha)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-semibold tabular-nums">
                          {formatTakaFromPoisha(item.totalPricePoisha)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Box */}
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-b border-slate-200 py-4">
              <div>
                <p className="text-xs text-slate-500">কথায়:</p>
                <p className="text-base font-semibold text-slate-900">{poishaToTakaWordsBn(totalPoisha)}</p>
                {(income?.notes || expense?.notes) && (
                  <p className="mt-1 text-xs text-slate-600">মন্তব্য: {income?.notes || expense?.notes}</p>
                )}
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-5 py-3 text-right">
                <p className="text-xs text-emerald-800">মোট পরিমাণ</p>
                <p className="text-2xl font-bold text-emerald-950 tabular-nums">
                  {formatTakaFromPoisha(totalPoisha)}
                </p>
              </div>
            </div>

            {/* Verification & Signatures */}
            <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
              <div className="text-xs text-slate-500">
                <p>যাচাইকরণ কোড (Verification Code):</p>
                <p className="font-mono text-sm font-bold text-slate-800 mt-0.5">{verificationCode}</p>
                <p className="mt-1">সংগঠনের আর্থিক স্বচ্ছতা পোর্টালে কোডটি দিয়ে যাচাই করা যাবে।</p>
              </div>
              <div className="flex gap-10 pt-6">
                <div className="text-center">
                  <div className="w-32 border-t border-slate-400 pt-1.5 text-xs font-semibold text-slate-700">
                    ১. {websiteSettings.treasurerTitleBn || 'অর্থ সম্পাদক'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="w-32 border-t border-slate-400 pt-1.5 text-xs font-semibold text-slate-700">
                    ২. {websiteSettings.presidentTitleBn || 'সভাপতি'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
