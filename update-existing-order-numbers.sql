-- Script to update existing order numbers to short 4-6 digit format
-- Run this in Supabase SQL Editor

-- First, create a function to generate unique short order numbers with ORD-ID: prefix
CREATE OR REPLACE FUNCTION generate_unique_short_order_number()
RETURNS TEXT AS $$
DECLARE
  new_order_number TEXT;
  order_num TEXT;
  exists_check INTEGER;
  attempts INTEGER := 0;
BEGIN
  LOOP
    -- Generate a random number between 1000 and 999999 (4-6 digits)
    order_num := (1000 + floor(random() * 999000))::TEXT;
    new_order_number := 'ORD-ID:' || order_num;
    
    -- Check if this order number already exists
    SELECT COUNT(*) INTO exists_check
    FROM orders
    WHERE order_number = new_order_number;
    
    -- If unique, return it
    IF exists_check = 0 THEN
      RETURN new_order_number;
    END IF;
    
    -- Prevent infinite loop
    attempts := attempts + 1;
    IF attempts > 100 THEN
      -- Fallback: use timestamp-based number
      order_num := (extract(epoch from now())::bigint % 1000000)::TEXT;
      -- Ensure it's at least 4 digits
      order_num := LPAD(order_num, 6, '0');
      new_order_number := 'ORD-ID:' || order_num;
      RETURN new_order_number;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update all existing orders with new short order numbers (format: ORD-ID:123456)
DO $$
DECLARE
  order_record RECORD;
  new_order_number TEXT;
BEGIN
  FOR order_record IN 
    SELECT id, order_number 
    FROM orders 
    WHERE order_number NOT LIKE 'ORD-ID:%' OR length(order_number) > 15
    ORDER BY created_at
  LOOP
    -- Generate unique short order number with ORD-ID: prefix
    new_order_number := generate_unique_short_order_number();
    
    -- Update the order
    UPDATE orders
    SET order_number = new_order_number
    WHERE id = order_record.id;
    
    RAISE NOTICE 'Updated order % from % to %', order_record.id, order_record.order_number, new_order_number;
  END LOOP;
END;
$$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS generate_unique_short_order_number();

