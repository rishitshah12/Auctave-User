import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationCategory =
    | 'rfq'       // Quote / RFQ activity
    | 'crm'       // CRM order + task updates
    | 'order'     // Order submission / status
    | 'shipment'  // Shipment dispatched / delayed / delivered
    | 'chat'      // New messages
    | 'qc'        // QC passed / failed
    | 'invoice'   // Invoice uploaded
    | 'payment'   // Payment received / overdue
    | 'task'      // Task assigned / completed
    | 'approval'  // Approval requested / granted
    | 'system';   // System / admin alerts

export interface AppNotification {
    id: string;
    category: NotificationCategory;
    title: string;
    message: string;
    timestamp: string;   // ISO string (maps to created_at in DB)
    isRead: boolean;
    imageUrl?: string;
    meta?: string;
    action?: {
        page: string;
        data?: any;
    };
}

type NotificationInput = Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>;
type ChangeHandler = (notifications: AppNotification[]) => void;

// ─── DB row ↔ AppNotification ─────────────────────────────────────────────────

function fromRow(row: Record<string, any>): AppNotification {
    return {
        id: row.id,
        category: row.category as NotificationCategory,
        title: row.title,
        message: row.message,
        timestamp: row.created_at,
        isRead: row.is_read,
        imageUrl: row.image_url ?? undefined,
        meta: row.meta ?? undefined,
        action: row.action_page
            ? { page: row.action_page, data: row.action_data ?? undefined }
            : undefined,
    };
}

function toRow(userId: string, data: NotificationInput): Record<string, any> {
    return {
        user_id: userId,
        category: data.category,
        title: data.title,
        message: data.message,
        meta: data.meta ?? null,
        image_url: data.imageUrl ?? null,
        action_page: data.action?.page ?? null,
        action_data: data.action?.data ?? null,
    };
}

// ─── Service ──────────────────────────────────────────────────────────────────

class NotificationService {
    private channel: RealtimeChannel | null = null;
    private handlers = new Set<ChangeHandler>();
    private cache: AppNotification[] = [];
    private userId: string | null = null;
    private _suppressRealtimeSoundCount = 0;

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    /** Call this as soon as the authenticated user is known. */
    async init(userId: string): Promise<void> {
        if (this.userId === userId && this.channel) return;
        await this.teardown();
        this.userId = userId;

        // Initial load
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[Notifications] initial fetch error:', error);
        } else {
            this.cache = (data ?? []).map(fromRow);
            this.emit();
        }

        // Realtime subscription — one channel, three events
        this.channel = supabase
            .channel(`notif:${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const n = fromRow(payload.new as Record<string, any>);
                    // Skip if already in cache (optimistic insertion)
                    if (this.cache.some(x => x.id === n.id)) return;
                    this.cache = [n, ...this.cache].slice(0, 100);
                    this.emit();
                    this.fireBrowserNotification(n);
                    // Play sound only if not triggered by a local add() call
                    if (this._suppressRealtimeSoundCount > 0) {
                        this._suppressRealtimeSoundCount--;
                    } else {
                        this.playNotificationSound();
                    }
                },
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const n = fromRow(payload.new as Record<string, any>);
                    this.cache = this.cache.map(x => x.id === n.id ? n : x);
                    this.emit();
                },
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
                (payload) => {
                    const id = (payload.old as { id: string }).id;
                    this.cache = this.cache.filter(x => x.id !== id);
                    this.emit();
                },
            )
            .subscribe((status, err) => {
                if (err) console.error('[Notifications] realtime error:', err);
            });
    }

    /** Call when the user logs out. */
    async teardown(): Promise<void> {
        if (this.channel) {
            await supabase.removeChannel(this.channel);
            this.channel = null;
        }
        this.userId = null;
        this.cache = [];
        this.emit();
    }

    // ── Subscription ───────────────────────────────────────────────────────────

    subscribe(handler: ChangeHandler): () => void {
        this.handlers.add(handler);
        // Immediately push current cache so the subscriber hydrates
        handler([...this.cache]);
        return () => this.handlers.delete(handler);
    }

    getCache(): AppNotification[] {
        return [...this.cache];
    }

    private emit() {
        const snapshot = [...this.cache];
        this.handlers.forEach(h => h(snapshot));
    }

    // ── CRUD ───────────────────────────────────────────────────────────────────

    /** Add a notification. Optimistically updates UI; persists to DB async. */
    async add(data: NotificationInput): Promise<void> {
        if (!this.userId) return;

        // Optimistic insertion with a temporary ID
        const tempId = `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const optimistic: AppNotification = {
            ...data,
            id: tempId,
            isRead: false,
            timestamp: new Date().toISOString(),
        };
        this.cache = [optimistic, ...this.cache].slice(0, 100);
        this.emit();
        this.playNotificationSound();
        this._suppressRealtimeSoundCount++;

        const { data: row, error } = await supabase
            .from('notifications')
            .insert(toRow(this.userId, data))
            .select()
            .single();

        if (error) {
            console.error('[Notifications] insert error:', error);
            // Keep optimistic entry so the user still sees something
            return;
        }

        // Swap temp entry with persisted row (realtime may have already done this)
        const real = fromRow(row);
        const alreadyReal = this.cache.some(x => x.id === real.id);
        if (alreadyReal) {
            this.cache = this.cache.filter(x => x.id !== tempId);
        } else {
            this.cache = this.cache.map(x => x.id === tempId ? real : x);
        }
        this.emit();
    }

