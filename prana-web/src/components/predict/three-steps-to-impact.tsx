import Link from 'next/link';
import {
  Globe,
  Shield,
  TrendingUp
} from 'lucide-react';

export default function ThreeStepsToImpact(){
    const steps = [
  {
    num: "01",
    icon: <TrendingUp />,
    title: "Assess Climate Risk",
    desc: "Our AI analyses your business operations to identify climate vulnerabilities and opportunities",
  },
  {
    num: "02",
    icon: <Globe />,
    title: "Match Projects",
    desc: "Get matched with verified environmental projects aligned with your risk profile and values",
  },
  {
    num: "03",
    icon: <Shield />,
    title: "Track Impact",
    desc: "Monitor real-time metrics and generate compliance-ready reports for stakeholders",
  },
];

    return (
        <>
            {/* ── THREE STEPS ── */}
                  <section className="bg-white">
                    {/* <hr className='bg-gray-50'/> */}
                    <div className="max-w-[1200px] mx-auto px-6 py-20">
                      <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-[38px] font-extrabold text-[#1a1a1a] mb-2.5">
                          Three Steps to Impact
                        </h2>
                        <p className="text-sm text-gray-500">
                          From risk assessment to measurable action
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {steps.map((s) => (
                          <div
                            key={s.title}
                            className="bg-white border border-gray-200 rounded-xl p-7 relative"
                          >
                            <span className="absolute top-5 right-5 text-4xl font-black text-gray-100 leading-none">
                              {s.num}
                            </span>
                            <div className="inline-flex bg-green-50 border border-green-200 rounded-xl p-2.5 mb-4 text-xl">
                              {s.icon}
                            </div>
                            <h3 className="text-base font-bold mb-2.5 flex items-center gap-1.5">
                              {s.title}
                              <span className="text-green-600 text-sm">›</span>
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              {s.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="text-center mt-8">
                        <Link
                          href="#"
                          className="text-sm font-semibold text-[#1a82c4] inline-flex items-center gap-1"
                        >
                          Learn more about our process →
                        </Link>
                      </div>
                    </div>
                  </section>
        </>
    )
}