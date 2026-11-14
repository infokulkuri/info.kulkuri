export type UserRole = 'super_admin' | 'sub_admin' | 'member' | 'pending';
export type AccountStatus = 'active' | 'suspended';

export type AdminPermissionKey =
  | 'cms'
  | 'design'
  | 'members'
  | 'finance'
  | 'approvals'
  | 'reports'
  | 'users'
  | 'settings';

export const ALL_ADMIN_PERMISSIONS: { key: AdminPermissionKey; labelBn: string; labelEn: string }[] = [
  { key: 'cms', labelBn: 'ওয়েবসাইট কনটেন্ট ও পেজ বিল্ডার', labelEn: 'Website Content & Page Builder' },
  { key: 'design', labelBn: 'ভিজ্যুয়াল ডিজাইন ও থিম', labelEn: 'Visual Design & Theme' },
  { key: 'members', labelBn: 'সদস্য ও কমিটি ব্যবস্থাপনা', labelEn: 'Members & Committee' },
  { key: 'finance', labelBn: 'আয়, ব্যয় ও হিসাব ব্যবস্থাপনা', labelEn: 'Income, Expense & Accounting' },
  { key: 'approvals', labelBn: 'ব্যয় অনুমোদন (Approval)', labelEn: 'Expense Approvals' },
  { key: 'reports', labelBn: 'আর্থিক রিপোর্ট ও অডিট লগ', labelEn: 'Financial Reports & Audit' },
  { key: 'users', labelBn: 'ইউজার অ্যাকাউন্ট ব্যবস্থাপনা', labelEn: 'User Accounts' },
  { key: 'settings', labelBn: 'সিস্টেম, SEO, PWA ও ব্যাকআপ', labelEn: 'Settings, SEO, PWA & Backup' },
];

