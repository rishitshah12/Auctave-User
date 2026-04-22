// supabase/functions/invite-member/index.ts
// Sends an org member invitation email using Supabase Auth Admin API.

declare const Deno: any;

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_PERMISSIONS: Record<string, object> = {
    editor: { crm: 'edit', orders: 'edit', sourcing: 'edit', billing: 'none' },
    viewer: { crm: 'view', orders: 'view', sourcing: 'view', billing: 'none' },
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const respond = (body: object, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return respond({ error: 'Unauthorized' }, 401);

        const { email, role, permissions, orgId, invitationId } = await req.json();

        if (!email || !role || !orgId || !invitationId) {
            return respond({ error: 'email, role, orgId, and invitationId are required' }, 400);
        }

        // Verify caller's session
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

        // Verify caller owns or admins the org
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

        // Build redirect URL with invite token
        const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173';

        // Get the invitation token from DB
        const { data: invitation } = await adminClient
            .from('invitations')
            .select('token')
            .eq('id', invitationId)
            .single();

        if (!invitation) return respond({ error: 'Invitation not found' }, 404);

        const redirectTo = `${appUrl}?invite_token=${invitation.token}`;

        // Send the Supabase invite email.
        // inviteUserByEmail only works for users who don't have an account yet.
        // For existing users it returns "User already registered" — that's fine,
        // because the invite link in the DB is still valid; they log in and accept it.
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

        if (inviteErr && !inviteErr.message.includes('already registered')) {
            return respond({ error: inviteErr.message }, 500);
        }

        return respond({ success: true, emailSent: !inviteErr });
    } catch (err: any) {
        return respond({ error: err.message ?? 'Internal server error' }, 500);
    }
});
