"use client";

import React, { useState } from "react";
import { Share2, Download, CheckCircle2, Info, Activity, Droplets } from "lucide-react";

export default function ConceptNotePage() {
  const [activeTab, setActiveTab] = useState("methodology");

  // Simulates downloading a file
  const handleDownload = () => {
    const dummyContent = "This is a placeholder for the actual 54-page PDF content.";
    const blob = new Blob([dummyContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Water_Restoration_Concept_Note.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="bg-white p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-t-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded tracking-wider uppercase">Premium Concept Note</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-wider uppercase">
                <CheckCircle2 size={12} /> Verified
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Water Restoration Project</h1>
            <p className="text-xs text-gray-500 mt-1">Full Technical & Financial Documentation (54 Pages)</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Share2 size={16} /> Share
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 bg-[#1a82c4] hover:bg-[#156a9c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download size={16} /> Download PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mt-6">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 px-2">Contents</h3>
              <nav className="space-y-1">
                {[
                  { id: "methodology", label: "1. Methodology & Logic" },
                  { id: "audits", label: "2. Technical Audits" },
                  { id: "moisture", label: "2.1 Soil Moisture Analysis", indent: true },
                  { id: "biomass", label: "2.2 Biomass Density Scans", indent: true },
                  { id: "financials", label: "3. Financial Projections" },
                  { id: "risks", label: "4. Risk Assessment" },
                  { id: "verification", label: "5. Data Source Verification" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      item.indent ? "pl-6" : "font-medium"
                    } ${
                      activeTab === item.id 
                        ? "bg-gray-100 text-gray-900 font-bold" 
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 space-y-6">
            
            {/* Section 1 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">1. Methodology & Carbon Sequestration Logic</h2>
              <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
                <p className="font-bold text-gray-900">The Maharashtra Water Conservation project utilizes a multi-layered hydrological restoration framework.</p>
                <p>By integrating satellite-derived LIDAR data with ground-level soil moisture sensors, we establish a baseline for carbon sequestration potential in semi-arid regions. The primary mechanism involves the enhancement of biomass density through enhanced root system development which facilitates deep-soil carbon storage.</p>
                <p>Our proprietary algorithms calculate the net-zero impact by cross-referencing historical precipitation patterns with current vegetation indices. Furthermore, the financial modeling accounts for a 15-year credit issuance cycle, factoring in a buffer pool of 20% to mitigate reversal risks associated with extreme weather events.</p>
                <p>The technical audit conducted by SGS confirms that the decentralized check dam architecture increases localized water table recharge by an average of 1.2 meters annually. This recharge directly correlates to the survival rate of native broadleaf species, which are the primary drivers of long-term sequestration in this specific bioregion.</p>
                
                <div className="bg-[#f8faf9] border border-gray-100 rounded-lg p-4 flex gap-3 mt-4">
                  <Info className="text-gray-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs font-bold text-gray-900 mb-1">Key Algorithm Output</p>
                    <p className="text-xs text-gray-600">The predictive model indicates a <strong className="text-gray-900">94% probability</strong> of meeting the stated sequestration goals within the first 5-year monitoring period, assuming average monsoon conditions.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">2. Technical Audits</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity size={16} className="text-gray-500" />
                    <h3 className="text-xs font-bold text-gray-900">LIDAR Scan Analysis</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">Pre-intervention topographical scans indicating severe erosion and minimal topsoil retention.</p>
                  <button className="text-[10px] font-bold text-[#1a82c4] hover:underline flex items-center gap-1">View Full Scan Data ↗</button>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets size={16} className="text-gray-500" />
                    <h3 className="text-xs font-bold text-gray-900">Hydrological Baseline</h3>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">Groundwater level recordings from 45 test wells across the 500-hectare target zone.</p>
                  <button className="text-[10px] font-bold text-[#1a82c4] hover:underline flex items-center gap-1">View Well Data ↗</button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-900 mb-3">2.1 Soil Moisture Analysis</h3>
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">Initial soil sampling reveals a predominantly sandy loam composition with high permeability. Baseline organic carbon content is currently measured at &lt;0.5%, providing significant capacity for increase post-intervention.</p>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">Test Site</th>
                      <th className="px-4 py-3 font-medium">Depth (cm)</th>
                      <th className="px-4 py-3 font-medium">Moisture %</th>
                      <th className="px-4 py-3 font-medium">Organic Carbon %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-4 py-3 text-gray-900">Sector Alpha-1</td>
                      <td className="px-4 py-3 text-gray-600">15</td>
                      <td className="px-4 py-3 text-gray-600">12.4%</td>
                      <td className="px-4 py-3 text-amber-600 font-medium">0.3%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-900">Sector Alpha-2</td>
                      <td className="px-4 py-3 text-gray-600">30</td>
                      <td className="px-4 py-3 text-gray-600">14.1%</td>
                      <td className="px-4 py-3 text-amber-600 font-medium">0.4%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-900">Sector Beta-1</td>
                      <td className="px-4 py-3 text-gray-600">15</td>
                      <td className="px-4 py-3 text-gray-600">9.8%</td>
                      <td className="px-4 py-3 text-red-600 font-medium">0.2%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 3 */}
            <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">3. Financial Projections</h2>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="space-y-3 shrink-0 w-full sm:w-48">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Investment Cap</p>
                    <p className="text-xl font-bold text-emerald-800">$450,000</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Projected IRR (5 YR)</p>
                    <p className="text-xl font-bold text-gray-900">14.2%</p>
                  </div>
                </div>
                <div className="text-sm text-gray-700 leading-relaxed pt-2">
                  <p>The financial model assumes a conservative carbon credit pricing structure, starting at $15/ton and scaling at 3% annually. CAPEX is heavily weighted in Year 1 for infrastructure development (check dams, contour trenches), while OPEX remains low, managed by trained community stakeholders.</p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}