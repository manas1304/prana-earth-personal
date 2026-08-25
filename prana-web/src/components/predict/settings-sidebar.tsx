"use client";

import { Building2, Bell, ShieldCheck, CreditCard } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function SettingsSidebar({ activeTab, setActiveTab }: SidebarProps) {
  const tabs = [
    { id: "organization", label: "Organization", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Data & Security", icon: ShieldCheck },
    { id: "billing", label: "Billing & Plan", icon: CreditCard },
  ];

  return (
    <aside 
      className="bg-white rounded-xl shadow-sm border border-gray-100 py-4 flex flex-col"
      style={{ width: "201px", minHeight: "742px" }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-colors w-full text-left ${
              isActive 
                ? "bg-gray-100 text-[#1a82c4] border-l-4 border-[#1a82c4]" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
            }`}
          >
            <Icon size={18} className={isActive ? "text-[#1a82c4]" : "text-gray-400"} />
            {tab.label}
          </button>
        );
      })}
    </aside>
  );
}