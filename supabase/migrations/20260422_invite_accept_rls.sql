-- ─── Fix: allow invited users to accept their own invitations ─────────────────
-- Uses auth.email() instead of querying auth.users directly (avoids permission denied)

-- 1. Allow the invitee to read their own pending invitation (matched by email)
DROP POLICY IF EXISTS "org_owner_select_invitations" ON public.invitations;
DROP POLICY IF EXISTS "org_admin_or_invitee_select_invitations" ON public.invitations;
CREATE POLICY "org_admin_or_invitee_select_invitations"
    ON public.invitations FOR SELECT
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR org_id IN (
            SELECT org_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
        )
        OR email = auth.email()
    );

-- 2. Allow the invitee to insert themselves as a member when a valid invite exists
DROP POLICY IF EXISTS "invitee_self_insert" ON public.organization_members;
CREATE POLICY "invitee_self_insert"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND org_id IN (
            SELECT org_id FROM public.invitations
            WHERE email = auth.email()
              AND status = 'pending'
              AND expires_at > NOW()
        )
    );

-- 3. Allow the invitee to upsert (update) their own membership row
DROP POLICY IF EXISTS "invitee_update_own_membership" ON public.organization_members;
CREATE POLICY "invitee_update_own_membership"
    ON public.organization_members FOR UPDATE
    USING (
        user_id = auth.uid()
        AND org_id IN (
            SELECT org_id FROM public.invitations
            WHERE email = auth.email()
              AND expires_at > NOW()
        )
    );

-- 4. Allow the invitee to mark their own invitation as accepted/declined
DROP POLICY IF EXISTS "org_owner_update_invitations" ON public.invitations;
DROP POLICY IF EXISTS "org_owner_or_invitee_update_invitations" ON public.invitations;
CREATE POLICY "org_owner_or_invitee_update_invitations"
    ON public.invitations FOR UPDATE
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR email = auth.email()
    );
