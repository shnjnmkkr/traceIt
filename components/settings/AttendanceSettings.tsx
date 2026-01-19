"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserSettings } from "@/types";
import { Settings } from "lucide-react";

interface AttendanceSettingsProps {
  settings: UserSettings;
  onChange: (settings: UserSettings) => void;
}

export function AttendanceSettings({ settings, onChange }: AttendanceSettingsProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-mono font-semibold uppercase">
          Calculation Rules
        </h3>
      </div>

      {/* Target Percentage */}
      <div>
        <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase">
          Target Attendance %
        </label>
        <input
          type="number"
          value={settings.targetPercentage}
          onChange={(e) => onChange({ ...settings, targetPercentage: Number(e.target.value) })}
          className="bg-muted rounded-lg px-3 py-2 text-sm w-20 font-mono"
          min="0"
          max="100"
        />
      </div>

      {/* Mass Bunk Counting */}
      <div>
        <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase">
          Count Mass Bunks As
        </label>
        <div className="flex flex-col gap-2">
          {[
            { value: "attended" as const, label: "Present", desc: "Boost your %" },
            { value: "absent" as const, label: "Absent", desc: "Realistic count" },
            { value: "exclude" as const, label: "Exclude", desc: "Ignore in calculation" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ ...settings, countMassBunkAs: option.value })}
              className={`text-left px-3 py-2 rounded-lg border transition-all ${
                settings.countMassBunkAs === option.value
                  ? "bg-primary/20 border-primary text-foreground"
                  : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <div className="text-xs font-mono font-semibold">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Teacher Absent Counting */}
      <div>
        <label className="text-xs font-mono text-muted-foreground mb-2 block uppercase">
          Count Teacher Absent As
        </label>
        <div className="flex flex-col gap-2">
          {[
            { value: "attended" as const, label: "Present", desc: "Mark as attended" },
            { value: "absent" as const, label: "Absent", desc: "Count against you" },
            { value: "exclude" as const, label: "Exclude", desc: "Ignore in calculation" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ ...settings, countTeacherAbsentAs: option.value })}
              className={`text-left px-3 py-2 rounded-lg border transition-all ${
                settings.countTeacherAbsentAs === option.value
                  ? "bg-primary/20 border-primary text-foreground"
                  : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <div className="text-xs font-mono font-semibold">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Inverted Mode Toggle */}
      <div className="flex items-center justify-between gap-3 p-3 bg-muted rounded-lg">
        <div className="flex-1">
          <div className="text-xs font-mono font-semibold">
            Inverted Mode
          </div>
        </div>
        <Button
          variant={settings.invertedMode ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...settings, invertedMode: !settings.invertedMode })}
          className="flex-shrink-0"
          title="Start with 100% attendance, mark absents instead of presents"
        >
          {settings.invertedMode ? "On" : "Off"}
        </Button>
      </div>

      {/* Show Analytics Toggle */}
      <div className="flex items-start justify-between gap-3 p-3 bg-muted rounded-lg">
        <div className="flex-1">
          <div className="text-xs font-mono font-semibold mb-1">
            Show Analytics
          </div>
          <div className="text-xs text-muted-foreground">
            Display charts below timetable
          </div>
        </div>
        <Button
          variant={settings.showAnalytics ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...settings, showAnalytics: !settings.showAnalytics })}
          className="flex-shrink-0"
        >
          {settings.showAnalytics ? "On" : "Off"}
        </Button>
      </div>
    </Card>
  );
}
