-- ─── Fix: allow invited users to accept their own invitations ─────────────────
-- Previously only org owners could SELECT invitations, INSERT members, or UPDATE
-- invitation status — so client-side invite acceptance silently failed due to RLS.

-- 1. Allow the invitee to read their own pending invitation (matched by email)
DROP POLICY IF EXISTS "org_owner_select_invitations" ON public.invitations;
CREATE POLICY "org_admin_or_invitee_select_invitations"
    ON public.invitations FOR SELECT
    USING (
        -- Org owner
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        -- Org admin member
        OR org_id IN (
            SELECT org_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
        )
        -- The invitee themselves (matched by auth email)
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- 2. Allow the invitee to insert themselves as a member when a valid invite exists
CREATE POLICY "invitee_self_insert"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        -- Must be inserting themselves
        user_id = auth.uid()
        -- Must have a valid pending invitation for this org
        AND org_id IN (
            SELECT org_id FROM public.invitations
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
              AND status = 'pending'
              AND expires_at > NOW()
        )
    );

-- 3. Allow the invitee to upsert (update) their own membership row
--    (handles ON CONFLICT case when user is already a member)
CREATE POLICY "invitee_update_own_membership"
    ON public.organization_members FOR UPDATE
    USING (
        user_id = auth.uid()
        AND org_id IN (
            SELECT org_id FROM public.invitations
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
              AND expires_at > NOW()
        )
    );

-- 4. Allow the invitee to mark their own invitation as accepted/declined
DROP POLICY IF EXISTS "org_owner_update_invitations" ON public.invitations;
CREATE POLICY "org_owner_or_invitee_update_invitations"
    ON public.invitations FOR UPDATE
    USING (
        -- Org owner can update any invitation in their org
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        -- Invitee can only update their own invitation
        OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );
