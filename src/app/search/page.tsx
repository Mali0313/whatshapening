import React, { Suspense } from 'react';
import Link from 'next/link';
import {
  Search as SearchIcon,
  Filter,
  Calendar,
  Eye,
  FileQuestion,
  ChevronRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BookmarkButton } from '@/components/BookmarkButton';
import { searchArticles, getCategories } from '@/lib/data/articles';

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export const metadata = {
  title: 'Search Archives & Journalism | What\'s Happening',
  description: 'Search articles, investigations, editorials, and authors across the What\'s Happening platform.',
};

async function SearchResults({ query, category }: { query: string; category?: string }) {
  const articles = await searchArticles(query, category);
  const categories = await getCategories();

  return (
    <div>
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 text-xs scrollbar-none">
        <span className="font-semibold text-[var(--text-muted)] shrink-0 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" /> Filter by Desk:
        </span>
        <Link
          href={`/search?q=${encodeURIComponent(query)}&category=all`}
          className={`px-3 py-1.5 rounded-full border transition-colors shrink-0 font-medium ${
            !category || category === 'all'
              ? 'bg-[#dc2626] text-white border-[#dc2626]'
              : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-[#dc2626]'
          }`}
        >
          All Desks
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/search?q=${encodeURIComponent(query)}&category=${c.slug}`}
            className={`px-3 py-1.5 rounded-full border transition-colors shrink-0 font-medium ${
              category === c.slug
                ? 'bg-[#dc2626] text-white border-[#dc2626]'
                : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-light)] hover:border-[#dc2626]'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Results Header */}
      <div className="border-b border-[var(--border-light)] pb-3 mb-8 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <div>
          {query ? (
            <span>
              Showing results for <strong className="font-serif italic text-sm text-[var(--text-primary)]">&ldquo;{query}&rdquo;</strong>
            </span>
          ) : (
            <span>Browsing latest editorial archives</span>
          )}
        </div>
        <span className="font-semibold text-[var(--text-primary)]">
          {articles.length} {articles.length === 1 ? 'Dispatch Found' : 'Dispatches Found'}
        </span>
      </div>

      {/* Results Grid */}
      {articles.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-red-50 text-[#dc2626] dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
            <FileQuestion className="w-8 h-8" />
          </div>
          <h2 className="font-headline text-2xl font-bold mb-2">No matching dispatches found</h2>
          <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
            We couldn&apos;t find any stories matching your query. Try broadening your keywords or clearing desk filters.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#dc2626] text-white text-xs font-semibold"
          >
            Clear Search
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <article
              key={article.id}
              className="p-5 rounded-2xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm hover:border-[#dc2626] transition-all flex flex-col justify-between"
            >
              <div>
                {article.cover_image_url && (
                  <Link
                    href={`/news/${article.slug}`}
                    className="block relative aspect-[16/10] overflow-hidden rounded-xl mb-4 bg-[var(--bg-secondary)]"
                  >
                    <img
                      src={article.cover_image_url}
                      alt={article.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    {article.video_url && article.is_approved && (
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold shadow-md">
                        <span className="text-[#dc2626]">▶</span> Video
                      </span>
                    )}
                  </Link>
                )}

                <div className="flex items-center gap-2 mb-1.5 text-[11px] text-[var(--text-muted)]">
                  {article.video_url && article.is_approved && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dc2626] text-white">
                      <span>▶</span> Video
                    </span>
                  )}
                  {article.category && (
                    <span className="font-bold text-[#dc2626] uppercase">
                      {article.category.name}
                    </span>
                  )}
                  <span>&bull;</span>
                  <span>{new Date(article.published_at).toLocaleDateString()}</span>
                </div>

                <Link href={`/news/${article.slug}`}>
                  <h3 className="font-headline font-bold text-lg leading-snug hover:text-[#dc2626] transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                </Link>

                {article.excerpt && (
                  <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                    {article.excerpt}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                <Link
                  href={`/author/${article.author_id}`}
                  className="font-medium hover:text-[#dc2626] transition-colors"
                >
                  {article.author?.full_name || 'Staff Reporter'}
                </Link>
                <div className="flex items-center gap-2">
                  <span>{article.views} views</span>
                  <BookmarkButton articleId={article.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q || '';
  const category = params.category || 'all';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        {/* Search Input Bar */}
        <div className="max-w-2xl mx-auto mb-10 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#dc2626] block mb-1">
            Global Archive Index
          </span>
          <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Search Journalism<span className="text-[#dc2626]">.</span>
          </h1>

          <form action="/search" method="GET" className="relative flex items-center">
            <SearchIcon className="w-5 h-5 absolute left-4 text-[#dc2626]" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by topic, keyword, treaty, country, author..."
              className="w-full pl-12 pr-28 py-3.5 text-sm sm:text-base rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm focus:border-[#dc2626] focus:outline-none transition-colors"
            />
            {category && category !== 'all' && (
              <input type="hidden" name="category" value={category} />
            )}
            <button
              type="submit"
              className="absolute right-2 px-5 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold tracking-wide uppercase transition-colors shadow-sm cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Dynamic Search Results */}
        <Suspense fallback={<div className="p-12 text-center text-xs text-[var(--text-muted)] animate-pulse">Searching archives...</div>}>
          <SearchResults query={query} category={category} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
