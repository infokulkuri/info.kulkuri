import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>অফলাইন মোড — সংরক্ষিত অ্যাপ শেল চালু আছে</span>
    </div>
  );
};

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'banner' }> = ({ variant = 'compact' }) => {
  const { websiteSettings } = useApp();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || !websiteSettings.pwaInstallBannerEnabled || dismissed) {
    return null;
  }

  const hasValidApk =
    websiteSettings.apkDownloadEnabled &&
    Boolean(websiteSettings.apkDownloadUrl?.trim()) &&
    websiteSettings.apkDownloadUrl.startsWith('https://');

  if (!isInstallable && !isIOS && !hasValidApk && variant === 'compact') {
    return null;
  }

  return (
    <>
      {variant === 'banner' ? (
        <div className="border-t border-emerald-800/20 bg-emerald-950 text-white px-4 py-3 no-print">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-emerald-300 shrink-0" />
              <div>
                <p className="text-sm font-semibold">অ্যাপটি ডাউনলোড করুন — {websiteSettings.pwaShortName}</p>
                <p className="text-xs text-emerald-200/90">
                  দ্রুত অ্যাক্সেস, নোটিশ ও আর্থিক স্বচ্ছতা দেখতে আপনার ফোনে অ্যাপটি ইনস্টল করুন।
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isInstallable && (
                <button
                  onClick={install}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition whitespace-nowrap cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  অ্যাপ ইনস্টল করুন
                </button>
              )}
              {isIOS && (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition whitespace-nowrap cursor-pointer"
                >
                  <Share className="h-3.5 w-3.5" />
                  iPhone-এ যোগ করুন
                </button>
              )}
              {!isInstallable && !isIOS && (
                <button
                  onClick={() => setShowIOSGuide(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/20 transition whitespace-nowrap cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  ইনস্টল নির্দেশিকা
                </button>
              )}
              {hasValidApk && (
                <a
                  href={websiteSettings.apkDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 px-3 py-2 text-xs font-medium text-emerald-100 hover:bg-emerald-900 transition whitespace-nowrap"
                >
                  APK ডাউনলোড
                </a>
              )}
              <button
                onClick={() => setDismissed(true)}
                aria-label="বন্ধ করুন"
                className="p-1.5 text-emerald-200 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={isInstallable ? install : () => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700/30 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200 transition whitespace-nowrap cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          অ্যাপ ইনস্টল
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                ফোনে অ্যাপ ইনস্টল করার নির্দেশিকা
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="font-semibold text-slate-900 dark:text-white">Android Chrome ব্যবহারকারীরা:</p>
                <p className="mt-1">ব্রাউজারের উপরের ডানদিকে থ্রি-ডট মেনু (⋮) থেকে <strong>&ldquo;Install app&rdquo;</strong> অথবা <strong>&ldquo;Add to Home screen&rdquo;</strong> নির্বাচন করুন।</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="font-semibold text-slate-900 dark:text-white">iPhone / iPad Safari ব্যবহারকারীরা:</p>
                <p className="mt-1">১. নিচের Safari টুলবারে <strong>Share</strong> আইকনে ট্যাপ করুন।<br />২. নিচে স্ক্রল করে <strong>&ldquo;Add to Home Screen&rdquo;</strong>-এ ট্যাপ করে Add দিন।</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
            >
              বুঝেছি
            </button>
          </div>
        </div>
      )}
    </>
  );
};
