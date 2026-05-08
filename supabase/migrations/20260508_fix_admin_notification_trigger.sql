-- Fix notify_admin_on_quote_change: quotes table has no client_name/company_name columns.
-- Look them up from the clients table using user_id instead.

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

    -- Resolve client name from the clients table via user_id
    SELECT COALESCE(NULLIF(TRIM(c.company_name), ''), NULLIF(TRIM(c.name), ''), 'A client')
    INTO client_name
    FROM public.clients c
    WHERE c.id = NEW.user_id;
    client_name := COALESCE(client_name, 'A client');

    factory_name := COALESCE(NEW.factory_data->>'name', 'factory');

    -- 1a. Brand-new RFQ submitted
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

    -- 1b. Status changed by client
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

    -- 1c. New client chat message (status unchanged, history grew)
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
