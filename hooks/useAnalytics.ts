"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

export function usePageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const trackPageView = async () => {
      try {
        await fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pagePath: pathname,
            pageTitle: document.title,
            referrer: document.referrer || null,
            userAgent: navigator.userAgent,
            sessionId: getSessionId(),
          }),
        });
      } catch (error) {
        // Silently fail - don't break the app if analytics fails
        console.error('Failed to track page view:', error);
      }
    };

    trackPageView();
  }, [pathname]);
}

export function trackFeature(featureName: string, featureData?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  fetch('/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      featureName,
      featureData,
      sessionId: getSessionId(),
    }),
  }).catch((error) => {
    console.error('Failed to track feature:', error);
  });
}
