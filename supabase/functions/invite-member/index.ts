// supabase/functions/invite-member/index.ts
// Sends an org member invitation email using Supabase Auth Admin API.
// Creates an invitation record and triggers a Supabase invite email.

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

        const { email, role, permissions, orgId } = await req.json();

        if (!email || !role || !orgId) {
            return respond({ error: 'email, role, and orgId are required' }, 400);
        }
        if (!['editor', 'viewer'].includes(role)) {
            return respond({ error: 'role must be editor or viewer' }, 400);
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return respond({ error: 'Invalid email address' }, 400);
        }

        // Caller client — validates the JWT and gives us the caller's user_id
        const callerClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
        if (callerErr || !caller) return respond({ error: 'Invalid session' }, 401);

        // Service-role client — for admin operations
        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );

        // Verify caller owns or admins the org
        const { data: orgRow } = await adminClient
            .from('organizations')
            .select('id, name, owner_id, max_members')
            .eq('id', orgId)
            .single();

        if (!orgRow) return respond({ error: 'Organization not found' }, 404);

        const isOwner = orgRow.owner_id === caller.id;
        if (!isOwner) {
            // Check if caller is an org admin member
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

        // Count active members
        const { count: memberCount } = await adminClient
            .from('organization_members')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId)
            .eq('status', 'active');

        if ((memberCount ?? 0) >= orgRow.max_members) {
            return respond({ error: `Organization has reached the maximum of ${orgRow.max_members} members` }, 400);
        }

        // Check if email is already an active member
        const { data: existingMember } = await adminClient
            .from('organization_members')
            .select('id')
            .eq('org_id', orgId)
            .eq('status', 'active')
            .in('user_id',
                adminClient
                    .from('clients')
                    .select('id')
                    .eq('email', email.toLowerCase())
            );
        // Simplified: check via clients table
        const { data: existingClient } = await adminClient
            .from('clients')
            .select('id')
            .eq('email', email.toLowerCase())
            .single();

        if (existingClient) {
            const { data: activeMember } = await adminClient
                .from('organization_members')
                .select('id')
                .eq('org_id', orgId)
                .eq('user_id', existingClient.id)
                .eq('status', 'active')
                .single();
            if (activeMember) {
                return respond({ error: 'This person is already a member of your organization' }, 400);
            }
        }

        // Revoke any existing pending invite for this email+org
        await adminClient
            .from('invitations')
            .update({ status: 'revoked' })
            .eq('org_id', orgId)
            .eq('email', email.toLowerCase())
            .eq('status', 'pending');

        // Resolve final permissions
        const finalPermissions = permissions ?? DEFAULT_PERMISSIONS[role];

        // Create invitation record
        const { data: invitation, error: invErr } = await adminClient
            .from('invitations')
            .insert({
                org_id: orgId,
                email: email.toLowerCase(),
                role,
                permissions: finalPermissions,
                invited_by: caller.id,
                status: 'pending',
            })
            .select()
            .single();

        if (invErr) return respond({ error: invErr.message }, 500);

        // Build the redirect URL: app root + invite token as query param
        // Supabase will append its own tokens; we pass ours via redirectTo
        const appUrl = Deno.env.get('APP_URL') ?? 'https://nhvbnfpzykdokqcnljth.supabase.co';
        const redirectTo = `${appUrl}?invite_token=${invitation.token}`;

        // Send the Supabase invite email (creates auth user if not exists, sends magic link)
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

        if (inviteErr) {
            // Clean up the invitation record if the email failed
            await adminClient.from('invitations').delete().eq('id', invitation.id);
            return respond({ error: inviteErr.message }, 500);
        }

        return respond({ success: true, invitationId: invitation.id });
    } catch (err: any) {
        return respond({ error: err.message ?? 'Internal server error' }, 500);
    }
});
