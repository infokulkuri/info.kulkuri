import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  OperationType,
  db,
  handleFirestoreError,
  storage,
} from '../config/firebase';

export class BusinessValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessValidationError';
  }
}
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CMS_PAGES,
  DEFAULT_FUNDS,
  DEFAULT_GALLERY,
  DEFAULT_MEMBERS,
  DEFAULT_NAV_MENUS,
  DEFAULT_NEWS,
  DEFAULT_NOTICES,
  DEFAULT_PAGE_SECTIONS,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_WEBSITE_SETTINGS,
} from '../data/defaultSeed';
import {
  Account,
  AdminPermissionKey,
  AdminRecord,
  AuditLog,
  CmsPage,
  ContactMessage,
  DashboardSummary,
  ExpenseEntry,
  ExpenseLineItem,
  Fund,
  GalleryItem,
  IncomeEntry,
  Member,
  MemberPrivate,
  NavMenuItem,
  NewsItem,
  Notice,
  PageSection,
  SubscriptionPayment,
  ThemeSettings,
  UserProfile,
  WebsiteSettings,
} from '../types/models';
import { generateDocId, generateVerificationCode } from '../utils/bengali';

// -----------------------------------------------------------------------------
// Auth & Bootstrap Provisioning
// -----------------------------------------------------------------------------
export async function syncUserOnSignIn(params: {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  emailVerified: boolean;
}): Promise<{ profile: UserProfile; adminRecord: AdminRecord | null }> {
  const { uid, email, displayName, phone, emailVerified } = params;
  const userRef = doc(db, 'users', uid);
  const privRef = doc(db, 'userPrivate', uid);
  const adminRef = doc(db, 'admins', uid);

  const isOwnerEmail =
    email.toLowerCase() === BOOTSTRAPPED_SUPER_ADMIN_EMAIL.toLowerCase() && emailVerified;

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const initialRole = isOwnerEmail ? 'super_admin' : 'pending';
      const newProfile: UserProfile = {
        uid,
        displayName: displayName || email.split('@')[0] || 'সদস্য',
        role: initialRole,
        status: 'active',
        emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      await setDoc(privRef, {
        uid,
        email,
        phone: phone || '',
        address: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      if (isOwnerEmail) {
        const adminData: AdminRecord = {
          uid,
          displayName: newProfile.displayName,
          role: 'super_admin',
          status: 'active',
          fullAccess: true,
          permissions: ['cms', 'design', 'members', 'finance', 'approvals', 'reports', 'users', 'settings'],
          grantedBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(adminRef, adminData);
        return { profile: newProfile, adminRecord: adminData };
      }
      return { profile: newProfile, adminRecord: null };
    }

    const existing = snap.data() as UserProfile;
    const targetRole = isOwnerEmail ? 'super_admin' : existing.role;
    if (
      existing.emailVerified !== emailVerified ||
      (displayName && existing.displayName !== displayName) ||
      existing.role !== targetRole
    ) {
      await updateDoc(userRef, {
        displayName: displayName || existing.displayName,
        emailVerified,
        role: targetRole,
        updatedAt: serverTimestamp(),
      });
    }

    let adminRecord: AdminRecord | null = null;
    if (isOwnerEmail || targetRole === 'super_admin' || targetRole === 'sub_admin') {
      const adminSnap = await getDoc(adminRef);
      if (adminSnap.exists()) {
        adminRecord = adminSnap.data() as AdminRecord;
      } else if (isOwnerEmail) {
        const adminData: AdminRecord = {
          uid,
          displayName: existing.displayName,
          role: 'super_admin',
          status: 'active',
          fullAccess: true,
          permissions: ['cms', 'design', 'members', 'finance', 'approvals', 'reports', 'users', 'settings'],
          grantedBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(adminRef, adminData);
        adminRecord = adminData;
      }
    }

    return {
      profile: { ...existing, role: targetRole, emailVerified },
      adminRecord,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

export async function initializeOrganizationDatabase(actorUid: string, actorName: string): Promise<void> {
  try {
    // Check server first so already-initialized DB is never overwritten by a race condition
    const existingMain = await getDocFromServer(doc(db, 'websiteSettings', 'main')).catch(() => null);
    if (existingMain && existingMain.exists()) {
      return;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'websiteSettings', 'main'), {
      ...DEFAULT_WEBSITE_SETTINGS,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'websiteSettings', 'theme'), {
      ...DEFAULT_THEME_SETTINGS,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'dashboardSummaries', 'public'), {
      id: 'public',
      totalIncomePoisha: 0,
      totalExpensePoisha: 0,
      totalBalancePoisha: 0,
      cashBalancePoisha: 0,
      bankBalancePoisha: 0,
      mobileBalancePoisha: 0,
      totalMembers: DEFAULT_MEMBERS.length,
      totalDonors: 0,
      updatedAt: serverTimestamp(),
    });

    for (const p of DEFAULT_CMS_PAGES) {
      batch.set(doc(db, 'pages', p.id), { ...p, updatedAt: serverTimestamp() });
    }
    for (const m of DEFAULT_NAV_MENUS) {
      batch.set(doc(db, 'menus', m.id), { ...m, updatedAt: serverTimestamp() });
    }
    for (const s of DEFAULT_PAGE_SECTIONS) {
      batch.set(doc(db, 'pageSections', s.id), { ...s, updatedAt: serverTimestamp() });
    }
    for (const n of DEFAULT_NOTICES) {
      batch.set(doc(db, 'notices', n.id), {
        ...n,
        createdBy: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const item of DEFAULT_NEWS) {
      batch.set(doc(db, 'news', item.id), {
        ...item,
        createdBy: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const g of DEFAULT_GALLERY) {
      batch.set(doc(db, 'galleries', g.id), {
        ...g,
        createdBy: actorUid,
        createdAt: serverTimestamp(),
      });
    }
    for (const mem of DEFAULT_MEMBERS) {
      batch.set(doc(db, 'members', mem.memberId), {
        ...mem,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const acc of DEFAULT_ACCOUNTS) {
      batch.set(doc(db, 'accounts', acc.id), { ...acc, updatedAt: serverTimestamp() });
    }
    for (const fund of DEFAULT_FUNDS) {
      batch.set(doc(db, 'funds', fund.id), { ...fund, updatedAt: serverTimestamp() });
    }

    const logId = generateDocId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      id: logId,
      actorUid,
      actorName,
      action: 'INITIALIZE_DATABASE',
      module: 'system',
      targetId: 'all',
      details: 'নতুন ওয়েবসাইটের প্রাথমিক কাঠামো, অ্যাকাউন্ট ও তহবিল তৈরি করা হয়েছে।',
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'batch_seed');
  }
}

export async function resetOrganizationToFresh(actorUid: string, actorName: string): Promise<number> {
  try {
    const clearCollections = ['notices', 'news', 'galleries', 'members', 'memberPrivate', 'pageSections'];
    let deletedCount = 0;
    const batch = writeBatch(db);

    for (const colName of clearCollections) {
      const snap = await getDocs(collection(db, colName));
      snap.forEach((d) => {
        batch.delete(d.ref);
        deletedCount++;
      });
    }

    batch.set(doc(db, 'websiteSettings', 'main'), {
      ...DEFAULT_WEBSITE_SETTINGS,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'websiteSettings', 'theme'), {
      ...DEFAULT_THEME_SETTINGS,
      updatedAt: serverTimestamp(),
    });

    const logId = generateDocId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      id: logId,
      actorUid,
      actorName,
      action: 'RESET_FRESH_START',
      module: 'system',
      targetId: 'websiteSettings',
      details: `ওয়েবসাইটের পুরোনো ${deletedCount}টি কনটেন্ট/ছবি মুছে সম্পূর্ণ নতুন শুরু করা হয়েছে।`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return deletedCount;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'reset_fresh');
  }
}

// -----------------------------------------------------------------------------
// Audit Log Helper
// -----------------------------------------------------------------------------
export async function writeAuditLog(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
  const id = generateDocId('log');
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      ...entry,
      id,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `auditLogs/${id}`);
  }
}

// -----------------------------------------------------------------------------
// CMS & Design Settings
// -----------------------------------------------------------------------------
export async function saveWebsiteSettings(
  settings: Partial<WebsiteSettings>,
  actorUid: string,
  actorName: string,
  options?: { skipAuditLog?: boolean }
): Promise<void> {
  if (!actorUid) return;
  try {
    await setDoc(
      doc(db, 'websiteSettings', 'main'),
      { ...settings, id: 'main', updatedAt: serverTimestamp() },
      { merge: true }
    );
    if (!options?.skipAuditLog) {
      await writeAuditLog({
        actorUid,
        actorName,
        action: 'UPDATE_WEBSITE_SETTINGS',
        module: 'cms',
        targetId: 'websiteSettings/main',
        details: 'ওয়েবসাইটের কনটেন্ট/সেটিংস আপডেট করা হয়েছে।',
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'websiteSettings/main');
  }
}

export async function saveThemeSettings(
  theme: Partial<ThemeSettings>,
  actorUid: string,
  actorName: string,
  options?: { skipAuditLog?: boolean }
): Promise<void> {
  if (!actorUid) return;
  try {
    await setDoc(
      doc(db, 'websiteSettings', 'theme'),
      { ...theme, id: 'theme', updatedAt: serverTimestamp() },
      { merge: true }
    );
    if (!options?.skipAuditLog) {
      await writeAuditLog({
        actorUid,
        actorName,
        action: 'UPDATE_THEME_DESIGN',
        module: 'design',
        targetId: 'websiteSettings/theme',
        details: 'ভিজ্যুয়াল ডিজাইন ও থিম পরিবর্তন করা হয়েছে।',
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'websiteSettings/theme');
  }
}

export async function saveCmsPage(page: CmsPage): Promise<void> {
  try {
    await setDoc(doc(db, 'pages', page.id), { ...page, updatedAt: serverTimestamp() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `pages/${page.id}`);
  }
}

export async function deleteCmsPage(pageId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'pages', pageId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `pages/${pageId}`);
  }
}

export async function savePageSection(section: PageSection): Promise<void> {
  try {
    await setDoc(doc(db, 'pageSections', section.id), { ...section, updatedAt: serverTimestamp() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `pageSections/${section.id}`);
  }
}

export async function deletePageSection(sectionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'pageSections', sectionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `pageSections/${sectionId}`);
  }
}

export async function saveNavMenu(menu: NavMenuItem): Promise<void> {
  try {
    await setDoc(doc(db, 'menus', menu.id), { ...menu, updatedAt: serverTimestamp() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `menus/${menu.id}`);
  }
}

export async function deleteNavMenu(menuId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'menus', menuId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `menus/${menuId}`);
  }
}

export async function saveNotice(notice: Notice, isNew: boolean): Promise<void> {
  try {
    const payload = isNew
      ? { ...notice, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
      : { ...notice, updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'notices', notice.id), payload, { merge: !isNew });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `notices/${notice.id}`);
  }
}

export async function deleteNotice(noticeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notices', noticeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `notices/${noticeId}`);
  }
}

export async function saveNewsItem(item: NewsItem, isNew: boolean): Promise<void> {
  try {
    const payload = isNew
      ? { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
      : { ...item, updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'news', item.id), payload, { merge: !isNew });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `news/${item.id}`);
  }
}

export async function deleteNewsItem(newsId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'news', newsId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `news/${newsId}`);
  }
}

export async function saveGalleryItem(item: GalleryItem): Promise<void> {
  try {
    await setDoc(doc(db, 'galleries', item.id), { ...item, createdAt: serverTimestamp() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `galleries/${item.id}`);
  }
}

export async function deleteGalleryItem(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'galleries', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `galleries/${itemId}`);
  }
}

// -----------------------------------------------------------------------------
// Members & Private Member PII
// -----------------------------------------------------------------------------
export async function saveMember(
  member: Member,
  priv: MemberPrivate,
  isNew: boolean
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const memPayload = isNew
      ? { ...member, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
      : { ...member, updatedAt: serverTimestamp() };
    batch.set(doc(db, 'members', member.memberId), memPayload, { merge: !isNew });
    batch.set(
      doc(db, 'memberPrivate', member.memberId),
      { ...priv, memberId: member.memberId, updatedAt: serverTimestamp() },
      { merge: true }
    );
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `members/${member.memberId}`);
  }
}

// -----------------------------------------------------------------------------
// RBAC: Super Admin User & Sub Admin Management
// -----------------------------------------------------------------------------
export async function assignSubAdminRole(params: {
  targetUid: string;
  targetName: string;
  fullAccess: boolean;
  permissions: AdminPermissionKey[];
  actorUid: string;
  actorName: string;
}): Promise<void> {
  const { targetUid, targetName, fullAccess, permissions, actorUid, actorName } = params;
  try {
    const batch = writeBatch(db);
    const effectivePerms = fullAccess
      ? (['cms', 'design', 'members', 'finance', 'approvals', 'reports', 'users', 'settings'] as AdminPermissionKey[])
      : permissions;

    batch.set(
      doc(db, 'admins', targetUid),
      {
        uid: targetUid,
        displayName: targetName,
        role: 'sub_admin',
        status: 'active',
        fullAccess,
        permissions: effectivePerms,
        grantedBy: actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    batch.update(doc(db, 'users', targetUid), {
      role: 'sub_admin',
      fullAccess,
      permissions: effectivePerms,
      updatedAt: serverTimestamp(),
    });
    const logId = generateDocId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      id: logId,
      actorUid,
      actorName,
      action: 'ASSIGN_SUB_ADMIN',
      module: 'rbac',
      targetId: targetUid,
      details: `${targetName}-কে সাব-অ্যাডমিন নিয়োগ দেওয়া হয়েছে (Full Access: ${fullAccess ? 'হ্যাঁ' : 'না'}).`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `admins/${targetUid}`);
  }
}

export async function revokeSubAdminRole(params: {
  targetUid: string;
  targetName: string;
  actorUid: string;
  actorName: string;
}): Promise<void> {
  const { targetUid, targetName, actorUid, actorName } = params;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'admins', targetUid));
    batch.update(doc(db, 'users', targetUid), {
      role: 'member',
      fullAccess: false,
      permissions: [],
      updatedAt: serverTimestamp(),
    });
    const logId = generateDocId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      id: logId,
      actorUid,
      actorName,
      action: 'REVOKE_SUB_ADMIN',
      module: 'rbac',
      targetId: targetUid,
      details: `${targetName}-এর সাব-অ্যাডমিন ক্ষমতা বাতিল করা হয়েছে।`,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `admins/${targetUid}`);
  }
}

