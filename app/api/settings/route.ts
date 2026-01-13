import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET - Fetch user settings
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError) {
      // Return default settings if none exist
      if (settingsError.code === 'PGRST116') {
        return NextResponse.json({
          settings: {
            targetPercentage: 75,
            countMassBunkAs: 'absent',
            countTeacherAbsentInTotal: false,
            showAnalytics: true,
          },
        });
      }
      throw settingsError;
    }

    return NextResponse.json({
      settings: {
        targetPercentage: parseFloat(settings.target_percentage),
        countMassBunkAs: settings.count_mass_bunk_as,
        countTeacherAbsentInTotal: settings.count_teacher_absent_in_total,
        showAnalytics: settings.show_analytics,
      },
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT - Update user settings
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { targetPercentage, countMassBunkAs, countTeacherAbsentInTotal, showAnalytics } = body;

    // Upsert settings
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        target_percentage: targetPercentage,
        count_mass_bunk_as: countMassBunkAs,
        count_teacher_absent_in_total: countTeacherAbsentInTotal,
        show_analytics: showAnalytics,
      }, {
        onConflict: 'user_id',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
