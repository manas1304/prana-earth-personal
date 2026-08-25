"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import { toast } from "sonner";
import {
  getImplementationPartners,
  createImplementationPartner,
  deleteImplementationPartner,
  updateImplementationPartner,
} from "@/actions/implementation-partners.actions";
import {
  Search,
  ChevronDown,
  ArrowDownToLine,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Briefcase,
  Globe,
  PlusCircle,
  Trash2,
  AlertTriangle,
  X,
  UploadCloud,
} from "lucide-react";

export default function ImplementationPartnersPage() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Edit form fields (mirrors register form, but bound to the row being edited)
  const [editOrgName, setEditOrgName] = useState("");
  const [editPartnerType, setEditPartnerType] = useState("");
  const [editTaxId, setEditTaxId] = useState("");
  const [editWebsiteUrl, setEditWebsiteUrl] = useState("");
  const [editRegionText, setEditRegionText] = useState("India - Maharashtra");
  const [editSelectedExpertise, setEditSelectedExpertise] = useState<string[]>(
    [],
  );
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const editLogoInputRef = React.useRef<HTMLInputElement>(null);

  // Navigation State Layout View Flag
  const [view, setView] = useState<"list" | "register">("list");
  const [isLoading, setIsLoading] = useState(false);

  // --- View 1: List States ---
  const [partners, setPartners] = useState<any[]>([]);
  const [searchTerm, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    totalPages: 1,
  });

  // --- View 2: Form States ---
  const [orgName, setOrgName] = useState("");
  const [partnerType, setPartnerType] = useState("");
  const [taxId, setTaxId] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [regionText, setRegionText] = useState("India - Maharashtra"); // Mocking region field value for design consistency
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([
    "Carbon Auditing",
  ]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const expertiseOptions = [
    "Reforestation",
    "Water Conservation",
    "Carbon Auditing",
    "Biodiversity Protection",
    "Solar Infrastructure",
    "Community Education",
  ];

  // Fetch partners whenever list view parameters change
  useEffect(() => {
    if (view === "list") {
      fetchPartners();
    }
  }, [view, searchTerm, statusFilter, regionFilter, pagination.page]);

  const fetchPartners = async () => {
    setIsLoading(true);
    try {
      const res: any = await getImplementationPartners({
        search: searchTerm || undefined,
        status: (statusFilter || undefined) as any,
        region: regionFilter || undefined,
        page: pagination.page, // 1. Uses the active reactive page state
        limit: 4, // Set to 4 items per page to match your UI snapshot layout
      });

      if (res?.success && res?.data) {
        setPartners(res.data.partners || []);
        setPagination({
          total: res.data.pagination?.total || 0,
          page: res.data.pagination?.page || 1,
          totalPages: res.data.pagination?.totalPages || 1, // 2. Saves the max pages count
        });
      }
    } catch (err) {
      toast.error("Failed to query partner records.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!partnerToDelete) return;

    setIsDeleteModalOpen(false); // Close modal instantly
    const toastId = toast.loading("Processing soft delete...");
    try {
      const res: any = await deleteImplementationPartner(partnerToDelete.id);
      if (res?.success) {
        toast.success("Partner deleted successfully", { id: toastId });
        fetchPartners();
      } else {
        toast.error(res?.message || "Failed to delete partner", {
          id: toastId,
        });
      }
    } catch (error) {
      toast.error("An unexpected error occurred", { id: toastId });
    } finally {
      setPartnerToDelete(null);
    }
  };

  // Open the edit modal pre-filled with the partner's current values
  const openEditModal = (partner: any) => {
    setEditingPartner(partner);
    setEditOrgName(partner?.name ?? "");
    setEditPartnerType(partner?.type ?? "");
    setEditTaxId(partner?.taxId ?? partner?.registrationId ?? "");
    setEditWebsiteUrl(partner?.websiteUrl ?? "");
    setEditRegionText(partner?.region ?? "India - Maharashtra");
    setEditSelectedExpertise(
      Array.isArray(partner?.capabilities) ? partner.capabilities : [],
    );
    setEditLogoFile(null);
    setEditLogoPreview(null);
    if (editLogoInputRef.current) editLogoInputRef.current.value = "";
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingPartner(null);
    if (editLogoPreview) URL.revokeObjectURL(editLogoPreview);
    setEditLogoFile(null);
    setEditLogoPreview(null);
    if (editLogoInputRef.current) editLogoInputRef.current.value = "";
  };

  const toggleEditExpertise = (tag: string) => {
    setEditSelectedExpertise((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner?.id) return;
    if (!editOrgName || !editPartnerType || !editTaxId) {
      return toast.error("Please fill in all mandatory marked fields.");
    }

    // Normalize URL the same way the register form does
    let normalizedWebsiteUrl: string | undefined;
    if (editWebsiteUrl.trim()) {
      const trimmed = editWebsiteUrl.trim();
      const withScheme = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      try {
        // eslint-disable-next-line no-new
        new URL(withScheme);
        normalizedWebsiteUrl = withScheme;
      } catch {
        toast.error("Please enter a valid website URL (e.g. example.com).");
        return;
      }
    }

    setIsEditSubmitting(true);
    const toastId = toast.loading("Updating partner record...");
    try {
      const res: any = await updateImplementationPartner(editingPartner.id, {
        name: editOrgName,
        type: editPartnerType as any,
        websiteUrl: normalizedWebsiteUrl,
        region: editRegionText,
        capabilities: editSelectedExpertise,
      });

      if (!res?.success) {
        toast.error(res?.message || "Update failed.", { id: toastId });
        return;
      }

      // Optional: upload a new logo if user picked one in the edit modal
      if (editLogoFile) {
        try {
          const fd = new FormData();
          fd.append("file", editLogoFile);
          const uploadRes = await fetch(
            `/api/admin/implementation-partners/${editingPartner.id}/logo`,
            { method: "POST", body: fd },
          );
          const uploadJson = await uploadRes.json().catch(() => null);
          if (!uploadRes.ok || !uploadJson?.success) {
            toast.warning(
              `Partner updated, but logo upload failed: ${
                uploadJson?.message || uploadRes.statusText
              }`,
              { id: toastId },
            );
          } else {
            toast.success("Partner updated with new logo!", { id: toastId });
          }
        } catch {
          toast.warning("Partner updated, but logo upload failed.", {
            id: toastId,
          });
        }
      } else {
        toast.success("Partner updated successfully.", { id: toastId });
      }

      closeEditModal();
      fetchPartners();
    } catch (err) {
      toast.error("A network communication error occurred.", { id: toastId });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleRegisterPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !partnerType || !taxId) {
      return toast.error("Please fill in all mandatory marked fields.");
    }

    // Normalize website URL: accept "example.com" and turn it into a valid
    // https URL. Empty stays empty (optional field).
    let normalizedWebsiteUrl: string | undefined;
    if (websiteUrl.trim()) {
      const trimmed = websiteUrl.trim();
      const withScheme = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      try {
        // Throws on invalid URLs like "not a url"
        // eslint-disable-next-line no-new
        new URL(withScheme);
        normalizedWebsiteUrl = withScheme;
      } catch {
        toast.error("Please enter a valid website URL (e.g. example.com).");
        return;
      }
    }

    const loadId = toast.loading("Saving new partner record safely...");
    try {
      const res: any = await createImplementationPartner({
        name: orgName,
        type: partnerType as any,
        websiteUrl: normalizedWebsiteUrl,
        region: regionText,
        country: "India",
        capabilities: selectedExpertise,
        activeProjects: 0,
        totalImpact: "--",
      });

      if (!res?.success) {
        toast.error(res?.message || "Registration failed.", { id: loadId });
        return;
      }

      const createdPartner = res?.data?.partner;
      const createdId = createdPartner?.id as string | undefined;

      // If a logo was picked, upload it to the dedicated endpoint
      // (the partner must exist first so the S3 key can include its ID).
      if (logoFile && createdId) {
        try {
          const fd = new FormData();
          fd.append("file", logoFile);
          const uploadRes = await fetch(
            `/api/admin/implementation-partners/${createdId}/logo`,
            { method: "POST", body: fd },
          );
          const uploadJson = await uploadRes.json().catch(() => null);
          if (!uploadRes.ok || !uploadJson?.success) {
            toast.warning(
              `Partner created, but logo upload failed: ${
                uploadJson?.message || uploadRes.statusText
              }`,
              { id: loadId },
            );
          } else {
            toast.success("New partner registered with logo!", { id: loadId });
          }
        } catch (uploadErr) {
          toast.warning(
            "Partner created, but logo upload encountered a network error.",
            { id: loadId },
          );
        }
      } else {
        toast.success("New partner registered successfully!", { id: loadId });
      }

      // Reset Form Fields
      setOrgName("");
      setPartnerType("");
      setTaxId("");
      setWebsiteUrl("");
      setSelectedExpertise(["Carbon Auditing"]);
      setLogoFile(null);
      setLogoPreview(null);
      if (logoInputRef.current) logoInputRef.current.value = "";
      setView("list"); // Redirect back to data layout view list
    } catch (err) {
      toast.error("A network communication error occurred.", { id: loadId });
    }
  };

  const toggleExpertise = (tag: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAddCustomTag = () => {
    if (customTagInput.trim()) {
      if (!selectedExpertise.includes(customTagInput.trim())) {
        setSelectedExpertise((prev) => [...prev, customTagInput.trim()]);
      }
      setCustomTagInput("");
      setShowCustomInput(false);
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
            {/* ==================================================== */}
            {/* VIEW 1: PARTNER LISTING LAYOUT INTERFACE             */}
            {/* ==================================================== */}
            {view === "list" && (
              <div className="space-y-6">
                {/* Section Header Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Implementation Partners
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Manage and monitor onboarded NGOs and delivery entities.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                      <ArrowDownToLine size={16} /> Export CSV
                    </button>
                    <button
                      onClick={() => setView("register")}
                      className="flex items-center gap-2 bg-[#0e5c8c] hover:bg-[#0a466b] text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
                    >
                      <Plus size={16} /> Add New Partner
                    </button>
                  </div>
                </div>

                {/* Filter and Search Action Strip */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="relative w-full sm:w-[360px]">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Search partners by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-[#fcfdfd] outline-none focus:border-[#0e5c8c] transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
                    {/* <select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="">Status: All</option>
                      <option value="ACTIVE">Active</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="INACTIVE">Inactive</option>
                    </select> */}
                    <select
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                      className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 outline-none cursor-pointer w-full sm:w-auto"
                    >
                      <option value="">Region: Global</option>
                      <option value="India">India</option>
                      <option value="Brazil">Brazil</option>
                      <option value="Kenya">Kenya</option>
                    </select>
                  </div>
                </div>

                {/* Data Collection Table Wrapper */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-[#f8fafc] text-gray-500 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="pl-6 pr-4 py-4">Partner Name</th>
                          <th className="px-4 py-4">Type</th>
                          <th className="px-4 py-4">Region</th>
                          <th className="px-4 py-4">Onboarded</th>
                          <th className="px-4 py-4 text-center">
                            Active Proj.
                          </th>
                          <th className="px-4 py-4">Total Impact</th>
                          <th className="px-6 py-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {isLoading ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="text-center py-12 text-gray-400 font-medium"
                            >
                              Loading partner directory data...
                            </td>
                          </tr>
                        ) : partners.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="text-center py-12 text-gray-400 font-medium"
                            >
                              No system partners found matching criteria.
                            </td>
                          </tr>
                        ) : (
                          partners.map((partner) => {
                            let badgeStyle = "bg-gray-100 text-gray-600";
                            if (partner.status === "ACTIVE")
                              badgeStyle =
                                "bg-emerald-50 text-emerald-700 border border-emerald-200";
                            if (partner.status === "UNDER_REVIEW")
                              badgeStyle =
                                "bg-amber-50 text-amber-600 border border-amber-200";

                            return (
                              <tr
                                key={partner.id}
                                className="hover:bg-gray-50/50 transition-colors"
                              >
                                <td className="pl-6 pr-4 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                                      <Briefcase
                                        size={18}
                                        className="text-gray-400"
                                      />
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 text-sm">
                                        {partner.name}
                                      </p>
                                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                        ID:{" "}
                                        {partner.partnerId ||
                                          partner.id
                                            .substring(0, 8)
                                            .toUpperCase()}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-gray-600 font-medium">
                                  {partner.type}
                                </td>
                                <td className="px-4 py-4 text-gray-500 font-medium">
                                  {partner.region}
                                </td>
                                <td className="px-4 py-4 text-gray-500">
                                  {formatDate(partner.createdAt)}
                                </td>
                                <td className="px-4 py-4 text-center font-bold text-gray-900">
                                  {partner.activeProjects || 0}
                                </td>
                                <td className="px-4 py-4 font-semibold text-gray-800">
                                  {partner.totalImpact || "--"}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-3 text-gray-400">
                                    <button className="hover:text-[#0e5c8c] transition-colors">
                                      <Eye size={16} />
                                    </button>
                                    <button
                                      onClick={() => openEditModal(partner)}
                                      className="hover:text-[#0e5c8c] transition-colors"
                                      title="Edit Partner"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setPartnerToDelete({
                                          id: partner.id,
                                          name: partner.name,
                                        });
                                        setIsDeleteModalOpen(true);
                                      }}
                                      className="hover:text-red-600 transition-colors"
                                      title="Delete Partner"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Foot Pagination Panel Control */}
                  <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white text-xs font-medium text-gray-500">
                    <p>
                      Showing 1-{partners.length} of {pagination.total} partners
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          setPagination((p) => ({
                            ...p,
                            page: Math.max(p.page - 1, 1),
                          }))
                        }
                        disabled={pagination.page === 1}
                        className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="px-3 py-1.5 bg-[#0e5c8c] text-white font-bold rounded-md">
                        {pagination.page}
                      </span>
                      <button
                        onClick={() =>
                          setPagination((p) => ({
                            ...p,
                            page: Math.min(p.page + 1, p.totalPages),
                          }))
                        }
                        disabled={pagination.page === pagination.totalPages}
                        className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* VIEW 2: REGISTER NEW IMPLEMENTATION PARTNER FORM     */}
            {/* ==================================================== */}
            {view === "register" && (
              <form
                onSubmit={handleRegisterPartner}
                className="space-y-6 max-w-[1100px]"
              >
                {/* Form Breadcrumb Header */}
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                    <span
                      className="cursor-pointer hover:text-gray-600"
                      onClick={() => setView("list")}
                    >
                      Implementation Partners
                    </span>
                    <span>&gt;</span>
                    <span className="text-gray-600">Add New Partner</span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mt-2">
                    Register New Partner
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Enter the details below to onboard a new implementation
                    organization to the platform.
                  </p>
                </div>

                {/* Module Block Card 1: Basic Info */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#f8fafc] border-b border-gray-100 p-4 flex items-center gap-2 font-bold text-gray-700 text-sm">
                    <Briefcase size={16} className="text-[#0e5c8c]" /> Basic
                    Information
                  </div>
                  <div className="p-6 space-y-5">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Organization Name{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Green Earth Initiative"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#0e5c8c]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Partner Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={partnerType}
                          onChange={(e) => setPartnerType(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white outline-none cursor-pointer focus:border-[#0e5c8c]"
                        >
                          <option value="">Select type...</option>
                          <option value="NGO">NGO</option>
                          <option value="ENGINEERING_AGENCY">
                            Engineering Agency
                          </option>
                          <option value="ENVIRONMENTAL_FIRM">
                            Environmental Firm
                          </option>
                          <option value="CONSULTING_FIRM">
                            Consulting Firm
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                          Registration ID / Tax ID{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 12-3456789"
                          value={taxId}
                          onChange={(e) => setTaxId(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#0e5c8c]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Website URL
                      </label>
                      <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#0e5c8c]">
                        <div className="bg-[#f8fafc] border-r border-gray-200 px-3 flex items-center justify-center text-gray-400">
                          <Globe size={16} />
                        </div>
                        <input
                          type="text"
                          inputMode="url"
                          placeholder="https://www.example.org"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="flex-1 px-4 py-2.5 text-sm outline-none"
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Tip: you can paste &quot;example.com&quot; —
                        &quot;https://&quot; is added automatically.
                      </p>
                    </div>

                    {/* Logo Upload */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Partner Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 bg-[#f8fafc] flex items-center justify-center overflow-hidden shrink-0">
                          {logoPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Briefcase size={20} className="text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1">
                          <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setLogoFile(file);
                              if (logoPreview) URL.revokeObjectURL(logoPreview);
                              setLogoPreview(
                                file ? URL.createObjectURL(file) : null,
                              );
                            }}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              className="flex items-center gap-2 border border-[#0e5c8c] text-[#0e5c8c] hover:bg-[#0e5c8c]/5 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors"
                            >
                              <UploadCloud size={14} />
                              {logoFile ? "Change Logo" : "Upload Logo"}
                            </button>
                            {logoFile && (
                              <button
                                type="button"
                                onClick={() => {
                                  setLogoFile(null);
                                  if (logoPreview)
                                    URL.revokeObjectURL(logoPreview);
                                  setLogoPreview(null);
                                  if (logoInputRef.current)
                                    logoInputRef.current.value = "";
                                }}
                                className="text-xs font-semibold text-gray-400 hover:text-red-500 px-2"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1.5">
                            PNG, JPG, WEBP or SVG. Max 5 MB.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Module Block Card 2: Capabilities Tags Selection */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#f8fafc] border-b border-gray-100 p-4 flex items-center gap-2 font-bold text-gray-700 text-sm">
                    <Globe size={16} className="text-[#0e5c8c]" /> Capabilities
                    & Expertise
                  </div>
                  <div className="p-6 space-y-4">
                    <label className="block text-xs font-bold text-gray-500">
                      Select all areas of expertise
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {expertiseOptions.map((option) => {
                        const isSelected = selectedExpertise.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => toggleExpertise(option)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              isSelected
                                ? "bg-[#1a82c4] text-white border-[#1a82c4]"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}

                      {/* Custom Tags Append Controls Section Component */}
                      {showCustomInput ? (
                        <div className="flex items-center gap-2 border border-[#0e5c8c] rounded-full px-2 py-0.5 bg-white">
                          <input
                            type="text"
                            placeholder="Tag name..."
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              (e.preventDefault(), handleAddCustomTag())
                            }
                            className="text-xs outline-none px-2 py-1 w-[100px]"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomTag}
                            className="text-xs font-bold text-[#0e5c8c] hover:underline px-1"
                          >
                            Add
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCustomInput(true)}
                          className="px-4 py-1.5 rounded-full text-xs font-semibold border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center gap-1"
                        >
                          <PlusCircle size={14} /> Add Custom
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Navigation Submission Layout Buttons Row Strip */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="px-6 py-2.5 border border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#0e5c8c] hover:bg-[#0a466b] text-white rounded-lg text-xs font-semibold transition-colors shadow-md"
                  >
                    Register Partner
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-[480px] w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle size={22} className="stroke-[2.5]" />
                <h2 className="text-lg font-bold text-gray-900">
                  Delete Partner?
                </h2>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-center">
              <p className="text-base text-gray-600 font-medium">
                Are you sure you want to delete this partner?
              </p>
              <p className="text-xs text-gray-400 font-bold mt-1 uppercase font-mono">
                {partnerToDelete?.name}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-6 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm transition-colors min-w-[120px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePartner}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-md transition-colors min-w-[120px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* EDIT PARTNER MODAL                                   */}
      {/* ==================================================== */}
      {isEditModalOpen && editingPartner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-[820px] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 text-[#0e5c8c]">
                <Edit2 size={20} className="stroke-[2.5]" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Edit Partner
                  </h2>
                  <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                    {editingPartner.partnerId || editingPartner.id}
                  </p>
                </div>
              </div>
              <button
                onClick={closeEditModal}
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <form
              onSubmit={handleUpdatePartner}
              className="flex-1 overflow-y-auto"
            >
              <div className="p-6 space-y-5">
                {/* Organization Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Green Earth Initiative"
                    value={editOrgName}
                    onChange={(e) => setEditOrgName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#0e5c8c]"
                  />
                </div>

                {/* Type + Tax ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Partner Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editPartnerType}
                      onChange={(e) => setEditPartnerType(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white outline-none cursor-pointer focus:border-[#0e5c8c]"
                    >
                      <option value="">Select type...</option>
                      <option value="NGO">NGO</option>
                      <option value="ENGINEERING_AGENCY">
                        Engineering Agency
                      </option>
                      <option value="ENVIRONMENTAL_FIRM">
                        Environmental Firm
                      </option>
                      <option value="CONSULTING_FIRM">Consulting Firm</option>
                      <option value="GOVERNMENT_BODY">Government Body</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Registration ID / Tax ID{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12-3456789"
                      value={editTaxId}
                      onChange={(e) => setEditTaxId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#0e5c8c]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Note: tax ID is stored locally for the form but may not be
                      persisted if your backend schema doesn&apos;t include it.
                    </p>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Website URL
                  </label>
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#0e5c8c]">
                    <div className="bg-[#f8fafc] border-r border-gray-200 px-3 flex items-center justify-center text-gray-400">
                      <Globe size={16} />
                    </div>
                    <input
                      type="text"
                      inputMode="url"
                      placeholder="https://www.example.org"
                      value={editWebsiteUrl}
                      onChange={(e) => setEditWebsiteUrl(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-sm outline-none"
                    />
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Capabilities &amp; Expertise
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {expertiseOptions.map((option) => {
                      const isSelected = editSelectedExpertise.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleEditExpertise(option)}
                          className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            isSelected
                              ? "bg-[#1a82c4] text-white border-[#1a82c4]"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Custom tags from the original record are preserved but not
                    editable here. Contact engineering to remove custom tags.
                  </p>
                </div>

                {/* Logo replace (optional) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Replace Logo (optional)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-lg border border-dashed border-gray-300 bg-[#f8fafc] flex items-center justify-center overflow-hidden shrink-0">
                      {editLogoPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={editLogoPreview}
                          alt="New logo preview"
                          className="w-full h-full object-contain"
                        />
                      ) : editingPartner?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={editingPartner.logoUrl}
                          alt="Current logo"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Briefcase size={18} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        ref={editLogoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setEditLogoFile(file);
                          if (editLogoPreview)
                            URL.revokeObjectURL(editLogoPreview);
                          setEditLogoPreview(
                            file ? URL.createObjectURL(file) : null,
                          );
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => editLogoInputRef.current?.click()}
                        className="flex items-center gap-2 border border-[#0e5c8c] text-[#0e5c8c] hover:bg-[#0e5c8c]/5 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors"
                      >
                        <UploadCloud size={14} />
                        {editLogoFile ? "Change Logo" : "Upload New Logo"}
                      </button>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        Leave empty to keep the current logo. PNG, JPG, WEBP or
                        SVG. Max 5 MB.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="px-6 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="px-6 py-2.5 bg-[#0e5c8c] hover:bg-[#0a466b] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-md transition-colors"
                >
                  {isEditSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility helper to safely print dates cleanly
function formatDate(dateString: string) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
