import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/fixtures/.auth/user.json';

/**
 * Auth setup fixture — runs once before the test suite.
 * Uses email magic-link flow: injects a pre-minted Supabase session token
 * via localStorage so tests skip the actual email round-trip.
 *
 * Provide these env vars when running:
 *   TEST_USER_EMAIL   — the test user's email
 *   TEST_USER_TOKEN   — a valid Supabase access_token for that user
 *   TEST_USER_REFRESH — the matching refresh_token
 */
setup('authenticate as test user', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL ?? 'test@example.com';
  const accessToken = process.env.TEST_USER_TOKEN ?? '';
  const refreshToken = process.env.TEST_USER_REFRESH ?? '';

  if (!accessToken) {
    // No token provided — navigate to login page and pause for manual login.
    // In CI this will fail fast; locally it lets you authenticate once and
    // save the session.
    await page.goto('/login');
    await page.waitForURL(/\/(sourcing|crm|my-quotes)/, { timeout: 120_000 });
  } else {
    // Inject the Supabase session directly — skips UI login entirely.
    await page.goto('/login');
    await page.evaluate(
      ({ token, refresh, email: e }) => {
        const key = 'sb-nhvbnfpzykdokqcnljth-auth-token';
        const session = {
          access_token: token,
          refresh_token: refresh,
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: 'bearer',
          user: { email: e },
        };
        localStorage.setItem(key, JSON.stringify(session));
      },
      { token: accessToken, refresh: refreshToken, email },
    );
    await page.goto('/sourcing');
    await expect(page).toHaveURL(/\/sourcing/, { timeout: 15_000 });
  }

  // Save the full browser storage state (localStorage + cookies) to disk.
  // All test projects listed in playwright.config.ts will load this file.
  await page.context().storageState({ path: authFile });
});
