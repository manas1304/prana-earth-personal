"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import { toast } from "sonner";
import {
  getSubscriptionPlans,
  createSubscriptionPlan,
  updateSubscriptionPlan,
} from "@/actions/billing.actions";
import {
  getAdminTransactions,
  exportAdminTransactionsCSV,
} from "@/actions/admin-billing.actions";
import {
  Plus,
  Edit2,
  Download,
  BarChart2,
  Store,
  Layers,
  CheckCircle2,
  Info,
  X,
  ChevronLeft,
} from "lucide-react";

// Mock transaction data for the bottom table (since focus is on plans)
const mockTransactions = [
  {
    id: "#TRX-2024-001",
    customer: "Acme Corp",
    email: "billing@acmecorp.com",
    category: "Subscription",
    item: "Predict Premium Plan",
    amount: "$499.00",
    date: "Oct 24, 2024, 14:30",
    status: "Completed",
  },
  {
    id: "#TRX-2024-002",
    customer: "Globex Inc",
    email: "finance@globex.net",
    category: "Marketplace",
    item: "Watershed Restoration Proj...",
    amount: "$1,250.00",
    date: "Oct 23, 2024, 09:15",
    status: "Pending",
  },
  {
    id: "#TRX-2024-003",
    customer: "Stark Industries",
    email: "accounts@stark.com",
    category: "Subscription",
    item: "Enterprise Data API",
    amount: "$2,999.00",
    date: "Oct 22, 2024, 16:45",
    status: "Failed",
  },
];

