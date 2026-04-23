-- ─── Fix: allow invited users to accept their own invitations ─────────────────
-- Uses auth.email() instead of querying auth.users directly (avoids permission denied)
-- Uses SECURITY DEFINER helpers to avoid infinite recursion between
-- organization_members policies ↔ invitations policies.

-- ── Helper: check pending invite without triggering RLS recursion ─────────────
CREATE OR REPLACE FUNCTION public.invitee_has_pending_invite(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.invitations
        WHERE org_id = p_org_id
          AND email = auth.email()
          AND status = 'pending'
          AND expires_at > NOW()
    );
$$;

-- ── Helper: check if user is org admin without triggering RLS recursion ───────
CREATE OR REPLACE FUNCTION public.user_is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE org_id = p_org_id
          AND user_id = auth.uid()
          AND role = 'admin'
          AND status = 'active'
    );
$$;

-- 1. Allow the invitee to read their own pending invitation (matched by email)
DROP POLICY IF EXISTS "org_owner_select_invitations" ON public.invitations;
DROP POLICY IF EXISTS "org_admin_or_invitee_select_invitations" ON public.invitations;
CREATE POLICY "org_admin_or_invitee_select_invitations"
    ON public.invitations FOR SELECT
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR public.user_is_org_admin(org_id)
        OR email = auth.email()
    );

-- 2. Allow the invitee to insert themselves as a member when a valid invite exists
DROP POLICY IF EXISTS "invitee_self_insert" ON public.organization_members;
CREATE POLICY "invitee_self_insert"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.invitee_has_pending_invite(org_id)
    );

-- 3. Allow the invitee to upsert (update) their own membership row
DROP POLICY IF EXISTS "invitee_update_own_membership" ON public.organization_members;
CREATE POLICY "invitee_update_own_membership"
    ON public.organization_members FOR UPDATE
    USING (
        user_id = auth.uid()
        AND public.invitee_has_pending_invite(org_id)
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

-- 5. Allow org owner/admin to delete (revoke) invitations
DROP POLICY IF EXISTS "org_admin_delete_invitations" ON public.invitations;
CREATE POLICY "org_admin_delete_invitations"
    ON public.invitations FOR DELETE
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR public.user_is_org_admin(org_id)
    );
