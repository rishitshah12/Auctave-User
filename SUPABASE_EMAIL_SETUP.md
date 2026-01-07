# Supabase Email Configuration Fix

## The "Failed to fetch" Error

This error occurs because Supabase email confirmation is not properly configured. Follow these steps:

## Steps to Fix:

### 1. Check Email Confirmation Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `nhvbnfpzykdokqcnljth`
3. Navigate to **Authentication** → **Settings** (in the left sidebar)

### 2. Enable Email Confirmations

Under **Email Auth**:
- ✅ **Enable email confirmations** should be **checked** (ON)
- If it's OFF, users are auto-confirmed and don't need email verification

**For your use case:** You can actually **disable** email confirmations for now since you want automatic login. This will make the flow simpler.

### 3. Configure Email Provider

You have two options:

#### Option A: Use Built-in Email Service (Recommended for Testing)
Supabase provides 3 free emails per hour for testing.

1. Stay on **Authentication** → **Email Templates**
2. The "Confirm signup" template should be there
3. No additional configuration needed

#### Option B: Configure Custom SMTP (For Production)
If you need more than 3 emails/hour:

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Configure your SMTP provider (e.g., SendGrid, Mailgun, AWS SES)

### 4. Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add these URLs to **Redirect URLs**:
   ```
   http://localhost:5173
   http://localhost:5173/
   http://127.0.0.1:5173
   http://127.0.0.1:5173/
   ```
3. Set **Site URL** to: `http://localhost:5173`

### 5. Simplest Solution: Disable Email Confirmation

For development/testing, you can disable email confirmation entirely:

1. Go to **Authentication** → **Settings**
2. Under **Email Auth**, **uncheck** "Enable email confirmations"
3. Click **Save**

This means:
- Users are auto-confirmed immediately upon signup
- No confirmation email is sent
- The session is established right away
- User can set their password immediately

## Alternative Approach: Use Magic Link Instead

If email confirmation is causing issues, we can switch to a magic link approach:

1. Keep email confirmations **disabled**
2. User signs up with email only (no password required initially)
3. User receives a magic link
4. After clicking magic link, they're logged in and forced to create a password

Let me know which approach you prefer!
