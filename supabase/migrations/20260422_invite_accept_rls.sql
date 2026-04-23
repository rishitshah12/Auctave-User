-- ─── Fix: allow invited users to accept their own invitations ─────────────────
-- Uses SECURITY DEFINER functions throughout to avoid:
--   1. "permission denied for table users" (use auth.email() instead)
--   2. Infinite recursion between organization_members ↔ invitations policies
--   3. Slow per-row policy evaluation causing profile fetch timeouts

-- ── Helper: fetch all orgs for current user (bypasses RLS — used by app) ─────
CREATE OR REPLACE FUNCTION public.get_user_orgs()
RETURNS TABLE (
    org_id       uuid,
    role         text,
    org_name     text,
    owner_id     uuid,
    max_members  int,
    created_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        o.id,
        om.role,
        o.name,
        o.owner_id,
        o.max_members,
        o.created_at
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.org_id
    WHERE om.user_id = auth.uid()
      AND om.status = 'active';
$$;

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

-- ── Helper: check if current user is an active member of an org ───────────────
CREATE OR REPLACE FUNCTION public.user_is_org_member(p_org_id uuid)
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
          AND status = 'active'
    );
$$;

-- 0. Allow org members to read orgs they belong to
DROP POLICY IF EXISTS "org_members_select_org" ON public.organizations;
CREATE POLICY "org_members_select_org"
    ON public.organizations FOR SELECT
    USING (
        owner_id = auth.uid()
        OR public.user_is_org_member(id)
    );

-- 1. Allow the invitee to read their own pending invitation
DROP POLICY IF EXISTS "org_owner_select_invitations" ON public.invitations;
DROP POLICY IF EXISTS "org_admin_or_invitee_select_invitations" ON public.invitations;
CREATE POLICY "org_admin_or_invitee_select_invitations"
    ON public.invitations FOR SELECT
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR public.user_is_org_admin(org_id)
        OR email = auth.email()
    );

-- 2. Allow any member to read their own membership rows
DROP POLICY IF EXISTS "members_select_own" ON public.organization_members;
CREATE POLICY "members_select_own"
    ON public.organization_members FOR SELECT
    USING (user_id = auth.uid());

-- 3. Allow the invitee to insert themselves as a member when a valid invite exists
DROP POLICY IF EXISTS "invitee_self_insert" ON public.organization_members;
CREATE POLICY "invitee_self_insert"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND public.invitee_has_pending_invite(org_id)
    );

-- 4. Allow the invitee to update their own membership row (upsert conflict case)
DROP POLICY IF EXISTS "invitee_update_own_membership" ON public.organization_members;
CREATE POLICY "invitee_update_own_membership"
    ON public.organization_members FOR UPDATE
    USING (
        user_id = auth.uid()
        AND public.invitee_has_pending_invite(org_id)
    );

-- 5. Allow the invitee to mark their own invitation as accepted/declined
DROP POLICY IF EXISTS "org_owner_update_invitations" ON public.invitations;
DROP POLICY IF EXISTS "org_owner_or_invitee_update_invitations" ON public.invitations;
CREATE POLICY "org_owner_or_invitee_update_invitations"
    ON public.invitations FOR UPDATE
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR email = auth.email()
    );

-- 6. Allow org owner/admin to delete (revoke) invitations
DROP POLICY IF EXISTS "org_admin_delete_invitations" ON public.invitations;
CREATE POLICY "org_admin_delete_invitations"
    ON public.invitations FOR DELETE
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR public.user_is_org_admin(org_id)
    );
