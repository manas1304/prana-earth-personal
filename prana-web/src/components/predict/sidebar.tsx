"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart2,
  FileText,
  RefreshCw,
  HelpCircle,
  Leaf,
  Building,
  ChevronRight
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard Overview", href: "/organization-profile/dashboard", icon: LayoutDashboard },
    { name: "Risk Assessment", href: "/organization-profile/risk-assessment", icon: BarChart2 },
    { name: "Reports", href: "/organization-profile/reports", icon: FileText },
    { name: "Reassessment workflows", href: "/organization-profile/reassessment", icon: RefreshCw },
    { name: "Help & Support", href: "/organization-profile/help-support", icon: HelpCircle },
  ];
  console.log("pathname:", pathname);

  return (
    <aside className="w-[270px] min-h-[calc(100vh-79px)] border-r border-gray-200 bg-white flex flex-col justify-between sticky top-[79px]">
      <div className="py-6 px-4 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-[#16a34a]"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={20} className={isActive ? "text-[#16a34a]" : "text-gray-400"} />
              {item.name}
            </Link>
          );
        })}
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Upgrade Plan Card */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-start gap-3 mb-4">
            <Leaf className="text-gray-400 mt-1" size={20} />
            <div>
              <p className="text-sm font-semibold text-gray-900">You have</p>
              <p className="text-xl font-bold text-[#16a34a]">1</p>
              <p className="text-sm font-bold text-gray-900">Free Assessment</p>
              <p className="text-xs text-gray-500">available</p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="block w-full bg-[#16a34a] hover:bg-green-700 text-white text-center text-sm font-bold py-2.5 rounded-lg transition-colors"
          >
            Upgrade Plan
          </Link>
        </div>

        {/* Organization Card */}
        <button className="flex items-center justify-between w-full border border-gray-200 rounded-xl p-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-gray-200 p-2 rounded-lg">
              <Building size={16} className="text-gray-600" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900">Greentech Solutions</p>
              <p className="text-[10px] text-gray-500">Enterprise Plan</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      </div>
    </aside>
  );
}