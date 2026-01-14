"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, TrendingUp, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";

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
  userVote: 'upvote' | 'downvote' | null;
  template_data: any;
}

interface CommunityTemplatesProps {
  onSelectTemplate: (template: CommunityTemplate) => void;
}

export function CommunityTemplates({ onSelectTemplate }: CommunityTemplatesProps) {
  const [templates, setTemplates] = useState<CommunityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [votingTemplateId, setVotingTemplateId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"usage" | "votes" | "newest">("usage");

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    // Re-fetch when sort changes
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/community-templates?limit=50&sortBy=${sortBy}`);
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (e: React.MouseEvent, templateId: string, voteType: 'upvote' | 'downvote') => {
    e.stopPropagation(); // Prevent card click
    
    if (votingTemplateId) return; // Prevent double clicks
    
    setVotingTemplateId(templateId);
    
    try {
      const response = await fetch('/api/community-templates/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, voteType }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh templates to get updated vote counts
        await fetchTemplates();
      } else {
        console.error('Vote failed:', data.error);
      }
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setVotingTemplateId(null);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.university?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.course?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUse = async (template: CommunityTemplate) => {
    setSelectedId(template.id);
    
    // Increment usage count
    try {
      await fetch('/api/community-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });
    } catch (error) {
      console.error('Error updating usage count:', error);
    }

    onSelectTemplate(template);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-mono font-semibold text-sm uppercase tracking-wider">
              Community Templates
            </h2>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "usage" | "votes" | "newest")}
              className="appearance-none bg-muted border border-border rounded-lg px-3 py-1.5 pr-8 text-xs font-mono text-foreground outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="usage">Most Used</option>
              <option value="votes">Most Upvoted</option>
              <option value="newest">Most Recent</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-muted rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Loading templates...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {searchQuery ? 'No templates found' : 'No community templates yet'}
          </div>
        ) : (
          filteredTemplates.map((template, idx) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className={`p-3 transition-all hover:border-primary ${
                  selectedId === template.id ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 
                    className="font-mono font-semibold text-sm cursor-pointer flex-1"
                    onClick={() => handleUse(template)}
                  >
                    {template.name}
                  </h3>
                  {selectedId === template.id && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
                
                {template.description && (
                  <p 
                    className="text-xs text-muted-foreground mb-2 line-clamp-2 cursor-pointer"
                    onClick={() => handleUse(template)}
                  >
                    {template.description}
                  </p>
                )}

                <div 
                  className="flex flex-wrap gap-1 mb-2 cursor-pointer"
                  onClick={() => handleUse(template)}
                >
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

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Voting buttons */}
                    <div className="flex items-center gap-1 border border-border rounded-lg overflow-hidden">
                      <button
                        onClick={(e) => handleVote(e, template.id, 'upvote')}
                        disabled={votingTemplateId === template.id}
                        className={`p-1 transition-colors ${
                          template.userVote === 'upvote'
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                        title="Upvote"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] px-1 min-w-[20px] text-center">
                        {(template.upvotes || 0) - (template.downvotes || 0)}
                      </span>
                      <button
                        onClick={(e) => handleVote(e, template.id, 'downvote')}
                        disabled={votingTemplateId === template.id}
                        className={`p-1 transition-colors ${
                          template.userVote === 'downvote'
                            ? 'bg-destructive text-destructive-foreground'
                            : 'hover:bg-muted'
                        }`}
                        title="Downvote"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div 
                    className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer"
                    onClick={() => handleUse(template)}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {template.usage_count || 0} uses
                  </div>
                </div>

                <div 
                  className="text-[10px] text-muted-foreground mt-2 cursor-pointer"
                  onClick={() => handleUse(template)}
                >
                  by {template.creator_name}
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Templates shared by the traceIt community
        </p>
      </div>
    </div>
  );
}
