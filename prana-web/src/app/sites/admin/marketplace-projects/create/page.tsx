"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import { toast } from "sonner";
import {
  MapPin,
  Upload,
  Plus,
  Trash2,
  Wand2,
  ChevronRight,
} from "lucide-react";
import {
  createProject,
  getProject,
  updateProject,
} from "@/actions/project.actions";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

// Disable SSR for the map component
const LocationMap = dynamic(() => import("@/components/admin/location-map"), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">
      Loading Map...
    </div>
  ),
});

export default function CreateProjectPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const isEditMode = !!editId;

  // Image and Concept Upload Section
  const imgInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Add handlers to append files to formData state arrays:
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      // Append file or upload directly to cloud storage to get URL
    }
  };

  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData((prev: any) => ({
      ...prev,
      documents: [...(prev.documents || []), { name: file.name, url: "" }],
    }));
  };

  const removeDocument = (indexToRemove: number) => {
    setFormData((prev: any) => ({
      ...prev,
      documents: prev.documents.filter(
        (_: any, i: number) => i !== indexToRemove,
      ),
    }));
  };

  // Prefill Data
  useEffect(() => {
    if (!editId) return;

    const loadProjectData = async () => {
      const res: any = await getProject(editId);
      if (res?.success && res.data?.project) {
        const project = res.data.project;
        setFormData({
          title: project.title || "",
          description: project.description || "",
          projectType: project.projectType || "",
          fundingTarget: String(project.fundingTarget || ""),
          tenure: String(project.tenure || ""),
          implementationPartner: project.metadata?.implementationPartner || "",
          primaryAddress: project.location ?? "",
          latitude:
            project.metadata?.latitude !== undefined
              ? String(project.metadata.latitude)
              : "",
          longitude:
            project.metadata?.longitude !== undefined
              ? String(project.metadata.longitude)
              : "",
          targetSdgs: project.metadata?.targetSdgs || [],
          coreMetrics: project.metadata?.coreMetrics || [],
          status: project.status || "UPCOMING",
          documents: [] as Array<{ name: string; url: string }>,
        });
      }
    };
    loadProjectData();
  }, [editId]);

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State matching the backend payload
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectType: "",
    fundingTarget: "",
    tenure: "",
    implementationPartner: "",
    primaryAddress: "",
    latitude: "",
    longitude: "",
    targetSdgs: [] as string[],
    coreMetrics: [] as { name: string; value: string; unit: string }[],
    status: "UPCOMING",
    documents: [] as Array<{ name: string; url: string }>,
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addMetric = () => {
    setFormData({
      ...formData,
      coreMetrics: [...formData.coreMetrics, { name: "", value: "", unit: "" }],
    });
  };

  const removeMetric = (index: number) => {
    const updated = [...formData.coreMetrics];
    updated.splice(index, 1);
    setFormData({ ...formData, coreMetrics: updated });
  };

  const availableSDGs = [
    "1 No Poverty",
    "2 Zero Hunger",
    "6 Clean Water",
    "7 Affordable Energy",
    "9 Industry & Innovation",
    "13 Climate Action",
    "14 Life Below Water",
    "15 Life on Land",
  ];

  const toggleSDG = (sdgName: string) => {
    setFormData((prev) => {
      const isSelected = prev.targetSdgs.includes(sdgName);
      const updatedSdgs = isSelected
        ? prev.targetSdgs.filter((s) => s !== sdgName)
        : [...prev.targetSdgs, sdgName];
      return { ...prev, targetSdgs: updatedSdgs };
    });
  };

  const handleSubmit = async (
  status: "ACTIVE" | "ONGOING" | "COMPLETED" | "FUNDING_OPEN" | "UPCOMING",
) => {
  setIsSubmitting(true);

  // Validations

  if (formData.title.trim().length < 3) {
    setIsSubmitting(false);
    return toast.error("Title must be at least 3 characters");
  }

  if (formData.description.trim().length < 10) {
    setIsSubmitting(false);
    return toast.error("Description must be at least 10 characters");
  }

  if (Number(formData.fundingTarget) <= 0) {
    setIsSubmitting(false);
    return toast.error("Funding target must be positive");
  }

  if (
    Number(formData.tenure) <= 0 ||
    !Number.isInteger(Number(formData.tenure))
  ) {
    setIsSubmitting(false);
    return toast.error("Tenure must be a positive integer");
  }

  if (!formData.projectType || formData.projectType === "Select type") {
    setIsSubmitting(false);
    return toast.error("Project Type is required");
  }

  if (
    !formData.implementationPartner ||
    formData.implementationPartner === "Select partner"
  ) {
    setIsSubmitting(false);
    return toast.error("Implementation Partner is required");
  }

  try {
    const payload = {
      title: formData.title,
      description: formData.description,
      location: formData.primaryAddress,
      projectType: formData.projectType,
      fundingTarget: Number(formData.fundingTarget),
      tenure: Number(formData.tenure),
      status: status,
      metadata: {
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        implementationPartner: formData.implementationPartner,
        targetSdgs: formData.targetSdgs,
        coreMetrics: formData.coreMetrics.map((m) => ({
          name: m.name,
          value: Number(m.value),
          unit: m.unit,
        })),
        documents: [],
      },
    };

    // rest of existing code...
      // Calling the server action
      const res: any = isEditMode
        ? await updateProject(editId, payload)
        : await createProject(payload);

      if (res?.success) {
        toast.success(`Project ${status.toLowerCase()} successfully`);
        router.push("/marketplace-projects");
      } else {
        // Catch backend validation rejections
        toast.error(res?.message || "Failed to save project");
      }
    } catch (error) {
      toast.error("Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1200px] mx-auto">
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isEditMode
                    ? "Edit Marketplace Project"
                    : "Create Marketplace Project"}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Configure details, impact metrics, and AI insights for a new
                  sustainability initiative.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.back()}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit("UPCOMING")}
                  disabled={isSubmitting}
                  type="button"
                  className="px-4 py-2 border border-[#1a82c4] text-[#1a82c4] rounded-lg text-sm font-bold hover:bg-blue-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSubmit("FUNDING_OPEN")}
                  disabled={isSubmitting}
                  type="button"
                  className="px-4 py-2 bg-[#1a82c4] text-white rounded-lg text-sm font-bold hover:bg-[#156a9c]"
                >
                  Publish Project
                </button>
              </div>
            </div>

            {/* Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT COLUMN (Spans 2) */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <span className="text-emerald-600">ⓘ</span> Basic
                    Information
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Project Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-[#1a82c4] focus:outline-none"
                        placeholder="e.g., Amazon Reforestation Initiative"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Project Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="projectType"
                          value={formData.projectType}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option>Select type</option>
                          <option value="Renewable Energy">
                            Renewable Energy
                          </option>
                          <option value="Carbon Capture">Carbon Capture</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Implementation Partner <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="implementationPartner"
                          onChange={handleInputChange}
                          value={formData.implementationPartner}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option>Select partner</option>
                          <option value="Eco-Restore Alliance">
                            Eco-Restore Alliance
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Project Duration (Months) <span className="text-red-500">*</span>
                        </label>
                        <input
                          name="tenure"
                          type="number"
                          value={formData.tenure}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="e.g., 36"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Total Investment Needed <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500 text-sm">
                            $
                          </span>
                          <input
                            name="fundingTarget"
                            type="number"
                            value={formData.fundingTarget}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 text-sm"
                            placeholder="e.g., 450000"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        onChange={handleInputChange}
                        value={formData.description}
                        rows={4}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="Detailed overview..."
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <MapPin size={16} className="text-emerald-600" /> Location
                    Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Primary Address
                      </label>
                      <input
                        name="primaryAddress"
                        value={formData.primaryAddress}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        placeholder="123 Eco Way..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Latitude
                        </label>
                        <input
                          name="latitude"
                          type="number"
                          step="any"
                          value={formData.latitude}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="-3.4653"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Longitude
                        </label>
                        <input
                          name="longitude"
                          type="number"
                          value={formData.longitude}
                          step="any"
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                          placeholder="-62.2159"
                        />
                      </div>
                    </div>
                    {/* Map Placeholder */}
                    <LocationMap
                      lat={formData.latitude}
                      lng={formData.longitude}
                      onLocationSelect={(newLat, newLng) => {
                        setFormData((prev) => ({
                          ...prev,
                          latitude: newLat,
                          longitude: newLng,
                        }));
                      }}
                    />
                  </div>
                </div>

                {/* Impact & SDGs */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-4 text-emerald-700">
                    Impact & SDGs
                  </h3>

                  <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Target SDGs (Multi-select)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableSDGs.map((sdg) => {
                        const isSelected = formData.targetSdgs.includes(sdg);
                        return (
                          <button
                            key={sdg}
                            type="button"
                            onClick={() => toggleSDG(sdg)}
                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {isSelected ? "● " : ""}
                            {sdg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-700">
                        Core Metrics
                      </label>
                      <button
                        onClick={addMetric}
                        className="text-xs text-emerald-600 font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Metric
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.coreMetrics.map((metric, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            placeholder="e.g. Carbon Sequestered"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                            value={metric.name}
                            onChange={(e) => {
                              const newMetrics = [...formData.coreMetrics];
                              newMetrics[index].name = e.target.value;
                              setFormData({
                                ...formData,
                                coreMetrics: newMetrics,
                              });
                            }}
                          />
                          <input
                            type="number"
                            placeholder="Value"
                            className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm"
                            value={metric.value}
                            onChange={(e) => {
                              const newMetrics = [...formData.coreMetrics];
                              newMetrics[index].value = e.target.value;
                              setFormData({
                                ...formData,
                                coreMetrics: newMetrics,
                              });
                            }}
                          />
                          <select
                            className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm"
                            value={metric.unit}
                            onChange={(e) => {
                              const newMetrics = [...formData.coreMetrics];
                              newMetrics[index].unit = e.target.value;
                              setFormData({
                                ...formData,
                                coreMetrics: newMetrics,
                              });
                            }}
                          >
                            <option>tCO2e</option>
                            <option>Hectares</option>
                            <option>Households</option>
                          </select>
                          <button
                            onClick={() => removeMetric(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* AI Insight Generator */}
                <div className="bg-[#f2fcf5] border border-emerald-100 p-5 rounded-xl">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                      <Wand2 size={16} /> AI Insight Generator
                    </h3>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      BETA
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700/80 mb-4">
                    Generate comprehensive sustainability narratives and risk
                    assessments based on the project data provided above.
                  </p>
                  <button className="w-full bg-white border border-emerald-600 text-emerald-700 font-bold text-xs py-2 rounded-lg mb-4 flex items-center justify-center gap-2 hover:bg-emerald-50 transition">
                    <Wand2 size={14} /> Generate Insights
                  </button>

                  <div className="bg-white border border-emerald-200 rounded-lg p-3">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">
                      Generated Narrative
                    </label>
                    <textarea
                      rows={5}
                      className="w-full text-xs text-gray-700 focus:outline-none resize-none"
                      placeholder="AI generated content will appear here..."
                      defaultValue="The Amazon Reforestation Initiative presents a high-impact opportunity for carbon sequestration..."
                    />
                  </div>
                </div>

                {/* Media & Documents */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">
                    Media & Documents
                  </h3>

                  <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Project Images
                    </label>
                    <input
                      type="file"
                      ref={imgInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div
                      onClick={() => imgInputRef.current?.click()}
                      className="border-2 border-dashed border-[#1a82c4]/40 bg-[#f8fbff] rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/50 transition"
                    >
                      <Upload size={20} className="text-[#1a82c4] mb-2" />
                      <p className="text-xs text-gray-600 font-medium">
                        Drag & drop or{" "}
                        <span className="text-[#1a82c4]">browse</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Supports JPG, PNG (Max 5MB)
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Supporting Documents
                    </label>
                    <input
                      type="file"
                      ref={docInputRef}
                      onChange={handleDocUpload}
                      accept=".pdf"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="w-full flex items-center justify-between border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 mb-2"
                    >
                      <span className="flex items-center gap-2">
                        <Plus size={14} className="text-emerald-600" /> Upload
                        Concept Note (PDF)
                      </span>
                      <ChevronRight size={14} />
                    </button>

                    {/* Dynamic Uploaded Files Array Rendering */}
                    {formData.documents?.map((doc: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-red-50 border border-red-100 rounded-md px-3 py-2 text-sm mb-2"
                      >
                        <span className="flex items-center gap-2 text-red-600 text-xs font-medium truncate max-w-[200px]">
                          📄 {doc.name || "Document"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
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
