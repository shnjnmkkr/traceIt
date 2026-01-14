"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, Upload, Send, ArrowLeft, CheckCircle, Lightbulb, AlertTriangle, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ReportBugPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState<"bug" | "feature">("bug");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "ui",
    severity: "medium",
    email: "",
    expectedBehavior: "",
    actualBehavior: "",
    stepsToReproduce: "",
    deviceInfo: "",
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Auto-capture device info
  useEffect(() => {
    const deviceInfo = `Browser: ${navigator.userAgent}\nScreen: ${window.screen.width}x${window.screen.height}\nPlatform: ${navigator.platform}`;
    setFormData(prev => ({ ...prev, deviceInfo }));
  }, []);

  const bugCategories = [
    { value: "ui", label: "UI/UX Issue" },
    { value: "functionality", label: "Functionality Bug" },
    { value: "performance", label: "Performance Issue" },
    { value: "data", label: "Data/Calculation Error" },
    { value: "auth", label: "Login/Authentication" },
    { value: "timetable", label: "Timetable Creation" },
    { value: "attendance", label: "Attendance Tracking" },
    { value: "ai", label: "AI Advisor" },
    { value: "mobile", label: "Mobile/Responsive" },
    { value: "other", label: "Other" },
  ];

  const featureCategories = [
    { value: "timetable", label: "Timetable Features" },
    { value: "attendance", label: "Attendance Features" },
    { value: "analytics", label: "Analytics & Insights" },
    { value: "ai", label: "AI Enhancements" },
    { value: "ui", label: "UI/UX Improvement" },
    { value: "integration", label: "Integration" },
    { value: "notification", label: "Notifications" },
    { value: "export", label: "Export/Import" },
    { value: "other", label: "Other" },
  ];

  const severityLevels = [
    { value: "low", label: "Low", description: "Minor issue, doesn't affect usage", color: "text-blue-500" },
    { value: "medium", label: "Medium", description: "Noticeable but workaround exists", color: "text-yellow-500" },
    { value: "high", label: "High", description: "Blocks key functionality", color: "text-orange-500" },
    { value: "critical", label: "Critical", description: "App is unusable", color: "text-red-500" },
  ];

  const categories = reportType === "bug" ? bugCategories : featureCategories;

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("type", reportType);
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("deviceInfo", formData.deviceInfo);
      
      if (reportType === "bug") {
        formDataToSend.append("severity", formData.severity);
        formDataToSend.append("expectedBehavior", formData.expectedBehavior);
        formDataToSend.append("actualBehavior", formData.actualBehavior);
        formDataToSend.append("stepsToReproduce", formData.stepsToReproduce);
      }
      
      if (screenshot) {
        formDataToSend.append("screenshot", screenshot);
      }

      const response = await fetch("/api/report-bug", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error(`Failed to submit ${reportType} report`);
      }

      setIsSubmitted(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(`Failed to submit ${reportType} report. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
          </motion.div>
          <h1 className="text-3xl font-mono font-bold mb-3">Thank You!</h1>
          <p className="text-muted-foreground mb-2">
            Your {reportType === "bug" ? "bug report" : "feature suggestion"} has been submitted successfully.
          </p>
          <p className="text-sm text-muted-foreground">
            We appreciate you taking the time to help us improve traceIt. We'll review your submission and get back to you soon!
          </p>
        </motion.div>
      </div>
    );
  }

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
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {reportType === "bug" ? (
                    <Bug className="w-6 h-6 text-primary mt-1" />
                  ) : (
                    <Lightbulb className="w-6 h-6 text-primary mt-1" />
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-mono font-bold">
                      {reportType === "bug" ? "Report a Bug" : "Suggest a Feature"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      {reportType === "bug" 
                        ? "Help us improve traceIt by reporting issues you encounter"
                        : "Share your ideas to make traceIt even better"}
                    </p>
                  </div>
                </div>

                {/* Type Toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                  <button
                    type="button"
                    onClick={() => setReportType("bug")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                      reportType === "bug"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Bug className="w-4 h-4" />
                    Report Bug
                  </button>
                  <button
                    type="button"
                    onClick={() => setReportType("feature")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-all ${
                      reportType === "feature"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    Suggest Feature
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <AnimatePresence mode="wait">
                <motion.form
                  key={reportType}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-mono font-semibold mb-2">
                      {reportType === "bug" ? "Bug Title" : "Feature Title"} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={reportType === "bug" ? "Brief description of the bug" : "Brief description of your feature idea"}
                      required
                      className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary border border-border"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-mono font-semibold mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all text-center ${
                            formData.category === cat.value
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="text-xs font-medium">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Severity (Bug only) */}
                  {reportType === "bug" && (
                    <div>
                      <label className="block text-sm font-mono font-semibold mb-2">
                        Severity <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {severityLevels.map((level) => (
                          <button
                            key={level.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, severity: level.value })}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              formData.severity === level.value
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className={`text-xs font-bold ${level.color}`}>{level.label}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{level.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-mono font-semibold mb-2">
                      {reportType === "bug" ? "What happened?" : "Describe your idea"} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={reportType === "bug" 
                        ? "Describe the bug in detail..."
                        : "Explain your feature idea and how it would improve traceIt..."}
                      required
                      rows={5}
                      className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary border border-border resize-none"
                    />
                  </div>

                  {/* Bug-specific fields */}
                  {reportType === "bug" && (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-mono font-semibold mb-2">
                            Expected Behavior
                          </label>
                          <textarea
                            value={formData.expectedBehavior}
                            onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
                            placeholder="What should have happened?"
                            rows={3}
                            className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary border border-border resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-mono font-semibold mb-2">
                            Actual Behavior
                          </label>
                          <textarea
                            value={formData.actualBehavior}
                            onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
                            placeholder="What actually happened?"
                            rows={3}
                            className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary border border-border resize-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-mono font-semibold mb-2">
                          Steps to Reproduce
                        </label>
                        <textarea
                          value={formData.stepsToReproduce}
                          onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
                          placeholder="1. Go to...\n2. Click on...\n3. See error..."
                          rows={4}
                          className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary border border-border resize-none font-mono"
                        />
                      </div>
                    </>
                  )}

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-mono font-semibold mb-2">
                      Your Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your.email@example.com"
                      required
                      className="w-full bg-muted rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary border border-border"
                    />
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      We'll use this to follow up on your submission
                    </p>
                  </div>

                  {/* Screenshot Upload */}
                  <div>
                    <label className="block text-sm font-mono font-semibold mb-2">
                      {reportType === "bug" ? "Screenshot (Highly Recommended)" : "Mockup/Screenshot (Optional)"}
                    </label>
                    <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                      screenshot 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleScreenshotChange}
                        className="hidden"
                        id="screenshot"
                      />
                      <label htmlFor="screenshot" className="cursor-pointer">
                        {screenshot ? (
                          <>
                            <CheckCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
                            <p className="text-sm font-medium text-foreground mb-1">
                              {screenshot.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Click to change
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                            <p className="text-sm font-medium text-foreground mb-1">
                              Click to upload an image
                            </p>
                            <p className="text-xs text-muted-foreground">
                              PNG, JPG, GIF up to 10MB
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">
                          {reportType === "bug" ? "Tips for Bug Reports:" : "Tips for Feature Suggestions:"}
                        </p>
                        {reportType === "bug" ? (
                          <>
                            <p>• Include screenshots to help us understand the issue</p>
                            <p>• Describe what you expected vs what actually happened</p>
                            <p>• Mention if the issue is consistent or random</p>
                          </>
                        ) : (
                          <>
                            <p>• Explain the problem your feature would solve</p>
                            <p>• Describe how you envision it working</p>
                            <p>• Share any examples from other apps if relevant</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 text-base font-mono"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Submit {reportType === "bug" ? "Bug Report" : "Feature Suggestion"}
                      </>
                    )}
                  </Button>
                </motion.form>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
