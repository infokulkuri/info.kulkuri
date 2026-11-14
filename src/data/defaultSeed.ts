import {
  Account,
  CmsPage,
  Fund,
  GalleryItem,
  Member,
  NavMenuItem,
  NewsItem,
  Notice,
  PageSection,
  ThemeSettings,
  WebsiteSettings,
} from '../types/models';

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  id: 'main',
  websiteNameBn: 'কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ',
  websiteNameEn: 'Kulkuri Ideal Society Implementation Council',
  orgNameBn: 'কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ',
  orgNameEn: 'Kulkuri Adorsho Somaj Bastobayon Porishod',
  taglineBn: 'শিক্ষা, সম্প্রীতি, মানবসেবা ও স্বচ্ছ সমাজ বিনির্মাণে ঐক্যবদ্ধ প্রয়াস',
  taglineEn: 'United in Education, Harmony, Social Welfare & Transparent Governance',
  logoUrl: '',
  altLogoUrl: '',
  faviconUrl: '/icon.svg',
  heroBannerUrl: '',
  heroTitleBn: 'আদর্শ, স্বচ্ছ ও মানবিক সমাজ গড়ার সম্মিলিত অঙ্গীকার',
  heroTitleEn: 'Building an Ideal, Transparent & Compassionate Community Together',
  heroSubtitleBn:
    'কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ একটি অরাজনৈতিক ও সমাজকল্যাণমূলক সংগঠন। শিক্ষা, মানবিক সহায়তা ও স্বচ্ছ আর্থিক ব্যবস্থাপনার মাধ্যমে আমরা সমাজের কল্যাণে কাজ করছি।',
  heroSubtitleEn:
    'A non-political social welfare organization dedicated to education, relief, and transparent community accounting.',
  heroPrimaryBtnTextBn: 'আর্থিক স্বচ্ছতা দেখুন',
  heroPrimaryBtnLink: 'transparency',
  heroSecondaryBtnTextBn: 'সদস্য হিসেবে যুক্ত হোন',
  heroSecondaryBtnLink: 'signup',
  aboutTitleBn: 'আমাদের পরিচিতি ও পথচলা',
  aboutTextBn:
    'কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ এলাকার সচেতন নাগরিক ও মানবতাবাদী মানুষদের সম্মিলিত উদ্যোগে প্রতিষ্ঠিত একটি অলাভজনক সামাজিক সংগঠন।',
  aboutTextEn:
    'Kulkuri Ideal Society Implementation Council is a community-led non-profit organization committed to education, healthcare, relief, and social cohesion.',
  historyTextBn:
    'এলাকার তরুণ ও সচেতন নাগরিকদের পারস্পরিক সহযোগিতার মাধ্যমে একটি স্বচ্ছ ও জবাবদিহিমূলক কল্যাণ তহবিল গঠনের লক্ষ্যে এই পরিষদের যাত্রা শুরু।',
  missionBn:
    'শিক্ষা, স্বাস্থ্য, পরিবেশ সংরক্ষণ এবং সামাজিক ন্যায়বিচার প্রতিষ্ঠার মাধ্যমে একটি স্বনির্ভর, মানবিক ও আদর্শ সমাজ গড়ে তোলা।',
  visionBn:
    'এমন একটি আলোকিত সমাজ বিনির্মাণ যেখানে প্রতিটি মানুষ সম্মিলিত সহযোগিতা পাবে এবং প্রতিটি আর্থিক লেনদেন থাকবে শতভাগ স্বচ্ছ।',
  goalsListBn: [
    'অসচ্ছল ও মেধাবী শিক্ষার্থীদের জন্য নিয়মিত শিক্ষা সহায়তা প্রদান।',
    'অসহায় ও অসুস্থ মানুষদের জন্য জরুরি চিকিৎসা সহায়তা।',
    'দুর্যোগ ও প্রয়োজনের সময়ে খাদ্যসামগ্রী ও প্রয়োজনীয় ত্রাণ বিতরণ।',
    'শতভাগ ডিজিটাল রশিদ ও উন্মুক্ত আর্থিক প্রতিবেদনের মাধ্যমে স্বচ্ছতা নিশ্চিতকরণ।',
  ],
  contactPhone: 'অ্যাডমিন প্যানেল থেকে যুক্ত করুন',
  contactEmail: 'info.kulkuri@gmail.com',
  officeAddressBn: 'কুলকুড়ি কেন্দ্রীয় কার্যালয়',
  facebookUrl: '',
  youtubeUrl: '',
  copyrightBn: '© ২০২৬ কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ — সর্বস্বত্ব সংরক্ষিত',
  footerInfoBn: 'একটি অরাজনৈতিক, অলাভজনক ও মানবকল্যাণমূলক সামাজিক সংগঠন। প্রতিটি আর্থিক লেনদেন ডিজিটাল রশিদ ও অডিট লগের আওতাভুক্ত।',
  maintenanceMode: false,
  publicWebsiteEnabled: true,
  registrationEnabled: true,
  memberLoginEnabled: true,
  publicFinancialSummaryEnabled: true,
  defaultLanguage: 'bn',
  timezone: 'Asia/Dhaka',
  currency: 'BDT',
  metaTitle: 'কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ — অফিসিয়াল ওয়েবসাইট',
  metaDescription:
    'কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ-এর অফিসিয়াল ডিজিটাল প্ল্যাটফর্ম। সামাজিক কার্যক্রম, নোটিশ, সদস্য তথ্য এবং স্বচ্ছ আর্থিক হিসাব।',
  ogImageUrl: '',
  pwaAppName: 'কুলকুড়ি আদর্শ সমাজ বাস্তবায়ন পরিষদ',
  pwaShortName: 'কুলকুড়ি পরিষদ',
  pwaInstallBannerEnabled: true,
  apkDownloadEnabled: false,
  apkDownloadUrl: '',
  treasurerTitleBn: 'অর্থ সম্পাদক',
  presidentTitleBn: 'সভাপতি',
  homeNoticesTitleBn: 'সাম্প্রতিক নোটিশ',
  homeNewsTitleBn: 'সংবাদ, কার্যক্রম ও অর্জন',
  missionTitleBn: 'আমাদের লক্ষ্য, রূপকল্প ও অঙ্গীকার',
  visionTitleBn: 'আমাদের রূপকল্প (Vision)',
  goalsTitleBn: 'সংগঠনের প্রধান উদ্দেশ্যসমূহ',
  activitiesTitleBn: 'সংগঠনের কার্যক্রম',
  membersTitleBn: 'আমাদের সম্মানিত সদস্যবৃন্দ',
  committeeTitleBn: 'কার্যনির্বাহী কমিটি',
  noticesTitleBn: 'সংগঠনের নোটিশ বোর্ড',
  newsTitleBn: 'সংবাদ ও সাম্প্রতিক আপডেট',
  galleryTitleBn: 'ছবি ও ভিডিও গ্যালারি',
  achievementsTitleBn: 'আমাদের অর্জন',
  transparencyTitleBn: 'আর্থিক স্বচ্ছতা ও পাবলিক প্রতিবেদন',
  transparencySubtitleBn:
    'ব্যক্তিগত গোপনীয়তা সুরক্ষিত রেখে সংগঠনের সামগ্রিক আয়, ব্যয় ও বর্তমান তহবিলের রিয়েল-টাইম সারসংক্ষেপ এখানে প্রদর্শিত হচ্ছে।',
  contactTitleBn: 'আমাদের সাথে যোগাযোগ করুন',
  contactFormTitleBn: 'সরাসরি বার্তা পাঠান',
  footerCol1TitleBn: 'গুরুত্বপূর্ণ পাতাসমূহ',
  footerCol2TitleBn: 'আরও লিংক ও যোগাযোগ',
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  id: 'theme',
  primaryColor: '#065F46',
  secondaryColor: '#0F172A',
  backgroundColor: '#FFFFFF',
  surfaceColor: '#F8FAFC',
  textColor: '#0F172A',
  buttonColor: '#065F46',
  fontFamily: 'Hind Siliguri',
  baseFontSizePx: 16,
  headerStyle: 'classic',
  footerStyle: 'editorial',
  menuStyle: 'underline',
  sidebarStyle: 'emerald',
  cardStyle: 'bordered',
  buttonStyle: 'rounded',
  borderRadiusPx: 12,
  shadowLevel: 'sm',
  sectionSpacingPx: 64,
  layoutWidth: 'standard',
  darkMode: false,
};

