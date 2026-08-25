"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import { toast } from "sonner";
import { Filter, Plus, Pencil, Trash2, FileUp } from "lucide-react";
import {
  getProjects,
  updateProject,
  deleteProject,
} from "@/actions/project.actions";

export default function MarketplaceProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedSDG, setSelectedSDG] = useState("");

  // For delete project modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      const res: any = await getProjects({
        page: 1,
        pageSize: 50,
        projectType: selectedType || undefined,
        status: selectedStatus || undefined,
        sdg: selectedSDG || undefined,
      });

      if (res?.success) {
        const projectsList = res.data?.items || res.data || [];
        setProjects(projectsList);
      }
    };
    fetchProjects();
  }, [selectedType, selectedStatus, selectedSDG]); // Triggers fetch on filter change

  // --- ACTIONS ---
  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus =
      currentStatus === "Published" ? "Unpublished" : "Published";
    try {
      // await updateProject(id, { status: newStatus.toUpperCase() });
      toast.success(`Project marked as ${newStatus}`);
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p)),
      );
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      toast.success("Project deleted successfully");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1500px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Marketplace Projects
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage, review, and publish sustainability projects for the
                  global marketplace.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link href="/marketplace-projects/bulk-upload" className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
                  Bulk Action
                </Link>
                <Link
                  href="/marketplace-projects/create"
                  className="flex items-center gap-2 bg-[#1a82c4] hover:bg-[#156a9c] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition"
                >
                  <Plus size={16} /> Add New Project
                </Link>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Filter size={16} /> Filters:
                </div>
                {/* 1. Project Type */}
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full sm:w-auto border border-gray-200 rounded-md text-sm px-3 py-1.5 focus:outline-none focus:border-[#1a82c4]"
                >
                  <option value="">Project Type</option>
                  <option value="Carbon Capture">Carbon Capture</option>
                  <option value="Renewable Energy">Renewable Energy</option>
                </select>
                {/* 2. Status */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full sm:w-auto border border-gray-200 rounded-md text-sm px-3 py-1.5 focus:outline-none focus:border-[#1a82c4]"
                >
                  <option value="">Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="FUNDING_OPEN">Funding Open</option>
                  <option value="UPCOMING">Upcoming</option>
                </select>
                {/* 3. SDG Goals */}
                <select
                  value={selectedSDG}
                  onChange={(e) => setSelectedSDG(e.target.value)}
                  className="w-full sm:w-auto border border-gray-200 rounded-md text-sm px-3 py-1.5 focus:outline-none focus:border-[#1a82c4]"
                >
                  <option value="">SDG Goals</option>
                  <option value="1 No Poverty">1 No Poverty</option>
                  <option value="2 Zero Hunger">2 Zero Hunger</option>
                  <option value="6 Clean Water">6 Clean Water</option>
                  <option value="7 Affordable Energy">7 Affordable Energy</option>
                  <option value="9 Industry & Innovation">9 Industry & Innovation</option>
                  <option value="13 Climate Action">13 Climate Action</option>
                  <option value="14 Life Below Water">14 Life Below Water</option>
                  <option value="15 Life on Land">15 Life on Land</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setSelectedType("");
                  setSelectedStatus("");
                  setSelectedSDG("");
                }}
                className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
              >
                Clear Filters
              </button>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="flex-1 overflow-x-auto">
                {projects.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No marketplace projects found.
                  </div>
                ) : (
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="text-[11px] text-gray-500 font-bold uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4">Project</th>
                        <th className="px-6 py-4">Implementation Partner</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">SDGs</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Engagement</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((project, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4 min-w-[250px]">
                              <div className="w-12 h-12 bg-gray-200 rounded-md shrink-0"></div>
                              <div>
                                <p className="font-bold text-gray-900">
                                  {project.title}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {project.location}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 font-medium">
                            {project.metadata?.implementationPartner || "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="border border-gray-200 text-gray-600 px-2.5 py-1 rounded text-xs font-medium">
                              {project.projectType || "N/A"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              {project.metadata?.targetSdgs?.map(
                                (sdgStr: string) => {
                                  // Extracts the number prefix from strings like "13 Climate Action"
                                  const sdgNum =
                                    sdgStr.match(/\d+/)?.[0] || "?";
                                  return (
                                    <span
                                      key={sdgStr}
                                      className="bg-emerald-500 text-white w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold"
                                    >
                                      {sdgNum}
                                    </span>
                                  );
                                },
                              ) || <span className="text-gray-400">—</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`flex items-center w-max gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${project.status === "Published" ? "bg-emerald-50 text-emerald-700" : project.status === "Draft" ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-700"}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${project.status === "Published" ? "bg-emerald-500" : "bg-gray-400"}`}
                              ></span>
                              {project.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500 space-y-1">
                            <p>⚑ {project.saves ?? 0} Saves</p>
                            <p>↗ {project.leads ?? 0} Leads</p>
                          </td>

                          {/* Dynamic Actions Column */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-4">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/marketplace-projects/create?editId=${project.id}`,
                                  )
                                }
                                className="text-gray-500 hover:text-gray-900 transition"
                                title="Edit Project"
                              >
                                <Pencil size={16} />
                              </button>

                              {project.status === "Published" && (
                                <button
                                  onClick={() =>
                                    handleStatusToggle(
                                      project.id,
                                      project.status,
                                    )
                                  }
                                  className="w-24 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 py-1.5 rounded text-xs font-semibold transition"
                                >
                                  Unpublish
                                </button>
                              )}

                              {project.status === "Unpublished" && (
                                <button
                                  onClick={() =>
                                    handleStatusToggle(
                                      project.id,
                                      project.status,
                                    )
                                  }
                                  className="w-24 bg-[#236b4e] text-white hover:bg-[#1a523b] py-1.5 rounded text-xs font-semibold transition"
                                >
                                  Publish
                                </button>
                              )}

                              {project.status === "Draft" && (
                                <button
                                  onClick={() =>
                                    handleStatusToggle(
                                      project.id,
                                      project.status,
                                    )
                                  }
                                  className="w-24 flex items-center justify-center text-gray-500 hover:text-gray-900 transition"
                                  title="Publish Draft"
                                >
                                  <FileUp size={16} />
                                </button>
                              )}

                              <button
                                onClick={() => setDeleteId(project.id)}
                                className="text-red-500 hover:text-red-700 transition"
                                title="Delete Project"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-white">
                <span>Showing 1 to 5 of 24 projects</span>
                <div className="flex items-center gap-1">
                  <button className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">
                    Previous
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-[#1a82c4] bg-[#1a82c4] text-white rounded font-bold">
                    1
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50">
                    2
                  </button>
                  <button className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">
                    3
                  </button>
                  <span className="px-2">...</span>
                  <button className="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50">
                    5
                  </button>
                  <button className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-100 p-6 mx-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
              <h3 className="text-[#1a82c4] font-bold text-lg flex items-center gap-2">
                ⚠ Delete Project?
              </h3>
              <button
                onClick={() => setDeleteId(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this project ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDelete(deleteId);
                  setDeleteId(null);
                }}
                className="px-5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-lg text-sm font-semibold shadow-sm transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
