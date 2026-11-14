import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  KeyRound,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  FirebaseVerificationReport,
  verifyFirebaseServices,
} from '../services/firebaseVerification';

interface Props {
  compact?: boolean;
}

const getBadgeStyle = (status: string) => {
  if (status === 'Connected' || status === 'Ready') {
    return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  }
  if (status === 'Permission Denied') {
    return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  }
  return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800';
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'Connected' || status === 'Ready') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
  }
  if (status === 'Permission Denied') {
    return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
  }
  return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />;
};

export const FirebaseConnectionStatus: React.FC<Props> = ({ compact = false }) => {
  const { firebaseUser } = useApp();
  const [report, setReport] = useState<FirebaseVerificationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const runChecks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await verifyFirebaseServices();
      setReport(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks, firebaseUser?.uid, firebaseUser?.emailVerified]);

  const serviceRows = report
    ? [
        {
          key: 'app',
          label: 'Firebase App',
          icon: Server,
          check: report.firebaseApp,
        },
        {
          key: 'auth',
          label: 'Authentication',
          icon: KeyRound,
          check: report.authentication,
        },
        {
          key: 'firestore',
          label: 'Firestore',
          icon: Database,
          check: report.firestore,
        },
        {
          key: 'storage',
          label: 'Storage',
          icon: HardDrive,
          check: report.storage,
        },
      ]
    : [];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
            Firebase Connection Status
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            নিরাপদ, রুল-ভিত্তিক (Read-only & Permission-aware) সার্ভিস যাচাই — কোনো আর্থিক রেকর্ড তৈরি বা পরিবর্তন করা হয় না
          </p>
        </div>
        <button
          type="button"
          onClick={runChecks}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'যাচাই চলছে...' : 'পুনরায় যাচাই করুন'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}

      {!report && loading ? (
        <div className="py-6 text-center text-xs text-slate-500">
          Firebase App, Authentication, Firestore এবং Storage সার্ভিস যাচাই করা হচ্ছে...
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {serviceRows.map(({ key, label, icon: Icon, check }) => (
              <div
                key={key}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Icon className="h-4 w-4 text-slate-500" />
                    {label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold ${getBadgeStyle(
                      check.status
                    )}`}
                  >
                    <StatusIcon status={check.status} />
                    {check.status}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">{check.summaryBn}</p>
                {!compact && (
                  <p className="text-[11px] font-mono text-slate-500 break-all">{check.detail}</p>
                )}
              </div>
            ))}
          </div>

          {!compact && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-5 gap-y-1">
              <span>
                Project ID: <strong className="font-mono text-slate-800 dark:text-slate-200">{report.projectId}</strong>
              </span>
              <span>
                Firestore DB: <strong className="font-mono text-slate-800 dark:text-slate-200">{report.firestoreDatabaseId}</strong>
              </span>
              <span>
                Storage Bucket: <strong className="font-mono text-slate-800 dark:text-slate-200">{report.storageBucket}</strong>
              </span>
              <span>
                Checked: <strong className="font-mono">{new Date(report.checkedAt).toLocaleTimeString()}</strong>
              </span>
            </div>
          )}

          {serviceRows.some((s) => s.check.consoleSteps && s.check.consoleSteps.length > 0) && (
            <div className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                অপ্রস্তুত বা অসক্রিয় সার্ভিস চালু করতে Firebase Console-এ যা করতে হবে:
              </div>
              {serviceRows
                .filter((s) => s.check.consoleSteps && s.check.consoleSteps.length > 0)
                .map((s) => (
                  <div key={s.key} className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-bold">
                      {s.label} ({s.check.status}):
                    </p>
                    <ol className="list-decimal pl-5 space-y-0.5">
                      {s.check.consoleSteps?.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
