// supabase/functions/invite-member/index.ts
// Sends an org member invitation email.
// - New users  → Supabase auth.admin.inviteUserByEmail (magic link in email)
// - Existing users → generateLink (magic link) + Resend API (custom HTML email)
//
// Required secrets:  SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Optional secrets:  APP_URL (prod URL, defaults to localhost:5173)
//                    RESEND_API_KEY (required for existing-user emails)
//                    EMAIL_FROM ("Name <addr>" – must be verified in Resend dashboard)

declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respond(body: object, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
}

function inviteEmailHtml(opts: {
    orgName: string;
    role: string;
    inviterEmail: string;
    actionUrl: string;
    appUrl: string;
}) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#c0392b;padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">You've been invited</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
        <strong>${opts.inviterEmail}</strong> has invited you to join <strong>${opts.orgName}</strong>
        as a <strong>${opts.role}</strong>.
      </p>
      <p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.6;">
        Click the button below to accept the invitation and access the workspace.
        This link expires in 7 days.
      </p>
      <a href="${opts.actionUrl}"
         style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:15px;font-weight:600;">
        Accept Invitation
      </a>
      <p style="margin:28px 0 0;color:#9ca3af;font-size:12px;">
        Or copy this link: <a href="${opts.actionUrl}" style="color:#c0392b;word-break:break-all;">${opts.actionUrl}</a>
      </p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #f3f4f6;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">
        If you weren't expecting this invitation, you can ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendViaResend(opts: {
    to: string;
    subject: string;
    html: string;
    from: string;
    resendKey: string;
}): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${opts.resendKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: opts.from,
            to: [opts.to],
            subject: opts.subject,
            html: opts.html,
        }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: (body as any).message ?? `Resend error ${res.status}` };
    }
    return { ok: true };
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return respond({ error: 'Unauthorized' }, 401);

        const { email, role, permissions, orgId, invitationId } = await req.json();
        if (!email || !role || !orgId || !invitationId) {
            return respond({ error: 'email, role, orgId, and invitationId are required' }, 400);
        }

        // Verify caller session
        const callerClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
        if (callerErr || !caller) return respond({ error: 'Invalid session' }, 401);

        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Verify caller is org owner or admin
        const { data: orgRow } = await adminClient
            .from('organizations')
            .select('id, name, owner_id')
            .eq('id', orgId)
            .single();
        if (!orgRow) return respond({ error: 'Organization not found' }, 404);

        const isOwner = orgRow.owner_id === caller.id;
        if (!isOwner) {
            const { data: callerMember } = await adminClient
                .from('organization_members')
                .select('role')
                .eq('org_id', orgId)
                .eq('user_id', caller.id)
                .eq('status', 'active')
                .single();
            if (!callerMember || callerMember.role !== 'admin') {
                return respond({ error: 'Only org admins can send invitations' }, 403);
            }
        }

        // Fetch invitation token
        const { data: invitation } = await adminClient
            .from('invitations')
            .select('token')
            .eq('id', invitationId)
            .single();
        if (!invitation) return respond({ error: 'Invitation not found' }, 404);

        const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';
        const redirectTo = `${appUrl}?invite_token=${invitation.token}`;

        // ── Step 1: try inviteUserByEmail (works for new users) ──────────────────
        const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
            email.toLowerCase(),
            {
                redirectTo,
                data: {
                    invite_token: invitation.token,
                    org_name: orgRow.name,
                    org_id: orgId,
                    invited_role: role,
                },
            }
        );

        if (!inviteErr) {
            // New user — Supabase sent the invite email
            return respond({ success: true, emailSent: true, method: 'supabase_invite' });
        }

        // If the error is NOT "already registered", it's unexpected
        const alreadyRegistered =
            inviteErr.message.toLowerCase().includes('already registered') ||
            inviteErr.message.toLowerCase().includes('already been registered') ||
            inviteErr.message.toLowerCase().includes('user already registered');

        if (!alreadyRegistered) {
            console.error('inviteUserByEmail unexpected error:', inviteErr.message);
            return respond({ error: inviteErr.message }, 500);
        }

        // ── Step 2: existing user — generate magic link + send via Resend ────────
        const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email: email.toLowerCase(),
            options: { redirectTo },
        });

        if (linkErr || !linkData?.properties?.action_link) {
            console.error('generateLink error:', linkErr?.message);
            return respond({ error: linkErr?.message ?? 'Failed to generate magic link' }, 500);
        }

        const actionLink = linkData.properties.action_link as string;
        const resendKey = Deno.env.get('RESEND_API_KEY');

        if (!resendKey) {
            // No email service — invite link still works via the admin copy-link UI
            return respond({ success: true, emailSent: false, note: 'RESEND_API_KEY not set; share the invite link manually' });
        }

        const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'Auctave ERP <onboarding@resend.dev>';
        const html = inviteEmailHtml({
            orgName: orgRow.name,
            role,
            inviterEmail: caller.email ?? 'your team admin',
            actionUrl: actionLink,
            appUrl,
        });

        const { ok, error: sendErr } = await sendViaResend({
            to: email.toLowerCase(),
            subject: `You've been invited to join ${orgRow.name}`,
            html,
            from: emailFrom,
            resendKey,
        });

        if (!ok) {
            console.error('Resend error:', sendErr);
            return respond({ error: `Email delivery failed: ${sendErr}` }, 500);
        }

        return respond({ success: true, emailSent: true, method: 'resend_magic_link' });
    } catch (err: any) {
        console.error('Unhandled error:', err);
        return respond({ error: err.message ?? 'Internal server error' }, 500);
    }
});
