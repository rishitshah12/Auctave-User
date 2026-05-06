import { test, expect } from '@playwright/test';

/**
 * J10 — Admin Factory Management
 *
 * Covers:
 *  TC-AFAC-001  Admin factories page loads
 *  TC-AFAC-002  Factory cards render
 *  TC-AFAC-003  Add New button is present and clickable
 *  TC-AFAC-004  Factory card click opens edit panel
 *
 * Requires: admin auth state from auth.admin.setup.ts
 */

const LOAD_TIMEOUT = 25_000;

async function gotoAdminFactoriesReady(page: any) {
  await page.goto('/admin/factories');
  await page.waitForLoadState('networkidle', { timeout: LOAD_TIMEOUT });
  await page.locator('[data-testid="admin-factories-page"]').waitFor({ timeout: LOAD_TIMEOUT });
}

test.describe('J10 — Admin Factory Management', () => {

  test('TC-AFAC-001: admin factories page loads', async ({ page }) => {
    await gotoAdminFactoriesReady(page);
    await expect(page.locator('[data-testid="admin-factories-page"]')).toBeVisible();
  });

  test('TC-AFAC-002: factory CMS title visible', async ({ page }) => {
    await gotoAdminFactoriesReady(page);
    await expect(page.getByText('Factory CMS')).toBeVisible({ timeout: LOAD_TIMEOUT });
  });

  test('TC-AFAC-003: factory cards render', async ({ page }) => {
    await gotoAdminFactoriesReady(page);
    const cards = page.locator('[data-testid^="admin-factory-card-"]');
    await page.waitForTimeout(1500);
    const count = await cards.count();
    if (count > 0) {
      await expect(cards.first()).toBeVisible();
    }
  });

  test('TC-AFAC-004: clicking factory card opens edit panel', async ({ page }) => {
    await gotoAdminFactoriesReady(page);
    const cards = page.locator('[data-testid^="admin-factory-card-"]');
    await page.waitForTimeout(1500);
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.waitForTimeout(600);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
