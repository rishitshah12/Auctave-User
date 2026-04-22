-- ─── Organizations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL DEFAULT 'My Organization',
    owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    max_members INT NOT NULL DEFAULT 5,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT organizations_owner_unique UNIQUE (owner_id)
);

-- ─── Organization Members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_members (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role         TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    permissions  JSONB NOT NULL DEFAULT '{"crm":"view","orders":"view","sourcing":"view","billing":"none"}',
    status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT org_member_unique UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS org_members_org_id_idx ON public.organization_members (org_id);
CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON public.organization_members (user_id);

-- ─── Invitations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id       UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    token        UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    role         TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('editor', 'viewer')),
    permissions  JSONB NOT NULL DEFAULT '{"crm":"view","orders":"view","sourcing":"view","billing":"none"}',
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invited_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT invitation_org_email_unique UNIQUE (org_id, email, status)
);

CREATE INDEX IF NOT EXISTS invitations_token_idx ON public.invitations (token);
CREATE INDEX IF NOT EXISTS invitations_email_idx ON public.invitations (email);
CREATE INDEX IF NOT EXISTS invitations_org_id_idx ON public.invitations (org_id);

-- ─── RLS — enable on all three tables ─────────────────────────────────────────
-- (Both tables exist now, so cross-references in policies are safe)

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- organizations policies
CREATE POLICY "org_members_select"
    ON public.organizations FOR SELECT
    USING (
        owner_id = auth.uid()
        OR id IN (
            SELECT org_id FROM public.organization_members
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "org_owner_update"
    ON public.organizations FOR UPDATE
    USING (owner_id = auth.uid());

-- organization_members policies
CREATE POLICY "org_members_select"
    ON public.organization_members FOR SELECT
    USING (
        org_id IN (
            SELECT id FROM public.organizations WHERE owner_id = auth.uid()
            UNION
            SELECT org_id FROM public.organization_members
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "org_owner_insert_members"
    ON public.organization_members FOR INSERT
    WITH CHECK (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "org_owner_update_members"
    ON public.organization_members FOR UPDATE
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "org_owner_delete_members"
    ON public.organization_members FOR DELETE
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR user_id = auth.uid()
    );

-- invitations policies
CREATE POLICY "org_owner_select_invitations"
    ON public.invitations FOR SELECT
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
        OR org_id IN (
            SELECT org_id FROM public.organization_members
            WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
        )
    );

CREATE POLICY "org_owner_insert_invitations"
    ON public.invitations FOR INSERT
    WITH CHECK (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "org_owner_update_invitations"
    ON public.invitations FOR UPDATE
    USING (
        org_id IN (SELECT id FROM public.organizations WHERE owner_id = auth.uid())
    );

-- ─── Auto-expire invitations helper ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.invitations
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$;

-- ─── Bootstrap: auto-create org when a client row is inserted ─────────────────
CREATE OR REPLACE FUNCTION public.create_org_for_new_client()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    new_org_id UUID;
    client_name TEXT;
BEGIN
    client_name := COALESCE(NULLIF(NEW.company_name, ''), NULLIF(NEW.name, ''), 'My Organization');

    INSERT INTO public.organizations (name, owner_id)
    VALUES (client_name || '''s Organization', NEW.id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (org_id, user_id, role, permissions, invited_by)
    VALUES (
        new_org_id,
        NEW.id,
        'admin',
        '{"crm":"edit","orders":"edit","sourcing":"edit","billing":"edit"}',
        NEW.id
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_org_for_client
    AFTER INSERT ON public.clients
    FOR EACH ROW EXECUTE FUNCTION public.create_org_for_new_client();

-- ─── Constraint: max 5 members per org ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_org_member_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    current_count INT;
    max_allowed   INT;
BEGIN
    SELECT COUNT(*), o.max_members
    INTO current_count, max_allowed
    FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.org_id
    WHERE m.org_id = NEW.org_id AND m.status = 'active'
    GROUP BY o.max_members;

    IF current_count IS NOT NULL AND current_count >= max_allowed THEN
        RAISE EXCEPTION 'Organization has reached the maximum member limit of %', max_allowed;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_org_member_limit
    BEFORE INSERT ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION public.check_org_member_limit();

-- ─── crm_orders: allow active org members ─────────────────────────────────────
CREATE POLICY "org_members_select_crm_orders"
    ON public.crm_orders FOR SELECT
    USING (
        client_id IN (
            SELECT o.owner_id
            FROM public.organization_members m
            JOIN public.organizations o ON o.id = m.org_id
            WHERE m.user_id = auth.uid() AND m.status = 'active'
        )
    );

CREATE POLICY "org_editors_insert_crm_orders"
    ON public.crm_orders FOR INSERT
    WITH CHECK (
        client_id IN (
            SELECT o.owner_id
            FROM public.organization_members m
            JOIN public.organizations o ON o.id = m.org_id
            WHERE m.user_id = auth.uid()
              AND m.status = 'active'
              AND (m.role IN ('admin', 'editor') OR (m.permissions->>'orders') = 'edit')
        )
    );

CREATE POLICY "org_editors_update_crm_orders"
    ON public.crm_orders FOR UPDATE
    USING (
        client_id IN (
            SELECT o.owner_id
            FROM public.organization_members m
            JOIN public.organizations o ON o.id = m.org_id
            WHERE m.user_id = auth.uid()
              AND m.status = 'active'
              AND (m.role IN ('admin', 'editor') OR (m.permissions->>'orders') = 'edit')
        )
    );

-- ─── quotes: allow active org members ─────────────────────────────────────────
CREATE POLICY "org_members_select_quotes"
    ON public.quotes FOR SELECT
    USING (
        user_id IN (
            SELECT o.owner_id
            FROM public.organization_members m
            JOIN public.organizations o ON o.id = m.org_id
            WHERE m.user_id = auth.uid() AND m.status = 'active'
        )
    );

CREATE POLICY "org_editors_insert_quotes"
    ON public.quotes FOR INSERT
    WITH CHECK (
        user_id IN (
            SELECT o.owner_id
            FROM public.organization_members m
            JOIN public.organizations o ON o.id = m.org_id
            WHERE m.user_id = auth.uid()
              AND m.status = 'active'
              AND (m.role IN ('admin', 'editor') OR (m.permissions->>'sourcing') = 'edit')
        )
    );
