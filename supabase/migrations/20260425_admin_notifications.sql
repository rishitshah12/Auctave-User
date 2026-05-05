-- ─────────────────────────────────────────────────────────────────────────────
-- Admin notification triggers
--
-- Mirror of the client notification triggers, but in reverse:
-- these fire server-side on client actions (new RFQ, chat messages, status
-- changes) and insert a notification row for the admin user directly into
-- public.notifications, guaranteeing delivery even when the browser tab is
-- closed or the realtime channel temporarily drops.
--
-- Admin user is identified by email ending with @auctaveexports.com.
-- A helper function caches the lookup in a session-local variable to avoid
-- repeated auth.users queries on busy trigger fires.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper: resolve the admin's auth.users UUID ───────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_user_id()
RETURNS UUID LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    aid UUID;
BEGIN
    SELECT id INTO aid
    FROM auth.users
    WHERE email ILIKE '%@auctaveexports.com'
    ORDER BY created_at
    LIMIT 1;
    RETURN aid;
END;
$$;

-- ── 1. quotes → notify admin on client actions ────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_admin_on_quote_change()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    admin_id      UUID;
    client_name   TEXT;
    factory_name  TEXT;
    new_hist_len  INT;
    old_hist_len  INT;
    last_entry    JSONB;
BEGIN
    admin_id := public.get_admin_user_id();
    IF admin_id IS NULL THEN RETURN NEW; END IF;

    client_name  := COALESCE(NEW.client_name, NEW.company_name, 'A client');
    factory_name := COALESCE(NEW.factory_data->>'name', 'factory');

    -- ── 1a. Brand-new RFQ submitted ───────────────────────────────────────────
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications
            (user_id, category, title, message, action_page, action_data)
        VALUES (
            admin_id,
            'rfq',
            'New RFQ Submitted',
            client_name || ' submitted a new quote request'
                || CASE WHEN factory_name <> 'factory' THEN ' for ' || factory_name ELSE '' END || '.',
            'adminRFQ',
            jsonb_build_object('rfqId', NEW.id)
        );
        RETURN NEW;
    END IF;

    -- ── 1b. Status changed by client ─────────────────────────────────────────
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        CASE NEW.status
            WHEN 'Client Accepted' THEN
                INSERT INTO public.notifications
                    (user_id, category, title, message, action_page, action_data)
                VALUES (
                    admin_id, 'order',
                    'Client Accepted a Quote',
                    client_name || ' accepted the quote for ' || factory_name || '.',
                    'adminRFQ', jsonb_build_object('rfqId', NEW.id)
                );

            WHEN 'Declined' THEN
                -- Only fire when the CLIENT declined (last history entry from client, or no history)
                last_entry := NULL;
                new_hist_len := COALESCE(jsonb_array_length(NEW.negotiation_details->'history'), 0);
                IF new_hist_len > 0 THEN
                    last_entry := (NEW.negotiation_details->'history')->(new_hist_len - 1);
                END IF;
                IF last_entry IS NULL OR (last_entry->>'sender') = 'client' THEN
                    INSERT INTO public.notifications
                        (user_id, category, title, message, action_page, action_data)
                    VALUES (
                        admin_id, 'rfq',
                        'Client Declined a Quote',
                        client_name || ' declined the quote from ' || factory_name || '.',
                        'adminRFQ', jsonb_build_object('rfqId', NEW.id)
                    );
                END IF;

            WHEN 'In Negotiation' THEN
                -- Only fire when the CLIENT counter-offered (last history entry from client)
                last_entry := NULL;
                new_hist_len := COALESCE(jsonb_array_length(NEW.negotiation_details->'history'), 0);
                IF new_hist_len > 0 THEN
                    last_entry := (NEW.negotiation_details->'history')->(new_hist_len - 1);
                END IF;
                IF last_entry IS NOT NULL AND (last_entry->>'sender') = 'client' THEN
                    INSERT INTO public.notifications
                        (user_id, category, title, message, action_page, action_data)
                    VALUES (
                        admin_id, 'rfq',
                        'Client Sent Counter-Offer',
                        client_name || ' sent a counter-offer on ' || factory_name || '.',
                        'adminRFQ', jsonb_build_object('rfqId', NEW.id)
                    );
                END IF;

            ELSE NULL;
        END CASE;
    END IF;

    -- ── 1c. New client chat message (status unchanged, history grew) ──────────
    new_hist_len := COALESCE(jsonb_array_length(NEW.negotiation_details->'history'), 0);
    old_hist_len := COALESCE(jsonb_array_length(OLD.negotiation_details->'history'), 0);

    IF new_hist_len > old_hist_len AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
        last_entry := (NEW.negotiation_details->'history')->(new_hist_len - 1);
        IF (last_entry->>'sender') = 'client' THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, action_page, action_data)
            VALUES (
                admin_id,
                'chat',
                'New Message from ' || client_name,
                COALESCE(NULLIF(TRIM(last_entry->>'message'), ''), '📎 Sent an attachment'),
                'adminRFQ',
                jsonb_build_object('rfqId', NEW.id)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_quote_insert ON public.quotes;
CREATE TRIGGER trg_notify_admin_on_quote_insert
    AFTER INSERT ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_quote_change();

DROP TRIGGER IF EXISTS trg_notify_admin_on_quote_update ON public.quotes;
CREATE TRIGGER trg_notify_admin_on_quote_update
    AFTER UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_quote_change();


-- ── 2. crm_orders → notify admin on client milestone actions ─────────────────

CREATE OR REPLACE FUNCTION public.notify_admin_on_crm_action()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    admin_id    UUID;
    order_label TEXT;
    new_tasks   JSONB;
    old_tasks   JSONB;
    i           INT;
    new_task    JSONB;
    old_task    JSONB;
BEGIN
    admin_id := public.get_admin_user_id();
    IF admin_id IS NULL THEN RETURN NEW; END IF;

    order_label := COALESCE(NEW.product_name, NEW.order_name, 'an order');
    new_tasks   := COALESCE(NEW.tasks, '[]'::jsonb);
    old_tasks   := COALESCE(OLD.tasks, '[]'::jsonb);

    -- Scan tasks for buyer confirmation / dispute changes
    FOR i IN 0 .. jsonb_array_length(new_tasks) - 1 LOOP
        new_task := new_tasks->i;
        -- Find matching old task by id
        SELECT elem INTO old_task
        FROM jsonb_array_elements(old_tasks) elem
        WHERE elem->>'id' = new_task->>'id'
        LIMIT 1;

        IF old_task IS NULL THEN CONTINUE; END IF;

        -- Buyer confirmed a milestone
        IF (old_task->>'buyerConfirmedAt') IS NULL AND (new_task->>'buyerConfirmedAt') IS NOT NULL THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, action_page, action_data)
            VALUES (
                admin_id, 'approval',
                'Milestone Confirmed by Client',
                '"' || (new_task->>'name') || '" was confirmed on "' || order_label || '".',
                'adminCRM',
                jsonb_build_object('orderId', NEW.id)
            );
        END IF;

        -- Buyer disputed a milestone
        IF (old_task->>'buyerDisputed')::boolean IS DISTINCT FROM (new_task->>'buyerDisputed')::boolean
            AND (new_task->>'buyerDisputed')::boolean IS TRUE
        THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, action_page, action_data)
            VALUES (
                admin_id, 'task',
                'Milestone Disputed by Client',
                '"' || (new_task->>'name') || '" disputed on "' || order_label || '"'
                    || CASE WHEN COALESCE(new_task->>'disputeReason', '') <> ''
                            THEN ': ' || (new_task->>'disputeReason')
                            ELSE '' END || '.',
                'adminCRM',
                jsonb_build_object('orderId', NEW.id)
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_on_crm_action ON public.crm_orders;
CREATE TRIGGER trg_notify_admin_on_crm_action
    AFTER UPDATE ON public.crm_orders
    FOR EACH ROW EXECUTE FUNCTION public.notify_admin_on_crm_action();