export async function updateUserRoleOrStatus(params: {
  targetUid: string;
  role?: 'member' | 'pending';
  status?: 'active' | 'suspended';
  actorUid: string;
  actorName: string;
}): Promise<void> {
  const { targetUid, role, status, actorUid, actorName } = params;
  try {
    const batch = writeBatch(db);
    const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
    if (role) updates.role = role;
    if (status) updates.status = status;
    batch.update(doc(db, 'users', targetUid), updates);

    // If suspending a sub_admin, also suspend their admins record
    if (status) {
      const adminSnap = await getDoc(doc(db, 'admins', targetUid));
      if (adminSnap.exists()) {
        batch.update(doc(db, 'admins', targetUid), { status, updatedAt: serverTimestamp() });
      }
    }

    const logId = generateDocId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      id: logId,
      actorUid,
      actorName,
      action: status ? `USER_STATUS_${status.toUpperCase()}` : `USER_ROLE_${role?.toUpperCase()}`,
      module: 'users',
      targetId: targetUid,
      details: `ইউজার (${targetUid}) আপডেট: ${role || ''} ${status || ''}`.trim(),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

// -----------------------------------------------------------------------------
// Financial Transactions (Atomic Integer Poisha + Serial Numbers)
// -----------------------------------------------------------------------------
async function recalculateDashboardSummary(
  additionalIncomePoisha = 0,
  additionalExpensePoisha = 0
): Promise<void> {
  const [accountsSnap, membersSnap, incomeSnap, expenseSnap] = await Promise.all([
    getDocs(collection(db, 'accounts')),
    getDocs(collection(db, 'members')),
    getDocs(collection(db, 'income')),
    getDocs(collection(db, 'expenses')),
  ]);

  let cashBalancePoisha = 0;
  let bankBalancePoisha = 0;
  let mobileBalancePoisha = 0;
  let totalBalancePoisha = 0;

  accountsSnap.forEach((d) => {
    const acc = d.data() as Account;
    if (!acc.isActive) return;
    totalBalancePoisha += acc.currentBalancePoisha;
    if (acc.type === 'cash') cashBalancePoisha += acc.currentBalancePoisha;
    else if (acc.type === 'bank') bankBalancePoisha += acc.currentBalancePoisha;
    else mobileBalancePoisha += acc.currentBalancePoisha;
  });

  let totalIncomePoisha = additionalIncomePoisha;
  const donorNames = new Set<string>();
  incomeSnap.forEach((d) => {
    const inc = d.data() as IncomeEntry;
    if (inc.status !== 'voided') {
      totalIncomePoisha += inc.amountPoisha;
      if (inc.donorName) donorNames.add(inc.donorName.trim());
    }
  });

  let totalExpensePoisha = additionalExpensePoisha;
  expenseSnap.forEach((d) => {
    const exp = d.data() as ExpenseEntry;
    if (exp.status !== 'voided' && exp.approvalStatus === 'approved') {
      totalExpensePoisha += exp.totalAmountPoisha;
    }
  });

  const summary: DashboardSummary = {
    id: 'public',
    totalIncomePoisha,
    totalExpensePoisha,
    totalBalancePoisha,
    cashBalancePoisha,
    bankBalancePoisha,
    mobileBalancePoisha,
    totalMembers: membersSnap.size,
    totalDonors: donorNames.size,
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'dashboardSummaries', 'public'), summary);
}

export async function createIncomeTransaction(params: {
  donorName: string;
  memberId?: string;
  phone?: string;
  category: string;
  date: string;
  amountPoisha: number;
  paymentMethod: string;
  accountId: string;
  fundId: string;
  notes?: string;
  proofUrl?: string;
  actorUid: string;
  actorName: string;
}): Promise<IncomeEntry> {
  const year = parseInt(params.date.slice(0, 4), 10) || new Date().getFullYear();
  const counterId = `REC_${year}`;
  const incomeId = generateDocId('inc');
  const verificationCode = generateVerificationCode();

  try {
    const createdEntry = await runTransaction(db, async (tx) => {
      const counterRef = doc(db, 'receiptCounters', counterId);
      const accountRef = doc(db, 'accounts', params.accountId);
      const fundRef = doc(db, 'funds', params.fundId);

      const [counterSnap, accountSnap, fundSnap] = await Promise.all([
        tx.get(counterRef),
        tx.get(accountRef),
        tx.get(fundRef),
      ]);

      if (!accountSnap.exists()) throw new BusinessValidationError('নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি।');
      if (!fundSnap.exists()) throw new BusinessValidationError('নির্বাচিত তহবিল পাওয়া যায়নি।');

      const nextSeq = counterSnap.exists() ? (counterSnap.data().lastSeq as number) + 1 : 1;
      const receiptNumber = `REC-${year}-${String(nextSeq).padStart(3, '0')}`;

      tx.set(counterRef, {
        id: counterId,
        year,
        type: 'REC',
        lastSeq: nextSeq,
        updatedAt: serverTimestamp(),
      });

      const accData = accountSnap.data() as Account;
      const fundData = fundSnap.data() as Fund;

      tx.update(accountRef, {
        currentBalancePoisha: accData.currentBalancePoisha + params.amountPoisha,
        updatedAt: serverTimestamp(),
      });

      tx.update(fundRef, {
        balancePoisha: fundData.balancePoisha + params.amountPoisha,
        updatedAt: serverTimestamp(),
      });

      const entry: IncomeEntry = {
        id: incomeId,
        receiptNumber,
        verificationCode,
        donorName: params.donorName.trim(),
        memberId: params.memberId || '',
        phone: params.phone || '',
        category: params.category,
        date: params.date,
        amountPoisha: params.amountPoisha,
        paymentMethod: params.paymentMethod,
        accountId: params.accountId,
        fundId: params.fundId,
        notes: params.notes || '',
        proofUrl: params.proofUrl || '',
        status: 'active',
        createdBy: params.actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.set(doc(db, 'income', incomeId), entry);

      const logId = generateDocId('log');
      tx.set(doc(db, 'auditLogs', logId), {
        id: logId,
        actorUid: params.actorUid,
        actorName: params.actorName,
        action: 'CREATE_INCOME',
        module: 'finance',
        targetId: incomeId,
        details: `রশিদ ${receiptNumber} — ${params.donorName} (${params.amountPoisha / 100} টাকা)`,
        createdAt: serverTimestamp(),
      });

      return entry;
    });

    await recalculateDashboardSummary();
    return createdEntry;
  } catch (err) {
    if (err instanceof BusinessValidationError) throw err;
    handleFirestoreError(err, OperationType.WRITE, `income/${incomeId}`);
  }
}

export async function createExpenseTransaction(params: {
  titleBn: string;
  category: string;
  date: string;
  items: ExpenseLineItem[];
  paymentMethod: string;
  accountId: string;
  fundId: string;
  payeeName?: string;
  notes?: string;
  billUrl?: string;
  autoApprove: boolean;
  actorUid: string;
  actorName: string;
}): Promise<ExpenseEntry> {
  const year = parseInt(params.date.slice(0, 4), 10) || new Date().getFullYear();
  const counterId = `VOU_${year}`;
  const expenseId = generateDocId('exp');
  const verificationCode = generateVerificationCode();
  const totalAmountPoisha = params.items.reduce((sum, item) => sum + item.totalPricePoisha, 0);

  if (totalAmountPoisha <= 0) {
    throw new BusinessValidationError('মোট ব্যয়ের পরিমাণ শূন্যের বেশি হতে হবে।');
  }

  try {
    const created = await runTransaction(db, async (tx) => {
      const counterRef = doc(db, 'receiptCounters', counterId);
      const accountRef = doc(db, 'accounts', params.accountId);
      const fundRef = doc(db, 'funds', params.fundId);

      const [counterSnap, accountSnap, fundSnap] = await Promise.all([
        tx.get(counterRef),
        tx.get(accountRef),
        tx.get(fundRef),
      ]);

      if (!accountSnap.exists()) throw new BusinessValidationError('নির্বাচিত অ্যাকাউন্ট পাওয়া যায়নি।');
      if (!fundSnap.exists()) throw new BusinessValidationError('নির্বাচিত তহবিল পাওয়া যায়নি।');

      const accData = accountSnap.data() as Account;
      const fundData = fundSnap.data() as Fund;

      if (params.autoApprove && accData.currentBalancePoisha < totalAmountPoisha) {
        throw new BusinessValidationError(
          `নির্বাচিত অ্যাকাউন্টে (${accData.nameBn}) পর্যাপ্ত ব্যালেন্স নেই! অনুগ্রহ করে প্রথমে আয়/প্রারম্ভিক জের যুক্ত করুন অথবা "অনুমোদনের অপেক্ষায় (Pending)" হিসেবে জমা দিন।`
        );
      }

      const nextSeq = counterSnap.exists() ? (counterSnap.data().lastSeq as number) + 1 : 1;
      const voucherNumber = `VOU-${year}-${String(nextSeq).padStart(3, '0')}`;

      tx.set(counterRef, {
        id: counterId,
        year,
        type: 'VOU',
        lastSeq: nextSeq,
        updatedAt: serverTimestamp(),
      });

      if (params.autoApprove) {
        tx.update(accountRef, {
          currentBalancePoisha: Math.max(0, accData.currentBalancePoisha - totalAmountPoisha),
          updatedAt: serverTimestamp(),
        });
        tx.update(fundRef, {
          balancePoisha: Math.max(0, fundData.balancePoisha - totalAmountPoisha),
          updatedAt: serverTimestamp(),
        });
      }

      const entry: ExpenseEntry = {
        id: expenseId,
        voucherNumber,
        verificationCode,
        titleBn: params.titleBn.trim(),
        category: params.category,
        date: params.date,
        items: params.items,
        totalAmountPoisha,
        paymentMethod: params.paymentMethod,
        accountId: params.accountId,
        fundId: params.fundId,
        payeeName: params.payeeName || '',
        notes: params.notes || '',
        billUrl: params.billUrl || '',
        approvalStatus: params.autoApprove ? 'approved' : 'pending',
        approvedBy: params.autoApprove ? params.actorUid : '',
        status: 'active',
        createdBy: params.actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      tx.set(doc(db, 'expenses', expenseId), entry);

      const logId = generateDocId('log');
      tx.set(doc(db, 'auditLogs', logId), {
        id: logId,
        actorUid: params.actorUid,
        actorName: params.actorName,
        action: params.autoApprove ? 'CREATE_APPROVED_EXPENSE' : 'CREATE_PENDING_EXPENSE',
        module: 'finance',
        targetId: expenseId,
        details: `ভাউচার ${voucherNumber} — ${params.titleBn} (${totalAmountPoisha / 100} টাকা)`,
        createdAt: serverTimestamp(),
      });

      return entry;
    });

    await recalculateDashboardSummary();
    return created;
  } catch (err) {
    if (err instanceof BusinessValidationError) throw err;
    handleFirestoreError(err, OperationType.WRITE, `expenses/${expenseId}`);
  }
}

export async function processExpenseApproval(params: {
  expenseId: string;
  decision: 'approved' | 'rejected' | 'cancelled';
  actorUid: string;
  actorName: string;
}): Promise<void> {
  const { expenseId, decision, actorUid, actorName } = params;
  try {
    await runTransaction(db, async (tx) => {
      const expRef = doc(db, 'expenses', expenseId);
      const expSnap = await tx.get(expRef);
      if (!expSnap.exists()) throw new BusinessValidationError('ব্যয় ভাউচার পাওয়া যায়নি।');

      const exp = expSnap.data() as ExpenseEntry;
      if (exp.approvalStatus !== 'pending') {
        throw new BusinessValidationError('এই ভাউচারটি ইতিমধ্যে প্রক্রিয়াকরণ করা হয়েছে।');
      }

      if (decision === 'approved') {
        const accountRef = doc(db, 'accounts', exp.accountId);
        const fundRef = doc(db, 'funds', exp.fundId);
        const [accSnap, fundSnap] = await Promise.all([tx.get(accountRef), tx.get(fundRef)]);

        if (!accSnap.exists()) throw new BusinessValidationError('অ্যাকাউন্ট পাওয়া যায়নি।');
        const acc = accSnap.data() as Account;
        if (acc.currentBalancePoisha < exp.totalAmountPoisha) {
          throw new BusinessValidationError('অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই!');
        }
        tx.update(accountRef, {
          currentBalancePoisha: acc.currentBalancePoisha - exp.totalAmountPoisha,
          updatedAt: serverTimestamp(),
        });
        if (fundSnap.exists()) {
          const fund = fundSnap.data() as Fund;
          tx.update(fundRef, {
            balancePoisha: Math.max(0, fund.balancePoisha - exp.totalAmountPoisha),
            updatedAt: serverTimestamp(),
          });
        }
      }

      tx.update(expRef, {
        approvalStatus: decision,
        approvedBy: actorUid,
        updatedAt: serverTimestamp(),
      });

      const logId = generateDocId('log');
      tx.set(doc(db, 'auditLogs', logId), {
        id: logId,
        actorUid,
        actorName,
        action: `EXPENSE_${decision.toUpperCase()}`,
        module: 'approvals',
        targetId: expenseId,
        details: `ভাউচার ${exp.voucherNumber} ${decision} করা হয়েছে।`,
        createdAt: serverTimestamp(),
      });
    });

    await recalculateDashboardSummary();
  } catch (err) {
    if (err instanceof BusinessValidationError) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `expenses/${expenseId}`);
  }
}

export async function voidFinancialTransaction(params: {
  collectionName: 'income' | 'expenses';
  docId: string;
  reason: string;
  actorUid: string;
  actorName: string;
}): Promise<void> {
  const { collectionName, docId, reason, actorUid, actorName } = params;
  try {
    await runTransaction(db, async (tx) => {
      const targetRef = doc(db, collectionName, docId);
      const snap = await tx.get(targetRef);
      if (!snap.exists()) throw new BusinessValidationError('লেনদেন পাওয়া যায়নি।');

      if (collectionName === 'income') {
        const inc = snap.data() as IncomeEntry;
        if (inc.status === 'voided') throw new BusinessValidationError('ইতিমধ্যে বাতিল (Void) করা হয়েছে।');
        const accRef = doc(db, 'accounts', inc.accountId);
        const fundRef = doc(db, 'funds', inc.fundId);
        const [accSnap, fundSnap] = await Promise.all([tx.get(accRef), tx.get(fundRef)]);
        if (accSnap.exists()) {
          const acc = accSnap.data() as Account;
          tx.update(accRef, {
            currentBalancePoisha: Math.max(0, acc.currentBalancePoisha - inc.amountPoisha),
            updatedAt: serverTimestamp(),
          });
        }
        if (fundSnap.exists()) {
          const fund = fundSnap.data() as Fund;
          tx.update(fundRef, {
            balancePoisha: Math.max(0, fund.balancePoisha - inc.amountPoisha),
            updatedAt: serverTimestamp(),
          });
        }
        tx.update(targetRef, {
          status: 'voided',
          voidReason: reason,
          updatedAt: serverTimestamp(),
        });
      } else {
        const exp = snap.data() as ExpenseEntry;
        if (exp.status === 'voided') throw new BusinessValidationError('ইতিমধ্যে বাতিল (Void) করা হয়েছে।');
        if (exp.approvalStatus === 'approved') {
          const accRef = doc(db, 'accounts', exp.accountId);
          const fundRef = doc(db, 'funds', exp.fundId);
          const [accSnap, fundSnap] = await Promise.all([tx.get(accRef), tx.get(fundRef)]);
          if (accSnap.exists()) {
            const acc = accSnap.data() as Account;
            tx.update(accRef, {
              currentBalancePoisha: acc.currentBalancePoisha + exp.totalAmountPoisha,
              updatedAt: serverTimestamp(),
            });
          }
          if (fundSnap.exists()) {
            const fund = fundSnap.data() as Fund;
            tx.update(fundRef, {
              balancePoisha: fund.balancePoisha + exp.totalAmountPoisha,
              updatedAt: serverTimestamp(),
            });
          }
        }
        tx.update(targetRef, {
          status: 'voided',
          voidReason: reason,
          updatedAt: serverTimestamp(),
        });
      }

      const logId = generateDocId('log');
      tx.set(doc(db, 'auditLogs', logId), {
        id: logId,
        actorUid,
        actorName,
        action: `VOID_${collectionName.toUpperCase()}`,
        module: 'finance',
        targetId: docId,
        reason,
        details: `${collectionName}/${docId} বাতিল/রিভার্স করা হয়েছে। কারণ: ${reason}`,
        createdAt: serverTimestamp(),
      });
    });

    await recalculateDashboardSummary();
  } catch (err) {
    if (err instanceof BusinessValidationError) throw err;
    handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${docId}`);
  }
}

export async function createFundTransferTransaction(params: {
  fromAccountId: string;
  toAccountId: string;
  amountPoisha: number;
  date: string;
  notes?: string;
  actorUid: string;
  actorName: string;
}): Promise<void> {
  const transferId = generateDocId('trf');
  try {
    await runTransaction(db, async (tx) => {
      const fromRef = doc(db, 'accounts', params.fromAccountId);
      const toRef = doc(db, 'accounts', params.toAccountId);
      const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
      if (!fromSnap.exists() || !toSnap.exists()) throw new BusinessValidationError('অ্যাকাউন্ট পাওয়া যায়নি।');

      const fromAcc = fromSnap.data() as Account;
      const toAcc = toSnap.data() as Account;
      if (fromAcc.currentBalancePoisha < params.amountPoisha) {
        throw new BusinessValidationError('প্রেরক অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই।');
      }

      tx.update(fromRef, {
        currentBalancePoisha: fromAcc.currentBalancePoisha - params.amountPoisha,
        updatedAt: serverTimestamp(),
      });
      tx.update(toRef, {
        currentBalancePoisha: toAcc.currentBalancePoisha + params.amountPoisha,
        updatedAt: serverTimestamp(),
      });
      tx.set(doc(db, 'fundTransfers', transferId), {
        id: transferId,
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amountPoisha: params.amountPoisha,
        date: params.date,
        notes: params.notes || '',
        createdBy: params.actorUid,
        createdAt: serverTimestamp(),
      });

      const logId = generateDocId('log');
      tx.set(doc(db, 'auditLogs', logId), {
        id: logId,
        actorUid: params.actorUid,
        actorName: params.actorName,
        action: 'INTERNAL_TRANSFER',
        module: 'finance',
        targetId: transferId,
        details: `${fromAcc.nameBn} থেকে ${toAcc.nameBn}-এ ${params.amountPoisha / 100} টাকা স্থানান্তর (Internal Transfer)।`,
        createdAt: serverTimestamp(),
      });
    });

    await recalculateDashboardSummary();
  } catch (err) {
    if (err instanceof BusinessValidationError) throw err;
    handleFirestoreError(err, OperationType.WRITE, `fundTransfers/${transferId}`);
  }
}

export async function saveAccount(account: Account): Promise<void> {
  try {
    await setDoc(doc(db, 'accounts', account.id), { ...account, updatedAt: serverTimestamp() });
    await recalculateDashboardSummary();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `accounts/${account.id}`);
  }
}

export async function saveFund(fund: Fund): Promise<void> {
  try {
    await setDoc(doc(db, 'funds', fund.id), { ...fund, updatedAt: serverTimestamp() });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `funds/${fund.id}`);
  }
}

export async function recordMultiMonthSubscriptionPayment(params: {
  member: Member;
  year: number;
  months: number[];
  paidPerMonthPoisha: number;
  accountId: string;
  fundId: string;
  paymentMethod: string;
  date: string;
  actorUid: string;
  actorName: string;
}): Promise<IncomeEntry> {
  const { member, year, months, paidPerMonthPoisha, accountId, fundId, paymentMethod, date, actorUid, actorName } = params;
  const totalPoisha = paidPerMonthPoisha * months.length;

  const incomeEntry = await createIncomeTransaction({
    donorName: member.nameBn,
    memberId: member.memberId,
    category: 'মাসিক চাঁদা',
    date,
    amountPoisha: totalPoisha,
    paymentMethod,
    accountId,
    fundId,
    notes: `${year} সালের ${months.join(', ')} নং মাসের চাঁদা (${member.displayCode})`,
    actorUid,
    actorName,
  });

  try {
    const existingSnaps = await Promise.all(
      months.map((month) => {
        const payId = `sub_${member.memberId}_${year}_${String(month).padStart(2, '0')}`;
        return getDoc(doc(db, 'subscriptionPayments', payId));
      })
    );

    const batch = writeBatch(db);
    months.forEach((month, idx) => {
      const payId = `sub_${member.memberId}_${year}_${String(month).padStart(2, '0')}`;
      const existingSnap = existingSnaps[idx];
      const existingData = existingSnap.exists() ? (existingSnap.data() as SubscriptionPayment) : null;
      const newPaidPoisha = (existingData?.paidPoisha || 0) + paidPerMonthPoisha;
      const status: SubscriptionPayment['status'] =
        newPaidPoisha >= member.monthlyFeePoisha
          ? 'paid'
          : newPaidPoisha > 0
          ? 'partial'
          : 'unpaid';
      batch.set(doc(db, 'subscriptionPayments', payId), {
        id: payId,
        memberId: member.memberId,
        memberName: member.nameBn,
        year,
        month,
        duePoisha: member.monthlyFeePoisha,
        paidPoisha: newPaidPoisha,
        status,
        incomeId: incomeEntry.id,
        receiptNumber: incomeEntry.receiptNumber,
        paidDate: date,
        createdBy: existingData?.createdBy || actorUid,
        createdAt: existingData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    return incomeEntry;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'subscriptionPayments');
  }
}

// -----------------------------------------------------------------------------
// Contact Messages, Storage Upload & Real Backup/Restore
// -----------------------------------------------------------------------------
export async function submitContactMessage(msg: Omit<ContactMessage, 'id' | 'isRead' | 'createdAt'>): Promise<void> {
  const id = generateDocId('msg');
  try {
    await setDoc(doc(db, 'contactMessages', id), {
      ...msg,
      id,
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `contactMessages/${id}`);
  }
}

export async function markContactMessageRead(msgId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'contactMessages', msgId), { isRead: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `contactMessages/${msgId}`);
  }
}

async function compressImageToDataUrl(file: File, maxDim = 1080, maxChars = 320000): Promise<string> {
  if (file.type === 'image/svg+xml' && file.size < 200000) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('SVG পড়া যায়নি।'));
      reader.readAsDataURL(file);
    });
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('ছবিটি ডিকোড করা যায়নি।'));
      el.src = bitmapUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    let w = Math.max(1, Math.round(img.width * scale));
    let h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    const prefersPng = file.type === 'image/png';
    const formats = prefersPng ? ['image/webp', 'image/png', 'image/jpeg'] : ['image/webp', 'image/jpeg'];

    for (let dimPass = 0; dimPass < 3; dimPass++) {
      canvas.width = w;
      canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      for (const fmt of formats) {
        for (const q of [0.85, 0.72, 0.58, 0.45]) {
          const dataUrl = canvas.toDataURL(fmt, q);
          if (dataUrl.startsWith('data:image/') && dataUrl.length <= maxChars) {
            return dataUrl;
          }
        }
      }
      w = Math.max(120, Math.round(w * 0.7));
      h = Math.max(120, Math.round(h * 0.7));
    }

    throw new Error('ছবির আকার অনেক বড় — অনুগ্রহ করে ছোট আকারের ছবি নির্বাচন করুন।');
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

export async function uploadFileToStorage(
  file: File,
  visibility: 'public' | 'private',
  category: string,
  actorUid: string,
  options?: { maxDim?: number }
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${visibility}/${category}/${Date.now()}_${safeName}`;
  let url = '';
  let usedStoragePath = storagePath;

  try {
    const storageRef = ref(storage, storagePath);
    const snap = await Promise.race([
      uploadBytes(storageRef, file),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('storage/timeout')), 6000)
      ),
    ]);
    url = await getDownloadURL(snap.ref);
  } catch (storageErr) {
    if (file.type.startsWith('image/')) {
      url = await compressImageToDataUrl(file, options?.maxDim ?? 1080);
      usedStoragePath = `firestore-inline/${category}/${Date.now()}_${safeName}`;
    } else {
      throw storageErr;
    }
  }

  const fileId = generateDocId('file');
  await setDoc(doc(db, 'files', fileId), {
    id: fileId,
    name: file.name.slice(0, 180),
    category,
    visibility,
    url,
    storagePath: usedStoragePath,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    uploadedBy: actorUid,
    createdAt: serverTimestamp(),
  });
  return url;
}

