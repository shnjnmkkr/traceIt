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
        <div className="flex flex-col items-center justify-center h-full w-full text-white px-4 py-6 overflow-hidden">
          <div className="text-center mb-4 w-full">
            <p className="text-sm font-semibold mb-1 text-white/90">
              {displayName}'s
            </p>
            <h2 className="text-2xl font-bold">{new Date().getFullYear()} Summary</h2>
            <p className="text-xs opacity-70 mt-1">{semesterName}</p>
            <p className="text-[10px] opacity-50 mt-0.5">
              {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 w-full max-w-sm mx-auto">
            {/* Overall */}
            <div className="text-center mb-3 pb-3 border-b border-white/20">
              <p className="text-xs opacity-70 mb-1">Overall Attendance</p>
              <p className="text-5xl font-black mb-1">{overallPercentage}%</p>
              <p className="text-[10px] opacity-60">{totalAttended} of {totalClasses} classes</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center bg-white/5 rounded-lg p-2">
                <p className="text-xl font-bold text-green-300">{totalAttended}</p>
                <p className="text-[10px] opacity-70">Attended</p>
              </div>
              <div className="text-center bg-white/5 rounded-lg p-2">
                <p className="text-xl font-bold text-red-300">{totalBunked}</p>
                <p className="text-[10px] opacity-70">Bunked</p>
              </div>
              <div className="text-center bg-white/5 rounded-lg p-2">
                <p className="text-xl font-bold text-purple-300">{subjects.length}</p>
                <p className="text-[10px] opacity-70">Subjects</p>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="space-y-2 mb-3 pb-3 border-b border-white/20">
              <div className="bg-white/5 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] opacity-70">Best Performance</span>
                  <span className="text-xs font-semibold text-green-300">{bestSubject.percentage}%</span>
                </div>
                <p className="text-xs font-medium truncate">{bestSubject.name}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] opacity-70">Needs Attention</span>
                  <span className="text-xs font-semibold text-orange-300">{worstSubject.percentage}%</span>
                </div>
                <p className="text-xs font-medium truncate">{worstSubject.name}</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center bg-white/5 rounded-lg p-2">
                <p className="text-lg font-bold">{Math.round((totalAttended/totalClasses) * 100)}%</p>
                <p className="text-[10px] opacity-70">Attendance Rate</p>
              </div>
              <div className="text-center bg-white/5 rounded-lg p-2">
                <p className="text-lg font-bold">{totalClasses - totalAttended}</p>
                <p className="text-[10px] opacity-70">Classes Missed</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] mt-4 text-center w-full opacity-50">
            Tracked with traceIt
          </p>
        </div>
      ),
    },
  ];

  const handleDownload = async () => {
    try {
      setIsCapturing(true);
      
      // Create a hidden static version of the card for capture
      const staticCard = document.createElement('div');
      staticCard.style.position = 'fixed';
      staticCard.style.left = '-9999px';
      staticCard.style.top = '0';
      staticCard.style.width = '400px';
      staticCard.style.height = '711px'; // 9:16 aspect ratio
      // Match the actual card gradient: from-slate-900 via-purple-900 to-slate-900
      staticCard.style.background = 'linear-gradient(to bottom, #0f172a, #581c87, #0f172a)';
      staticCard.style.borderRadius = '16px';
      staticCard.style.padding = '24px 16px';
      staticCard.style.color = 'white';
      staticCard.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      staticCard.style.display = 'flex';
      staticCard.style.flexDirection = 'column';
      staticCard.style.justifyContent = 'center';
      staticCard.style.alignItems = 'center';
      staticCard.style.overflow = 'hidden';
      
      // Build the static HTML content - matching the actual card layout exactly
      staticCard.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px; width: 100%; padding: 0 8px;">
          <p style="font-size: 14px; font-weight: 600; margin: 0 0 4px 0; opacity: 0.9;">${displayName}'s</p>
          <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 4px 0;">${new Date().getFullYear()} Summary</h2>
          <p style="font-size: 12px; opacity: 0.7; margin: 4px 0 2px 0;">${semesterName}</p>
          <p style="font-size: 10px; opacity: 0.5; margin: 2px 0 0 0;">
            ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); border-radius: 16px; padding: 16px; border: 1px solid rgba(255, 255, 255, 0.2); width: 100%; max-width: 352px; box-sizing: border-box;">
          <div style="text-align: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
            <p style="font-size: 12px; opacity: 0.7; margin: 0 0 4px 0;">Overall Attendance</p>
            <p style="font-size: 48px; font-weight: 900; margin: 0; line-height: 1;">${overallPercentage}%</p>
            <p style="font-size: 10px; opacity: 0.6; margin: 4px 0 0 0;">${totalAttended} of ${totalClasses} classes</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <p style="font-size: 20px; font-weight: bold; color: #86efac; margin: 0; line-height: 1.2;">${totalAttended}</p>
              <p style="font-size: 10px; opacity: 0.7; margin: 4px 0 0 0;">Attended</p>
            </div>
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <p style="font-size: 20px; font-weight: bold; color: #fca5a5; margin: 0; line-height: 1.2;">${totalBunked}</p>
              <p style="font-size: 10px; opacity: 0.7; margin: 4px 0 0 0;">Bunked</p>
            </div>
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <p style="font-size: 20px; font-weight: bold; color: #c4b5fd; margin: 0; line-height: 1.2;">${subjects.length}</p>
              <p style="font-size: 10px; opacity: 0.7; margin: 4px 0 0 0;">Subjects</p>
            </div>
          </div>

          <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
            <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px; margin-bottom: 8px; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; opacity: 0.7;">Best Performance</span>
                <span style="font-size: 12px; font-weight: 600; color: #86efac;">${bestSubject.percentage}%</span>
              </div>
              <p style="font-size: 12px; font-weight: 500; margin: 0; word-break: break-word; overflow-wrap: break-word; line-height: 1.3;">${bestSubject.name}</p>
            </div>
            <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; opacity: 0.7;">Needs Attention</span>
                <span style="font-size: 12px; font-weight: 600; color: #fdba74;">${worstSubject.percentage}%</span>
              </div>
              <p style="font-size: 12px; font-weight: 500; margin: 0; word-break: break-word; overflow-wrap: break-word; line-height: 1.3;">${worstSubject.name}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <p style="font-size: 18px; font-weight: bold; margin: 0; line-height: 1.2;">${Math.round((totalAttended/totalClasses) * 100)}%</p>
              <p style="font-size: 10px; opacity: 0.7; margin: 4px 0 0 0;">Attendance Rate</p>
            </div>
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <p style="font-size: 18px; font-weight: bold; margin: 0; line-height: 1.2;">${totalClasses - totalAttended}</p>
              <p style="font-size: 10px; opacity: 0.7; margin: 4px 0 0 0;">Classes Missed</p>
            </div>
          </div>
        </div>

        <p style="font-size: 10px; margin-top: 16px; text-align: center; width: 100%; opacity: 0.5; padding: 0 8px;">
          Tracked with traceIt
        </p>
      `;
      
      document.body.appendChild(staticCard);
      
      // Wait for fonts and rendering
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(staticCard, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 400,
        height: 711,
      });

      document.body.removeChild(staticCard);

      const link = document.createElement("a");
      link.download = `traceIt-${displayName}-attendance-${new Date().getFullYear()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      
      setIsCapturing(false);
    } catch (error) {
      console.error("Error downloading image:", error);
      setIsCapturing(false);
    }
  };

  const handleShare = async () => {
    try {
      setIsCapturing(true);
      
      // Create a hidden static version of the card for capture
      const staticCard = document.createElement('div');
      staticCard.style.position = 'fixed';
      staticCard.style.left = '-9999px';
      staticCard.style.top = '0';
      staticCard.style.width = '400px';
      staticCard.style.height = '711px'; // 9:16 aspect ratio
      staticCard.style.background = 'linear-gradient(to bottom right, #7c3aed, #9333ea, #dc2626)';
      staticCard.style.borderRadius = '16px';
      staticCard.style.padding = '24px';
      staticCard.style.color = 'white';
      staticCard.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      staticCard.style.display = 'flex';
      staticCard.style.flexDirection = 'column';
      staticCard.style.justifyContent = 'center';
      staticCard.style.alignItems = 'center';
      staticCard.style.overflow = 'hidden';
      
      // Build the static HTML content
      staticCard.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px; width: 100%;">
          <p style="font-size: 14px; font-weight: 600; margin-bottom: 4px; opacity: 0.9;">${displayName}'s</p>
          <h2 style="font-size: 24px; font-weight: bold; margin: 0;">${new Date().getFullYear()} Summary</h2>
          <p style="font-size: 12px; opacity: 0.7; margin-top: 4px;">${semesterName}</p>
          <p style="font-size: 10px; opacity: 0.5; margin-top: 2px;">
            ${new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(12px); border-radius: 16px; padding: 16px; border: 1px solid rgba(255, 255, 255, 0.2); width: 100%; max-width: 352px;">
          <div style="text-align: center; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
            <p style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">Overall Attendance</p>
            <p style="font-size: 48px; font-weight: 900; margin: 0;">${overallPercentage}%</p>
            <p style="font-size: 10px; opacity: 0.6; margin-top: 4px;">${totalAttended} of ${totalClasses} classes</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px;">
              <p style="font-size: 20px; font-weight: bold; color: #86efac; margin: 0;">${totalAttended}</p>
              <p style="font-size: 10px; opacity: 0.7; margin-top: 4px;">Attended</p>
            </div>
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px;">
              <p style="font-size: 20px; font-weight: bold; color: #fca5a5; margin: 0;">${totalBunked}</p>
              <p style="font-size: 10px; opacity: 0.7; margin-top: 4px;">Bunked</p>
            </div>
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px;">
              <p style="font-size: 20px; font-weight: bold; color: #c4b5fd; margin: 0;">${subjects.length}</p>
              <p style="font-size: 10px; opacity: 0.7; margin-top: 4px;">Subjects</p>
            </div>
          </div>

          <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
            <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; opacity: 0.7;">Best Performance</span>
                <span style="font-size: 12px; font-weight: 600; color: #86efac;">${bestSubject.percentage}%</span>
              </div>
              <p style="font-size: 12px; font-weight: 500; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${bestSubject.name}</p>
            </div>
            <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 10px; opacity: 0.7;">Needs Attention</span>
                <span style="font-size: 12px; font-weight: 600; color: #fdba74;">${worstSubject.percentage}%</span>
              </div>
              <p style="font-size: 12px; font-weight: 500; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${worstSubject.name}</p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px;">
              <p style="font-size: 18px; font-weight: bold; margin: 0;">${Math.round((totalAttended/totalClasses) * 100)}%</p>
              <p style="font-size: 10px; opacity: 0.7; margin-top: 4px;">Attendance Rate</p>
            </div>
            <div style="text-align: center; background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 8px;">
              <p style="font-size: 18px; font-weight: bold; margin: 0;">${totalClasses - totalAttended}</p>
              <p style="font-size: 10px; opacity: 0.7; margin-top: 4px;">Classes Missed</p>
            </div>
          </div>
        </div>

        <p style="font-size: 10px; margin-top: 16px; text-align: center; width: 100%; opacity: 0.5;">
          Tracked with traceIt
        </p>
      `;
      
      document.body.appendChild(staticCard);
      
      // Wait for fonts and rendering
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(staticCard, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 400,
        height: 711,
      });

      document.body.removeChild(staticCard);

      canvas.toBlob(async (blob) => {
        setIsCapturing(false);
        
        if (!blob) {
          handleDownload();
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
          await navigator.share({
            title: `${displayName}'s Attendance Stats`,
            text: shareText,
          });
        } else {
          handleDownload();
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error("Error sharing:", error);
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
    <>
      
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
          data-card-ref
          className={`aspect-[9/16] w-full rounded-2xl overflow-hidden shadow-2xl relative ${isCapturing ? 'pointer-events-none' : ''}`}
          style={{ contain: 'layout style paint' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentSlide}
              initial={isCapturing ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={isCapturing ? { opacity: 1, x: 0 } : { opacity: 0, x: -100 }}
              transition={isCapturing ? { duration: 0 } : { duration: 0.3, ease: "easeInOut" }}
              className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].gradient}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <div className="h-full w-full overflow-hidden">
                {slides[currentSlide].content}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Progress Dots - hide during capture */}
          {!isCapturing && (
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
          )}
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
    </>
  );
}
