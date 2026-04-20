-- ─────────────────────────────────────────────────────────────────────────────
-- Notification event triggers
--
-- These SECURITY DEFINER functions fire server-side on quote / CRM order changes
-- and insert rows directly into public.notifications for the affected user.
-- Because they run as the DB owner they bypass RLS, so no policy changes needed.
--
-- Covered events (admin → client):
--   quotes     : Responded, In Negotiation (admin), Admin Accepted, Declined (admin)
--                factory chat message, sample shipped
--   crm_orders : status changes, new task added, risk-score escalation
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. quotes → notify client on admin actions ───────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_quote_update()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    factory_name  TEXT;
    notif_cat     TEXT;
    notif_title   TEXT;
    notif_msg     TEXT;
    new_hist_len  INT;
    old_hist_len  INT;
    last_entry    JSONB;
    tracking_old  TEXT;
    tracking_new  TEXT;
BEGIN
    factory_name := COALESCE(NEW.factory_data->>'name', 'the factory');

    -- ── 1a. Status change ─────────────────────────────────────────────────────
    IF OLD.status IS DISTINCT FROM NEW.status THEN

        CASE NEW.status

            WHEN 'Responded' THEN
                notif_cat   := 'rfq';
                notif_title := 'New Quote Received';
                notif_msg   := factory_name || ' responded with pricing on your request.';

            WHEN 'In Negotiation' THEN
                -- Only fire for the client when the ADMIN counter-offered.
                -- Detect by checking that the last history entry came from 'factory'.
                last_entry := NULL;
                new_hist_len := COALESCE(jsonb_array_length(NEW.negotiation_details->'history'), 0);
                IF new_hist_len > 0 THEN
                    last_entry := (NEW.negotiation_details->'history')->(new_hist_len - 1);
                END IF;

                IF last_entry IS NOT NULL AND (last_entry->>'sender') = 'factory' THEN
                    notif_cat   := 'rfq';
                    notif_title := 'Counter-Offer Received';
                    notif_msg   := factory_name || ' sent a counter-offer. Review and respond.';
                END IF;

            WHEN 'Admin Accepted' THEN
                notif_cat   := 'rfq';
                notif_title := 'Quote Accepted — Action Required';
                notif_msg   := factory_name || '''s quote has been accepted. Please review and confirm your order.';

            WHEN 'Declined' THEN
                -- Only fire for the client when the ADMIN/factory declined.
                last_entry := NULL;
                new_hist_len := COALESCE(jsonb_array_length(NEW.negotiation_details->'history'), 0);
                IF new_hist_len > 0 THEN
                    last_entry := (NEW.negotiation_details->'history')->(new_hist_len - 1);
                END IF;

                IF last_entry IS NULL OR (last_entry->>'sender') = 'factory' THEN
                    notif_cat   := 'rfq';
                    notif_title := 'Quote Declined';
                    notif_msg   := factory_name || ' declined your quote request.';
                END IF;

            ELSE
                notif_cat := NULL;
        END CASE;

        IF notif_cat IS NOT NULL THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, image_url, action_page, action_data)
            VALUES (
                NEW.user_id,
                notif_cat,
                notif_title,
                notif_msg,
                NEW.factory_data->>'imageUrl',
                'quoteDetail',
                jsonb_build_object('id', NEW.id)
            );
        END IF;
    END IF;

    -- ── 1b. New factory/admin chat message (status unchanged, history grew) ────
    new_hist_len := COALESCE(jsonb_array_length(NEW.negotiation_details->'history'), 0);
    old_hist_len := COALESCE(jsonb_array_length(OLD.negotiation_details->'history'), 0);

    IF new_hist_len > old_hist_len AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
        last_entry := (NEW.negotiation_details->'history')->(new_hist_len - 1);

        -- Only fire when admin/factory sent the message, not the client
        IF (last_entry->>'sender') = 'factory' AND (last_entry->>'action') = 'info' THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, image_url, action_page, action_data)
            VALUES (
                NEW.user_id,
                'chat',
                'New Message from ' || factory_name,
                COALESCE(NULLIF(TRIM(last_entry->>'message'), ''), '📎 Sent an attachment'),
                NEW.factory_data->>'imageUrl',
                'quoteDetail',
                jsonb_build_object('id', NEW.id)
            );
        END IF;
    END IF;

    -- ── 1c. Sample shipped (tracking number first set by admin) ──────────────
    tracking_old := COALESCE(
        OLD.negotiation_details->'sample_request'->'admin_response'->'commercialData'->>'trackingNumber',
        ''
    );
    tracking_new := COALESCE(
        NEW.negotiation_details->'sample_request'->'admin_response'->'commercialData'->>'trackingNumber',
        ''
    );

    IF tracking_old = '' AND tracking_new <> '' THEN
        INSERT INTO public.notifications
            (user_id, category, title, message, action_page, action_data)
        VALUES (
            NEW.user_id,
            'shipment',
            'Sample Shipped',
            'Your sample has been dispatched'
                || CASE
                    WHEN COALESCE(
                        NEW.negotiation_details->'sample_request'->'admin_response'->'commercialData'->>'courierService',
                        ''
                    ) <> ''
                    THEN ' via ' || (NEW.negotiation_details->'sample_request'->'admin_response'->'commercialData'->>'courierService')
                    ELSE ''
                   END
                || '. Tracking: ' || tracking_new,
            'quoteDetail',
            jsonb_build_object('id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_quote_update ON public.quotes;
CREATE TRIGGER trg_notify_quote_update
    AFTER UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_quote_update();


-- ─── 2. crm_orders → notify client on admin actions ──────────────────────────

CREATE OR REPLACE FUNCTION public.notify_on_crm_order_update()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    order_label  TEXT;
    notif_cat    TEXT;
    notif_title  TEXT;
    notif_msg    TEXT;
    new_tasks    JSONB;
    old_tasks    JSONB;
    new_task     JSONB;
    old_len      INT;
    new_len      INT;
    old_risk     TEXT;
    new_risk     TEXT;
BEGIN
    -- No client to notify
    IF NEW.client_id IS NULL THEN RETURN NEW; END IF;

    order_label := COALESCE(NEW.product_name, 'Your order');

    -- ── 2a. Order status change ───────────────────────────────────────────────
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        CASE NEW.status
            WHEN 'In Production' THEN
                notif_cat := 'order'; notif_title := 'Production Started';
                notif_msg := '"' || order_label || '" has entered production.';
            WHEN 'Quality Check' THEN
                notif_cat := 'qc'; notif_title := 'Quality Check in Progress';
                notif_msg := '"' || order_label || '" is now in quality inspection.';
            WHEN 'Shipped' THEN
                notif_cat := 'shipment'; notif_title := 'Order Shipped';
                notif_msg := '"' || order_label || '" has been dispatched and is on its way.';
            WHEN 'Completed' THEN
                notif_cat := 'order'; notif_title := 'Order Completed';
                notif_msg := '"' || order_label || '" has been completed successfully.';
            WHEN 'On Hold' THEN
                notif_cat := 'crm'; notif_title := 'Order On Hold';
                notif_msg := '"' || order_label || '" has been placed on hold.';
            WHEN 'Cancelled' THEN
                notif_cat := 'crm'; notif_title := 'Order Cancelled';
                notif_msg := '"' || order_label || '" has been cancelled.';
            ELSE
                notif_cat := NULL;
        END CASE;

        IF notif_cat IS NOT NULL THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, meta, action_page)
            VALUES (
                NEW.client_id, notif_cat, notif_title, notif_msg, order_label, 'crm'
            );
        END IF;
    END IF;

    -- ── 2b. New task added ────────────────────────────────────────────────────
    new_tasks := COALESCE(NEW.tasks, '[]'::jsonb);
    old_tasks := COALESCE(OLD.tasks, '[]'::jsonb);
    new_len   := jsonb_array_length(new_tasks);
    old_len   := jsonb_array_length(old_tasks);

    IF new_len > old_len THEN
        new_task := new_tasks->(new_len - 1);
        INSERT INTO public.notifications
            (user_id, category, title, message, meta, action_page)
        VALUES (
            NEW.client_id,
            'task',
            'New Task: ' || COALESCE(new_task->>'name', 'Unnamed task'),
            '"' || COALESCE(new_task->>'name', 'A task') || '" has been added to "' || order_label || '".',
            order_label,
            'crm'
        );
    END IF;

    -- ── 2c. Risk score escalation ─────────────────────────────────────────────
    old_risk := OLD.risk_score;
    new_risk := NEW.risk_score;

    IF new_risk IS DISTINCT FROM old_risk THEN
        IF new_risk = 'red' THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, meta, action_page)
            VALUES (
                NEW.client_id, 'crm', 'Critical Delay Risk',
                '"' || order_label || '" is at critical risk of delay. Immediate review needed.',
                order_label, 'crm'
            );
        ELSIF new_risk = 'amber' THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, meta, action_page)
            VALUES (
                NEW.client_id, 'crm', 'Timeline Risk Detected',
                '"' || order_label || '" has a schedule risk — review milestones.',
                order_label, 'crm'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_crm_order_update ON public.crm_orders;
CREATE TRIGGER trg_notify_crm_order_update
    AFTER UPDATE ON public.crm_orders
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_crm_order_update();