export async function createVerifiedBackupPayload(actorUid: string): Promise<{
  jsonString: string;
  recordCount: number;
  checksum: string;
}> {
  const collectionsToBackup = [
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
    'income',
    'expenses',
    'fundTransfers',
    'subscriptionPayments',
    'financialYears',
    'dashboardSummaries',
  ];

  const payload: Record<string, Record<string, unknown>[]> = {};
  let recordCount = 0;

  for (const colName of collectionsToBackup) {
    const snap = await getDocs(collection(db, colName));
    payload[colName] = snap.docs.map((d) => ({ _docId: d.id, ...d.data() }));
    recordCount += snap.size;
  }

  const wrapper = {
    organization: 'কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ',
    exportedAt: new Date().toISOString(),
    recordCount,
    collections: payload,
  };
  const jsonString = JSON.stringify(wrapper, null, 2);

  // Compute deterministic SHA-256 checksum
  const enc = new TextEncoder().encode(jsonString);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  const checksum = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);

  const logId = generateDocId('bkp');
  await setDoc(doc(db, 'backupLogs', logId), {
    id: logId,
    createdBy: actorUid,
    recordCount,
    checksum,
    createdAt: serverTimestamp(),
  });

  return { jsonString, recordCount, checksum };
}

// Provision a new Firebase Auth account (Member or Sub-Admin) using a secondary app
// so the active Super Admin session stays signed in.
export async function createUserWithPasswordByAdmin(params: {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  makeSubAdmin: boolean;
  fullAccess: boolean;
  permissions: AdminPermissionKey[];
  actorUid: string;
  actorName: string;
}): Promise<{ uid: string; verificationSent: boolean }> {
  const secApp = initializeApp(firebaseConfig, `adminProvision_${Date.now()}`);
  const secAuth = getAuth(secApp);
  try {
    const cred = await createUserWithEmailAndPassword(secAuth, params.email.trim(), params.password);
    await updateProfile(cred.user, { displayName: params.displayName.trim() });
    let verificationSent = false;
    try {
      await sendEmailVerification(cred.user);
      verificationSent = true;
    } catch {
      verificationSent = false;
    }
    const newUid = cred.user.uid;
    await signOut(secAuth);

    const effectivePerms = params.fullAccess
      ? (['cms', 'design', 'members', 'finance', 'approvals', 'reports', 'users', 'settings'] as AdminPermissionKey[])
      : params.permissions;

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', newUid), {
      uid: newUid,
      displayName: params.displayName.trim(),
      role: params.makeSubAdmin ? 'sub_admin' : 'member',
      status: 'active',
      ...(params.makeSubAdmin ? { fullAccess: params.fullAccess, permissions: effectivePerms } : {}),
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'userPrivate', newUid), {
      uid: newUid,
      email: params.email.trim(),
      phone: params.phone?.trim() || '',
      address: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (params.makeSubAdmin) {
      batch.set(doc(db, 'admins', newUid), {
        uid: newUid,
        displayName: params.displayName.trim(),
        role: 'sub_admin',
        status: 'active',
        fullAccess: params.fullAccess,
        permissions: effectivePerms,
        grantedBy: params.actorUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    const logId = generateDocId('log');
    batch.set(doc(db, 'auditLogs', logId), {
      id: logId,
      actorUid: params.actorUid,
      actorName: params.actorName,
      action: params.makeSubAdmin ? 'PROVISION_SUB_ADMIN_ACCOUNT' : 'PROVISION_MEMBER_ACCOUNT',
      module: 'users',
      targetId: newUid,
      details: `${params.displayName} (${params.email}) অ্যাকাউন্ট তৈরি করা হয়েছে।`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return { uid: newUid, verificationSent };
  } finally {
    await deleteApp(secApp).catch(() => undefined);
  }
}
