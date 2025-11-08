-- Create or replace function to automatically create user profile on signup
-- This ensures all users have profiles created automatically in user_profiles table

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  fullName TEXT;
BEGIN
  -- Get full_name from metadata (prioritize full_name, then construct from first_name + last_name)
  fullName := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    CASE 
      WHEN NEW.raw_user_meta_data->>'first_name' IS NOT NULL OR NEW.raw_user_meta_data->>'last_name' IS NOT NULL THEN
        TRIM(COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''))
      ELSE
        'User'
    END,
    'User'
  );
  
  -- Insert into user_profiles table (using full_name column)
  INSERT INTO public.user_profiles (
    id,
    email,
    phone,
    full_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.phone, ''),
    NEW.phone,
    fullName,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), user_profiles.full_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Also create profiles for existing users who don't have profiles
INSERT INTO public.user_profiles (
  id,
  email,
  phone,
  full_name,
  created_at,
  updated_at
)
SELECT 
  u.id,
  COALESCE(u.email, u.phone, ''),
  u.phone,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    CASE 
      WHEN u.raw_user_meta_data->>'first_name' IS NOT NULL OR u.raw_user_meta_data->>'last_name' IS NOT NULL THEN
        TRIM(COALESCE(u.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(u.raw_user_meta_data->>'last_name', ''))
      ELSE
        'User'
    END,
    'User'
  ),
  u.created_at,
  NOW()
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