export default function SubscriptionsPage() {
  // Transaction States
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isTrxLoading, setIsTrxLoading] = useState(true);
  const [trxDateRange, setTrxDateRange] = useState("30days");
  const [trxPage, setTrxPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [plans, setPlans] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [type, setType] = useState("PREDICT");
  const [description, setDescription] = useState("");
  const [priceMonthly, setPriceMonthly] = useState<number | "">("");
  const [priceYearly, setPriceYearly] = useState<number | "">("");
  const [maxAssessments, setMaxAssessments] = useState<number | "">("");
  const [satelliteScans, setSatelliteScans] = useState<number | "">("");
  const [documentStorage, setDocumentStorage] = useState<number | "">("");
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");
  const [isPubliclyVisible, setIsPubliclyVisible] = useState(true);
  const [applyDiscount, setApplyDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState<number | "">("");
  const [discountDuration, setDiscountDuration] = useState<number | "">("");

  // Fetch Plans on mount and when returning to list
  useEffect(() => {
    if (view === "list") {
      fetchPlans();
    }
  }, [view]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res: any = await getSubscriptionPlans(true); // true = fetch admin/all plans
      if (res?.success && res?.data?.plans) {
        setPlans(res.data.plans);
      }
    } catch (err) {
      toast.error("Failed to fetch subscription plans.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setType("PREDICT");
    setDescription("");
    setPriceMonthly("");
    setPriceYearly("");
    setMaxAssessments("");
    setSatelliteScans("");
    setDocumentStorage("");
    setFeatures([
      "Standard Climate Risk Reports",
      "Basic ESG Insights",
      "Email Support",
    ]);
    setIsPubliclyVisible(true);
    setApplyDiscount(false);
    setDiscountPercentage("");
    setDiscountDuration("");
    setEditingId(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setView("create");
  };

  const handleEditClick = (plan: any) => {
    setName(plan.name || "");
    setType(plan.type || "PREDICT");
    setDescription(plan.description || "");
    setPriceMonthly(plan.priceMonthly || "");
    setPriceYearly(plan.priceYearly || "");
    setMaxAssessments(plan.maxAssessments || "");
    setSatelliteScans(plan.satelliteScans || "");
    setDocumentStorage(plan.documentStorage || "");
    setFeatures(plan.features || []);
    setIsPubliclyVisible(plan.isPubliclyVisible ?? true);
    setApplyDiscount(plan.applyDiscount ?? false);
    setDiscountPercentage(plan.discountPercentage || "");
    setDiscountDuration(plan.discountDuration || "");
    setEditingId(plan.id);
    setView("edit");
  };

  const handleAddFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const handleRemoveFeature = (feat: string) => {
    setFeatures(features.filter((f) => f !== feat));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || priceMonthly === "" || priceYearly === "") {
      return toast.error("Please fill in the Name and Pricing fields.");
    }

    const payload = {
      name,
      type: type as any,
      description,
      priceMonthly: Number(priceMonthly),
      priceYearly: Number(priceYearly),
      maxAssessments: maxAssessments ? Number(maxAssessments) : undefined,
      satelliteScans: satelliteScans ? Number(satelliteScans) : undefined,
      documentStorage: documentStorage ? Number(documentStorage) : undefined,
      features,
      isPubliclyVisible,
      applyDiscount,
      discountPercentage:
        applyDiscount && discountPercentage
          ? Number(discountPercentage)
          : undefined,
      discountDuration:
        applyDiscount && discountDuration
          ? Number(discountDuration)
          : undefined,
    };

    const loadId = toast.loading(
      view === "create" ? "Creating plan..." : "Updating plan...",
    );
    try {
      let res: any;
      if (view === "create") {
        res = await createSubscriptionPlan(payload);
      } else {
        res = await updateSubscriptionPlan(editingId!, payload);
      }

      if (res?.success) {
        toast.success(
          `Plan ${view === "create" ? "created" : "updated"} successfully!`,
          { id: loadId },
        );
        setView("list");
      } else {
        toast.error(res?.message || "Failed to save plan.", { id: loadId });
      }
    } catch (err) {
      toast.error("An error occurred while saving.", { id: loadId });
    }
  };

  const getPlanIcon = (type: string) => {
    if (type === "MARKETPLACE")
      return <Store size={20} className="text-amber-600" />;
    if (type === "BUNDLE")
      return <Layers size={20} className="text-slate-600" />;
    return <BarChart2 size={20} className="text-emerald-600" />;
  };

  // Fetch transactions whenever the filter or page changes
  useEffect(() => {
    const fetchTransactions = async () => {
      if (view !== "list") return;
      setIsTrxLoading(true);
      try {
        const res: any = await getAdminTransactions({
          page: trxPage,
          limit: 10,
          dateRange: trxDateRange,
        });
        if (res?.success) {
          setTransactions(res.data.transactions || []);
        }
      } catch (err) {
        toast.error("Failed to load transactions.");
      } finally {
        setIsTrxLoading(false);
      }
    };
    fetchTransactions();
  }, [trxDateRange, trxPage, view]);

  // Export CSV handler
  const handleExportCSV = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Generating CSV...");
    try {
      const res: any = await exportAdminTransactionsCSV({
        dateRange: trxDateRange,
      });
      if (res?.success && res?.data?.csv) {
        const blob = new Blob([res.data.csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Export complete!", { id: toastId });
      } else {
        toast.error("Failed to export data.", { id: toastId });
      }
    } catch (err) {
      toast.error("An error occurred during export.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1200px] mx-auto space-y-8">
            {/* ========================================= */}
            {/* VIEW: LIST                                */}
            {/* ========================================= */}
            {view === "list" && (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Subscription Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      Control billing, edit global plans, and manage user access
                      tiers.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateClick}
                    className="whitespace-nowrap flex items-center gap-2 bg-[#1a82c4] hover:bg-[#156a9c] text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-colors"
                  >
                    <Plus size={16} /> Create New Plan
                  </button>
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Global Plan Settings
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isLoading ? (
                      <div className="col-span-3 text-center py-10 text-gray-400">
                        Loading plans...
                      </div>
                    ) : plans.length === 0 ? (
                      <div className="col-span-3 text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">
                        No plans found. Create one above.
                      </div>
                    ) : (
                      plans.map((plan) => (
                        <div
                          key={plan.id}
                          className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col relative"
                        >
                          <button
                            onClick={() => handleEditClick(plan)}
                            className="absolute top-6 right-6 text-emerald-600 hover:text-emerald-700 bg-emerald-50 p-1.5 rounded-md"
                          >
                            <Edit2 size={16} />
                          </button>

                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className={`p-2.5 rounded-lg ${plan.type === "MARKETPLACE" ? "bg-amber-50" : plan.type === "BUNDLE" ? "bg-slate-100" : "bg-emerald-50"}`}
                            >
                              {getPlanIcon(plan.type)}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">
                                {plan.name}
                              </h3>
                              {plan.isPubliclyVisible ? (
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                  PUBLIC
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                                  PRIVATE
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-8 border-b border-gray-100 pb-5 mb-5">
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">
                                Monthly
                              </p>
                              <p className="font-bold text-lg">
                                ${plan.priceMonthly?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">
                                Yearly
                              </p>
                              <p className="font-bold text-lg">
                                ${plan.priceYearly?.toFixed(2) || "0.00"}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-500 mb-3">
                              Feature Summary
                            </p>
                            <ul className="space-y-2">
                              {plan.features
                                ?.slice(0, 3)
                                .map((feat: string, idx: number) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2 text-sm text-gray-600"
                                  >
                                    <CheckCircle2
                                      size={16}
                                      className="text-emerald-500 shrink-0 mt-0.5"
                                    />
                                    {feat}
                                  </li>
                                ))}
                              {plan.features?.length > 3 && (
                                <li className="text-xs text-gray-400 italic pl-6">
                                  + {plan.features.length - 3} more
                                </li>
                              )}
                            </ul>
                          </div>

                          <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-100">
                            <div>
                              <p className="text-[10px] text-gray-400 font-medium uppercase">Subscribers</p>
                              <p className="text-sm font-bold text-emerald-700">
                                {plan.activeSubscribers !== undefined ? `${plan.activeSubscribers} Active` : "-- Active"}
                              </p>
                            </div>
                            <button className="text-sm font-semibold text-emerald-700 hover:underline">
                              Manage Tiers
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Transaction History (Static UI representation matching Image 1) */}
                <div className="pt-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">
                        Transaction History
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Manage and review all financial activities across the
                        platform.
                      </p>
                    </div>
                    {/* Replace the existing select and button with this: */}
                    <div className="flex gap-3">
                      <select
                        value={trxDateRange}
                        onChange={(e) => setTrxDateRange(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium outline-none cursor-pointer"
                      >
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                        <option value="3months">Last 3 Months</option>
                        <option value="12months">Last 12 Months</option>
                        <option value="all">All Time</option>
                      </select>
                      <button
                        onClick={handleExportCSV}
                        disabled={isExporting}
                        className="flex items-center gap-2 border border-[#1a82c4] text-[#1a82c4] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Download size={16} />{" "}
                        {isExporting ? "Exporting..." : "Export CSV"}
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#f8fafc] text-gray-500 text-[11px] font-bold uppercase tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Transaction ID</th>
                          <th className="px-6 py-4">Customer</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Item</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Date & Time</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {isTrxLoading ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-10 text-center text-gray-500"
                            >
                              Loading transactions...
                            </td>
                          </tr>
                        ) : transactions.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-10 text-center text-gray-500"
                            >
                              No transactions found for this period.
                            </td>
                          </tr>
                        ) : (
                          transactions.map((trx, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="px-6 py-4 font-medium text-gray-900">
                                {trx.id}
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-gray-900">
                                  {trx.customer?.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {trx.customer?.email}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold ${trx.category === "Marketplace" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                                >
                                  {trx.category}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {trx.itemName}
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900">
                                {trx.amount}
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {trx.dateTime ? new Date(trx.dateTime).toLocaleString() : "--"}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold ${trx.status?.toUpperCase() === "SUCCESS" || trx.status?.toUpperCase() === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : trx.status?.toUpperCase() === "FAILED" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}
                                >
                                  {trx.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ========================================= */}
            {/* VIEW: CREATE & EDIT                       */}
            {/* ========================================= */}
            {(view === "create" || view === "edit") && (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mb-1">
                      <span
                        className="cursor-pointer hover:text-gray-600 flex items-center gap-1"
                        onClick={() => setView("list")}
                      >
                        <ChevronLeft size={14} /> Subscription Management
                      </span>
                      <span>&gt;</span>
                      <span className="text-gray-600">
                        {view === "create" ? "Create Tier" : "Edit Tier"}
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {view === "create"
                        ? "Create Subscription Tier"
                        : `Edit Subscription Tier: ${name}`}
                    </h1>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setView("list")}
                      className="px-5 py-2 border border-[#1a82c4] text-[#1a82c4] font-semibold rounded-lg text-sm hover:bg-blue-50"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#1a82c4] text-white font-semibold rounded-lg text-sm hover:bg-[#156a9c] shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (Span 2) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold mb-5 pb-3 border-b border-gray-100">
                        <Info size={18} /> Basic Information
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Tier Name
                          </label>
                          <input
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#f8fafc] border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Plan Category/Type
                          </label>
                          <select
                            required
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-[#f8fafc] border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4]"
                          >
                            <option value="PREDICT">Predict Platform</option>
                            <option value="MARKETPLACE">Marketplace</option>
                            <option value="BUNDLE">Bundle</option>
                            <option value="FREE">Free</option>
                          </select>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Description
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          className="w-full bg-[#f8fafc] border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Base Price (USD) - Monthly
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-2.5 text-gray-500 font-bold">
                              $
                            </span>
                            <input
                              required
                              type="number"
                              step="0.01"
                              value={priceMonthly}
                              onChange={(e) =>
                                setPriceMonthly(
                                  e.target.value ? Number(e.target.value) : "",
                                )
                              }
                              className="w-full bg-[#f8fafc] border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:border-[#1a82c4]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">
                            Base Price (USD) - Yearly
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-2.5 text-gray-500 font-bold">
                              $
                            </span>
                            <input
                              required
                              type="number"
                              step="0.01"
                              value={priceYearly}
                              onChange={(e) =>
                                setPriceYearly(
                                  e.target.value ? Number(e.target.value) : "",
                                )
                              }
                              className="w-full bg-[#f8fafc] border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 text-sm outline-none focus:border-[#1a82c4]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feature Access */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
                          <CheckCircle2 size={18} /> Feature Access
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {features.map((feat, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-[#f8fafc] border border-gray-200 rounded-lg px-4 py-2.5 text-sm"
                          >
                            <span className="truncate pr-2">{feat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(feat)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <input
                          type="text"
                          placeholder="Type a new feature..."
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(), handleAddFeature())
                          }
                          className="flex-1 bg-[#f8fafc] border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4]"
                        />
                        <button
                          type="button"
                          onClick={handleAddFeature}
                          className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Usage Quotas */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 text-amber-700 font-bold mb-5 pb-3 border-b border-gray-100">
                        <Layers size={18} /> Usage Quotas
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                            Monthly Assessments{" "}
                            <Info size={12} className="text-gray-400" />
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 10"
                            value={maxAssessments}
                            onChange={(e) =>
                              setMaxAssessments(
                                e.target.value ? Number(e.target.value) : "",
                              )
                            }
                            className="w-full text-right font-bold bg-[#f8fafc] border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#1a82c4]"
                          />
                        </div>
                        <div>
                          <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                            Satellite Scans{" "}
                            <Info size={12} className="text-gray-400" />
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 2"
                            value={satelliteScans}
                            onChange={(e) =>
                              setSatelliteScans(
                                e.target.value ? Number(e.target.value) : "",
                              )
                            }
                            className="w-full text-right font-bold bg-[#f8fafc] border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#1a82c4]"
                          />
                        </div>
                        <div>
                          <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1.5">
                            Document Storage (GB){" "}
                            <Info size={12} className="text-gray-400" />
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 5"
                            value={documentStorage}
                            onChange={(e) =>
                              setDocumentStorage(
                                e.target.value ? Number(e.target.value) : "",
                              )
                            }
                            className="w-full text-right font-bold bg-[#f8fafc] border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-[#1a82c4]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-700 font-bold mb-5 pb-3 border-b border-gray-100">
                        <Store size={18} /> Advanced Settings
                      </div>

                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            Publicly Visible
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Show this tier on the pricing page.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isPubliclyVisible}
                            onChange={(e) =>
                              setIsPubliclyVisible(e.target.checked)
                            }
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              Apply Tier Discount
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Offer a limited-time percentage discount.
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={applyDiscount}
                              onChange={(e) =>
                                setApplyDiscount(e.target.checked)
                              }
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>

                        {applyDiscount && (
                          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                                Discount (%)
                              </label>
                              <input
                                type="number"
                                placeholder="15"
                                value={discountPercentage}
                                onChange={(e) =>
                                  setDiscountPercentage(
                                    e.target.value
                                      ? Number(e.target.value)
                                      : "",
                                  )
                                }
                                className="w-full text-center bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                                Duration (Mos)
                              </label>
                              <input
                                type="number"
                                placeholder="3"
                                value={discountDuration}
                                onChange={(e) =>
                                  setDiscountDuration(
                                    e.target.value
                                      ? Number(e.target.value)
                                      : "",
                                  )
                                }
                                className="w-full text-center bg-white border border-gray-200 rounded-md px-2 py-1.5 text-sm outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
