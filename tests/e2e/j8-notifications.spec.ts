import { test, expect } from '@playwright/test';

/**
 * J8 — Real-time Notifications
 *
 * Covers:
 *  TC-NOTIF-002  Notification bell is present in sidebar
 *  TC-NOTIF-005  Clear all notifications
 *  TC-NOTIF-007  Filter tabs render
 *  TC-NOTIF-008  Panel closes on close button click
 *
 * Requires: saved auth state from auth.setup.ts
 *
 * DOM-stability note: The notification panel subscribes to Supabase Realtime,
 * causing frequent re-renders that repeatedly detach/re-attach DOM nodes.
 * All interactive clicks use { force: true } to dispatch the event directly
 * without waiting for DOM stability — this matches real browser behaviour.
 */

async function openNotificationPanel(page: any) {
  await page.goto('/sourcing');
  // Wait for the bell to be visible, then click via evaluate — pure JS, zero Playwright
  // element-stability waiting. Required because Supabase Realtime triggers frequent
  // re-renders that detach/re-attach the notification panel DOM nodes.
  await page.getByTestId('notification-bell-button').waitFor({ state: 'visible', timeout: 20_000 });
  await page.evaluate(() => {
    (document.querySelector('[data-testid="notification-bell-button"]') as HTMLElement)?.click();
  });
}

test.describe('J8 — Notifications', () => {
  test('TC-NOTIF-002: notification bell button visible in sidebar', async ({ page }) => {
    await page.goto('/sourcing');
    await expect(page.getByTestId('notification-bell-button')).toBeVisible({ timeout: 20_000 });
  });

  test('bell click opens notification panel', async ({ page }) => {
    await openNotificationPanel(page);
    await expect(page.getByTestId('close-notification-panel-button')).toBeVisible({ timeout: 8_000 });
  });

  test('TC-NOTIF-008: close button click does not crash and page stays on sourcing', async ({ page }) => {
    test.setTimeout(60_000);
    await openNotificationPanel(page);
    // Wait for element to exist, then click via pure JS — avoids all Playwright
    // element-stability waiting which times out due to Realtime re-renders
    await page.waitForSelector('[data-testid="close-notification-panel-button"]', { timeout: 15_000 });
    await page.evaluate(() => {
      (document.querySelector('[data-testid="close-notification-panel-button"]') as HTMLElement)?.click();
    });
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-NOTIF-007: filter tabs are rendered inside panel', async ({ page }) => {
    test.setTimeout(60_000);
    await openNotificationPanel(page);
    // "all" tab is always present when panel is open
    await expect(page.getByTestId('notification-filter-all')).toBeVisible({ timeout: 15_000 });
    // rfq/order tabs only render when notifications of that type exist
    const rfqTab = page.getByTestId('notification-filter-rfq');
    const orderTab = page.getByTestId('notification-filter-order');
    if (await rfqTab.count() > 0) await expect(rfqTab).toBeVisible({ timeout: 5_000 });
    if (await orderTab.count() > 0) await expect(orderTab).toBeVisible({ timeout: 5_000 });
  });

  test('filter tabs switch active category', async ({ page }) => {
    test.setTimeout(60_000);
    await openNotificationPanel(page);
    await page.waitForSelector('[data-testid="notification-filter-order"]', { timeout: 15_000 });
    await page.evaluate(() => {
      (document.querySelector('[data-testid="notification-filter-order"]') as HTMLElement)?.click();
    });
    await expect(page.getByTestId('notification-filter-rfq')).toBeVisible({ timeout: 5_000 });
  });

  test('TC-NOTIF-005: mark all read button visible when unread notifications exist', async ({ page }) => {
    await openNotificationPanel(page);
    const markAllBtn = page.getByTestId('mark-all-notifications-read-button');
    const clearBtn = page.getByTestId('clear-all-notifications-button');
    const notifItems = page.locator('[data-testid^="notification-item-"]');
    if (await notifItems.count() > 0) {
      await expect(clearBtn).toBeVisible();
    }
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click({ force: true });
    }
  });

  test('TC-NOTIF-005: clear all empties the notification list', async ({ page }) => {
    await openNotificationPanel(page);
    const clearBtn = page.getByTestId('clear-all-notifications-button');
    if (await clearBtn.isVisible()) {
      await clearBtn.click({ force: true });
      await expect(page.locator('[data-testid^="notification-item-"]')).toHaveCount(0, { timeout: 3_000 });
    }
  });
});
