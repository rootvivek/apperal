-- Migration: Remove country and address_type columns from addresses table
-- This script removes the country and address_type columns from the addresses table

DO $$
BEGIN
  -- Check if addresses table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    
    -- Drop country column if it exists
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'addresses'
        AND column_name = 'country'
    ) THEN
      ALTER TABLE addresses DROP COLUMN country;
      RAISE NOTICE '✅ Dropped country column from addresses table';
    ELSE
      RAISE NOTICE 'ℹ️  country column does not exist in addresses table';
    END IF;

    -- Drop address_type column if it exists
    IF EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'addresses'
        AND column_name = 'address_type'
    ) THEN
      ALTER TABLE addresses DROP COLUMN address_type;
      RAISE NOTICE '✅ Dropped address_type column from addresses table';
    ELSE
      RAISE NOTICE 'ℹ️  address_type column does not exist in addresses table';
    END IF;

  ELSE
    RAISE NOTICE '⚠️  addresses table does not exist. Skipping migration.';
  END IF;
END $$;

