"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ClipboardList,
  Store,
  LineChart as LineChartIcon,
  FileText,
  Briefcase,
  LogOut,
  ChevronDown,
  X,
} from "lucide-react";

import { logoutAction } from "@/actions/auth.actions";

export default function AdminSidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isContentManagementActive = pathname.includes("/platform-content");
  const [isContentOpen, setIsContentOpen] = useState(isContentManagementActive);

  // useEffect(() => {
  //   window.history.pushState(null, "", window.location.href);

  //   const handleBackButton = async (e: PopStateEvent) => {
  //     e.preventDefault();
  //     if (window.confirm("Are you sure you want to exit and log out?")) {
  //       await logoutAction(); 
  //       window.location.href = "/login";
  //     } else {
  //       window.history.pushState(null, "", window.location.href);
  //     }
  //   };

  //   window.addEventListener("popstate", handleBackButton);
  //   return () => window.removeEventListener("popstate", handleBackButton);
  // }, []);


  const topNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "User Management", href: "/user-management" },
    {
      icon: CreditCard,
      label: "Subscription & Transactions",
      href: "/subscriptions",
    },
    {
      icon: ClipboardList,
      label: "Assessment Management",
      href: "/assessment-management",
    },
    {
      icon: Store,
      label: "Marketplace Projects",
      href: "/marketplace-projects",
    },
    { icon: LineChartIcon, label: "Leads", href: "/leads" },
  ];

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={`
        fixed inset-y-0 left-0 z-50 md:static
        w-[240px] bg-[#223043] text-gray-300 flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        md:translate-x-0
      `}
      >
        {/* BRANDING HEADER */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src="/prana-earth-logo-with-bg.webp"
                alt="Prana Earth"
                fill
                className="object-contain"
              />
            </div>

            <div className="flex flex-col justify-center mt-1">
              <span className="text-[19px] font-extrabold leading-none tracking-wide bg-gradient-to-r from-[#008db7] to-[#4ab759] text-transparent bg-clip-text">
                Prana Earth
              </span>
              <span className="text-[13px] font-medium text-gray-300 leading-tight mt-1 tracking-wide">
                Admin Panel
              </span>
            </div>
          </div>

          {/* Close button on mobile views */}
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION ITEMS */}
        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto mt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {topNavItems.map((item, i) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={i}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-blue-600/20 text-white border-l-2 border-blue-500 rounded-l-none -ml-3 pl-6"
                    : "hover:bg-gray-800/50 text-gray-300"
                }`}
              >
                <item.icon size={18} /> {item.label}
              </Link>
            );
          })}

          {/* COLLAPSIBLE PLATFORM CONTENT PANEL */}
          <div className="flex flex-col">
            <div
              onClick={() => setIsContentOpen(!isContentOpen)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                isContentManagementActive
                  ? "bg-blue-600/20 text-white border-l-2 border-blue-500 rounded-l-none -ml-3 pl-6"
                  : "hover:bg-gray-800/50 text-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText size={18} />
                <span>Content Management</span>
              </div>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform duration-200 ${isContentOpen ? "rotate-180" : ""}`}
              />
            </div>

            {isContentOpen && (
              <div className="flex flex-col pl-9 mt-1 space-y-1">
                <Link
                  href="/platform-content/predict-platform"
                  onClick={onClose}
                  className={`text-left w-full py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                    pathname === "/platform-content/predict-platform"
                      ? "bg-gray-700/50 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/30"
                  }`}
                >
                  Predict Platform
                </Link>
                <Link
                  href="/platform-content/marketplace"
                  onClick={onClose}
                  className={`text-left w-full py-2 px-3 text-xs font-medium rounded-md transition-colors ${
                    pathname === "/platform-content/marketplace"
                      ? "bg-gray-700/50 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/30"
                  }`}
                >
                  Marketplace
                </Link>
              </div>
            )}
          </div>

          {/* Implementation Partners Link */}
          <Link
            href="/implementation-partners"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              pathname.startsWith("/implementation-partners")
                ? "bg-blue-600/20 text-white border-l-2 border-blue-500 rounded-l-none -ml-3 pl-6"
                : "hover:bg-gray-800/50 text-gray-300"
            }`}
          >
            <Briefcase size={18} /> Implementation Partners
          </Link>
        </nav>

        {/* LOGOUT BUTTON CONTAINER */}
        <div className="p-4 border-t border-gray-700/50">
          <button
            onClick={async () => {
              if (isLoggingOut) return;
              setIsLoggingOut(true);
              try {
                // Server action revokes the refresh token in DB and
                // clears both httpOnly cookies with the right domain/path.
                await logoutAction();
              } catch {
                /* fall through to redirect regardless */
              }
              // Force a full reload so all client state is reset and
              // the proxy picks up the now-empty cookie jar.
              window.location.href = "/login";
            }}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800/50 rounded-lg font-medium text-sm transition-colors text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut size={18} /> {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