export const DEFAULT_CMS_PAGES: Omit<CmsPage, 'updatedAt'>[] = [
  { id: 'page_home', slug: 'home', titleBn: 'হোম', titleEn: 'Home', descriptionBn: 'মূল পাতা', isPublished: true, isSystemPage: true, order: 1 },
  { id: 'page_about', slug: 'about', titleBn: 'আমাদের সম্পর্কে', titleEn: 'About Us', descriptionBn: 'সংগঠনের ইতিহাস ও পরিচিতি', isPublished: true, isSystemPage: true, order: 2 },
  { id: 'page_mission', slug: 'mission', titleBn: 'লক্ষ্য ও উদ্দেশ্য', titleEn: 'Mission & Vision', descriptionBn: 'আমাদের লক্ষ্য ও রূপকল্প', isPublished: true, isSystemPage: true, order: 3 },
  { id: 'page_activities', slug: 'activities', titleBn: 'কার্যক্রম', titleEn: 'Activities', descriptionBn: 'সামাজিক ও মানবিক কার্যক্রম', isPublished: true, isSystemPage: true, order: 4 },
  { id: 'page_members', slug: 'members', titleBn: 'সদস্যবৃন্দ', titleEn: 'Members', descriptionBn: 'সংগঠনের নিবন্ধিত সদস্য তালিকা', isPublished: true, isSystemPage: true, order: 5 },
  { id: 'page_committee', slug: 'committee', titleBn: 'কার্যনির্বাহী কমিটি', titleEn: 'Executive Committee', descriptionBn: 'বর্তমান কার্যনির্বাহী পরিষদ', isPublished: true, isSystemPage: true, order: 6 },
  { id: 'page_notices', slug: 'notices', titleBn: 'নোটিশ বোর্ড', titleEn: 'Notices', descriptionBn: 'অফিসিয়াল বিজ্ঞপ্তি', isPublished: true, isSystemPage: true, order: 7 },
  { id: 'page_news', slug: 'news', titleBn: 'সংবাদ ও আপডেট', titleEn: 'News & Updates', descriptionBn: 'সর্বশেষ সংবাদ ও প্রতিবেদন', isPublished: true, isSystemPage: true, order: 8 },
  { id: 'page_gallery', slug: 'gallery', titleBn: 'গ্যালারি', titleEn: 'Gallery', descriptionBn: 'ছবি ও ভিডিও আর্কাইভ', isPublished: true, isSystemPage: true, order: 9 },
  { id: 'page_achievements', slug: 'achievements', titleBn: 'আমাদের অর্জন', titleEn: 'Achievements', descriptionBn: 'উল্লেখযোগ্য সাফল্য ও মাইলফলক', isPublished: true, isSystemPage: true, order: 10 },
  { id: 'page_transparency', slug: 'transparency', titleBn: 'আর্থিক স্বচ্ছতা', titleEn: 'Financial Transparency', descriptionBn: 'পাবলিক আর্থিক রিপোর্ট', isPublished: true, isSystemPage: true, order: 11 },
  { id: 'page_contact', slug: 'contact', titleBn: 'যোগাযোগ', titleEn: 'Contact', descriptionBn: 'কার্যালয়ের ঠিকানা ও বার্তা পাঠান', isPublished: true, isSystemPage: true, order: 12 },
];

