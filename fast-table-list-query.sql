-- Fast Table/View List Query
-- Use this instead of the slow Supabase dashboard query
-- This returns JSON in a similar format but much faster

-- ============================================
-- OPTION 1: Fast metadata only (recommended)
-- ============================================
-- Returns table info without full DDL (much faster)
SELECT
  jsonb_build_object(
    'data',
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', c.oid::int8,
          'schema', nc.nspname,
          'name', c.relname,
          'type', CASE c.relkind
            WHEN 'r' THEN 'table'
            WHEN 'v' THEN 'view'
            WHEN 'm' THEN 'materialized_view'
            WHEN 'S' THEN 'sequence'
            WHEN 'f' THEN 'foreign_table'
            ELSE 'other'
          END,
          'size', pg_size_pretty(pg_total_relation_size(c.oid)),
          'columns', (
            SELECT COUNT(*) 
            FROM pg_attribute 
            WHERE attrelid = c.oid 
              AND attnum > 0 
              AND NOT attisdropped
          )
        )
      ),
      '[]'::jsonb
    )
  ) as result
FROM pg_namespace nc
JOIN pg_class c ON nc.oid = c.relnamespace
WHERE c.relkind IN ('r', 'v', 'm', 'S', 'f')
  AND NOT pg_is_other_temp_schema(nc.oid)
  AND nc.nspname = 'public'
  AND (
    pg_has_role(c.relowner, 'USAGE')
    OR has_table_privilege(c.oid, 'SELECT')
    OR has_any_column_privilege(c.oid, 'SELECT')
  )
ORDER BY c.relname ASC
LIMIT 100;

-- ============================================
-- OPTION 2: Get DDL for ONE specific table
-- ============================================
-- Use this when you need the actual CREATE statement for a specific table
-- Replace 'products' with your table name
SELECT
  jsonb_build_object(
    'data',
    jsonb_build_array(
      jsonb_build_object(
        'id', c.oid::int8,
        'sql', CASE c.relkind
          WHEN 'r' THEN pg_get_tabledef(nc.nspname, c.relname, false, false, false)
          WHEN 'v' THEN 'CREATE VIEW ' || quote_ident(nc.nspname) || '.' || quote_ident(c.relname) || ' AS ' || pg_get_viewdef(c.oid, true)
          WHEN 'm' THEN 'CREATE MATERIALIZED VIEW ' || quote_ident(nc.nspname) || '.' || quote_ident(c.relname) || ' AS ' || pg_get_viewdef(c.oid, true)
          ELSE NULL
        END
      )
    )
  ) as result
FROM pg_namespace nc
JOIN pg_class c ON nc.oid = c.relnamespace
WHERE nc.nspname = 'public'
  AND c.relname = 'products'  -- Change this to your table name
  AND c.relkind IN ('r', 'v', 'm');

-- ============================================
-- OPTION 3: List all tables (simple format)
-- ============================================
SELECT
  c.oid::int8 as id,
  nc.nspname as schema,
  c.relname as name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    WHEN 'S' THEN 'sequence'
    WHEN 'f' THEN 'foreign_table'
  END as type,
  pg_size_pretty(pg_total_relation_size(c.oid)) as size
FROM pg_namespace nc
JOIN pg_class c ON nc.oid = c.relnamespace
WHERE c.relkind IN ('r', 'v', 'm', 'S', 'f')
  AND NOT pg_is_other_temp_schema(nc.oid)
  AND nc.nspname = 'public'
ORDER BY c.relname ASC;

-- ============================================
-- OPTION 4: Get DDL for multiple specific tables
-- ============================================
-- Use this to get DDL for a list of tables (replace the table names)
SELECT
  jsonb_build_object(
    'data',
    jsonb_agg(
      jsonb_build_object(
        'id', c.oid::int8,
        'sql', CASE c.relkind
          WHEN 'r' THEN pg_get_tabledef(nc.nspname, c.relname, false, false, false)
          WHEN 'v' THEN 'CREATE VIEW ' || quote_ident(nc.nspname) || '.' || quote_ident(c.relname) || ' AS ' || pg_get_viewdef(c.oid, true)
          WHEN 'm' THEN 'CREATE MATERIALIZED VIEW ' || quote_ident(nc.nspname) || '.' || quote_ident(c.relname) || ' AS ' || pg_get_viewdef(c.oid, true)
          ELSE NULL
        END
      )
    )
  ) as result
FROM pg_namespace nc
JOIN pg_class c ON nc.oid = c.relnamespace
WHERE nc.nspname = 'public'
  AND c.relname IN ('products', 'categories', 'subcategories')  -- List your table names here
  AND c.relkind IN ('r', 'v', 'm');

