import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Globe,
  HeartHandshake,
  Lock,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { PWAInstallButton } from '../components/PWABanner';
import { useApp } from '../context/AppContext';
import { submitContactMessage } from '../services/firestoreService';
import { formatDateBn, formatTakaFromPoisha, toBengaliDigits } from '../utils/bengali';
import { AuthPages } from './AuthPages';
import { DynamicSections } from './DynamicSections';

interface PublicWebsiteProps {
  activeSlug: string;
  onNavigate: (slug: string) => void;
  onOpenAdmin: () => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  activeSlug,
  onNavigate,
  onOpenAdmin,
}) => {
  const {
    websiteSettings,
    themeSettings,
    menus,
    pages,
    notices,
    newsItems,
    galleryItems,
    members,
    publicSummary,
    firebaseUser,
    isAnyAdmin,
    language,
    setLanguage,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedGalleryAlbum, setSelectedGalleryAlbum] = useState<string>('all');
  const [noticeSearch, setNoticeSearch] = useState('');
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactError, setContactError] = useState('');

  const topMenus = useMemo(
    () => menus.filter((m) => m.visible && !m.parentId).sort((a, b) => a.order - b.order).slice(0, 5),
    [menus]
  );

  const subMenusByParent = useMemo(() => {
    const map: Record<string, typeof menus> = {};
    menus
      .filter((m) => m.visible && m.parentId)
      .sort((a, b) => a.order - b.order)
      .forEach((m) => {
        if (!map[m.parentId!]) map[m.parentId!] = [];
        map[m.parentId!].push(m);
      });
    return map;
  }, [menus]);

  const navigateAndClose = (slug: string) => {
    onNavigate(slug);
    setMobileMenuOpen(false);
    setOpenDropdownId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Maintenance or Disabled Gate (Admin Login always accessible)
  if ((websiteSettings.maintenanceMode || !websiteSettings.publicWebsiteEnabled) && !isAnyAdmin && activeSlug !== 'login') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 text-center">
        {websiteSettings.logoUrl ? (
          <img
            src={websiteSettings.logoUrl}
            alt={websiteSettings.orgNameBn}
            referrerPolicy="no-referrer"
            className="h-20 w-20 rounded-full object-cover border border-emerald-200 mb-5"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-emerald-800 text-white flex items-center justify-center text-3xl font-bold border border-emerald-200 mb-5">
            ক
          </div>
        )}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{websiteSettings.orgNameBn}</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {websiteSettings.maintenanceMode
            ? 'ওয়েবসাইটের রক্ষণাবেক্ষণ কাজ চলছে। অনুগ্রহ করে কিছুক্ষণ পর আবার ভিজিট করুন।'
            : 'পাবলিক ওয়েবসাইট বর্তমানে অ্যাডমিন কর্তৃক সাময়িকভাবে বন্ধ রাখা হয়েছে।'}
        </p>
        <button
          onClick={() => navigateAndClose('login')}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
        >
          <Lock className="h-4 w-4" />
          অ্যাডমিন লগইন
        </button>
      </div>
    );
  }

  const containerMax = themeSettings.layoutWidth === 'wide' ? 'max-w-7xl' : 'max-w-6xl';

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError('');
    setContactSent(false);
    if (contactForm.name.trim().length < 2 || contactForm.message.trim().length < 5) {
      setContactError('অনুগ্রহ করে সঠিক নাম এবং কমপক্ষে ৫ অক্ষরের বার্তা লিখুন।');
      return;
    }
    setContactSending(true);
    try {
      await submitContactMessage({
        name: contactForm.name.trim(),
        phone: contactForm.phone.trim(),
        email: contactForm.email.trim(),
        subject: contactForm.subject.trim(),
        message: contactForm.message.trim(),
      });
      setContactSent(true);
      setContactForm({ name: '', phone: '', email: '', subject: '', message: '' });
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'বার্তা পাঠানো যায়নি।');
    } finally {
      setContactSending(false);
    }
  };

  const renderPageContent = () => {
    switch (activeSlug) {
      case 'login':
        return <AuthPages initialMode="login" onNavigate={navigateAndClose} onOpenAdmin={onOpenAdmin} />;

      case 'signup':
        return <AuthPages initialMode="signup" onNavigate={navigateAndClose} onOpenAdmin={onOpenAdmin} />;

      case 'about':
        return (
          <div className="space-y-12 py-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">পরিচিতি ও ইতিহাস</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                {websiteSettings.aboutTitleBn}
              </h1>
              <p className="mt-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                {language === 'en' ? websiteSettings.aboutTextEn : websiteSettings.aboutTextBn}
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-950 text-white">
                {websiteSettings.heroBannerUrl ? (
                  <img
                    src={websiteSettings.heroBannerUrl}
                    alt={websiteSettings.orgNameBn}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover min-h-[280px]"
                  />
                ) : (
                  <div className="h-full min-h-[280px] p-8 flex flex-col justify-between bg-gradient-to-br from-emerald-900 to-slate-900">
                    <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl font-bold">
                      ক
                    </div>
                    <div>
                      <p className="text-xs text-emerald-300 font-semibold">{websiteSettings.taglineBn}</p>
                      <h2 className="mt-2 text-2xl font-bold">{websiteSettings.orgNameBn}</h2>
                      <p className="mt-1 text-xs text-slate-300">{websiteSettings.officeAddressBn}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-7 flex flex-col justify-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">সংগঠনের পটভূমি</h2>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {websiteSettings.historyTextBn}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-5">
                  <div>
                    <p className="text-xs text-slate-500">নিবন্ধিত সদস্য</p>
                    <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                      {toBengaliDigits(members.length)} জন
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">প্রকাশিত কার্যক্রম</p>
                    <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                      {toBengaliDigits(newsItems.length)} টি
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DynamicSections pageSlug="about" onNavigate={navigateAndClose} />
          </div>
        );

      case 'mission':
        return (
          <div className="space-y-10 py-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">লক্ষ্য ও উদ্দেশ্য</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                আমাদের লক্ষ্য, রূপকল্প ও অঙ্গীকার
              </h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
                  {websiteSettings.missionTitleBn || 'আমাদের লক্ষ্য (Mission)'}
                </h2>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {websiteSettings.missionBn}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7">
                <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">
                  {websiteSettings.visionTitleBn || 'আমাদের রূপকল্প (Vision)'}
                </h2>
                <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {websiteSettings.visionBn}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-7">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                {websiteSettings.goalsTitleBn || 'সংগঠনের প্রধান উদ্দেশ্যসমূহ'}
              </h2>
              <ul className="space-y-3">
                {websiteSettings.goalsListBn.map((goal, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                    <span>{goal}</span>
                  </li>
                ))}
              </ul>
            </div>
            <DynamicSections pageSlug="mission" onNavigate={navigateAndClose} />
          </div>
        );

      case 'activities': {
        const actList = newsItems.filter((n) => n.type === 'activity' || n.type === 'news');
        return (
          <div className="space-y-8 py-6">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">সামাজিক উদ্যোগ</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {websiteSettings.activitiesTitleBn || 'সংগঠনের কার্যক্রম'}
              </h1>
            </div>
            {actList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                এখনো কোনো কার্যক্রম প্রকাশ করা হয়নি। অ্যাডমিন প্যানেল থেকে নতুন কার্যক্রম যুক্ত করা যাবে।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {actList.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.titleBn}
                        referrerPolicy="no-referrer"
                        className="h-48 w-full object-cover"
                      />
                    )}
                    <div className="p-5 flex-1 flex flex-col">
                      <p className="text-xs text-slate-500">
                        {item.type === 'activity' ? 'কার্যক্রম' : 'সংবাদ'} · {formatDateBn(item.publishDate)}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{item.titleBn}</h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">
                        {item.bodyBn}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <DynamicSections pageSlug="activities" onNavigate={navigateAndClose} />
          </div>
        );
      }

      case 'members':
      case 'committee': {
        const filtered =
          activeSlug === 'committee'
            ? members.filter((m) => m.committeeType === 'executive' || m.committeeType === 'advisory')
            : members;
        return (
          <div className="space-y-8 py-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">সাংগঠনিক কাঠামো</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {activeSlug === 'committee'
                    ? websiteSettings.committeeTitleBn || 'কার্যনির্বাহী কমিটি'
                    : websiteSettings.membersTitleBn || 'আমাদের সম্মানিত সদস্যবৃন্দ'}
                </h1>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigateAndClose('committee')}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                    activeSlug === 'committee'
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  কার্যনির্বাহী কমিটি
                </button>
                <button
                  onClick={() => navigateAndClose('members')}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                    activeSlug === 'members'
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  সকল সদস্য
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                এখনো কোনো সদস্য বা কমিটির তথ্য যোগ করা হয়নি। অ্যাডমিন প্যানেল থেকে সদস্য যুক্ত করুন।
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((m) => (
                  <div
                    key={m.memberId}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex items-start gap-4"
                  >
                    {m.photoUrl || websiteSettings.logoUrl ? (
                      <img
                        src={m.photoUrl || websiteSettings.logoUrl}
                        alt={m.nameBn}
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 rounded-full object-cover border border-emerald-200 shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xl font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                        {m.nameBn.slice(0, 1) || 'স'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400">{m.displayCode}</p>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{m.nameBn}</h3>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {m.designationBn || (m.committeeType === 'executive' ? 'নির্বাহী সদস্য' : 'সদস্য')}
                      </p>
                      {m.bioBn && <p className="mt-2 text-xs text-slate-500 leading-relaxed">{m.bioBn}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'notices': {
        const filteredNotices = notices.filter(
          (n) =>
            !noticeSearch.trim() ||
            n.titleBn.toLowerCase().includes(noticeSearch.toLowerCase()) ||
            n.bodyBn.toLowerCase().includes(noticeSearch.toLowerCase())
        );
        return (
          <div className="space-y-6 py-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">অফিসিয়াল বিজ্ঞপ্তি</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {websiteSettings.noticesTitleBn || 'সংগঠনের নোটিশ বোর্ড'}
                </h1>
              </div>
              <input
                type="search"
                value={noticeSearch}
                onChange={(e) => setNoticeSearch(e.target.value)}
                placeholder="নোটিশ খুঁজুন..."
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-4">
              {filteredNotices.map((n) => (
                <article
                  key={n.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {n.category || 'বিজ্ঞপ্তি'} · {formatDateBn(n.publishDate)}
                      {n.isPinned ? ' · গুরুত্বপূর্ণ' : ''}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{n.titleBn}</h2>
                  <p className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {n.bodyBn}
                  </p>
                </article>
              ))}
              {filteredNotices.length === 0 && (
                <p className="text-sm text-slate-500 py-8 text-center">কোনো নোটিশ পাওয়া যায়নি।</p>
              )}
            </div>
          </div>
        );
      }

      case 'news':
      case 'achievements': {
        const list =
          activeSlug === 'achievements'
            ? newsItems.filter((i) => i.type === 'achievement')
            : newsItems;
        return (
          <div className="space-y-8 py-6">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {activeSlug === 'achievements' ? 'সাফল্য ও স্বীকৃতি' : 'সংবাদ ও আপডেট'}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {activeSlug === 'achievements'
                  ? websiteSettings.achievementsTitleBn || 'আমাদের অর্জন'
                  : websiteSettings.newsTitleBn || 'সংবাদ ও সাম্প্রতিক আপডেট'}
              </h1>
            </div>
            {list.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                এখনো কোনো সংবাদ বা অর্জন প্রকাশ করা হয়নি।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {list.map((item) => (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.titleBn}
                        referrerPolicy="no-referrer"
                        className="h-56 w-full object-cover"
                      />
                    )}
                    <div className="p-6 flex-1">
                      <p className="text-xs text-slate-500">
                        {item.type === 'achievement' ? 'অর্জন' : item.type === 'activity' ? 'কার্যক্রম' : 'সংবাদ'} ·{' '}
                        {formatDateBn(item.publishDate)}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{item.titleBn}</h2>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.bodyBn}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'gallery': {
        const albums = Array.from(new Set(galleryItems.map((g) => g.album || 'সাধারণ')));
        const items =
          selectedGalleryAlbum === 'all'
            ? galleryItems
            : galleryItems.filter((g) => (g.album || 'সাধারণ') === selectedGalleryAlbum);
        return (
          <div className="space-y-6 py-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">মিডিয়া আর্কাইভ</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                  {websiteSettings.galleryTitleBn || 'ছবি ও ভিডিও গ্যালারি'}
                </h1>
              </div>
              <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  onClick={() => setSelectedGalleryAlbum('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                    selectedGalleryAlbum === 'all' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  সকল
                </button>
                {albums.map((alb) => (
                  <button
                    key={alb}
                    onClick={() => setSelectedGalleryAlbum(alb)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md cursor-pointer ${
                      selectedGalleryAlbum === alb ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {alb}
                  </button>
                ))}
              </div>
            </div>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                গ্যালারিতে এখনো কোনো ছবি বা ভিডিও যোগ করা হয়নি। অ্যাডমিন প্যানেল থেকে আপলোড করুন।
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    {item.mediaType === 'video' ? (
                      <div className="aspect-video bg-slate-950 flex items-center justify-center">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-emerald-400 hover:underline"
                        >
                          ভিডিও দেখুন
                        </a>
                      </div>
                    ) : (
                      <img
                        src={item.url}
                        alt={item.titleBn}
                        referrerPolicy="no-referrer"
                        className="h-56 w-full object-cover"
                      />
                    )}
                    <div className="p-4">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">{item.album || 'সাধারণ'}</p>
                      <h3 className="font-bold text-slate-900 dark:text-white mt-0.5">{item.titleBn}</h3>
                      {item.captionBn && <p className="text-xs text-slate-500 mt-1">{item.captionBn}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'transparency':
        return (
          <div className="space-y-8 py-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">জবাবদিহিতা ও স্বচ্ছতা</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {websiteSettings.transparencyTitleBn || 'আর্থিক স্বচ্ছতা ও পাবলিক প্রতিবেদন'}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {websiteSettings.transparencySubtitleBn ||
                  'ব্যক্তিগত গোপনীয়তা (ফোন নম্বর ও ব্যক্তিগত তথ্য) সুরক্ষিত রেখে সংগঠনের সামগ্রিক আয়, ব্যয় ও বর্তমান তহবিলের রিয়েল-টাইম সারসংক্ষেপ এখানে প্রদর্শিত হচ্ছে।'}
              </p>
            </div>

            {!websiteSettings.publicFinancialSummaryEnabled ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                পাবলিক আর্থিক সারসংক্ষেপ বর্তমানে অ্যাডমিন সেটিংস থেকে সাময়িকভাবে ব্যক্তিগত (Private) করা হয়েছে।
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <p className="text-xs text-slate-500">মোট বর্তমান তহবিল</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                      {formatTakaFromPoisha(publicSummary.totalBalancePoisha, language)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <p className="text-xs text-slate-500">মোট সংগৃহীত আয়</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatTakaFromPoisha(publicSummary.totalIncomePoisha, language)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <p className="text-xs text-slate-500">মোট অনুমোদিত ব্যয়</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatTakaFromPoisha(publicSummary.totalExpensePoisha, language)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                    <p className="text-xs text-slate-500">সক্রিয় সদস্য / দাতা</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {toBengaliDigits(publicSummary.totalMembers || members.length)} / {toBengaliDigits(publicSummary.totalDonors || 0)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                    <p className="text-xs text-slate-500">নগদ ক্যাশ ব্যালেন্স</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatTakaFromPoisha(publicSummary.cashBalancePoisha || 0, language)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                    <p className="text-xs text-slate-500">ব্যাংক ব্যালেন্স</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatTakaFromPoisha(publicSummary.bankBalancePoisha || 0, language)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                    <p className="text-xs text-slate-500">মোবাইল ব্যাংকিং (বিকাশ/নগদ)</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatTakaFromPoisha(publicSummary.mobileBalancePoisha || 0, language)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-8 py-6">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">যোগাযোগ</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                {websiteSettings.contactTitleBn || 'আমাদের সাথে যোগাযোগ করুন'}
              </h1>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">কার্যালয়ের ঠিকানা</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{websiteSettings.officeAddressBn}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">ফোন নম্বর</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{websiteSettings.contactPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500">ইমেইল</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{websiteSettings.contactEmail}</p>
                    </div>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleContactSubmit}
                className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4"
              >
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {websiteSettings.contactFormTitleBn || 'সরাসরি বার্তা পাঠান'}
                </h2>
                {contactSent && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    আপনার বার্তা সফলভাবে সংরক্ষিত হয়েছে! সংগঠনের পক্ষ থেকে শীঘ্রই যোগাযোগ করা হবে।
                  </div>
                )}
                {contactError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">{contactError}</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="আপনার নাম *"
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="মোবাইল নম্বর"
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="ইমেইল ঠিকানা"
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="বিষয়"
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                  />
                </div>
                <textarea
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="আপনার বার্তা বা পরামর্শ লিখুন... *"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={contactSending}
                  className="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 cursor-pointer"
                >
                  {contactSending ? 'পাঠানো হচ্ছে...' : 'বার্তা পাঠান'}
                </button>
              </form>
            </div>
          </div>
        );

      case 'home':
        return (
          <div className="space-y-16 py-6">
            {/* Editorial Institutional Hero */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7 flex flex-col justify-center py-4">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  {language === 'en' ? websiteSettings.taglineEn : websiteSettings.taglineBn}
                </p>
                <h1
                  className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight"
                  style={{ textWrap: 'balance' }}
                >
                  {language === 'en' ? websiteSettings.heroTitleEn : websiteSettings.heroTitleBn}
                </h1>
                <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {language === 'en' ? websiteSettings.heroSubtitleEn : websiteSettings.heroSubtitleBn}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => navigateAndClose(websiteSettings.heroPrimaryBtnLink || 'transparency')}
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition cursor-pointer"
                    style={{ backgroundColor: themeSettings.buttonColor || '#065F46' }}
                  >
                    {websiteSettings.heroPrimaryBtnTextBn || 'আর্থিক স্বচ্ছতা দেখুন'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigateAndClose(websiteSettings.heroSecondaryBtnLink || 'signup')}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-5 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    {websiteSettings.heroSecondaryBtnTextBn || 'সদস্য হিসেবে যুক্ত হোন'}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-950 text-white">
                {websiteSettings.heroBannerUrl ? (
                  <img
                    src={websiteSettings.heroBannerUrl}
                    alt={websiteSettings.orgNameBn}
                    referrerPolicy="no-referrer"
                    className="w-full h-72 lg:h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-72 lg:h-full p-8 flex flex-col justify-between bg-gradient-to-br from-emerald-900 via-emerald-950 to-slate-900">
                    <div className="flex items-center gap-3">
                      {websiteSettings.logoUrl ? (
                        <img
                          src={websiteSettings.logoUrl}
                          alt={websiteSettings.orgNameBn}
                          referrerPolicy="no-referrer"
                          className="h-12 w-12 rounded-full object-cover border border-white/25"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-white/15 border border-white/25 flex items-center justify-center text-xl font-bold">
                          ক
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-emerald-300 font-semibold">{websiteSettings.taglineBn}</p>
                        <p className="text-sm font-bold">{websiteSettings.orgNameBn}</p>
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-white/15 pt-4">
                      <p className="text-xs text-emerald-200/90 leading-relaxed">{websiteSettings.missionBn}</p>
                      {isAnyAdmin && (
                        <p className="text-[11px] text-emerald-300/80">
                          টিপস: অ্যাডমিন প্যানেল → লোগো ও মিডিয়া থেকে ব্যানার ছবি আপলোড করলে এখানে প্রদর্শিত হবে।
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Full-Width 4-Column KPI Transparency Strip */}
            {websiteSettings.publicFinancialSummaryEnabled && (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>মোট বর্তমান তহবিল</span>
                    <Wallet className="h-4 w-4 text-emerald-700" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                    {formatTakaFromPoisha(publicSummary.totalBalancePoisha, language)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>মোট সংগৃহীত আয়</span>
                    <HeartHandshake className="h-4 w-4 text-emerald-700" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatTakaFromPoisha(publicSummary.totalIncomePoisha, language)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>জনকল্যাণমূলক ব্যয়</span>
                    <BookOpen className="h-4 w-4 text-emerald-700" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatTakaFromPoisha(publicSummary.totalExpensePoisha, language)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>নিবন্ধিত সদস্যবৃন্দ</span>
                    <Users className="h-4 w-4 text-emerald-700" />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {toBengaliDigits(publicSummary.totalMembers || members.length)} জন
                  </p>
                </div>
              </section>
            )}

            {/* Dynamic Visual Builder Sections */}
            <DynamicSections pageSlug="home" onNavigate={navigateAndClose} />

            {/* Latest Notices + News Split */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-emerald-700" />
                    {websiteSettings.homeNoticesTitleBn || 'সাম্প্রতিক নোটিশ'}
                  </h2>
                  <button
                    onClick={() => navigateAndClose('notices')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    সব দেখুন
                  </button>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {notices.slice(0, 4).map((n) => (
                    <div key={n.id} className="py-3.5">
                      <p className="text-xs text-slate-500">
                        {n.category || 'বিজ্ঞপ্তি'} · {formatDateBn(n.publishDate)}
                      </p>
                      <button
                        onClick={() => navigateAndClose('notices')}
                        className="mt-1 text-left text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-700 cursor-pointer"
                      >
                        {n.titleBn}
                      </button>
                    </div>
                  ))}
                  {notices.length === 0 && (
                    <p className="py-6 text-xs text-slate-500">এখনো কোনো নোটিশ প্রকাশ করা হয়নি।</p>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="h-5 w-5 text-emerald-700" />
                    {websiteSettings.homeNewsTitleBn || 'সংবাদ, কার্যক্রম ও অর্জন'}
                  </h2>
                  <button
                    onClick={() => navigateAndClose('news')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    সব সংবাদ দেখুন
                  </button>
                </div>
                {newsItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-xs text-slate-500">
                    এখনো কোনো সংবাদ বা কার্যক্রম প্রকাশ করা হয়নি। অ্যাডমিন প্যানেল থেকে নতুন সংবাদ যুক্ত করুন।
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {newsItems.slice(0, 2).map((item) => (
                      <article
                        key={item.id}
                        onClick={() => navigateAndClose('news')}
                        className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:border-emerald-600/50 transition"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.titleBn}
                            referrerPolicy="no-referrer"
                            className="h-40 w-full object-cover"
                          />
                        )}
                        <div className="p-4">
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDateBn(item.publishDate)}
                          </p>
                          <h3 className="mt-1.5 font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                            {item.titleBn}
                          </h3>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {item.summaryBn || item.bodyBn}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        );

      default: {
        // Dynamic Custom CMS Page created via Page Management / Visual Builder
        const customPage = pages.find((p) => p.slug === activeSlug);
        return (
          <div className="space-y-8 py-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {customPage ? (language === 'en' ? customPage.titleEn || customPage.titleBn : customPage.titleBn) : 'পাতাটি পাওয়া যায়নি'}
              </h1>
              {customPage?.descriptionBn && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{customPage.descriptionBn}</p>
              )}
            </div>
            <DynamicSections pageSlug={activeSlug} onNavigate={navigateAndClose} />
          </div>
        );
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className={`mx-auto ${containerMax} flex items-center justify-between gap-8 px-4 sm:px-6 h-16`}>
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            onClick={() => navigateAndClose('home')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer"
          >
            {websiteSettings.logoUrl ? (
              <img
                src={websiteSettings.logoUrl}
                alt={websiteSettings.orgNameBn}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full object-cover border border-emerald-200"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-emerald-800 text-white flex items-center justify-center text-sm font-bold border border-emerald-200 shrink-0">
                ক
              </div>
            )}
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
              {language === 'en' ? websiteSettings.websiteNameEn : websiteSettings.websiteNameBn}
            </span>
          </button>

          {/* Zone 2: 4-5 Concise Single-Line Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            {topMenus.map((m) => {
              const children = subMenusByParent[m.id] || [];
              if (children.length > 0) {
                return (
                  <div key={m.id} className="relative">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === m.id ? null : m.id)}
                      className={`inline-flex items-center gap-1 hover:text-emerald-700 dark:hover:text-emerald-400 transition whitespace-nowrap shrink-0 cursor-pointer ${
                        activeSlug === m.targetSlug ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''
                      }`}
                    >
                      {language === 'en' ? m.labelEn || m.labelBn : m.labelBn}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    {openDropdownId === m.id && (
                      <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 shadow-lg z-50">
                        <button
                          onClick={() => navigateAndClose(m.targetSlug)}
                          className="block w-full px-4 py-2 text-left text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          {language === 'en' ? m.labelEn || m.labelBn : m.labelBn}
                        </button>
                        {children.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => navigateAndClose(c.targetSlug)}
                            className="block w-full px-4 py-2 text-left text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            {language === 'en' ? c.labelEn || c.labelBn : c.labelBn}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button
                  key={m.id}
                  onClick={() => navigateAndClose(m.targetSlug)}
                  className={`hover:text-emerald-700 dark:hover:text-emerald-400 transition whitespace-nowrap shrink-0 cursor-pointer ${
                    activeSlug === m.targetSlug ? 'text-emerald-700 dark:text-emerald-400 font-semibold underline underline-offset-8' : ''
                  }`}
                >
                  {language === 'en' ? m.labelEn || m.labelBn : m.labelBn}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {isAnyAdmin ? (
              <button
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition whitespace-nowrap shrink-0 cursor-pointer"
                style={{ backgroundColor: themeSettings.buttonColor || '#065F46' }}
              >
                <ShieldCheck className="h-4 w-4" />
                অ্যাডমিন প্যানেল
              </button>
            ) : (
              <button
                onClick={() => navigateAndClose(firebaseUser ? 'login' : 'login')}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition whitespace-nowrap shrink-0 cursor-pointer"
                style={{ backgroundColor: themeSettings.buttonColor || '#065F46' }}
              >
                {firebaseUser ? 'প্রোফাইল' : 'লগইন'}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="মেনু"
              className="lg:hidden rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-1 max-h-[75vh] overflow-y-auto">
            {pages
              .filter((p) => p.isPublished)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => navigateAndClose(p.slug)}
                  className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium cursor-pointer ${
                    activeSlug === p.slug
                      ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  {language === 'en' ? p.titleEn || p.titleBn : p.titleBn}
                </button>
              ))}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => navigateAndClose('signup')}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 py-2 text-xs font-semibold cursor-pointer"
              >
                সদস্য নিবন্ধন
              </button>
              <button
                onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                {language === 'bn' ? 'EN' : 'বাংলা'}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={`flex-1 mx-auto w-full ${containerMax} px-4 sm:px-6`}>
        {renderPageContent()}
      </main>

      {/* PWA Install Banner */}
      <PWAInstallButton variant="banner" />

      {/* Editorial Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 mt-16">
        <div className={`mx-auto ${containerMax} px-4 sm:px-6 py-12`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                {websiteSettings.logoUrl ? (
                  <img
                    src={websiteSettings.logoUrl}
                    alt={websiteSettings.orgNameBn}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full object-cover border border-emerald-200"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-emerald-800 text-white flex items-center justify-center text-base font-bold border border-emerald-200 shrink-0">
                    ক
                  </div>
                )}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{websiteSettings.orgNameBn}</h3>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
                {websiteSettings.footerInfoBn}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {language === 'bn' ? 'English' : 'বাংলা'}
                </button>
                <button
                  onClick={() => document.documentElement.classList.toggle('dark')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Sun className="h-3.5 w-3.5 dark:hidden" />
                  <Moon className="h-3.5 w-3.5 hidden dark:inline" />
                  থিম পরিবর্তন
                </button>
                <PWAInstallButton variant="compact" />
                {websiteSettings.facebookUrl && /^https?:\/\//i.test(websiteSettings.facebookUrl) && (
                  <a
                    href={websiteSettings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-white dark:hover:bg-slate-800"
                  >
                    Facebook
                  </a>
                )}
                {websiteSettings.youtubeUrl && /^https?:\/\//i.test(websiteSettings.youtubeUrl) && (
                  <a
                    href={websiteSettings.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-white dark:hover:bg-slate-800"
                  >
                    YouTube
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                {websiteSettings.footerCol1TitleBn || 'গুরুত্বপূর্ণ পাতাসমূহ'}
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {pages
                  .filter((p) => p.isPublished)
                  .slice(0, 7)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => navigateAndClose(p.slug)}
                        className="hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                      >
                        {language === 'en' ? p.titleEn || p.titleBn : p.titleBn}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                {websiteSettings.footerCol2TitleBn || 'আরও লিংক ও যোগাযোগ'}
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {pages
                  .filter((p) => p.isPublished)
                  .slice(7)
                  .map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => navigateAndClose(p.slug)}
                        className="hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer"
                      >
                        {language === 'en' ? p.titleEn || p.titleBn : p.titleBn}
                      </button>
                    </li>
                  ))}
                <li className="pt-2 text-xs">{websiteSettings.officeAddressBn}</li>
                <li className="text-xs">{websiteSettings.contactPhone}</li>
                <li className="text-xs">{websiteSettings.contactEmail}</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>{websiteSettings.copyrightBn}</p>
            <div className="flex gap-4">
              <button onClick={() => navigateAndClose('login')} className="hover:text-emerald-700 cursor-pointer">
                লগইন
              </button>
              <button onClick={() => navigateAndClose('signup')} className="hover:text-emerald-700 cursor-pointer">
                নিবন্ধন
              </button>
              <button onClick={() => navigateAndClose('contact')} className="hover:text-emerald-700 cursor-pointer">
                যোগাযোগ
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
