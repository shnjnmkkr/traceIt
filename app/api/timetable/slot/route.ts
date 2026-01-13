import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST - Create a new timetable slot
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { timetableId, day, startTime, endTime, subject, subjectName, type } = body;

    // Verify the timetable belongs to the user
    const { data: timetable, error: ttError } = await supabase
      .from('timetables')
      .select('user_id')
      .eq('id', timetableId)
      .single();

    if (ttError || timetable?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the new slot
    const { data: newSlot, error } = await supabase
      .from('timetable_slots')
      .insert({
        timetable_id: timetableId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        subject_code: subject,
        subject_name: subjectName,
        slot_type: type || 'lecture',
        row_span: 1,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating slot:', error);
      throw error;
    }

    console.log('✅ Slot created successfully:', newSlot);
    return NextResponse.json({ success: true, slot: newSlot });
  } catch (error: any) {
    console.error('Error creating slot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create slot' },
      { status: 500 }
    );
  }
}

// PATCH - Update a timetable slot
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slotId, subject, subjectName, room, instructor } = body;

    // Verify the slot belongs to the user's timetable
    const { data: slot, error: slotError } = await supabase
      .from('timetable_slots')
      .select('timetable_id')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    const { data: timetable, error: ttError } = await supabase
      .from('timetables')
      .select('user_id')
      .eq('id', slot.timetable_id)
      .single();

    if (ttError || timetable?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update the slot
    const { error } = await supabase
      .from('timetable_slots')
      .update({
        subject_code: subject,
        subject_name: subjectName,
        room,
        instructor,
      })
      .eq('id', slotId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating slot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update slot' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a timetable slot
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slotId } = body;

    // Verify the slot belongs to the user's timetable
    const { data: slot, error: slotError } = await supabase
      .from('timetable_slots')
      .select('timetable_id')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    const { data: timetable, error: ttError } = await supabase
      .from('timetables')
      .select('user_id')
      .eq('id', slot.timetable_id)
      .single();

    if (ttError || timetable?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the slot
    const { error } = await supabase
      .from('timetable_slots')
      .delete()
      .eq('id', slotId);

    if (error) {
      console.error('❌ Error deleting slot:', error);
      throw error;
    }

    console.log('✅ Slot deleted successfully:', slotId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting slot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete slot' },
      { status: 500 }
    );
  }
}
