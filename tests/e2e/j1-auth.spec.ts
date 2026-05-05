import { test, expect } from '@playwright/test';

/**
 * J1 — New User Signup & Onboarding
 * Tests cover: login page rendering, method toggles, form elements,
 * admin toggle, and redirect behavior for authenticated users.
 *
 * NOTE: These tests do NOT complete real OAuth or email flows (they would
 * require live Supabase credentials). Instead they verify the UI surfaces the
 * correct elements and that routing works as expected.
 */
test.describe('J1 — Authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // run unauthenticated

  test('login page renders user/admin toggle and Google button', async ({ page }) => {
    await page.goto('/login');

    // User/admin toggle
    await expect(page.getByTestId('login-type-user-toggle')).toBeVisible();
    await expect(page.getByTestId('login-type-admin-toggle')).toBeVisible();

    // Google sign-in
    await expect(page.getByTestId('google-signin-button')).toBeVisible();
  });

  test('email/phone sub-toggle switches the form', async ({ page }) => {
    await page.goto('/login');

    // Default is email
    await expect(page.getByTestId('login-email-input')).toBeVisible();

    // Switch to phone
    await page.getByTestId('method-phone-button').click();
    await expect(page.getByTestId('phone-input')).toBeVisible();
    await expect(page.getByTestId('country-code-select')).toBeVisible();
    await expect(page.getByTestId('send-otp-button')).toBeVisible();

    // Switch back to email
    await page.getByTestId('method-email-button').click();
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('send-verification-link-button')).toBeVisible();
  });

  test('admin toggle reveals password field', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('login-type-admin-toggle').click();
    await expect(page.getByTestId('admin-password-input')).toBeVisible();
    await expect(page.getByTestId('admin-signin-button')).toBeVisible();
    await expect(page.getByTestId('toggle-password-visibility-button')).toBeVisible();
  });

  test('password visibility toggle works', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-type-admin-toggle').click();

    const passwordInput = page.getByTestId('admin-password-input');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByTestId('toggle-password-visibility-button').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await page.getByTestId('toggle-password-visibility-button').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('send verification link button is present and submit-type', async ({ page }) => {
    await page.goto('/login');
    const btn = page.getByTestId('send-verification-link-button');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute('type', 'submit');
  });

});

// Separate describe so it inherits the saved auth state (not the cleared one above)
test.describe('J1 — Auth redirect', () => {
  test('authenticated user can access protected pages without redirect to login', async ({ page }) => {
    await page.goto('/sourcing');
    await page.waitForLoadState('networkidle');
    // If auth is broken, the app would redirect back to /login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 12_000 });
  });
});