export const DEFAULT_NAV_MENUS: Omit<NavMenuItem, 'updatedAt'>[] = [
  { id: 'menu_home', labelBn: 'হোম', labelEn: 'Home', targetSlug: 'home', order: 1, visible: true },
  { id: 'menu_about', labelBn: 'পরিচিতি', labelEn: 'About', targetSlug: 'about', order: 2, visible: true },
  { id: 'menu_activities', labelBn: 'কার্যক্রম', labelEn: 'Activities', targetSlug: 'activities', order: 3, visible: true },
  { id: 'menu_notices', labelBn: 'নোটিশ', labelEn: 'Notices', targetSlug: 'notices', order: 4, visible: true },
  { id: 'menu_transparency', labelBn: 'আর্থিক স্বচ্ছতা', labelEn: 'Transparency', targetSlug: 'transparency', order: 5, visible: true },
];

// Fresh start: zero demo/stock photos, notices, news, gallery, or fake members
export const DEFAULT_PAGE_SECTIONS: Omit<PageSection, 'updatedAt'>[] = [];
export const DEFAULT_NOTICES: Omit<Notice, 'createdAt' | 'updatedAt'>[] = [];
export const DEFAULT_NEWS: Omit<NewsItem, 'createdAt' | 'updatedAt'>[] = [];
export const DEFAULT_GALLERY: Omit<GalleryItem, 'createdAt'>[] = [];
export const DEFAULT_MEMBERS: Omit<Member, 'createdAt' | 'updatedAt'>[] = [];

