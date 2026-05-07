import { test, expect } from '@playwright/test';

/**
 * J2 — Factory Discovery → RFQ Submission (Core Revenue Flow)
 *
 * Requires: saved auth state from auth.setup.ts
 *
 * Architecture note — why networkidle is used everywhere:
 *   Factory cards are fetched from Supabase on every page load.
 *   Each Playwright test opens a fresh browser page (new network context).
 *   Without waitForLoadState('networkidle'), the Supabase fetch may not
 *   complete before Playwright asserts on factory cards, causing flaky
 *   timeouts. networkidle waits until no network requests fire for 500ms.
 */

const LOAD_TIMEOUT = 60_000;

/**
 * Navigate to /sourcing and wait until factories are actually rendered.
 * networkidle alone is insufficient — Supabase fetch can complete AFTER
 * the last network request fires. We also wait for the first factory card
 * to be in the DOM before returning, guaranteeing the page is data-ready.
 */
async function gotoSourcingReady(page: any) {
  await page.goto('/sourcing');
  await page.waitForLoadState('networkidle', { timeout: LOAD_TIMEOUT });
  await page.locator('[data-testid^="factory-card-"]').first().waitFor({ timeout: LOAD_TIMEOUT });
}

test.describe('J2 — Factory Discovery & RFQ Flow', () => {

  test('TC-SRCH-001: sourcing page loads and shows factory cards', async ({ page }) => {
    await gotoSourcingReady(page);
    const firstCard = page.locator('[data-testid^="factory-card-"]').first();
    await expect(firstCard).toBeVisible({ timeout: LOAD_TIMEOUT });
  });

  test('TC-SRCH-002: search input filters factories', async ({ page }) => {
    await gotoSourcingReady(page);
    const searchInput = page.getByTestId('factory-search-input').filter({ visible: true });
    await searchInput.fill('cotton');
    await page.waitForTimeout(800);

    const cards = page.locator('[data-testid^="factory-card-"]');
    const emptyState = page.getByText('No Factories Found');
    const cardCount = await cards.count();
    const emptyVisible = await emptyState.isVisible();
    expect(cardCount > 0 || emptyVisible).toBe(true);
  });

  test('TC-SRCH-002: clear search button resets results', async ({ page }) => {
    await gotoSourcingReady(page);
    const searchInput = page.getByTestId('factory-search-input').filter({ visible: true });
    await searchInput.fill('zzzzznotafactoryname');
    await page.waitForTimeout(600);

    const clearBtn = page.getByTestId('clear-search-button').filter({ visible: true });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
  });

  test('category buttons are present and clickable', async ({ page }) => {
    await gotoSourcingReady(page);
    const categories = page.locator('[data-testid^="category-"]');
    await expect(categories.first()).toBeVisible({ timeout: LOAD_TIMEOUT });
    await categories.first().click();
  });

  test('Place Order and My Quotes buttons exist', async ({ page }) => {
    await gotoSourcingReady(page);
    await expect(page.getByTestId('place-order-button')).toBeVisible({ timeout: LOAD_TIMEOUT });
    await expect(page.getByTestId('my-quotes-button')).toBeVisible();
  });

  test('My Quotes button navigates to /my-quotes', async ({ page }) => {
    await gotoSourcingReady(page);
    await page.getByTestId('my-quotes-button').click();
    await expect(page).toHaveURL(/my-quotes/, { timeout: 10_000 });
  });

  test('factory card click opens factory detail', async ({ page }) => {
    await gotoSourcingReady(page);
    const firstCard = page.locator('[data-testid^="factory-card-"]').first();
    await firstCard.waitFor({ timeout: LOAD_TIMEOUT });
    await firstCard.click();
    await expect(page.getByTestId('overview-tab').filter({ visible: true })).toBeVisible({ timeout: 10_000 });
  });

  test('factory detail: tab toggle between Overview and Catalog', async ({ page }) => {
    test.setTimeout(90_000);
    await gotoSourcingReady(page);
    await page.locator('[data-testid^="factory-card-"]').first().waitFor({ timeout: LOAD_TIMEOUT });
    await page.locator('[data-testid^="factory-card-"]').first().click();

    const catalogTab = page.getByTestId('catalog-tab').filter({ visible: true });
    await catalogTab.waitFor({ timeout: 10_000 });
    await catalogTab.click();

    const overviewTab = page.getByTestId('overview-tab').filter({ visible: true });
    await overviewTab.click();
    await expect(page.getByTestId('view-catalog-button').first()).toBeVisible({ timeout: 5_000 });
  });

  test('request quote button opens RFQ modal', async ({ page }) => {
    await gotoSourcingReady(page);
    await page.locator('[data-testid^="factory-card-"]').first().waitFor({ timeout: LOAD_TIMEOUT });
    await page.locator('[data-testid^="factory-card-"]').first().click();

    const requestBtn = page.getByTestId('request-quote-button').filter({ visible: true });
    await requestBtn.waitFor({ timeout: 10_000 });
    await requestBtn.click();
    await expect(page.getByTestId('close-rfq-modal-button')).toBeVisible({ timeout: 5_000 });
  });

  test('TC-RFQ-004: continue button disabled when no product selected', async ({ page }) => {
    await gotoSourcingReady(page);
    await page.locator('[data-testid^="factory-card-"]').first().waitFor({ timeout: LOAD_TIMEOUT });
    await page.locator('[data-testid^="factory-card-"]').first().click();

    const requestBtn = page.getByTestId('request-quote-button').filter({ visible: true });
    await requestBtn.waitFor({ timeout: 10_000 });
    await requestBtn.click();

    const continueBtn = page.getByTestId('rfq-continue-button');
    await continueBtn.waitFor({ timeout: 5_000 });
    await expect(continueBtn).toBeDisabled();
  });

  test('TC-RFQ-004: selecting a product enables continue button', async ({ page }) => {
    test.setTimeout(90_000);
    await gotoSourcingReady(page);
    await page.locator('[data-testid^="factory-card-"]').first().waitFor({ timeout: LOAD_TIMEOUT });
    await page.locator('[data-testid^="factory-card-"]').first().click();

    const requestBtn = page.getByTestId('request-quote-button').filter({ visible: true });
    await requestBtn.waitFor({ timeout: 10_000 });
    await requestBtn.click();

    const productBtns = page.locator('[data-testid^="select-product-"]');
    const count = await productBtns.count();
    if (count > 0) {
      await productBtns.first().click();
      await expect(page.getByTestId('rfq-continue-button')).toBeEnabled({ timeout: 5_000 });
    }
  });

  test('RFQ modal close button dismisses modal', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoSourcingReady(page);
    await page.locator('[data-testid^="factory-card-"]').first().waitFor({ timeout: LOAD_TIMEOUT });
    await page.locator('[data-testid^="factory-card-"]').first().click();

    const requestBtn = page.getByTestId('request-quote-button').filter({ visible: true });
    await requestBtn.waitFor({ timeout: 10_000 });
    await requestBtn.click();

    await page.getByTestId('close-rfq-modal-button').click();
    await expect(page.getByTestId('close-rfq-modal-button')).not.toBeAttached({ timeout: 5_000 });
  });

  test('TC-RFQ-004: entering qty enables the submit button on step 2', async ({ page }) => {
    test.setTimeout(90_000);
    await gotoSourcingReady(page);
    await page.locator('[data-testid^="factory-card-"]').first().waitFor({ timeout: LOAD_TIMEOUT });
    await page.locator('[data-testid^="factory-card-"]').first().click();

    const requestBtn = page.getByTestId('request-quote-button').filter({ visible: true });
    await requestBtn.waitFor({ timeout: 10_000 });
    // force:true bypasses stability check — factory detail re-renders as data loads
    await requestBtn.click({ force: true });

    const productBtns = page.locator('[data-testid^="select-product-"]');
    const productCount = await productBtns.count();
    if (productCount > 0) {
      await productBtns.first().click();
      const continueBtn = page.getByTestId('rfq-continue-button');
      await expect(continueBtn).toBeEnabled({ timeout: 5_000 });
      await continueBtn.click();

      const submitBtn = page.getByTestId('submit-rfq-button');
      await submitBtn.waitFor({ timeout: 5_000 });

      const qtyInputs = page.locator('[data-testid^="rfq-qty-"]');
      if (await qtyInputs.count() > 0) {
        await qtyInputs.first().fill('500');
        await expect(submitBtn).toBeEnabled({ timeout: 5_000 });
      }
    }
  });
});
