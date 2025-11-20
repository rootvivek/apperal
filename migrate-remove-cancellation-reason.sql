-- Migration: Remove cancellation_reason columns from orders and order_items tables
-- Cancellation reason is no longer required

-- Step 1: Remove cancellation_reason from order_items table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE order_items DROP COLUMN cancellation_reason;
    RAISE NOTICE 'Dropped cancellation_reason column from order_items table';
  ELSE
    RAISE NOTICE 'cancellation_reason column does not exist in order_items table';
  END IF;
END $$;

-- Step 2: Remove cancellation_reason from orders table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE orders DROP COLUMN cancellation_reason;
    RAISE NOTICE 'Dropped cancellation_reason column from orders table';
  ELSE
    RAISE NOTICE 'cancellation_reason column does not exist in orders table';
  END IF;
END $$;

-- Step 3: Update comments
COMMENT ON COLUMN order_items.cancelled_quantity IS 'Number of units of this item that have been cancelled.';
COMMENT ON COLUMN order_items.cancelled_at IS 'Timestamp when this item was cancelled.';
COMMENT ON COLUMN order_items.cancelled_by IS 'User role (customer/admin) who cancelled this item.';

COMMENT ON COLUMN orders.cancelled_at IS 'Timestamp when the full order was cancelled.';
COMMENT ON COLUMN orders.cancelled_by IS 'User role (customer/admin) who cancelled the full order.';

