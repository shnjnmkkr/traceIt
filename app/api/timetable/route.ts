import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET - Fetch user's active timetable with slots
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch active timetable
    const { data: timetable, error: ttError } = await supabase
      .from('timetables')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (ttError) {
      if (ttError.code === 'PGRST116') {
        // No timetable found
        return NextResponse.json({ timetable: null, slots: [] });
      }
      throw ttError;
    }

    // Fetch slots for this timetable
    const { data: slots, error: slotsError } = await supabase
      .from('timetable_slots')
      .select('*')
      .eq('timetable_id', timetable.id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (slotsError) throw slotsError;

    // Transform to match frontend format
    const transformedSlots = slots.map(slot => ({
      id: slot.id,
      day: slot.day_of_week,
      startTime: slot.start_time.substring(0, 5), // Convert "08:00:00" to "08:00"
      endTime: slot.end_time.substring(0, 5),     // Convert "09:00:00" to "09:00"
      subject: slot.subject_code,
      subjectName: slot.subject_name,
      room: slot.room,
      instructor: slot.instructor,
      color: slot.color,
      rowSpan: slot.row_span,
      type: slot.slot_type || 'lecture',
    }));

    return NextResponse.json({
      timetable: {
        id: timetable.id,
        userId: timetable.user_id,
        name: timetable.name,
        semester: timetable.semester,
        section: timetable.section,
        startDate: timetable.start_date,
        endDate: timetable.end_date,
        slots: transformedSlots,
      },
    });
  } catch (error: any) {
    console.error('Error fetching timetable:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch timetable' },
      { status: 500 }
    );
  }
}

// POST - Create a new timetable
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, semester, section, startDate, endDate, slots } = body;

    // Deactivate existing timetables
    await supabase
      .from('timetables')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Create new timetable
    const { data: timetable, error: ttError } = await supabase
      .from('timetables')
      .insert({
        user_id: user.id,
        name,
        semester,
        section,
        start_date: startDate,
        end_date: endDate,
        is_active: true,
      })
      .select()
      .single();

    if (ttError) throw ttError;

    // Create slots
    if (slots && slots.length > 0) {
      const slotsToInsert = slots.map((slot: any) => ({
        timetable_id: timetable.id,
        day_of_week: slot.day,
        start_time: slot.startTime,
        end_time: slot.endTime,
        subject_code: slot.subject,
        subject_name: slot.subjectName,
        room: slot.room,
        instructor: slot.instructor,
        color: slot.color,
        row_span: slot.rowSpan || 1,
        slot_type: slot.type || 'lecture',
      }));

      const { error: slotsError } = await supabase
        .from('timetable_slots')
        .insert(slotsToInsert);

      if (slotsError) throw slotsError;
    }

    return NextResponse.json({ success: true, timetable });
  } catch (error: any) {
    console.error('Error creating timetable:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create timetable' },
      { status: 500 }
    );
  }
}

// PATCH - Update timetable name
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name } = body;

    const { error } = await supabase
      .from('timetables')
      .update({ name })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating timetable:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update timetable' },
      { status: 500 }
    );
  }
}
