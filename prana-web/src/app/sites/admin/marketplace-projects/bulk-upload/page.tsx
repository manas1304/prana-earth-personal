"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import { toast } from "sonner";
import {
  Download,
  Settings2,
  Trash2,
  Wand2,
  Upload,
  Plus,
  X,
  AlertCircle
} from "lucide-react";

// Assuming you have these exported from the file shown in Image 1
import { bulkUploadProjectsAction, getS3UploadUrlAction } from "@/actions/bulk-project.actions";

// --- TYPES ---
interface ProjectRow {
  id: string; // temporary local ID
  title: string;
  projectType: string;
  subType: string;
  implementationPartner: string;
  duration: string;
  fundingTarget: string;
  primaryAddress: string;
  sdgs: string; // Storing as comma-separated string for easy table editing
  description: string;
  aiNarrative: string;
  documents: any[];
  images: any[];
  hasError?: boolean;
}

const emptyRow = (): ProjectRow => ({
  id: Math.random().toString(36).substring(7),
  title: "",
  projectType: "",
  subType: "",
  implementationPartner: "",
  duration: "",
  fundingTarget: "",
  primaryAddress: "",
  sdgs: "",
  description: "",
  aiNarrative: "",
  documents: [],
  images: [],
  hasError: false,
});

export default function BulkUploadPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // The Master State
  const [projects, setProjects] = useState<ProjectRow[]>([emptyRow()]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);

  // --- VALIDATION LOGIC ---
  const validateProjects = (currentProjects: ProjectRow[]) => {
    let errors = 0;
    const validated = currentProjects.map(proj => {
      // Basic validation: title, type, and funding target are required
      const isInvalid = !proj.title || !proj.projectType || !proj.fundingTarget;
      if (isInvalid) errors++;
      return { ...proj, hasError: isInvalid };
    });
    setErrorCount(errors);
    return validated;
  };

  // Run validation whenever projects change
  useEffect(() => {
    const timer = setTimeout(() => {
      validateProjects(projects);
    }, 500); // Debounce typing
    return () => clearTimeout(timer);
  }, [projects]);

  // --- HANDLERS ---
  const updateRow = (index: number, field: keyof ProjectRow, value: any) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
  };

  const addRow = () => {
    setProjects([...projects, emptyRow()]);
    setActiveIndex(projects.length); // Focus the new row
  };

  const removeRow = (index: number) => {
    if (projects.length === 1) return toast.error("You must have at least one row.");
    const updated = projects.filter((_, i) => i !== index);
    setProjects(updated);
    if (activeIndex >= index && activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const handleGenerateAi = () => {
    const currentProject = projects[activeIndex];
    if (!currentProject.title || !currentProject.projectType) {
      return toast.error("Please fill in Title and Project Type first.");
    }
    const toastId = toast.loading("Generating narrative...");
    
    // Simulate AI generation
    setTimeout(() => {
      updateRow(activeIndex, "aiNarrative", `The ${currentProject.title} presents a high-impact opportunity in the ${currentProject.projectType} sector...`);
      toast.success("Narrative generated!", { id: toastId });
    }, 1500);
  };

  const handleSubmit = async (publish: boolean) => {
    const validated = validateProjects(projects);
    setProjects(validated);

    if (errorCount > 0 || validated.some(p => p.hasError)) {
      return toast.error(`Please fix the ${errorCount} errors before saving.`);
    }

    setIsSubmitting(true);
    const toastId = toast.loading(publish ? "Publishing bulk projects..." : "Saving drafts...");

    try {
      // Format payload for backend
      const payload = projects.map(p => ({
        title: p.title,
        projectType: p.projectType,
        subType: p.subType === "Reforestation" ? "Reforestration" : p.subType, // Fixes backend typo match
        implementationPartner: p.implementationPartner,
        durationYears: Number(p.duration),           // Changed from tenure
        totalInvestment: Number(p.fundingTarget),    // Changed from fundingTarget
        primaryAddress: p.primaryAddress,            // Changed from location
        sdgs: p.sdgs.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n)), // Moved to root
        aiNarrative: p.aiNarrative,
        metadata: {
          aiNarrative: p.aiNarrative
        }
      }));

      const res: any = await bulkUploadProjectsAction(payload, publish);

      // Add a check to ensure the backend actually succeeded
      if (!res?.success) {
        throw new Error(res?.message || "Backend upload failed");
      }

      toast.success(`Successfully uploaded ${projects.length} projects!`, { id: toastId });
      router.push("/marketplace-projects");
    } catch (error: any) {
      toast.error(error.message || "Bulk upload failed.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeProject = projects[activeIndex];

  return (
    <div className="flex h-screen bg-[#fcfdfd] text-gray-900 font-sans overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader />

        {/* TOP BAR */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50">
              <Download size={14} /> Template
            </button>
            <button className="flex items-center gap-2 text-emerald-700 font-medium text-sm hover:bg-emerald-50 px-2 py-1 rounded">
              <Settings2 size={14} /> Global Settings
            </button>
          </div>
          <div className="flex items-center gap-4">
            {/* {errorCount > 0 && (
              <span className="flex items-center gap-1.5 text-red-600 text-sm font-bold bg-red-50 px-3 py-1.5 rounded-lg">
                <AlertCircle size={16} /> {errorCount} Error{errorCount > 1 ? "s" : ""} Found
              </span>
            )} */}
            
            {/* NEW DISCARD BUTTON */}
            <button 
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Discard
            </button>

            <button 
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50"
            >
              Save Draft
            </button>
            <button 
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#1a82c4] text-white rounded-lg text-sm font-bold hover:bg-[#156a9c]"
            >
              Publish Project
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT (SPREADSHEET + INSPECTOR) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT PANEL: SPREADSHEET GRID */}
          <div className="flex-1 overflow-auto bg-gray-50/30">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 bg-white shadow-sm z-10 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10 border-b border-gray-200 text-center">✓</th>
                  <th className="p-3 border-b border-gray-200 min-w-[200px]">Project Title *</th>
                  <th className="p-3 border-b border-gray-200 min-w-[150px]">Project Type *</th>
                  <th className="p-3 border-b border-gray-200 min-w-[150px]">Sub-Type</th>
                  <th className="p-3 border-b border-gray-200 min-w-[180px]">Partner</th>
                  <th className="p-3 border-b border-gray-200 min-w-[100px]">Duration (Yrs)</th>
                  <th className="p-3 border-b border-gray-200 min-w-[150px]">Investment ($) *</th>
                  <th className="p-3 border-b border-gray-200 min-w-[200px]">Primary Address</th>
                  <th className="p-3 border-b border-gray-200 min-w-[120px]">SDGs</th>
                  <th className="p-3 border-b border-gray-200 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {projects.map((proj, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <tr 
                      key={proj.id} 
                      onClick={() => setActiveIndex(idx)}
                      className={`border-b border-gray-100 cursor-text transition-colors
                        ${isActive ? "bg-blue-50/40 ring-1 ring-inset ring-[#1a82c4]" : "hover:bg-gray-50"}
                      `}
                    >
                      <td className="p-3 text-center border-r border-gray-100">
                        {proj.hasError ? (
                          <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] mx-auto">!</div>
                        ) : proj.title ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] mx-auto">✓</div>
                        ) : null}
                      </td>
                      <td className={`p-0 border-r border-gray-100 ${!proj.title && proj.hasError ? "bg-red-50" : ""}`}>
                        <input 
                          value={proj.title}
                          onChange={(e) => updateRow(idx, "title", e.target.value)}
                          className="w-full h-12 px-3 bg-transparent outline-none text-sm font-medium text-gray-900 focus:bg-white"
                          placeholder="Project Name..."
                        />
                      </td>
                      <td className={`p-0 border-r border-gray-100 ${!proj.projectType && proj.hasError ? "bg-red-50" : ""}`}>
                        <select 
                          value={proj.projectType}
                          onChange={(e) => updateRow(idx, "projectType", e.target.value)}
                          className="w-full h-12 px-3 bg-transparent outline-none text-sm text-gray-700 cursor-pointer focus:bg-white"
                        >
                          <option value="">Select Type</option>
                          <option value="Water">Water</option>
                          <option value="Nature">Nature</option>
                          <option value="Energy">Energy</option>
                        </select>
                      </td>
                      <td className="p-0 border-r border-gray-100">
                        <select 
                          value={proj.subType}
                          onChange={(e) => updateRow(idx, "subType", e.target.value)}
                          className="w-full h-12 px-3 bg-transparent outline-none text-sm text-gray-700 cursor-pointer focus:bg-white"
                        >
                          <option value="">Select Sub-Type</option>
                          <option value="Groundwater">Groundwater</option>
                          <option value="Reforestration">Reforestation</option>
                        </select>
                      </td>
                      <td className="p-0 border-r border-gray-100">
                        <select 
                          value={proj.implementationPartner}
                          onChange={(e) => updateRow(idx, "implementationPartner", e.target.value)}
                          className="w-full h-12 px-3 bg-transparent outline-none text-sm text-gray-700 cursor-pointer focus:bg-white"
                        >
                          <option value="">Select Partner</option>
                          <option value="GreenEarth Org">GreenEarth Org</option>
                          <option value="Missing Field">Missing Field</option>
                        </select>
                      </td>
                      <td className="p-0 border-r border-gray-100">
                        <input 
                          type="number"
                          value={proj.duration}
                          onChange={(e) => updateRow(idx, "duration", e.target.value)}
                          className="w-full h-12 px-3 bg-transparent outline-none text-sm text-gray-700 text-right focus:bg-white"
                          placeholder="e.g. 15"
                        />
                      </td>
                      <td className={`p-0 border-r border-gray-100 ${!proj.fundingTarget && proj.hasError ? "bg-red-50" : ""}`}>
                        <input 
                          type="number"
                          value={proj.fundingTarget}
                          onChange={(e) => updateRow(idx, "fundingTarget", e.target.value)}
                          className="w-full h-12 px-3 bg-transparent outline-none text-sm text-gray-700 text-right focus:bg-white"
                          placeholder="e.g. 1250000"
                        />
                      </td>
                      <td className="p-0 border-r border-gray-100">
                        <input 
                          value={proj.primaryAddress}
                          onChange={(e) => updateRow(idx, "primaryAddress", e.target.value)}
                          className="w-full h-12 px-3 bg-transparent outline-none text-sm text-gray-700 focus:bg-white"
                          placeholder="123 Street..."
                        />
                      </td>
                      <td className="p-0 border-r border-gray-100">
                        <input 
                          value={proj.sdgs}
                          onChange={(e) => updateRow(idx, "sdgs", e.target.value)}
                          className="w-full h-12 px-3 bg-transparent outline-none text-sm text-gray-700 focus:bg-white"
                          placeholder="7, 13, 15..."
                        />
                      </td>
                      <td className="p-0 text-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeRow(idx); }}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            
            <button 
              onClick={addRow}
              className="mt-4 ml-4 flex items-center gap-2 text-sm font-semibold text-[#1a82c4] hover:text-[#156a9c]"
            >
              <Plus size={16} /> Add new project...
            </button>
          </div>

          {/* RIGHT PANEL: ROW INSPECTOR */}
          <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-20">
            {/* Inspector Header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 truncate pr-4">
                    {activeProject?.title || "Untitled Project"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {activeProject?.hasError && (
                      <span className="bg-red-100 text-red-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">1 Error</span>
                    )}
                    <span className="text-xs text-gray-500">Row {activeIndex + 1} Inspector</span>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-900"><X size={16} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* AI Insights Section */}
              <div className="bg-[#f2fcf5] border border-emerald-100 p-4 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <Wand2 size={16} /> AI Insights
                  </h3>
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">BETA</span>
                </div>
                <button 
                  onClick={handleGenerateAi}
                  className="w-full bg-white border border-emerald-600 text-emerald-700 font-bold text-xs py-2 rounded-lg mb-3 flex items-center justify-center gap-2 hover:bg-emerald-50 transition"
                >
                  <Wand2 size={14} /> Generate Narrative
                </button>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Generated Narrative</label>
                  <textarea 
                    value={activeProject?.aiNarrative}
                    onChange={(e) => updateRow(activeIndex, "aiNarrative", e.target.value)}
                    rows={4}
                    className="w-full text-xs text-gray-700 p-2 border border-emerald-200 rounded outline-none focus:ring-1 ring-emerald-500 resize-none"
                    placeholder="Generative AI context will appear here..."
                  />
                </div>
              </div>

              {/* Media & Documents Section */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                  📁 Media & Documents
                </h3>
                
                {/* Images */}
                <div className="mb-4">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Project Images</label>
                  <div className="border-2 border-dashed border-[#1a82c4]/30 bg-[#f8fbff] rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-blue-50/50 transition">
                    <Upload size={16} className="text-[#1a82c4] mb-1" />
                    <p className="text-xs text-gray-600 font-medium">Drag & drop or browse</p>
                  </div>
                </div>

                {/* Documents */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Supporting Documents</label>
                  <button className="w-full flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 mb-2">
                    <Plus size={14} className="text-emerald-600" /> Upload Document
                  </button>
                  
                  {/* Mock Uploaded File */}
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-md px-3 py-2 text-xs">
                    <span className="flex items-center gap-2 text-red-600 font-medium">
                      📄 budget_forecast.pdf
                    </span>
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>1.2 MB</span>
                      <X size={12} className="hover:text-red-500 cursor-pointer" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}