"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { User, HelpCircle, Settings, LayoutGrid, LogOut } from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/actions/auth.actions";
import dynamic from "next/dynamic";

const Sidebar = dynamic(() => import("@/components/predict/sidebar"), {
  ssr: false,
  loading: () => null,
});

type InitialUser = {
  fullName?: string | null;
  email?: string | null;
} | null;

type InitialSub = {
  planType?: string;
} | null;

interface PredictNavbarClientProps {
  initialUser: InitialUser;
  initialSubType: string;
}

export default function PredictNavbarClient({
  initialUser,
  initialSubType,
}: PredictNavbarClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [user, setUser] = useState<InitialUser>(initialUser);
  const [subType, setSubType] = useState<string>(initialSubType || "FREE");
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync props (provided by the parent after the async fetch resolves)
  // into local state. `useState` only reads the initial value once, so
  // without this the navbar would stay unauthenticated forever.
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setSubType(initialSubType || "FREE");
  }, [initialSubType]);

  // --- Define links dynamically based on the user state ---
  const currentNavLinks = user
    ? [
        { label: "Home", href: "/" },
        {
          label: "Organization Profile",
          href: "/organization-profile/dashboard",
        },
        {
          label: "Marketplace",
          href:
            process.env.NEXT_PUBLIC_MARKETPLACE_URL ||
            "http://marketplace.localhost:3000",
        },
        { label: "Our Tech", href: "/our-tech" },
        { label: "Available Plans", href: "/pricing" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        
      ]
    : [
        { label: "Home", href: "/" },
        {
          label: "Marketplace",
          href:
            process.env.NEXT_PUBLIC_MARKETPLACE_URL ||
            "http://marketplace.localhost:3000",
        },
        // { label: "How It Works", href: "/how-it-works" },
        { label: "Our Tech", href: "/our-tech" },
      ];

  // Close dropdown on clicking outside (handled via helper below)
  useEffectOutside(dropdownRef, () => setUserDropdownOpen(false));

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setUserDropdownOpen(false);
    toast.success("Signed out successfully.");
    setTimeout(() => {
      try {
        const currentUrlObj = new URL(window.location.href);
        let otherOrigin: string | null = null;
        if (currentUrlObj.hostname.startsWith("marketplace.")) {
          const parentHostname = currentUrlObj.hostname.replace(
            "marketplace.",
            "",
          );
          otherOrigin = `${currentUrlObj.protocol}//${parentHostname}${currentUrlObj.port ? `:${currentUrlObj.port}` : ""}`;
        } else {
          otherOrigin = `${currentUrlObj.protocol}//marketplace.${currentUrlObj.hostname}${currentUrlObj.port ? `:${currentUrlObj.port}` : ""}`;
        }

        if (otherOrigin) {
          window.location.replace(
            `${otherOrigin}/api/auth/clear-tokens?redirectTo=${encodeURIComponent(currentUrlObj.origin + "/")}`,
          );
          return;
        }
      } catch (e) {
        // Fallback
      }
      window.location.replace("/");
    }, 1500);
  };

  return (
    <nav className="w-full min-h-[79px] bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6 h-[79px] flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/prana-earth-logo-optimized.webp"
            alt="Prana Earth"
            width={36}
            height={36}
            priority
            style={{ width: "auto", height: "36px" }}
          />
          <span className="font-bold text-sm tracking-wide text-gray-900">
            <span className="text-[#1a82c4]">Prana </span>
            <span className="text-[#16a34a]">Earth</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {currentNavLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.label === "Organization Profile"
                  ? pathname.startsWith("/organization-profile")
                  : pathname.startsWith(link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`relative text-sm font-medium pb-1 transition-colors duration-200 ${
                  isActive ? "text-[#1a82c4]" : "text-gray-600 hover:text-black"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1a82c4] rounded-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          {!user ? (
            <Link
              href="/login"
              className="hidden md:flex bg-[#1a82c4] hover:bg-[#156a9c] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors duration-200"
            >
              Get Started
            </Link>
          ) : (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 border border-gray-300 rounded-full py-1.5 px-3 hover:bg-gray-50 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-[#1a82c4] flex items-center justify-center text-white font-bold text-xs">
                  {getInitials(user.fullName || user.email)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-700 leading-none truncate max-w-[100px] mr-1">
                    {user.fullName || "User"}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${userDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 py-3 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#1a82c4] flex items-center justify-center text-white font-bold text-sm">
                        {getInitials(user.fullName || user.email)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 truncate w-44">
                          {user.fullName || "User"}
                        </h4>
                        <p className="text-xs text-gray-500 truncate w-44">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {/* Subscription badge */}
                    <div
                      className={`mt-3 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-md ${
                        subType === "MARKETPLACE"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : subType === "BUNDLE"
                            ? "bg-purple-50 text-purple-600 border border-purple-100"
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                          subType === "MARKETPLACE"
                            ? "bg-emerald-500"
                            : subType === "BUNDLE"
                              ? "bg-purple-500"
                              : "bg-blue-500"
                        }`}
                      />
                      {subType === "FREE"
                        ? "Free Tier Account"
                        : `${subType.replace("_", " ")} Active`}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="py-1.5">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50/50"
                    >
                      <User size={16} /> My Profile
                    </Link>
                    <Link
                      href="/reports"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      <HelpCircle size={16} className="text-gray-400" /> Reports
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      <Settings size={16} className="text-gray-400" /> Settings
                    </Link>
                    <Link
                      href={
                        process.env.NEXT_PUBLIC_MARKETPLACE_URL ||
                        "http://marketplace.localhost:3000"
                      }
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      <LayoutGrid size={16} className="text-gray-400" />{" "}
                      Marketplace
                    </Link>
                    <Link
                      href="/organization-profile/help-support"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      <HelpCircle size={16} className="text-gray-400" /> Help &
                      Support
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 pt-1.5 px-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>

                  <div className="px-4 pt-2 border-t border-gray-50 text-[10px] text-gray-400 font-medium">
                    Prana Earth v2.4.1
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] cursor-pointer p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="block w-[22px] h-[2px] bg-[#333] rounded-sm" />
            <span className="block w-[22px] h-[2px] bg-[#333] rounded-sm" />
            <span className="block w-[22px] h-[2px] bg-[#333] rounded-sm" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden fixed top-[79px] left-0 w-full h-[calc(100vh-79px)] bg-white z-50 overflow-y-auto flex flex-col">
          {/* Top Nav Links */}
          <div className="px-6 py-4 flex flex-col gap-4 border-b border-gray-100">
            {currentNavLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-black"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/login"
                className="bg-[#1a82c4] text-white text-sm font-semibold px-5 py-2.5 rounded-lg text-center"
              >
                Get Started
              </Link>
            )}
          </div>
          {/* Mobile Sidebar */}
          <div className="flex-1 w-64 border-r border-gray-100">
            <Sidebar />
          </div>
        </div>
      )}
    </nav>
  );
}

// Tiny helper to avoid duplicating the useEffect/useRef setup for click-outside
function useEffectOutside(
  ref: React.RefObject<HTMLDivElement | null>,
  handler: () => void,
) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, handler]);
}
