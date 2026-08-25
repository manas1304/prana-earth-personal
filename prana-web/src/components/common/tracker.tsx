"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function Tracker() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    // Prevent double tracking in React 18 Strict Mode double-render or pathname re-renders
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;

    const trackEvent = async () => {
      try {
        const hostname = typeof window !== "undefined" ? window.location.hostname : "";
        let eventName = "PAGE_VIEW";

        if (hostname.startsWith("marketplace.") || hostname.includes("marketplace")) {
          eventName = "MARKETPLACE_PAGE_VIEW";
        } else if (hostname.startsWith("admin.") || hostname.includes("admin")) {
          eventName = "PAGE_VIEW";
        } else {
          eventName = "PREDICT_PAGE_VIEW";
        }

        await fetch("/api/events/track", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventName,
            path: pathname,
          }),
        });
      } catch (err) {
        console.error("Failed to track page view:", err);
      }
    };

    trackEvent();
  }, [pathname]);

  return null;
}
