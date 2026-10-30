'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase/client';

export interface NotificationItem {
  id: string;
  user_id: string;
  article_id?: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  article?: {
    id?: string;
    slug?: string;
    title?: string;
  } | null;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  activeToast: NotificationItem | null;
  dismissToast: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  triggerTestNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  activeToast: null,
  dismissToast: () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  refreshNotifications: async () => {},
  triggerTestNotification: () => {},
});

const DEMO_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'demo-notif-1',
    user_id: 'demo-user',
    article_id: 'art-1',
    title: 'New Story: High-Speed Rail Corridor Approved',
    message: 'National infrastructure council authorizes federal funding for the 450km transit spine.',
    is_read: false,
    created_at: '2026-10-28T07:15:00.000Z',
    article: {
      slug: 'national-high-speed-rail-corridor-approved',
      title: 'National High-Speed Rail Corridor Approved',
    },
  },
  {
    id: 'demo-notif-2',
    user_id: 'demo-user',
    article_id: 'art-2',
    title: 'Article Approved & Published!',
    message: 'Your submitted story has passed editorial review and is now live on the homepage.',
    is_read: false,
    created_at: '2026-10-28T05:30:00.000Z',
    article: {
      slug: 'central-bank-monetary-policy-rate-decision',
      title: 'Central Bank Holds Monetary Policy Rate Steady',
    },
  },
  {
    id: 'demo-notif-3',
    user_id: 'demo-user',
    article_id: null,
    title: 'Welcome to What\'s Happening',
    message: 'Explore our latest coverage, bookmark stories for offline reading, and contribute articles.',
    is_read: true,
    created_at: '2026-10-27T08:00:00.000Z',
  },
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('[paste')
  );

  // Show Toast helper with auto-dismiss
  const showToast = useCallback((item: NotificationItem) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(item);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(null);
  }, []);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setNotifications(DEMO_NOTIFICATIONS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          id,
          user_id,
          article_id,
          title,
          message,
          is_read,
          created_at,
          article:articles(id, slug, title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        // Normalize relation
        const mapped = data.map((item: any) => ({
          ...item,
          article: Array.isArray(item.article) ? item.article[0] : item.article,
        }));
        setNotifications(mapped);
      } else {
        setNotifications(DEMO_NOTIFICATIONS);
      }
    } catch {
      setNotifications(DEMO_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  }, [user, isSupabaseConfigured]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Set up Supabase Realtime channel
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    const supabase = createClient();

    // Listen to real-time events on notifications table for the active user
    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotif = payload.new as NotificationItem;

          // Fetch linked article slug if article_id exists
          if (newNotif.article_id) {
            try {
              const { data: art } = await supabase
                .from('articles')
                .select('id, slug, title')
                .eq('id', newNotif.article_id)
                .single();
              if (art) {
                newNotif.article = art;
              }
            } catch {
              // Ignore lookup error
            }
          }

          setNotifications((prev) => [newNotif, ...prev]);
          showToast(newNotif);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as NotificationItem;
          setNotifications((prev) =>
            prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            setNotifications((prev) => prev.filter((item) => item.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isSupabaseConfigured, showToast]);

  // Mark single as read
  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );

    if (user && isSupabaseConfigured) {
      try {
        const supabase = createClient();
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch {
        // safe fallback
      }
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));

    if (user && isSupabaseConfigured) {
      try {
        const supabase = createClient();
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      } catch {
        // safe fallback
      }
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));

    if (user && isSupabaseConfigured) {
      try {
        const supabase = createClient();
        await supabase.from('notifications').delete().eq('id', id);
      } catch {
        // safe fallback
      }
    }
  };

  // Trigger local demo notification (for live testing)
  const triggerTestNotification = () => {
    const testItem: NotificationItem = {
      id: `test-${Date.now()}`,
      user_id: user?.id || 'demo-user',
      title: 'Breaking Story Published!',
      message: 'Exclusive: Global clean energy agreement reaches final treaty ratification.',
      is_read: false,
      created_at: new Date().toISOString(),
      article: {
        slug: 'national-high-speed-rail-corridor-approved',
        title: 'Global Clean Energy Agreement',
      },
    };

    setNotifications((prev) => [testItem, ...prev]);
    showToast(testItem);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        activeToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refreshNotifications: fetchNotifications,
        triggerTestNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
