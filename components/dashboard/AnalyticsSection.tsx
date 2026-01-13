"use client";

import { Analytics } from "@/types";
import { OverallProgress } from "@/components/analytics/OverallProgress";
import { SubjectBreakdown } from "@/components/analytics/SubjectBreakdown";
import { WeeklyTrendChart } from "@/components/analytics/WeeklyTrendChart";
import { motion } from "framer-motion";

interface AnalyticsSectionProps {
  analytics: Analytics;
}

export function AnalyticsSection({ analytics }: AnalyticsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-6"
    >
      <h2 className="text-lg font-semibold font-mono flex items-center gap-2">
        <span className="text-primary">//</span> Analytics
      </h2>

      {/* Overall Progress */}
      <OverallProgress
        percentage={analytics.overall}
        target={analytics.target}
      />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubjectBreakdown subjects={analytics.subjects} />
        <WeeklyTrendChart data={analytics.weeklyTrend} target={analytics.target} />
      </div>

      {/* Removed Heatmap Calendar - was confusing */}
    </motion.div>
  );
}
