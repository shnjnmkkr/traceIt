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
            countTeacherAbsentAs: 'attended',
            showAnalytics: true,
            includeLabsInOverall: true,
          },
        });
      }
      throw settingsError;
    }

      return NextResponse.json({
        settings: {
          targetPercentage: parseFloat(settings.target_percentage),
          countMassBunkAs: settings.count_mass_bunk_as,
          countTeacherAbsentAs: settings.count_teacher_absent_as,
          showAnalytics: settings.show_analytics,
          includeLabsInOverall: settings.include_labs_in_overall !== false, // Default to true
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
    const { targetPercentage, countMassBunkAs, countTeacherAbsentAs, showAnalytics, includeLabsInOverall } = body;

    // Upsert settings
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        target_percentage: targetPercentage,
        count_mass_bunk_as: countMassBunkAs,
        count_teacher_absent_as: countTeacherAbsentAs,
        show_analytics: showAnalytics,
        include_labs_in_overall: includeLabsInOverall !== undefined ? includeLabsInOverall : true,
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
