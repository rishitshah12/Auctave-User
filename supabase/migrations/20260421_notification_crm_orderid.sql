-- ─────────────────────────────────────────────────────────────────────────────
-- Update notify_on_crm_order_update to:
--   1. Include action_data with orderId so "Tap to view" deep-links to the order
--   2. Fire notifications when individual task statuses change (started / completed)
-- ─────────────────────────────────────────────────────────────────────────────

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
    -- Task-loop variables
    i            INT;
    t_new        JSONB;
    t_old        JSONB;
    t_name       TEXT;
    t_old_status TEXT;
    t_new_status TEXT;
BEGIN
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
                (user_id, category, title, message, meta, action_page, action_data)
            VALUES (
                NEW.client_id, notif_cat, notif_title, notif_msg, order_label,
                'crm', jsonb_build_object('orderId', NEW.id::text)
            );
        END IF;
    END IF;

    -- ── 2b. Task changes (new task added or existing task status updated) ─────
    new_tasks := COALESCE(NEW.tasks, '[]'::jsonb);
    old_tasks := COALESCE(OLD.tasks, '[]'::jsonb);
    new_len   := jsonb_array_length(new_tasks);
    old_len   := jsonb_array_length(old_tasks);

    -- New task appended
    IF new_len > old_len THEN
        new_task := new_tasks->(new_len - 1);
        INSERT INTO public.notifications
            (user_id, category, title, message, meta, action_page, action_data)
        VALUES (
            NEW.client_id,
            'task',
            'New Task: ' || COALESCE(new_task->>'name', 'Unnamed task'),
            '"' || COALESCE(new_task->>'name', 'A task') || '" has been added to "' || order_label || '".',
            order_label,
            'crm', jsonb_build_object('orderId', NEW.id::text)
        );
    END IF;

    -- Existing task status changed
    FOR i IN 0 .. new_len - 1 LOOP
        t_new := new_tasks->i;

        -- Find the matching old task by id
        SELECT elem INTO t_old
        FROM jsonb_array_elements(old_tasks) AS elem
        WHERE elem->>'id' = t_new->>'id'
        LIMIT 1;

        IF t_old IS NOT NULL THEN
            t_old_status := t_old->>'status';
            t_new_status := t_new->>'status';
            t_name       := COALESCE(t_new->>'name', 'A task');

            IF t_old_status IS DISTINCT FROM t_new_status AND t_new_status IS NOT NULL THEN
                IF t_new_status = 'COMPLETE' THEN
                    INSERT INTO public.notifications
                        (user_id, category, title, message, meta, action_page, action_data)
                    VALUES (
                        NEW.client_id, 'task',
                        'Task Completed: ' || t_name,
                        '"' || t_name || '" on "' || order_label || '" has been marked complete.',
                        order_label, 'crm', jsonb_build_object('orderId', NEW.id::text)
                    );
                ELSIF t_new_status = 'IN PROGRESS' THEN
                    INSERT INTO public.notifications
                        (user_id, category, title, message, meta, action_page, action_data)
                    VALUES (
                        NEW.client_id, 'task',
                        'Task In Progress: ' || t_name,
                        '"' || t_name || '" on "' || order_label || '" is now in progress.',
                        order_label, 'crm', jsonb_build_object('orderId', NEW.id::text)
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;

    -- ── 2c. Risk score escalation ─────────────────────────────────────────────
    old_risk := OLD.risk_score;
    new_risk := NEW.risk_score;

    IF new_risk IS DISTINCT FROM old_risk THEN
        IF new_risk = 'red' THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, meta, action_page, action_data)
            VALUES (
                NEW.client_id, 'crm', 'Critical Delay Risk',
                '"' || order_label || '" is at critical risk of delay. Immediate review needed.',
                order_label, 'crm', jsonb_build_object('orderId', NEW.id::text)
            );
        ELSIF new_risk = 'amber' THEN
            INSERT INTO public.notifications
                (user_id, category, title, message, meta, action_page, action_data)
            VALUES (
                NEW.client_id, 'crm', 'Timeline Risk Detected',
                '"' || order_label || '" has a schedule risk — review milestones.',
                order_label, 'crm', jsonb_build_object('orderId', NEW.id::text)
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
