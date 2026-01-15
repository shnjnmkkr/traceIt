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

    // Calculate dates for analytics
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgoDate = sevenDaysAgo.split('T')[0];

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
      // Analytics data
      totalPageViewsResult,
      pageViews7dResult,
      pageViews30dResult,
      uniqueVisitors7dResult,
      uniqueVisitors30dResult,
      guestPageViewsResult,
      registeredPageViewsResult,
      topPagesResult,
      aiChatUsageResult,
      timetableCreateUsageResult,
    ] = await Promise.all([
      // Active timetables
      supabase.from('timetables').select('id', { count: 'exact', head: true }).eq('is_active', true),
      
      // Total timetables
      supabase.from('timetables').select('id', { count: 'exact', head: true }),
      
      // Public templates
      supabase.from('community_templates').select('id', { count: 'exact', head: true }).eq('is_public', true),
      
      // Attendance records (last 7 days)
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).gte('date', sevenDaysAgoDate),
      
      // Total attendance records
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }),
      
      // Total template usage
      supabase.from('community_templates').select('usage_count').eq('is_public', true),
      
      // Unique users (from timetables)
      supabase.from('timetables').select('user_id').limit(1000),
      
      // Top templates by usage
      supabase.from('community_templates').select('id, name, usage_count, upvotes, downvotes, university, course').eq('is_public', true).order('usage_count', { ascending: false }).limit(10),
      
      // Analytics: Total page views
      supabase.from('page_views').select('id', { count: 'exact', head: true }),
      
      // Analytics: Page views last 7 days
      supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      
      // Analytics: Page views last 30 days
      supabase.from('page_views').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
      
      // Analytics: Unique visitors last 7 days (by session_id)
      supabase.from('page_views').select('session_id').gte('created_at', sevenDaysAgo),
      
      // Analytics: Unique visitors last 30 days
      supabase.from('page_views').select('session_id').gte('created_at', thirtyDaysAgo),
      
      // Analytics: Guest page views
      supabase.from('page_views').select('id', { count: 'exact', head: true }).eq('is_guest', true),
      
      // Analytics: Registered user page views
      supabase.from('page_views').select('id', { count: 'exact', head: true }).eq('is_guest', false),
      
      // Analytics: Top pages
      supabase.from('page_views').select('page_path').limit(1000),
      
      // Feature usage: AI Chat
      supabase.from('feature_usage').select('id', { count: 'exact', head: true }).eq('feature_name', 'ai_chat'),
      
      // Feature usage: Timetable creation
      supabase.from('feature_usage').select('id', { count: 'exact', head: true }).eq('feature_name', 'timetable_create'),
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

    // Calculate unique visitors
    const uniqueVisitors7d = new Set((uniqueVisitors7dResult.data || []).map((pv: any) => pv.session_id).filter(Boolean)).size;
    const uniqueVisitors30d = new Set((uniqueVisitors30dResult.data || []).map((pv: any) => pv.session_id).filter(Boolean)).size;
    
    // Calculate top pages
    const pageViewsByPath = new Map<string, number>();
    (topPagesResult.data || []).forEach((pv: any) => {
      const path = pv.page_path || 'unknown';
      pageViewsByPath.set(path, (pageViewsByPath.get(path) || 0) + 1);
    });
    const topPages = Array.from(pageViewsByPath.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Estimate active users (users with recent timetables or attendance)

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
        analytics: {
          pageViews: {
            total: totalPageViewsResult.count || 0,
            last7d: pageViews7dResult.count || 0,
            last30d: pageViews30dResult.count || 0,
          },
          visitors: {
            unique7d: uniqueVisitors7d,
            unique30d: uniqueVisitors30d,
          },
          userTypes: {
            guest: guestPageViewsResult.count || 0,
            registered: registeredPageViewsResult.count || 0,
          },
          topPages: topPages,
          features: {
            aiChat: aiChatUsageResult.count || 0,
            timetableCreate: timetableCreateUsageResult.count || 0,
          },
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
