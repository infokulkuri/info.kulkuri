import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
  BOOTSTRAPPED_SUPER_ADMIN_EMAIL,
  OperationType,
  auth,
  db,
  handleFirestoreError,
} from '../config/firebase';
import {
  DEFAULT_CMS_PAGES,
  DEFAULT_GALLERY,
  DEFAULT_MEMBERS,
  DEFAULT_NAV_MENUS,
  DEFAULT_NEWS,
  DEFAULT_NOTICES,
  DEFAULT_PAGE_SECTIONS,
  DEFAULT_THEME_SETTINGS,
  DEFAULT_WEBSITE_SETTINGS,
} from '../data/defaultSeed';
import { initializeOrganizationDatabase, syncUserOnSignIn } from '../services/firestoreService';
import {
  AdminPermissionKey,
  AdminRecord,
  CmsPage,
  DashboardSummary,
  GalleryItem,
  Member,
  NavMenuItem,
  NewsItem,
  Notice,
  PageSection,
  ThemeSettings,
  UserProfile,
  WebsiteSettings,
} from '../types/models';

interface AppContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  adminRecord: AdminRecord | null;
  authLoading: boolean;
  isSuperAdmin: boolean;
  isAnyAdmin: boolean;
  hasPerm: (perm: AdminPermissionKey) => boolean;
  logout: () => Promise<void>;
  language: 'bn' | 'en';
  setLanguage: (lang: 'bn' | 'en') => void;
  websiteSettings: WebsiteSettings;
  themeSettings: ThemeSettings;
  pages: CmsPage[];
  pageSections: PageSection[];
  menus: NavMenuItem[];
  notices: Notice[];
  newsItems: NewsItem[];
  galleryItems: GalleryItem[];
  members: Member[];
  publicSummary: DashboardSummary;
  dbInitialized: boolean;
  initializingDb: boolean;
  triggerSeedDatabase: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminRecord, setAdminRecord] = useState<AdminRecord | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');

  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [dbInitialized, setDbInitialized] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [initializingDb, setInitializingDb] = useState(false);
  const autoSeedAttemptedRef = React.useRef(false);

  const [pages, setPages] = useState<CmsPage[]>(DEFAULT_CMS_PAGES as CmsPage[]);
  const [pageSections, setPageSections] = useState<PageSection[]>(DEFAULT_PAGE_SECTIONS as PageSection[]);
  const [menus, setMenus] = useState<NavMenuItem[]>(DEFAULT_NAV_MENUS as NavMenuItem[]);
  const [notices, setNotices] = useState<Notice[]>(DEFAULT_NOTICES as Notice[]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>(DEFAULT_NEWS as NewsItem[]);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(DEFAULT_GALLERY as GalleryItem[]);
  const [members, setMembers] = useState<Member[]>(DEFAULT_MEMBERS as Member[]);
  const [publicSummary, setPublicSummary] = useState<DashboardSummary>({
    id: 'public',
    totalIncomePoisha: 0,
    totalExpensePoisha: 0,
    totalBalancePoisha: 0,
    cashBalancePoisha: 0,
    bankBalancePoisha: 0,
    mobileBalancePoisha: 0,
    totalMembers: 0,
    totalDonors: 0,
  });

  // Auth listener & sync
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setAdminRecord(null);
        setAuthLoading(false);
        return;
      }
      try {
        const res = await syncUserOnSignIn({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'সদস্য',
          emailVerified: user.emailVerified,
        });
        setUserProfile(res.profile);
        setAdminRecord(res.adminRecord);
      } catch (err) {
        console.error('Auth sync error:', err);
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Derived RBAC helpers
  const isSuperAdmin = useMemo(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return false;
    if (firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_SUPER_ADMIN_EMAIL.toLowerCase()) return true;
    return adminRecord?.role === 'super_admin' && adminRecord.status === 'active';
  }, [firebaseUser, adminRecord]);

  const isAnyAdmin = useMemo(() => {
    if (isSuperAdmin) return true;
    if (!firebaseUser?.emailVerified) return false;
    return (
      adminRecord?.status === 'active' &&
      (adminRecord.role === 'super_admin' || adminRecord.role === 'sub_admin')
    );
  }, [isSuperAdmin, firebaseUser, adminRecord]);

  const hasPerm = (perm: AdminPermissionKey): boolean => {
    if (isSuperAdmin) return true;
    if (!isAnyAdmin || !adminRecord) return false;
    return adminRecord.fullAccess || adminRecord.permissions.includes(perm);
  };

  // Real-time public CMS listeners
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'websiteSettings', 'main'),
        (snap) => {
          if (snap.exists()) {
            setWebsiteSettings({ ...DEFAULT_WEBSITE_SETTINGS, ...(snap.data() as WebsiteSettings) });
            setDbInitialized(true);
          } else {
            setDbInitialized(false);
          }
          setSettingsLoaded(true);
        },
        (err) => {
          console.warn('websiteSettings listener:', err.message);
          setSettingsLoaded(true);
        }
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'websiteSettings', 'theme'),
        (snap) => {
          if (snap.exists()) {
            setThemeSettings({ ...DEFAULT_THEME_SETTINGS, ...(snap.data() as ThemeSettings) });
          }
        },
        (err) => console.warn('theme listener:', err.message)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'dashboardSummaries', 'public'),
        (snap) => {
          if (snap.exists()) {
            setPublicSummary(snap.data() as DashboardSummary);
          }
        },
        (err) => console.warn('summary listener:', err.message)
      )
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  // Collection listeners (re-bind when admin status changes so drafts are visible in CMS)
  useEffect(() => {
    const canSeeDrafts = hasPerm('cms');
    const unsubs: (() => void)[] = [];

    const qPages = canSeeDrafts
      ? query(collection(db, 'pages'), orderBy('order', 'asc'))
      : query(collection(db, 'pages'), where('isPublished', '==', true));
    unsubs.push(
      onSnapshot(
        qPages,
        (snap) => {
          if (!snap.empty || dbInitialized) {
            const list = snap.docs.map((d) => d.data() as CmsPage).sort((a, b) => a.order - b.order);
            setPages(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'pages')
      )
    );

    const qSec = canSeeDrafts
      ? collection(db, 'pageSections')
      : query(collection(db, 'pageSections'), where('status', '==', 'published'));
    unsubs.push(
      onSnapshot(
        qSec,
        (snap) => {
          const list = snap.docs.map((d) => d.data() as PageSection).sort((a, b) => a.order - b.order);
          setPageSections(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'pageSections')
      )
    );

    const qMenus = canSeeDrafts
      ? collection(db, 'menus')
      : query(collection(db, 'menus'), where('visible', '==', true));
    unsubs.push(
      onSnapshot(
        qMenus,
        (snap) => {
          if (!snap.empty || dbInitialized) {
            const list = snap.docs.map((d) => d.data() as NavMenuItem).sort((a, b) => a.order - b.order);
            setMenus(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'menus')
      )
    );

    const qNotices = canSeeDrafts
      ? collection(db, 'notices')
      : query(collection(db, 'notices'), where('isPublished', '==', true));
    unsubs.push(
      onSnapshot(
        qNotices,
        (snap) => {
          const list = snap.docs
            .map((d) => d.data() as Notice)
            .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''));
          setNotices(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notices')
      )
    );

    const qNews = canSeeDrafts
      ? collection(db, 'news')
      : query(collection(db, 'news'), where('isPublished', '==', true));
    unsubs.push(
      onSnapshot(
        qNews,
        (snap) => {
          const list = snap.docs
            .map((d) => d.data() as NewsItem)
            .sort((a, b) => (b.publishDate || '').localeCompare(a.publishDate || ''));
          setNewsItems(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'news')
      )
    );

    const qGallery = canSeeDrafts
      ? collection(db, 'galleries')
      : query(collection(db, 'galleries'), where('isPublished', '==', true));
    unsubs.push(
      onSnapshot(
        qGallery,
        (snap) => {
          setGalleryItems(snap.docs.map((d) => d.data() as GalleryItem));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'galleries')
      )
    );

    const qMembers = hasPerm('members')
      ? collection(db, 'members')
      : query(collection(db, 'members'), where('status', '==', 'active'));
    unsubs.push(
      onSnapshot(
        qMembers,
        (snap) => {
          const list = snap.docs
            .map((d) => d.data() as Member)
            .sort((a, b) => (a.committeeOrder ?? 999) - (b.committeeOrder ?? 999));
          setMembers(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'members')
      )
    );

    return () => unsubs.forEach((u) => u());
  }, [isSuperAdmin, adminRecord, dbInitialized, firebaseUser?.uid, firebaseUser?.emailVerified]);

  // Apply live ThemeSettings CSS variables and Dark Mode to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', themeSettings.primaryColor);
    root.style.setProperty('--color-secondary', themeSettings.secondaryColor);
    root.style.setProperty('--color-bg', themeSettings.backgroundColor);
    root.style.setProperty('--color-surface', themeSettings.surfaceColor);
    root.style.setProperty('--color-text', themeSettings.textColor);
    root.style.setProperty('--color-button', themeSettings.buttonColor);
    root.style.setProperty('--font-display', `'${themeSettings.fontFamily}', 'Plus Jakarta Sans', sans-serif`);
    root.style.setProperty('--font-body', `'${themeSettings.fontFamily}', 'Noto Sans Bengali', sans-serif`);
    root.style.setProperty('--radius-card', `${themeSettings.borderRadiusPx}px`);
    root.style.fontSize = `${themeSettings.baseFontSizePx}px`;

    if (themeSettings.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeSettings]);

  // Sync dynamic document title, favicon & OpenGraph meta tags from CMS
  useEffect(() => {
    if (websiteSettings.metaTitle) {
      document.title = websiteSettings.metaTitle;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', websiteSettings.metaTitle);
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && websiteSettings.metaDescription) {
      metaDesc.setAttribute('content', websiteSettings.metaDescription);
    }
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && websiteSettings.metaDescription) {
      ogDesc.setAttribute('content', websiteSettings.metaDescription);
    }
    if (websiteSettings.ogImageUrl) {
      let ogImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
      if (!ogImg) {
        ogImg = document.createElement('meta');
        ogImg.setAttribute('property', 'og:image');
        document.head.appendChild(ogImg);
      }
      ogImg.setAttribute('content', websiteSettings.ogImageUrl);
    }
    if (websiteSettings.faviconUrl) {
      let iconEl = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!iconEl) {
        iconEl = document.createElement('link');
        iconEl.rel = 'icon';
        document.head.appendChild(iconEl);
      }
      iconEl.href = websiteSettings.faviconUrl;
    }
  }, [
    websiteSettings.metaTitle,
    websiteSettings.metaDescription,
    websiteSettings.ogImageUrl,
    websiteSettings.faviconUrl,
  ]);

  const triggerSeedDatabase = async () => {
    if (!firebaseUser || !isSuperAdmin) return;
    setInitializingDb(true);
    try {
      await initializeOrganizationDatabase(
        firebaseUser.uid,
        userProfile?.displayName || firebaseUser.email || 'Super Admin'
      );
      setDbInitialized(true);
    } finally {
      setInitializingDb(false);
    }
  };

  // Auto-seed strictly once ONLY after settingsLoaded confirms DB is truly fresh
  useEffect(() => {
    if (
      settingsLoaded &&
      isSuperAdmin &&
      !dbInitialized &&
      !initializingDb &&
      firebaseUser &&
      !autoSeedAttemptedRef.current
    ) {
      autoSeedAttemptedRef.current = true;
      triggerSeedDatabase().catch((e) => console.warn('Auto-seed skipped/failed:', e));
    }
  }, [settingsLoaded, isSuperAdmin, dbInitialized, initializingDb, firebaseUser]);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        userProfile,
        adminRecord,
        authLoading,
        isSuperAdmin,
        isAnyAdmin,
        hasPerm,
        logout,
        language,
        setLanguage,
        websiteSettings,
        themeSettings,
        pages,
        pageSections,
        menus,
        notices,
        newsItems,
        galleryItems,
        members,
        publicSummary,
        dbInitialized,
        initializingDb,
        triggerSeedDatabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
