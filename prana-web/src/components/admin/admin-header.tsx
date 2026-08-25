"use client";

import React from "react";
import { Menu } from "lucide-react";

export default function AdminHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between md:justify-end px-4 md:px-8 shrink-0">
      {/* Hamburger menu trigger icon visible exclusively on small mobile screens */}
      <button 
        onClick={onMenuClick} 
        className="md:hidden text-gray-600 hover:bg-gray-50 p-2 rounded-lg transition-colors border border-gray-200 shadow-xs"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-1.5 transition-colors border border-gray-200 rounded-full px-3 shadow-sm">
        <div className="w-7 h-7 rounded-full bg-[#1a82c4] flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
        <span className="text-sm font-medium text-gray-700 pr-1">ADMIN</span>
      </div>
    </header>
  );
}