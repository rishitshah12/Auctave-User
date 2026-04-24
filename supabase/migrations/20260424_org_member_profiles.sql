-- ── get_org_members_with_profiles ────────────────────────────────────────────
-- Returns org members with their name/email/avatar from the clients table.
-- SECURITY DEFINER so it can join across the clients table regardless of RLS.
-- Accessible to any authenticated user who is a member (or owner) of the org.
CREATE OR REPLACE FUNCTION public.get_org_members_with_profiles(p_org_id uuid)
RETURNS TABLE (
    id           uuid,
    org_id       uuid,
    user_id      uuid,
    role         text,
    permissions  jsonb,
    status       text,
    invited_by   uuid,
    joined_at    timestamptz,
    client_name  text,
    client_email text,
    avatar_url   text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        om.id, om.org_id, om.user_id, om.role, om.permissions, om.status,
        om.invited_by, om.joined_at,
        c.name        AS client_name,
        c.email       AS client_email,
        c.avatar_url
    FROM public.organization_members om
    LEFT JOIN public.clients c ON c.id = om.user_id
    WHERE om.org_id = p_org_id
      AND (
        -- Org owner
        EXISTS (
            SELECT 1 FROM public.organizations
            WHERE id = p_org_id AND owner_id = auth.uid()
        )
        -- Active member of the org
        OR EXISTS (
            SELECT 1 FROM public.organization_members m2
            WHERE m2.org_id = p_org_id
              AND m2.user_id = auth.uid()
              AND m2.status = 'active'
        )
      )
    ORDER BY om.joined_at;
$$;

-- ── admin_get_all_org_memberships ─────────────────────────────────────────────
-- Admin-only: returns every org with all active member profiles.
-- Used by the admin portal's Manage Users and Analytics pages.
CREATE OR REPLACE FUNCTION public.admin_get_all_org_memberships()
RETURNS TABLE (
    org_id        uuid,
    org_name      text,
    owner_id      uuid,
    member_user_id uuid,
    member_role   text,
    member_name   text,
    member_email  text,
    member_avatar text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT
        o.id          AS org_id,
        o.name        AS org_name,
        o.owner_id,
        om.user_id    AS member_user_id,
        om.role       AS member_role,
        c.name        AS member_name,
        c.email       AS member_email,
        c.avatar_url  AS member_avatar
    FROM public.organizations o
    JOIN public.organization_members om
        ON om.org_id = o.id AND om.status = 'active'
    LEFT JOIN public.clients c ON c.id = om.user_id
    -- Only platform admins (auctaveexports.com domain) may call this
    WHERE (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@auctaveexports.com'
    ORDER BY o.id, om.joined_at;
$$;
