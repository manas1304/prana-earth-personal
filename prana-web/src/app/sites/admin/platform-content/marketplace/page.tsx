"use client";

import React, { useState, useEffect } from "react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";
import { Globe, MapPin, Save, Leaf } from "lucide-react";
import { toast } from "sonner";
import {
  getPlatformContent,
  updatePlatformContent,
} from "@/actions/platform-content.actions";

export default function MarketplaceContentPage() {
  const [totalCarbon, setTotalCarbon] = useState("124580");
  const [verifiedProjects, setVerifiedProjects] = useState("88.4");
  const [organizationsCount, setOrganizationsCount] = useState("1450");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchContentMetrics() {
      try {
        const res: any = await getPlatformContent();
        if (res?.success && res?.data) {
          setTotalCarbon(res.data.totalCarbonSaved || "0");
          setVerifiedProjects(res.data.ethicalProductsVerified || "0");
          setOrganizationsCount(res.data.activeMonitoringNodes || "0");
        }
      } catch (err) {
        toast.error("Failed to load platform content configuration.");
      }
    }
    fetchContentMetrics();
  }, []);

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const loadId = toast.loading(
      "Updating global marketplace content counters...",
    );
    try {
      const res: any = await updatePlatformContent({
        totalCarbonSaved: totalCarbon,
        ethicalProductsVerified: verifiedProjects,
        activeMonitoringNodes: organizationsCount,
      });

      if (res?.success) {
        toast.success("Marketplace content modified successfully!", {
          id: loadId,
        });
      } else {
        toast.error(res?.message || "Failed to update configuration.", {
          id: loadId,
        });
      }
    } catch (err) {
      toast.error("A network communication error occurred.", { id: loadId });
    } finally {
      setIsSaving(false);
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
            {/* Breadcrumbs & Title Head Control Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                  <span>Admin</span>
                  <span>/</span>
                  <span className="text-gray-600">Content Control</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mt-1">
                  Marketplace Content Management
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Manage global metrics and display values for the frontend
                  ecosystem.
                </p>
              </div>
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="flex items-center gap-2 bg-[#1a82c4] hover:bg-[#156a9c] text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>

            {/* Grid Form Control Containers Row Block */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card Section 1: Metrics Why Prana Earth */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="bg-[#f8fafc] border-b border-gray-100 p-4 flex items-center gap-2 font-bold text-gray-700 text-sm">
                  <Globe size={16} className="text-[#1a82c4]" /> Why Prana Earth
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Total Carbon Saved (Tons)
                    </label>
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-[#fcfdfd]">
                      <input
                        type="text"
                        value={totalCarbon}
                        onChange={(e) => setTotalCarbon(e.target.value)}
                        className="flex-1 px-4 py-2 text-sm outline-none bg-transparent"
                      />
                      <div className="px-4 flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-50/50 border-l border-gray-100">
                        MT CO2e
                      </div>
                    </div>
                    <span className="block text-[10px] text-gray-400 italic mt-1.5">
                      Last Updated: 2h ago by System
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Verified Projects (%)
                    </label>
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-[#fcfdfd]">
                      <input
                        type="text"
                        value={verifiedProjects}
                        onChange={(e) => setVerifiedProjects(e.target.value)}
                        className="flex-1 px-4 py-2 text-sm outline-none bg-transparent"
                      />
                      <div className="px-4 flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-50/50 border-l border-gray-100">
                        %
                      </div>
                    </div>
                    <span className="block text-[10px] text-gray-400 italic mt-1.5">
                      Last Updated: Yesterday by Admin
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Section 2: Ready to Take Action Container Layout */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-fit">
                <div className="bg-[#f8fafc] border-b border-gray-100 p-4 flex items-center gap-2 font-bold text-gray-700 text-sm">
                  <MapPin size={16} className="text-[#1a82c4]" /> Ready to take
                  action
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Organization joined in taking action
                    </label>
                    <input
                      type="text"
                      value={organizationsCount}
                      onChange={(e) => setOrganizationsCount(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none bg-[#fcfdfd]"
                    />
                    <span className="block text-[10px] text-gray-400 italic mt-1.5">
                      Real-time sync enabled
                    </span>
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
