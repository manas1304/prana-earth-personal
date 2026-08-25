"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import {
  Users,
  CreditCard,
  ClipboardList,
  Store,
  ChevronDown,
  Download,
  MoreHorizontal,
  Bookmark,
  TrendingUp,
  FileSpreadsheet,
  Eye,
  MessageSquare,
  Heart,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import {
  getAdminDashboardMetrics,
  getTopSavedMarketplaceProjects,
  getRevenueTrends,
  exportRevenueCsv,
  getUserGrowthAndAssessments,
  getMarketplaceEngagement,
  getSubscriptionTiers,
} from "@/actions/admin-dashboard.actions";
import { getAdminLeads } from "@/actions/admin-leads.actions";

export default function AdminDashboard() {
  const [liveLeads, setLiveLeads] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardLeads() {
      try {
        const res: any = await getAdminLeads({ page: 1, limit: 5 });
        if (res?.success && res?.data?.leads) {
          setLiveLeads(res.data.leads);
        }
      } catch (err) {
        console.error(
          "Failed to load dashboard recent leads widgets contexts.",
          err,
        );
      }
    }
    loadDashboardLeads();
  }, []);

  const [metrics, setMetrics] = useState<any>(null);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "60d" | "90d" | "1y">("30d");
  const [metricsLoading, setMetricsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadMetrics() {
      setMetricsLoading(true);
      const res: any = await getAdminDashboardMetrics(dateRange);
      if (!cancelled && res?.success && res?.data?.metrics) {
        setMetrics(res.data.metrics);
      }
      if (!cancelled) setMetricsLoading(false);
    }
    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [dateRange]);

  const [topProjectsData, setTopProjectsData] = useState<any[]>([]);

  useEffect(() => {
    async function loadTopProjects() {
      const res: any = await getTopSavedMarketplaceProjects();
      if (res?.success && res?.data?.projects) {
        setTopProjectsData(res.data.projects);
      }
    }
    loadTopProjects();
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Chart States
  // States
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [revenueInterval, setRevenueInterval] = useState<
    "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [growthData, setGrowthData] = useState<any[]>([]);
  const [engagementData, setEngagementData] = useState<any[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<any[]>([]);

  // Fetch Revenue (Depends on Interval)
  useEffect(() => {
    async function loadRevenue() {
      const res: any = await getRevenueTrends(revenueInterval);
      if (res?.success && res?.data?.trends) setRevenueData(res.data.trends);
    }
    loadRevenue();
  }, [revenueInterval]);

  // Fetch Static Charts
  useEffect(() => {
    async function loadCharts() {
      const growth = await getUserGrowthAndAssessments();
      if (growth?.success) setGrowthData(growth.data?.data || []);

      const engage = await getMarketplaceEngagement();
      if (engage?.success) setEngagementData(engage.data?.data || []);

      const subs = await getSubscriptionTiers();
      if (subs?.success) setSubscriptionData(subs.data?.data || []);
    }
    loadCharts();
  }, []);

  // CSV Handler
  const handleCsvDownload = async () => {
    const csvRes: any = await exportRevenueCsv(revenueInterval);
    if (csvRes?.success && csvRes?.data?.csv) {
      const blob = new Blob([csvRes.data.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revenue_trends_${revenueInterval}.csv`;
      a.click();
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOPBAR */}
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />

        {/* SCROLLABLE DASHBOARD CONTENT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1400px] mx-auto space-y-6">
            {/* Header & Date Filter — dropdown (7D/30D/60D/90D/1Y)
                wired to GET /api/admin/dashboard/metrics?range=… */}
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard Overview
              </h1>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) =>
                    setDateRange(
                      e.target.value as
                        | "7d"
                        | "30d"
                        | "60d"
                        | "90d"
                        | "1y",
                    )
                  }
                  aria-label="Date range"
                  className="appearance-none flex items-center gap-2 bg-white border border-gray-200 pl-4 pr-9 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm focus:outline-none focus:border-[#0e5c8c] cursor-pointer"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="60d">Last 60 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last 1 Year</option>
                </select>
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>

            {/* KPI Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Users */}
              <KPICard
                title="Total Users"
                value={metrics?.totalUsers?.toLocaleString() || "0"}
                change="+12%"
                icon={Users}
                sparkline="up"
              />

              {/* Marketplace Projects */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-gray-500">
                    Marketplace Projects
                  </p>
                  <Store size={18} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">
                    {metrics?.marketplaceProjects || "0"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Total Active</p>
                </div>
              </div>

              {/* Assessments Run */}
              <KPICard
                title="Assessments Run"
                value={metrics?.totalAssessmentsRun?.toLocaleString() || "0"}
                change="+8%"
                icon={ClipboardList}
                sparkline="up"
              />

              {/* Active Subscriptions Card & Breakdown Row */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-gray-500">
                    Active Subscriptions
                  </p>
                  <CreditCard size={18} className="text-gray-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2 flex items-baseline gap-2">
                    {metrics?.activeSubscriptions?.toLocaleString() || "0"}{" "}
                    <span className="text-xs font-semibold text-emerald-500">
                      +6%
                    </span>
                  </h3>
                  <div className="flex gap-3 text-[10px] text-gray-500 mt-1.5">
                    <span>
                      Predict:{" "}
                      {metrics?.activeSubscriptionBreakdown?.predict || 0}
                    </span>
                    <span>
                      Marketplace:{" "}
                      {metrics?.activeSubscriptionBreakdown?.marketplace || 0}
                    </span>
                    <span>
                      Bundle:{" "}
                      {metrics?.activeSubscriptionBreakdown?.bundle || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPICard
                title="DPR Inquiries"
                value={
                  metrics?.totalDprRequestInquiries?.toLocaleString() || "0"
                }
                change="+14%"
                icon={FileSpreadsheet}
              />
              <KPICard
                title="Express Interest"
                value={
                  metrics?.totalExpressInterestCount?.toLocaleString() || "0"
                }
                change="+23%"
                icon={Heart}
              />
              <KPICard
                title="Total Visitors"
                value={metrics?.totalVisitors?.toLocaleString() || "0"}
                change="+12%"
                icon={Eye}
              />
              <KPICard
                title="Contact Us"
                value={metrics?.totalContactUsCount?.toLocaleString() || "0"}
                change="+5%"
                icon={MessageSquare}
              />
            </div>

            {/* Revenue Trends Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex flex-col md:flex-row md:justify-between items-start gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Revenue Trends
                  </h3>
                  <div className="flex items-baseline gap-2 mt-1">
                    {/* <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Cumulative Revenue
                    </span>
                    <span className="text-xl font-bold text-gray-900">
                      $38,200/mo
                    </span> */}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    {["monthly", "quarterly", "yearly"].map((interval) => (
                      <button
                        key={interval}
                        onClick={() => setRevenueInterval(interval as any)}
                        className={`px-3 py-1 text-xs font-semibold rounded shadow-sm capitalize ${
                          revenueInterval === interval
                            ? "bg-white text-gray-900"
                            : "text-gray-500 hover:text-gray-900 bg-transparent shadow-none"
                        }`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleCsvDownload}
                    className="flex items-center gap-1.5 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50"
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueData}
                    margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f1f5f9"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickFormatter={(val) => `$${val}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="predict"
                      name="Predict"
                      stroke="#0f172a"
                      strokeWidth={4}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="marketplace"
                      name="Marketplace"
                      stroke="#1a82c4"
                      strokeWidth={4}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bundle"
                      name="Bundle"
                      stroke="#93c5fd"
                      strokeWidth={4}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Growth & Impact Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Growth Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-gray-900">
                    User Growth & Assessment Activity
                  </h3>
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={growthData}
                      margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickFormatter={(val) => `${val / 1000}k`}
                      />
                      <Tooltip />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "11px" }}
                        verticalAlign="top"
                        align="right"
                      />
                      <Area
                        type="monotone"
                        dataKey="users"
                        name="Users"
                        stroke="#0f172a"
                        fill="#0f172a"
                        fillOpacity={0.05}
                        strokeWidth={4}
                      />
                      <Area
                        type="monotone"
                        dataKey="assessments"
                        name="Assessments"
                        stroke="#1e40af"
                        strokeDasharray="5 5"
                        fill="none"
                        strokeWidth={4}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sustainability Impact */}
              <div className="bg-[#2c3e50] p-6 rounded-xl shadow-sm text-white flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold mb-2">
                    Sustainability Impact
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed mb-6">
                    Cumulative impact driven by platform users globally.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Carbon Saved
                    </p>
                    <p className="text-2xl font-bold">
                      4.2M <span className="text-sm font-normal">tons</span>
                    </p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-lg backdrop-blur-sm">
                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">
                      Water Conserved
                    </p>
                    <p className="text-2xl font-bold">
                      1.8M <span className="text-sm font-normal">tons</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leads & Top Projects Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Leads Table */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900">
                    Recent Leads
                  </h3>
                  <a
                    href="/leads"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    View All
                  </a>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 font-medium border-b border-gray-100 bg-gray-50/50">
                      <tr>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Project</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    {/* Find the <tbody> tags inside Recent Leads card panel and replace them exactly with this: */}
                    <tbody>
                      {liveLeads.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-6 text-center text-xs text-gray-400 italic"
                          >
                            No recent incoming leads records available.
                          </td>
                        </tr>
                      ) : (
                        liveLeads.map((lead: any, idx: number) => {
                          // Inline mapping dictionary matching backend key constants to standard component layouts
                          const badgeStyles: Record<string, string> = {
                            NEW: "bg-emerald-100 text-emerald-700",
                            "IN PROGRESS": "bg-amber-100 text-amber-700",
                            CONTACTED: "bg-blue-100 text-blue-700",
                          };

                          return (
                            <tr
                              key={lead.id || idx}
                              className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                            >
                              <td className="px-5 py-3 font-medium text-gray-900">
                                {lead.name}
                              </td>
                              <td className="px-5 py-3 text-gray-600">
                                {lead.project || "n/a"}
                              </td>
                              <td className="px-5 py-3 text-gray-600">
                                {lead.type}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${badgeStyles[lead.status?.toUpperCase()] || "bg-gray-100 text-gray-700"}`}
                                >
                                  {lead.status || "NEW"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Projects List Card */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 mb-5">
                  Top Marketplace Projects
                </h3>
                <div className="space-y-4">
                  {topProjectsData.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      No high engagement projects mapped.
                    </p>
                  ) : (
                    topProjectsData.map((proj: any) => (
                      <div
                        key={proj.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Project Image Thumbnail */}
                          <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 relative overflow-hidden">
                            <img
                              src={proj.thumbnailUrl || "/project1.jpg"}
                              alt=""
                              className="object-cover w-full h-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate pr-2">
                              {proj.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {proj.location || proj.country} •{" "}
                              {proj.sector || proj.projectType}
                            </p>
                          </div>
                        </div>
                        {/* Saved Counter Tag Badge */}
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded shrink-0">
                          <Bookmark size={12} className="fill-emerald-600" />{" "}
                          {proj.savedCount || 0}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Engagement & Subscriptions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
              {/* Engagement Bar Chart */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-bold text-gray-900">
                    Marketplace Engagement
                  </h3>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={engagementData}
                      margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                      barGap={2}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#64748b" }}
                      />
                      <Tooltip cursor={{ fill: "#f8fafc" }} />
                      <Legend
                        iconType="square"
                        wrapperStyle={{ fontSize: "11px" }}
                      />
                      <Bar
                        dataKey="views"
                        name="Views"
                        fill="#0f172a"
                        radius={[2, 2, 0, 0]}
                        barSize={24}
                      />
                      <Bar
                        dataKey="inquiries"
                        name="Inquiries"
                        fill="#93c5fd"
                        radius={[2, 2, 0, 0]}
                        barSize={24}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subscriptions Donut Chart */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-base font-bold text-gray-900">
                    Subscription Tiers
                  </h3>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-6 h-auto md:h-[240px] py-4">
                  <div className="w-full md:w-1/2 h-[180px] md:h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subscriptionData}
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {subscriptionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-1/2 space-y-3 pl-4">
                    {subscriptionData.map((tier, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: tier.color }}
                          ></div>
                          <span className="text-gray-600 font-medium">
                            {tier.name}
                          </span>
                        </div>
                        <span className="font-bold text-gray-900">
                          {tier.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Small helper component for standard KPI Cards
function KPICard({ title, value, change, icon: Icon, sparkline }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-[120px]">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <Icon size={18} className="text-gray-400" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <span className="font-semibold text-emerald-500 flex items-center">
            <TrendingUp size={12} className="mr-0.5" /> {change}
          </span>
          vs last month
        </p>
      </div>
    </div>
  );
}