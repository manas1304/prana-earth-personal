"use client";

import Link from "next/link";
import PredictNavbar from "@/components/predict/navbar";
import Sidebar from "@/components/predict/sidebar";
import MarketplaceFooter from "@/components/marketplace/footer";
import {
  Download,
  Plus,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowDownToLine,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export default function ReportsPage() {
  const stats = [
    {
      label: "Total Reports",
      count: "18",
      icon: <FileText size={20} className="text-blue-500" />,
      bg: "bg-blue-50",
    },
    {
      label: "Completed",
      count: "16",
      icon: <CheckCircle2 size={20} className="text-green-500" />,
      bg: "bg-green-50",
    },
    {
      label: "In Progress",
      count: "1",
      icon: <Clock size={20} className="text-orange-500" />,
      bg: "bg-orange-50",
    },
    {
      label: "Failed",
      count: "1",
      icon: <AlertTriangle size={20} className="text-red-500" />,
      bg: "bg-red-50",
    },
    {
      label: "Total Downloads",
      count: "32",
      icon: <ArrowDownToLine size={20} className="text-purple-500" />,
      bg: "bg-purple-50",
    },
  ];

  const reports = [
    {
      name: "Mumbai Data Center",
      sub: "Risk Assessment Report",
      asset: "Mumbai Data Center",
      date: "31 May 2024",
      time: "10:30AM",
      status: "Completed",
    },
    {
      name: "Pune Manufacturing Unit",
      sub: "Risk Assessment Report",
      asset: "Pune Manufacturing Unit",
      date: "29 May 2024",
      time: "04:15PM",
      status: "Completed",
    },
    {
      name: "Hyderabad Warehouse",
      sub: "Risk Assessment Report",
      asset: "Hyderabad Warehouse",
      date: "28 May 2024",
      time: "11:20AM",
      status: "Completed",
    },
    {
      name: "Delhi Office Campus",
      sub: "Climate Risk Summary",
      asset: "Delhi Office Campus",
      date: "26 May 2024",
      time: "09:45AM",
      status: "Completed",
    },
    {
      name: "Bengaluru Facility",
      sub: "Risk Assessment Report",
      asset: "Bengaluru Facility",
      date: "24 May 2024",
      time: "02:30PM",
      status: "Completed",
    },
    {
      name: "Chennai Logistics Hub",
      sub: "Climate Risk Summary",
      asset: "Chennai Logistics Hub",
      date: "22 May 2024",
      time: "01:10PM",
      status: "In Progress",
    },
    {
      name: "Kolkata Warehouse",
      sub: "Risk Assessment Report",
      asset: "Kolkata Warehouse",
      date: "20 May 2024",
      time: "10:05AM",
      status: "Failed",
    },
  ];

  const chartData = [
    { month: "Dec 23", value: 5 },
    { month: "Jan 24", value: 7 },
    { month: "Feb 24", value: 8 },
    { month: "Mar 24", value: 9 },
    { month: "Apr 24", value: 8 },
    { month: "May 24", value: 10 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PredictNavbar />

      <div className="flex flex-1 max-w-full">
        <div className="hidden lg:block"><Sidebar/></div>

        {/* Middle Section */}
        <main
          className="flex-1 p-8 overflow-y-auto bg-[#FBFBFD]"
          style={{ maxWidth: "1152px" }}
        >
          {/* Header & Buttons */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
              <p className="text-sm text-gray-500 mt-1">
                View, download and manage all your generated reports.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold py-2 px-4 rounded-md transition-colors">
                <Download size={14} /> Export Report List
              </button>
              <button className="flex items-center gap-2 bg-[#0b5cff] hover:bg-blue-700 text-white text-xs font-semibold py-2 px-4 rounded-md transition-colors">
                <Plus size={14} /> Generate New Assessment
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4 shadow-sm"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${stat.bg}`}
                >
                  {stat.icon}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">
                    {stat.label}
                  </p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">
                    {stat.count}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Search Bar */}
          <div className="bg-white border border-gray-100 rounded-lg p-2 mb-6 shadow-sm flex items-center">
            <Search size={16} className="text-gray-400 ml-2" />
            <input
              type="text"
              placeholder="Search reports by name or asset..."
              className="w-full pl-3 py-1 text-sm outline-none text-gray-700 placeholder-gray-400"
            />
          </div>

          {/* Main Grid: Table & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left: Table (takes up 2 columns) */}
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-4">
                All Reports
              </h2>

              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 border-b border-gray-50 uppercase tracking-wide">
                    <th className="pb-3 font-semibold">Report Name</th>
                    <th className="pb-3 font-semibold">Asset Name</th>
                    <th className="pb-3 font-semibold">Generated On</th>
                    <th className="pb-3 font-semibold">Status ↓</th>
                    <th className="pb-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-3 flex items-start gap-3">
                        <FileText size={16} className="text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {row.name}
                          </p>
                          <p className="text-[10px] text-gray-400">{row.sub}</p>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-gray-500">
                        {row.asset}
                      </td>
                      <td className="py-3">
                        <p className="text-xs text-gray-700">{row.date}</p>
                        <p className="text-[10px] text-gray-400">{row.time}</p>
                      </td>
                      <td className="py-3">
                        <div
                          className={`flex items-center gap-1.5 text-xs font-semibold
                          ${
                            row.status === "Completed"
                              ? "text-green-600"
                              : row.status === "In Progress"
                                ? "text-orange-500"
                                : "text-red-500"
                          }`}
                        >
                          {row.status === "Completed" && (
                            <CheckCircle2 size={14} />
                          )}
                          {row.status === "In Progress" && <Clock size={14} />}
                          {row.status === "Failed" && (
                            <AlertTriangle size={14} />
                          )}
                          {row.status}
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <button className="text-gray-400 hover:text-blue-600 transition-colors">
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-6 border-t border-gray-50 pt-4">
                <div className="flex items-center gap-1">
                  <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
                    <ChevronLeft size={14} />
                  </button>
                  <button className="w-6 h-6 flex items-center justify-center border border-blue-500 bg-blue-500 rounded text-white text-xs font-bold">
                    1
                  </button>
                  <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-600 text-xs font-semibold hover:bg-gray-50">
                    2
                  </button>
                  <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-600 text-xs font-semibold hover:bg-gray-50">
                    3
                  </button>
                  <span className="text-xs text-gray-400 px-1">...</span>
                  <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-600 text-xs font-semibold hover:bg-gray-50">
                    5
                  </button>
                  <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:bg-gray-50">
                    <ChevronRight size={14} />
                  </button>
                </div>
                <span className="text-[10px] text-gray-400">
                  Showing 1 to 7 of 18 reports
                </span>
              </div>
            </div>

            {/* Right: Chart Placeholder */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-6">
                Report Generation Trend
              </h2>
              {/* Added -ml-2 to shift left, ensuring right side doesn't overflow */}
              <div className="w-full h-56 mt-4 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    /* Increased right margin to fix "May 24" cutoff, adjusted left for spacing */
                    margin={{ top: 20, right: 25, left: 0, bottom: 10 }}
                  >
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 8, fill: "#9CA3AF" }}
                      dy={15}
                      interval={0}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#9CA3AF" }}
                      domain={[0, 15]}
                      ticks={[0, 5, 10, 15]}
                      /* tickMargin creates the gap between the numbers and the chart */
                      tickMargin={15}
                    />
                    <Line
                      type="linear"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#3b82f6" }}
                      activeDot={{ r: 6 }}
                    >
                      <LabelList
                        dataKey="value"
                        position="top"
                        offset={10}
                        style={{
                          fill: "#4B5563",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <Link
            href="/marketplace"
            className="text-xs font-bold text-[#0b5cff] hover:underline"
          >
            Explore Marketplace for more &gt;
          </Link>
        </main>
      </div>

      <MarketplaceFooter />
    </div>
  );
}
