import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Calendar,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BookmarkButton } from '@/components/BookmarkButton';
import { getCategoryBySlug, getArticlesByCategory, getCategories } from '@/lib/data/articles';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}


export async function generateMetadata({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Desk Not Found | What\'s Happening' };

  return {
    title: `${category.name} News & Analysis | What's Happening`,
    description: category.description,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const currentPage = Math.max(1, parseInt(query.page || '1', 10));
  const pageSize = 6;

  const category = await getCategoryBySlug(slug);
  if (!category) {
    notFound();
  }

  const { articles, total, totalPages } = await getArticlesByCategory(
    slug,
    currentPage,
    pageSize
  );

  const allCategories = await getCategories();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        {/* Category Desk Header Banner */}
        <div className="border-b-2 border-[#dc2626] pb-6 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#dc2626] block mb-1">
                Editorial Desk
              </span>
              <h1 className="font-headline text-4xl sm:text-5xl font-extrabold tracking-tight">
                {category.name}<span className="text-[#dc2626]">.</span>
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 max-w-2xl leading-relaxed">
                {category.description}
              </p>
            </div>

            <div className="text-xs text-[var(--text-muted)] self-start sm:self-end">
              <span className="px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] font-medium">
                {total} {total === 1 ? 'Dispatch' : 'Dispatches'} Archived
              </span>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {articles.length === 0 ? (
          <div className="py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-50 text-[#dc2626] dark:bg-red-950/40 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="font-headline text-2xl font-bold mb-2">No dispatches in this desk yet</h2>
            <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
              Our foreign correspondents and desk editors are currently preparing reports for this section.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
            >
              Explore Front Page
            </Link>
          </div>
        ) : (
          /* Articles Grid */
          <div className="space-y-8">
            {/* Lead Story for first page */}
            {currentPage === 1 && articles.length > 0 && (
              <article className="border-b border-[var(--border-light)] pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7">
                  <div className="flex items-center gap-2 mb-2 text-xs">
                    <span className="font-bold text-[#dc2626] uppercase tracking-wider">
                      Featured In {category.name}
                    </span>
                    {articles[0].video_url && articles[0].is_approved && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#dc2626] text-white">
                        <span>▶</span> Video
                      </span>
                    )}
                    <span className="text-[var(--text-muted)]">&bull;</span>
                    <span className="text-[var(--text-muted)]">
                      {new Date(articles[0].published_at).toLocaleDateString()}
                    </span>
                  </div>

                  <Link href={`/news/${articles[0].slug}`} className="group">
                    <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-extrabold leading-snug group-hover:text-[#dc2626] transition-colors">
                      {articles[0].title}
                    </h2>
                  </Link>

                  <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed">
                    {articles[0].excerpt}
                  </p>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-light)] text-xs text-[var(--text-muted)]">
                    <Link
                      href={`/author/${articles[0].author_id}`}
                      className="font-semibold text-[var(--text-primary)] hover:text-[#dc2626]"
                    >
                      By {articles[0].author?.full_name || 'Staff Reporter'}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span>{articles[0].views} views</span>
                      <BookmarkButton articleId={articles[0].id} />
                    </div>
                  </div>
                </div>

                {articles[0].cover_image_url && (
                  <div className="lg:col-span-5">
                    <Link
                      href={`/news/${articles[0].slug}`}
                      className="block relative aspect-[16/10] rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-light)] group shadow-sm"
                    >
                      <img
                        src={articles[0].cover_image_url}
                        alt={articles[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {articles[0].video_url && articles[0].is_approved && (
                        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-xs text-white text-[10px] font-bold shadow-md">
                          <span className="text-[#dc2626]">▶</span> Video
                        </span>
                      )}
                    </Link>
                  </div>
                )}
              </article>
            )}

            {/* Grid of Remaining Stories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(currentPage === 1 ? articles.slice(1) : articles).map((article) => (
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
                      <span>{new Date(article.published_at).toLocaleDateString()}</span>
                      <span>&bull;</span>
                      <span>{article.views} views</span>
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
                    <BookmarkButton articleId={article.id} />
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-10 border-t border-[var(--border-light)] flex items-center justify-between">
                <div>
                  {currentPage > 1 ? (
                    <Link
                      href={`/category/${slug}?page=${currentPage - 1}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-light)] text-xs font-semibold hover:border-[#dc2626] hover:text-[#dc2626] transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous Page</span>
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-light)] text-xs font-semibold opacity-40 cursor-not-allowed">
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous Page</span>
                    </span>
                  )}
                </div>

                <div className="text-xs font-medium text-[var(--text-secondary)]">
                  Page <strong className="text-[var(--text-primary)]">{currentPage}</strong> of{' '}
                  <strong className="text-[var(--text-primary)]">{totalPages}</strong>
                </div>

                <div>
                  {currentPage < totalPages ? (
                    <Link
                      href={`/category/${slug}?page=${currentPage + 1}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-light)] text-xs font-semibold hover:border-[#dc2626] hover:text-[#dc2626] transition-colors"
                    >
                      <span>Next Page</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-light)] text-xs font-semibold opacity-40 cursor-not-allowed">
                      <span>Next Page</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other Desks Navigation Footer */}
        <section className="mt-16 pt-10 border-t border-[var(--border-light)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-4">
            Navigate to Other Desks
          </span>
          <div className="flex flex-wrap gap-2">
            {allCategories
              .filter((c) => c.slug !== slug)
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="px-3.5 py-2 rounded-lg text-xs bg-[var(--card-bg)] hover:bg-[var(--accent-red-subtle)] hover:text-[#dc2626] border border-[var(--border-light)] transition-colors font-medium"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
