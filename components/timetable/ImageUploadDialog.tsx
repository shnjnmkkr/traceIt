"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExtracted: (slots: any[]) => void;
}

export function ImageUploadDialog({ isOpen, onClose, onExtracted }: ImageUploadDialogProps) {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtract = async () => {
    if (!image) return;

    setIsExtracting(true);
    
    try {
      const formData = new FormData();
      formData.append('image', image);
      
      const response = await fetch('/api/extract-timetable', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract timetable');
      }

      if (data.success && data.slots && data.slots.length > 0) {
        onExtracted(data.slots);
        onClose();
      } else {
        alert(data.error || 'No timetable data could be extracted. Please try with a clearer image.');
      }
    } catch (error: any) {
      console.error('Error extracting timetable:', error);
      alert(error.message || 'Failed to extract timetable. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-mono font-bold">Upload Timetable Image</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Upload Area */}
            {!imagePreview ? (
              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="timetable-image"
                />
                <label htmlFor="timetable-image" className="cursor-pointer">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Click to upload your timetable</p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG or PDF up to 10MB
                  </p>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative rounded-lg overflow-hidden border-2 border-border">
                  <img
                    src={imagePreview}
                    alt="Timetable preview"
                    className="w-full h-auto"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImage(null);
                      setImagePreview("");
                    }}
                    className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>

                {/* Info Box */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex gap-3">
                    <ImageIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm space-y-2">
                      <p className="font-semibold text-foreground">How it works:</p>
                      <ul className="text-muted-foreground space-y-1">
                        <li>1. Upload a clear image of your timetable</li>
                        <li>2. AI will automatically extract class details</li>
                        <li>3. Review and edit the extracted data</li>
                        <li>4. Save your timetable</li>
                      </ul>
                      <p className="text-xs text-blue-500 mt-2">
                        Note: AI extraction may not be 100% accurate. Please review and adjust the extracted data as needed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Extract Button */}
                <Button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="w-full h-12 text-base font-mono"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Extracting with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Extract Timetable
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
