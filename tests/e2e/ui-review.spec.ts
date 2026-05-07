import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * UI Review — Full visual + functional audit of client and admin portals.
 * Captures screenshots of every page/state and tests key interactions.
 * Run with:  npx playwright test ui-review.spec.ts --project=setup --project=chromium --headed=false
 */

const SS = (name: string) => ({ path: `tests/ui-screenshots/${name}.png` });
const LOAD = 60_000;

// ── helpers ────────────────────────────────────────────────────────────────
async function waitAndShot(page: Page, name: string, timeout = LOAD) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ ...SS(name), fullPage: true });
}

async function gotoSourcing(page: Page) {
  await page.goto('/sourcing');
  await page.locator('[data-testid^="factory-card-"]').first().waitFor({ timeout: LOAD });
  await page.waitForTimeout(500);
}

// ui-review tests can take longer than Playwright's 30s default timeout
// (full-page screenshots + multiple interactions). Set 90s per test.
const UI_REVIEW_TIMEOUT = 150_000;

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT PORTAL
// ═══════════════════════════════════════════════════════════════════════════
test.describe('CLIENT — Visual & Feature Audit', () => {

  test('C01 — Login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: LOAD });
    await page.screenshot({ ...SS('c01-login-user'), fullPage: true });

    // Toggle to admin
    const adminToggle = page.getByText('Admin').first();
    if (await adminToggle.isVisible()) {
      await adminToggle.click();
      await page.waitForTimeout(400);
      await page.screenshot({ ...SS('c01b-login-admin'), fullPage: true });
    }
  });

  test('C02 — Sourcing page (factory list)', async ({ page }) => {
    test.setTimeout(UI_REVIEW_TIMEOUT);
    await gotoSourcing(page);
    await page.screenshot({ ...SS('c02-sourcing-list'), fullPage: true });

    // Test search
    const search = page.getByTestId('factory-search-input').filter({ visible: true });
    if (await search.isVisible()) {
      await search.fill('cotton');
      await page.waitForTimeout(600);
      await page.screenshot({ ...SS('c02b-sourcing-search'), fullPage: true });
      await search.fill('');
      await page.waitForTimeout(400);
    }

    // Category filter
    const categories = page.locator('[data-testid^="category-"]');
    if (await categories.count() > 0) {
      await categories.first().click();
      await page.waitForTimeout(500);
      await page.screenshot({ ...SS('c02c-sourcing-category-filter'), fullPage: true });
    }
  });

  test('C03 — Factory detail (overview, catalog, tools tabs)', async ({ page }) => {
    test.setTimeout(UI_REVIEW_TIMEOUT);
    await gotoSourcing(page);
    await page.locator('[data-testid^="factory-card-"]').first().click();
    await page.getByTestId('overview-tab').filter({ visible: true }).waitFor({ timeout: LOAD });
    await page.waitForTimeout(600);
    await page.screenshot({ ...SS('c03a-factory-overview'), fullPage: true });

    const catalogTab = page.getByTestId('catalog-tab').filter({ visible: true });
    if (await catalogTab.isVisible()) {
      await catalogTab.click();
      await page.waitForTimeout(600);
      await page.screenshot({ ...SS('c03b-factory-catalog'), fullPage: true });
    }

    // RFQ modal
    const requestBtn = page.getByTestId('request-quote-button').filter({ visible: true });
    if (await requestBtn.isVisible()) {
      await requestBtn.click({ force: true });
      await page.waitForTimeout(500);
      await page.screenshot({ ...SS('c03c-factory-rfq-modal'), fullPage: true });
      await page.keyboard.press('Escape');
    }
  });

  test('C04 — My Quotes (quote list)', async ({ page }) => {
    await page.goto('/my-quotes');
    await waitAndShot(page, 'c04a-my-quotes-list');

    // Open first quote if exists
    const cards = page.locator('[data-testid^="quote-card-"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(800);
      await page.screenshot({ ...SS('c04b-quote-detail'), fullPage: true });
    }
  });

  test('C05 — CRM Order Tracking', async ({ page }) => {
    await page.goto('/crm');
    await page.getByTestId('crm-tab-active').waitFor({ timeout: LOAD });
    await page.waitForTimeout(600);
    await page.screenshot({ ...SS('c05a-crm-dashboard'), fullPage: true });

    // All orders tab
    const allTab = page.getByTestId('crm-tab-all');
    await allTab.click({ force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ ...SS('c05b-crm-all-orders'), fullPage: true });

    // Click first order if exists
    const orderCards = page.locator('[data-testid^="crm-order-card-"]');
    if (await orderCards.count() > 0) {
      await orderCards.first().click();
      await page.waitForTimeout(800);
      await page.screenshot({ ...SS('c05c-crm-order-detail'), fullPage: true });
    }
  });

  test('C06 — Trending Products', async ({ page }) => {
    await page.goto('/trending');
    await waitAndShot(page, 'c06-trending');
  });

  test('C07 — Notification Panel', async ({ page }) => {
    test.setTimeout(UI_REVIEW_TIMEOUT);
    // The bell renders as part of the sidebar, independently of factory card data.
    // Navigate directly and wait for the bell — no need to wait for factory cards.
    await page.goto('/sourcing');
    await page.getByTestId('notification-bell-button').waitFor({ state: 'visible', timeout: LOAD });
    await page.evaluate(() => {
      (document.querySelector('[data-testid="notification-bell-button"]') as HTMLElement)?.click();
    });
    await page.waitForTimeout(600);
    await page.screenshot({ ...SS('c07-notifications'), fullPage: true });
  });

  test('C08 — Team Settings', async ({ page }) => {
    await page.goto('/team');
    await waitAndShot(page, 'c08-team-settings');
  });

  test('C09 — Profile page', async ({ page }) => {
    await page.goto('/profile');
    await waitAndShot(page, 'c09-profile');
  });

  test('C10 — Mobile responsiveness (sourcing)', async ({ page }) => {
    test.setTimeout(UI_REVIEW_TIMEOUT);
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
    await gotoSourcing(page);
    await page.screenshot({ ...SS('c10a-mobile-sourcing'), fullPage: true });

    // Mobile factory detail
    await page.locator('[data-testid^="factory-card-"]').first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ ...SS('c10b-mobile-factory-detail'), fullPage: true });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN PORTAL
// ═══════════════════════════════════════════════════════════════════════════
test.describe('ADMIN — Visual & Feature Audit', () => {

  test('A01 — Admin Dashboard', async ({ page }) => {
    await page.goto('/admin');
    await waitAndShot(page, 'a01-admin-dashboard');
  });

  test('A02 — Admin RFQ Management', async ({ page }) => {
    await page.goto('/admin/rfq');
    await page.locator('[data-testid="admin-rfq-page"]').waitFor({ timeout: LOAD });
    await page.waitForTimeout(800);
    await page.screenshot({ ...SS('a02a-admin-rfq-list'), fullPage: true });

    // Open first quote if exists
    const cards = page.locator('[data-testid^="admin-quote-card-"]');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(800);
      await page.screenshot({ ...SS('a02b-admin-rfq-detail'), fullPage: true });
    }

    // Status filter
    const filter = page.getByTestId('admin-rfq-status-filter');
    if (await filter.isVisible()) {
      await filter.selectOption('Pending');
      await page.waitForTimeout(400);
      await page.screenshot({ ...SS('a02c-admin-rfq-filtered'), fullPage: true });
    }
  });

  test('A03 — Admin CRM', async ({ page }) => {
    await page.goto('/admin/crm');
    await page.locator('[data-testid="admin-crm-page"]').waitFor({ timeout: LOAD });
    await page.waitForTimeout(600);
    await page.screenshot({ ...SS('a03a-admin-crm'), fullPage: true });

    // Search a client
    const search = page.getByTestId('admin-crm-client-search');
    if (await search.isVisible()) {
      await search.fill('a');
      await page.waitForTimeout(600);
      await page.screenshot({ ...SS('a03b-admin-crm-search'), fullPage: true });

      // Select first result
      const result = page.locator('ul li button').first();
      if (await result.isVisible()) {
        await result.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ ...SS('a03c-admin-crm-client-orders'), fullPage: true });

        const orderCard = page.locator('[data-testid^="admin-crm-order-card-"]').first();
        if (await orderCard.count() > 0) {
          await orderCard.click();
          await page.waitForTimeout(800);
          await page.screenshot({ ...SS('a03d-admin-crm-order-detail'), fullPage: true });
        }
      }
    }
  });

  test('A04 — Admin User Management', async ({ page }) => {
    await page.goto('/admin/users');
    await page.locator('[data-testid="admin-users-page"]').waitFor({ timeout: LOAD });
    await page.waitForTimeout(800);
    await page.screenshot({ ...SS('a04a-admin-users'), fullPage: true });

    // Search
    const search = page.getByTestId('admin-users-search');
    if (await search.isVisible()) {
      await search.fill('rishit');
      await page.waitForTimeout(500);
      await page.screenshot({ ...SS('a04b-admin-users-search'), fullPage: true });
      await search.fill('');
    }

    // Open user drawer
    const userCard = page.locator('[data-testid^="admin-user-card-"]').first();
    if (await userCard.count() > 0) {
      await userCard.click({ force: true });
      await page.waitForTimeout(600);
      await page.screenshot({ ...SS('a04c-admin-user-drawer'), fullPage: true });
    }
  });

  test('A05 — Admin Factory Management', async ({ page }) => {
    await page.goto('/admin/factories');
    await page.locator('[data-testid="admin-factories-page"]').waitFor({ timeout: LOAD });
    await page.waitForTimeout(800);
    await page.screenshot({ ...SS('a05a-admin-factories'), fullPage: true });

    const card = page.locator('[data-testid^="admin-factory-card-"]').first();
    if (await card.count() > 0) {
      await card.click();
      await page.waitForTimeout(600);
      await page.screenshot({ ...SS('a05b-admin-factory-edit'), fullPage: true });
    }
  });

  test('A06 — Admin Analytics', async ({ page }) => {
    await page.goto('/admin/analytics');
    await page.locator('[data-testid="admin-analytics-page"]').waitFor({ timeout: LOAD });
    await page.waitForTimeout(1200);
    await page.screenshot({ ...SS('a06a-admin-analytics'), fullPage: true });

    // Switch date range
    const btn = page.getByRole('button').filter({ hasText: 'Last 7 days' }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ ...SS('a06b-admin-analytics-7d'), fullPage: true });
    }
  });

  test('A07 — Admin Trending CMS', async ({ page }) => {
    await page.goto('/admin/trending');
    await page.locator('[data-testid="admin-trending-page"]').waitFor({ timeout: LOAD });
    await page.waitForTimeout(800);
    await page.screenshot({ ...SS('a07-admin-trending'), fullPage: true });
  });

  test('A08 — Admin mobile responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin');
    await waitAndShot(page, 'a08a-admin-mobile-dashboard');

    await page.goto('/admin/rfq');
    await page.locator('[data-testid="admin-rfq-page"]').waitFor({ timeout: LOAD });
    await page.waitForTimeout(600);
    await page.screenshot({ ...SS('a08b-admin-mobile-rfq'), fullPage: true });
  });
});
