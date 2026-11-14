import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { AlertCircle, CheckCircle2, KeyRound, Lock, Mail, Phone, ShieldCheck, User as UserIcon } from 'lucide-react';
import { FirebaseConnectionStatus } from '../components/FirebaseConnectionStatus';
import { auth, googleProvider } from '../config/firebase';
import { useApp } from '../context/AppContext';
import { syncUserOnSignIn } from '../services/firestoreService';

interface AuthPagesProps {
  initialMode: 'login' | 'signup';
  onNavigate: (slug: string) => void;
  onOpenAdmin: () => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ initialMode, onNavigate, onOpenAdmin }) => {
  const { firebaseUser, userProfile, isAnyAdmin, websiteSettings } = useApp();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const formatAuthError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('auth/operation-not-allowed')) {
      return 'Firebase Console-এ Email/Password লগইন চালু করা নেই। নিচে "Google দিয়ে লগইন" ব্যবহার করুন অথবা Firebase Console > Authentication > Sign-in method থেকে Email/Password চালু করুন।';
    }
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
      return 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে।';
    }
    if (msg.includes('auth/weak-password')) {
      return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
    }
    if (msg.includes('auth/popup-closed-by-user')) {
      return 'Google লগইন পপআপ বন্ধ করা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
    }
    return msg;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!websiteSettings.memberLoginEnabled && email.toLowerCase() !== 'info.kulkuri@gmail.com') {
      setError('বর্তমানে সাধারণ সদস্য লগইন সাময়িকভাবে বন্ধ রাখা হয়েছে।');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setInfo('সফলভাবে লগইন সম্পন্ন হয়েছে!');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!websiteSettings.registrationEnabled) {
      setError('নতুন সদস্য নিবন্ধন বর্তমানে বন্ধ আছে।');
      return;
    }
    if (fullName.trim().length < 2) {
      setError('অনুগ্রহ করে আপনার পূর্ণ নাম লিখুন।');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না।');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: fullName.trim() });
      await syncUserOnSignIn({
        uid: cred.user.uid,
        email: cred.user.email || email.trim(),
        displayName: fullName.trim(),
        phone: phone.trim(),
        emailVerified: cred.user.emailVerified,
      });
      await sendEmailVerification(cred.user);
      setInfo(
        'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! আপনার ইমেইলে একটি ভেরিফিকেশন লিংক পাঠানো হয়েছে। অনুগ্রহ করে ইমেইল যাচাই করুন।'
      );
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('অনুগ্রহ করে আপনার নিবন্ধিত ইমেইল ঠিকানা দিন।');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo('পাসওয়ার্ড রিসেট করার লিংক আপনার ইমেইলে পাঠানো হয়েছে।');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setInfo('Google অ্যাকাউন্টের মাধ্যমে সফলভাবে লগইন হয়েছে!');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!firebaseUser) return;
    setError('');
    setInfo('');
    try {
      await sendEmailVerification(firebaseUser);
      setInfo('ভেরিফিকেশন ইমেইল পুনরায় পাঠানো হয়েছে। ইনবক্স বা স্প্যাম ফোল্ডার চেক করুন।');
    } catch (err) {
      setError(formatAuthError(err));
    }
  };

  // Logged-in view
  if (firebaseUser) {
    const isSuspended = userProfile?.status === 'suspended';
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                স্বাগতম, {userProfile?.displayName || firebaseUser.displayName || 'সদস্য'}
              </h2>
              <p className="text-xs text-slate-500">{firebaseUser.email}</p>
            </div>
          </div>

          {isSuspended ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              আপনার অ্যাকাউন্টটি সাময়িকভাবে স্থগিত (Suspended) করা হয়েছে। অনুগ্রহ করে সংগঠনের সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">বর্তমান ভূমিকা (Role):</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {userProfile?.role === 'super_admin'
                      ? 'সুপার অ্যাডমিন (Super Admin)'
                      : userProfile?.role === 'sub_admin'
                      ? 'সাব-অ্যাডমিন (Sub Admin)'
                      : userProfile?.role === 'member'
                      ? 'সদস্য (Member)'
                      : 'অনুমোদনের অপেক্ষায় (Pending User)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ইমেইল যাচাইকরণ:</span>
                  <span className={firebaseUser.emailVerified ? 'text-emerald-700 font-semibold' : 'text-amber-600 font-semibold'}>
                    {firebaseUser.emailVerified ? 'যাচাইকৃত (Verified)' : 'অপেক্ষমান (Unverified)'}
                  </span>
                </div>
              </div>

              {!firebaseUser.emailVerified && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
                  <p>নিরাপত্তার স্বার্থে আপনার ইমেইল যাচাই করা প্রয়োজন। যাচাই করার পর পেজ রিলোড করুন।</p>
                  <button
                    onClick={handleResendVerification}
                    className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer"
                  >
                    ভেরিফিকেশন ইমেইল আবার পাঠান
                  </button>
                </div>
              )}

              {info && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                  {info}
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {isAnyAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="flex-1 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                  >
                    অ্যাডমিন প্যানেল খুলুন
                  </button>
                )}
                <button
                  onClick={() => onNavigate('home')}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  মূল ওয়েবসাইটে ফিরুন
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="mt-6">
          <FirebaseConnectionStatus compact />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
        <div className="text-center mb-6">
          {websiteSettings.logoUrl ? (
            <img
              src={websiteSettings.logoUrl}
              alt={websiteSettings.orgNameBn}
              referrerPolicy="no-referrer"
              className="mx-auto h-14 w-14 rounded-full object-cover border border-emerald-200"
            />
          ) : (
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xl font-bold border border-emerald-700">
              ক
            </div>
          )}
          <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
            {mode === 'login' ? 'সদস্য ও অ্যাডমিন লগইন' : mode === 'signup' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'পাসওয়ার্ড রিসেট'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{websiteSettings.orgNameBn}</p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-5">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setInfo(''); }}
            className={`rounded-md py-2 text-xs font-semibold transition cursor-pointer ${
              mode === 'login' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            লগইন
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
            className={`rounded-md py-2 text-xs font-semibold transition cursor-pointer ${
              mode === 'signup' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            নিবন্ধন (Sign Up)
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{info}</span>
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ইমেইল ঠিকানা</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'প্রক্রিয়াকরণ হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">পূর্ণ নাম</label>
              <div className="relative">
                <UserIcon className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="আপনার পূর্ণ নাম"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">মোবাইল নম্বর</label>
              <div className="relative">
                <Phone className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ইমেইল ঠিকানা</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">পাসওয়ার্ড নিশ্চিত করুন</label>
              <div className="relative">
                <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় পাসওয়ার্ড দিন"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
            >
              {loading ? 'নিবন্ধন হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              আপনার নিবন্ধিত ইমেইল ঠিকানা লিখুন। আমরা পাসওয়ার্ড রিসেট লিংক পাঠিয়ে দেব।
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
            >
              {loading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিংক পাঠান'}
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-xs font-medium text-slate-600 hover:underline cursor-pointer"
            >
              লগইনে ফিরে যান
            </button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs text-slate-400">অথবা</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
          </svg>
          Google অ্যাকাউন্ট দিয়ে প্রবেশ করুন
        </button>
      </div>

      <div className="mt-6">
        <FirebaseConnectionStatus compact />
      </div>
    </div>
  );
};
