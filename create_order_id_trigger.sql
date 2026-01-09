-- Function to generate custom Order ID
CREATE OR REPLACE FUNCTION generate_crm_order_id()
RETURNS TRIGGER AS $$
DECLARE
    current_yymm text;
    client_name text;
    client_initials text;
    max_id text;
    next_seq integer;
    seq_str text;
    parts text[];
BEGIN
    -- 1. Get YYMM
    current_yymm := TO_CHAR(now(), 'YYMM');

    -- 2. Get Client Initials
    SELECT name INTO client_name FROM clients WHERE id = NEW.client_id;
    
    IF client_name IS NULL OR trim(client_name) = '' THEN
        client_initials := 'XX';
    ELSE
        -- Clean up name
        client_name := trim(client_name);
        -- Split by space to get parts
        parts := regexp_split_to_array(client_name, '\s+');
        
        IF array_length(parts, 1) >= 2 THEN
             -- First letter of first name + First letter of last name
             client_initials := upper(substring(parts[1] from 1 for 1) || substring(parts[array_length(parts, 1)] from 1 for 1));
        ELSE
             -- First 2 letters of the single name
             client_initials := upper(substring(client_name from 1 for 2));
             -- Pad with X if only 1 letter
             IF length(client_initials) < 2 THEN
                client_initials := client_initials || 'X';
             END IF;
        END IF;
    END IF;

    -- 3. Calculate Sequence
    -- Find the maximum ID that starts with the current YYMM prefix
    SELECT max(id) INTO max_id 
    FROM crm_orders 
    WHERE id LIKE current_yymm || '%';

    IF max_id IS NULL THEN
        next_seq := 1;
    ELSE
        -- Try to extract the 4 digits starting at position 5 (indices 5,6,7,8)
        -- ID format: YYMM (1-4) SEQ (5-8) INITIALS (9+)
        BEGIN
            next_seq := substring(max_id from 5 for 4)::integer + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Fallback if parsing fails
            next_seq := 1;
        END;
    END IF;

    seq_str := lpad(next_seq::text, 4, '0');

    -- 4. Set the NEW.id
    NEW.id := current_yymm || seq_str || client_initials;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger
DROP TRIGGER IF EXISTS set_crm_order_id ON crm_orders;
CREATE TRIGGER set_crm_order_id
BEFORE INSERT ON crm_orders
FOR EACH ROW
EXECUTE FUNCTION generate_crm_order_id();