export const DEFAULT_ACCOUNTS: Omit<Account, 'updatedAt'>[] = [
  {
    id: 'acc_cash',
    nameBn: 'নগদ ক্যাশ তহবিল',
    type: 'cash',
    accountNumberMasked: 'কেন্দ্রীয় ক্যাশ বক্স',
    openingBalancePoisha: 0,
    currentBalancePoisha: 0,
    isActive: true,
  },
  {
    id: 'acc_bank',
    nameBn: 'সংগঠন ব্যাংক হিসাব',
    type: 'bank',
    accountNumberMasked: 'ব্যাংক এ/সি',
    openingBalancePoisha: 0,
    currentBalancePoisha: 0,
    isActive: true,
  },
  {
    id: 'acc_bkash',
    nameBn: 'বিকাশ (bKash)',
    type: 'bkash',
    accountNumberMasked: '',
    openingBalancePoisha: 0,
    currentBalancePoisha: 0,
    isActive: true,
  },
  {
    id: 'acc_nagad',
    nameBn: 'নগদ (Nagad)',
    type: 'nagad',
    accountNumberMasked: '',
    openingBalancePoisha: 0,
    currentBalancePoisha: 0,
    isActive: true,
  },
];

export const DEFAULT_FUNDS: Omit<Fund, 'updatedAt'>[] = [
  {
    id: 'fund_general',
    nameBn: 'সাধারণ কল্যাণ তহবিল',
    descriptionBn: 'মাসিক চাঁদা ও সাধারণ অনুদান থেকে প্রাপ্ত মূল তহবিল',
    balancePoisha: 0,
    isActive: true,
  },
  {
    id: 'fund_education',
    nameBn: 'শিক্ষা ও বৃত্তি তহবিল',
    descriptionBn: 'শিক্ষার্থী বৃত্তি, বই ও পাঠাগার পরিচালনার বিশেষ তহবিল',
    balancePoisha: 0,
    isActive: true,
  },
  {
    id: 'fund_emergency',
    nameBn: 'জরুরি ত্রাণ ও চিকিৎসা তহবিল',
    descriptionBn: 'দুর্যোগ সহায়তা এবং অসহায় রোগীদের চিকিৎসা সহায়তা',
    balancePoisha: 0,
    isActive: true,
  },
];
