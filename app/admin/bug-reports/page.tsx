"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Bug, Lightbulb, Search, Filter, X, CheckCircle, Clock, AlertCircle, MessageSquare, Trash2, ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface BugReport {
  id: string;
  type: 'bug' | 'feature';
  title: string;
  description: string;
  category: string;
  user_email: string | null;
  device_info: string | null;
  screenshot_url: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical' | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  steps_to_reproduce: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  user_id: string | null;
}

export default function AdminBugReportsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<BugReport | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchReports();
    }
  }, [statusFilter, typeFilter, isAdmin]);

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
      fetchReports();
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/bug-reports?${params}`);
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Error fetching bug reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId: string, newStatus: string) => {
    setUpdatingStatus(reportId);
    try {
      const response = await fetch('/api/admin/bug-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setReports(prev => prev.map(r => r.id === reportId ? data.report : r));
        if (selectedReport?.id === reportId) {
          setSelectedReport(data.report);
        }
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/bug-reports?id=${reportId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setReports(prev => prev.filter(r => r.id !== reportId));
        if (selectedReport?.id === reportId) {
          setSelectedReport(null);
        }
      } else {
        alert(data.error || 'Failed to delete report');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      case 'resolved': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'closed': return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getSeverityColor = (severity: string | null) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-mono font-bold">Admin: Bug Reports & Features</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/dashboard')}
            >
              View Dashboard
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full bg-muted rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-muted border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Types</option>
                <option value="bug">Bugs</option>
                <option value="feature">Features</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Total Reports: {reports.length} | Filtered: {filteredReports.length}
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center text-muted-foreground py-12">
            Loading reports...
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {searchQuery ? 'No reports found' : 'No bug reports or feature suggestions yet'}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredReports.map((report, idx) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-4 hover:border-primary transition-colors cursor-pointer" onClick={() => setSelectedReport(report)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {report.type === 'bug' ? (
                          <Bug className="w-4 h-4 text-red-500" />
                        ) : (
                          <Lightbulb className="w-4 h-4 text-yellow-500" />
                        )}
                        <h3 className="font-mono font-semibold text-sm">{report.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                        {report.severity && (
                          <span className={`text-xs font-semibold ${getSeverityColor(report.severity)}`}>
                            {report.severity.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span>Category: {report.category}</span>
                        {report.user_email && <span>Email: {report.user_email}</span>}
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(report);
                        }}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(report.id);
                        }}
                        title="Delete report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedReport(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background border border-border rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedReport.type === 'bug' ? (
                      <Bug className="w-5 h-5 text-red-500" />
                    ) : (
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                    )}
                    <h2 className="text-xl font-mono font-bold">{selectedReport.title}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">Category: {selectedReport.category}</span>
                    {selectedReport.severity && (
                      <span className={`text-xs font-semibold ${getSeverityColor(selectedReport.severity)}`}>
                        Severity: {selectedReport.severity.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <h3 className="text-sm font-mono font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.description}</p>
                </div>

                {selectedReport.type === 'bug' && (
                  <>
                    {selectedReport.expected_behavior && (
                      <div>
                        <h3 className="text-sm font-mono font-semibold mb-2">Expected Behavior</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.expected_behavior}</p>
                      </div>
                    )}
                    {selectedReport.actual_behavior && (
                      <div>
                        <h3 className="text-sm font-mono font-semibold mb-2">Actual Behavior</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.actual_behavior}</p>
                      </div>
                    )}
                    {selectedReport.steps_to_reproduce && (
                      <div>
                        <h3 className="text-sm font-mono font-semibold mb-2">Steps to Reproduce</h3>
                        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-3 rounded">{selectedReport.steps_to_reproduce}</pre>
                      </div>
                    )}
                  </>
                )}

                {selectedReport.screenshot_url && (
                  <div>
                    <h3 className="text-sm font-mono font-semibold mb-2">Screenshot</h3>
                    <img src={selectedReport.screenshot_url} alt="Screenshot" className="max-w-full rounded-lg border border-border" />
                  </div>
                )}

                {selectedReport.device_info && (
                  <div>
                    <h3 className="text-sm font-mono font-semibold mb-2">Device Info</h3>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-3 rounded">{selectedReport.device_info}</pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Email:</span> {selectedReport.user_email || 'Not provided'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Submitted:</span> {new Date(selectedReport.created_at).toLocaleString()}
                  </div>
                  {selectedReport.resolved_at && (
                    <div>
                      <span className="text-muted-foreground">Resolved:</span> {new Date(selectedReport.resolved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Update */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-mono font-semibold mb-2">Update Status</h3>
                <div className="flex gap-2 flex-wrap">
                  {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                    <Button
                      key={status}
                      variant={selectedReport.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedReport.id, status)}
                      disabled={updatingStatus === selectedReport.id}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