    async markRead(id: string): Promise<void> {
        // Optimistic
        this.cache = this.cache.map(n => n.id === id ? { ...n, isRead: true } : n);
        this.emit();
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }

    async markAllRead(): Promise<void> {
        if (!this.userId) return;
        // Optimistic
        this.cache = this.cache.map(n => ({ ...n, isRead: true }));
        this.emit();
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', this.userId)
            .eq('is_read', false);
    }

    async remove(id: string): Promise<void> {
        this.cache = this.cache.filter(n => n.id !== id);
        this.emit();
        await supabase.from('notifications').delete().eq('id', id);
    }

    async clearAll(): Promise<void> {
        if (!this.userId) return;
        this.cache = [];
        this.emit();
        await supabase.from('notifications').delete().eq('user_id', this.userId);
    }

    // ── Browser / Push Notifications ───────────────────────────────────────────

    /** Ask for browser notification permission. Returns the resulting permission state. */
    async requestPermission(): Promise<NotificationPermission> {
        if (typeof Notification === 'undefined') return 'denied';
        if (Notification.permission !== 'default') return Notification.permission;
        return Notification.requestPermission();
    }

    /** Register a Web Push subscription and persist it so Edge Functions can send pushes. */
    async registerPushSubscription(vapidPublicKey: string): Promise<void> {
        if (!this.userId) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const existing = await registration.pushManager.getSubscription();
            const sub = existing ?? await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
            });

            const json = sub.toJSON();
            if (!json.keys) return;

            await supabase.from('push_subscriptions').upsert({
                user_id: this.userId,
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth_key: json.keys.auth,
                user_agent: navigator.userAgent,
            }, { onConflict: 'endpoint' });
        } catch (err) {
            console.error('[Notifications] push subscription error:', err);
        }
    }

    /** Play a subtle marimba-style notification (A4 → D5) with the characteristic 4th harmonic. */
    private playNotificationSound(): void {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx() as AudioContext;
            const master = ctx.createGain();
            master.gain.value = 0.65;
            master.connect(ctx.destination);
            const now = ctx.currentTime;

            const marimba = (freq: number, t: number) => {
                // Marimba bars resonate strongly at the 4th harmonic (2 octaves up)
                const addPartial = (f: number, amp: number, decay: number) => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = f;
                    osc.connect(g);
                    g.connect(master);
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(amp, t + 0.014); // soft mallet attack
                    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
                    osc.start(t);
                    osc.stop(t + decay + 0.05);
                };

                addPartial(freq,      0.28, 0.55); // fundamental — warm, long
                addPartial(freq * 4,  0.14, 0.22); // 4th harmonic — the marimba signature
                addPartial(freq * 2,  0.04, 0.18); // 2nd harmonic — very subtle body
            };

            // Perfect fourth interval — calm and harmonious
            marimba(440, now);          // A4
            marimba(587, now + 0.135);  // D5

            setTimeout(() => ctx.close().catch(() => {}), 1000);
        } catch { /* Web Audio not available */ }

        // Soft double-tap haptic to match the two-note feel
        try {
            if ('vibrate' in navigator) navigator.vibrate([35, 90, 35]);
        } catch { /* Vibration API not available */ }
    }

    /** Show a native browser notification (only when the app is not in focus). */
    private fireBrowserNotification(notif: AppNotification): void {
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;
        if (document.visibilityState === 'visible') return; // App is focused — no need

        const opts: NotificationOptions & { renotify?: boolean; data?: any } = {
            body: notif.message,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: notif.category,
            renotify: true,
            data: { notifId: notif.id },
        };

        const showViaAPI = () => {
            try {
                const n = new Notification(notif.title, opts);
                n.onclick = () => { window.focus(); n.close(); };
            } catch { /* Safari may throw */ }
        };

        // Prefer service worker showNotification — required in Chrome when a SW is active,
        // and more reliable on mobile browsers.
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration()
                .then(reg => {
                    if (reg) {
                        reg.showNotification(notif.title, opts).catch(showViaAPI);
                    } else {
                        showViaAPI();
                    }
                })
                .catch(showViaAPI);
        } else {
            showViaAPI();
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = window.atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Singleton — shared across the whole app
export const notificationService = new NotificationService();
