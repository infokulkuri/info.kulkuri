import React from 'react';
import { ArrowRight, Bell, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageSection } from '../types/models';
import { formatDateBn, sanitizeHtml } from '../utils/bengali';

interface DynamicSectionsProps {
  pageSlug: string;
  onNavigate: (slug: string) => void;
  includeDrafts?: boolean;
}

export const DynamicSections: React.FC<DynamicSectionsProps> = ({
  pageSlug,
  onNavigate,
  includeDrafts = false,
}) => {
  const { pageSections, notices, galleryItems } = useApp();

  const sections = pageSections
    .filter(
      (s) =>
        s.pageSlug === pageSlug &&
        s.visible &&
        (includeDrafts || s.status === 'published')
    )
    .sort((a, b) => a.order - b.order);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-12">
      {sections.map((sec) => (
        <SectionRenderer key={sec.id} section={sec} onNavigate={onNavigate} notices={notices} galleryItems={galleryItems} />
      ))}
    </div>
  );
};

const SectionRenderer: React.FC<{
  section: PageSection;
  onNavigate: (slug: string) => void;
  notices: ReturnType<typeof useApp>['notices'];
  galleryItems: ReturnType<typeof useApp>['galleryItems'];
}> = ({ section, onNavigate, notices, galleryItems }) => {
  const handleAction = (link?: string) => {
    if (!link) return;
    if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      onNavigate(link.replace(/^\//, ''));
    }
  };

  switch (section.type) {
    case 'hero':
    case 'banner':
      return (
        <section className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-white">
          {section.imageUrl && (
            <img
              src={section.imageUrl}
              alt={section.titleBn || 'ব্যানার'}
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          )}
          <div className="relative z-10 px-6 py-12 md:px-12 md:py-16 max-w-3xl">
            {section.titleBn && (
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
                {section.titleBn}
              </h2>
            )}
            {section.subtitleBn && (
              <p className="mt-3 text-base text-slate-200 leading-relaxed">{section.subtitleBn}</p>
            )}
            {section.buttonTextBn && (
              <button
                onClick={() => handleAction(section.buttonLink)}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
              >
                {section.buttonTextBn}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      );

    case 'richtext':
      return (
        <section className="mx-auto max-w-4xl">
          {section.titleBn && (
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {section.titleBn}
            </h2>
          )}
          {section.subtitleBn && (
            <p className="text-slate-600 dark:text-slate-300 mb-4">{section.subtitleBn}</p>
          )}
          {section.bodyHtml && (
            <div
              className="prose prose-slate dark:prose-invert max-w-none leading-relaxed text-slate-700 dark:text-slate-300"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.bodyHtml) }}
            />
          )}
        </section>
      );

    case 'image':
      return (
        <section className="mx-auto max-w-5xl">
          {section.titleBn && (
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{section.titleBn}</h3>
          )}
          {section.imageUrl ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <img
                src={section.imageUrl}
                alt={section.titleBn || 'ছবি'}
                referrerPolicy="no-referrer"
                className="w-full max-h-[480px] object-cover"
              />
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          {section.subtitleBn && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{section.subtitleBn}</p>
          )}
        </section>
      );

    case 'cta':
      return (
        <section className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            {section.titleBn && (
              <h3 className="text-xl font-bold text-emerald-950 dark:text-emerald-100">
                {section.titleBn}
              </h3>
            )}
            {section.subtitleBn && (
              <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-200/80">
                {section.subtitleBn}
              </p>
            )}
          </div>
          {section.buttonTextBn && (
            <button
              onClick={() => handleAction(section.buttonLink)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition whitespace-nowrap cursor-pointer"
            >
              {section.buttonTextBn}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </section>
      );

    case 'notice_board':
      return (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-700" />
              {section.titleBn || 'সাম্প্রতিক নোটিশ'}
            </h3>
            <button
              onClick={() => onNavigate('notices')}
              className="text-sm font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              সব নোটিশ দেখুন
            </button>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {notices.slice(0, 4).map((n) => (
              <div key={n.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{n.titleBn}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {n.category || 'বিজ্ঞপ্তি'} · {formatDateBn(n.publishDate)}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('notices')}
                  className="text-xs font-medium text-emerald-700 hover:underline shrink-0 cursor-pointer"
                >
                  বিস্তারিত
                </button>
              </div>
            ))}
          </div>
        </section>
      );

    case 'gallery':
      return (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {section.titleBn || 'ছবি ও কার্যক্রম গ্যালারি'}
            </h3>
            <button
              onClick={() => onNavigate('gallery')}
              className="text-sm font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              সম্পূর্ণ গ্যালারি
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {galleryItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <img
                  src={item.url}
                  alt={item.titleBn}
                  referrerPolicy="no-referrer"
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.titleBn}</p>
                  {item.captionBn && (
                    <p className="text-xs text-slate-500 mt-1">{item.captionBn}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );

    case 'stats':
      return (
        <section>
          {section.titleBn && (
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">
              {section.titleBn}
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(section.items || []).map((it, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
              >
                <p className="text-xs text-slate-500 dark:text-slate-400">{it.title}</p>
                <p className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                  {it.value}
                </p>
                {it.description && <p className="mt-1 text-xs text-slate-500">{it.description}</p>}
              </div>
            ))}
          </div>
        </section>
      );

    case 'cards':
    default:
      return (
        <section>
          {section.titleBn && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{section.titleBn}</h2>
              {section.subtitleBn && (
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{section.subtitleBn}</p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(section.items || []).map((it, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col"
              >
                {it.imageUrl && (
                  <img
                    src={it.imageUrl}
                    alt={it.title}
                    referrerPolicy="no-referrer"
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="p-5 flex-1 flex flex-col">
                  {it.value && (
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                      {it.value}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{it.title}</h3>
                  {it.description && (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">
                      {it.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
  }
};
