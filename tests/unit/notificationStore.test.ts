import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal in-memory replica of the notification store logic from
// NotificationContext.tsx — tests the pure business rules without React.
// ---------------------------------------------------------------------------

type NotificationCategory = 'rfq' | 'crm' | 'order' | 'system';

interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const MAX_NOTIFICATIONS = 50;

function makeNotification(
  overrides: Partial<AppNotification> = {},
): AppNotification {
  return {
    id: Math.random().toString(36).slice(2),
    category: 'rfq',
    title: 'Test notification',
    body: 'Body text',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

class NotificationStore {
  private items: AppNotification[] = [];

  add(n: AppNotification) {
    this.items = [n, ...this.items].slice(0, MAX_NOTIFICATIONS);
  }

  markAllRead() {
    this.items = this.items.map(n => ({ ...n, read: true }));
  }

  markRead(id: string) {
    this.items = this.items.map(n => n.id === id ? { ...n, read: true } : n);
  }

  remove(id: string) {
    this.items = this.items.filter(n => n.id !== id);
  }

  clearAll() {
    this.items = [];
  }

  getAll() { return this.items; }

  getUnreadCount() { return this.items.filter(n => !n.read).length; }

  filterByCategory(cat: NotificationCategory | 'all') {
    if (cat === 'all') return this.items;
    return this.items.filter(n => n.category === cat);
  }
}

// ---------------------------------------------------------------------------

describe('NotificationStore', () => {
  let store: NotificationStore;

  beforeEach(() => {
    store = new NotificationStore();
  });

  it('adds a notification and increments unread count', () => {
    store.add(makeNotification());
    expect(store.getAll()).toHaveLength(1);
    expect(store.getUnreadCount()).toBe(1);
  });

  it('prepends newer notifications (most-recent first)', () => {
    const first = makeNotification({ title: 'First' });
    const second = makeNotification({ title: 'Second' });
    store.add(first);
    store.add(second);
    expect(store.getAll()[0].title).toBe('Second');
  });

  it('enforces max 50 notifications, pruning oldest', () => {
    for (let i = 0; i < 55; i++) store.add(makeNotification({ title: `n${i}` }));
    expect(store.getAll()).toHaveLength(50);
    // Most-recent 50 are kept — the last added is at index 0
    expect(store.getAll()[0].title).toBe('n54');
  });

  it('markAllRead sets every item to read=true', () => {
    store.add(makeNotification());
    store.add(makeNotification());
    store.markAllRead();
    expect(store.getUnreadCount()).toBe(0);
    store.getAll().forEach(n => expect(n.read).toBe(true));
  });

  it('markRead only marks the targeted notification', () => {
    const a = makeNotification({ id: 'aaa' });
    const b = makeNotification({ id: 'bbb' });
    store.add(a);
    store.add(b);
    store.markRead('aaa');
    expect(store.getAll().find(n => n.id === 'aaa')?.read).toBe(true);
    expect(store.getAll().find(n => n.id === 'bbb')?.read).toBe(false);
  });

  it('remove deletes the correct notification', () => {
    const n = makeNotification({ id: 'del-me' });
    store.add(n);
    store.add(makeNotification());
    store.remove('del-me');
    expect(store.getAll().find(x => x.id === 'del-me')).toBeUndefined();
    expect(store.getAll()).toHaveLength(1);
  });

  it('clearAll empties the store', () => {
    store.add(makeNotification());
    store.add(makeNotification());
    store.clearAll();
    expect(store.getAll()).toHaveLength(0);
  });

  it('filterByCategory returns only matching items', () => {
    store.add(makeNotification({ category: 'rfq' }));
    store.add(makeNotification({ category: 'crm' }));
    store.add(makeNotification({ category: 'rfq' }));

    expect(store.filterByCategory('rfq')).toHaveLength(2);
    expect(store.filterByCategory('crm')).toHaveLength(1);
    expect(store.filterByCategory('order')).toHaveLength(0);
    expect(store.filterByCategory('all')).toHaveLength(3);
  });

  it('unread count decrements when a notification is removed', () => {
    const n = makeNotification({ id: 'x', read: false });
    store.add(n);
    expect(store.getUnreadCount()).toBe(1);
    store.remove('x');
    expect(store.getUnreadCount()).toBe(0);
  });
});
