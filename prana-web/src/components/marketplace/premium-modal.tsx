import Link from "next/link";
import { X, Leaf, BarChart3, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PremiumModal({ isOpen, onClose }: PremiumModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-[750px] bg-white rounded-2xl shadow-2xl flex overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Blue Panel */}
        <div className="w-[35%] bg-gradient-to-b from-[#0e5c8c] to-[#0a466b] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <Leaf size={28} className="mb-4 text-white fill-white" />
            <h2 className="text-xl font-bold mb-2">Prana Premium</h2>
            <p className="text-sm text-blue-100/80 leading-relaxed">
              Elevating environmental intelligence for high-impact decision making.
            </p>
          </div>
          {/* Abstract background circles */}
          <div className="absolute -bottom-8 -left-8 w-40 h-40 border-[16px] border-white/10 rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 border-[16px] border-white/5 rounded-full" />
        </div>

        {/* Right Content Panel */}
        <div className="w-[65%] p-8 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>

          <h2 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
            Unlock Premium<br />Investment Access
          </h2>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed pr-4">
            Investing in high-impact environmental projects requires professional-grade intelligence. Upgrade to Prana Premium to access deep-tier data and secure investment workflows.
          </p>

          <div className="space-y-6 mb-10">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <BarChart3 size={18} className="text-blue-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Advanced Financial Risk Modeling</h4>
                <p className="text-xs text-gray-500 mt-1">Comprehensive stress testing against multiple climate change scenarios.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <MessageSquare size={18} className="text-blue-700 fill-blue-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Direct Developer Communication</h4>
                <p className="text-xs text-gray-500 mt-1">Secure, priority channels to project leads and on-the-ground stakeholders.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-emerald-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900">Verified Carbon Credit Tracking</h4>
                <p className="text-xs text-gray-500 mt-1">End-to-end provenance and issuance tracking for environmental assets.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-100">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
              Continue as Free<br />User
            </button>
            <Link href="/pricing" className="flex-1 bg-[#0e5c8c] hover:bg-[#0a466b] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 text-center leading-tight">
              View Premium<br />Plans <ArrowRight size={16} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}