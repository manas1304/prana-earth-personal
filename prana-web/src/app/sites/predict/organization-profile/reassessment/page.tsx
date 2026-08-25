"use client";

import { useState } from "react";
import PredictNavbar from "@/components/predict/navbar";
import Sidebar from "@/components/predict/sidebar";
import MarketplaceFooter from "@/components/marketplace/footer";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Calendar,
  ShieldAlert,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileText,
  History,
  Bell,
  ArrowRight,
  CheckSquare,
  Square
} from "lucide-react";

export default function ReassessmentWorkflowPage() {
  const [selectedAsset, setSelectedAsset] = useState<string>("mumbai");

  const assets = [
    { id: "mumbai", name: "Mumbai Data Center", type: "Data Center", location: "Mumbai, Maharashtra, India", date: "31 May 2024", score: "72(High)", variant: "high" },
    { id: "pune", name: "Pune Manufacturing Unit", type: "Manufacturing Unit", location: "Pune, Maharashtra, India", date: "29 May 2024", score: "45(Moderate)", variant: "mod" },
    { id: "hyd", name: "Hyderabad Warehouse", type: "Warehouse", location: "Hyderabad, Telangana, India", date: "28 May 2024", score: "68(High)", variant: "high" },
    { id: "delhi", name: "Delhi Office Campus", type: "Office Campus", location: "New Delhi, Delhi, India", date: "26 May 2024", score: "22(Low)", variant: "low" },
    { id: "blr", name: "Bengaluru Facility", type: "Industrial Facility", location: "Bengaluru, Karnataka, India", date: "24 May 2024", score: "47(Moderate)", variant: "mod" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PredictNavbar />

      <div className="flex flex-1 max-w-full">
        <div className="hidden lg:block"><Sidebar/></div>

        {/* Middle Section Dashboard Layout */}
        <main 
          className="flex-1 p-8 overflow-y-auto bg-[#FCFCFE] flex flex-col justify-between" 
          style={{ maxWidth: "1145px", minHeight: "855px" }}
        >
          <div>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Reassessment Workflow</h1>
              <p className="text-sm text-gray-500 mt-1">
                Reassess an existing asset to get updated climate risk intelligence.
              </p>
            </div>

            {/* Split Grid Views */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
              
              {/* Left Column: Asset Selection */}
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-1">Select Assets to Reassess</h2>
                  <p className="text-xs text-gray-400 mb-4">Choose an existing asset/location that you wish to update.</p>
                  
                  {/* Search and Filter Row */}
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center shadow-sm">
                      <Search size={16} className="text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search assets by name or location" 
                        className="w-full pl-3 text-xs outline-none text-gray-700 placeholder-gray-400"
                      />
                    </div>
                    <button className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-semibold text-gray-600 flex items-center gap-6 shadow-sm">
                      All Asset Types <ChevronDown size={14} className="text-gray-400" />
                    </button>
                  </div>

                  {/* Asset Table */}
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 text-[10px] text-gray-400 border-b border-gray-200 uppercase font-bold tracking-wider">
                          <th className="py-3 px-4 w-10"></th>
                          <th className="py-3 px-2">Asset Name</th>
                          <th className="py-3 px-2">Asset Type</th>
                          <th className="py-3 px-2">Location</th>
                          <th className="py-3 px-2">Last Assessment</th>
                          <th className="py-3 px-4 text-right">Risk Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assets.map((asset) => {
                          const isSelected = selectedAsset === asset.id;
                          return (
                            <tr 
                              key={asset.id} 
                              onClick={() => setSelectedAsset(asset.id)}
                              className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors text-xs ${
                                isSelected ? "bg-emerald-50/40 hover:bg-emerald-50/60" : "hover:bg-gray-50/50"
                              }`}
                            >
                              <td className="py-4 px-4 text-center">
                                {isSelected ? (
                                  <CheckSquare size={16} className="text-[#0b5cff]" />
                                ) : (
                                  <Square size={16} className="text-gray-300" />
                                )}
                              </td>
                              <td className="py-4 px-2 font-bold text-gray-800">{asset.name}</td>
                              <td className="py-4 px-2 text-gray-500 font-medium">{asset.type}</td>
                              <td className="py-4 px-2 text-gray-400 truncate max-w-[140px]">{asset.location}</td>
                              <td className="py-4 px-2 text-gray-500 font-medium">{asset.date}</td>
                              <td className="py-4 px-4 text-right">
                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold tracking-wide ${
                                  asset.variant === 'high' ? 'bg-red-50 text-red-600 border border-red-100' :
                                  asset.variant === 'mod' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                  'bg-green-50 text-green-600 border border-green-100'
                                }`}>
                                  {asset.score}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] text-gray-400 font-medium">Showing 1 to 5 of 12 assets</span>
                    <div className="flex items-center gap-1">
                      <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50"><ChevronLeft size={12}/></button>
                      <button className="w-6 h-6 flex items-center justify-center bg-[#0b5cff] rounded text-white text-xs font-bold">1</button>
                      <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 text-xs font-semibold hover:bg-gray-50">2</button>
                      <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 text-xs font-semibold hover:bg-gray-50">3</button>
                      <span className="text-xs text-gray-300 px-0.5">...</span>
                      <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-500 text-xs font-semibold hover:bg-gray-50">3</button>
                      <button className="w-6 h-6 flex items-center justify-center border border-gray-200 rounded text-gray-400 hover:bg-gray-50"><ChevronRight size={12}/></button>
                    </div>
                  </div>
                </div>

                {/* What Happens Block */}
                <div>
                  <h3 className="text-xs font-bold text-gray-900 mb-4">What happens after reassessment?</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <WorkflowFeatureCard icon={<TrendingUp size={16} className="text-green-600"/>} bg="bg-green-50" title="Updated Insights" desc="Dashboard and risk analytics will be updated with new results." />
                    <WorkflowFeatureCard icon={<FileText size={16} className="text-purple-600"/>} bg="bg-purple-50" title="New Report" desc="A new report will be generated with the latest assessment." />
                    <WorkflowFeatureCard icon={<Clock size={16} className="text-amber-600"/>} bg="bg-amber-50" title="History Maintained" desc="Previous assessment reports will be saved in history." />
                    <WorkflowFeatureCard icon={<Bell size={16} className="text-blue-600"/>} bg="bg-blue-50" title="Notifications" desc="You will be notified once the reassessment is completed." />
                  </div>
                </div>
              </div>

              {/* Right Column: Asset Preview Sidebar Panel */}
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col gap-6">
                
                {/* Asset Mini Hero Info */}
                <div className="flex gap-4 items-start border-b border-gray-50 pb-4">
                  <div className="w-20 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 relative shadow-inner">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]"></div>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-6 bg-blue-500/80 rounded animate-pulse"></span>
                      <span className="w-1.5 h-8 bg-blue-400/80 rounded animate-pulse delay-75"></span>
                      <span className="w-1.5 h-4 bg-blue-600/80 rounded animate-pulse delay-150"></span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                      <MapPin size={14} className="text-gray-400" /> Mumbai, Maharashtra, India
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                      <Calendar size={14} className="text-gray-400" /> Last Assessment: <span className="text-gray-800 font-semibold">31 May 2024</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 font-medium">
                      <ShieldAlert size={14} className="text-gray-400" /> Current Risk Score: 
                      <span className="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded text-[10px] font-bold">72(High)</span>
                    </div>
                    <button className="text-blue-600 font-bold text-[11px] flex items-center gap-1 mt-1 hover:underline">
                      View Last Report <ExternalLink size={12} />
                    </button>
                  </div>
                </div>

                {/* Overwrite Alert Container */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-xs">
                  <div className="flex items-center gap-2 text-amber-800 font-bold mb-1">
                    <AlertTriangle size={16} className="text-amber-600" /> Important
                  </div>
                  <p className="text-amber-700 leading-relaxed font-medium mb-3">
                    Reassessment will generate updated climate risk intelligence based on the latest data and overwrite current dashboard insights for this asset.
                  </p>
                  <button className="text-blue-600 font-bold flex items-center gap-1.5 hover:underline text-[11px]">
                    <span className="w-3 h-3 rounded-full border border-blue-600 flex items-center justify-center text-[8px] font-black">i</span> 
                    Learn more about reassessment
                  </button>
                </div>

                {/* Assessment History Timeline List */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900 mb-4">
                    <History size={16} className="text-gray-500" /> Assessment History
                  </div>
                  
                  <div className="flex flex-col gap-3.5 mb-4">
                    <HistoryRow date="31 May 2024 10:30 AM" status="Completed" score="72(High)" variant="high" />
                    <HistoryRow date="15 Nov 2023 02:15 PM" status="Completed" score="65(High)" variant="high" />
                    <HistoryRow date="04 May 2023 11:05 AM" status="Completed" score="58(Moderate)" variant="mod" />
                  </div>

                  <button className="w-full text-center border border-gray-200 hover:bg-gray-50 rounded-lg py-2 text-xs font-bold text-gray-700 transition-colors shadow-sm">
                    View All History
                  </button>
                </div>

              </div>

            </div>
          </div>

          {/* Core Footer Actions Group */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
            <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold py-2.5 px-8 rounded-lg transition-colors">
              Cancel
            </button>
            <button className="bg-[#0b5cff] hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
              Start Assessment <ArrowRight size={14} />
            </button>
          </div>

        </main>
      </div>

      <MarketplaceFooter />
    </div>
  );
}

// Internal Feature helper card components
function WorkflowFeatureCard({ icon, bg, title, desc }: { icon: any; bg: string; title: string; desc: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex gap-3 shadow-sm items-start">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-bold text-gray-900">{title}</h4>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// Internal history rows helper components
function HistoryRow({ date, status, score, variant }: { date: string; status: string; score: string; variant: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[10px] font-medium border-b border-gray-50 pb-2 last:border-0 last:pb-0">
      <span className="text-gray-400 whitespace-nowrap">{date}</span>
      <span className="text-green-600 font-bold">{status}</span>
      <div className="flex items-center gap-1 whitespace-nowrap">
        <span className="text-[9px] text-gray-400">Risk Score:</span>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${variant === 'high' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
          {score}
        </span>
      </div>
    </div>
  );
}