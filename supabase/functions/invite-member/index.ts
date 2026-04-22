// supabase/functions/invite-member/index.ts
// Sends org member invitation emails using Supabase's built-in email system.
// - New users  → auth.admin.inviteUserByEmail  (Supabase sends the email)
// - Existing users → email skipped; admin shares the invite link shown in the UI
//
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
// Optional secret:  APP_URL (production URL; defaults to localhost:5173)

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

        // Try Supabase's built-in invite email (works for new users only)
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
            return respond({ success: true, emailSent: true });
        }

        // Existing Supabase user — Supabase can't re-invite them; admin shares link manually
        const alreadyRegistered =
            inviteErr.message.toLowerCase().includes('already registered') ||
            inviteErr.message.toLowerCase().includes('already been registered');

        if (alreadyRegistered) {
            return respond({ success: true, emailSent: false });
        }

        // Unexpected error
        console.error('inviteUserByEmail error:', inviteErr.message);
        return respond({ error: inviteErr.message }, 500);

    } catch (err: any) {
        console.error('Unhandled error:', err);
        return respond({ error: err.message ?? 'Internal server error' }, 500);
    }
});
