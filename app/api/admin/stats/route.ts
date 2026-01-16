import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
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

    // Create service role client for admin queries (access to auth.users)
    const adminSupabase = createServiceRoleClient();

    // Calculate dates for analytics
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgoDate = sevenDaysAgo.split('T')[0];

    // Fetch all stats in parallel (using service role for auth.users access)
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
    const publicTemplatesCount = publicTemplatesResult.count || 0;
    const avgUsagePerTemplate = publicTemplatesCount > 0 ? Math.round((totalUsage / publicTemplatesCount) * 100) / 100 : 0;

    // Get real user data from auth.users using service role client
    const { data: allUsers, error: usersError } = await adminSupabase.auth.admin.listUsers();
    const totalUsers = allUsers?.users?.length || 0;

    // Filter out guest users (users with is_guest metadata)
    const registeredUsers = allUsers?.users?.filter((u: any) => !u.user_metadata?.is_guest) || [];
    const totalRegisteredUsers = registeredUsers.length;

    // Get last activity for each user (from page_views)
    const { data: allPageViews } = await supabase
      .from('page_views')
      .select('user_id, created_at')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10000);

    // Create a map of user_id to last activity timestamp
    const userLastActivity = new Map<string, string>();
    (allPageViews || []).forEach((pv: any) => {
      if (pv.user_id && (!userLastActivity.has(pv.user_id) || 
          new Date(pv.created_at) > new Date(userLastActivity.get(pv.user_id) || 0))) {
        userLastActivity.set(pv.user_id, pv.created_at);
      }
    });

    // Get recent users with last activity (last 10 active users, ordered by last activity or last_sign_in_at)
    const recentUsersData = registeredUsers
      .map((u: any) => {
        const lastActivity = userLastActivity.get(u.id);
        const lastSignIn = u.last_sign_in_at;
        // Use the most recent between last activity and last sign in
        let lastActive: string | null = null;
        if (lastActivity && lastSignIn) {
          lastActive = new Date(lastActivity) > new Date(lastSignIn) ? lastActivity : lastSignIn;
        } else if (lastActivity) {
          lastActive = lastActivity;
        } else if (lastSignIn) {
          lastActive = lastSignIn;
        } else {
          lastActive = u.created_at; // Fallback to account creation
        }
        return {
          id: u.id,
          email: u.email || 'No email',
          created_at: u.created_at,
          last_active: lastActive,
        };
      })
      .sort((a: any, b: any) => new Date(b.last_active).getTime() - new Date(a.last_active).getTime())
      .slice(0, 10);

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
    
    // Calculate active users (users with recent activity: timetables, attendance, or page views)
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

    const { data: recentPageViews7d } = await supabase
      .from('page_views')
      .select('user_id')
      .gte('created_at', sevenDaysAgo)
      .limit(1000);

    const activeUsers7d = new Set([
      ...(recentTimetables7d || []).map((t: any) => t.user_id).filter(Boolean),
      ...(recentAttendance7d || []).map((a: any) => a.user_id).filter(Boolean),
      ...(recentPageViews7d || []).map((pv: any) => pv.user_id).filter(Boolean),
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

    const { data: recentPageViews30d } = await supabase
      .from('page_views')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo)
      .limit(1000);

    const activeUsers30d = new Set([
      ...(recentTimetables30d || []).map((t: any) => t.user_id).filter(Boolean),
      ...(recentAttendance30d || []).map((a: any) => a.user_id).filter(Boolean),
      ...(recentPageViews30d || []).map((pv: any) => pv.user_id).filter(Boolean),
    ]).size;

    // Calculate daily active users (last 7 days) - optimized parallel queries
    const today = new Date();
    const dailyQueries = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayStart = new Date(dateStr).toISOString();
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      dailyQueries.push(
        supabase
          .from('page_views')
          .select('user_id')
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd.toISOString())
          .limit(1000)
      );
    }
    
    const dailyResults = await Promise.all(dailyQueries);
    const dailyActiveUsers: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayPageViews = dailyResults[6 - i]?.data || [];
      dailyActiveUsers[dateStr] = new Set(dayPageViews.map((pv: any) => pv.user_id).filter(Boolean)).size;
    }

    // Calculate user growth (new users in last 7d, 30d)
    const newUsers7d = registeredUsers.filter((u: any) => 
      new Date(u.created_at) >= new Date(sevenDaysAgo)
    ).length;
    const newUsers30d = registeredUsers.filter((u: any) => 
      new Date(u.created_at) >= new Date(thirtyDaysAgo)
    ).length;

    // Calculate retention rate (users active in last 7d who were also active 30d ago)
    const { data: pageViews30dAgo } = await supabase
      .from('page_views')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo)
      .lt('created_at', sevenDaysAgo)
      .not('user_id', 'is', null)
      .limit(1000);
    
    const usersActive30dAgo = new Set((pageViews30dAgo || []).map((pv: any) => pv.user_id).filter(Boolean));
    const usersActive7d = new Set([
      ...(recentTimetables7d || []).map((t: any) => t.user_id).filter(Boolean),
      ...(recentAttendance7d || []).map((a: any) => a.user_id).filter(Boolean),
      ...(recentPageViews7d || []).map((pv: any) => pv.user_id).filter(Boolean),
    ]);
    
    const retainedUsers = Array.from(usersActive7d).filter((uid: string) => usersActive30dAgo.has(uid)).length;
    const retentionRate = usersActive30dAgo.size > 0 
      ? Math.round((retainedUsers / usersActive30dAgo.size) * 100) 
      : 0;

    // Get feature usage breakdown
    const { data: allFeatureUsage } = await supabase
      .from('feature_usage')
      .select('feature_name, created_at')
      .limit(1000);

    const featureUsageBreakdown: Record<string, { total: number; last7d: number; last30d: number }> = {};
    (allFeatureUsage || []).forEach((fu: any) => {
      if (!featureUsageBreakdown[fu.feature_name]) {
        featureUsageBreakdown[fu.feature_name] = { total: 0, last7d: 0, last30d: 0 };
      }
      featureUsageBreakdown[fu.feature_name].total++;
      if (new Date(fu.created_at) >= new Date(sevenDaysAgo)) {
        featureUsageBreakdown[fu.feature_name].last7d++;
      }
      if (new Date(fu.created_at) >= new Date(thirtyDaysAgo)) {
        featureUsageBreakdown[fu.feature_name].last30d++;
      }
    });

    return NextResponse.json({
      stats: {
        users: {
          total: totalRegisteredUsers, // Only registered users, excluding guests
          active7d: activeUsers7d,
          active30d: activeUsers30d,
          new7d: newUsers7d,
          new30d: newUsers30d,
          retentionRate: retentionRate,
        },
        timetables: {
          total: totalTimetablesResult.count || 0,
          active: activeTimetablesResult.count || 0,
        },
        templates: {
          public: publicTemplatesCount,
          totalUsage: totalUsage,
          avgUsagePerTemplate: avgUsagePerTemplate,
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
          dailyActiveUsers: dailyActiveUsers,
          features: {
            aiChat: aiChatUsageResult.count || 0,
            timetableCreate: timetableCreateUsageResult.count || 0,
            breakdown: featureUsageBreakdown,
          },
        },
      },
      recentUsers: recentUsersData,
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
