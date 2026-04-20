-- ─── Notifications table ──────────────────────────────────────────────────────
-- Private, per-user notification store. Syncs in real-time across all devices.
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category    TEXT NOT NULL,          -- see NotificationCategory in notificationService.ts
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    meta        TEXT,                   -- short pill label (e.g. "Order #1234")
    image_url   TEXT,                   -- avatar / factory image
    action_page TEXT,                   -- app page to navigate to on click
    action_data JSONB,                  -- arbitrary data passed to onNavigate
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user queries ordered by recency
CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
    ON public.notifications (user_id, created_at DESC);

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS notifications_user_id_is_read_idx
    ON public.notifications (user_id, is_read)
    WHERE is_read = FALSE;

-- ─── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "users_select_own_notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

-- Users can mark their own notifications read / update them
CREATE POLICY "users_update_own_notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "users_delete_own_notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- Anyone authenticated can insert (client creates own, admin creates for any user)
-- The service role bypasses RLS anyway, so this policy only needs to cover anon/user inserts
CREATE POLICY "users_insert_own_notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ─── Enable Realtime publication ──────────────────────────────────────────────
-- Adds the table to the supabase_realtime publication so changes broadcast instantly.
-- Run this only if the table is not yet in the publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─── Push subscriptions table ─────────────────────────────────────────────────
-- Stores Web Push API subscriptions so a Supabase Edge Function can push
-- notifications to devices even when the app is in the background/closed.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth_key    TEXT NOT NULL,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_push_subs"
    ON public.push_subscriptions FOR ALL
    USING (auth.uid() = user_id);

-- ─── Auto-prune: keep at most 200 notifications per user ──────────────────────
CREATE OR REPLACE FUNCTION public.prune_old_notifications()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM public.notifications
    WHERE id IN (
        SELECT id FROM public.notifications
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        OFFSET 200
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prune_notifications
    AFTER INSERT ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.prune_old_notifications();