export interface UserProfile {
  uid: string;
  displayName: string;
  role: UserRole;
  status: AccountStatus;
  fullAccess?: boolean;
  permissions?: AdminPermissionKey[];
  memberId?: string;
  emailVerified?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivate {
  uid: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdminRecord {
  uid: string;
  displayName?: string;
  role: 'super_admin' | 'sub_admin';
  status: AccountStatus;
  fullAccess: boolean;
  permissions: AdminPermissionKey[];
  grantedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WebsiteSettings {
  id: string;
  websiteNameBn: string;
  websiteNameEn: string;
  orgNameBn: string;
  orgNameEn: string;
  taglineBn: string;
  taglineEn: string;
  logoUrl: string;
  altLogoUrl: string;
  faviconUrl: string;
  heroBannerUrl: string;
  heroTitleBn: string;
  heroTitleEn: string;
  heroSubtitleBn: string;
  heroSubtitleEn: string;
  heroPrimaryBtnTextBn: string;
  heroPrimaryBtnLink: string;
  heroSecondaryBtnTextBn: string;
  heroSecondaryBtnLink: string;
  aboutTitleBn: string;
  aboutTextBn: string;
  aboutTextEn: string;
  historyTextBn: string;
  missionBn: string;
  visionBn: string;
  goalsListBn: string[];
  contactPhone: string;
  contactEmail: string;
  officeAddressBn: string;
  facebookUrl: string;
  youtubeUrl: string;
  copyrightBn: string;
  footerInfoBn: string;
  // Operational flags
  maintenanceMode: boolean;
  publicWebsiteEnabled: boolean;
  registrationEnabled: boolean;
  memberLoginEnabled: boolean;
  publicFinancialSummaryEnabled: boolean;
  defaultLanguage: 'bn' | 'en';
  timezone: string;
  currency: string;
  // SEO
  metaTitle: string;
  metaDescription: string;
  ogImageUrl: string;
  // PWA
  pwaAppName: string;
  pwaShortName: string;
  pwaInstallBannerEnabled: boolean;
  apkDownloadEnabled: boolean;
  apkDownloadUrl: string;
  // Signatories
  treasurerTitleBn: string;
  presidentTitleBn: string;
  // Dynamic Page & Section Titles (100% Admin Controlled)
  homeNoticesTitleBn?: string;
  homeNewsTitleBn?: string;
  missionTitleBn?: string;
  visionTitleBn?: string;
  goalsTitleBn?: string;
  activitiesTitleBn?: string;
  membersTitleBn?: string;
  committeeTitleBn?: string;
  noticesTitleBn?: string;
  newsTitleBn?: string;
  galleryTitleBn?: string;
  achievementsTitleBn?: string;
  transparencyTitleBn?: string;
  transparencySubtitleBn?: string;
  contactTitleBn?: string;
  contactFormTitleBn?: string;
  footerCol1TitleBn?: string;
  footerCol2TitleBn?: string;
  updatedAt?: unknown;
}

export interface ThemeSettings {
  id: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  buttonColor: string;
  fontFamily: 'Hind Siliguri' | 'Noto Sans Bengali' | 'Plus Jakarta Sans';
  baseFontSizePx: number;
  headerStyle: 'classic' | 'minimal' | 'elevated';
  footerStyle: 'editorial' | 'compact';
  menuStyle: 'underline' | 'subtle';
  sidebarStyle: 'emerald' | 'slate' | 'light';
  cardStyle: 'bordered' | 'elevated' | 'flat';
  buttonStyle: 'rounded' | 'square' | 'soft';
  borderRadiusPx: number;
  shadowLevel: 'none' | 'sm' | 'md';
  sectionSpacingPx: number;
  layoutWidth: 'standard' | 'wide';
  darkMode: boolean;
  updatedAt?: unknown;
}

export interface CmsPage {
  id: string;
  slug: string;
  titleBn: string;
  titleEn?: string;
  descriptionBn?: string;
  descriptionEn?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  isPublished: boolean;
  isSystemPage?: boolean;
  order: number;
  updatedAt?: unknown;
}

export type SectionType =
  | 'hero'
  | 'richtext'
  | 'image'
  | 'banner'
  | 'cta'
  | 'notice_board'
  | 'gallery'
  | 'stats'
  | 'cards';

export interface PageSection {
  id: string;
  pageSlug: string;
  type: SectionType;
  titleBn?: string;
  titleEn?: string;
  subtitleBn?: string;
  bodyHtml?: string;
  imageUrl?: string;
  buttonTextBn?: string;
  buttonLink?: string;
  items?: { title: string; value?: string; description?: string; imageUrl?: string }[];
  order: number;
  visible: boolean;
  status: 'published' | 'draft';
  updatedAt?: unknown;
}

export interface NavMenuItem {
  id: string;
  labelBn: string;
  labelEn?: string;
  targetSlug: string;
  parentId?: string;
  order: number;
  visible: boolean;
  updatedAt?: unknown;
}

export interface Notice {
  id: string;
  titleBn: string;
  titleEn?: string;
  bodyBn: string;
  bodyEn?: string;
  category?: string;
  isPinned?: boolean;
  isPublished: boolean;
  publishDate: string;
  attachmentUrl?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface NewsItem {
  id: string;
  type: 'news' | 'activity' | 'achievement';
  titleBn: string;
  titleEn?: string;
  summaryBn?: string;
  bodyBn: string;
  imageUrl?: string;
  publishDate: string;
  isPublished: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GalleryItem {
  id: string;
  mediaType: 'image' | 'video';
  titleBn: string;
  captionBn?: string;
  url: string;
  thumbnailUrl?: string;
  album?: string;
  isPublished: boolean;
  createdBy: string;
  createdAt?: unknown;
}

export interface Member {
  memberId: string;
  displayCode: string;
  nameBn: string;
  nameEn?: string;
  designationBn?: string;
  committeeType: 'executive' | 'general' | 'advisory';
  committeeOrder?: number;
  photoUrl?: string;
  bioBn?: string;
  joinedDate?: string;
  monthlyFeePoisha: number;
  status: 'active' | 'inactive';
  linkedUid?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MemberPrivate {
  memberId: string;
  phone?: string;
  email?: string;
  address?: string;
  nidMasked?: string;
  updatedAt?: unknown;
}

export interface Account {
  id: string;
  nameBn: string;
  type: 'cash' | 'bank' | 'bkash' | 'nagad' | 'other';
  accountNumberMasked?: string;
  openingBalancePoisha: number;
  currentBalancePoisha: number;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface Fund {
  id: string;
  nameBn: string;
  descriptionBn?: string;
  balancePoisha: number;
  isActive: boolean;
  updatedAt?: unknown;
}

export interface IncomeEntry {
  id: string;
  receiptNumber: string;
  verificationCode: string;
  donorName: string;
  memberId?: string;
  phone?: string;
  category: string;
  date: string;
  amountPoisha: number;
  paymentMethod?: string;
  accountId: string;
  fundId: string;
  notes?: string;
  proofUrl?: string;
  status: 'active' | 'corrected' | 'voided';
  voidReason?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ExpenseLineItem {
  name: string;
  quantity: number;
  unit: string;
  unitPricePoisha: number;
  totalPricePoisha: number;
}

export interface ExpenseEntry {
  id: string;
  voucherNumber: string;
  verificationCode: string;
  titleBn: string;
  category: string;
  date: string;
  items: ExpenseLineItem[];
  totalAmountPoisha: number;
  paymentMethod?: string;
  accountId: string;
  fundId: string;
  payeeName?: string;
  notes?: string;
  billUrl?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  status: 'active' | 'corrected' | 'voided';
  voidReason?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FundTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountPoisha: number;
  date: string;
  notes?: string;
  createdBy: string;
  createdAt?: unknown;
}

export interface SubscriptionPayment {
  id: string;
  memberId: string;
  memberName?: string;
  year: number;
  month: number;
  duePoisha: number;
  paidPoisha: number;
  status: 'paid' | 'partial' | 'unpaid';
  incomeId?: string;
  receiptNumber?: string;
  paidDate?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DashboardSummary {
  id: string;
  totalIncomePoisha: number;
  totalExpensePoisha: number;
  totalBalancePoisha: number;
  cashBalancePoisha?: number;
  bankBalancePoisha?: number;
  mobileBalancePoisha?: number;
  totalMembers?: number;
  totalDonors?: number;
  updatedAt?: unknown;
}

export interface FinancialYear {
  id: string;
  year: number;
  openingBalancePoisha: number;
  closingBalancePoisha?: number;
  isClosed: boolean;
  updatedAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  module: string;
  targetId: string;
  details?: string;
  reason?: string;
  createdAt?: unknown;
}

export interface ContactMessage {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  subject?: string;
  message: string;
  isRead: boolean;
  createdAt?: unknown;
}

export interface BackupLog {
  id: string;
  createdBy: string;
  recordCount: number;
  checksum?: string;
  createdAt?: unknown;
}
