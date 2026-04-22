-- ─── Fix infinite recursion in organization_members RLS ───────────────────────
-- The original policies created a mutual reference cycle:
--   organizations policy → queries organization_members
--   organization_members policy → queries organizations → queries organization_members → ∞
--
-- Fix: use a SECURITY DEFINER function that bypasses RLS when called from policies,
-- breaking the cycle.

-- Drop the recursive policies
DROP POLICY IF EXISTS "org_members_select" ON public.organizations;
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;

-- Security-definer helper: returns org IDs the user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_org_ids(user_uuid UUID)
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
    SELECT org_id FROM public.organization_members
    WHERE user_id = user_uuid AND status = 'active';
$$;

-- organizations: owner sees their org; members see orgs they belong to
-- (uses the SECURITY DEFINER fn so no RLS is applied on the inner query)
CREATE POLICY "org_members_select"
    ON public.organizations FOR SELECT
    USING (
        owner_id = auth.uid()
        OR id IN (SELECT public.get_user_org_ids(auth.uid()))
    );

-- organization_members: user sees their own rows; org owner sees all rows in their org
-- (queries organizations table only — no self-reference, no recursion)
CREATE POLICY "org_members_select"
    ON public.organization_members FOR SELECT
    USING (
        user_id = auth.uid()
        OR org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

-- ─── Backfill: create orgs for existing clients ────────────────────────────────
-- The trigger only fires for new signups. Existing clients need orgs created manually.

-- Step 1: create the org row
INSERT INTO public.organizations (name, owner_id)
SELECT
    COALESCE(NULLIF(c.company_name, ''), NULLIF(c.name, ''), 'My') || '''s Organization',
    c.id
FROM public.clients c
WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.owner_id = c.id
);

-- Step 2: add each owner as an admin member with full permissions
INSERT INTO public.organization_members (org_id, user_id, role, permissions, invited_by)
SELECT
    o.id,
    o.owner_id,
    'admin',
    '{"crm":"edit","orders":"edit","sourcing":"edit","billing":"edit"}',
    o.owner_id
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.org_id = o.id AND m.user_id = o.owner_id
);
