"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubjectAnalytics } from "@/types";
import { getStatusColor } from "@/lib/utils";

interface SubjectBreakdownProps {
  subjects: SubjectAnalytics[];
}

type SortOption = "attendance-asc" | "attendance-desc" | "code";

export function SubjectBreakdown({ subjects }: SubjectBreakdownProps) {
  const [sortBy, setSortBy] = useState<SortOption>("attendance-asc");

  const sortedSubjects = useMemo(() => {
    return [...subjects].sort((a, b) => {
      if (sortBy === "attendance-asc") {
        return a.percentage - b.percentage || a.code.localeCompare(b.code);
      }
      if (sortBy === "attendance-desc") {
        return b.percentage - a.percentage || a.code.localeCompare(b.code);
      }
      if (sortBy === "code") {
        return a.code.localeCompare(b.code);
      }
      return 0;
    });
  }, [subjects, sortBy]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6">
        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
          Subject Breakdown
        </CardTitle>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none bg-muted border border-border rounded-lg px-3 py-1.5 pr-8 text-xs font-mono text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer hover:bg-muted/80 transition-colors"
          >
            <option value="attendance-asc">↑ Attendance</option>
            <option value="attendance-desc">↓ Attendance</option>
            <option value="code">Subject Code</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedSubjects.map((subject, idx) => (
          <motion.div
            key={subject.code}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold">
                    {subject.code}
                  </span>
                  <Badge
                    variant={subject.percentage >= 75 ? "success" : "warning"}
                    className="text-xs"
                  >
                    {subject.percentage}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {subject.name}
                </p>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {subject.attended}/{subject.total}
              </div>
            </div>

            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${subject.percentage}%` }}
                transition={{ duration: 0.8, delay: idx * 0.05 }}
                style={{
                  backgroundColor: subject.percentage >= 75 ? getStatusColor("attended") : getStatusColor("warning"),
                }}
                className="h-full rounded-full"
              />
            </div>

            <div className="flex gap-3 text-xs text-muted-foreground font-mono">
              <span style={{ color: getStatusColor("attended") }}>A: {subject.attended}</span>
              <span style={{ color: getStatusColor("bunk") }}>B: {subject.bunked}</span>
              <span style={{ color: getStatusColor("absent") }}>L: {subject.leaves}</span>
              <span style={{ color: getStatusColor("teacher_absent") }}>T: {subject.teacherAbsent}</span>
            </div>

            {/* Show separate lab and lecture stats */}
            {(subject.lab || subject.lecture) && (
              <div className={`flex gap-2 mt-2 ${subject.lab && subject.lecture ? '' : 'justify-start'}`}>
                {subject.lab && (
                  <div className="flex-1 bg-muted/50 rounded px-2 py-1.5 border border-border">
                    <div className="text-xs font-mono text-muted-foreground mb-0.5">Lab</div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold">{subject.lab.percentage}%</span>
                      <span className="text-xs text-muted-foreground font-mono">{subject.lab.attended}/{subject.lab.total}</span>
                    </div>
                    <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
                      <span style={{ color: getStatusColor("attended") }}>A: {subject.lab.attended}</span>
                      <span style={{ color: getStatusColor("bunk") }}>B: {subject.lab.bunked}</span>
                      <span style={{ color: getStatusColor("absent") }}>L: {subject.lab.leaves}</span>
                      <span style={{ color: getStatusColor("teacher_absent") }}>T: {subject.lab.teacherAbsent}</span>
                    </div>
                  </div>
                )}
                {subject.lecture && (
                  <div className="flex-1 bg-muted/50 rounded px-2 py-1.5 border border-border">
                    <div className="text-xs font-mono text-muted-foreground mb-0.5">Lecture</div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-semibold">{subject.lecture.percentage}%</span>
                      <span className="text-xs text-muted-foreground font-mono">{subject.lecture.attended}/{subject.lecture.total}</span>
                    </div>
                    <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
                      <span style={{ color: getStatusColor("attended") }}>A: {subject.lecture.attended}</span>
                      <span style={{ color: getStatusColor("bunk") }}>B: {subject.lecture.bunked}</span>
                      <span style={{ color: getStatusColor("absent") }}>L: {subject.lecture.leaves}</span>
                      <span style={{ color: getStatusColor("teacher_absent") }}>T: {subject.lecture.teacherAbsent}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

