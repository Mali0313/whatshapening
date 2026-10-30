import React from 'react';
import Link from 'next/link';
import {
  Flame,
  Clock,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Globe2,
  Cpu,
  BarChart3,
  Award,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BookmarkButton } from '@/components/BookmarkButton';
import { AdBanner } from '@/components/AdBanner';
import { getHomePageData, Article } from '@/lib/data/articles';

export const revalidate = 60;

export default async function HomePage() {
  const { breakingNews, featuredArticles, trendingArticles, latestArticles, categories } =
    await getHomePageData();

  const heroArticle = featuredArticles[0] || latestArticles[0];
  const secondaryHero = featuredArticles.slice(1, 4);

  const pakistanArticles = latestArticles.filter((a) => a.category?.slug === 'pakistan').slice(0, 3);
  const worldArticles = latestArticles.filter((a) => a.category?.slug === 'world' || a.category?.slug === 'politics').slice(0, 3);
  const techArticles = latestArticles.filter((a) => a.category?.slug === 'technology' || a.category?.slug === 'science' || a.category?.slug === 'business').slice(0, 3);
  const sportsArticles = latestArticles.filter((a) => a.category?.slug === 'sports' || a.category?.slug === 'opinion' || a.category?.slug === 'entertainment').slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      {/* 1. RED BREAKING-NEWS TICKER */}
      {breakingNews.length > 0 && (
        <section className="bg-[#dc2626] text-white py-2 px-4 sm:px-8 overflow-hidden shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded shrink-0">
              <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
              Breaking
            </span>
            <div className="overflow-x-auto whitespace-nowrap text-xs font-medium flex items-center gap-6 scrollbar-none">
              {breakingNews.map((bn, idx) => (
                <Link
                  key={bn.id}
                  href={`/news/${bn.slug}`}
                  className="hover:underline flex items-center gap-2 text-white/95 hover:text-white"
                >
                  <span className="font-bold">[{bn.category?.name || 'Urgent'}]</span>
                  <span>{bn.title}</span>
                  {idx < breakingNews.length - 1 && <span className="opacity-40">&bull;</span>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Monetization: Header Leaderboard Banner */}
      <AdBanner slot="leaderboard" />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full space-y-12">
        {/* 2. THE FRONT PAGE: BIG FEATURED STORY + SIDE STORIES */}
        <section id="top-stories" className="scroll-mt-28 lg:scroll-mt-36 border-b border-[var(--border-light)] pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Lead Story (Col 1-7) */}
            {heroArticle && (
              <article className="lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    {heroArticle.category && (
                      <Link
                        href={`/category/${heroArticle.category.slug}`}
                        className="font-bold uppercase tracking-wider text-[#dc2626] hover:underline"
                      >
                        {heroArticle.category.name}
                      </Link>
                    )}
                    {heroArticle.video_url && heroArticle.is_approved && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dc2626] text-white">
                        <span>▶</span> Video
                      </span>
                    )}
                    <span className="text-[var(--text-muted)]">&bull;</span>
                    <span className="text-[var(--text-muted)]">
                      {new Date(heroArticle.published_at).toLocaleDateString()}
                    </span>
                  </div>

                  <Link href={`/news/${heroArticle.slug}`} className="group">
                    <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-black leading-[1.1] tracking-tight group-hover:text-[#dc2626] transition-colors mb-3">
                      {heroArticle.title}
                    </h2>
                  </Link>

                  <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-sans mb-5">
                    {heroArticle.excerpt}
                  </p>

                  {/* Lead Cover Image */}
                  {heroArticle.cover_image_url && (
                    <Link
                      href={`/news/${heroArticle.slug}`}
                      className="block relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-sm group"
                    >
                      <img
                        src={heroArticle.cover_image_url}
                        alt={heroArticle.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {heroArticle.video_url && heroArticle.is_approved && (
                        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/85 backdrop-blur-xs text-white text-[11px] font-bold shadow-md">
                          <span className="text-[#dc2626]">▶</span> Video
                        </span>
                      )}
                    </Link>
                  )}

                  <div className="flex items-center justify-between mt-4 text-xs text-[var(--text-muted)] border-t border-[var(--border-light)] pt-3">
                    <Link
                      href={`/author/${heroArticle.author_id}`}
                      className="font-semibold text-[var(--text-primary)] hover:text-[#dc2626] transition-colors"
                    >
                      By {heroArticle.author?.full_name || 'Senior Correspondent'}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span>{heroArticle.views} views</span>
                      <BookmarkButton articleId={heroArticle.id} />
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* Column 2: Secondary Featured Stories (Col 8-12) */}
            <div className="lg:col-span-5 flex flex-col gap-6 lg:border-l lg:border-[var(--border-light)] lg:pl-8">
              <div className="flex items-center justify-between border-b-2 border-[#dc2626] pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Top Editorial Developments
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">Updated hourly</span>
              </div>

              {secondaryHero.length > 0 ? (
                secondaryHero.map((art) => (
                  <article key={art.id} className="border-b border-[var(--border-light)] pb-5 last:border-b-0">
                    <div className="flex items-center gap-2 mb-1 text-[11px]">
                      {art.category && (
                        <Link
                          href={`/category/${art.category.slug}`}
                          className="font-bold uppercase tracking-wider text-[#dc2626] hover:underline"
                        >
                          {art.category.name}
                        </Link>
                      )}
                      {art.video_url && art.is_approved && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#dc2626] text-white">
                          <span>▶</span> Video
                        </span>
                      )}
                      <span className="text-[var(--text-muted)]">&bull;</span>
                      <span className="text-[var(--text-muted)]">
                        {new Date(art.published_at).toLocaleDateString()}
                      </span>
                    </div>

                    <Link href={`/news/${art.slug}`} className="group block">
                      <h3 className="font-headline text-lg sm:text-xl font-bold leading-snug group-hover:text-[#dc2626] transition-colors">
                        {art.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                      {art.excerpt}
                    </p>

                    <div className="flex items-center justify-between mt-3 text-[11px] text-[var(--text-muted)]">
                      <Link
                        href={`/author/${art.author_id}`}
                        className="hover:text-[#dc2626] transition-colors"
                      >
                        {art.author?.full_name || 'Staff Writer'}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span>{art.views} views</span>
                        <BookmarkButton articleId={art.id} />
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm space-y-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-100 text-[#dc2626] dark:bg-red-950/60 dark:text-red-300">
                    Live Editorial Desk
                  </span>
                  <h3 className="font-headline font-bold text-lg">
                    Real-time Editorial Wire
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Have an urgent story, investigative analysis, or breaking news to report? Publish directly to What&apos;s Happening readers worldwide.
                  </p>
                  <Link
                    href="/write"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#dc2626] hover:bg-[#b91c1c] px-4 py-2 rounded-full shadow-sm transition-all"
                  >
                    <span>Write & Publish Live</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. LATEST NEWS & TRENDING (BY VIEWS) */}
        <section className="border-b border-[var(--border-light)] pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Latest News Grid (8 cols) */}
            <div className="lg:col-span-8">
              <div className="flex items-center justify-between border-b-2 border-[#dc2626] pb-2 mb-6">
                <h2 className="font-headline text-2xl font-bold tracking-tight">
                  Latest Wire Dispatches
                </h2>
                <Link
                  href="/search"
                  className="text-xs font-semibold text-[#dc2626] hover:underline uppercase tracking-wider flex items-center gap-1"
                >
                  <span>All Stories</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {latestArticles.map((art) => (
                  <article
                    key={art.id}
                    className="p-5 rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm hover:border-[#dc2626] transition-all flex flex-col justify-between"
                  >
                    <div>
                      {art.cover_image_url && (
                        <Link
                          href={`/news/${art.slug}`}
                          className="block relative aspect-[16/10] overflow-hidden rounded-xl mb-3 bg-[var(--bg-secondary)]"
                        >
                          <img
                            src={art.cover_image_url}
                            alt={art.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                          {art.video_url && art.is_approved && (
                            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold shadow-md">
                              <span className="text-[#dc2626]">▶</span> Video
                            </span>
                          )}
                        </Link>
                      )}

                      <div className="flex items-center gap-2 mb-1 text-[11px] text-[var(--text-muted)]">
                        {art.category && (
                          <Link
                            href={`/category/${art.category.slug}`}
                            className="font-bold text-[#dc2626] uppercase hover:underline"
                          >
                            {art.category.name}
                          </Link>
                        )}
                        {art.video_url && art.is_approved && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#dc2626] text-white">
                            <span>▶</span> Video
                          </span>
                        )}
                        <span>&bull;</span>
                        <span>{new Date(art.published_at).toLocaleDateString()}</span>
                      </div>

                      <Link href={`/news/${art.slug}`}>
                        <h3 className="font-headline font-bold text-lg leading-snug hover:text-[#dc2626] transition-colors line-clamp-2">
                          {art.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                        {art.excerpt}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <Link
                        href={`/author/${art.author_id}`}
                        className="hover:text-[#dc2626] transition-colors"
                      >
                        {art.author?.full_name || 'Staff Reporter'}
                      </Link>
                      <BookmarkButton articleId={art.id} />
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Trending by Views Sidebar (4 cols) */}
            <div className="lg:col-span-4 lg:border-l lg:border-[var(--border-light)] lg:pl-8">
              <div className="flex items-center gap-2 border-b-2 border-[#dc2626] pb-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[#dc2626]" />
                <h2 className="font-headline text-2xl font-bold tracking-tight">
                  Most Read
                </h2>
              </div>

              <div className="divide-y divide-[var(--border-light)]">
                {trendingArticles.map((art, idx) => (
                  <div key={art.id} className="py-4 first:pt-0 last:pb-0 flex items-start gap-4">
                    {/* Rank Number */}
                    <span className="font-headline text-3xl font-black text-[#dc2626] opacity-90 leading-none shrink-0 w-6">
                      0{idx + 1}
                    </span>

                    <div className="flex-1">
                      {art.category && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            {art.category.name}
                          </span>
                          {art.video_url && art.is_approved && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#dc2626] text-white text-[9px] font-bold">
                              <span>▶</span> Video
                            </span>
                          )}
                        </div>
                      )}
                      <Link href={`/news/${art.slug}`} className="group">
                        <h4 className="font-headline font-bold text-sm leading-snug group-hover:text-[#dc2626] transition-colors line-clamp-2">
                          {art.title}
                        </h4>
                      </Link>
                      <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-[#dc2626]" />
                        <span>{art.views.toLocaleString()} reads</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar Monetization Banner */}
              <AdBanner slot="sidebar" className="mt-8" />
            </div>
          </div>
        </section>

        {/* 4. CATEGORY SECTIONS */}
        {/* 4. CATEGORY SECTIONS (Displayed when articles exist) */}
        {/* Section A: Pakistan Desk */}
        {pakistanArticles.length > 0 && (
          <section id="pakistan" className="scroll-mt-28 lg:scroll-mt-36 border-b border-[var(--border-light)] pb-12">
            <div className="flex items-center justify-between border-b-2 border-[#dc2626] pb-3 mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#dc2626] block">
                  Regional Hub
                </span>
                <h2 className="font-headline text-3xl font-extrabold tracking-tight">
                  Pakistan Affairs & Economy
                </h2>
              </div>
              <Link
                href="/category/pakistan"
                className="text-xs font-semibold text-[#dc2626] hover:underline uppercase tracking-wider flex items-center gap-1"
              >
                <span>Explore Desk</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pakistanArticles.map((art) => (
                <article
                  key={art.id}
                  className="p-5 rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm hover:border-[#dc2626] transition-all flex flex-col justify-between"
                >
                  <div>
                    {art.cover_image_url && (
                      <Link href={`/news/${art.slug}`} className="block relative aspect-[16/10] overflow-hidden rounded-xl mb-3">
                        <img
                          src={art.cover_image_url}
                          alt={art.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        {art.video_url && art.is_approved && (
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold shadow-md">
                            <span className="text-[#dc2626]">▶</span> Video
                          </span>
                        )}
                      </Link>
                    )}
                    <Link href={`/news/${art.slug}`}>
                      <h3 className="font-headline font-bold text-lg leading-snug hover:text-[#dc2626] transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                      {art.excerpt}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{art.author?.full_name}</span>
                    <BookmarkButton articleId={art.id} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Section B: World Affairs & Politics */}
        {worldArticles.length > 0 && (
          <section id="world" className="scroll-mt-28 lg:scroll-mt-36 border-b border-[var(--border-light)] pb-12">
            <div className="flex items-center justify-between border-b-2 border-[#dc2626] pb-3 mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#dc2626] block">
                  Foreign Bureaus
                </span>
                <h2 className="font-headline text-3xl font-extrabold tracking-tight">
                  World & Geopolitics
                </h2>
              </div>
              <Link
                href="/category/world"
                className="text-xs font-semibold text-[#dc2626] hover:underline uppercase tracking-wider flex items-center gap-1"
              >
                <span>Explore Desk</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {worldArticles.map((art) => (
                <article
                  key={art.id}
                  className="p-5 rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm hover:border-[#dc2626] transition-all flex flex-col justify-between"
                >
                  <div>
                    {art.cover_image_url && (
                      <Link href={`/news/${art.slug}`} className="block relative aspect-[16/10] overflow-hidden rounded-xl mb-3">
                        <img
                          src={art.cover_image_url}
                          alt={art.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        {art.video_url && art.is_approved && (
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold shadow-md">
                            <span className="text-[#dc2626]">▶</span> Video
                          </span>
                        )}
                      </Link>
                    )}
                    <Link href={`/news/${art.slug}`}>
                      <h3 className="font-headline font-bold text-lg leading-snug hover:text-[#dc2626] transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                      {art.excerpt}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{art.author?.full_name}</span>
                    <BookmarkButton articleId={art.id} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Section C: Technology, AI & Science */}
        {techArticles.length > 0 && (
          <section id="business-tech" className="scroll-mt-28 lg:scroll-mt-36 border-b border-[var(--border-light)] pb-12">
            <div className="flex items-center justify-between border-b-2 border-[#dc2626] pb-3 mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#dc2626] block">
                  Frontier Computing
                </span>
                <h2 className="font-headline text-3xl font-extrabold tracking-tight">
                  Technology & Science
                </h2>
              </div>
              <Link
                href="/category/technology"
                className="text-xs font-semibold text-[#dc2626] hover:underline uppercase tracking-wider flex items-center gap-1"
              >
                <span>Explore Desk</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {techArticles.map((art) => (
                <article
                  key={art.id}
                  className="p-5 rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm hover:border-[#dc2626] transition-all flex flex-col justify-between"
                >
                  <div>
                    {art.cover_image_url && (
                      <Link href={`/news/${art.slug}`} className="block relative aspect-[16/10] overflow-hidden rounded-xl mb-3">
                        <img
                          src={art.cover_image_url}
                          alt={art.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        {art.video_url && art.is_approved && (
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold shadow-md">
                            <span className="text-[#dc2626]">▶</span> Video
                          </span>
                        )}
                      </Link>
                    )}
                    <Link href={`/news/${art.slug}`}>
                      <h3 className="font-headline font-bold text-lg leading-snug hover:text-[#dc2626] transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                      {art.excerpt}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{art.author?.full_name}</span>
                    <BookmarkButton articleId={art.id} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Section D: Sports, Culture & Opinion */}
        {sportsArticles.length > 0 && (
          <section id="sports" className="scroll-mt-28 lg:scroll-mt-36 pb-8">
            <div className="flex items-center justify-between border-b-2 border-[#dc2626] pb-3 mb-8">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#dc2626] block">
                  Culture & Sport
                </span>
                <h2 className="font-headline text-3xl font-extrabold tracking-tight">
                  Sports, Arts & The Editorial Board
                </h2>
              </div>
              <Link
                href="/category/sports"
                className="text-xs font-semibold text-[#dc2626] hover:underline uppercase tracking-wider flex items-center gap-1"
              >
                <span>Explore Desk</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sportsArticles.map((art) => (
                <article
                  key={art.id}
                  className="p-5 rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm hover:border-[#dc2626] transition-all flex flex-col justify-between"
                >
                  <div>
                    {art.cover_image_url && (
                      <Link href={`/news/${art.slug}`} className="block relative aspect-[16/10] overflow-hidden rounded-xl mb-3">
                        <img
                          src={art.cover_image_url}
                          alt={art.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        {art.video_url && art.is_approved && (
                          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold shadow-md">
                            <span className="text-[#dc2626]">▶</span> Video
                          </span>
                        )}
                      </Link>
                    )}
                    <Link href={`/news/${art.slug}`}>
                      <h3 className="font-headline font-bold text-lg leading-snug hover:text-[#dc2626] transition-colors line-clamp-2">
                        {art.title}
                      </h3>
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                      {art.excerpt}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>{art.author?.full_name}</span>
                    <BookmarkButton articleId={art.id} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
