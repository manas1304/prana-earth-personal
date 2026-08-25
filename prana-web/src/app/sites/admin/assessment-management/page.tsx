"use client";

import React, { useState } from "react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import Image from "next/image";
import {
  Search,
  ChevronDown,
  Calendar,
  Download,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";

// --- STATIC INITIAL DATA ---
const initialAssessments = [
  {
    id: "asm-1",
    user: { name: "John Doe", email: "john.d@acmecorp.com", initials: "JD", color: "bg-blue-50 text-blue-700" },
    asset: { title: "Valley Farm Tract A", type: "Agricultural" },
    timestamp: "Oct 24, 14:32",
    status: "COMPLETED",
    plan: "Earth Bundle"
  },
  {
    id: "asm-2",
    user: { name: "Alice Smith", email: "asmith@greenbuild.io", initials: "AS", color: "bg-red-50 text-red-700" },
    asset: { title: "Downtown Metro Hub", type: "Commercial" },
    timestamp: "Oct 24, 13:15",
    status: "FAILED",
    plan: "Premium"
  },
  {
    id: "asm-3",
    user: { name: "Mark Wong", email: "mark@eco-invest.net", initials: "MW", color: "bg-emerald-50 text-emerald-700" },
    asset: { title: "Coastal Wind Park", type: "Infrastructure" },
    timestamp: "Oct 24, 15:40",
    status: "PROCESSING",
    plan: "Free"
  },
  {
    id: "asm-4",
    user: { name: "Elena K", email: "elena@urbanplan.org", initials: "EK", color: "bg-slate-100 text-slate-700" },
    asset: { title: "Sector 7 Res Complex", type: "Residential" },
    timestamp: "Oct 23, 09:22",
    status: "COMPLETED",
    plan: "Premium"
  },
  {
    id: "asm-5",
    user: { name: "Sarah Jenkins", email: "s.jenkins@urbanplan.org", initials: "SJ", color: "bg-teal-50 text-teal-700" },
    asset: { title: "North Ridge Solar", type: "Infrastructure" },
    timestamp: "Oct 23, 08:15",
    status: "COMPLETED",
    plan: "Premium"
  },
];

const topOrganizations = [
  { name: "Acme Corp Global", count: "2.4k", activeUsers: 42, label: "High Vol" },
  { name: "GreenBuild Infrastructure", count: "1.8k", activeUsers: 18, label: null },
  { name: "EcoInvest Partners", count: "940", activeUsers: 8, label: null },
];

export default function AssessmentManagementPage() {
  const [assessments, setAssessments] = useState(initialAssessments);
  const [search, setSearch] = useState("");
  const [assetType, setAssetType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7days");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span> Completed
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span> Failed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">
            <RefreshCw size={10} className="animate-spin text-amber-600" /> Processing
          </span>
        );
      default:
        return null;
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            {/* Title Header banner control section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Assessment Management</h1>
                <p className="text-sm text-gray-500 mt-1">Monitor and manage global assessment activity and user quotas.</p>
              </div>
              <button className="flex items-center gap-2 whitespace-nowrap border border-[#1a82c4] text-[#1a82c4] hover:bg-blue-50 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm">
                <Download size={16} /> Export Activity
              </button>
            </div>

            {/* Core Split Data Grid Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
              
              {/* Left Column Stack Block (Span 3): Filter toolbar and metrics table */}
              <div className="lg:col-span-3 flex flex-col space-y-4">
                
                {/* Advanced Filtering Toolbar Container Component */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search users or assets..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-gray-100 rounded-lg pl-9 pr-4 py-2 text-sm outline-none placeholder:text-gray-400 focus:border-gray-200"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto shrink-0">
                    <select 
                      value={assetType} 
                      onChange={(e) => setAssetType(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-medium outline-none cursor-pointer"
                    >
                      <option value="all">Asset Type</option>
                      <option value="agricultural">Agricultural</option>
                      <option value="commercial">Commercial</option>
                      <option value="infrastructure">Infrastructure</option>
                    </select>

                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-medium outline-none cursor-pointer"
                    >
                      <option value="all">Status</option>
                      <option value="completed">Completed</option>
                      <option value="processing">Processing</option>
                      <option value="failed">Failed</option>
                    </select>

                    <button className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm text-gray-600 font-medium hover:bg-gray-50 shadow-sm whitespace-nowrap">
                      <Calendar size={14} className="text-gray-400" /> Last 7 Days
                    </button>
                  </div>
                </div>

                {/* Main Data Monitoring List Table Panel Container */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#f8fafc] text-gray-500 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4">User Details</th>
                          <th className="px-6 py-4">Asset Information</th>
                          <th className="px-6 py-4">Timestamp</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Plan</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {assessments.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/40 transition-colors">
                            <td className="px-6 py-4.5">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center ${item.user.color}`}>
                                  {item.user.initials}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900">{item.user.name}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{item.user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4.5">
                              <p className="font-bold text-gray-900">{item.asset.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{item.asset.type}</p>
                            </td>
                            <td className="px-6 py-4.5 text-gray-600 font-medium">{item.timestamp}</td>
                            <td className="px-6 py-4.5">{getStatusBadge(item.status)}</td>
                            <td className="px-6 py-4.5 text-gray-500 font-semibold">{item.plan}</td>
                            <td className="px-6 py-4.5 text-center">
                              {item.status === "FAILED" ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors">Fix & Retry</button>
                                  <button className="text-gray-400 hover:text-gray-600 p-1"><MoreVertical size={16} /></button>
                                </div>
                              ) : (
                                <button className="text-[#1a82c4] hover:underline font-bold text-xs">View Details</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Datatable Footer & Control Stack */}
                  <div className="border-t border-gray-100 bg-[#f8fafc] px-6 py-4 flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-400 font-medium">Showing 1-5 of 124,592</span>
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded text-gray-400 hover:bg-gray-50"><ChevronLeft size={16} /></button>
                      <button className="w-8 h-8 flex items-center justify-center border border-[#1a82c4] bg-[#1a82c4] rounded text-white text-sm font-bold">1</button>
                      <button className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded text-gray-600 text-sm font-medium hover:bg-gray-50">2</button>
                      <button className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded text-gray-600 text-sm font-medium hover:bg-gray-50">3</button>
                      <span className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">...</span>
                      <button className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded text-gray-400 hover:bg-gray-50"><ChevronRight size={16} /></button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column Stack Block (Span 1): Organization metrics sidebar cards */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col h-fit">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
                  <h3 className="font-bold text-gray-900 text-sm">Top Organizations</h3>
                  <button className="text-gray-400 hover:text-gray-600"><SlidersHorizontal size={14} /></button>
                </div>

                <div className="space-y-4 flex-1">
                  {topOrganizations.map((org, index) => (
                    <div key={index} className="flex items-center justify-between bg-white border border-gray-50 rounded-xl p-3 shadow-2xs hover:bg-gray-50/30 transition-colors">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{org.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-gray-400 font-medium">{org.activeUsers} Active Users</span>
                          {org.label && (
                            <span className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                              <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> {org.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded-lg font-bold text-xs text-gray-600 px-2.5 py-1.5 h-fit min-w-[45px] text-center">
                        {org.count}
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full text-center text-xs font-bold text-[#1a82c4] border-t border-gray-100 pt-4 mt-5 hover:underline block">
                  View All Organizations
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}