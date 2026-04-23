// supabase/functions/invite-member/index.ts
// Sends org member invitation emails via Zoho SMTP.
// - New users  → auth.admin.inviteUserByEmail  (Supabase sends the email)
// - Existing users → generateLink + Zoho SMTP
//
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//                   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME
// Optional secret:  APP_URL (production URL; defaults to localhost:5173)

declare const Deno: any;

// @ts-ignore — Deno npm: specifier, resolved at runtime
import { createClient } from 'npm:@supabase/supabase-js@2';

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

async function sendSmtpEmail({
    to, subject, html,
}: { to: string; subject: string; html: string }) {
    const host = Deno.env.get('SMTP_HOST') ?? 'smtp.zoho.com';
    const port = parseInt(Deno.env.get('SMTP_PORT') ?? '587');
    const user = Deno.env.get('SMTP_USER') ?? '';
    const pass = Deno.env.get('SMTP_PASS') ?? '';
    const fromName = Deno.env.get('SMTP_FROM_NAME') ?? 'Auctave Exports';
    const from = `${fromName} <${user}>`;

    // Encode credentials for AUTH PLAIN
    const authPlain = btoa(`\0${user}\0${pass}`);

    const conn = await Deno.connectTls({ hostname: host, port: 465 });

    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const readLine = async (): Promise<string> => {
        const buf = new Uint8Array(4096);
        const n = await conn.read(buf);
        return dec.decode(buf.subarray(0, n ?? 0));
    };

    const send = async (cmd: string) => {
        await conn.write(enc.encode(cmd + '\r\n'));
    };

    await readLine(); // 220 greeting
    await send(`EHLO ${host}`);
    await readLine(); // 250 capabilities

    if (port === 587) {
        await send('STARTTLS');
        await readLine(); // 220 ready
    }

    await send(`AUTH PLAIN ${authPlain}`);
    const authRes = await readLine();
    if (!authRes.startsWith('235')) throw new Error('SMTP auth failed: ' + authRes);

    await send(`MAIL FROM:<${user}>`);
    await readLine();
    await send(`RCPT TO:<${to}>`);
    await readLine();
    await send('DATA');
    await readLine();

    const message = [
        `From: ${from}`,
        `To: ${to}`,
        `Reply-To: ${user}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        html,
        '.',
    ].join('\r\n');

    await send(message);
    await readLine();
    await send('QUIT');
    conn.close();
}

function buildInviteEmail(orgName: string, role: string, inviteUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f4f4f4;padding:40px 0;margin:0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2d6a9f);padding:32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">You're invited to join</h1>
      <p style="color:#a8d4f5;margin:8px 0 0;font-size:18px;font-weight:600">${orgName}</p>
    </div>
    <div style="padding:32px">
      <p style="color:#444;font-size:15px;margin:0 0 8px">You've been invited to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
      <p style="color:#666;font-size:14px;margin:0 0 28px">Click the button below to accept your invitation and get started.</p>
      <div style="text-align:center;margin-bottom:28px">
        <a href="${inviteUrl}" style="background:#1e3a5f;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block">Accept Invitation</a>
      </div>
      <p style="color:#999;font-size:12px;margin:0">This link expires in 7 days. If you didn't expect this invitation, you can ignore this email.</p>
    </div>
    <div style="background:#f8f8f8;padding:16px 32px;text-align:center">
      <p style="color:#bbb;font-size:11px;margin:0">This is an automated message from Auctave Exports. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
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
        const inviteUrl = `${appUrl}?invite_token=${invitation.token}`;

        // Try Supabase's built-in invite (new users only)
        const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
            email.toLowerCase(),
            {
                redirectTo: inviteUrl,
                data: { invite_token: invitation.token, org_name: orgRow.name, org_id: orgId, invited_role: role },
            }
        );

        if (!inviteErr) {
            return respond({ success: true, emailSent: true });
        }

        const alreadyRegistered =
            inviteErr.message.toLowerCase().includes('already registered') ||
            inviteErr.message.toLowerCase().includes('already been registered');

        if (!alreadyRegistered) {
            console.error('inviteUserByEmail error:', inviteErr.message);
            return respond({ error: inviteErr.message }, 500);
        }

        // Existing user — send via Zoho SMTP
        const html = buildInviteEmail(orgRow.name, role, inviteUrl);
        await sendSmtpEmail({
            to: email.toLowerCase(),
            subject: `You're invited to join ${orgRow.name}`,
            html,
        });

        return respond({ success: true, emailSent: true });

    } catch (err: any) {
        console.error('Unhandled error:', err);
        return respond({ error: err.message ?? 'Internal server error' }, 500);
    }
});
