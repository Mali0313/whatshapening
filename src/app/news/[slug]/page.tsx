import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Clock,
  Calendar,
  Eye,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  Share2,
  Video,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { BookmarkButton } from '@/components/BookmarkButton';
import { ShareButtons } from '@/components/ShareButtons';
import { LikeButton } from '@/components/LikeButton';
import { FollowAuthorButton } from '@/components/FollowAuthorButton';
import { ArticleComments } from '@/components/ArticleComments';
import { ArticleAudioPlayer } from '@/components/ArticleAudioPlayer';
import { AdBanner } from '@/components/AdBanner';
import { getArticleBySlug, getRelatedArticles } from '@/lib/data/articles';
import { ViewCounterTracker } from './ViewCounterTracker';

export const revalidate = 60;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}


export async function generateMetadata({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://whatshappening.news';

  if (!article) return { title: 'Story Not Found | What\'s Happening' };

  const articleUrl = `${baseUrl}/news/${article.slug}`;
  const defaultImage = 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80';
  const ogImage = article.cover_image_url || defaultImage;

  return {
    title: `${article.title} | What's Happening`,
    description: article.excerpt || article.content.slice(0, 160),
    alternates: {
      canonical: articleUrl,
    },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.excerpt,
      url: articleUrl,
      siteName: "What's Happening",
      publishedTime: article.published_at || article.created_at,
      modifiedTime: article.created_at,
      authors: [article.author?.full_name || 'What\'s Happening Bureau'],
      tags: article.tags || [],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://whatshappening.news';

  if (!article) {
    notFound();
  }

  const related = await getRelatedArticles(article.id, article.category_id, 3);
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short',
  }).format(new Date(article.published_at || article.created_at));

  const authorName = article.author?.full_name || 'Editorial Bureau';
  const authorInitial = authorName.charAt(0).toUpperCase();

  // NewsArticle JSON-LD structured data for Google News / Search
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.excerpt,
    image: [article.cover_image_url || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1200&q=80'],
    datePublished: article.published_at || article.created_at,
    dateModified: article.created_at,
    author: [
      {
        '@type': 'Person',
        name: authorName,
        url: `${baseUrl}/author/${article.author_id}`,
      },
    ],
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: "What's Happening",
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/news/${article.slug}`,
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* NewsArticle JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Background view counter tracker */}
      <ViewCounterTracker slug={article.slug} />

      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full">
        {/* Breadcrumb Bar */}
        <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-[#dc2626] transition-colors">
            Front Page
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          {article.category && (
            <>
              <Link
                href={`/category/${article.category.slug}`}
                className="hover:text-[#dc2626] font-medium text-[var(--text-primary)] transition-colors"
              >
                {article.category.name}
              </Link>
              <ChevronRight className="w-3 h-3 shrink-0" />
            </>
          )}
          <span className="truncate max-w-xs">{article.title}</span>
        </nav>

        {/* Article Header */}
        <header className="border-b border-[var(--border-light)] pb-6 mb-8">
          {/* Category Tag & Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {article.category && (
              <Link
                href={`/category/${article.category.slug}`}
                className="text-xs font-bold uppercase tracking-wider text-[#dc2626] hover:underline"
              >
                {article.category.name}
              </Link>
            )}

            {article.is_breaking && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                <Sparkles className="w-3 h-3" /> Breaking News
              </span>
            )}

            {article.video_url && article.is_approved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600 text-white">
                <Video className="w-3 h-3" /> Video Included
              </span>
            )}
            {article.video_url && !article.is_approved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
                <Clock className="w-3 h-3" /> Video Pending Approval
              </span>
            )}

            <span className="text-xs text-[var(--text-muted)]">&bull;</span>
            <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              {article.type === 'article' ? 'In-Depth Feature' : 'News Dispatch'}
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5">
            {article.title}
          </h1>

          {/* Excerpt Lead */}
          {article.excerpt && (
            <p className="font-serif italic text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed mb-6">
              {article.excerpt}
            </p>
          )}

          {/* Author Byline & Social Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border-light)]">
            {/* Author */}
            <div className="flex items-center gap-3">
              <Link href={`/author/${article.author_id}`} className="shrink-0 group">
                {article.author?.avatar_url ? (
                  <img
                    src={article.author.avatar_url}
                    alt={authorName}
                    className="w-11 h-11 rounded-full object-cover border border-[var(--border-light)] group-hover:ring-2 group-hover:ring-[#dc2626] transition-all"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#dc2626] text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                    {authorInitial}
                  </div>
                )}
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/author/${article.author_id}`}
                    className="font-semibold text-sm hover:text-[#dc2626] transition-colors"
                  >
                    By {authorName}
                  </Link>
                  {article.author?.role === 'admin' && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                      Editor
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formattedDate}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {article.views} views
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Like, Bookmark & Share */}
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <LikeButton articleId={article.id} />
              <BookmarkButton articleId={article.id} articleTitle={article.title} />
              <ShareButtons title={article.title} />
            </div>
          </div>
        </header>

        {/* Audio Narration & Reading Time */}
        <ArticleAudioPlayer
          title={article.title}
          content={article.content}
          excerpt={article.excerpt}
        />

        {/* Attached Video Player Dispatch (Rendered only when approved) */}
        {article.video_url && article.is_approved && (
          <figure className="mb-8 sm:mb-10 -mx-4 sm:mx-0">
            <div className="relative aspect-[16/9] w-full rounded-none sm:rounded-2xl overflow-hidden bg-black border-y sm:border border-[var(--border-light)] shadow-md">
              <video
                src={article.video_url}
                controls
                playsInline
                preload="metadata"
                poster={article.cover_image_url || undefined}
                className="w-full h-full object-contain"
              >
                Your browser does not support HTML5 video playback.
              </video>
            </div>
            <figcaption className="text-[11px] text-[var(--text-muted)] mt-2 italic px-4 sm:px-1 flex items-center justify-between">
              <span>Video report &bull; What&apos;s Happening News Desk</span>
              <span>All rights reserved.</span>
            </figcaption>
          </figure>
        )}

        {/* Hero Cover Image (when no video is attached OR video is pending review) */}
        {(!article.video_url || !article.is_approved) && article.cover_image_url && (
          <figure className="mb-10">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-sm">
              <img
                src={article.cover_image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="text-[11px] text-[var(--text-muted)] mt-2 italic px-1 flex items-center justify-between">
              <span>Photo dispatch from What&apos;s Happening Global Photo Service.</span>
              <span>All rights reserved.</span>
            </figcaption>
          </figure>
        )}

        {/* Article Body Content */}
        <article className="max-w-3xl mx-auto">
          <div className="prose prose-lg dark:prose-invert max-w-none text-base sm:text-lg leading-relaxed text-[var(--text-primary)] space-y-6">
            {article.content.split('\n\n').map((paragraph, idx) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;

              const isHeading = trimmed.startsWith('# ');
              const isQuote =
                trimmed.startsWith('"') || trimmed.startsWith('“') || trimmed.startsWith('&ldquo;');

              return (
                <React.Fragment key={idx}>
                  {isHeading ? (
                    <h2 className="font-headline text-2xl sm:text-3xl font-bold mt-8 mb-4">
                      {trimmed.replace('# ', '')}
                    </h2>
                  ) : isQuote ? (
                    <blockquote className="border-l-4 border-[#dc2626] pl-5 my-6 font-serif italic text-xl text-[var(--text-secondary)]">
                      {trimmed}
                    </blockquote>
                  ) : (
                    <p className="text-justify leading-relaxed">{trimmed}</p>
                  )}

                  {/* High Impact Monetization: In-Article Ad Banner inserted after 2nd paragraph */}
                  {idx === 1 && <AdBanner slot="in-article" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-[var(--border-light)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-3">
                Related Desks & Topics:
              </span>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 rounded-full text-xs bg-[var(--bg-secondary)] hover:bg-red-50 hover:text-[#dc2626] border border-[var(--border-light)] transition-colors"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Article Engagement Bar (Like, Bookmark, Share) */}
          <div className="mt-10 p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LikeButton variant="full" articleId={article.id} />
              <BookmarkButton articleId={article.id} articleTitle={article.title} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
                Share:
              </span>
              <ShareButtons title={article.title} />
            </div>
          </div>

          {/* Author Box with Follow Button */}
          <div className="mt-8 p-6 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Link href={`/author/${article.author_id}`} className="shrink-0">
              {article.author?.avatar_url ? (
                <img
                  src={article.author.avatar_url}
                  alt={authorName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-[var(--border-light)] shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#dc2626] text-white flex items-center justify-center font-bold text-xl shadow-md">
                  {authorInitial}
                </div>
              )}
            </Link>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Link
                    href={`/author/${article.author_id}`}
                    className="font-headline font-bold text-lg hover:text-[#dc2626] transition-colors"
                  >
                    {authorName}
                  </Link>
                  <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                    &bull; {article.author?.role || 'Writer'}
                  </span>
                </div>

                <FollowAuthorButton
                  authorId={article.author_id}
                  authorName={authorName}
                />
              </div>

              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                {article.author?.bio ||
                  'Senior Correspondent covering investigative and technological developments for What\'s Happening.'}
              </p>

              <div className="mt-3">
                <Link
                  href={`/author/${article.author_id}`}
                  className="text-xs font-semibold text-[#dc2626] hover:underline inline-flex items-center gap-1"
                >
                  <span>View all stories by {authorName}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Reader Comments & Discussions */}
          <ArticleComments
            articleId={article.id}
            articleTitle={article.title}
            authorId={article.author_id}
          />
        </article>

        {/* Related Articles Section */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t-2 border-[#dc2626]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-headline text-2xl font-bold tracking-tight">
                More from {article.category?.name || 'This Desk'}
              </h2>
              {article.category && (
                <Link
                  href={`/category/${article.category.slug}`}
                  className="text-xs font-semibold text-[#dc2626] hover:underline uppercase tracking-wider"
                >
                  See All Stories &rarr;
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((rel) => (
                <article
                  key={rel.id}
                  className="p-4 rounded-xl border border-[var(--border-light)] bg-[var(--card-bg)] shadow-sm hover:border-[#dc2626] transition-colors flex flex-col justify-between"
                >
                  <div>
                    {rel.cover_image_url && (
                      <Link href={`/news/${rel.slug}`} className="block aspect-[16/10] overflow-hidden rounded-lg mb-3">
                        <img
                          src={rel.cover_image_url}
                          alt={rel.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                    )}
                    <Link href={`/news/${rel.slug}`}>
                      <h3 className="font-headline font-bold text-base hover:text-[#dc2626] transition-colors line-clamp-2">
                        {rel.title}
                      </h3>
                    </Link>
                    {rel.excerpt && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2">
                        {rel.excerpt}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--border-light)] text-[11px] text-[var(--text-muted)] flex items-center justify-between">
                    <span>{new Date(rel.published_at).toLocaleDateString()}</span>
                    <span>{rel.views} views</span>
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
