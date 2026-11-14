import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Edit3,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  deleteCmsPage,
  deleteGalleryItem,
  deleteNavMenu,
  deleteNewsItem,
  deleteNotice,
  deletePageSection,
  saveCmsPage,
  saveGalleryItem,
  saveNavMenu,
  saveNewsItem,
  saveNotice,
  savePageSection,
  saveThemeSettings,
  saveWebsiteSettings,
  uploadFileToStorage,
} from '../services/firestoreService';
import {
  CmsPage,
  GalleryItem,
  NavMenuItem,
  NewsItem,
  Notice,
  PageSection,
  SectionType,
  ThemeSettings,
  WebsiteSettings,
} from '../types/models';
import { generateDocId } from '../utils/bengali';
import { DynamicSections } from '../website/DynamicSections';

interface Props {
  activeMenu: 'content' | 'design' | 'builder' | 'pages' | 'menus' | 'media';
}

export const AdminCmsDesignModule: React.FC<Props> = ({ activeMenu }) => {
  const {
    websiteSettings,
    themeSettings,
    pages,
    pageSections,
    menus,
    notices,
    newsItems,
    galleryItems,
    firebaseUser,
    userProfile,
  } = useApp();

  const actorUid = firebaseUser?.uid || '';
  const actorName = userProfile?.displayName || firebaseUser?.email || 'Admin';

  const [siteForm, setSiteForm] = useState<WebsiteSettings>(websiteSettings);
  const [themeForm, setThemeForm] = useState<ThemeSettings>(themeSettings);
  const [saving, setSaving] = useState(false);
  const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'error'>('synced');
  const [msg, setMsg] = useState('');

  const siteDirtyRef = useRef(false);
  const themeDirtyRef = useRef(false);
  const sectionDirtyRef = useRef(false);

  useEffect(() => {
    if (!siteDirtyRef.current) {
      setSiteForm(websiteSettings);
    }
  }, [websiteSettings]);

  useEffect(() => {
    if (!themeDirtyRef.current) {
      setThemeForm(themeSettings);
    }
  }, [themeSettings]);

  const updateSiteForm = (updater: (prev: WebsiteSettings) => WebsiteSettings) => {
    siteDirtyRef.current = true;
    setSyncState('syncing');
    setSiteForm(updater);
  };

  const updateThemeForm = (updater: (prev: ThemeSettings) => ThemeSettings) => {
    themeDirtyRef.current = true;
    setSyncState('syncing');
    setThemeForm(updater);
  };

  // Real-time debounced auto-sync for WebsiteSettings (text, headings, URLs, etc.)
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
    }, 650);
    return () => clearTimeout(timer);
  }, [siteForm, actorUid, actorName]);

  // Real-time debounced auto-sync for ThemeSettings (colors, fonts, layout, darkMode)
  useEffect(() => {
    if (!themeDirtyRef.current || !actorUid) return;
    const timer = setTimeout(async () => {
      try {
        await saveThemeSettings(themeForm, actorUid, actorName, { skipAuditLog: true });
        themeDirtyRef.current = false;
        setSyncState('synced');
      } catch {
        setSyncState('error');
      }
    }, 550);
    return () => clearTimeout(timer);
  }, [themeForm, actorUid, actorName]);

  // Visual Page Builder State
  const [builderSlug, setBuilderSlug] = useState('home');
  const [previewMode, setPreviewMode] = useState(false);
  const [editingSec, setEditingSec] = useState<PageSection | null>(null);
  const [dragSecId, setDragSecId] = useState<string | null>(null);

  const updateEditingSec = (updater: (prev: PageSection) => PageSection) => {
    sectionDirtyRef.current = true;
    setSyncState('syncing');
    setEditingSec((prev) => (prev ? updater(prev) : prev));
  };

  // Auto-sync Visual Builder section changes straight to Firestore
  useEffect(() => {
    if (!sectionDirtyRef.current || !editingSec || !actorUid) return;
    const timer = setTimeout(async () => {
      try {
        await savePageSection(editingSec);
        sectionDirtyRef.current = false;
        setSyncState('synced');
      } catch {
        setSyncState('error');
      }
    }, 650);
    return () => clearTimeout(timer);
  }, [editingSec, actorUid]);

  // Page Manager State
  const [newPage, setNewPage] = useState({ slug: '', titleBn: '', titleEn: '', descriptionBn: '' });
  const [editingPage, setEditingPage] = useState<CmsPage | null>(null);

  // Menu Manager State
  const [newMenu, setNewMenu] = useState({ labelBn: '', labelEn: '', targetSlug: 'home', parentId: '' });
  const [editingMenu, setEditingMenu] = useState<NavMenuItem | null>(null);

  // Media & Content Tabs (Logo/Media vs Notices vs News vs Gallery)
  const [mediaTab, setMediaTab] = useState<'logos' | 'notices' | 'news' | 'gallery'>('logos');

  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [newNotice, setNewNotice] = useState({
    titleBn: '',
    category: 'সাধারণ সভা',
    bodyBn: '',
    publishDate: new Date().toISOString().slice(0, 10),
    isPinned: false,
  });

  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newNews, setNewNews] = useState<{
    type: 'news' | 'activity' | 'achievement';
    titleBn: string;
    summaryBn: string;
    bodyBn: string;
    imageUrl: string;
    publishDate: string;
  }>({
    type: 'news',
    titleBn: '',
    summaryBn: '',
    bodyBn: '',
    imageUrl: '',
    publishDate: new Date().toISOString().slice(0, 10),
  });

  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [newGallery, setNewGallery] = useState<{
    mediaType: 'image' | 'video';
    titleBn: string;
    captionBn: string;
    url: string;
    album: string;
  }>({
    mediaType: 'image',
    titleBn: '',
    captionBn: '',
    url: '',
    album: 'সাধারণ',
  });

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const notify = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4500);
  };

  const SyncPill = () => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
        syncState === 'synced'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
          : syncState === 'syncing'
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          : 'border-red-200 bg-red-50 text-red-800'
      }`}
    >
      {syncState === 'synced' ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <RefreshCw className={`h-3.5 w-3.5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
      )}
      {syncState === 'synced'
        ? 'Firebase-এ লাইভ সংরক্ষিত'
        : syncState === 'syncing'
        ? 'Firebase-এ আপডেট হচ্ছে...'
        : 'সিঙ্ক ত্রুটি'}
    </span>
  );

  const handleUploadAsset = async (
    file: File,
    target: 'logo' | 'altLogo' | 'banner' | 'favicon' | 'gallery' | 'news' | 'section'
  ) => {
    if (!actorUid) return;
    setUploadingField(target);
    setSyncState('syncing');
    try {
      const maxDim =
        target === 'favicon' ? 128 : target === 'logo' || target === 'altLogo' ? 420 : 1080;
      const url = await uploadFileToStorage(file, 'public', 'cms', actorUid, { maxDim });

      if (target === 'logo' || target === 'altLogo' || target === 'banner' || target === 'favicon') {
        const fieldMap = {
          logo: 'logoUrl',
          altLogo: 'altLogoUrl',
          banner: 'heroBannerUrl',
          favicon: 'faviconUrl',
        } as const;
        const fieldKey = fieldMap[target];
        const nextSite = { ...siteForm, [fieldKey]: url };
        siteDirtyRef.current = false;
        setSiteForm(nextSite);
        await saveWebsiteSettings({ [fieldKey]: url }, actorUid, actorName);
        setSyncState('synced');
        notify('ছবি আপলোড হয়ে তাৎক্ষণিক Firebase ও ওয়েবসাইটে আপডেট হয়েছে!');
      } else if (target === 'gallery') {
        setNewGallery((p) => ({ ...p, url }));
        setSyncState('synced');
        notify('গ্যালারি ছবি প্রস্তুত হয়েছে! এবার "যোগ/আপডেট করুন" বাটনে ক্লিক করুন।');
      } else if (target === 'news') {
        setNewNews((p) => ({ ...p, imageUrl: url }));
        setSyncState('synced');
        notify('সংবাদের ছবি প্রস্তুত হয়েছে!');
      } else if (target === 'section' && editingSec) {
        const nextSec = { ...editingSec, imageUrl: url };
        sectionDirtyRef.current = false;
        setEditingSec(nextSec);
        await savePageSection(nextSec);
        setSyncState('synced');
        notify('সেকশনের ছবি আপলোড হয়ে তাৎক্ষণিক Firebase-এ সেভ হয়েছে!');
      }
    } catch (e) {
      setSyncState('error');
      notify(`আপলোড ব্যর্থ: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleClearSiteAsset = async (
    field: 'logoUrl' | 'altLogoUrl' | 'heroBannerUrl' | 'faviconUrl'
  ) => {
    if (!actorUid) return;
    setSyncState('syncing');
    siteDirtyRef.current = false;
    setSiteForm((p) => ({ ...p, [field]: '' }));
    await saveWebsiteSettings({ [field]: '' }, actorUid, actorName);
    setSyncState('synced');
    notify('ছবি মুছে Firebase থেকে তাৎক্ষণিক আপডেট করা হয়েছে!');
  };

  // 1. Website Content Management
  if (activeMenu === 'content') {
    const saveContent = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setSyncState('syncing');
      try {
        siteDirtyRef.current = false;
        await saveWebsiteSettings(siteForm, actorUid, actorName);
        setSyncState('synced');
        notify('ওয়েবসাইটের সমস্ত লেখা ও তথ্য সফলভাবে Firebase-এ সংরক্ষণ করা হয়েছে!');
      } finally {
        setSaving(false);
      }
    };

    return (
      <form onSubmit={saveContent} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">ওয়েবসাইট কনটেন্ট ব্যবস্থাপনা (A-to-Z)</h2>
            <p className="text-xs text-slate-500">
              যেকোনো পরিবর্তন করার সাথে সাথেই তা স্বয়ংক্রিয়ভাবে Firebase Firestore-এ সংরক্ষিত হয়ে পাবলিক ওয়েবসাইটে লাইভ আপডেট হবে।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SyncPill />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'এখনই সেভ করুন'}
            </button>
          </div>
        </div>

        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div>
            <label className="block text-xs font-medium mb-1">সংগঠনের নাম (বাংলা)</label>
            <input
              value={siteForm.orgNameBn}
              onChange={(e) =>
                updateSiteForm((prev) => ({ ...prev, orgNameBn: e.target.value, websiteNameBn: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Organization Name (English)</label>
            <input
              value={siteForm.orgNameEn}
              onChange={(e) =>
                updateSiteForm((prev) => ({ ...prev, orgNameEn: e.target.value, websiteNameEn: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">স্লোগান / ট্যাগলাইন (বাংলা)</label>
            <input
              value={siteForm.taglineBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, taglineBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tagline (English)</label>
            <input
              value={siteForm.taglineEn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, taglineEn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">হিরো শিরোনাম (বাংলা)</label>
            <input
              value={siteForm.heroTitleBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroTitleBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Hero Title (English)</label>
            <input
              value={siteForm.heroTitleEn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroTitleEn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">হিরো বর্ণনা (বাংলা)</label>
            <textarea
              rows={3}
              value={siteForm.heroSubtitleBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroSubtitleBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Hero Subtitle (English)</label>
            <textarea
              rows={3}
              value={siteForm.heroSubtitleEn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroSubtitleEn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">প্রাইমারি বাটন টেক্সট</label>
            <input
              value={siteForm.heroPrimaryBtnTextBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroPrimaryBtnTextBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">প্রাইমারি বাটন লিংক (Page Slug)</label>
            <input
              value={siteForm.heroPrimaryBtnLink}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroPrimaryBtnLink: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">সেকেন্ডারি বাটন টেক্সট</label>
            <input
              value={siteForm.heroSecondaryBtnTextBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroSecondaryBtnTextBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">সেকেন্ডারি বাটন লিংক</label>
            <input
              value={siteForm.heroSecondaryBtnLink}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroSecondaryBtnLink: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div>
            <label className="block text-xs font-medium mb-1">আমাদের সম্পর্কে (About Us - বাংলা)</label>
            <textarea
              rows={3}
              value={siteForm.aboutTextBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, aboutTextBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">About Us (English)</label>
            <textarea
              rows={3}
              value={siteForm.aboutTextEn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, aboutTextEn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">সংগঠনের ইতিহাস</label>
            <textarea
              rows={3}
              value={siteForm.historyTextBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, historyTextBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">লক্ষ্য (Mission)</label>
            <textarea
              rows={3}
              value={siteForm.missionBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, missionBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">রূপকল্প (Vision)</label>
            <textarea
              rows={3}
              value={siteForm.visionBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, visionBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">ফোন নম্বর</label>
            <input
              value={siteForm.contactPhone}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">ইমেইল</label>
            <input
              value={siteForm.contactEmail}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">কার্যালয়ের ঠিকানা</label>
            <input
              value={siteForm.officeAddressBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, officeAddressBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">কপিরাইট টেক্সট</label>
            <input
              value={siteForm.copyrightBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, copyrightBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Facebook Page URL</label>
            <input
              placeholder="https://facebook.com/..."
              value={siteForm.facebookUrl || ''}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, facebookUrl: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">YouTube Channel URL</label>
            <input
              placeholder="https://youtube.com/..."
              value={siteForm.youtubeUrl || ''}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, youtubeUrl: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">সংগঠনের প্রধান উদ্দেশ্যসমূহ (প্রতি লাইনে একটি)</label>
            <textarea
              rows={4}
              value={siteForm.goalsListBn.join('\n')}
              onChange={(e) =>
                updateSiteForm((prev) => ({
                  ...prev,
                  goalsListBn: e.target.value.split('\n'),
                }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1">ফুটার তথ্য</label>
            <input
              value={siteForm.footerInfoBn}
              onChange={(e) => updateSiteForm((prev) => ({ ...prev, footerInfoBn: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              সমস্ত পেজ ও সেকশন শিরোনাম (A-to-Z টেক্সট নিয়ন্ত্রণ)
            </h3>
            <p className="text-xs text-slate-500">
              ওয়েবসাইটের প্রতিটি সেকশনের হেডিং, ফুটার কলাম ও রশিদের স্বাক্ষরকারীর পদবি এখান থেকে পরিবর্তন করতে পারবেন।
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(
              [
                ['aboutTitleBn', 'আমাদের সম্পর্কে শিরোনাম'],
                ['homeNoticesTitleBn', 'হোমপেজ নোটিশ সেকশন শিরোনাম'],
                ['homeNewsTitleBn', 'হোমপেজ সংবাদ সেকশন শিরোনাম'],
                ['missionTitleBn', 'লক্ষ্য (Mission) শিরোনাম'],
                ['visionTitleBn', 'রূপকল্প (Vision) শিরোনাম'],
                ['goalsTitleBn', 'উদ্দেশ্য তালিকা শিরোনাম'],
                ['activitiesTitleBn', 'কার্যক্রম পেজ শিরোনাম'],
                ['membersTitleBn', 'সদস্যবৃন্দ পেজ শিরোনাম'],
                ['committeeTitleBn', 'কার্যনির্বাহী কমিটি শিরোনাম'],
                ['noticesTitleBn', 'নোটিশ বোর্ড শিরোনাম'],
                ['newsTitleBn', 'সংবাদ ও আপডেট শিরোনাম'],
                ['galleryTitleBn', 'গ্যালারি পেজ শিরোনাম'],
                ['achievementsTitleBn', 'অর্জন পেজ শিরোনাম'],
                ['transparencyTitleBn', 'আর্থিক স্বচ্ছতা শিরোনাম'],
                ['contactTitleBn', 'যোগাযোগ পেজ শিরোনাম'],
                ['contactFormTitleBn', 'যোগাযোগ ফর্ম শিরোনাম'],
                ['footerCol1TitleBn', 'ফুটার কলাম ১ শিরোনাম'],
                ['footerCol2TitleBn', 'ফুটার কলাম ২ শিরোনাম'],
                ['treasurerTitleBn', 'রশিদ/ভাউচার কোষাধ্যক্ষ পদবি'],
                ['presidentTitleBn', 'রশিদ/ভাউচার সভাপতি পদবি'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium mb-1">{label}</label>
                <input
                  value={String(siteForm[key] || '')}
                  onChange={(e) => updateSiteForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium mb-1">আর্থিক স্বচ্ছতা পেজের উপ-বিবরণ</label>
              <input
                value={siteForm.transparencySubtitleBn || ''}
                onChange={(e) =>
                  updateSiteForm((prev) => ({ ...prev, transparencySubtitleBn: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </form>
    );
  }

  // 2. Visual Design Control Center
  if (activeMenu === 'design') {
    const saveDesign = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setSyncState('syncing');
      try {
        themeDirtyRef.current = false;
        await saveThemeSettings(themeForm, actorUid, actorName);
        setSyncState('synced');
        notify('ভিজ্যুয়াল ডিজাইন ও থিম Firebase-এ সেভ করা হয়েছে!');
      } finally {
        setSaving(false);
      }
    };

    return (
      <form onSubmit={saveDesign} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">ভিজ্যুয়াল ডিজাইন কন্ট্রোল সেন্টার</h2>
            <p className="text-xs text-slate-500">রঙ, ফন্ট, রেডিয়াস, শ্যাডো, লেআউট এবং ডার্ক মোড পরিবর্তন করার সাথে সাথেই Firebase-এ সিঙ্ক হয়।</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SyncPill />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? 'প্রয়োগ হচ্ছে...' : 'ডিজাইন সেভ করুন'}
            </button>
          </div>
        </div>

        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          {[
            { key: 'primaryColor', label: 'Primary Color' },
            { key: 'secondaryColor', label: 'Secondary Color' },
            { key: 'backgroundColor', label: 'Background Color' },
            { key: 'surfaceColor', label: 'Surface / Card Color' },
            { key: 'textColor', label: 'Text Color' },
            { key: 'buttonColor', label: 'Button Color' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1.5">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={String(themeForm[key as keyof ThemeSettings])}
                  onChange={(e) => updateThemeForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="h-10 w-12 rounded border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={String(themeForm[key as keyof ThemeSettings])}
                  onChange={(e) => updateThemeForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium mb-1.5">ফন্ট ফ্যামিলি (Font Family)</label>
            <select
              value={themeForm.fontFamily}
              onChange={(e) =>
                updateThemeForm((prev) => ({ ...prev, fontFamily: e.target.value as ThemeSettings['fontFamily'] }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="Hind Siliguri">Hind Siliguri (Recommended)</option>
              <option value="Noto Sans Bengali">Noto Sans Bengali</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">মূল ফন্ট সাইজ (px)</label>
            <input
              type="number"
              min={13}
              max={20}
              value={themeForm.baseFontSizePx}
              onChange={(e) => updateThemeForm((prev) => ({ ...prev, baseFontSizePx: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Border Radius (px)</label>
            <input
              type="number"
              min={0}
              max={24}
              value={themeForm.borderRadiusPx}
              onChange={(e) => updateThemeForm((prev) => ({ ...prev, borderRadiusPx: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">লেআউট প্রস্থ (Layout Width)</label>
            <select
              value={themeForm.layoutWidth}
              onChange={(e) =>
                updateThemeForm((prev) => ({ ...prev, layoutWidth: e.target.value as 'standard' | 'wide' }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="standard">Standard (1152px)</option>
              <option value="wide">Wide (1280px)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">কার্ড ডিজাইন</label>
            <select
              value={themeForm.cardStyle}
              onChange={(e) =>
                updateThemeForm((prev) => ({ ...prev, cardStyle: e.target.value as ThemeSettings['cardStyle'] }))
              }
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="bordered">Bordered Clean</option>
              <option value="elevated">Soft Elevated</option>
              <option value="flat">Flat Surface</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <input
              id="darkModeSwitch"
              type="checkbox"
              checked={themeForm.darkMode}
              onChange={(e) => updateThemeForm((prev) => ({ ...prev, darkMode: e.target.checked }))}
              className="h-4 w-4 accent-emerald-700"
            />
            <label htmlFor="darkModeSwitch" className="text-sm font-medium cursor-pointer">
              ডিফল্ট ডার্ক মোড (Dark Mode) চালু করুন
            </label>
          </div>
        </div>
      </form>
    );
  }

  // 3. Visual Page Builder (Drag & Drop Sections, Draft/Publish, Image Upload, Cards/Stats Editor, Auto-Save)
  if (activeMenu === 'builder') {
    const sectionsForPage = pageSections
      .filter((s) => s.pageSlug === builderSlug)
      .sort((a, b) => a.order - b.order);

    const addSection = async (type: SectionType) => {
      const id = generateDocId('sec');
      const sec: PageSection = {
        id,
        pageSlug: builderSlug,
        type,
        titleBn: 'নতুন সেকশন শিরোনাম',
        subtitleBn: 'এখানে সংক্ষিপ্ত বিবরণ লিখুন',
        bodyHtml: type === 'richtext' ? '<p>এখানে বিস্তারিত অনুচ্ছেদ লিখুন।</p>' : '',
        imageUrl: '',
        buttonTextBn: type === 'cta' || type === 'hero' ? 'আরও জানুন' : '',
        buttonLink: 'about',
        items:
          type === 'cards' || type === 'stats'
            ? [{ title: 'শিরোনাম ১', value: '১০০%', description: 'বিবরণ' }]
            : [],
        order: sectionsForPage.length + 1,
        visible: true,
        status: 'draft',
      };
      await savePageSection(sec);
      sectionDirtyRef.current = false;
      setEditingSec(sec);
      notify('নতুন সেকশন Firebase-এ ড্রাফট হিসেবে যুক্ত হয়েছে!');
    };

    const moveSection = async (idx: number, dir: -1 | 1) => {
      const targetIdx = idx + dir;
      if (targetIdx < 0 || targetIdx >= sectionsForPage.length) return;
      const a = sectionsForPage[idx];
      const b = sectionsForPage[targetIdx];
      await savePageSection({ ...a, order: b.order });
      await savePageSection({ ...b, order: a.order });
    };

    const handleDropSection = async (targetId: string) => {
      if (!dragSecId || dragSecId === targetId) return;
      const source = sectionsForPage.find((s) => s.id === dragSecId);
      const target = sectionsForPage.find((s) => s.id === targetId);
      if (!source || !target) return;
      await savePageSection({ ...source, order: target.order });
      await savePageSection({ ...target, order: source.order });
      setDragSecId(null);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">ভিজ্যুয়াল ওয়েবসাইট বিল্ডার</h2>
            <p className="text-xs text-slate-500">ড্র্যাগ অ্যান্ড ড্রপ করে সেকশন সাজান, ছবি আপলোড করুন, প্রিভিউ দেখুন এবং পাবলিশ করুন।</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SyncPill />
            <select
              value={builderSlug}
              onChange={(e) => {
                setBuilderSlug(e.target.value);
                setEditingSec(null);
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.titleBn} (/{p.slug})
                </option>
              ))}
            </select>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              {previewMode ? 'এডিটর মোড' : 'লাইভ প্রিভিউ'}
            </button>
          </div>
        </div>

        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}

        {previewMode ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6">
            <DynamicSections pageSlug={builderSlug} onNavigate={() => {}} includeDrafts />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h3 className="text-sm font-bold mb-3">নতুন সেকশন যোগ করুন</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['richtext', 'টেক্সট ব্লক'],
                      ['image', 'ছবি ব্লক'],
                      ['banner', 'ব্যানার'],
                      ['cta', 'বাটন / CTA'],
                      ['notice_board', 'নোটিশ বোর্ড'],
                      ['gallery', 'গ্যালারি'],
                      ['stats', 'পরিসংখ্যান'],
                      ['cards', 'কার্ড গ্রিড'],
                    ] as [SectionType, string][]
                  ).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => addSection(type)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium hover:border-emerald-600 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-700" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2">
                <h3 className="text-sm font-bold mb-2">পেজের সেকশনসমূহ ({sectionsForPage.length})</h3>
                {sectionsForPage.map((sec, idx) => (
                  <div
                    key={sec.id}
                    draggable
                    onDragStart={() => setDragSecId(sec.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropSection(sec.id)}
                    className={`rounded-lg border p-3 text-xs cursor-move ${
                      editingSec?.id === sec.id
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          sectionDirtyRef.current = false;
                          setEditingSec(sec);
                        }}
                        className="text-left font-semibold truncate flex-1 cursor-pointer"
                      >
                        {idx + 1}. {sec.titleBn || sec.type}
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveSection(idx, -1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button onClick={() => moveSection(idx, 1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => savePageSection({ ...sec, visible: !sec.visible })}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                        >
                          {sec.visible ? <Eye className="h-3 w-3 text-emerald-700" /> : <EyeOff className="h-3 w-3 text-slate-400" />}
                        </button>
                        <button
                          onClick={async () => {
                            await deletePageSection(sec.id);
                            if (editingSec?.id === sec.id) setEditingSec(null);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      ধরন: {sec.type} · অবস্থা: {sec.status === 'published' ? 'পাবলিশড' : 'ড্রাফট'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8">
              {editingSec ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">সেকশন সম্পাদনা ({editingSec.type})</h3>
                    <span className="text-xs text-slate-500">
                      {editingSec.status === 'published' ? 'পাবলিশড (লাইভ)' : 'ড্রাফট'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">শিরোনাম (বাংলা)</label>
                      <input
                        value={editingSec.titleBn || ''}
                        onChange={(e) => updateEditingSec((prev) => ({ ...prev, titleBn: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">উপ-শিরোনাম</label>
                      <input
                        value={editingSec.subtitleBn || ''}
                        onChange={(e) => updateEditingSec((prev) => ({ ...prev, subtitleBn: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  {(editingSec.type === 'richtext' || editingSec.type === 'banner') && (
                    <div>
                      <label className="block text-xs font-medium mb-1">নিরাপদ রিচ টেক্সট (Sanitized HTML অনুমোদিত)</label>
                      <textarea
                        rows={4}
                        value={editingSec.bodyHtml || ''}
                        onChange={(e) => updateEditingSec((prev) => ({ ...prev, bodyHtml: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium">ছবি (URL বা সরাসরি আপলোড)</label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        placeholder="ছবির URL বা আপলোড করুন"
                        value={editingSec.imageUrl || ''}
                        onChange={(e) => updateEditingSec((prev) => ({ ...prev, imageUrl: e.target.value }))}
                        className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                      />
                      <label className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingField === 'section' ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleUploadAsset(e.target.files[0], 'section')}
                        />
                      </label>
                      {editingSec.imageUrl && (
                        <button
                          type="button"
                          onClick={() => updateEditingSec((prev) => ({ ...prev, imageUrl: '' }))}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" /> মুছুন
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">বাটন টেক্সট</label>
                      <input
                        value={editingSec.buttonTextBn || ''}
                        onChange={(e) => updateEditingSec((prev) => ({ ...prev, buttonTextBn: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">বাটন লিংক</label>
                      <input
                        value={editingSec.buttonLink || ''}
                        onChange={(e) => updateEditingSec((prev) => ({ ...prev, buttonLink: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {(editingSec.type === 'cards' || editingSec.type === 'stats') && (
                    <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold">কার্ড / পরিসংখ্যান আইটেম ({(editingSec.items || []).length})</label>
                        <button
                          type="button"
                          onClick={() =>
                            updateEditingSec((prev) => ({
                              ...prev,
                              items: [...(prev.items || []), { title: 'নতুন আইটেম', value: '', description: '' }],
                            }))
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-600 px-2.5 py-1 text-xs font-semibold text-emerald-700 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" /> আইটেম যোগ করুন
                        </button>
                      </div>
                      {(editingSec.items || []).map((it, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                          <input
                            placeholder="শিরোনাম"
                            value={it.title}
                            onChange={(e) =>
                              updateEditingSec((prev) => {
                                const next = [...(prev.items || [])];
                                next[idx] = { ...next[idx], title: e.target.value };
                                return { ...prev, items: next };
                              })
                            }
                            className="rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs"
                          />
                          <input
                            placeholder="মান / ট্যাগ"
                            value={it.value || ''}
                            onChange={(e) =>
                              updateEditingSec((prev) => {
                                const next = [...(prev.items || [])];
                                next[idx] = { ...next[idx], value: e.target.value };
                                return { ...prev, items: next };
                              })
                            }
                            className="rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs"
                          />
                          <input
                            placeholder="বিবরণ"
                            value={it.description || ''}
                            onChange={(e) =>
                              updateEditingSec((prev) => {
                                const next = [...(prev.items || [])];
                                next[idx] = { ...next[idx], description: e.target.value };
                                return { ...prev, items: next };
                              })
                            }
                            className="rounded border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateEditingSec((prev) => ({
                                ...prev,
                                items: (prev.items || []).filter((_, i) => i !== idx),
                              }))
                            }
                            className="rounded border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            মুছুন
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        sectionDirtyRef.current = false;
                        const updated = { ...editingSec, status: 'draft' as const };
                        await savePageSection(updated);
                        setEditingSec(updated);
                        setSyncState('synced');
                        notify('ড্রাফট হিসেবে Firebase-এ সেভ হয়েছে!');
                      }}
                      className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold cursor-pointer"
                    >
                      ড্রাফট সেভ করুন
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        sectionDirtyRef.current = false;
                        const updated = { ...editingSec, status: 'published' as const };
                        await savePageSection(updated);
                        setEditingSec(updated);
                        setSyncState('synced');
                        notify('সেকশন লাইভ পাবলিশ করা হয়েছে!');
                      }}
                      className="rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                    >
                      পাবলিশ করুন
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                  বাম পাশ থেকে যেকোনো সেকশন নির্বাচন করুন অথবা নতুন সেকশন যোগ করুন।
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. Page Management (Create, Edit, Publish/Hide, Delete)
  if (activeMenu === 'pages') {
    const createPage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPage.slug || !newPage.titleBn) return;
      const cleanSlug = newPage.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const p: CmsPage = {
        id: `page_${cleanSlug}`,
        slug: cleanSlug,
        titleBn: newPage.titleBn,
        titleEn: newPage.titleEn || newPage.titleBn,
        descriptionBn: newPage.descriptionBn,
        isPublished: true,
        isSystemPage: false,
        order: pages.length + 1,
      };
      await saveCmsPage(p);
      setNewPage({ slug: '', titleBn: '', titleEn: '', descriptionBn: '' });
      notify(`নতুন পেজ /${cleanSlug} Firebase-এ তৈরি হয়েছে!`);
    };

    const saveEditedPage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingPage) return;
      await saveCmsPage(editingPage);
      setEditingPage(null);
      notify('পেজের তথ্য Firebase-এ আপডেট হয়েছে!');
    };

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">পেজ ম্যানেজমেন্ট</h2>
        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        <form onSubmit={createPage} className="grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <input
            required
            placeholder="Slug (যেমন: scholarship)"
            value={newPage.slug}
            onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            required
            placeholder="পেজ শিরোনাম (বাংলা)"
            value={newPage.titleBn}
            onChange={(e) => setNewPage({ ...newPage, titleBn: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            placeholder="Title (English)"
            value={newPage.titleEn}
            onChange={(e) => setNewPage({ ...newPage, titleEn: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            placeholder="সংক্ষিপ্ত বিবরণ"
            value={newPage.descriptionBn}
            onChange={(e) => setNewPage({ ...newPage, descriptionBn: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer">
            নতুন পেজ তৈরি করুন
          </button>
        </form>

        {editingPage && (
          <form onSubmit={saveEditedPage} className="grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-xl border border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 p-5">
            <input
              required
              placeholder="শিরোনাম (বাংলা)"
              value={editingPage.titleBn}
              onChange={(e) => setEditingPage({ ...editingPage, titleBn: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="Title (English)"
              value={editingPage.titleEn || ''}
              onChange={(e) => setEditingPage({ ...editingPage, titleEn: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="বিবরণ"
              value={editingPage.descriptionBn || ''}
              onChange={(e) => setEditingPage({ ...editingPage, descriptionBn: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="ক্রম (Order)"
              value={editingPage.order}
              onChange={(e) => setEditingPage({ ...editingPage, order: Number(e.target.value) })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white cursor-pointer">
                আপডেট করুন
              </button>
              <button type="button" onClick={() => setEditingPage(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs cursor-pointer">
                বাতিল
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">শিরোনাম</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">ক্রম</th>
                <th className="px-4 py-3 text-left">অবস্থা</th>
                <th className="px-4 py-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {pages.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.titleBn}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">/{p.slug}</td>
                  <td className="px-4 py-3 text-xs">{p.order}</td>
                  <td className="px-4 py-3 text-xs">{p.isPublished ? 'পাবলিশড' : 'হাইড করা'}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => setEditingPage(p)}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                    >
                      সম্পাদনা
                    </button>
                    <button
                      onClick={() => saveCmsPage({ ...p, isPublished: !p.isPublished })}
                      className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {p.isPublished ? 'হাইড করুন' : 'পাবলিশ করুন'}
                    </button>
                    {!p.isSystemPage && (
                      <button onClick={() => deleteCmsPage(p.id)} className="text-xs text-red-600 hover:underline cursor-pointer">
                        মুছুন
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 5. Navigation & Dropdown Menu Management (Create, Edit, Toggle, Delete)
  if (activeMenu === 'menus') {
    const addMenu = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMenu.labelBn || !newMenu.targetSlug) return;
      const item: NavMenuItem = {
        id: generateDocId('menu'),
        labelBn: newMenu.labelBn,
        labelEn: newMenu.labelEn || newMenu.labelBn,
        targetSlug: newMenu.targetSlug,
        parentId: newMenu.parentId || '',
        order: menus.length + 1,
        visible: true,
      };
      await saveNavMenu(item);
      setNewMenu({ labelBn: '', labelEn: '', targetSlug: 'home', parentId: '' });
      notify('ন্যাভিগেশন মেনু Firebase-এ যোগ করা হয়েছে!');
    };

    const saveEditedMenu = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingMenu) return;
      await saveNavMenu(editingMenu);
      setEditingMenu(null);
      notify('মেনু পরিবর্তন Firebase-এ আপডেট হয়েছে!');
    };

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">নেভিগেশন ও ড্রপডাউন মেনু ব্যবস্থাপনা</h2>
        {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}
        <form onSubmit={addMenu} className="grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <input
            required
            placeholder="মেনু নাম (বাংলা)"
            value={newMenu.labelBn}
            onChange={(e) => setNewMenu({ ...newMenu, labelBn: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <input
            placeholder="Label (English)"
            value={newMenu.labelEn}
            onChange={(e) => setNewMenu({ ...newMenu, labelEn: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          />
          <select
            value={newMenu.targetSlug}
            onChange={(e) => setNewMenu({ ...newMenu, targetSlug: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          >
            {pages.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.titleBn} (/{p.slug})
              </option>
            ))}
          </select>
          <select
            value={newMenu.parentId}
            onChange={(e) => setNewMenu({ ...newMenu, parentId: e.target.value })}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
          >
            <option value="">টপ-লেভেল মেনু</option>
            {menus
              .filter((m) => !m.parentId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  ড্রপডাউন: {m.labelBn}
                </option>
              ))}
          </select>
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer">
            মেনু যোগ করুন
          </button>
        </form>

        {editingMenu && (
          <form onSubmit={saveEditedMenu} className="grid grid-cols-1 sm:grid-cols-6 gap-3 rounded-xl border border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 p-5">
            <input
              required
              placeholder="মেনু নাম (বাংলা)"
              value={editingMenu.labelBn}
              onChange={(e) => setEditingMenu({ ...editingMenu, labelBn: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <input
              placeholder="Label (English)"
              value={editingMenu.labelEn || ''}
              onChange={(e) => setEditingMenu({ ...editingMenu, labelEn: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <select
              value={editingMenu.targetSlug}
              onChange={(e) => setEditingMenu({ ...editingMenu, targetSlug: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.titleBn} (/{p.slug})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="ক্রম"
              value={editingMenu.order}
              onChange={(e) => setEditingMenu({ ...editingMenu, order: Number(e.target.value) })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <select
              value={editingMenu.parentId || ''}
              onChange={(e) => setEditingMenu({ ...editingMenu, parentId: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="">টপ-লেভেল মেনু</option>
              {menus
                .filter((m) => !m.parentId && m.id !== editingMenu.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    ড্রপডাউন: {m.labelBn}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white cursor-pointer">
                সেভ
              </button>
              <button type="button" onClick={() => setEditingMenu(null)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs cursor-pointer">
                বাতিল
              </button>
            </div>
          </form>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">মেনু নাম</th>
                <th className="px-4 py-3 text-left">টার্গেট পেজ</th>
                <th className="px-4 py-3 text-left">ক্রম / ধরন</th>
                <th className="px-4 py-3 text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {menus.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium">{m.labelBn}</td>
                  <td className="px-4 py-3 font-mono text-xs">/{m.targetSlug}</td>
                  <td className="px-4 py-3 text-xs">#{m.order} · {m.parentId ? 'ড্রপডাউন সাব-মেনু' : 'টপ মেনু'}</td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button
                      onClick={() => setEditingMenu(m)}
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:underline cursor-pointer"
                    >
                      সম্পাদনা
                    </button>
                    <button
                      onClick={() => saveNavMenu({ ...m, visible: !m.visible })}
                      className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      {m.visible ? 'দৃশ্যমান' : 'লুকানো'}
                    </button>
                    <button onClick={() => deleteNavMenu(m.id)} className="text-xs text-red-600 hover:underline cursor-pointer">
                      মুছুন
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 6. Logo, Media, Notices, News & Gallery Management
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">লোগো, মিডিয়া, নোটিশ, সংবাদ ও গ্যালারি</h2>
          <SyncPill />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
          {(
            [
              ['logos', 'লোগো ও ব্যানার'],
              ['notices', 'নোটিশ বোর্ড'],
              ['news', 'সংবাদ / অর্জন'],
              ['gallery', 'গ্যালারি'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setMediaTab(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                mediaTab === tab ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {msg && <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">{msg}</div>}

      {mediaTab === 'logos' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
          <p className="text-xs text-slate-500">
            ছবি আপলোড বা URL পরিবর্তন করার সাথে সাথেই তা Firebase-এ সংরক্ষিত হয়ে পুরো ওয়েবসাইটে প্রদর্শিত হবে।
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold mb-1.5">মূল লোগো URL / আপলোড</label>
              <div className="flex items-center gap-2">
                {siteForm.logoUrl ? (
                  <img src={siteForm.logoUrl} alt="Logo" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover border shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-emerald-800 text-white flex items-center justify-center text-lg font-bold border shrink-0">
                    ক
                  </div>
                )}
                <input
                  placeholder="লোগোর URL অথবা পাশে আপলোড করুন"
                  value={siteForm.logoUrl}
                  onChange={(e) => updateSiteForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs"
                />
                <label className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingField === 'logo' ? '...' : 'আপলোড'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadAsset(e.target.files[0], 'logo')} />
                </label>
                {siteForm.logoUrl && (
                  <button
                    type="button"
                    onClick={() => handleClearSiteAsset('logoUrl')}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 cursor-pointer"
                    title="লোগো মুছুন"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">বিকল্প লোগো (Alternative Logo)</label>
              <div className="flex items-center gap-2">
                {siteForm.altLogoUrl ? (
                  <img src={siteForm.altLogoUrl} alt="Alt Logo" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full object-cover border shrink-0" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-slate-800 text-white flex items-center justify-center text-lg font-bold border shrink-0">
                    ক
                  </div>
                )}
                <input
                  placeholder="বিকল্প লোগো URL (ঐচ্ছিক)"
                  value={siteForm.altLogoUrl}
                  onChange={(e) => updateSiteForm((prev) => ({ ...prev, altLogoUrl: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs"
                />
                <label className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingField === 'altLogo' ? '...' : 'আপলোড'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadAsset(e.target.files[0], 'altLogo')} />
                </label>
                {siteForm.altLogoUrl && (
                  <button
                    type="button"
                    onClick={() => handleClearSiteAsset('altLogoUrl')}
                    className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 cursor-pointer"
                    title="বিকল্প লোগো মুছুন"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5">ফ্যাভিকন (Browser Tab Icon)</label>
              <div className="flex items-center gap-2">
                <input
                  placeholder="/icon.svg অথবা আপলোড করুন"
                  value={siteForm.faviconUrl}
                  onChange={(e) => updateSiteForm((prev) => ({ ...prev, faviconUrl: e.target.value }))}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs"
                />
                <label className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingField === 'favicon' ? '...' : 'আপলোড'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadAsset(e.target.files[0], 'favicon')} />
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1.5">হোমপেজ ব্যানার ছবি (Website Banner)</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {siteForm.heroBannerUrl ? (
                  <img src={siteForm.heroBannerUrl} alt="Banner" referrerPolicy="no-referrer" className="h-24 w-44 rounded-lg object-cover border shrink-0" />
                ) : (
                  <div className="h-24 w-44 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 shrink-0">
                    ব্যানার আপলোড করুন
                  </div>
                )}
                <input
                  placeholder="ব্যানার ছবির URL অথবা পাশে আপলোড করুন"
                  value={siteForm.heroBannerUrl}
                  onChange={(e) => updateSiteForm((prev) => ({ ...prev, heroBannerUrl: e.target.value }))}
                  className="w-full sm:flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs"
                />
                <label className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {uploadingField === 'banner' ? 'আপলোড হচ্ছে...' : 'ব্যানার আপলোড'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadAsset(e.target.files[0], 'banner')} />
                </label>
                {siteForm.heroBannerUrl && (
                  <button
                    type="button"
                    onClick={() => handleClearSiteAsset('heroBannerUrl')}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> মুছুন
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              siteDirtyRef.current = false;
              setSyncState('syncing');
              await saveWebsiteSettings(siteForm, actorUid, actorName);
              setSyncState('synced');
              notify('লোগো ও ব্যানার আপডেট Firebase-এ সেভ হয়েছে!');
            }}
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
          >
            লোগো ও ব্যানার সেভ করুন
          </button>
        </div>
      )}

      {mediaTab === 'notices' && (
        <div className="space-y-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const existing = editingNoticeId ? notices.find((n) => n.id === editingNoticeId) : null;
              const item: Notice = {
                ...(existing || {}),
                id: editingNoticeId || generateDocId('notice'),
                titleBn: newNotice.titleBn,
                category: newNotice.category,
                bodyBn: newNotice.bodyBn,
                publishDate: newNotice.publishDate,
                isPinned: newNotice.isPinned,
                isPublished: existing ? existing.isPublished : true,
                createdBy: existing?.createdBy || actorUid,
              };
              await saveNotice(item, !editingNoticeId);
              setEditingNoticeId(null);
              setNewNotice({
                titleBn: '',
                category: 'সাধারণ সভা',
                bodyBn: '',
                publishDate: new Date().toISOString().slice(0, 10),
                isPinned: false,
              });
              notify(editingNoticeId ? 'নোটিশ Firebase-এ আপডেট হয়েছে!' : 'নতুন নোটিশ প্রকাশ করা হয়েছে!');
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{editingNoticeId ? 'নোটিশ সম্পাদনা করুন' : 'নতুন নোটিশ প্রকাশ করুন'}</h3>
              {editingNoticeId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoticeId(null);
                    setNewNotice({ titleBn: '', category: 'সাধারণ সভা', bodyBn: '', publishDate: new Date().toISOString().slice(0, 10), isPinned: false });
                  }}
                  className="text-xs text-slate-500 hover:underline cursor-pointer"
                >
                  সম্পাদনা বাতিল
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                required
                placeholder="নোটিশ শিরোনাম"
                value={newNotice.titleBn}
                onChange={(e) => setNewNotice({ ...newNotice, titleBn: e.target.value })}
                className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <input
                placeholder="বিভাগ (যেমন: জরুরি / সাধারণ সভা)"
                value={newNotice.category}
                onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={newNotice.publishDate}
                onChange={(e) => setNewNotice({ ...newNotice, publishDate: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <textarea
              required
              rows={3}
              placeholder="বিস্তারিত নোটিশ..."
              value={newNotice.bodyBn}
              onChange={(e) => setNewNotice({ ...newNotice, bodyBn: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer">
              {editingNoticeId ? 'পরিবর্তন আপডেট করুন' : 'নোটিশ প্রকাশ করুন'}
            </button>
          </form>

          <div className="space-y-2">
            {notices.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div>
                  <p className="font-semibold text-sm">{n.titleBn}</p>
                  <p className="text-xs text-slate-500">{n.category || 'বিজ্ঞপ্তি'} · {n.publishDate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditingNoticeId(n.id);
                      setNewNotice({
                        titleBn: n.titleBn,
                        category: n.category || 'সাধারণ সভা',
                        bodyBn: n.bodyBn,
                        publishDate: n.publishDate,
                        isPinned: Boolean(n.isPinned),
                      });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> সম্পাদনা
                  </button>
                  <button onClick={() => deleteNotice(n.id)} className="text-xs text-red-600 hover:underline cursor-pointer">
                    মুছুন
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mediaTab === 'news' && (
        <div className="space-y-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const existing = editingNewsId ? newsItems.find((n) => n.id === editingNewsId) : null;
              const item: NewsItem = {
                ...(existing || {}),
                id: editingNewsId || generateDocId('news'),
                ...newNews,
                isPublished: existing ? existing.isPublished : true,
                createdBy: existing?.createdBy || actorUid,
              };
              await saveNewsItem(item, !editingNewsId);
              setEditingNewsId(null);
              setNewNews({
                type: 'news',
                titleBn: '',
                summaryBn: '',
                bodyBn: '',
                imageUrl: '',
                publishDate: new Date().toISOString().slice(0, 10),
              });
              notify(editingNewsId ? 'সংবাদ/কার্যক্রম আপডেট হয়েছে!' : 'সংবাদ/কার্যক্রম যোগ করা হয়েছে!');
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{editingNewsId ? 'সংবাদ / কার্যক্রম সম্পাদনা করুন' : 'সংবাদ, কার্যক্রম বা অর্জন যোগ করুন'}</h3>
              {editingNewsId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNewsId(null);
                    setNewNews({ type: 'news', titleBn: '', summaryBn: '', bodyBn: '', imageUrl: '', publishDate: new Date().toISOString().slice(0, 10) });
                  }}
                  className="text-xs text-slate-500 hover:underline cursor-pointer"
                >
                  সম্পাদনা বাতিল
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={newNews.type}
                onChange={(e) => setNewNews({ ...newNews, type: e.target.value as 'news' | 'activity' | 'achievement' })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              >
                <option value="news">সংবাদ ও আপডেট</option>
                <option value="activity">সংগঠনের কার্যক্রম</option>
                <option value="achievement">আমাদের অর্জন</option>
              </select>
              <input
                required
                placeholder="শিরোনাম"
                value={newNews.titleBn}
                onChange={(e) => setNewNews({ ...newNews, titleBn: e.target.value })}
                className="sm:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <input
                placeholder="ছবির URL বা পাশে আপলোড করুন"
                value={newNews.imageUrl}
                onChange={(e) => setNewNews({ ...newNews, imageUrl: e.target.value })}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <label className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold cursor-pointer">
                {uploadingField === 'news' ? 'আপলোড হচ্ছে...' : 'ছবি আপলোড'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadAsset(e.target.files[0], 'news')} />
              </label>
            </div>
            <textarea
              required
              rows={3}
              placeholder="বিস্তারিত বিবরণ..."
              value={newNews.bodyBn}
              onChange={(e) => setNewNews({ ...newNews, bodyBn: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer">
              {editingNewsId ? 'পরিবর্তন আপডেট করুন' : 'প্রকাশ করুন'}
            </button>
          </form>

          <div className="space-y-2">
            {newsItems.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div>
                  <p className="font-semibold text-sm">{n.titleBn}</p>
                  <p className="text-xs text-slate-500">{n.type} · {n.publishDate}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditingNewsId(n.id);
                      setNewNews({
                        type: n.type,
                        titleBn: n.titleBn,
                        summaryBn: n.summaryBn || '',
                        bodyBn: n.bodyBn,
                        imageUrl: n.imageUrl || '',
                        publishDate: n.publishDate,
                      });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> সম্পাদনা
                  </button>
                  <button onClick={() => deleteNewsItem(n.id)} className="text-xs text-red-600 hover:underline cursor-pointer">
                    মুছুন
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mediaTab === 'gallery' && (
        <div className="space-y-5">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newGallery.url) return;
              const existing = editingGalleryId ? galleryItems.find((g) => g.id === editingGalleryId) : null;
              const item: GalleryItem = {
                id: editingGalleryId || generateDocId('gal'),
                ...newGallery,
                isPublished: existing ? existing.isPublished : true,
                createdBy: actorUid,
              };
              await saveGalleryItem(item);
              setEditingGalleryId(null);
              setNewGallery({ mediaType: 'image', titleBn: '', captionBn: '', url: '', album: 'সাধারণ' });
              notify(editingGalleryId ? 'গ্যালারি আপডেট হয়েছে!' : 'গ্যালারিতে যুক্ত হয়েছে!');
            }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{editingGalleryId ? 'গ্যালারি আইটেম সম্পাদনা করুন' : 'গ্যালারিতে ছবি বা ভিডিও যোগ করুন'}</h3>
              {editingGalleryId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGalleryId(null);
                    setNewGallery({ mediaType: 'image', titleBn: '', captionBn: '', url: '', album: 'সাধারণ' });
                  }}
                  className="text-xs text-slate-500 hover:underline cursor-pointer"
                >
                  সম্পাদনা বাতিল
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={newGallery.mediaType}
                onChange={(e) => setNewGallery({ ...newGallery, mediaType: e.target.value as 'image' | 'video' })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              >
                <option value="image">ছবি (Photo)</option>
                <option value="video">ভিডিও লিংক (Video)</option>
              </select>
              <input
                required
                placeholder="শিরোনাম"
                value={newGallery.titleBn}
                onChange={(e) => setNewGallery({ ...newGallery, titleBn: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <input
                placeholder="অ্যালবাম"
                value={newGallery.album}
                onChange={(e) => setNewGallery({ ...newGallery, album: e.target.value })}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <input
              placeholder="সংক্ষিপ্ত ক্যাপশন (ঐচ্ছিক)"
              value={newGallery.captionBn}
              onChange={(e) => setNewGallery({ ...newGallery, captionBn: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                required
                placeholder="ছবি বা ভিডিও URL"
                value={newGallery.url}
                onChange={(e) => setNewGallery({ ...newGallery, url: e.target.value })}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <label className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold cursor-pointer">
                {uploadingField === 'gallery' ? 'আপলোড হচ্ছে...' : 'ফাইল আপলোড'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadAsset(e.target.files[0], 'gallery')} />
              </label>
            </div>
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white cursor-pointer">
              {editingGalleryId ? 'আপডেট করুন' : 'গ্যালারিতে যোগ করুন'}
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {galleryItems.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <img src={g.url} alt={g.titleBn} className="h-36 w-full object-cover" />
                <div className="p-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold truncate">{g.titleBn}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingGalleryId(g.id);
                        setNewGallery({
                          mediaType: g.mediaType,
                          titleBn: g.titleBn,
                          captionBn: g.captionBn || '',
                          url: g.url,
                          album: g.album || 'সাধারণ',
                        });
                      }}
                      className="text-xs text-emerald-700 hover:underline cursor-pointer"
                    >
                      সম্পাদনা
                    </button>
                    <button onClick={() => deleteGalleryItem(g.id)} className="text-xs text-red-600 hover:underline cursor-pointer">
                      মুছুন
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
