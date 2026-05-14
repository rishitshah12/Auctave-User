-- Fix notify_admin_on_crm_action: remove reference to non-existent column order_name.
-- The column has always been product_name; order_name was never added to crm_orders.
-- This caused any UPDATE on crm_orders (including back-fill migrations) to fail.

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

    order_label := COALESCE(NEW.product_name, 'an order');
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
