import { BarChart3, Globe, CheckCircle2 } from "lucide-react";

export default function WhyPranaEarth({
  customMetrics,
}: {
  customMetrics?: any;
}) {
  const carbonSaved = customMetrics?.totalCarbonSaved || "4.2M";
  const verifiedProjects = customMetrics?.ethicalProductsVerified || "100%";

  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            Why Prana Earth?
          </h2>
          <p className="text-gray-500 text-[15px] leading-relaxed">
            Prana Earth integrates high-fidelity risk intelligence with a
            transparent project marketplace to accelerate your journey to Net
            Zero.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left Column: Predict Platform */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <BarChart3 size={20} className="text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Predict Platform
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Leverage AI-driven risk intelligence to monitor climate impacts
              across your global footprint in real-time.
            </p>

            <div className="border-y border-gray-200 border-x-2 border-x-blue-600 rounded-lg p-6 bg-white shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-1.5">
                AI Risk Intelligence
              </h4>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Real-time predictive modeling for ecosystem vulnerability and
                asset-level climate risk reporting.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-100 rounded-xl p-5 bg-[#fafbfc]">
                <div className="text-xl font-bold text-blue-600 mb-1">
                  Pan-India
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  ALL 28 STATES & 8 UTS MONITORED
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl p-5 bg-[#fafbfc]">
                <div className="text-xl font-bold text-blue-600 mb-1">100%</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  DATA-DRIVEN INSIGHTS
                </div>
              </div>
            </div>

            <ul className="space-y-4 mt-2">
              <li className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="text-blue-600 shrink-0 mt-0.5 fill-blue-600 text-white"
                />
                <span className="text-sm text-gray-600">
                  Multi-spectral satellite monitoring for granular ecological
                  health tracking.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="text-blue-600 shrink-0 mt-0.5 fill-blue-600 text-white"
                />
                <span className="text-sm text-gray-600">
                  Automated TCFD and CSRD compliance reporting framework.
                </span>
              </li>
            </ul>
          </div>

          {/* Right Column: Marketplace Platform */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <Globe size={20} className="text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Marketplace Platform
              </h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Invest in nature-based solutions and high-quality carbon removals
              with verified provenance and ethical standards.
            </p>

            <div className="border-y border-gray-200 border-x-2 border-x-green-500 rounded-lg p-6 bg-white shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-1.5">
                Verified Carbon Removals
              </h4>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Every project is audited using our proprietary dMRV (Digital
                Monitoring, Reporting, and Verification) stack.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-100 rounded-xl p-5 bg-[#fafbfc]">
                <div className="text-xl font-bold text-green-500 mb-1">
                  {carbonSaved}
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  TONS CARBON SAVED
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl p-5 bg-[#fafbfc]">
                <div className="text-xl font-bold text-green-500 mb-1">
                  {verifiedProjects}
                </div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  VERIFIED PROJECTS
                </div>
              </div>
            </div>

            <ul className="space-y-4 mt-2">
              <li className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="text-green-500 shrink-0 mt-0.5 fill-green-500 text-white"
                />
                <span className="text-sm text-gray-600">
                  Direct access to primary carbon sequestration and biodiversity
                  restoration projects.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2
                  size={18}
                  className="text-green-500 shrink-0 mt-0.5 fill-green-500 text-white"
                />
                <span className="text-sm text-gray-600">
                  Ethical impact tracking focused on local community benefits
                  and wildlife preservation.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
