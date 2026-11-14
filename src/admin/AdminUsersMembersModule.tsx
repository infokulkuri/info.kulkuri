import React, { useEffect, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { KeyRound, Mail, ShieldAlert, ShieldCheck, Upload, UserCheck, UserPlus, UserX } from 'lucide-react';
import { OperationType, auth, db, handleFirestoreError } from '../config/firebase';
import { useApp } from '../context/AppContext';
import {
  assignSubAdminRole,
  createUserWithPasswordByAdmin,
  revokeSubAdminRole,
  saveMember,
  updateUserRoleOrStatus,
  uploadFileToStorage,
} from '../services/firestoreService';
import {
  ALL_ADMIN_PERMISSIONS,
  AdminPermissionKey,
  AdminRecord,
  Member,
  MemberPrivate,
  UserPrivate,
  UserProfile,
} from '../types/models';
import { formatTakaFromPoisha, poishaToTakaInput, takaToPoisha } from '../utils/bengali';

interface Props {
  activeMenu: 'users' | 'members' | 'subadmins';
}

export const AdminUsersMembersModule: React.FC<Props> = ({ activeMenu }) => {
  const { members, firebaseUser, userProfile, isSuperAdmin, hasPerm } = useApp();
  const actorUid = firebaseUser?.uid || '';
  const actorName = userProfile?.displayName || firebaseUser?.email || 'Admin';

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userPrivates, setUserPrivates] = useState<Record<string, UserPrivate>>({});
  const [admins, setAdmins] = useState<Record<string, AdminRecord>>({});
  const [memberPrivates, setMemberPrivates] = useState<Record<string, MemberPrivate>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // Provision User / Sub-Admin with Email & Initial Password (Super Admin)
  const [provisionForm, setProvisionForm] = useState({
    displayName: '',
    email: '',
    phone: '',
    password: '',
    makeSubAdmin: true,
    fullAccess: false,
    permissions: ['cms', 'members'] as AdminPermissionKey[],
  });
  const [provisioning, setProvisioning] = useState(false);

  // Sub Admin Appoint Form
  const [selectedUid, setSelectedUid] = useState('');
  const [fullAccess, setFullAccess] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<AdminPermissionKey[]>(['cms', 'members']);

  // Member Create Form
  const [memForm, setMemForm] = useState({
    displayCode: `KASP-${String(members.length + 1).padStart(3, '0')}`,
    nameBn: '',
    designationBn: 'সাধারণ সদস্য',
    committeeType: 'general' as 'executive' | 'general' | 'advisory',
    committeeOrder: members.length + 1,
    monthlyFeeTaka: '200',
    phone: '',
    email: '',
    address: '',
    bioBn: '',
    photoUrl: '',
  });
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const notify = (t: string) => {
    setErr('');
    setMsg(t);
    setTimeout(() => setMsg(''), 5000);
  };
  const fail = (e: unknown) => {
    setMsg('');
    setErr(e instanceof Error ? e.message : String(e));
  };

  useEffect(() => {
    if (!hasPerm('users') && !isSuperAdmin) return;
    const u1 = onSnapshot(
      collection(db, 'users'),
      (snap) => setUsers(snap.docs.map((d) => d.data() as UserProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );
    const u2 = onSnapshot(
      collection(db, 'userPrivate'),
      (snap) => {
        const map: Record<string, UserPrivate> = {};
        snap.docs.forEach((d) => (map[d.id] = d.data() as UserPrivate));
        setUserPrivates(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'userPrivate')
    );
    const u3 = onSnapshot(
      collection(db, 'admins'),
      (snap) => {
        const map: Record<string, AdminRecord> = {};
        snap.docs.forEach((d) => (map[d.id] = d.data() as AdminRecord));
        setAdmins(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, [isSuperAdmin, activeMenu]);

  useEffect(() => {
    if (!hasPerm('members') && !hasPerm('finance')) return;
    const unsub = onSnapshot(
      collection(db, 'memberPrivate'),
      (snap) => {
        const map: Record<string, MemberPrivate> = {};
        snap.docs.forEach((d) => (map[d.id] = d.data() as MemberPrivate));
        setMemberPrivates(map);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'memberPrivate')
    );
    return () => unsub();
  }, [activeMenu]);

  // 1. User Management
  if (activeMenu === 'users') {
    const handleProvisionUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isSuperAdmin) return;
      if (provisionForm.password.length < 6) {
        fail('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        return;
      }
      setProvisioning(true);
      setErr('');
      try {
        const res = await createUserWithPasswordByAdmin({
          email: provisionForm.email,
          password: provisionForm.password,
          displayName: provisionForm.displayName,
          phone: provisionForm.phone,
          makeSubAdmin: provisionForm.makeSubAdmin,
          fullAccess: provisionForm.fullAccess,
          permissions: provisionForm.permissions,
          actorUid,
          actorName,
        });
        setProvisionForm({
          displayName: '',
          email: '',
          phone: '',
          password: '',
          makeSubAdmin: true,
          fullAccess: false,
          permissions: ['cms', 'members'],
        });
        notify(
          `অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! ${
            res.verificationSent ? 'ভেরিফিকেশন ইমেইল পাঠানো হয়েছে।' : ''
          }`
        );
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        if (raw.includes('auth/operation-not-allowed')) {
          fail(
            'Firebase Console > Authentication > Sign-in method থেকে Email/Password প্রোভাইডার চালু করা নেই। অনুগ্রহ করে প্রথমে সেটি Enable করুন।'
          );
        } else if (raw.includes('auth/email-already-in-use')) {
          fail('এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে। নিচের তালিকা থেকে তাদের সাব-অ্যাডমিন বা রোল পরিবর্তন করতে পারবেন।');
        } else {
          fail(raw);
        }
      } finally {
        setProvisioning(false);
      }
    };

    const toggleProvisionPerm = (key: AdminPermissionKey) => {
      setProvisionForm((p) => ({
        ...p,
        permissions: p.permissions.includes(key) ? p.permissions.filter((k) => k !== key) : [...p.permissions, key],
      }));
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">ইউজার অ্যাকাউন্ট ও পাসওয়ার্ড ব্যবস্থাপনা</h2>
          <p className="text-xs text-slate-500">
            নতুন সাব-অ্যাডমিন বা সদস্য অ্যাকাউন্ট তৈরি করুন, পাসওয়ার্ড রিসেট ইমেইল পাঠান এবং ইউজার স্ট্যাটাস নিয়ন্ত্রণ করুন।
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
          <strong className="flex items-center gap-1.5 mb-1">
            <KeyRound className="h-3.5 w-3.5" /> পাসওয়ার্ড নিরাপত্তা নীতি (Zero-Trust Security)
          </strong>
          Firebase Authentication ব্যবহারকারীদের পাসওয়ার্ড একমুখী ক্রিপ্টোগ্রাফিক হ্যাশ (Encrypted Hash) হিসেবে সংরক্ষণ করে, তাই নিরাপত্তা নিয়ম অনুযায়ী কোনো অ্যাডমিন প্যানেল বা ডাটাবেজে প্লেইনটেক্সট (Plaintext) পাসওয়ার্ড সংরক্ষণ বা প্রদর্শন করা যায় না। সুপার অ্যাডমিন হিসেবে আপনি নিচ থেকে <strong>প্রাথমিক পাসওয়ার্ডসহ নতুন সাব-অ্যাডমিন/সদস্য তৈরি</strong> করতে পারবেন এবং যেকোনো ইউজারকে <strong>পাসওয়ার্ড রিসেট লিংক</strong> পাঠাতে পারবেন।
        </div>

        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        {err && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{err}</div>}

        {isSuperAdmin && (
          <form onSubmit={handleProvisionUser} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-700" />
              প্রাথমিক পাসওয়ার্ডসহ নতুন সাব-অ্যাডমিন / ইউজার তৈরি করুন
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                required
                placeholder="পূর্ণ নাম *"
                value={provisionForm.displayName}
                onChange={(e) => setProvisionForm({ ...provisionForm, displayName: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                type="email"
                required
                placeholder="ইমেইল ঠিকানা *"
                value={provisionForm.email}
                onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                type="tel"
                placeholder="মোবাইল নম্বর"
                value={provisionForm.phone}
                onChange={(e) => setProvisionForm({ ...provisionForm, phone: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="প্রাথমিক পাসওয়ার্ড (≥ ৬ অক্ষর) *"
                value={provisionForm.password}
                onChange={(e) => setProvisionForm({ ...provisionForm, password: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-2 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={provisionForm.makeSubAdmin}
                  onChange={(e) => setProvisionForm({ ...provisionForm, makeSubAdmin: e.target.checked })}
                  className="accent-emerald-700"
                />
                সরাসরি সাব-অ্যাডমিন (Sub-Admin) হিসেবে নিয়োগ দিন
              </label>
              {provisionForm.makeSubAdmin && (
                <label className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={provisionForm.fullAccess}
                    onChange={(e) => setProvisionForm({ ...provisionForm, fullAccess: e.target.checked })}
                    className="accent-emerald-700"
                  />
                  Full Admin Access
                </label>
              )}
            </div>

            {provisionForm.makeSubAdmin && !provisionForm.fullAccess && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {ALL_ADMIN_PERMISSIONS.filter((p) => p.key !== 'users').map((perm) => (
                  <label
                    key={perm.key}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={provisionForm.permissions.includes(perm.key)}
                      onChange={() => toggleProvisionPerm(perm.key)}
                      className="mt-0.5 accent-emerald-700"
                    />
                    <span>{perm.labelBn}</span>
                  </label>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={provisioning}
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
            >
              {provisioning ? 'তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
            </button>
          </form>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">নাম</th>
                <th className="px-4 py-3 text-left">ইমেইল ও ফোন</th>
                <th className="px-4 py-3 text-left">বর্তমান ভূমিকা (Role)</th>
                <th className="px-4 py-3 text-left">অবস্থা</th>
                <th className="px-4 py-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {users.map((u) => {
                const priv = userPrivates[u.uid];
                return (
                  <tr key={u.uid}>
                    <td className="px-4 py-3 font-medium">
                      {u.displayName}
                      {u.uid === actorUid && <span className="ml-1.5 text-xs text-emerald-700">(আপনি)</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div>{priv?.email || '—'}</div>
                      <div>{priv?.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold">{u.role}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={u.status === 'active' ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                        {u.status === 'active' ? 'সক্রিয়' : 'স্থগিত'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      {isSuperAdmin && priv?.email && (
                        <button
                          onClick={async () => {
                            try {
                              await sendPasswordResetEmail(auth, priv.email);
                              notify(`${priv.email}-এ পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে।`);
                            } catch (e) {
                              fail(e);
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <Mail className="h-3 w-3" /> পাসওয়ার্ড রিসেট
                        </button>
                      )}
                      {isSuperAdmin && u.role === 'pending' && (
                        <button
                          onClick={async () => {
                            await updateUserRoleOrStatus({ targetUid: u.uid, role: 'member', actorUid, actorName });
                            notify(`${u.displayName}-কে সদস্য হিসেবে অনুমোদন দেওয়া হয়েছে।`);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
                        >
                          <UserCheck className="h-3 w-3" /> সদস্য অনুমোদন
                        </button>
                      )}
                      {isSuperAdmin && u.uid !== actorUid && u.role !== 'super_admin' && (
                        <button
                          onClick={async () => {
                            const nextStatus = u.status === 'active' ? 'suspended' : 'active';
                            await updateUserRoleOrStatus({ targetUid: u.uid, status: nextStatus, actorUid, actorName });
                            notify(`${u.displayName}-এর অবস্থা ${nextStatus} করা হয়েছে।`);
                          }}
                          className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                            u.status === 'active' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <UserX className="h-3 w-3" /> {u.status === 'active' ? 'Suspend' : 'সক্রিয় করুন'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-xs text-slate-500">
                    কোনো নিবন্ধিত ইউজার পাওয়া যায়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. Sub Admin Management (Super Admin Only)
  if (activeMenu === 'subadmins') {
    if (!isSuperAdmin) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          সাব-অ্যাডমিন নিয়োগ, রোল পরিবর্তন ও ক্ষমতা বাতিল শুধুমাত্র সুপার অ্যাডমিনের (Super Admin) জন্য সংরক্ষিত।
        </div>
      );
    }

    const candidates = users.filter((u) => u.uid !== actorUid && u.role !== 'super_admin');
    const subAdminsList = Object.values(admins).filter((a) => a.role === 'sub_admin');

    const handleAppoint = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUid) return;
      const targetUser = users.find((u) => u.uid === selectedUid);
      if (!targetUser) return;
      await assignSubAdminRole({
        targetUid: selectedUid,
        targetName: targetUser.displayName,
        fullAccess,
        permissions: selectedPerms,
        actorUid,
        actorName,
      });
      setSelectedUid('');
      notify(`${targetUser.displayName}-কে সাব-অ্যাডমিন হিসেবে নিয়োগ দেওয়া হয়েছে!`);
    };

    const togglePerm = (key: AdminPermissionKey) => {
      setSelectedPerms((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    };

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">সাব-অ্যাডমিন নিয়োগ ও অনুমতি (Granular Permissions)</h2>
          <p className="text-xs text-slate-500">নিবন্ধিত যেকোনো ইউজারকে পূর্ণ অ্যাডমিন ক্ষমতা অথবা নির্দিষ্ট মডিউলের ক্ষমতা প্রদান করুন। প্রতিটি পরিবর্তন Audit Log-এ সংরক্ষিত হয়।</p>
        </div>
        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}

        <form onSubmit={handleAppoint} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            নতুন সাব-অ্যাডমিন নিয়োগ দিন
          </h3>
          <div>
            <label className="block text-xs font-medium mb-1">নিবন্ধিত ইউজার নির্বাচন করুন</label>
            <select
              required
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">-- ইউজার নির্বাচন করুন --</option>
              {candidates.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.displayName} ({userPrivates[u.uid]?.email || u.uid}) — {u.role}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-900">
            <input
              id="fullAccessToggle"
              type="checkbox"
              checked={fullAccess}
              onChange={(e) => setFullAccess(e.target.checked)}
              className="h-4 w-4 accent-emerald-700"
            />
            <label htmlFor="fullAccessToggle" className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 cursor-pointer">
              Full Admin Permission (সকল কনটেন্ট, ডিজাইন, পেজ বিল্ডার, সদস্য ও সম্পূর্ণ আর্থিক ব্যবস্থাপনার পূর্ণ ক্ষমতা)
            </label>
          </div>

          {!fullAccess && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {ALL_ADMIN_PERMISSIONS.filter((p) => p.key !== 'users').map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(perm.key)}
                    onChange={() => togglePerm(perm.key)}
                    className="mt-0.5 accent-emerald-700"
                  />
                  <span>{perm.labelBn}</span>
                </label>
              ))}
            </div>
          )}

          <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer">
            সাব-অ্যাডমিন নিয়োগ নিশ্চিত করুন
          </button>
        </form>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
              <tr>
                <th className="px-4 py-3 text-left">সাব-অ্যাডমিন</th>
                <th className="px-4 py-3 text-left">ক্ষমতা (Permissions)</th>
                <th className="px-4 py-3 text-left">অবস্থা</th>
                <th className="px-4 py-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {subAdminsList.map((a) => (
                <tr key={a.uid}>
                  <td className="px-4 py-3 font-medium">
                    {a.displayName || a.uid}
                    <div className="text-xs text-slate-500">{userPrivates[a.uid]?.email || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {a.fullAccess ? 'Full Admin Access' : a.permissions.join(', ')}
                  </td>
                  <td className="px-4 py-3 text-xs">{a.status}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => {
                        await revokeSubAdminRole({ targetUid: a.uid, targetName: a.displayName || a.uid, actorUid, actorName });
                        notify('সাব-অ্যাডমিন ক্ষমতা বাতিল করা হয়েছে।');
                      }}
                      className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      ক্ষমতা বাতিল করুন
                    </button>
                  </td>
                </tr>
              ))}
              {subAdminsList.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
                    এখনো কোনো সাব-অ্যাডমিন নিয়োগ দেওয়া হয়নি।
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 3. Member & Executive Committee Management
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = editingMemberId || memForm.displayCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const existingMember = editingMemberId ? members.find((m) => m.memberId === editingMemberId) : null;
    const member: Member = {
      ...(existingMember || {}),
      memberId: cleanId,
      displayCode: memForm.displayCode.trim(),
      nameBn: memForm.nameBn.trim(),
      designationBn: memForm.designationBn.trim(),
      committeeType: memForm.committeeType,
      committeeOrder: Number(memForm.committeeOrder) || 99,
      photoUrl: memForm.photoUrl.trim(),
      bioBn: memForm.bioBn.trim(),
      joinedDate: existingMember?.joinedDate || new Date().toISOString().slice(0, 10),
      monthlyFeePoisha: takaToPoisha(memForm.monthlyFeeTaka),
      status: existingMember?.status || 'active',
    };
    const priv: MemberPrivate = {
      ...(editingMemberId ? memberPrivates[editingMemberId] || {} : {}),
      memberId: cleanId,
      phone: memForm.phone.trim(),
      email: memForm.email.trim(),
      address: memForm.address.trim(),
    };
    await saveMember(member, priv, !editingMemberId);
    setEditingMemberId(null);
    setMemForm({
      ...memForm,
      displayCode: `KASP-${String(members.length + 2).padStart(3, '0')}`,
      nameBn: '',
      phone: '',
      email: '',
      address: '',
      bioBn: '',
      photoUrl: '',
    });
    notify(
      editingMemberId
        ? `সদস্য ${member.displayCode}-এর তথ্য Firebase-এ আপডেট হয়েছে!`
        : `সদস্য ${member.displayCode} সফলভাবে যুক্ত হয়েছে!`
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">সদস্য ও কার্যনির্বাহী কমিটি ব্যবস্থাপনা</h2>
        <p className="text-xs text-slate-500">সাধারণ ও ব্যক্তিগত তথ্য আলাদা কালেকশনে (memberPrivate) নিরাপদে সংরক্ষিত হয়।</p>
      </div>
      {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}

      <form onSubmit={handleAddMember} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-emerald-700" />
            {editingMemberId ? `সদস্য (${memForm.displayCode}) সম্পাদনা করুন` : 'নতুন সদস্য যোগ করুন'}
          </h3>
          {editingMemberId && (
            <button
              type="button"
              onClick={() => {
                setEditingMemberId(null);
                setMemForm({
                  displayCode: `KASP-${String(members.length + 1).padStart(3, '0')}`,
                  nameBn: '',
                  designationBn: 'সাধারণ সদস্য',
                  committeeType: 'general',
                  committeeOrder: members.length + 1,
                  monthlyFeeTaka: '200',
                  phone: '',
                  email: '',
                  address: '',
                  bioBn: '',
                  photoUrl: '',
                });
              }}
              className="text-xs text-slate-500 hover:underline cursor-pointer"
            >
              সম্পাদনা বাতিল
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            required
            placeholder="সদস্য আইডি (KASP-001)"
            value={memForm.displayCode}
            onChange={(e) => setMemForm({ ...memForm, displayCode: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm font-mono"
          />
          <input
            required
            placeholder="পূর্ণ নাম (বাংলা)"
            value={memForm.nameBn}
            onChange={(e) => setMemForm({ ...memForm, nameBn: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            placeholder="পদবি (যেমন: কোষাধ্যক্ষ / সদস্য)"
            value={memForm.designationBn}
            onChange={(e) => setMemForm({ ...memForm, designationBn: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <select
            value={memForm.committeeType}
            onChange={(e) => setMemForm({ ...memForm, committeeType: e.target.value as 'executive' | 'general' | 'advisory' })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          >
            <option value="executive">কার্যনির্বাহী কমিটি</option>
            <option value="general">সাধারণ সদস্য</option>
            <option value="advisory">উপদেষ্টা পরিষদ</option>
          </select>
          <input
            type="number"
            placeholder="মাসিক চাঁদা (টাকা)"
            value={memForm.monthlyFeeTaka}
            onChange={(e) => setMemForm({ ...memForm, monthlyFeeTaka: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            placeholder="মোবাইল নম্বর (শুধু অ্যাডমিন দেখবেন)"
            value={memForm.phone}
            onChange={(e) => setMemForm({ ...memForm, phone: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <div className="sm:col-span-3 flex flex-wrap items-center gap-2">
            <input
              placeholder="সদস্যের ছবির URL (ঐচ্ছিক)"
              value={memForm.photoUrl}
              onChange={(e) => setMemForm({ ...memForm, photoUrl: e.target.value })}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
              <Upload className="h-3.5 w-3.5" />
              {uploadingPhoto ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !actorUid) return;
                  setUploadingPhoto(true);
                  try {
                    const url = await uploadFileToStorage(file, 'public', 'members', actorUid, { maxDim: 420 });
                    setMemForm((p) => ({ ...p, photoUrl: url }));
                    notify('সদস্যের ছবি আপলোড হয়েছে!');
                  } catch (err) {
                    fail(err);
                  } finally {
                    setUploadingPhoto(false);
                  }
                }}
              />
            </label>
          </div>
        </div>
        <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white cursor-pointer">
          সদস্য সংরক্ষণ করুন
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-xs">
            <tr>
              <th className="px-4 py-3 text-left">আইডি</th>
              <th className="px-4 py-3 text-left">নাম ও পদবি</th>
              <th className="px-4 py-3 text-left">কমিটি</th>
              <th className="px-4 py-3 text-left">ব্যক্তিগত ফোন</th>
              <th className="px-4 py-3 text-right">মাসিক চাঁদা</th>
              <th className="px-4 py-3 text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {members.map((m) => (
              <tr key={m.memberId}>
                <td className="px-4 py-3 font-mono text-xs">{m.displayCode}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold">{m.nameBn}</div>
                  <div className="text-xs text-slate-500">{m.designationBn}</div>
                </td>
                <td className="px-4 py-3 text-xs">{m.committeeType}</td>
                <td className="px-4 py-3 text-xs font-mono">{memberPrivates[m.memberId]?.phone || '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatTakaFromPoisha(m.monthlyFeePoisha)}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button
                    onClick={() => {
                      const p = memberPrivates[m.memberId];
                      setEditingMemberId(m.memberId);
                      setMemForm({
                        displayCode: m.displayCode,
                        nameBn: m.nameBn,
                        designationBn: m.designationBn || '',
                        committeeType: m.committeeType,
                        committeeOrder: m.committeeOrder || 99,
                        monthlyFeeTaka: poishaToTakaInput(m.monthlyFeePoisha),
                        phone: p?.phone || '',
                        email: p?.email || '',
                        address: p?.address || '',
                        bioBn: m.bioBn || '',
                        photoUrl: m.photoUrl || '',
                      });
                    }}
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                  >
                    সম্পাদনা
                  </button>
                  <button
                    onClick={() =>
                      saveMember(
                        { ...m, status: m.status === 'active' ? 'inactive' : 'active' },
                        memberPrivates[m.memberId] || { memberId: m.memberId },
                        false
                      )
                    }
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    {m.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} ({poishaToTakaInput(m.monthlyFeePoisha)}৳)
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
