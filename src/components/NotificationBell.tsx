'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  X,
  FileText,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useNotifications, NotificationItem } from '@/components/NotificationProvider';

// Helper for relative timestamps
function formatTimeAgo(dateString: string) {
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
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    activeToast,
    dismissToast,
    triggerTestNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle clicking on an individual notification
  const handleItemClick = async (notif: NotificationItem) => {
    await markAsRead(notif.id);
    setIsOpen(false);

    if (notif.article?.slug) {
      router.push(`/news/${notif.article.slug}`);
    } else if (notif.title.toLowerCase().includes('approved') || notif.title.toLowerCase().includes('review')) {
      router.push('/dashboard');
    }
  };

  const recentList = notifications.slice(0, 7);

  return (
    <>
      {/* BELL BUTTON & DROPDOWN CONTAINER */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="View notifications"
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-[var(--border-light)]"
        >
          <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#dc2626] text-[10px] font-bold text-white shadow-sm animate-scale-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* DROPDOWN POPOVER */}
        {isOpen && (
          <div className="absolute right-0 top-11 w-80 sm:w-96 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-light)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-3.5 sm:p-4 border-b border-[var(--border-light)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
              <div className="flex items-center gap-2">
                <span className="font-headline font-bold text-sm text-[var(--text-primary)]">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-[#dc2626] dark:bg-red-950/60 dark:text-red-400 text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-[11px] font-semibold text-[#dc2626] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}

                {/* Simulate test trigger in dev/demo */}
                <button
                  onClick={() => triggerTestNotification()}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[#dc2626] transition-colors"
                  title="Simulate incoming real-time alert"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-[var(--border-light)]">
              {recentList.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  <Bell className="w-8 h-8 text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-[11px] mt-0.5 opacity-70">
                    We will notify you when new stories are published or articles are reviewed.
                  </p>
                </div>
              ) : (
                recentList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 sm:p-4 text-xs cursor-pointer transition-colors flex items-start gap-3 hover:bg-[var(--bg-secondary)] ${
                      !item.is_read ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                    }`}
                  >
                    {/* Status Dot / Icon */}
                    <div className="shrink-0 mt-0.5">
                      {!item.is_read ? (
                        <div className="w-2 h-2 rounded-full bg-[#dc2626] ring-4 ring-red-100 dark:ring-red-950" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-transparent" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-headline text-xs ${
                            !item.is_read
                              ? 'font-bold text-[var(--text-primary)]'
                              : 'font-medium text-[var(--text-secondary)]'
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0 flex items-center gap-0.5 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimeAgo(item.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                        {item.message}
                      </p>

                      {item.article && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#dc2626] hover:underline pt-0.5">
                          <span>Read Story</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]/50 text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[#dc2626] transition-colors inline-flex items-center justify-center gap-1 py-1"
              >
                <span>View all notifications</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* REALTIME TOAST POPUP */}
      {activeToast && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-full animate-slide-up shadow-2xl">
          <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[#dc2626]/30 dark:border-red-800 text-[var(--text-primary)] flex items-start gap-3 backdrop-blur-md">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-[#dc2626] dark:bg-red-950 dark:text-red-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#dc2626]">
                  Live Notification
                </span>
                <button
                  onClick={dismissToast}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="font-headline font-bold text-sm leading-tight">
                {activeToast.title}
              </div>

              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {activeToast.message}
              </p>

              {activeToast.article?.slug && (
                <div className="pt-1.5">
                  <Link
                    href={`/news/${activeToast.article.slug}`}
                    onClick={dismissToast}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[11px] font-semibold transition-colors"
                  >
                    <span>Read Article</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
