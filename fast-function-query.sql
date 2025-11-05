-- Fast alternative function query (use this instead of the slow dashboard query)
-- This query is optimized for performance and only shows user functions

SELECT
  f.oid as id,
  n.nspname as schema,
  f.proname as name,
  l.lanname as language,
  CASE
    WHEN l.lanname = 'c' THEN 'C'
    ELSE LEFT(f.prosrc, 500)  -- Limit definition length for performance
  END as definition,
  pg_get_function_arguments(f.oid) as argument_types,
  pg_get_function_result(f.oid) as return_type,
  f.proretset as is_set_returning_function,
  CASE
    WHEN f.provolatile = 'i' THEN 'IMMUTABLE'
    WHEN f.provolatile = 's' THEN 'STABLE'
    ELSE 'VOLATILE'
  END as behavior,
  f.prosecdef as security_definer
FROM pg_proc f
LEFT JOIN pg_namespace n ON f.pronamespace = n.oid
LEFT JOIN pg_language l ON f.prolang = l.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_toast_temp_1')
  AND n.nspname NOT LIKE 'pg_temp_%'
  AND n.nspname NOT LIKE 'pg_toast_temp_%'
  AND f.prokind = 'f'  -- Only regular functions (not aggregates, procedures, etc.)
ORDER BY n.nspname, f.proname
LIMIT 1000;  -- Limit results for faster queries

-- If you need full details, use this slower version:
/*
SELECT
  f.oid as id,
  n.nspname as schema,
  f.proname as name,
  l.lanname as language,
  CASE
    WHEN l.lanname = 'c' THEN 'C'
    ELSE f.prosrc
  END as definition,
  pg_get_functiondef(f.oid) as complete_statement,
  pg_get_function_arguments(f.oid) as argument_types,
  pg_get_function_identity_arguments(f.oid) as identity_argument_types,
  f.prorettype as return_type_id,
  pg_get_function_result(f.oid) as return_type,
  f.proretset as is_set_returning_function,
  CASE
    WHEN f.provolatile = 'i' THEN 'IMMUTABLE'
    WHEN f.provolatile = 's' THEN 'STABLE'
    ELSE 'VOLATILE'
  END as behavior,
  f.prosecdef as security_definer
FROM pg_proc f
LEFT JOIN pg_namespace n ON f.pronamespace = n.oid
LEFT JOIN pg_language l ON f.prolang = l.oid
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND f.prokind = 'f'
ORDER BY n.nspname, f.proname;
*/

