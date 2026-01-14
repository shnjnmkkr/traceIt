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
  userName?: string;
  userEmail?: string;
}

export function AttendanceWrapped({
  isOpen,
  onClose,
  overallPercentage,
  subjects,
  semesterName,
  startDate,
  endDate,
  userName,
  userEmail,
}: AttendanceWrappedProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const summaryCardRef = useRef<HTMLDivElement>(null);
  
  // Get display name (use name if available, otherwise email, otherwise "Student")
  const displayName = userName || userEmail?.split('@')[0] || 'Student';

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
            <div className="text-7xl font-black mb-6 relative">
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
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-semibold mb-2 text-white/90"
            >
              {displayName}'s
            </motion.p>
            <h2 className="text-2xl font-bold">{new Date().getFullYear()} Summary</h2>
            <p className="text-xs opacity-70 mt-1">{semesterName}</p>
            <p className="text-[10px] opacity-50 mt-0.5">
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </motion.div>
          
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={isCapturing ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
                transition={isCapturing ? { duration: 0 } : { delay: 0.3 }}
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
                animate={isCapturing ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={isCapturing ? { duration: 0 } : { delay: 0.5 }}
                className="text-center bg-white/5 rounded-lg p-2"
              >
                <p className="text-xl font-bold text-green-300">{totalAttended}</p>
                <p className="text-[10px] opacity-70">Attended</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isCapturing ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={isCapturing ? { duration: 0 } : { delay: 0.6 }}
                className="text-center bg-white/5 rounded-lg p-2"
              >
                <p className="text-xl font-bold text-red-300">{totalBunked}</p>
                <p className="text-[10px] opacity-70">Bunked</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={isCapturing ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={isCapturing ? { duration: 0 } : { delay: 0.7 }}
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
                animate={isCapturing ? { opacity: 1 } : { opacity: 1 }}
                transition={isCapturing ? { duration: 0 } : { delay: 0.8 }}
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
                animate={isCapturing ? { opacity: 1 } : { opacity: 1 }}
                transition={isCapturing ? { duration: 0 } : { delay: 0.9 }}
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
                animate={isCapturing ? { opacity: 1 } : { opacity: 1 }}
                transition={isCapturing ? { duration: 0 } : { delay: 1 }}
                className="text-center bg-white/5 rounded-lg p-2"
              >
                <p className="text-lg font-bold">{Math.round((totalAttended/totalClasses) * 100)}%</p>
                <p className="text-[10px] opacity-70">Attendance Rate</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={isCapturing ? { opacity: 1 } : { opacity: 1 }}
                transition={isCapturing ? { duration: 0 } : { delay: 1.1 }}
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
    if (!cardRef.current) return;
    
    setIsCapturing(true);
    const originalSlide = currentSlide;
    
    // Switch to summary slide (slide 4 - index 4)
    setCurrentSlide(4);
    
    // Wait for slide transition (300ms) + all animations to complete (max delay is 1.2s) + extra buffer
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Hide navigation dots and any other UI elements
      const progressDots = cardRef.current.querySelector('.progress-dots');
      if (progressDots) {
        (progressDots as HTMLElement).style.display = 'none';
      }

      // Disable all animations by adding a class
      cardRef.current.classList.add('capturing');
      
      // Wait a bit more to ensure everything is static
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 3, // Higher scale for better quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight,
      });

      // Restore everything
      cardRef.current.classList.remove('capturing');
      if (progressDots) {
        (progressDots as HTMLElement).style.display = 'flex';
      }

      const link = document.createElement("a");
      link.download = `traceIt-${displayName}-attendance-${new Date().getFullYear()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      
      // Switch back to original slide
      setCurrentSlide(originalSlide);
    } catch (error) {
      console.error("Error downloading image:", error);
      setCurrentSlide(originalSlide);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    
    setIsCapturing(true);
    const originalSlide = currentSlide;
    
    // Switch to summary slide (slide 4 - index 4)
    setCurrentSlide(4);
    
    // Wait for slide transition (300ms) + all animations to complete (max delay is 1.2s) + extra buffer
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      // Hide navigation dots and any other UI elements
      const progressDots = cardRef.current.querySelector('.progress-dots');
      if (progressDots) {
        (progressDots as HTMLElement).style.display = 'none';
      }

      // Disable all animations by adding a class
      cardRef.current.classList.add('capturing');
      
      // Force browser reflow and repaint to ensure everything is rendered
      void cardRef.current.offsetHeight; // Force reflow
      
      // Wait for multiple animation frames to ensure browser has painted final state
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Additional small delay to ensure everything is fully painted
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#000000',
        scale: 3, // Higher scale for better quality
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure all text is visible in the cloned document
          const clonedCard = clonedDoc.querySelector('[class*="aspect-[9/16]"]');
          if (clonedCard) {
            (clonedCard as HTMLElement).style.visibility = 'visible';
            (clonedCard as HTMLElement).style.opacity = '1';
          }
        },
      });

      // Restore everything
      cardRef.current.classList.remove('capturing');
      if (progressDots) {
        (progressDots as HTMLElement).style.display = 'flex';
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsCapturing(false);
          setCurrentSlide(originalSlide);
          return;
        }

        const file = new File([blob], `traceIt-${displayName}-attendance-${new Date().getFullYear()}.png`, {
          type: "image/png",
        });

        const shareText = `${displayName}'s ${new Date().getFullYear()} Attendance Summary\n\n${overallPercentage}% overall attendance\n${totalAttended}/${totalClasses} classes attended\n\nTrack your attendance with traceIt: ${window.location.origin}`;

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${displayName}'s Attendance Stats`,
            text: shareText,
          });
        } else if (navigator.share) {
          // Share without image if files not supported
          await navigator.share({
            title: `${displayName}'s Attendance Stats`,
            text: shareText,
          });
        } else {
          // Fallback to download
          handleDownload();
        }
        
        // Switch back to original slide
        setCurrentSlide(originalSlide);
        setIsCapturing(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error("Error sharing:", error);
      setCurrentSlide(originalSlide);
      setIsCapturing(false);
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
          className={`aspect-[9/16] w-full rounded-2xl overflow-hidden shadow-2xl relative ${isCapturing ? 'pointer-events-none' : ''}`}
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
