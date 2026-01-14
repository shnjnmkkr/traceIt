"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

interface OverallProgressProps {
  percentage: number;
  target: number;
  includeLabsInOverall: boolean;
  onToggleLabs: (include: boolean) => void;
}

export function OverallProgress({ percentage, target, includeLabsInOverall, onToggleLabs }: OverallProgressProps) {
  const isAboveTarget = percentage >= target;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-mono text-muted-foreground">
              <span className="text-primary">//</span> Overall Attendance
            </h3>
            <div className="relative group">
              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-background border border-border rounded-lg text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                {includeLabsInOverall 
                  ? "Includes both lectures and lab sessions" 
                  : "Only includes lecture sessions"}
              </div>
            </div>
          </div>
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

        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-mono">
            {isAboveTarget ? (
              <span className="text-success">✓ Above target</span>
            ) : (
              <span className="text-warning">⚠ Below target ({target - percentage}% to go)</span>
            )}
          </div>
          
          {/* Toggle for including labs */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono">Include labs</span>
            <button
              onClick={() => onToggleLabs(!includeLabsInOverall)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                includeLabsInOverall ? 'bg-primary' : 'bg-muted'
              }`}
              aria-label="Toggle include labs in overall attendance"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-background transition-transform ${
                  includeLabsInOverall ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
