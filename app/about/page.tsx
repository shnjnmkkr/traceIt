"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Info,
  ArrowLeft,
  Calculator,
  Calendar,
  Clock,
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  CalendarDays,
  Users,
  UserMinus,
  FlaskConical,
  Merge,
  Layers,
  BarChart,
  Bot,
  Share2,
  ArrowUpDown,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-6 md:py-10 space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="gap-2 font-mono"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1 px-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            traceIt Guide v2.0
          </Badge>
        </div>

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Info className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-mono font-bold tracking-tight">
                  About traceIt<span className="text-primary">.</span>
                </h1>
              </div>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                Everything you need to know about attendance calculations, customized settings, timetable creation, community templates, and AI features.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full md:w-auto font-mono text-xs">
              <div className="bg-muted/60 p-3 rounded-lg border border-border text-center">
                <span className="block text-muted-foreground text-[10px] uppercase">Default Target</span>
                <span className="text-lg font-bold text-primary">75%</span>
              </div>
              <div className="bg-muted/60 p-3 rounded-lg border border-border text-center">
                <span className="block text-muted-foreground text-[10px] uppercase">Tracking</span>
                <span className="text-lg font-bold text-success">Real-Time</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Critical Rules Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="bg-warning/10 border-2 border-warning/30 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-warning font-mono font-bold text-sm">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <span>Unmarked Occurred Classes = Absent</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              In Normal Mode, any class that has already occurred without a marked status automatically counts as <strong>absent</strong> in calculations. Mark attendance regularly to keep your percentage accurate.
            </p>
          </div>

          <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-primary font-mono font-bold text-sm">
              <Clock className="w-5 h-5 flex-shrink-0" />
              <span>Upcoming Classes Don’t Count</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Future classes are excluded from calculation totals until their scheduled time has passed. Only past sessions or today’s completed classes affect your percentage.
            </p>
          </div>
        </motion.div>

        {/* Feature Grid - Responsive 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Core Mechanics */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="h-full border border-border hover:border-primary/50 transition-colors">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2 text-primary">
                  <Calculator className="w-4 h-4" />
                  Calculation Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs text-muted-foreground">
                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Weekdays Only
                  </h4>
                  <p>Saturdays and Sundays are automatically excluded. Calculations only count Monday to Friday within your semester interval.</p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Lecture vs Lab Weighting
                  </h4>
                  <ul className="list-disc ml-4 space-y-1">
                    <li><strong className="text-foreground">Lectures:</strong> Count per hour (a 2-hour lecture = 2 sessions).</li>
                    <li><strong className="text-foreground">Labs:</strong> Always count as 1 session regardless of hours.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                    Holidays Excluded
                  </h4>
                  <p>Classes marked as <em>Holiday</em> are completely excluded from both attended and total counts.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2: Inverted Mode & Bulk Mark */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="h-full border border-border hover:border-primary/50 transition-colors">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2 text-primary">
                  <RefreshCw className="w-4 h-4" />
                  Inverted Mode & Bulk Mark
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs text-muted-foreground">
                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-primary" />
                    Inverted Attendance Mode
                  </h4>
                  <p>
                    Starts every class at <strong>100% attended</strong> baseline. You only mark exceptions (absent, bunk, holiday). Ideal for students who attend most classes!
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    Mark Entire Day
                  </h4>
                  <p>
                    Quickly apply a single status (e.g. Attended or Mass Bunked) to all classes on any given date with one click.
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                    Subject Breakdown Sorting
                  </h4>
                  <p>
                    Sort your subject breakdown by <strong>↑ Attendance (Low to High)</strong>, <strong>↓ Attendance (High to Low)</strong>, or <strong>Subject Code</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 3: Community Templates */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="h-full border border-border hover:border-primary/50 transition-colors">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2 text-primary">
                  <Users className="w-4 h-4" />
                  Community Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs text-muted-foreground">
                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-primary" />
                    Share Timetables
                  </h4>
                  <p>
                    Share your custom branch, semester, or university timetable layout with fellow students in 1 click right from the top header.
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Adopt Templates
                  </h4>
                  <p>
                    Browse, upvote, and adopt community templates directly on the dashboard without resetting your account.
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    Community Rating
                  </h4>
                  <p>
                    Upvote or downvote templates so the best timetables rise to the top for everyone.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 4: AI Extraction & Management */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full border border-border hover:border-primary/50 transition-colors">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2 text-primary">
                  <Sparkles className="w-4 h-4" />
                  AI Image Extraction & Grid
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs text-muted-foreground">
                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    AI OCR Extraction
                  </h4>
                  <p>
                    Upload a photo or screenshot of your timetable. Gemini AI extracts subjects, timings, rooms, and professors.
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Single Slot Restrict
                  </h4>
                  <p>
                    AI extraction automatically picks 1 main class per time slot so overlapping duplicate slots never hide under each other.
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Merge className="w-3.5 h-3.5 text-primary" />
                    Merging & Editing Slots
                  </h4>
                  <p>
                    In Edit Mode, merge consecutive slots to create 2-hour or 3-hour classes, or edit professor name and room numbers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 5: Customized Settings */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="h-full border border-border hover:border-primary/50 transition-colors">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2 text-primary">
                  <Settings className="w-4 h-4" />
                  Customizable Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs text-muted-foreground">
                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Mass Bunks
                  </h4>
                  <p>Configure mass bunks as <em>Present</em> (boosts %), <em>Absent</em> (realistic), or <em>Exclude</em> (ignored).</p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <UserMinus className="w-3.5 h-3.5 text-primary" />
                    Teacher Absences
                  </h4>
                  <p>Configure teacher cancelled classes as <em>Present</em>, <em>Absent</em>, or <em>Exclude</em> from totals.</p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-primary" />
                    Lab Inclusion
                  </h4>
                  <p>Toggle whether practical lab sessions are included in your overall percentage calculation.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 6: AI Advisor & Analytics */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full border border-border hover:border-primary/50 transition-colors">
              <CardHeader className="border-b border-border/60 pb-3">
                <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2 text-primary">
                  <Bot className="w-4 h-4" />
                  AI Advisor & Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs text-muted-foreground">
                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                    AI Chat Assistant
                  </h4>
                  <p>
                    Ask questions like <em>"How many EE301 classes can I miss?"</em> or <em>"What is my attendance prognosis?"</em>.
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <BarChart className="w-3.5 h-3.5 text-primary" />
                    Weekly Trends & Risk Badges
                  </h4>
                  <p>
                    Track weekly progress charts and instantly see "At Risk" subjects that fall below your target threshold.
                  </p>
                </div>

                <div>
                  <h4 className="font-mono font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Attendance Wrapped
                  </h4>
                  <p>
                    Generate visual shareable summary cards of your semester stats and performance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
