"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectAnalytics } from "@/types";
import html2canvas from "html2canvas";

interface AttendanceWrappedProps {
  isOpen: boolean;
  onClose: () => void;
  overallPercentage: number;
  subjects: SubjectAnalytics[];
  semesterName: string;
  startDate: string;
  endDate: string;
}

export function AttendanceWrapped({
  isOpen,
  onClose,
  overallPercentage,
  subjects,
  semesterName,
  startDate,
  endDate,
}: AttendanceWrappedProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  // Calculate stats
  const totalClasses = subjects.reduce((sum, s) => sum + s.total, 0);
  const totalAttended = subjects.reduce((sum, s) => sum + s.attended, 0);
  const totalBunked = subjects.reduce((sum, s) => sum + s.bunked, 0);
  const bestSubject = subjects.reduce((prev, current) => 
    current.percentage > prev.percentage ? current : prev
  , subjects[0] || { name: "N/A", percentage: 0 });
  const worstSubject = subjects.reduce((prev, current) => 
    current.percentage < prev.percentage ? current : prev
  , subjects[0] || { name: "N/A", percentage: 100 });

  const slides = [
    {
      gradient: "from-purple-600 via-pink-600 to-red-600",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-white px-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <Sparkles className="w-24 h-24" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="text-5xl font-bold mb-4 text-center"
          >
            Your {new Date().getFullYear()}
          </motion.h1>
          <motion.h2
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: "spring" }}
            className="text-6xl font-black text-center leading-tight"
          >
            Attendance Wrapped
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.8, y: 0 }}
            transition={{ delay: 0.9 }}
            className="text-lg mt-8 font-medium"
          >
            {semesterName}
          </motion.p>
        </div>
      ),
    },
    {
      gradient: "from-blue-600 via-cyan-600 to-teal-600",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-white px-8">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
            className="relative"
          >
            <div className="text-9xl font-black mb-6 relative">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {overallPercentage}%
              </motion.span>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.5, duration: 0.8 }}
                className="absolute bottom-0 left-0 h-2 bg-white/30 rounded-full"
              />
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-3xl font-bold text-center mb-4"
          >
            Overall Attendance
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 1 }}
            className="text-xl text-center"
          >
            {totalAttended} / {totalClasses} classes attended
          </motion.p>
        </div>
      ),
    },
    {
      gradient: "from-green-600 via-emerald-600 to-teal-600",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-white px-8">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="mb-10 text-center"
          >
            <h2 className="text-4xl font-bold">Best Performance</h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 150 }}
            className="text-center bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-4xl font-black mb-4"
            >
              {bestSubject.name}
            </motion.p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: "spring" }}
              className="text-7xl font-black text-green-300"
            >
              {bestSubject.percentage}%
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 1.1 }}
              className="text-lg mt-6"
            >
              {bestSubject.attended} / {bestSubject.total} classes
            </motion.p>
          </motion.div>
        </div>
      ),
    },
    {
      gradient: "from-orange-600 via-red-600 to-pink-600",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-white px-8">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="mb-10 text-center"
          >
            <h2 className="text-4xl font-bold">Needs Attention</h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 150 }}
            className="text-center bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 border-white/20"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-4xl font-black mb-4"
            >
              {worstSubject.name}
            </motion.p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.9, type: "spring" }}
              className="text-7xl font-black text-orange-300"
            >
              {worstSubject.percentage}%
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 1.1 }}
              className="text-lg mt-6"
            >
              {worstSubject.attended} / {worstSubject.total} classes
            </motion.p>
          </motion.div>
        </div>
      ),
    },
    {
      gradient: "from-slate-900 via-purple-900 to-slate-900",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-white px-6 py-6">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-4"
          >
            <h2 className="text-2xl font-bold">{new Date().getFullYear()} Summary</h2>
            <p className="text-xs opacity-70 mt-1">{semesterName}</p>
            <p className="text-[10px] opacity-50 mt-0.5">
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 w-full max-w-sm"
          >
            {/* Overall */}
            <div className="text-center mb-4 pb-4 border-b border-white/20">
              <p className="text-xs opacity-70 mb-1">Overall Attendance</p>
              <p className="text-5xl font-black mb-1">{overallPercentage}%</p>
              <p className="text-[10px] opacity-60">{totalAttended} of {totalClasses} classes</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center bg-white/5 rounded-lg p-2"
              >
                <p className="text-xl font-bold text-green-300">{totalAttended}</p>
                <p className="text-[10px] opacity-70">Attended</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center bg-white/5 rounded-lg p-2"
              >
                <p className="text-xl font-bold text-red-300">{totalBunked}</p>
                <p className="text-[10px] opacity-70">Bunked</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-center bg-white/5 rounded-lg p-2"
              >
                <p className="text-xl font-bold text-purple-300">{subjects.length}</p>
                <p className="text-[10px] opacity-70">Subjects</p>
              </motion.div>
            </div>

            {/* Performance Indicators */}
            <div className="space-y-2 mb-4 pb-4 border-b border-white/20">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="bg-white/5 rounded-lg p-2"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] opacity-70">Best Performance</span>
                  <span className="text-xs font-semibold text-green-300">{bestSubject.percentage}%</span>
                </div>
                <p className="text-xs font-medium truncate">{bestSubject.name}</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="bg-white/5 rounded-lg p-2"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] opacity-70">Needs Attention</span>
                  <span className="text-xs font-semibold text-orange-300">{worstSubject.percentage}%</span>
                </div>
                <p className="text-xs font-medium truncate">{worstSubject.name}</p>
              </motion.div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-center bg-white/5 rounded-lg p-2"
              >
                <p className="text-lg font-bold">{Math.round((totalAttended/totalClasses) * 100)}%</p>
                <p className="text-[10px] opacity-70">Attendance Rate</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="text-center bg-white/5 rounded-lg p-2"
              >
                <p className="text-lg font-bold">{totalClasses - totalAttended}</p>
                <p className="text-[10px] opacity-70">Classes Missed</p>
              </motion.div>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.2 }}
            className="text-[10px] mt-4 text-center"
          >
            Tracked with traceIt
          </motion.p>
        </div>
      ),
    },
    {
      gradient: "from-gray-900 via-gray-800 to-black",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-white px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="mb-8"
            >
              <Share2 className="w-20 h-20 mx-auto mb-6" />
            </motion.div>
            <h2 className="text-4xl font-bold mb-4">Share Your Stats</h2>
            <p className="text-lg mb-8 opacity-80">
              Ready to share your attendance journey?
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 rounded-lg p-6 mb-8"
            >
              <p className="text-sm opacity-70 mb-2">Your shareable card will include:</p>
              <ul className="text-sm space-y-1 opacity-90">
                <li>Overall attendance percentage</li>
                <li>Classes attended & bunked</li>
                <li>Best & subjects needing attention</li>
                <li>Link to traceIt</li>
              </ul>
            </motion.div>
            <div className="text-xs opacity-50">
              <p>Powered by traceIt</p>
              <p className="mt-1">Made by SM</p>
            </div>
          </motion.div>
        </div>
      ),
    },
  ];

  const handleDownload = async () => {
    // Temporarily switch to summary slide (slide 4 - index 4)
    const originalSlide = currentSlide;
    setCurrentSlide(4);
    
    // Wait for slide transition and animations to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!cardRef.current) return;

    try {
      // Hide navigation dots temporarily
      const progressDots = cardRef.current.querySelector('.progress-dots');
      if (progressDots) {
        (progressDots as HTMLElement).style.display = 'none';
      }

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Restore navigation dots
      if (progressDots) {
        (progressDots as HTMLElement).style.display = 'flex';
      }

      const link = document.createElement("a");
      link.download = `traceIt-attendance-${new Date().getFullYear()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      // Switch back to original slide
      setCurrentSlide(originalSlide);
    } catch (error) {
      console.error("Error downloading image:", error);
      setCurrentSlide(originalSlide);
    }
  };

  const handleShare = async () => {
    // Temporarily switch to summary slide (slide 4 - index 4)
    const originalSlide = currentSlide;
    setCurrentSlide(4);
    
    // Wait for slide transition and animations to complete
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (!cardRef.current) return;

    try {
      // Hide navigation dots temporarily
      const progressDots = cardRef.current.querySelector('.progress-dots');
      if (progressDots) {
        (progressDots as HTMLElement).style.display = 'none';
      }

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Restore navigation dots
      if (progressDots) {
        (progressDots as HTMLElement).style.display = 'flex';
      }

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], `traceIt-attendance-${new Date().getFullYear()}.png`, {
          type: "image/png",
        });

        const shareText = `I track my attendance with traceIt!\n\n${new Date().getFullYear()} Summary:\n${overallPercentage}% overall attendance\n${totalAttended}/${totalClasses} classes attended\n\nCheck it out: ${window.location.origin}`;

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "My Attendance Stats",
            text: shareText,
          });
        } else if (navigator.share) {
          // Share without image if files not supported
          await navigator.share({
            title: "My Attendance Stats",
            text: shareText,
          });
        } else {
          // Fallback to download
          handleDownload();
        }
        
        // Switch back to original slide
        setCurrentSlide(originalSlide);
      }, 'image/png');
    } catch (error) {
      console.error("Error sharing:", error);
      setCurrentSlide(originalSlide);
      handleDownload();
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:bg-white/10"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Card */}
        <div
          ref={cardRef}
          className="aspect-[9/16] w-full rounded-2xl overflow-hidden shadow-2xl relative"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].gradient}`}
            >
              {slides[currentSlide].content}
            </motion.div>
          </AnimatePresence>

          {/* Progress Dots */}
          <div className="progress-dots absolute bottom-6 left-0 right-0 flex justify-center gap-2">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlide ? "w-8 bg-white" : "w-2 bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {currentSlide === slides.length - 1 ? (
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                className="bg-white text-black hover:bg-white/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={handleShare}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          ) : (
            <Button
              onClick={nextSlide}
              className="bg-white text-black hover:bg-white/90"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
