import Image from "next/image";

const steps = [
  {
    num: 1,
    icon: "/icon-add-asset.png",
    title: "Add Your Asset",
    desc: "Provide basic details about your asset and location.",
  },
  {
    num: 2,
    icon: "/icon-climate-analysis.png",
    title: "Climate Analysis",
    desc: "Our platform analyzes climate data, hazards, and vulnerabilities.",
  },
  {
    num: 3,
    icon: "/icon-esg-insights.png",
    title: "ESG Insights",
    desc: "Explore climate risks, future scenarios, and ESG insights.",
  },
  {
    num: 4,
    icon: "/icon-download-report.png",
    title: "Download Report",
    desc: "Download executive reports with AI-powered recommendations.",
  },
  {
    num: 5,
    icon: "/icon-take-action.png",
    title: "Take Action",
    desc: "Discover adaptation solutions on the Prana Earth Marketplace.",
  },
];

export default function HowItWorks() {
  return (
    <section className="w-full bg-white py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-[0.15em] text-[#1a82c4] uppercase mb-3">
            How It Works
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Smart Climate Intelligence in 5 Simple Steps
          </h2>
          <p className="text-sm text-gray-500 max-w-[480px] mx-auto leading-relaxed">
            From asset assessment to actionable insights — our platform makes
            climate risk intelligence seamless and actionable.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 md:gap-0 ml-15">
          {steps.map((step, index) => (
            <div
              key={step.num}
              className="flex flex-col md:flex-row items-center w-full"
            >
              {/* Step Card */}
              <div className="flex flex-col items-center text-center w-full md:max-w-[160px]">
                {/* Number */}
                <div className="w-8 h-8 rounded-full border border-gray-300 text-gray-500 text-xs font-semibold flex items-center justify-center mb-4">
                  {step.num}
                </div>
                {/* Icon */}
                <div className="w-[80px] h-[80px] relative mb-4">
                  <Image
                    src={step.icon}
                    alt={step.title}
                    fill
                    sizes="80px"
                    className="object-contain"
                  />
                </div>
                {/* Title */}
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                {/* Desc */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              {/* Arrow — only between steps, not after last */}
              {index < steps.length - 1 && (
                <svg
                  width="80"
                  height="20"
                  viewBox="0 0 80 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <line
                    x1="0"
                    y1="10"
                    x2="65"
                    y2="10"
                    stroke="#0e5c8c"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M65 4L74 10L65 16"
                    stroke="#0e5c8c"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}

              {/* Mobile arrow (vertical) */}
              {index < steps.length - 1 && (
                <div className="flex md:hidden items-center justify-center w-full py-2">
                  <span className="text-gray-300 text-xl rotate-90">→</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
