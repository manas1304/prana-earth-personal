"use client";

import Link from "next/link";
import { Check, ArrowLeft, Compass } from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import Footer from "@/components/marketplace/footer";
import { useParams } from "next/navigation";

export default function SuccessPage() {

  const params = useParams();
const slug = params?.slug;

  return (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden">
      {/* Background Gradients matching design */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#e6fcf5] rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 opacity-70" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#eff6ff] rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 opacity-80" />

      <MarketplaceNavbar />

      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-10 max-w-[480px] w-full text-center">
          
          <div className="w-16 h-16 bg-[#22c55e] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Check size={32} className="text-white" strokeWidth={3} />
          </div>

          <h1 className="text-2xl font-bold text-[#0f172a] mb-3 leading-tight">
            Interest Recorded<br />Successfully
          </h1>
          
          <p className="text-sm text-gray-500 mb-8 px-2 leading-relaxed">
            Our team will review your request and connect you with the project representatives within 2 business days.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link 
              href={`/projects/${slug}`}
              className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} /> Return to Project
            </Link>
            <Link 
              href="/projects" 
              className="flex-1 bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-2.5 px-4 rounded-lg text-xs transition flex items-center justify-center gap-2"
            >
              Explore More Projects <Compass size={14} />
            </Link>
          </div>
          
        </div>
      </main>

      <Footer />
    </div>
  );
}