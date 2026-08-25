import PredictNavbar from "@/components/predict/navbar"; // Adjust import path
import Sidebar from "@/components/predict/sidebar"; // Adjust import path
import MarketplaceFooter from "@/components/marketplace/footer";
import {
  Download,
  AlertTriangle,
  Calendar,
  Building2,
  ClipboardCheck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function OrganizationDashboard() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PredictNavbar />

      {/* Main Layout Container */}
      <div className="flex flex-1 max-w-full">
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Middle Section (Dashboard Content) */}
        <main
          className="flex-1 p-8 overflow-y-auto"
          style={{ maxWidth: "1153px" }}
        >
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Organization Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Climate risk overview across all assets
              </p>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                  Scenario (SSP)
                </label>
                <select className="border border-gray-200 rounded-md text-sm py-1.5 px-3 text-gray-700 outline-none w-32">
                  <option>SSP2-7.0</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                  Time Horizon
                </label>
                <select className="border border-gray-200 rounded-md text-sm py-1.5 px-3 text-gray-700 outline-none w-32">
                  <option>2040</option>
                </select>
              </div>
              <button className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-1.5 px-4 rounded-md mt-4">
                <Download size={16} /> Export Report
              </button>
            </div>
          </div>

          {/* Top Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {/* Risk Score Circle */}
            <div className="flex flex-col items-center justify-center">
              <p className="text-xs text-gray-400 mb-2">
                Org. Overall Risk Score
              </p>
              <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-4 border-orange-500 border-t-gray-100">
                <div className="text-center">
                  <span className="text-2xl font-bold text-gray-900">72</span>
                  <span className="text-xs text-gray-400 block">/100</span>
                </div>
              </div>
              <p className="text-xs font-semibold text-red-500 mt-2">
                High Risk
              </p>
            </div>

            {/* Stats */}
            <StatCard
              icon={<Building2 className="text-blue-500" />}
              title="Total Assets"
              value="84"
              subtext="Across 12 locations"
            />
            <StatCard
              icon={<ClipboardCheck className="text-green-500" />}
              title="Total Assessments Done"
              value="81"
              subtext="This includes all assets"
            />
            <StatCard
              icon={<AlertTriangle className="text-red-500" />}
              title="Top 3 Assets Under High Risk"
              value="18"
              subtext="21% of total assets"
            />
            <StatCard
              icon={<Calendar className="text-purple-500" />}
              title="Last 5 Asset Assessments"
              value="5"
              subtext="Most recent assessments"
            />
          </div>

          {/* Middle Row: Map & Top 3 High Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-sm font-bold text-gray-900 mb-4">
                Asset Location & Risk Map{" "}
                <span className="text-gray-400 font-normal">
                  (Overall Risk)
                </span>
              </p>
              <div className="w-full h-64 bg-blue-50 rounded-lg relative overflow-hidden border border-gray-200">
                {/* Replace with actual map component/image */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  Map Placeholder
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 mb-4">
                Top 3 Assets Under High Risk
              </p>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400">
                      <th className="pb-2 font-medium">Asset</th>
                      <th className="pb-2 font-medium">Location</th>
                      <th className="pb-2 font-medium">Overall Risk</th>
                      <th className="pb-2 font-medium">Main Hazard</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b border-gray-50">
                      <td className="py-3">
                        <p className="font-semibold text-gray-900 text-xs">
                          GreenTech DC-01
                        </p>
                        <p className="text-[10px] text-gray-400">Data Center</p>
                      </td>
                      <td className="py-3 text-xs text-gray-500">Hyderabad</td>
                      <td className="py-3">
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                          82
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500 flex items-center gap-1">
                        Flood
                      </td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="py-3">
                        <p className="font-semibold text-gray-900 text-xs">
                          Plant-03
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Manufacturing Plant
                        </p>
                      </td>
                      <td className="py-3 text-xs text-gray-500">Pune</td>
                      <td className="py-3">
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">
                          78
                        </span>
                      </td>
                      <td className="py-3 text-xs text-gray-500 flex items-center gap-1">
                        Heat Stress
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Table */}
          <div className="mb-6">
            <p className="text-sm font-bold text-gray-900 mb-4">
              Last 5 Asset Assessments
            </p>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="pb-2 font-medium">Asset</th>
                  <th className="pb-2 font-medium">Location</th>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Scenario</th>
                  <th className="pb-2 font-medium">Overall Risk</th>
                </tr>
              </thead>
              <tbody className="text-xs text-gray-500">
                <tr className="border-b border-gray-50">
                  <td className="py-3 text-gray-900 font-medium">
                    GreenTech DC-01
                  </td>
                  <td className="py-3">Hyderabad</td>
                  <td className="py-3">24 Jun 2026</td>
                  <td className="py-3">SSP3-7.0</td>
                  <td className="py-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>{" "}
                    High
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-gray-400 mb-6">
            <span>Assessment Date: 24 Jun 2026</span>
            <span className="border-l border-gray-300 pl-4">
              Last Updated: 2 hours ago
            </span>
            <span className="border-l border-gray-300 pl-4">
              Assessment ID: PE-ORG-2026-06-24-2040-SSP3-7.0
            </span>
          </div>

          <Link
            href="/marketplace"
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Explore Marketplace for more &gt;
          </Link>
        </main>
      </div>

      <MarketplaceFooter />
    </div>
  );
}

// Reusable Stat Component
function StatCard({
  icon,
  title,
  value,
  subtext,
}: {
  icon: any;
  title: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <p className="text-[10px] text-gray-400 mb-2">{title}</p>
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-400">{subtext}</p>
    </div>
  );
}
