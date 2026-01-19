"use client";

import { Typewriter } from "./typewriter";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function Footer() {
  const [animationKey, setAnimationKey] = useState(0);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Restart animation when footer comes into view
            setAnimationKey((prev) => prev + 1);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <footer ref={footerRef} className="w-full py-4 bg-background border-t border-border mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 items-center gap-4">
          <div className="flex justify-start">
            <Link 
              href="/about" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
            >
              About
            </Link>
          </div>
          <div className="flex justify-center">
            <Link 
              href="/report-bug" 
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
            >
              Report a Bug
            </Link>
          </div>
          <p className="text-xs text-muted-foreground font-mono flex items-center gap-1 justify-end">
            <Typewriter key={animationKey} text="Made by SM" speed={120} />
            <span className="cursor-blink inline-block w-[2px] h-3 bg-muted-foreground"></span>
          </p>
        </div>
      </div>
    </footer>
  );
}
