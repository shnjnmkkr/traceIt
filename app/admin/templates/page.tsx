"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Trash2, Search, Users, TrendingUp, ChevronUp, ChevronDown, ArrowLeft, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { TimetableSlot } from "@/types";

interface CommunityTemplate {
  id: string;
  name: string;
  description: string;
  university: string;
  course: string;
  semester: string;
  creator_name: string;
  creator_id: string;
  usage_count: number;
  upvotes: number;
  downvotes: number;
  created_at: string;
  template_data?: {
    slots?: TimetableSlot[];
  };
}

export default function AdminTemplatesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [templates, setTemplates] = useState<CommunityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'usage' | 'votes'>('newest');
  const [viewingTemplate, setViewingTemplate] = useState<CommunityTemplate | null>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      // Check if user is admin
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
      fetchTemplates();
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/dashboard');
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/community-templates?limit=100&sortBy=${sortBy}`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchTemplates();
    }
  }, [sortBy, isAdmin]);

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingTemplateId(templateId);

    try {
      const response = await fetch(`/api/community-templates?id=${templateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        alert('Template deleted successfully');
      } else {
        alert(data.error || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.university?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.creator_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-mono font-bold">Admin: Community Templates</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin/dashboard')}
            >
              View Dashboard
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Manage and moderate community-shared templates
          </p>

          {/* Search and Sort */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-muted rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant={sortBy === 'newest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('newest')}
              >
                Newest
              </Button>
              <Button
                variant={sortBy === 'usage' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('usage')}
              >
                Most Used
              </Button>
              <Button
                variant={sortBy === 'votes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('votes')}
              >
                Most Voted
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Total Templates: {templates.length} | Filtered: {filteredTemplates.length}
          </div>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="text-center text-muted-foreground py-12">
            Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            {searchQuery ? 'No templates found' : 'No templates available'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template, idx) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-mono font-semibold text-sm flex-1">{template.name}</h3>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => setViewingTemplate(template)}
                        title="View template content"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(template.id, template.name)}
                        disabled={deletingTemplateId === template.id}
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.university && (
                      <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full">
                        {template.university}
                      </span>
                    )}
                    {template.course && (
                      <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full">
                        {template.course}
                      </span>
                    )}
                    {template.semester && (
                      <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full">
                        {template.semester}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                    <span>by {template.creator_name}</span>
                    <span>
                      {new Date(template.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <ChevronUp className="w-3 h-3 text-green-500" />
                        <span className="text-xs">{template.upvotes || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ChevronDown className="w-3 h-3 text-red-500" />
                        <span className="text-xs">{template.downvotes || 0}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Net: {(template.upvotes || 0) - (template.downvotes || 0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      {template.usage_count || 0} uses
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* View Template Content Modal */}
      <AnimatePresence>
        {viewingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background border border-border rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h2 className="text-xl font-mono font-bold">{viewingTemplate.name}</h2>
                  {viewingTemplate.description && (
                    <p className="text-sm text-muted-foreground mt-1">{viewingTemplate.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewingTemplate(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {viewingTemplate.template_data?.slots && viewingTemplate.template_data.slots.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Total Slots: {viewingTemplate.template_data.slots.length}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-mono font-semibold">Day</th>
                            <th className="text-left p-2 font-mono font-semibold">Time</th>
                            <th className="text-left p-2 font-mono font-semibold">Subject Code</th>
                            <th className="text-left p-2 font-mono font-semibold">Subject Name</th>
                            <th className="text-left p-2 font-mono font-semibold">Type</th>
                            <th className="text-left p-2 font-mono font-semibold">Room</th>
                            <th className="text-left p-2 font-mono font-semibold">Instructor</th>
                            <th className="text-left p-2 font-mono font-semibold">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingTemplate.template_data.slots
                            .sort((a, b) => {
                              // Sort by day, then by start time
                              if (a.day !== b.day) return a.day - b.day;
                              return a.startTime.localeCompare(b.startTime);
                            })
                            .map((slot, idx) => (
                              <tr key={idx} className="border-b border-border/50 hover:bg-muted/50">
                                <td className="p-2">
                                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][slot.day]}
                                </td>
                                <td className="p-2 font-mono">
                                  {slot.startTime} - {slot.endTime}
                                </td>
                                <td className="p-2 font-mono">{slot.subject || '-'}</td>
                                <td className="p-2">{slot.subjectName || '-'}</td>
                                <td className="p-2">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    slot.type === 'lab' 
                                      ? 'bg-purple-500/20 text-purple-300' 
                                      : 'bg-blue-500/20 text-blue-300'
                                  }`}>
                                    {slot.type === 'lab' ? 'Lab' : 'Lecture'}
                                  </span>
                                </td>
                                <td className="p-2 text-muted-foreground">{slot.room || '-'}</td>
                                <td className="p-2 text-muted-foreground">{slot.instructor || '-'}</td>
                                <td className="p-2 text-muted-foreground">
                                  {slot.rowSpan ? `${slot.rowSpan} hour${slot.rowSpan > 1 ? 's' : ''}` : '1 hour'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    No timetable slots found in this template.
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setViewingTemplate(null)}
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
