"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Shield, 
  Users, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Activity,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface DashboardStats {
  users: {
    total: number;
    active7d: number;
    active30d: number;
  };
  timetables: {
    total: number;
    active: number;
  };
  templates: {
    public: number;
    totalUsage: number;
  };
  attendance: {
    total: number;
    records7d: number;
  };
}

interface RecentUser {
  id: string;
  email: string;
  created_at: string;
}

interface TopTemplate {
  id: string;
  name: string;
  usage_count: number;
  upvotes: number;
  downvotes: number;
  university: string | null;
  course: string | null;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [topTemplates, setTopTemplates] = useState<TopTemplate[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const adminCheck = await fetch('/api/admin/check');
      const adminData = await adminCheck.json();
      
      if (!adminData.isAdmin) {
        alert('Access denied. Admin privileges required.');
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      fetchStats();
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats');
      const data = await response.json();

      if (data.error) {
        console.error('Error fetching stats:', data.error);
        return;
      }

      setStats(data.stats);
      setRecentUsers(data.recentUsers || []);
      setTopTemplates(data.topTemplates || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    color = "primary" 
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string; 
    icon: any;
    color?: string;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-mono font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${color}/10`}>
            <Icon className={`w-6 h-6 text-${color}`} />
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/templates')}
              >
                Manage Templates
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-mono font-bold">Admin Dashboard</h1>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">
            Loading dashboard stats...
          </div>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Total Users"
                value={stats.users.total}
                subtitle={`${stats.users.active7d} active (7d)`}
                icon={Users}
                color="primary"
              />
              <StatCard
                title="Active Timetables"
                value={stats.timetables.active}
                subtitle={`${stats.timetables.total} total`}
                icon={Calendar}
                color="blue"
              />
              <StatCard
                title="Public Templates"
                value={stats.templates.public}
                subtitle={`${stats.templates.totalUsage} total uses`}
                icon={FileText}
                color="green"
              />
              <StatCard
                title="Attendance Records"
                value={stats.attendance.total}
                subtitle={`${stats.attendance.records7d} this week`}
                icon={Activity}
                color="purple"
              />
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="p-6">
                <h3 className="text-lg font-mono font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  User Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active (7 days)</span>
                    <span className="font-mono font-semibold">{stats.users.active7d}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active (30 days)</span>
                    <span className="font-mono font-semibold">{stats.users.active30d}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Retention Rate (7d)</span>
                      <span className="font-mono font-semibold">
                        {stats.users.total > 0 
                          ? Math.round((stats.users.active7d / stats.users.total) * 100) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-mono font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Growth Metrics
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Timetables</span>
                    <span className="font-mono font-semibold">{stats.timetables.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Template Usage</span>
                    <span className="font-mono font-semibold">{stats.templates.totalUsage}</span>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Avg Usage/Template</span>
                      <span className="font-mono font-semibold">
                        {stats.templates.public > 0 
                          ? Math.round(stats.templates.totalUsage / stats.templates.public) 
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Users */}
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-mono font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Recent Users
              </h3>
              {recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent users</p>
              ) : (
                <div className="space-y-2">
                  {recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <span className="text-sm font-mono">{user.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top Templates */}
            <Card className="p-6">
              <h3 className="text-lg font-mono font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Top Templates by Usage
              </h3>
              {topTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates available</p>
              ) : (
                <div className="space-y-3">
                  {topTemplates.map((template, idx) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                          <span className="font-mono font-semibold text-sm">{template.name}</span>
                        </div>
                        {(template.university || template.course) && (
                          <div className="flex gap-2 mt-1">
                            {template.university && (
                              <span className="text-[10px] px-2 py-0.5 bg-background rounded-full">
                                {template.university}
                              </span>
                            )}
                            {template.course && (
                              <span className="text-[10px] px-2 py-0.5 bg-background rounded-full">
                                {template.course}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <div className="text-muted-foreground">Uses</div>
                          <div className="font-mono font-semibold">{template.usage_count || 0}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground">Votes</div>
                          <div className="font-mono font-semibold">
                            {(template.upvotes || 0) - (template.downvotes || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            Failed to load dashboard stats
          </div>
        )}
      </div>
    </div>
  );
}
