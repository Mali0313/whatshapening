import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  User,
  ShieldCheck,
  Calendar,
  Eye,
  FileText,
  Mail,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BookmarkButton } from '@/components/BookmarkButton';
import { getAuthorProfile, getArticlesByAuthor } from '@/lib/data/articles';

interface AuthorPageProps {
  params: Promise<{ id: string }>;
}


export async function generateMetadata({ params }: AuthorPageProps) {
  const { id } = await params;
  const author = await getAuthorProfile(id);
  if (!author) return { title: 'Author Profile | What\'s Happening' };

  return {
    title: `${author.full_name} — Journalist Profile | What's Happening`,
    description: author.bio || `Articles and dispatches by ${author.full_name}.`,
  };
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { id } = await params;
  const author = await getAuthorProfile(id);

  if (!author) {
    notFound();
  }

  const { articles, total } = await getArticlesByAuthor(id, 1, 30);
  const authorInitial = (author.full_name || 'A').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[#dc2626] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Front Page
          </Link>
        </div>

        {/* Author Bio Masthead Banner */}
        <section className="p-6 sm:p-10 rounded-3xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm mb-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt={author.full_name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-[var(--border-light)] shadow-md"
                />
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#dc2626] text-white flex items-center justify-center font-bold text-3xl shadow-md">
                  {authorInitial}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#dc2626]">
                  Editorial Contributor
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    author.role === 'admin'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  {author.role === 'admin' ? 'Editorial Board / Admin' : 'Senior Staff Writer'}
                </span>
              </div>

              <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                {author.full_name}
              </h1>

              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-4">
                {author.bio ||
                  'Journalist and essayist contributing field investigations, policy analysis, and foreign affairs reporting to What\'s Happening.'}
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-light)]">
                <span className="flex items-center gap-1.5 font-medium">
                  <FileText className="w-3.5 h-3.5 text-[#dc2626]" />
                  {total} Published {total === 1 ? 'Dispatch' : 'Dispatches'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Author's Articles List */}
        <section>
          <div className="border-b-2 border-[#dc2626] pb-3 mb-8 flex items-center justify-between">
            <h2 className="font-headline text-2xl font-bold tracking-tight">
              Published Reporting & Essays
            </h2>
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Sorted by latest release
            </span>
          </div>

          {articles.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)]">
              No articles published by this author yet.
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
                    <span>{article.views} views</span>
                    <BookmarkButton articleId={article.id} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
