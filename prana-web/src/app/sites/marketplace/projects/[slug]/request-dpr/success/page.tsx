"use client";

import Link from "next/link";
import { Check, Info, LayoutGrid, ShoppingBag } from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import Footer from "@/components/marketplace/footer";

export default function DPRSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketplaceNavbar />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-10 max-w-[600px] w-full text-center">
          
          <div className="w-16 h-16 bg-[#34d399] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>

          <h1 className="text-3xl font-extrabold text-[#0f172a] mb-4">Inquiry Received</h1>
          
          <p className="text-sm text-gray-600 mb-8 px-4 leading-relaxed">
            Thank you for submitting your DPR inquiry. Our sustainability analysts are reviewing your data to ensure the highest level of technical precision.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1 border border-gray-200 rounded-lg p-4 text-left">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reference Number</p>
              <p className="text-lg font-bold text-[#1a82c4]">PE-DPR-2024-8921</p>
            </div>
            <div className="flex-1 border border-gray-200 rounded-lg p-4 text-left">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estimated Lead Time</p>
              <p className="text-lg font-bold text-gray-900">3 Business Days</p>
            </div>
          </div>

          <div className="bg-[#f0f5fb] rounded-lg p-6 text-left border-l-4 border-[#1a82c4] mb-8">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Info size={16} className="text-[#1a82c4]" /> What happens next?
            </h4>
            <ol className="space-y-4 text-[13px] text-gray-600 list-decimal pl-4">
              <li><span className="font-semibold text-gray-800">Analysis phase:</span> Our team verifies the satellite telemetry and climate risk parameters for your site.</li>
              <li><span className="font-semibold text-gray-800">Notification:</span> You will receive an email confirmation once the DPR report is generated and ready for review.</li>
              <li><span className="font-semibold text-gray-800">Dashboard Update:</span> The report will automatically appear in your Analytics dashboard.</li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link 
              href="/" 
              className="w-full sm:w-1/2 bg-[#0e5c8c] hover:bg-[#0a466b] text-white font-semibold py-3 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-md"
            >
              <LayoutGrid size={16} /> Return to Home
            </Link>
            <Link 
              href="/marketplace/projects" 
              className="w-full sm:w-1/2 bg-[#dbeafe] hover:bg-[#bfdbfe] text-[#1e3a8a] font-semibold py-3 px-4 rounded-lg text-sm transition flex items-center justify-center gap-2"
            >
              <ShoppingBag size={16} /> Browse Marketplace
            </Link>
          </div>

          <p className="text-[11px] text-gray-500">
            Need immediate assistance? <Link href="/marketplace/contact" className="text-[#1a82c4] hover:underline">Contact our support team</Link>
          </p>
          
        </div>
      </main>

      <Footer />
    </div>
  );
}