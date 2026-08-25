"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { User, CreditCard, Bookmark, LayoutGrid, LogOut } from "lucide-react";
import { toast } from "sonner";
import { logout } from "@/actions/auth.actions";

type InitialUser = {
  fullName?: string | null;
  email?: string | null;
} | null;

interface MarketplaceNavbarClientProps {
  initialUser: InitialUser;
  initialSubType: string;
}

export default function MarketplaceNavbarClient({
  initialUser,
  initialSubType,
}: MarketplaceNavbarClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [user, setUser] = useState<InitialUser>(initialUser);
  const [subType, setSubType] = useState<string>(initialSubType || "FREE");

  // Sync the props (provided by the parent after the async fetch
  // resolves) into local state. `useState` only reads the initial value
  // once, so without this the navbar would stay unauthenticated forever.
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    setSubType(initialSubType || "FREE");
  }, [initialSubType]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Helper: mark link active if the current path matches exactly OR is a sub-route
  const isActive = (href: string) => {
    if (href.startsWith("http")) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const linkClass = (href: string) =>
    `text-sm font-medium pb-1 border-b-2 transition-colors ${
      isActive(href)
        ? "text-[#1a82c4] border-[#1a82c4]"
        : "text-gray-600 border-transparent hover:text-black"
    }`;

  // Close dropdown on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          window.location.href = `${otherOrigin}/api/auth/clear-tokens?redirectTo=${encodeURIComponent(currentUrlObj.origin + "/")}`;
          return;
        }
      } catch (e) {
        // Fallback
      }
      window.location.href = "/";
    }, 1500);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/prana-earth-logo-optimized.webp"
            alt="Prana Earth"
            width={36}
            height={36}
            priority
          />
          <div className="flex flex-col">
            <span className="text-base font-bold leading-tight">
              <span className="text-[#1a82c4]">Prana </span>
              <span className="text-[#16a34a]">Earth</span>
            </span>
          </div>
        </Link>

        {/* Links */}
        <div
          className={`${
            menuOpen
              ? "flex flex-col absolute top-16 left-0 right-0 bg-white p-4 border-b border-gray-100 gap-4"
              : "hidden"
          } md:flex md:items-center md:static md:bg-transparent md:p-0 md:border-none md:flex-row md:gap-7`}
        >
          <Link
            href={
              process.env.NEXT_PUBLIC_PREDICT_URL || "http://localhost:3000"
            }
            className="text-sm font-medium text-gray-600 hover:text-black transition-colors duration-200"
          >
            Home
          </Link>
          <Link href="/projects" className={linkClass("/projects")}>
            Projects
          </Link>
          <Link
            href={
              process.env.NEXT_PUBLIC_PREDICT_URL || "http://localhost:3000"
            }
            className="text-sm font-medium pb-1 border-b-2 border-transparent text-gray-600 hover:text-black transition-colors"
          >
            Predict Platform
          </Link>
          <Link href="/our-tech" className={linkClass("/our-tech")}>
            Our Tech
          </Link>
          <Link href="/pricing" className={linkClass("/pricing")}>
            Pricing
          </Link>
          <Link href="/about" className={linkClass("/about")}>
            About
          </Link>
          <Link href="/contact" className={linkClass("/contact")}>
            Contact
          </Link>
        </div>

        {/* Actions / User State Control */}
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          {!user ? (
            <>
              <Link
                href={`${process.env.NEXT_PUBLIC_PREDICT_URL || "http://localhost:3000"}/login?tab=login&redirectTo=${process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://marketplace.localhost:3000"}`}
                className="flex items-center text-xs font-medium text-gray-600 hover:text-black px-2 md:px-4 py-2 rounded-lg whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href={`${process.env.NEXT_PUBLIC_PREDICT_URL || "http://localhost:3000"}/login?tab=register&redirectTo=${process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://marketplace.localhost:3000"}`}
                className="flex items-center justify-center text-center text-xs font-semibold text-white bg-[#1a82c4] hover:bg-[#3a9fd4] px-2 py-1.5 md:px-4 md:py-2.5 rounded-lg whitespace-nowrap"
              >
                Get Started
              </Link>
            </>
          ) : (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 border border-gray-100 rounded-full py-1.5 px-3 hover:bg-gray-50 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#1a82c4] flex items-center justify-center text-white font-bold text-xs">
                  {getInitials(user.fullName || user.email)}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-gray-900 leading-none truncate max-w-[100px]">
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
                      ></span>
                      {subType === "FREE"
                        ? "Free Tier Account"
                        : `${subType.replace("_", " ")} Active`}
                    </div>
                  </div>

                  <div className="py-1.5">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50/50"
                    >
                      <User size={16} /> My Profile
                    </Link>
                    <Link
                      href="/pricing"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      <CreditCard size={16} className="text-gray-400" />{" "}
                      Subscription & Billing
                    </Link>
                    <Link
                      href="/saved"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                    >
                      <Bookmark size={16} className="text-gray-400" /> Saved
                      Projects
                    </Link>
                  </div>

                  <div className="border-t border-gray-100 pt-1.5 px-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium transition-colors"
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

          {/* Hamburger Menu button */}
          <button
            className="md:hidden flex flex-col gap-[5px] bg-none border-none cursor-pointer p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="block w-[22px] h-[2px] bg-[#333] rounded-sm" />
            <span className="block w-[22px] h-[2px] bg-[#333] rounded-sm" />
            <span className="block w-[22px] h-[2px] bg-[#333] rounded-sm" />
          </button>
        </div>
      </div>
    </nav>
  );
}
