import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin-utils';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all stats in parallel (using service role for auth.users access)
    // Note: We'll use timetables to estimate user counts since we can't directly query auth.users
    const [
      activeTimetablesResult,
      totalTimetablesResult,
      publicTemplatesResult,
      attendanceRecords7dResult,
      totalAttendanceRecordsResult,
      totalTemplateUsageResult,
      uniqueUsersResult,
      topTemplatesResult,
    ] = await Promise.all([
      // Active timetables
      supabase.from('timetables').select('id', { count: 'exact', head: true }).eq('is_active', true),
      
      // Total timetables
      supabase.from('timetables').select('id', { count: 'exact', head: true }),
      
      // Public templates
      supabase.from('community_templates').select('id', { count: 'exact', head: true }).eq('is_public', true),
      
      // Attendance records (last 7 days)
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      
      // Total attendance records
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }),
      
      // Total template usage
      supabase.from('community_templates').select('usage_count').eq('is_public', true),
      
      // Unique users (from timetables)
      supabase.from('timetables').select('user_id').limit(1000),
      
      // Top templates by usage
      supabase.from('community_templates').select('id, name, usage_count, upvotes, downvotes, university, course').eq('is_public', true).order('usage_count', { ascending: false }).limit(10),
    ]);

    // Calculate total template usage
    const totalUsage = totalTemplateUsageResult.data?.reduce((sum: number, t: any) => sum + (t.usage_count || 0), 0) || 0;

    // Estimate user counts from timetables (since we can't query auth.users directly)
    const uniqueUserIds = new Set((uniqueUsersResult.data || []).map((t: any) => t.user_id));
    const estimatedTotalUsers = uniqueUserIds.size;

    // Get recent users from timetables (users who created timetables recently)
    const { data: recentTimetables } = await supabase
      .from('timetables')
      .select('user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const recentUserIds = new Set((recentTimetables || []).map((t: any) => t.user_id));
    const recentUsers = Array.from(recentUserIds).slice(0, 10).map((userId: any) => {
      const timetable = recentTimetables?.find((t: any) => t.user_id === userId);
      return {
        id: userId,
        email: 'user@example.com', // We can't get email without service role
        created_at: timetable?.created_at || new Date().toISOString(),
      };
    });

    // Estimate active users (users with recent timetables or attendance)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: recentTimetables7d } = await supabase
      .from('timetables')
      .select('user_id')
      .gte('created_at', sevenDaysAgo)
      .limit(1000);

    const { data: recentAttendance7d } = await supabase
      .from('attendance_records')
      .select('user_id')
      .gte('date', sevenDaysAgo.split('T')[0])
      .limit(1000);

    const activeUsers7d = new Set([
      ...(recentTimetables7d || []).map((t: any) => t.user_id),
      ...(recentAttendance7d || []).map((a: any) => a.user_id),
    ]).size;

    const { data: recentTimetables30d } = await supabase
      .from('timetables')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo)
      .limit(1000);

    const { data: recentAttendance30d } = await supabase
      .from('attendance_records')
      .select('user_id')
      .gte('date', thirtyDaysAgo.split('T')[0])
      .limit(1000);

    const activeUsers30d = new Set([
      ...(recentTimetables30d || []).map((t: any) => t.user_id),
      ...(recentAttendance30d || []).map((a: any) => a.user_id),
    ]).size;

    return NextResponse.json({
      stats: {
        users: {
          total: estimatedTotalUsers,
          active7d: activeUsers7d,
          active30d: activeUsers30d,
        },
        timetables: {
          total: totalTimetablesResult.count || 0,
          active: activeTimetablesResult.count || 0,
        },
        templates: {
          public: publicTemplatesResult.count || 0,
          totalUsage: totalUsage,
        },
        attendance: {
          total: totalAttendanceRecordsResult.count || 0,
          records7d: attendanceRecords7dResult.count || 0,
        },
      },
      recentUsers: recentUsers,
      topTemplates: topTemplatesResult.data || [],
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
