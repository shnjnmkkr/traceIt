import { createClient } from '@/lib/supabase/server';

/**
 * Check if the current user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('is_admin', {
      check_user_id: userId,
    });

    if (error) {
      // Fallback: Check admin_users table directly
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .single();

      return !!adminData;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase.rpc('is_super_admin', {
      check_user_id: userId,
    });

    if (error) {
      // Fallback: Check admin_users table directly
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('is_super_admin')
        .eq('user_id', userId)
        .single();

      return adminData?.is_super_admin === true;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}
