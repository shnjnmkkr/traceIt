"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { getStatusColor, getStatusLabel } from "@/lib/utils";

const STATUSES = [
  { key: "attended", label: "Attended" },
  { key: "absent", label: "Absent" },
  { key: "bunk", label: "Bunked" },
  { key: "teacher_absent", label: "Teacher Absent" },
  { key: "holiday", label: "Holiday" },
  { key: "upcoming", label: "Upcoming" },
  { key: "unmarked", label: "Not Marked" },
];

export function AttendanceLegend() {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">
          Status Legend
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATUSES.map((status, idx) => (
            <motion.div
              key={status.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-2"
            >
              <div
                className="w-3 h-3 rounded-sm border-2"
                style={{
                  backgroundColor: `${getStatusColor(status.key)}20`,
                  borderColor: getStatusColor(status.key),
                }}
              />
              <span className="text-xs text-muted-foreground font-mono">
                {status.label}
              </span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
