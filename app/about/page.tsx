"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Info, ArrowLeft, BookOpen, Calculator, Calendar, Clock, Settings, AlertCircle, CheckCircle, XCircle, RefreshCw, CalendarDays, Users, UserMinus, FlaskConical, Plus, Edit, Merge, Layers, CircleCheck, CalendarCheck, BarChart, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 py-12">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-2">
            <CardHeader className="border-b border-border pb-6">
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-primary mt-1" />
                <div className="flex-1">
                  <h1 className="text-2xl font-mono font-bold">
                    About traceIt<span className="text-primary">.</span>
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Understanding how attendance is calculated
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-8">
              {/* Critical Rules First */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <h2 className="text-xl font-mono font-bold">Critical Calculation Rules</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                          Unmarked Classes Count as Absent
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          If a class has occurred and you haven't marked it, it's automatically counted as absent in your attendance percentage. This is the most important rule to remember. Mark your attendance regularly to maintain accurate records.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                          Upcoming Classes Don't Count
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Classes that haven't occurred yet are automatically excluded from attendance calculations, even if you manually set their status. Only classes that have already happened (past dates) or are happening today (if the class start time has passed) are counted. This ensures your percentage reflects only actual classes that have taken place.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Core Calculation Mechanics */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-mono font-bold">How Classes Are Counted</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                          Weekdays Only
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Saturday and Sunday are automatically excluded from all attendance calculations. Only weekdays (Monday through Friday) within your semester date range are considered.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                          Lab vs Lecture Weighting
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          Different class types are weighted differently in calculations:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1.5 ml-4 list-disc">
                          <li><strong className="text-foreground">Lab sessions:</strong> Always count as 1 session regardless of duration. A 2-hour lab counts as 1 session.</li>
                          <li><strong className="text-foreground">Lecture sessions:</strong> Count per hour based on duration. A 2-hour lecture counts as 2 sessions, a 1-hour lecture counts as 1 session.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                          Holidays Are Completely Excluded
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Classes marked as holidays are completely excluded from attendance calculations. They don't count as attended, absent, or total classes. They're simply ignored in all calculations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Customizable Settings */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-mono font-bold">Customizable Rules</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CalendarDays className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">Mark Entire Day</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Use the "Mark Entire Day" button (calendar icon) in the left panel to quickly mark all classes on a specific day with the same status. This is useful when you know you were absent or present for the entire day. Select the date and status, then confirm. All classes scheduled for that day will be marked accordingly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Users className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                          Mass Bunks
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          When multiple students bunk a class together, you can choose how it's counted:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1.5 ml-4 list-disc">
                          <li><strong className="text-foreground">Present:</strong> Counts as attended, boosting your percentage</li>
                          <li><strong className="text-foreground">Absent:</strong> Counts as absent, realistic but lowers percentage</li>
                          <li><strong className="text-foreground">Exclude:</strong> Not counted in total classes or attendance, completely ignored</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <UserMinus className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                          Teacher Absent
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          When a teacher is absent, you can configure how it affects your attendance:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1.5 ml-4 list-disc">
                          <li><strong className="text-foreground">Present:</strong> Counts as attended, doesn't affect your percentage negatively</li>
                          <li><strong className="text-foreground">Absent:</strong> Counts as absent, affects your percentage</li>
                          <li><strong className="text-foreground">Exclude:</strong> Not counted in calculations, completely ignored</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FlaskConical className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                          Include Labs in Overall Percentage
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          By default, lab sessions are included in your overall attendance percentage. You can toggle this off to calculate overall attendance based only on lectures, while lab attendance is tracked separately per subject.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Timetable Creation & Editing */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-mono font-bold">Creating and Editing Your Timetable</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Plus className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">Creating a New Timetable</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          You have three ways to create your timetable:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-2 ml-4 list-disc mb-3">
                          <li><strong className="text-foreground">Manual Creation:</strong> Click on empty cells in the timetable grid to add classes. Fill in subject code, subject name, and select whether it's a lecture or lab.</li>
                          <li><strong className="text-foreground">Community Templates:</strong> Browse templates shared by other students. Click "Show Templates" to view available templates. Select a template to load it into your timetable, then customize as needed.</li>
                          <li><strong className="text-foreground">AI Image Extraction (Beta):</strong> Upload an image of your timetable (screenshot or photo). The AI will automatically extract subject codes, names, timings, and days. Review and edit the extracted information before saving.</li>
                        </ul>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          Set your semester start and end dates, timetable name, semester name, and section before creating. These dates determine which classes are counted in attendance calculations.
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">Sharing Templates:</strong> After creating your timetable, you can share it with the community. Click the share button, fill in the template name, and optionally add your name. Other students can then browse and use your template when creating their timetables.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Edit className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">Edit Mode: Modifying Your Timetable</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          Click the "Edit" button above your timetable to enter edit mode. In edit mode, you can modify your timetable structure:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-2 ml-4 list-disc">
                          <li><strong className="text-foreground">Editing a Slot:</strong> Click once on a slot to select it (highlighted in yellow), then click again to edit it. You'll see input fields for subject name and subject code, plus buttons to toggle between lecture and lab types.</li>
                          <li><strong className="text-foreground">Adding a Slot:</strong> Click on any empty cell (dashed border) to open the add dialog. Fill in subject code, subject name, and select lecture or lab type.</li>
                          <li><strong className="text-foreground">Deleting a Slot:</strong> While editing a slot, click the trash icon button. Alternatively, if you click on an empty slot (one with no subject code or name) while editing it, it will be automatically deleted.</li>
                          <li><strong className="text-foreground">Saving Changes:</strong> Changes are saved automatically as you edit. Click the checkmark button or click outside the editing slot to finish editing. Click "Exit Edit" to leave edit mode.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Merge className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">Merging Slots: Creating Multi-Hour Classes</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          To create classes that span multiple hours (like 2-hour or 3-hour lectures), use the merge feature in edit mode:
                        </p>
                        <ol className="text-xs text-muted-foreground space-y-1.5 ml-4 list-decimal">
                          <li>Click the "Edit" button to enter edit mode.</li>
                          <li>Click on a slot to select it, then click again to edit it.</li>
                          <li>If the next time slot is empty, click the "Merge" button to extend the slot.</li>
                          <li>The slot will now span multiple hours. You can merge multiple consecutive hours as long as the next cell is empty.</li>
                        </ol>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                          Merged slots are counted as multiple sessions in attendance calculations based on their duration.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Layers className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">Slot Types and Merging</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          When creating or editing a slot, you can specify whether it's a lecture or lab. Lectures count per hour in attendance calculations (a 2-hour lecture counts as 2 sessions), while labs always count as 1 session regardless of duration (a 2-hour lab counts as 1 session).
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          To create multi-hour classes (like 2-hour or 3-hour lectures), use the merge feature in edit mode: Click "Edit", then click on a slot to select and edit it. If the next time slot is empty, click the "Merge" button to extend the slot. You can merge multiple consecutive hours as long as the next cell is empty. Merged slots are counted as multiple sessions based on their duration.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Marking Attendance */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-mono font-bold">Marking Attendance</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CircleCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">Normal Mode: Marking Individual Classes</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          When not in edit mode, clicking on a class slot opens a dialog where you can mark attendance:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1.5 ml-4 list-disc">
                          <li><strong className="text-foreground">Attended:</strong> You were present for the class.</li>
                          <li><strong className="text-foreground">Absent:</strong> You were not present (counts against your attendance).</li>
                          <li><strong className="text-foreground">Mass Bunked:</strong> Multiple students bunked together. How this is counted depends on your settings.</li>
                          <li><strong className="text-foreground">Teacher Absent:</strong> The teacher was absent. How this is counted depends on your settings.</li>
                          <li><strong className="text-foreground">Holiday:</strong> The class didn't happen due to a holiday. Completely excluded from calculations.</li>
                        </ul>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                          Navigate through weeks using the week selector arrows or "TODAY" button. Each class slot shows its current status with a colored badge. Unmarked classes that have occurred are automatically counted as absent.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CalendarCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">Bulk Marking: Marking Entire Days</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Use the "Mark Entire Day" button (calendar icon) to quickly mark all classes on a specific day with the same status. This is useful when you know you were absent or present for the entire day. Select the date and status, then confirm. All classes scheduled for that day will be marked accordingly.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Analytics & Other Features */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-mono font-bold">Analytics and Additional Features</h2>
                </div>
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <BarChart className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">Viewing Analytics</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Enable analytics in settings to see detailed statistics below your timetable. View your overall attendance percentage, subject-wise breakdowns, weekly trends, heatmap calendar, and identify which subjects need attention. You can also view and share visual summary cards showing your attendance progress.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Bot className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-mono font-semibold text-foreground mb-2">AI Advisor</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Get personalized attendance advice from the AI advisor. Ask questions about your attendance status, improvement strategies, or how many classes you can miss while maintaining your target percentage. The AI has access to your timetable and attendance data to provide contextual advice.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Important Reminders */}
              <section>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-mono font-semibold text-foreground mb-2">
                        Key Reminders
                      </h3>
                      <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
                        <li>
                          Attendance calculations only include classes that have already occurred. Future classes don't affect your percentage, even if marked.
                        </li>
                        <li>
                          Unmarked classes that have occurred are automatically counted as absent. Mark attendance regularly to maintain accuracy.
                        </li>
                        <li>
                          Your percentage updates in real-time as you mark classes. Calculations respect your settings for mass bunks, teacher absences, and lab inclusion.
                        </li>
                        <li>
                          The semester start and end dates you set determine the calculation range. Only classes within this range are considered.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
