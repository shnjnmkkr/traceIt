# Admin Setup Guide

## 🛡️ Admin System Overview

The admin system allows designated users to:
- **Delete any community template** (not just their own)
- **Access admin panel** at `/admin/templates`
- **Moderate community content**

---

## 📋 Database Setup

### Step 1: Create Admin Tables

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- File: lib/supabase/admin-schema.sql
-- (Copy and run the entire file)
```

This creates:
- `admin_users` table to store admin privileges
- Helper functions `is_admin()` and `is_super_admin()`
- RLS policies for security

### Step 2: Add Yourself as Admin

Run this SQL (replace `YOUR_EMAIL@example.com` with your actual email):

```sql
-- File: lib/supabase/add-admin.sql
-- Method 1: By email (recommended)
INSERT INTO admin_users (user_id, is_super_admin, created_by)
SELECT 
  id as user_id,
  true as is_super_admin,
  id as created_by
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com'
ON CONFLICT (user_id) DO UPDATE SET
  is_super_admin = EXCLUDED.is_super_admin;
```

**Or** if you know your user ID:

```sql
-- Method 2: By user ID
INSERT INTO admin_users (user_id, is_super_admin, created_by)
VALUES ('YOUR_USER_ID_HERE', true, 'YOUR_USER_ID_HERE')
ON CONFLICT (user_id) DO UPDATE SET
  is_super_admin = EXCLUDED.is_super_admin;
```

### Step 3: Verify Admin Status

Check if you're an admin:

```sql
SELECT 
  au.id,
  au.user_id,
  u.email,
  au.is_super_admin,
  au.created_at
FROM admin_users au
JOIN auth.users u ON u.id = au.user_id;
```

---

## 🎯 Using the Admin Panel

### Access Admin Panel

1. **Login** to your account
2. Click **Settings** (gear icon) in top-right
3. Click **Admin Panel** (shield icon) - only visible to admins
4. Or navigate directly to: `/admin/templates`

### Admin Panel Features

- **View all templates** with stats (votes, usage, creator)
- **Search templates** by name, university, course, creator
- **Sort by**: Newest, Most Used, Most Voted
- **Delete any template** with confirmation dialog
- **See template details**: votes, usage count, creation date

---

## 🔧 Managing Admins

### Add a New Admin

```sql
-- Replace EMAIL with the user's email
INSERT INTO admin_users (user_id, is_super_admin, created_by)
SELECT 
  id as user_id,
  false as is_super_admin,  -- false = regular admin, true = super admin
  (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com') as created_by
FROM auth.users
WHERE email = 'NEW_ADMIN_EMAIL@example.com'
ON CONFLICT (user_id) DO UPDATE SET
  is_super_admin = EXCLUDED.is_super_admin;
```

### Remove Admin Access

```sql
-- Replace USER_ID with the user's UUID
DELETE FROM admin_users WHERE user_id = 'USER_ID_HERE';
```

### List All Admins

```sql
SELECT 
  au.id,
  au.user_id,
  u.email,
  au.is_super_admin,
  au.created_at,
  creator.email as created_by_email
FROM admin_users au
JOIN auth.users u ON u.id = au.user_id
LEFT JOIN auth.users creator ON creator.id = au.created_by
ORDER BY au.created_at DESC;
```

---

## 🔐 Security Notes

### Admin vs Super Admin

- **Regular Admin**: Can delete templates, access admin panel
- **Super Admin**: Same as admin (currently no difference, reserved for future features)

### RLS Policies

- Admin checks use **server-side functions** (`is_admin()`, `is_super_admin()`)
- These functions are marked `SECURITY DEFINER` for proper access
- Admin status is checked on every API request

### Best Practices

1. **Limit admin access** - Only add trusted users
2. **Use super admin sparingly** - Reserve for yourself/maintainers
3. **Monitor admin actions** - Check logs for template deletions
4. **Rotate admin access** - Remove admins who no longer need it

---

## 🚨 Troubleshooting

### "Access denied" when accessing admin panel

1. **Check if you're an admin**:
   ```sql
   SELECT * FROM admin_users WHERE user_id = 'YOUR_USER_ID';
   ```

2. **Verify your user ID**:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'YOUR_EMAIL@example.com';
   ```

3. **Re-add yourself as admin** using the SQL above

### Admin panel shows "Checking permissions..."

- Check browser console for errors
- Verify `/api/admin/check` endpoint is working
- Ensure admin schema is properly set up

### Can't delete templates

- Verify you're logged in as an admin
- Check browser console for API errors
- Ensure RLS policies allow admin access

---

## 📝 API Endpoints

### Check Admin Status
```
GET /api/admin/check
Response: { isAdmin: boolean, isSuperAdmin: boolean }
```

### Delete Template (Admin)
```
DELETE /api/community-templates?id={templateId}
- Works for creators OR admins
- Returns: { success: true, message: "..." }
```

---

## 🎨 UI Features

### Profile Dropdown
- **Admin Panel** link appears only for admins
- Located in Settings dropdown (top-right)
- Shield icon indicates admin access

### Admin Panel Page
- Clean, searchable template list
- Sortable by date, usage, votes
- One-click delete with confirmation
- Shows all template stats

---

## 🔄 Future Enhancements

Potential admin features to add:
- [ ] Bulk delete templates
- [ ] Template moderation queue
- [ ] User management (ban/unban)
- [ ] Analytics dashboard
- [ ] Export template data
- [ ] Audit log of admin actions

---

## 📞 Support

If you encounter issues:
1. Check SQL syntax in Supabase logs
2. Verify RLS policies are enabled
3. Test admin functions directly in SQL editor
4. Check browser console for client-side errors
