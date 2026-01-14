import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdmin, isSuperAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ isAdmin: false, isSuperAdmin: false }, { status: 401 });
    }

    const adminStatus = await isAdmin(user.id);
    const superAdminStatus = await isSuperAdmin(user.id);

    return NextResponse.json({
      isAdmin: adminStatus,
      isSuperAdmin: superAdminStatus,
    });
  } catch (error: any) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { isAdmin: false, isSuperAdmin: false, error: error.message },
      { status: 500 }
    );
  }
}
