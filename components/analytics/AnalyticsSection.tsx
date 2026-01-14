"use client";

import { motion } from "framer-motion";
import { OverallProgress } from "./OverallProgress";
import { SubjectBreakdown } from "./SubjectBreakdown";
import { WeeklyTrendChart } from "./WeeklyTrendChart";
import { SubjectAnalytics } from "@/types";

interface AnalyticsSectionProps {
  overall: number;
  target: number;
  subjects: SubjectAnalytics[];
  weeklyTrend: { date: string; percentage: number }[];
  includeLabsInOverall: boolean;
  onToggleLabs: (include: boolean) => void;
}

export function AnalyticsSection({ overall, target, subjects, weeklyTrend, includeLabsInOverall, onToggleLabs }: AnalyticsSectionProps) {
  // Show empty state if no data
  if (subjects.length === 0) {
    return (
      <div className="space-y-4 py-8">
        <div className="text-center">
          <h3 className="text-lg font-mono font-semibold text-muted-foreground mb-2">
            No Analytics Yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Start marking your attendance to see insights here
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Overall Progress */}
      <OverallProgress 
        percentage={overall} 
        target={target} 
        includeLabsInOverall={includeLabsInOverall}
        onToggleLabs={onToggleLabs}
      />

      {/* Subject Breakdown */}
      <SubjectBreakdown subjects={subjects} />

      {/* Weekly Trend */}
      {weeklyTrend.length > 0 && (
        <WeeklyTrendChart data={weeklyTrend} target={target} />
      )}
    </motion.div>
  );
}
