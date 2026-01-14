import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET - Fetch attendance records for a timetable
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timetableId = searchParams.get('timetableId');

    if (!timetableId) {
      return NextResponse.json({ error: 'Timetable ID required' }, { status: 400 });
    }

    // Fetch all attendance records for slots in this timetable
    const { data: attendance, error: attError } = await supabase
      .from('attendance_records')
      .select(`
        *,
        timetable_slots!inner (
          timetable_id
        )
      `)
      .eq('user_id', user.id)
      .eq('timetable_slots.timetable_id', timetableId);

    if (attError) throw attError;

    // Transform to Map format: "date-slotId" => status
    const recordsMap: Record<string, string> = {};
    
    attendance.forEach(record => {
      const key = `${record.date}-${record.slot_id}`;
      recordsMap[key] = record.status;
    });

    return NextResponse.json({ records: recordsMap });
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

// POST - Mark attendance for a single slot
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slotId, date, status } = body;

    // Upsert attendance record
    const { error } = await supabase
      .from('attendance_records')
      .upsert({
        user_id: user.id,
        slot_id: slotId,
        date,
        status,
      }, {
        onConflict: 'user_id,slot_id,date',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark attendance' },
      { status: 500 }
    );
  }
}

// PUT - Bulk mark attendance for a date
export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slotIds, date, status } = body;

    // Bulk upsert attendance records
    const records = slotIds.map((slotId: string) => ({
      user_id: user.id,
      slot_id: slotId,
      date,
      status,
    }));

    const { error } = await supabase
      .from('attendance_records')
      .upsert(records, {
        onConflict: 'user_id,slot_id,date',
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error bulk marking attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bulk mark attendance' },
      { status: 500 }
    );
  }
}

// DELETE - Clear/unmark attendance for a slot on a specific date
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { slotId, date } = body;

    if (!slotId || !date) {
      return NextResponse.json({ error: 'Slot ID and date required' }, { status: 400 });
    }

    // Delete the attendance record
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('user_id', user.id)
      .eq('slot_id', slotId)
      .eq('date', date);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing attendance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear attendance' },
      { status: 500 }
    );
  }
}
