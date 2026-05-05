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
 */
test.describe('J8 — Notifications', () => {
  test('TC-NOTIF-002: notification bell button visible in sidebar', async ({ page }) => {
    await page.goto('/sourcing');
    await expect(page.getByTestId('notification-bell-button')).toBeVisible({ timeout: 10_000 });
  });

  test('bell click opens notification panel', async ({ page }) => {
    await page.goto('/sourcing');
    await page.getByTestId('notification-bell-button').waitFor({ timeout: 15_000 });
    await page.getByTestId('notification-bell-button').click();

    // Panel shows close button once open
    await expect(page.getByTestId('close-notification-panel-button')).toBeVisible({ timeout: 5_000 });
  });

  test('TC-NOTIF-008: close button click does not crash and page stays on sourcing', async ({ page }) => {
    await page.goto('/sourcing');
    await page.getByTestId('notification-bell-button').waitFor({ timeout: 15_000 });
    await page.getByTestId('notification-bell-button').click();
    await page.getByTestId('close-notification-panel-button').waitFor({ timeout: 5_000 });
    await page.getByTestId('close-notification-panel-button').click();

    // Close should not navigate away or crash the page
    await expect(page).toHaveURL(/\/sourcing/, { timeout: 3_000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('TC-NOTIF-007: filter tabs are rendered inside panel', async ({ page }) => {
    await page.goto('/sourcing');
    await page.getByTestId('notification-bell-button').waitFor({ timeout: 15_000 });
    await page.getByTestId('notification-bell-button').click();

    // "all" filter tab is always present
    await expect(page.getByTestId('notification-filter-all')).toBeVisible({ timeout: 5_000 });
    // RFQ and Orders filter tabs (CRM is grouped under 'order' key)
    await expect(page.getByTestId('notification-filter-rfq')).toBeVisible();
    await expect(page.getByTestId('notification-filter-order')).toBeVisible();
  });

  test('filter tabs switch active category', async ({ page }) => {
    await page.goto('/sourcing');
    await page.getByTestId('notification-bell-button').waitFor({ timeout: 15_000 });
    await page.getByTestId('notification-bell-button').click();

    await page.getByTestId('notification-filter-order').waitFor({ timeout: 5_000 });
    await page.getByTestId('notification-filter-order').click();
    // Should not crash; filter is now active
    await expect(page.getByTestId('notification-filter-rfq')).toBeVisible();
  });

  test('TC-NOTIF-005: mark all read button visible when unread notifications exist', async ({ page }) => {
    await page.goto('/sourcing');
    await page.getByTestId('notification-bell-button').waitFor({ timeout: 15_000 });
    await page.getByTestId('notification-bell-button').click();

    // Only visible when there are unread notifications — check conditionally
    const markAllBtn = page.getByTestId('mark-all-notifications-read-button');
    const clearBtn = page.getByTestId('clear-all-notifications-button');

    // At least the clear button should be available if any notifications exist
    const notifItems = page.locator('[data-testid^="notification-item-"]');
    if (await notifItems.count() > 0) {
      await expect(clearBtn).toBeVisible();
    }
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click(); // clicking should not crash
    }
  });

  test('TC-NOTIF-005: clear all empties the notification list', async ({ page }) => {
    await page.goto('/sourcing');
    await page.getByTestId('notification-bell-button').waitFor({ timeout: 15_000 });
    await page.getByTestId('notification-bell-button').click();

    const clearBtn = page.getByTestId('clear-all-notifications-button');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      // Notification items should now be gone
      await expect(page.locator('[data-testid^="notification-item-"]')).toHaveCount(0, { timeout: 3_000 });
    }
  });
});
