"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

interface OverallProgressProps {
  percentage: number;
  target: number;
}

export function OverallProgress({ percentage, target }: OverallProgressProps) {
  const isAboveTarget = percentage >= target;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-mono text-muted-foreground">
            <span className="text-primary">//</span> Overall Attendance
          </h3>
          <span className={`text-xs font-mono ${isAboveTarget ? "text-success" : "text-warning"}`}>
            Target: {target}%
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl font-bold font-mono"
          >
            {percentage}
          </motion.span>
          <span className="text-2xl text-muted-foreground">%</span>
        </div>

        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${isAboveTarget ? "bg-success" : "bg-warning"}`}
          />
          
          {/* Target indicator */}
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/50"
            style={{ left: `${target}%` }}
          />
        </div>

        <div className="mt-2 text-xs text-muted-foreground font-mono">
          {isAboveTarget ? (
            <span className="text-success">✓ Above target</span>
          ) : (
            <span className="text-warning">⚠ Below target ({target - percentage}% to go)</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
