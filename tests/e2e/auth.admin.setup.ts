import { test as setup, expect, request } from '@playwright/test';

const authFile = 'tests/fixtures/.auth/admin.json';

/**
 * Admin auth setup fixture — runs once before all admin tests.
 * Refreshes the token before injecting so all admin tests start with a
 * guaranteed-fresh session.
 *
 * Required env vars (in .env.test):
 *   TEST_ADMIN_EMAIL   — admin account email (@auctaveexports.com)
 *   TEST_ADMIN_TOKEN   — valid Supabase access_token for that admin
 *   TEST_ADMIN_REFRESH — matching refresh_token
 */
setup('authenticate as admin', async ({ page }) => {
  const email = process.env.TEST_ADMIN_EMAIL ?? '';
  let accessToken = process.env.TEST_ADMIN_TOKEN ?? '';
  let refreshToken = process.env.TEST_ADMIN_REFRESH ?? '';

  const SUPABASE_URL = 'https://nhvbnfpzykdokqcnljth.supabase.co';
  const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';

  if (refreshToken && ANON_KEY) {
    try {
      const api = await request.newContext();
      const res = await api.post(
        `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
        {
          headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
          data: { refresh_token: refreshToken },
        },
      );
      if (res.ok()) {
        const body = await res.json();
        if (body.access_token) {
          accessToken = body.access_token;
          refreshToken = body.refresh_token;
        }
      }
      await api.dispose();
    } catch {
      // Refresh failed — proceed with existing token
    }
  }

  if (!accessToken) {
    await page.goto('/login');
    await page.waitForURL(/\/admin/, { timeout: 120_000 });
  } else {
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
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  }

  await page.context().storageState({ path: authFile });
});
