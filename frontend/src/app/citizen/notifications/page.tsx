'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { Sidebar } from '../../../../components/sidebar';
import { supabase } from '@/lib/supabase/client';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/db/notifications';
import { getCitizenCases } from '@/lib/db/cases';
import type { Database } from '@/types/supabase';
import { toast } from 'sonner';

type NotificationRow = Database['public']['Tables']['notifications']['Row'];

const sortByNewest = (rows: NotificationRow[]) =>
  [...rows].sort((a, b) => {
    const aTs = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTs = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTs - aTs;
  });

const offerLifecycleNotifications = (rows: NotificationRow[]) =>
  rows.filter((row) => {
    if (row.type === 'offer_received' || row.type === 'offer_accepted') return true;
    const title = (row.title ?? '').toLowerCase();
    const body = (row.body ?? '').toLowerCase();
    return title.includes('offer') || body.includes('offer') || title.includes('accepted') || body.includes('accepted');
  });

const getNotificationTitle = (item: NotificationRow) => {
  if (item.title) return item.title;
  if (item.type === 'offer_received') return 'New lawyer offer received';
  if (item.type === 'offer_accepted') return 'Your offer acceptance is confirmed';
  return 'Case update';
};

const getNotificationBody = (item: NotificationRow) => {
  if (item.body) return item.body;
  if (item.type === 'offer_received') return 'A lawyer has sent a new offer. Open your cases to review it.';
  if (item.type === 'offer_accepted') return 'Your selected lawyer has been notified.';
  return 'Open your case updates to continue.';
};

const formatRelativeTime = (iso: string | null) => {
  if (!iso) return 'Just now';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
};

const extractCaseId = (notification: NotificationRow) => {
  const payload = notification.data as Record<string, unknown> | null;
  const candidate = payload?.case_id ?? payload?.caseId;
  return typeof candidate === 'string' ? candidate : null;
};

const extractPipelineId = (notification: NotificationRow) => {
  const payload = notification.data as Record<string, unknown> | null;
  const candidate = payload?.pipeline_id;
  return typeof candidate === 'string' ? candidate : null;
};

