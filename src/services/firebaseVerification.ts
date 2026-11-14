import { getApps } from 'firebase/app';
import { fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { list, ref } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { app, auth, db, storage } from '../config/firebase';

export type FirebaseAppStatus = 'Connected' | 'Failed';
export type FirebaseAuthStatus = 'Ready' | 'Not Configured';
export type FirebaseFirestoreStatus = 'Connected' | 'Permission Denied' | 'Not Configured';
export type FirebaseStorageStatus = 'Connected' | 'Permission Denied' | 'Not Configured';

export interface ServiceCheckDetail<TStatus extends string> {
  status: TStatus;
  verified: boolean;
  summaryBn: string;
  detail: string;
  consoleSteps?: string[];
}

export interface FirebaseVerificationReport {
  checkedAt: string;
  projectId: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  signedInEmail: string | null;
  emailVerified: boolean;
  firebaseApp: ServiceCheckDetail<FirebaseAppStatus>;
  authentication: ServiceCheckDetail<FirebaseAuthStatus>;
  firestore: ServiceCheckDetail<FirebaseFirestoreStatus>;
  storage: ServiceCheckDetail<FirebaseStorageStatus>;
  allOperational: boolean;
}

const STORAGE_CONSOLE_STEPS = [
  `Firebase Console-এ প্রজেক্ট "${firebaseConfig.projectId}" খুলুন।`,
  'বাম পাশের মেনু থেকে Build → Storage → Get started-এ ক্লিক করুন।',
  `ডিফল্ট বাকেট (${firebaseConfig.storageBucket}) তৈরি করতে Production Mode ও লোকেশন নির্বাচন করে Done ক্লিক করুন।`,
  'Storage → Rules ট্যাবে গিয়ে প্রজেক্টের /storage.rules ফাইলের নিয়মাবলি পেস্ট করে Publish করুন (যাতে /public/** ও যাচাইকৃত /private/** রুলস কার্যকর হয়)।',
];

const AUTH_CONSOLE_STEPS = [
  `Firebase Console-এ প্রজেক্ট "${firebaseConfig.projectId}" খুলুন।`,
  'Build → Authentication → Get started-এ ক্লিক করুন।',
  'Sign-in method ট্যাব থেকে Google এবং Email/Password প্রোভাইডার Enable করুন।',
];

const FIRESTORE_CONSOLE_STEPS = [
  `Firebase Console → Build → Firestore Database-এ গিয়ে "${firebaseConfig.firestoreDatabaseId}" ডাটাবেজ সক্রিয় আছে কিনা দেখুন।`,
  'Firestore → Rules ট্যাব থেকে সর্বশেষ firestore.rules প্রকাশিত (Deployed) আছে কিনা নিশ্চিত করুন।',
];

async function verifyFirebaseApp(): Promise<ServiceCheckDetail<FirebaseAppStatus>> {
  const apps = getApps();
  const requiredKeys: (keyof typeof firebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'appId',
    'firestoreDatabaseId',
    'storageBucket',
  ];
  const missing = requiredKeys.filter((k) => !String(firebaseConfig[k] || '').trim());

  if (apps.length === 0 || !app || missing.length > 0) {
    return {
      status: 'Failed',
      verified: false,
      summaryBn: 'Firebase App কনফিগারেশন অসম্পূর্ণ বা ইনিশিয়ালাইজ ব্যর্থ হয়েছে।',
      detail: missing.length > 0 ? `Missing config keys: ${missing.join(', ')}` : 'getApps() returned empty.',
      consoleSteps: [
        'firebase-applet-config.json ফাইলে projectId, apiKey, authDomain, firestoreDatabaseId এবং storageBucket সঠিক আছে কিনা যাচাই করুন।',
      ],
    };
  }

  return {
    status: 'Connected',
    verified: true,
    summaryBn: 'Firebase SDK অ্যাপ সফলভাবে ইনিশিয়ালাইজ হয়েছে।',
    detail: `Project: ${app.options.projectId} · AuthDomain: ${app.options.authDomain}`,
  };
}

async function verifyAuthentication(): Promise<ServiceCheckDetail<FirebaseAuthStatus>> {
  try {
    await auth.authStateReady();

    // Safe read-only IdentityToolkit probe (never creates/modifies users)
    const recaptchaRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/recaptchaParams?key=${encodeURIComponent(firebaseConfig.apiKey)}`
    );

    if (!recaptchaRes.ok) {
      const bodyText = await recaptchaRes.text().catch(() => '');
      const isNotConfigured =
        recaptchaRes.status === 400 ||
        recaptchaRes.status === 403 ||
        bodyText.includes('CONFIGURATION_NOT_FOUND') ||
        bodyText.includes('API_KEY_INVALID');
      if (isNotConfigured) {
        return {
          status: 'Not Configured',
          verified: false,
          summaryBn: 'Firebase Authentication এখনো কনফিগার বা সক্রিয় করা হয়নি।',
          detail: `IdentityToolkit HTTP ${recaptchaRes.status}: ${bodyText.slice(0, 180)}`,
          consoleSteps: AUTH_CONSOLE_STEPS,
        };
      }
    }

    // Secondary safe SDK check without creating or modifying any account
    await fetchSignInMethodsForEmail(auth, 'verify-probe@example.com');

    const currentUser = auth.currentUser;
    const activeProviders =
      currentUser?.providerData?.map((p) => p.providerId).filter(Boolean).join(', ') || 'None (Signed out)';

    return {
      status: 'Ready',
      verified: true,
      summaryBn: currentUser
        ? `Authentication সচল আছে (লগইনকৃত: ${currentUser.email || currentUser.uid})।`
        : 'Firebase Authentication API সচল ও সাইন-ইন গ্রহণের জন্য প্রস্তুত।',
      detail: currentUser
        ? `Active User Providers: [${activeProviders}] · Email Verified: ${currentUser.emailVerified ? 'Yes' : 'No'}`
        : 'IdentityToolkit & Firebase Auth SDK verified. Note: Enable Email/Password in Console if using password login alongside Google Sign-In.',
    };
  } catch (error) {
    const code = (error as { code?: string })?.code || '';
    const msg = error instanceof Error ? error.message : String(error);
    if (
      code.includes('configuration-not-found') ||
      code.includes('invalid-api-key') ||
      msg.includes('CONFIGURATION_NOT_FOUND') ||
      msg.includes('auth/operation-not-allowed')
    ) {
      return {
        status: 'Not Configured',
        verified: false,
        summaryBn: 'Firebase Authentication চালু করা হয়নি বা প্রোভাইডার কনফিগার করা নেই।',
        detail: `${code || 'auth/error'}: ${msg}`,
        consoleSteps: AUTH_CONSOLE_STEPS,
      };
    }

    return {
      status: 'Not Configured',
      verified: false,
      summaryBn: 'Firebase Authentication যাচাই ব্যর্থ হয়েছে।',
      detail: `${code || 'auth/unknown'}: ${msg}`,
      consoleSteps: AUTH_CONSOLE_STEPS,
    };
  }
}

async function verifyFirestore(): Promise<ServiceCheckDetail<FirebaseFirestoreStatus>> {
  try {
    // 1. Safe read-only server fetch of public non-financial configuration doc
    const publicSnap = await getDocFromServer(doc(db, 'websiteSettings', 'main'));
    if (publicSnap.metadata.fromCache) {
      return {
        status: 'Not Configured',
        verified: false,
        summaryBn: 'Firestore সার্ভারের সাথে সংযোগ পাওয়া যায়নি (শুধু ক্যাশ থেকে প্রতিক্রিয়া এসেছে)।',
        detail: 'getDocFromServer returned fromCache=true.',
        consoleSteps: FIRESTORE_CONSOLE_STEPS,
      };
    }

    // 2. Permission-aware isolation test (NEVER touches financial collections)
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Signed-in user must be able to read their own non-financial user doc (or receive clean missing doc if new)
      await getDocFromServer(doc(db, 'users', currentUser.uid));
      return {
        status: 'Connected',
        verified: true,
        summaryBn: 'Cloud Firestore সংযুক্ত ও Security Rules সঠিকভাবে কার্যকর আছে।',
        detail: `Server read verified on websiteSettings/main & users/${currentUser.uid} (Zero financial records touched).`,
      };
    }

    // When signed out, confirm protected non-financial collection enforces Security Rules
    let rulesEnforced = false;
    let probeOutcome = 'none';
    try {
      await getDocFromServer(doc(db, 'users', 'permission_probe_unauth'));
      probeOutcome = 'unexpected-allow';
    } catch (probeErr) {
      const probeCode = (probeErr as { code?: string })?.code || '';
      probeOutcome = probeCode || (probeErr instanceof Error ? probeErr.message : String(probeErr));
      if (probeCode === 'permission-denied') {
        rulesEnforced = true;
      }
    }

    if (!rulesEnforced) {
      return {
        status: 'Permission Denied',
        verified: false,
        summaryBn: 'Firestore Security Rules সঠিকভাবে সনাক্ত করা যায়নি।',
        detail: `Unauthenticated read probe on users/permission_probe_unauth returned: ${probeOutcome}`,
        consoleSteps: FIRESTORE_CONSOLE_STEPS,
      };
    }

    return {
      status: 'Connected',
      verified: true,
      summaryBn: 'Cloud Firestore সংযুক্ত এবং Zero-Trust Security Rules সক্রিয় আছে।',
      detail: `Database "${firebaseConfig.firestoreDatabaseId}" server read verified (public config accessible, protected paths enforced).`,
    };
  } catch (error) {
    const code = (error as { code?: string })?.code || '';
    const msg = error instanceof Error ? error.message : String(error);

    if (code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
      return {
        status: 'Permission Denied',
        verified: false,
        summaryBn: 'Firestore Security Rules এই অ্যাক্সেস ব্লক করেছে (Permission Denied)।',
        detail: `${code || 'permission-denied'}: ${msg}`,
        consoleSteps: FIRESTORE_CONSOLE_STEPS,
      };
    }

    return {
      status: 'Not Configured',
      verified: false,
      summaryBn: 'Cloud Firestore সংযুক্ত নয় বা ডাটাবেজটি খুঁজে পাওয়া যায়নি।',
      detail: `${code || 'firestore/unavailable'}: ${msg}`,
      consoleSteps: FIRESTORE_CONSOLE_STEPS,
    };
  }
}

async function verifyStorage(): Promise<ServiceCheckDetail<FirebaseStorageStatus>> {
  try {
    // Safe read-only list on /public prefix (maxResults: 1, zero writes/deletes)
    const result = await list(ref(storage, 'public'), { maxResults: 1 });
    return {
      status: 'Connected',
      verified: true,
      summaryBn: 'Firebase Storage বাকেট সক্রিয় এবং ফাইল অ্যাক্সেসযোগ্য।',
      detail: `Bucket "${firebaseConfig.storageBucket}" verified (${result.items.length} sample item(s), ${result.prefixes.length} folder(s) in /public).`,
    };
  } catch (error) {
    const code = (error as { code?: string })?.code || '';
    const msg = error instanceof Error ? error.message : String(error);

    if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
      return {
        status: 'Permission Denied',
        verified: false,
        summaryBn: 'Firebase Storage-এ অ্যাক্সেস অনুমোদিত নয় (Permission Denied)।',
        detail: `${code}: ${msg}`,
        consoleSteps: STORAGE_CONSOLE_STEPS,
      };
    }

    if (code === 'storage/bucket-not-found' || code === 'storage/project-not-found') {
      return {
        status: 'Not Configured',
        verified: false,
        summaryBn: 'Firebase Storage বাকেট তৈরি বা সক্রিয় করা হয়নি।',
        detail: `${code}: ${msg}`,
        consoleSteps: STORAGE_CONSOLE_STEPS,
      };
    }

    // Firebase Storage SDK often wraps HTTP 404/403 from unprovisioned buckets into storage/unknown.
    // Perform a safe read-only HTTP GET on the public objects endpoint to distinguish 404 vs 403.
    try {
      const restUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
        firebaseConfig.storageBucket
      )}/o?prefix=public%2F&maxResults=1`;
      const res = await fetch(restUrl);
      if (res.status === 404) {
        return {
          status: 'Not Configured',
          verified: false,
          summaryBn: 'Firebase Storage এখনো সক্রিয় (Provision) করা হয়নি (HTTP 404 Not Found)।',
          detail: `Bucket "${firebaseConfig.storageBucket}" returned HTTP 404 Not Found. ছবি আপলোড ফিচারের জন্য Firebase Console থেকে Storage চালু করতে হবে।`,
          consoleSteps: STORAGE_CONSOLE_STEPS,
        };
      }
      if (res.status === 403 || res.status === 401) {
        return {
          status: 'Permission Denied',
          verified: false,
          summaryBn: 'Firebase Storage বাকেট আছে কিন্তু Storage Rules অনুমতি দিচ্ছে না (HTTP 403)।',
          detail: `Bucket "${firebaseConfig.storageBucket}" returned HTTP ${res.status}.`,
          consoleSteps: STORAGE_CONSOLE_STEPS,
        };
      }
    } catch {
      // Ignore network fallback failure and fall through with SDK error details
    }

    return {
      status: 'Not Configured',
      verified: false,
      summaryBn: 'Firebase Storage বাকেট যাচাই করা যায়নি বা কনফিগার করা নেই।',
      detail: `${code || 'storage/unknown'}: ${msg}`,
      consoleSteps: STORAGE_CONSOLE_STEPS,
    };
  }
}

export async function verifyFirebaseServices(): Promise<FirebaseVerificationReport> {
  const [firebaseApp, authentication, firestore, storageCheck] = await Promise.all([
    verifyFirebaseApp(),
    verifyAuthentication(),
    verifyFirestore(),
    verifyStorage(),
  ]);

  const allOperational =
    firebaseApp.status === 'Connected' &&
    authentication.status === 'Ready' &&
    firestore.status === 'Connected' &&
    storageCheck.status === 'Connected';

  return {
    checkedAt: new Date().toISOString(),
    projectId: firebaseConfig.projectId,
    firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
    storageBucket: firebaseConfig.storageBucket,
    signedInEmail: auth.currentUser?.email || null,
    emailVerified: Boolean(auth.currentUser?.emailVerified),
    firebaseApp,
    authentication,
    firestore,
    storage: storageCheck,
    allOperational,
  };
}
