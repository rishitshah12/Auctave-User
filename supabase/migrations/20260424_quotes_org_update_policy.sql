-- Allow active org editors/admins to update quotes owned by the org owner.
-- Without this, chat send (quoteService.update) fails for invitees at the RLS level.
CREATE POLICY "org_editors_update_quotes"
    ON public.quotes FOR UPDATE
    USING (
        user_id IN (
            SELECT o.owner_id
            FROM public.organization_members m
            JOIN public.organizations o ON o.id = m.org_id
            WHERE m.user_id = auth.uid()
              AND m.status = 'active'
              AND (m.role IN ('admin', 'editor') OR (m.permissions->>'sourcing') = 'edit')
        )
    )
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
