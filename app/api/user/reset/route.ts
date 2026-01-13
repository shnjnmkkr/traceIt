import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// DELETE - Reset user's timetable (soft reset)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Resetting timetable for user:', user.id);

    // Delete all timetables (cascades to slots and attendance records)
    const { error: deleteError } = await supabase
      .from('timetables')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('❌ Error deleting timetables:', deleteError);
      throw deleteError;
    }

    console.log('✅ Timetable reset successful');
    return NextResponse.json({ success: true, message: 'Timetable reset successfully' });
  } catch (error: any) {
    console.error('Error resetting timetable:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reset timetable' },
      { status: 500 }
    );
  }
}
