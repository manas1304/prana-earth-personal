"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import { toast } from "sonner";
import {
  getContactSubmissions,
  updateContactStatus,
  replyToContactSubmission,
  exportContactSubmissions,
} from "@/actions/contact.actions";
import {
  getExpressInterests,
  resolveExpressInterest,
  rejectExpressInterest,
  replyToExpressInterest,
  exportExpressInterests,
} from "@/actions/express-interest.actions";
// NEW: Imported DPR actions
import {
  getDprRequests,
  updateDprRequestStatus,
  replyToDprRequest,
  exportDprRequests,
} from "@/actions/dpr.actions";
import {
  Search,
  Filter,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Reply,
  Calendar,
  X,
  Download,
  Leaf,
} from "lucide-react";

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState("contact");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic State for Contact Us
  const [contactLeads, setContactLeads] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  // Dynamic State for Express Interest
  const [expressLeads, setExpressLeads] = useState<any[]>([]);
  const [selectedExpress, setSelectedExpress] = useState<any>(null);

  // NEW: Dynamic State for DPR Inquiries
  const [dprLeads, setDprLeads] = useState<any[]>([]);
  const [selectedDpr, setSelectedDpr] = useState<any>(null);

  // Reply-via-email state: a manually-written body per lead, with a
  // confirmed flag (true once the admin has acknowledged the
  // recipient + body in a confirm() dialog before send).
  const [replyDraft, setReplyDraft] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");

  // Trigger loading handlers on tab changes
  useEffect(() => {
    if (activeTab === "contact") {
      fetchContacts();
    } else if (activeTab === "express") {
      fetchExpressInterests();
    } else if (activeTab === "dpr") {
      fetchDprLeads(); // Fetch DPRs when tab is active
    }
  }, [activeTab]);

  // --- ACTIONS FOR CONTACT US ---
  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res: any = await getContactSubmissions();
      if (res?.success) {
        const data = res.data?.items || [];
        setContactLeads(data);
        if (data.length > 0) setSelectedContact(data[0]);
      }
    } catch (error) {
      toast.error("Failed to fetch contact submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseInquiry = async (id: string) => {
    try {
      const res: any = await updateContactStatus(id, "RESOLVED");
      if (res?.success) {
        toast.success("Inquiry closed successfully");
        fetchContacts();
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const handleReplyToContact = async (id: string, email: string) => {
    // Manually written body is required.
    const body = replyDraft.trim();
    if (body.length < 5) {
      toast.error("Reply body must be at least 5 characters.");
      return;
    }
    // Verify the recipient + body before sending.
    const confirmed = window.confirm(
      `Send this reply to ${email}?\n\n${body}`,
    );
    if (!confirmed) {
      toast.message("Reply cancelled.");
      return;
    }
    setVerifiedEmail(email);
    const toastId = toast.loading(`Sending reply to ${email}...`);
    try {
      const res: any = await replyToContactSubmission({
        submissionId: id,
        replyMessage: body,
      });
      if (res?.success) {
        toast.success(`Reply sent to ${email}`, { id: toastId });
        setReplyDraft("");
        fetchContacts();
      } else {
        toast.error(res?.message || "Failed to send reply.", { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred.", { id: toastId });
    }
  };

  const handleReplyToExpressInterest = async (
    interest: any,
    email: string,
  ) => {
    const body = replyDraft.trim();
    if (body.length < 5) {
      toast.error("Reply body must be at least 5 characters.");
      return;
    }
    const confirmed = window.confirm(
      `Send this reply to ${email}?\n\n${body}`,
    );
    if (!confirmed) {
      toast.message("Reply cancelled.");
      return;
    }
    setVerifiedEmail(email);
    const toastId = toast.loading(`Sending reply to ${email}...`);
    try {
      const res: any = await replyToExpressInterest({
        interestId: interest.id,
        replyMessage: body,
        status: "CONTACTED",
      });
      if (res?.success) {
        toast.success(`Reply sent to ${email}`, { id: toastId });
        setReplyDraft("");
        fetchExpressInterests();
      } else {
        toast.error(res?.message || "Failed to send reply.", { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred.", { id: toastId });
    }
  };

  const handleReplyToDpr = async (dpr: any, email: string) => {
    const body = replyDraft.trim();
    if (body.length < 5) {
      toast.error("Reply body must be at least 5 characters.");
      return;
    }
    const confirmed = window.confirm(
      `Send this reply to ${email}?\n\n${body}`,
    );
    if (!confirmed) {
      toast.message("Reply cancelled.");
      return;
    }
    setVerifiedEmail(email);
    const toastId = toast.loading(`Sending reply to ${email}...`);
    try {
      const res: any = await replyToDprRequest({
        dprRequestId: dpr.id,
        replyMessage: body,
        status: "RESPONDED",
      });
      if (res?.success) {
        toast.success(`Reply sent to ${email}`, { id: toastId });
        setReplyDraft("");
        getDprRequests();
      } else {
        toast.error(res?.message || "Failed to send reply.", { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred.", { id: toastId });
    }
  };

  const handleExportContacts = async () => {
    const toastId = toast.loading("Generating CSV export...");
    try {
      const res: any = await exportContactSubmissions();
      if (res?.success && res.data?.csv) {
        // Create Blob and trigger download
        const blob = new Blob([res.data.csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contact_submissions_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Export successful!", { id: toastId });
      } else {
        toast.error(res?.message || "Export failed.", { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred during export.", {
        id: toastId,
      });
    }
  };

  // --- ACTIONS FOR EXPRESS INTEREST ---
  const fetchExpressInterests = async () => {
    setIsLoading(true);
    try {
      const res: any = await getExpressInterests(1, 50);
      if (res?.success) {
        const data = res.data?.items || [];
        setExpressLeads(data);
        if (data.length > 0) setSelectedExpress(data[0]);
      }
    } catch (error) {
      toast.error("Failed to fetch express interests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveExpress = async (id: string) => {
    try {
      const res: any = await resolveExpressInterest(id);
      if (res?.success) {
        toast.success("Lead marked as Contacted/Resolved");
        fetchExpressInterests();
      } else {
        toast.error(res?.message || "Failed to update lead status");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const handleRejectExpress = async (id: string) => {
    try {
      const res: any = await rejectExpressInterest(id);
      if (res?.success) {
        toast.error("Lead has been rejected");
        fetchExpressInterests();
      } else {
        toast.error(res?.message || "Failed to reject lead");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  // --- NEW: ACTIONS FOR DPR INQUIRIES ---
  const fetchDprLeads = async () => {
    setIsLoading(true);
    try {
      const res: any = await getDprRequests(1, 50); // Added default pagination args
      if (res?.success) {
        const data = res.data?.items || []; // Extract items array from data payload wrapper
        setDprLeads(data);
        if (data.length > 0) setSelectedDpr(data[0]);
      }
    } catch (error) {
      toast.error("Failed to fetch DPR inquiries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkDprResponded = async (id: string) => {
    try {
      const res: any = await updateDprRequestStatus(id, "RESPONDED");
      if (res?.success) {
        toast.success("DPR marked as Responded");
        // Update local state to reflect change instantly without full refetch if desired,
        // or just refetch the list:
        fetchDprLeads();
        if (selectedDpr?.id === id) {
          setSelectedDpr({ ...selectedDpr, status: "RESPONDED" });
        }
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  const handleDownloadDprRequest = (lead: any) => {
    // Generate text file from message
    const element = document.createElement("a");
    const content =
      lead.message ||
      lead.metadata?.additionalRequirements ||
      "No message provided.";
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `DPR_Request_${lead.projectId || lead.id}.txt`;
    document.body.appendChild(element); // Required for Firefox
    element.click();
    document.body.removeChild(element);
  };

  // Helper to format date strings cleanly
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const safeContactLeads = Array.isArray(contactLeads) ? contactLeads : [];
  const safeExpressLeads = Array.isArray(expressLeads) ? expressLeads : [];
  const safeDprLeads = Array.isArray(dprLeads) ? dprLeads : [];

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleExportData = async () => {
    const toastId = toast.loading(`Generating CSV export for ${activeTab}...`);
    try {
      let res: any;
      let filename = "";

      // Call the correct action based on the active tab
      if (activeTab === "contact") {
        res = await exportContactSubmissions();
        filename = "contact_submissions";
      } else if (activeTab === "express") {
        res = await exportExpressInterests();
        filename = "express_interests";
      } else if (activeTab === "dpr") {
        res = await exportDprRequests();
        filename = "dpr_inquiries";
      }

      if (res?.success && res.data?.csv) {
        // Create Blob and trigger download
        const blob = new Blob([res.data.csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Export successful!", { id: toastId });
      } else {
        toast.error(res?.message || "Export failed.", { id: toastId });
      }
    } catch (error) {
      toast.error("An unexpected error occurred during export.", {
        id: toastId,
      });
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1500px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Leads & Inquiries
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage incoming requests, partnerships, and project interests.
                </p>
              </div>
              <button
                onClick={handleExportData}
                className="flex items-center gap-2 w-fit bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
              >
                <ArrowDownToLine size={16} /> Export
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab("express")}
                className={`pb-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === "express"
                    ? "border-[#16a34a] text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Express Interest{" "}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === "express" ? "bg-[#16a34a] text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {safeExpressLeads.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("dpr")}
                className={`pb-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === "dpr"
                    ? "border-[#16a34a] text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                DPR Inquiries{" "}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === "dpr" ? "bg-[#16a34a] text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {safeDprLeads.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("contact")}
                className={`pb-3 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === "contact"
                    ? "border-[#16a34a] text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Contact Us{" "}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${activeTab === "contact" ? "bg-[#16a34a] text-white" : "bg-gray-100 text-gray-600"}`}
                >
                  {safeContactLeads.length}
                </span>
              </button>
            </div>

            {/* --- DYNAMIC: EXPRESS INTEREST TAB --- */}
            {activeTab === "express" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-280px)] lg:min-h-[600px]">
                {/* Left Panel: List */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#fcfdfd]">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        {safeExpressLeads.length} Leads
                      </span>
                      <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {
                          safeExpressLeads.filter(
                            (l: any) => l.status === "PENDING",
                          ).length
                        }{" "}
                        Pending
                      </span>
                    </div>
                    <div className="relative w-[280px]">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-gray-400 ml-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search lead, organization..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-3/4 pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-[#1a82c4] ml-4"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        Loading leads...
                      </div>
                    ) : safeExpressLeads.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        No express interests found.
                      </div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-gray-500 font-bold uppercase tracking-wider bg-gray-50 border-b border-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                              />
                            </th>
                            <th className="px-4 py-3">Lead</th>
                            <th className="px-4 py-3">Organization</th>
                            <th className="px-4 py-3">Project/Subject</th>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeExpressLeads
                            .filter(
                              (lead) =>
                                lead.user?.fullName
                                  ?.toLowerCase()
                                  .includes(searchQuery.toLowerCase()) ||
                                lead.user?.organizationMemberships?.[0]?.organization?.name
                                  ?.toLowerCase()
                                  .includes(searchQuery.toLowerCase()) ||
                                lead.project?.title
                                  ?.toLowerCase()
                                  .includes(searchQuery.toLowerCase()),
                            )
                            .map((lead) => {
                              const isSelected =
                                selectedExpress?.id === lead.id;
                              return (
                                <tr
                                  key={lead.id}
                                  onClick={() => setSelectedExpress(lead)}
                                  className={`border-b border-gray-50 cursor-pointer text-xs transition-colors ${
                                    isSelected
                                      ? "bg-emerald-50/30 border-l-4 border-l-emerald-600"
                                      : "hover:bg-gray-50 border-l-4 border-l-transparent"
                                  }`}
                                >
                                  <td className="px-4 py-4">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300"
                                    />
                                  </td>
                                  <td className="px-4 py-4">
                                    <div>
                                      <p className="font-bold text-gray-900">
                                        {lead.user?.fullName || "N/A"}
                                      </p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        {lead.user?.email || "N/A"}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 text-gray-600 font-medium">
                                    {lead.user?.organizationMemberships?.[0]
                                      ?.organization?.name || "N/A"}
                                  </td>
                                  <td className="px-4 py-4 text-emerald-700 font-semibold">
                                    {lead.project?.title || "Project Interest"}
                                  </td>
                                  <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                                    {formatDate(lead.createdAt)}
                                  </td>
                                  <td className="px-4 py-4">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${lead.status === "PENDING" ? "bg-amber-50 text-amber-700 border border-amber-200" : lead.status === "RESOLVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-600"}`}
                                    >
                                      {lead.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right Panel: Detail View */}
                {selectedExpress ? (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
                    <div className="p-6 border-b border-gray-100">
                      <h2 className="text-lg font-bold text-gray-900 leading-tight">
                        {selectedExpress.user?.fullName || "N/A"}
                      </h2>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedExpress.user?.organizationMemberships?.[0]
                          ?.organization?.name || "Independent Investor"}
                      </p>

                      <div className="bg-[#f8faf9] rounded-lg p-4 grid grid-cols-2 gap-4 border border-gray-100 mt-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Status
                          </p>
                          <span className="text-xs font-bold text-amber-700">
                            {selectedExpress.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Received
                          </p>
                          <p className="text-xs text-gray-900 font-medium">
                            {formatDate(selectedExpress.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
                        <p className="text-xs text-gray-500">
                          <strong className="text-gray-700">Email:</strong>{" "}
                          {selectedExpress.user?.email || "N/A"}
                        </p>
                        <p className="text-xs text-gray-500">
                          <strong className="text-gray-700">Phone:</strong>{" "}
                          {selectedExpress.user?.phone || "Not Provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Project of Interest
                      </p>
                      <h3 className="text-sm font-bold text-emerald-800 mb-4">
                        {selectedExpress.project?.title || "N/A"}
                      </h3>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Message
                      </p>
                      <div className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                        {selectedExpress.message || "No attached note."}
                      </div>
                    </div>

                    <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Reply (manually written)
                        </label>
                        <textarea
                          rows={4}
                          placeholder={`Write your reply to ${selectedExpress.user?.email ?? "the lead"}…`}
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          className="w-full border border-gray-200 rounded-md p-2 text-xs outline-none focus:border-[#1a82c4] resize-none"
                        />
                        {verifiedEmail && (
                          <p className="text-[10px] text-emerald-700 mt-1">
                            ✓ Last verified: {verifiedEmail}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() =>
                            handleReplyToExpressInterest(
                              selectedExpress,
                              selectedExpress.user?.email ?? "",
                            )
                          }
                          disabled={replyDraft.trim().length < 5}
                          className="bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Reply size={14} /> Reply via Email
                        </button>
                        <button
                          onClick={() =>
                            handleResolveExpress(selectedExpress.id)
                          }
                          disabled={selectedExpress.status === "RESOLVED"}
                          className="bg-white border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          Mark Contacted
                        </button>
                      </div>
                      <button
                        onClick={() => handleRejectExpress(selectedExpress.id)}
                        disabled={selectedExpress.status === "REJECTED"}
                        className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 font-semibold py-2.5 rounded-lg text-xs transition shadow-sm"
                      >
                        Reject Lead
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center h-full text-gray-400 text-sm">
                    Select a lead to view tracking metrics.
                  </div>
                )}
              </div>
            )}

            {/* --- DYNAMIC: DPR INQUIRIES TAB --- */}
            {activeTab === "dpr" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-280px)] lg:min-h-[600px]">
                {/* Left Panel: List */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#fcfdfd]">
                    <div className="flex items-center gap-3">
                      <Filter size={16} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-700 border border-gray-200 px-3 py-1 rounded flex items-center gap-2 cursor-pointer">
                        Filter
                      </span>
                      <span className="text-sm font-bold text-gray-700 border border-gray-200 px-3 py-1 rounded flex items-center gap-2 cursor-pointer">
                        Sort
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      Showing 1-{safeDprLeads.length} of {safeDprLeads.length}{" "}
                      Inquiries
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        Loading DPR inquiries...
                      </div>
                    ) : safeDprLeads.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        No DPR inquiries found.
                      </div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-gray-500 font-bold uppercase tracking-wider bg-gray-50 border-b border-gray-100 sticky top-0">
                          <tr>
                            <th className="px-6 py-3">Inquiry ID</th>
                            <th className="px-4 py-3">Organization</th>
                            <th className="px-4 py-3">Complexity</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeDprLeads.map((lead) => {
                            const isSelected = selectedDpr?.id === lead.id;

                            // Map complexity colors based on metadata
                            const complexity =
                              lead.metadata?.complexity?.toUpperCase() || "MID";
                            let complexityStyle =
                              "bg-orange-50 text-orange-600";
                            if (complexity === "HIGH")
                              complexityStyle = "bg-red-50 text-red-600";
                            if (complexity === "LOW")
                              complexityStyle = "bg-gray-100 text-gray-600";

                            // Map status colors based on backend status
                            let statusStyle = "bg-gray-200 text-gray-700";
                            if (lead.status === "PENDING")
                              statusStyle = "bg-gray-200 text-gray-600";
                            if (lead.status === "REVIEWING")
                              statusStyle = "bg-orange-100 text-orange-600";
                            if (lead.status === "RESPONDED")
                              statusStyle = "bg-emerald-100 text-emerald-700";

                            return (
                              <tr
                                key={lead.id}
                                onClick={() => setSelectedDpr(lead)}
                                className={`border-b border-gray-50 cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-emerald-50/30 border-l-4 border-emerald-700"
                                    : "hover:bg-gray-50 border-l-4 border-transparent"
                                }`}
                              >
                                <td className="px-6 py-4">
                                  <p className="font-bold text-emerald-800 text-xs">
                                    {/* Displaying UUID chunk or ID clearly */}
                                    {lead.projectId
                                      ? lead.projectId
                                          .split("-")[0]
                                          .toUpperCase()
                                      : lead.id.substring(0, 8).toUpperCase()}
                                  </p>
                                </td>
                                {/* CHANGE THIS INSIDE YOUR DPR TABLE BODY ROWS */}
                                <td className="px-4 py-4">
                                  <div>
                                    {/* Correctly pulls from metadata.companyName or falls back to user org name */}
                                    <p className="font-bold text-gray-900 text-sm">
                                      {lead.metadata?.companyName ||
                                        lead.user?.organizationMemberships?.[0]
                                          ?.organization?.name ||
                                        "N/A"}
                                    </p>
                                    {/* Correctly pulls the explicit name string entered in Step 1 */}
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {lead.metadata?.fullName ||
                                        lead.user?.fullName ||
                                        "N/A"}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${complexityStyle}`}
                                  >
                                    {complexity}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${statusStyle}`}
                                  >
                                    {lead.status || "PENDING"}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                                  {formatDate(lead.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right Panel: Detail View */}
                {selectedDpr ? (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
                    <div className="p-6 border-b border-gray-100 relative">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-emerald-800 text-sm">
                            {selectedDpr.projectId
                              ? selectedDpr.projectId
                                  .split("-")[0]
                                  .toUpperCase()
                              : selectedDpr.id.substring(0, 8).toUpperCase()}
                          </span>
                          <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                            {selectedDpr.status || "REVIEWING"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Calendar
                            size={16}
                            className="cursor-pointer hover:text-gray-600"
                          />
                          <MoreVertical
                            size={16}
                            className="cursor-pointer hover:text-gray-600"
                          />
                        </div>
                      </div>

                      <h2 className="text-lg font-bold text-gray-900 leading-tight">
                        {selectedDpr.subject ||
                          selectedDpr.project?.title ||
                          "DPR Request Details"}
                      </h2>

                      {/* CHANGE THIS INSIDE YOUR SELECTED DPR DETAIL CARD (RIGHT SIDE) */}
                      <div className="mt-6 border border-gray-200 rounded-lg p-4 flex items-center gap-4 bg-white">
                        {/* Left Leaf Icon Container */}
                        <div className="w-10 h-10 rounded bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                          <Leaf size={20} className="text-emerald-600" />
                        </div>

                        {/* Right Stacked Details Text Panel Container */}
                        <div className="flex flex-col min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">
                            {selectedDpr.metadata?.companyName || "N/A"}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1 shrink-0">
                              <UserPlus size={12} />{" "}
                              {selectedDpr.user?.fullName || "N/A"}
                            </span>
                            <span className="text-gray-300">•</span>
                            <span className="flex items-center gap-1 text-[11px] text-gray-500 truncate max-w-[160px] xl:max-w-[200px]">
                              <Mail size={11} className="shrink-0" />
                              {selectedDpr.user?.email || "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                        Request Message
                      </p>
                      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap border border-gray-100 rounded-xl p-5 bg-white shadow-sm">
                        {selectedDpr.message ||
                          selectedDpr.metadata?.additionalRequirements ||
                          "No additional message provided."}
                      </div>
                    </div>

                    <div className="p-5 border-t border-gray-100 space-y-3 bg-white">
                      <button
                        onClick={() => handleDownloadDprRequest(selectedDpr)}
                        className="w-full bg-[#0e5c8c] hover:bg-[#0a466b] text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Download size={16} /> Download Full DPR Request
                      </button>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Reply (manually written)
                        </label>
                        <textarea
                          rows={4}
                          placeholder={`Write your reply to ${selectedDpr.user?.email ?? "the lead"}…`}
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          className="w-full border border-gray-200 rounded-md p-2 text-xs outline-none focus:border-[#0e5c8c] resize-none"
                        />
                        {verifiedEmail && (
                          <p className="text-[10px] text-emerald-700 mt-1">
                            ✓ Last verified: {verifiedEmail}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            handleReplyToDpr(
                              selectedDpr,
                              selectedDpr.user?.email ?? "",
                            )
                          }
                          disabled={replyDraft.trim().length < 5}
                          className="flex-1 bg-[#0e5c8c] hover:bg-[#0a466b] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Reply size={16} /> Reply via Email
                        </button>
                        <button
                          onClick={() => handleMarkDprResponded(selectedDpr.id)}
                          disabled={selectedDpr.status === "RESPONDED"}
                          className="flex-1 bg-white border border-[#0e5c8c] text-[#0e5c8c] hover:bg-blue-50 disabled:opacity-50 font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          <CheckCircle2 size={16} /> Mark Responded
                        </button>
                        <button className="bg-white border border-red-200 text-red-500 hover:bg-red-50 font-semibold px-4 rounded-lg transition flex items-center justify-center shadow-sm">
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center h-full text-gray-400 text-sm">
                    Select a DPR inquiry to view details.
                  </div>
                )}
              </div>
            )}

            {/* --- DYNAMIC: CONTACT US TAB --- */}
            {activeTab === "contact" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[calc(100vh-280px)] lg:min-h-[600px]">
                {/* Left Panel: List */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                  {/* List Header */}
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#fcfdfd]">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">
                        {safeContactLeads.length} Inquiries
                      </span>
                      <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {
                          safeContactLeads.filter(
                            (l: any) => l.status === "PENDING",
                          ).length
                        }{" "}
                        Unread
                      </span>
                    </div>
                    <div className="relative w-[280px]">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-gray-400 ml-4" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search sender, subject..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-4/5 pl-8 pr-3 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-[#1a82c4] ml-4"
                      />
                    </div>
                  </div>

                  {/* List Table */}
                  <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        Loading leads...
                      </div>
                    ) : safeContactLeads.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        No contact submissions found.
                      </div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-gray-500 font-bold uppercase tracking-wider bg-gray-50 border-b border-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 w-10">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                              />
                            </th>
                            <th className="px-4 py-3">Sender</th>
                            <th className="px-4 py-3">Subject</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {safeContactLeads
                            .filter(
                              (lead) =>
                                lead.fullName
                                  ?.toLowerCase()
                                  .includes(searchQuery.toLowerCase()) ||
                                lead.subject
                                  ?.toLowerCase()
                                  .includes(searchQuery.toLowerCase()),
                            )
                            .map((lead) => {
                              const isSelected =
                                selectedContact?.id === lead.id;
                              const initials =
                                lead.fullName?.substring(0, 2).toUpperCase() ||
                                "NA";

                              return (
                                <tr
                                  key={lead.id}
                                  onClick={() => setSelectedContact(lead)}
                                  className={`border-b border-gray-50 cursor-pointer transition-colors ${
                                    isSelected
                                      ? "bg-emerald-50/30 border-l-4 border-l-emerald-600"
                                      : "hover:bg-gray-50 border-l-4 border-l-transparent"
                                  }`}
                                >
                                  <td className="px-4 py-4">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300"
                                    />
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                                        {initials}
                                      </div>
                                      <div>
                                        <p className="font-bold text-gray-900 text-xs truncate max-w-[120px]">
                                          {lead.fullName}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate max-w-[120px]">
                                          {lead.email}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <p
                                      className={`text-xs truncate max-w-[200px] ${isSelected ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}
                                    >
                                      {lead.subject || "General Inquiry"}
                                    </p>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                      {lead.metadata?.interest || "General"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                                    {formatDate(lead.createdAt)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right Panel: Detail View */}
                {selectedContact ? (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-full">
                    <div className="p-6 border-b border-gray-100 relative">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4 min-w-0 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold shrink-0">
                            {selectedContact.fullName
                              ?.substring(0, 2)
                              .toUpperCase() || "NA"}
                          </div>
                          <div className="min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 leading-tight truncate">
                              {selectedContact.fullName}
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                              {selectedContact.metadata?.role &&
                              selectedContact.metadata?.company
                                ? `${selectedContact.metadata.role} at ${selectedContact.metadata.company}`
                                : selectedContact.metadata?.company ||
                                  "No Company provided"}
                            </p>
                            <a
                              href={`mailto:${selectedContact.email}`}
                              className="text-xs text-[#1a82c4] hover:underline flex items-center gap-1 mt-1 font-medium"
                            >
                              <Mail size={12} /> {selectedContact.email}
                            </a>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${selectedContact.status === "RESOLVED" ? "bg-emerald-500" : "bg-green-600"}`}
                            ></span>
                            {selectedContact.status || "OPEN"}
                          </span>
                          <button className="text-gray-400 hover:text-gray-700 p-1">
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#f8faf9] rounded-lg p-4 grid grid-cols-2 gap-4 border border-gray-100">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Received
                          </p>
                          <p className="text-xs text-gray-900 font-medium">
                            {formatDate(selectedContact.createdAt)} -{" "}
                            {formatTime(selectedContact.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Category
                          </p>
                          <p className="text-xs text-gray-900 font-medium">
                            {selectedContact.subject || "General / Web Form"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                      <h3 className="text-base font-bold text-gray-900 mb-4">
                        {selectedContact.subject || "Contact Request"}
                      </h3>
                      <div className="relative">
                        <div className="absolute top-0 left-0 text-gray-200 text-4xl font-serif leading-none">
                          "
                        </div>
                        <div className="pl-6 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {selectedContact.message}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 border-t border-gray-100 bg-gray-50/50 space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                          Reply (manually written)
                        </label>
                        <textarea
                          rows={4}
                          placeholder={`Write your reply to ${selectedContact.email}…`}
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          className="w-full border border-gray-200 rounded-md p-2 text-xs outline-none focus:border-[#1a82c4] resize-none"
                        />
                        {verifiedEmail && (
                          <p className="text-[10px] text-emerald-700 mt-1">
                            ✓ Last verified: {verifiedEmail}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() =>
                            handleReplyToContact(
                              selectedContact.id,
                              selectedContact.email,
                            )
                          }
                          disabled={replyDraft.trim().length < 5}
                          className="bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Reply size={14} /> Reply via Email
                        </button>
                        <button className="bg-white border border-[#1a82c4] text-[#1a82c4] hover:bg-blue-50 font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm">
                          <UserPlus size={14} /> Convert to Lead
                        </button>
                      </div>
                      <button
                        onClick={() => handleCloseInquiry(selectedContact.id)}
                        disabled={selectedContact.status === "RESOLVED"}
                        className="w-full bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold py-2.5 rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <CheckCircle2
                          size={14}
                          className={
                            selectedContact.status === "RESOLVED"
                              ? "text-emerald-500"
                              : ""
                          }
                        />
                        {selectedContact.status === "RESOLVED"
                          ? "Inquiry Closed"
                          : "Close Inquiry"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center h-full text-gray-400 text-sm">
                    Select an inquiry to view details
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
