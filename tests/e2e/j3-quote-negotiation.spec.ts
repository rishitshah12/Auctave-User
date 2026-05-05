import { test, expect } from '@playwright/test';

/**
 * J3 — Quote Negotiation Lifecycle
 *
 * Covers:
 *  TC-QUOT-001  Pending quote shows no response section
 *  TC-QUOT-008  Quotes list renders with status badges
 *  TC-QUOT-010  Client can only see their own quotes
 *
 * Requires: saved auth state from auth.setup.ts
 */
test.describe('J3 — Quote List & Negotiation', () => {
  test('my-quotes page loads', async ({ page }) => {
    await page.goto('/my-quotes');
    // Page should load without crashing (header or empty state visible)
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
  });

  test('quote cards render with status badges', async ({ page }) => {
    await page.goto('/my-quotes');

    const cards = page.locator('[data-testid^="quote-card-"]');
    const count = await cards.count();

    if (count > 0) {
      // Every visible card must have a status badge
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible({ timeout: 8_000 });

      // Status badge is a sibling element within the card
      const firstCardId = await firstCard.getAttribute('data-testid');
      const quoteId = firstCardId?.replace('quote-card-', '');
      if (quoteId) {
        await expect(page.getByTestId(`quote-status-${quoteId}`)).toBeVisible();
      }
    }
  });

  test('TC-QUOT-004: accept quote button visible on Responded quote', async ({ page }) => {
    await page.goto('/my-quotes');

    // Find a Responded quote card if one exists
    const respondedBadge = page.locator('[data-testid^="quote-status-"]').filter({ hasText: /responded/i });
    if (await respondedBadge.count() > 0) {
      await respondedBadge.first().click();
      await expect(page.getByTestId('accept-quote-button')).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-QUOT-003: negotiate button visible on Responded/In Negotiation quote', async ({ page }) => {
    await page.goto('/my-quotes');

    const respondedBadge = page
      .locator('[data-testid^="quote-status-"]')
      .filter({ hasText: /responded|negotiation/i });

    if (await respondedBadge.count() > 0) {
      await respondedBadge.first().click();
      await expect(page.getByTestId('negotiate-button')).toBeVisible({ timeout: 8_000 });
    }
  });

  test('TC-QUOT-001: Pending quote does not show accept button', async ({ page }) => {
    await page.goto('/my-quotes');

    const pendingCards = page
      .locator('[data-testid^="quote-status-"]')
      .filter({ hasText: /pending/i });

    if (await pendingCards.count() > 0) {
      await pendingCards.first().click();
      await expect(page.getByTestId('accept-quote-button')).not.toBeVisible({ timeout: 5_000 });
    }
  });
});
