'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useNotifications, NotificationItem } from '@/components/NotificationProvider';

function formatRelativeTime(dateString: string) {
  try {
    if (typeof window === 'undefined') {
      return 'Recently';
    }
    const now = Date.now();
    const past = new Date(dateString).getTime();
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    triggerTestNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredList = notifications.filter((item) => {
    if (activeFilter === 'unread' && item.is_read) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }

    if (item.article?.slug) {
      router.push(`/news/${item.article.slug}`);
    } else if (
      item.title.toLowerCase().includes('approved') ||
      item.title.toLowerCase().includes('review')
    ) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full">
        {/* Top Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[#dc2626] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>

          <button
            onClick={triggerTestNotification}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-light)] text-xs font-medium bg-[var(--card-bg)] hover:border-[#dc2626] transition-colors cursor-pointer"
            title="Simulate receiving a realtime notification alert"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#dc2626]" />
            <span>Simulate Realtime Alert</span>
          </button>
        </div>

        {/* Page Title & Stats */}
        <div className="border-b border-[var(--border-light)] pb-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#dc2626] mb-1">
              <Bell className="w-3.5 h-3.5" />
              Realtime Dispatch Center
            </div>
            <h1 className="font-headline text-3xl sm:text-4xl font-extrabold tracking-tight">
              Notifications & Alerts<span className="text-[#dc2626]">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
              Stay informed when new stories break, topics are published, and your articles receive editorial reviews.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-[#dc2626] dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/60 text-xs font-bold uppercase tracking-wider hover:bg-[#dc2626] hover:text-white transition-all cursor-pointer self-start sm:self-auto"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read ({unreadCount})</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeFilter === 'all'
                  ? 'bg-[#dc2626] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                activeFilter === 'unread'
                  ? 'bg-[#dc2626] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] focus:border-[#dc2626] focus:outline-none"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-[var(--card-bg)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-16 text-center text-xs text-[var(--text-muted)] animate-pulse">
              Syncing notifications with realtime stream...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-[var(--text-muted)] flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="font-headline font-bold text-base mb-1">
                {activeFilter === 'unread' ? 'No Unread Notifications' : 'No Notifications'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                {activeFilter === 'unread'
                  ? 'You are all caught up! When new articles are published or your contributions are reviewed, alerts will appear here.'
                  : 'Your notification inbox is clean.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 sm:p-6 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    !item.is_read
                      ? 'bg-red-50/30 dark:bg-red-950/15 hover:bg-red-50/50 dark:hover:bg-red-950/25'
                      : 'hover:bg-[var(--bg-secondary)]/50'
                  }`}
                >
                  {/* Left: Indicator & Content */}
                  <div
                    onClick={() => handleNotificationClick(item)}
                    className="flex items-start gap-4 flex-1 cursor-pointer"
                  >
                    <div className="mt-1 shrink-0">
                      {!item.is_read ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#dc2626] ring-4 ring-red-100 dark:ring-red-950" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`font-headline text-base sm:text-lg ${
                            !item.is_read
                              ? 'font-bold text-[var(--text-primary)]'
                              : 'font-medium text-[var(--text-secondary)]'
                          }`}
                        >
                          {item.title}
                        </h3>
                        <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                        {item.message}
                      </p>

                      {item.article && (
                        <div className="pt-1.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#dc2626] hover:underline">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Read Published Story</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                    {!item.is_read && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[#dc2626] hover:border-[#dc2626] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </button>
                    )}

                    <button
                      onClick={() => deleteNotification(item.id)}
                      className="p-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-muted)] hover:text-red-600 hover:border-red-600 transition-colors cursor-pointer"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