export default function CitizenNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const loadOfferNotifications = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return;
    const userId = authData.user.id;

    setNotificationLoading(true);
    const [{ data, error }, { data: citizenCases, error: casesError }] = await Promise.all([
      getNotifications(userId, 100),
      getCitizenCases(userId),
    ]);

    let fallbackNotifications: NotificationRow[] = [];

    if (!casesError && citizenCases && citizenCases.length > 0) {
      const caseIds = citizenCases.map((c) => c.id);
      const caseTitleById = new Map(citizenCases.map((c) => [c.id, c.title ?? 'your case']));

      const { data: pipelineOffers } = await supabase
        .from('case_pipeline')
        .select('id, case_id, lawyer_id, offer_note, offer_sent_at, created_at, stage')
        .in('case_id', caseIds)
        .eq('stage', 'offered')
        .order('offer_sent_at', { ascending: false })
        .limit(40);

      fallbackNotifications = (pipelineOffers ?? []).map((offer) => ({
        id: `pipeline-offer-${offer.id}`,
        user_id: userId,
        type: 'offer_received',
        title: 'New lawyer offer received',
        body: offer.offer_note ? String(offer.offer_note) : `A lawyer sent an offer for ${caseTitleById.get(offer.case_id) ?? 'your case'}.`,
        data: {
          case_id: offer.case_id,
          pipeline_id: offer.id,
          lawyer_id: offer.lawyer_id,
          fallback: true,
        },
        is_read: false,
        read_at: null,
        created_at: offer.offer_sent_at ?? offer.created_at,
      })) as NotificationRow[];
    }

    setNotificationLoading(false);
    if (error) return;

    const filtered = offerLifecycleNotifications(data ?? []);
    const existingPipelineIds = new Set(filtered.map((item) => extractPipelineId(item)).filter((id): id is string => Boolean(id)));
    const merged = [
      ...filtered,
      ...fallbackNotifications.filter((item) => {
        const pipelineId = extractPipelineId(item);
        return pipelineId ? !existingPipelineIds.has(pipelineId) : true;
      }),
    ];

    const ordered = sortByNewest(merged);
    setNotifications(ordered);
    setUnreadNotificationCount(ordered.filter((row) => !row.is_read).length);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadOfferNotifications();
    }, 15000);

    return () => {
      clearInterval(timer);
    };
  }, [loadOfferNotifications]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let pipelineChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      await loadOfferNotifications();
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return;

      channel = supabase
        .channel(`notifications-live:${authData.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${authData.user.id}`,
          },
          async (payload) => {
            await loadOfferNotifications();
            if (payload.eventType === 'INSERT') {
              const notif = payload.new as Record<string, unknown>;
              if (notif.type === 'offer_received') {
                toast.info((notif.title as string) || 'New offer received!', {
                  description: (notif.body as string) || 'Open your cases to review it.',
                });
              }
            }
          }
        )
        .subscribe();

      pipelineChannel = supabase
        .channel(`pipeline-offers-live:${authData.user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'case_pipeline',
          },
          async () => {
            await loadOfferNotifications();
          }
        )
        .subscribe();
    };

    void init();

    return () => {
      if (channel) channel.unsubscribe();
      if (pipelineChannel) pipelineChannel.unsubscribe();
    };
  }, [loadOfferNotifications]);

  const handleMarkAllRead = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return;

    await markAllNotificationsRead(authData.user.id);
    setNotifications((prev) => prev.map((row) => ({ ...row, is_read: true })));
    setUnreadNotificationCount(0);
  };

  const handleNotificationClick = async (notification: NotificationRow) => {
    await markNotificationRead(notification.id);
    setNotifications((prev) =>
      prev.map((row) => (row.id === notification.id ? { ...row, is_read: true } : row))
    );
    setUnreadNotificationCount((prev) => Math.max(prev - 1, 0));

    const caseId = extractCaseId(notification);
    if (caseId) {
      router.push(`/citizen/cases?caseId=${caseId}`);
      return;
    }

    router.push('/citizen/cases');
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0f1e3f] transition-colors duration-300">
      <div className="hidden md:block md:sticky md:top-0 md:h-screen shrink-0 z-[1000]">
        <Sidebar />
      </div>
      <div className="md:hidden relative z-[1000]">
        <Sidebar />
      </div>

      <main className="flex-1 max-w-[1000px] mx-auto pt-20 px-6 pb-24 md:p-8 text-gray-900 dark:text-white w-full">
        <div className="mb-6 flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-medium tracking-wide text-[#997953] dark:text-[#cdaa80] mb-2 font-serif">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-white/70 text-[15px] font-sans">
              Offer and acceptance updates for your legal cases.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NextLink
              href="/citizen/home"
              className="text-[13px] font-semibold text-[#997953] dark:text-[#e0c3a0] hover:underline"
            >
              Back to Home
            </NextLink>
            <button
              onClick={handleMarkAllRead}
              className="rounded-full border border-[#d8c1a1]/70 dark:border-[#cdaa80]/30 px-4 py-2 text-[12px] font-semibold text-[#7b5f40] dark:text-[#e0c3a0] hover:bg-[#f9f2e8] dark:hover:bg-[#1a3358] transition-colors"
            >
              Mark all read
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#d8c1a1]/60 dark:border-[#cdaa80]/20 bg-white/95 dark:bg-[#12284f]/95 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e8d7c1] dark:border-[#cdaa80]/20 flex items-center justify-between">
            <p className="text-[13px] text-[#6b5a49] dark:text-white/70">
              {unreadNotificationCount} unread
            </p>
            <NextLink
              href="/citizen/cases"
              className="text-[12px] font-semibold text-[#997953] dark:text-[#e0c3a0] hover:underline"
            >
              Open Cases
            </NextLink>
          </div>

          <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
            {notificationLoading ? (
              <div className="px-4 py-5 text-sm text-[#6b5a49] dark:text-white/70">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-5 text-sm text-[#6b5a49] dark:text-white/70">No offer notifications yet.</div>
            ) : (
              notifications.map((item) => {
                const isOffer = item.type === 'offer_received';
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      void handleNotificationClick(item);
                    }}
                    className={`w-full text-left block px-4 py-4 border-b border-[#efe1ce] dark:border-[#cdaa80]/10 hover:bg-[#f9f2e8] dark:hover:bg-[#1a3358] transition-colors ${
                      item.is_read ? 'opacity-80' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="text-[14px] font-semibold text-[#3f3124] dark:text-white/90 leading-snug">
                          {getNotificationTitle(item)}
                        </p>
                        {isOffer && (
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Action Required: Accept Offer
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#7b5f40] dark:text-white/60 whitespace-nowrap">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#6b5a49] dark:text-white/75 leading-relaxed">
                      {getNotificationBody(item)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
