"use client";

// Client Component wrapper: fetches user + subscription data via the
// /api/auth/* endpoints on mount. This avoids the "Server Functions cannot
// be called during initial render" error that occurs when a Server Component
// that calls Server Actions is imported into a Client Component page
// (every page in src/app/sites/predict/ is "use client" because it uses
// useState/useEffect).
import { useEffect, useState } from "react";
import PredictNavbarClient from "./navbar-client";

type InitialUser = {
  fullName?: string | null;
  email?: string | null;
} | null;

export default function PredictNavbar() {
  const [initialUser, setInitialUser] = useState<InitialUser>(null);
  const [initialSubType, setInitialSubType] = useState<string>("FREE");

  useEffect(() => {
    let cancelled = false;

    async function loadUserData() {
      try {
        const [userRes, subRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/auth/subscription", { cache: "no-store" }).then((r) =>
            r.json(),
          ),
        ]);

        if (cancelled) return;

        if (userRes?.success && userRes?.data?.user) {
          setInitialUser(userRes.data.user);
        }

        if (subRes?.success && subRes?.data) {
          setInitialSubType(subRes.data.planType || "FREE");
        }
      } catch (err) {
        // Silently fall back to the unauthenticated navbar state.
        console.error("Failed to load navbar user data", err);
      }
    }

    loadUserData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PredictNavbarClient
      initialUser={initialUser}
      initialSubType={initialSubType}
    />
  );
}
