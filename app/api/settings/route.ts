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
            invertedMode: false,
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
          showAnalytics: settings.show_analytics ?? true, // Default to true if column doesn't exist
          includeLabsInOverall: settings.include_labs_in_overall !== false, // Default to true
          invertedMode: settings.inverted_mode ?? false,
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
    const { targetPercentage, countMassBunkAs, countTeacherAbsentAs, showAnalytics, includeLabsInOverall, invertedMode } = body;

    // Get existing settings first for partial updates
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Build update object - only include columns that definitely exist
    // Start with only the core columns that should always exist
    const updateData: any = {
      user_id: user.id,
    };

    if (targetPercentage !== undefined) updateData.target_percentage = targetPercentage;
    else if (existingSettings) updateData.target_percentage = existingSettings.target_percentage;
    else updateData.target_percentage = 75;

    if (countMassBunkAs !== undefined) updateData.count_mass_bunk_as = countMassBunkAs;
    else if (existingSettings) updateData.count_mass_bunk_as = existingSettings.count_mass_bunk_as;
    else updateData.count_mass_bunk_as = 'absent';

    if (countTeacherAbsentAs !== undefined) updateData.count_teacher_absent_as = countTeacherAbsentAs;
    else if (existingSettings) updateData.count_teacher_absent_as = existingSettings.count_teacher_absent_as;
    else updateData.count_teacher_absent_as = 'attended';

    // Try to include optional columns only if they exist in existingSettings
    // This way we know the column exists in the database
    if (showAnalytics !== undefined) {
      if (existingSettings && 'show_analytics' in existingSettings) {
        updateData.show_analytics = showAnalytics;
      }
    } else if (existingSettings && 'show_analytics' in existingSettings) {
      updateData.show_analytics = existingSettings.show_analytics;
    }

    if (includeLabsInOverall !== undefined) {
      if (existingSettings && 'include_labs_in_overall' in existingSettings) {
        updateData.include_labs_in_overall = includeLabsInOverall;
      }
    } else if (existingSettings && 'include_labs_in_overall' in existingSettings) {
      updateData.include_labs_in_overall = existingSettings.include_labs_in_overall !== false;
    }

    if (invertedMode !== undefined) {
      if (existingSettings && 'inverted_mode' in existingSettings) {
        updateData.inverted_mode = invertedMode;
      }
    } else if (existingSettings && 'inverted_mode' in existingSettings) {
      updateData.inverted_mode = existingSettings.inverted_mode ?? false;
    }

    // Upsert settings
    const { error } = await supabase
      .from('user_settings')
      .upsert(updateData, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('Settings update error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
