-- Migration to add dedicated Razorpay payment ID columns to orders table
-- This allows for better querying and display of Razorpay transaction information

DO $$
BEGIN
  -- Add razorpay_payment_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'razorpay_payment_id'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN razorpay_payment_id VARCHAR(255);
    RAISE NOTICE '✅ Added column "razorpay_payment_id" to "orders" table.';
  ELSE
    RAISE NOTICE 'ℹ️ Column "razorpay_payment_id" already exists in "orders" table. Skipping.';
  END IF;

  -- Add razorpay_order_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'razorpay_order_id'
  ) THEN
    ALTER TABLE public.orders 
    ADD COLUMN razorpay_order_id VARCHAR(255);
    RAISE NOTICE '✅ Added column "razorpay_order_id" to "orders" table.';
  ELSE
    RAISE NOTICE 'ℹ️ Column "razorpay_order_id" already exists in "orders" table. Skipping.';
  END IF;

  -- Migrate existing data from notes field to new columns
  -- This extracts Payment ID and Razorpay Order ID from the notes field
  UPDATE public.orders
  SET 
    razorpay_payment_id = CASE 
      WHEN notes IS NOT NULL AND notes ~ 'Payment ID: ([^.]+)' THEN
        (regexp_match(notes, 'Payment ID: ([^.]+)'))[1]
      ELSE NULL
    END,
    razorpay_order_id = CASE 
      WHEN notes IS NOT NULL AND notes ~ 'Razorpay Order: (.+)' THEN
        (regexp_match(notes, 'Razorpay Order: (.+)'))[1]
      ELSE NULL
    END
  WHERE payment_method = 'razorpay'
    AND (razorpay_payment_id IS NULL OR razorpay_order_id IS NULL)
    AND notes IS NOT NULL;

  RAISE NOTICE '✅ Migrated existing Razorpay payment data from notes field to dedicated columns.';
END $$;

