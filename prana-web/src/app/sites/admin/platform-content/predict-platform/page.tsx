"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Globe, MapPin, Database, ShoppingCart, RefreshCw, Save } from "lucide-react";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminHeader from "@/components/admin/admin-header";

export default function PlatformContentPage() {
  const [formData, setFormData] = useState({
    // Global Impact Totals
    totalCarbonSaved: "124580",
    ethicalProductsVerified: "88.4",
    totalVerifiedProjects: "412",
    
    // Regional Coverage
    statesMonitored: "28",
    utsCovered: "8",
    activeMonitoringNodes: "1450",
    
    // Ecosystem Data
    rainforests: "12",
    wetlands: "24",
    islands: "8",
    biodiversityIndex: 8.4,
    
    // Marketplace Stats
    totalActiveListings: "1842",
    totalSavesGlobal: "25600",
    dprInquiriesMonth: "142"
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // API call placeholder: await updatePlatformContent(formData);
      toast.success("Platform content metrics updated successfully!");
    } catch (error) {
      toast.error("Failed to update platform metrics");
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

return (
    <div className="flex h-screen bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
      {/* Sidebar and Header component layout wrapper injections go around main content */}
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-[1500px] mx-auto">
            
            {/* Top Bar Header Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
              <div>
                <nav className="text-xs text-gray-400 font-medium mb-1">
                  Admin <span className="mx-1">/</span> <span className="text-emerald-600">Content Control</span>
                </nav>
                <h1 className="text-2xl font-bold text-gray-900">Platform Content Management</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage global metrics and display values for the frontend ecosystem.
                </p>
              </div>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-[#1a82c4] hover:bg-[#156a9c] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition self-end"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>

            {/* Grid Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Card 1: Global Impact Totals */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-6">
                  <span className="p-1.5 bg-blue-50 text-[#1a82c4] rounded-md"><Globe size={18} /></span>
                  Global Impact Totals
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Total Carbon Saved (Tons)</label>
                    <div className="relative">
                      <input type="text" name="totalCarbonSaved" value={formData.totalCarbonSaved} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-gray-400">MT CO2e</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ethical Products Verified (%)</label>
                    <div className="relative">
                      <input type="text" name="ethicalProductsVerified" value={formData.ethicalProductsVerified} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                      <span className="absolute right-3 top-2.5 text-xs font-semibold text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Total Verified Projects</label>
                    <input type="text" name="totalVerifiedProjects" value={formData.totalVerifiedProjects} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                  </div>
                </div>
              </div>

              {/* Card 2: Regional Coverage */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-6">
                  <span className="p-1.5 bg-blue-50 text-[#1a82c4] rounded-md"><MapPin size={18} /></span>
                  Regional Coverage (Pan-India)
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">States Monitored</label>
                      <input type="text" name="statesMonitored" value={formData.statesMonitored} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">UTs Covered</label>
                      <input type="text" name="utsCovered" value={formData.utsCovered} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Active Monitoring Nodes</label>
                    <div className="flex gap-2">
                      <input type="text" name="activeMonitoringNodes" value={formData.activeMonitoringNodes} onChange={handleInputChange} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                      <button className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50"><RefreshCw size={16} /></button>
                    </div>
                  </div>
                  <div className="border border-dashed border-gray-200 rounded-lg p-4 bg-[#f8fbff] text-center text-xs font-bold text-[#1a82c4] tracking-wider py-6">
                    MAP OVERLAY PREVIEW
                    <div className="text-[10px] text-gray-400 font-medium mt-1">INDIA REGIONAL VIEW ACTIVE</div>
                  </div>
                </div>
              </div>

              {/* Card 3: Ecosystem Data */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-6">
                  <span className="p-1.5 bg-blue-50 text-[#1a82c4] rounded-md"><Database size={18} /></span>
                  Ecosystem Data
                </h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Rainforests</label>
                      <input type="text" name="rainforests" value={formData.rainforests} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Wetlands</label>
                      <input type="text" name="wetlands" value={formData.wetlands} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Islands</label>
                      <input type="text" name="islands" value={formData.islands} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                    </div>
                  </div>
                  <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                    <div className="flex justify-between text-xs font-bold text-gray-700 mb-2">
                      <span>BIODIVERSITY INDEX</span>
                      <span className="text-[#1a82c4]">{formData.biodiversityIndex} / 10</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-[#1a82c4] h-2 rounded-full" style={{ width: `${formData.biodiversityIndex * 10}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 4: Marketplace Stats */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-6">
                  <span className="p-1.5 bg-blue-50 text-[#1a82c4] rounded-md"><ShoppingCart size={18} /></span>
                  Marketplace Stats
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Total Active Listings</label>
                      <input type="text" name="totalActiveListings" value={formData.totalActiveListings} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Total Saves (Global)</label>
                      <input type="text" name="totalSavesGlobal" value={formData.totalSavesGlobal} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">DPR Inquiries (Month)</label>
                    <input type="text" name="dprInquiriesMonth" value={formData.dprInquiriesMonth} onChange={handleInputChange} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a82c4]" />
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