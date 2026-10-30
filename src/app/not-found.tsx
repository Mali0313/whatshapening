import React from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Newspaper, ArrowLeft, Search, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="max-w-xl text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-[#dc2626] dark:bg-red-950/40 text-xs font-bold uppercase tracking-wider mb-4 border border-red-200 dark:border-red-800">
            <Newspaper className="w-3.5 h-3.5" />
            Archive Edition Notice
          </div>

          <h1 className="font-headline text-7xl sm:text-8xl font-black text-[#dc2626] tracking-tighter leading-none mb-3">
            404
          </h1>

          <h2 className="font-headline text-2xl sm:text-3xl font-extrabold mb-3">
            Page or Story Not Found in The Record
          </h2>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8">
            The article dispatch or page you requested may have been archived, moved to a different news desk, or does not exist in our index.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-semibold tracking-wide uppercase transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Front Page
            </Link>

            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border-light)] text-xs font-semibold hover:border-[#dc2626] hover:text-[#dc2626] transition-colors"
            >
              <Search className="w-4 h-4" />
              Search the Archives
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-[var(--border-light)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-3">
              Explore Popular Desks
            </span>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {['Pakistan', 'World', 'Politics', 'Business', 'Technology', 'Sports', 'Opinion'].map(
                (cat) => (
                  <Link
                    key={cat}
                    href={`/category/${cat.toLowerCase().replace(/\s+/g, '-')}`}
                    className="px-3 py-1.5 rounded-md bg-[var(--bg-secondary)] hover:text-[#dc2626] border border-[var(--border-light)] transition-colors"
                  >
                    {cat}
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
