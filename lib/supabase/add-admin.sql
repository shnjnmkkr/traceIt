-- Add Admin User
-- Replace 'USER_EMAIL_HERE' with the email of the user you want to make an admin
-- Or replace 'USER_ID_HERE' with the UUID of the user

-- Method 1: Add admin by email
INSERT INTO admin_users (user_id, is_super_admin, created_by)
SELECT 
  id as user_id,
  true as is_super_admin,  -- Set to false for regular admin, true for super admin
  id as created_by
FROM auth.users
WHERE email = 'USER_EMAIL_HERE'
ON CONFLICT (user_id) DO UPDATE SET
  is_super_admin = EXCLUDED.is_super_admin;

-- Method 2: Add admin by user ID (if you know the UUID)
-- INSERT INTO admin_users (user_id, is_super_admin, created_by)
-- VALUES ('USER_ID_HERE', true, 'USER_ID_HERE')
-- ON CONFLICT (user_id) DO UPDATE SET
--   is_super_admin = EXCLUDED.is_super_admin;

-- View all admins
-- SELECT 
--   au.id,
--   au.user_id,
--   u.email,
--   au.is_super_admin,
--   au.created_at
-- FROM admin_users au
-- JOIN auth.users u ON u.id = au.user_id;

-- Remove admin (replace USER_ID_HERE with the UUID)
-- DELETE FROM admin_users WHERE user_id = 'USER_ID_HERE';
