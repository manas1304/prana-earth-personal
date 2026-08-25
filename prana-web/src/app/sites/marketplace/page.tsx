"use client";

import MarketplaceNavbar from "@/components/marketplace/navbar";
import MarketplaceFooter from "@/components/marketplace/footer";
import Link from "next/link";
import ImplementationPartners from "@/components/marketplace/implementation-partners";
import PartnerCTA from "@/components/marketplace/partner-cta";
import {
  Globe,
  Shield,
  TrendingUp,
  Check,
  TreePine,
  Earth,
  Droplet,
  Wind,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPlatformContent } from "@/actions/platform-content.actions";
import ProjectsCarousel from "@/components/marketplace/project-carousel";

// ─── DATA ────────────────────────────────────────────────────────────────────

const impactStats = [
  {
    icon: <TreePine size={24} className="text-green-500" />,
    value: "847",
    label: "Punjab",
  },
  {
    icon: <Earth size={24} className="text-blue-500" />,
    value: "623",
    label: "Maharashtra",
  },
  {
    icon: <Droplet size={24} className="text-cyan-400" fill="currentColor" />,
    value: "734",
    label: "Kerela",
  },
  {
    icon: <Wind size={24} className="text-teal-300" />,
    value: "296",
    label: "Gujarat",
  },
];

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

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function MarketplaceLandingPage() {
  // Inside MarketplaceLandingPage component, above the loginSuccess useEffect:
  const [contentMetrics, setContentMetrics] = useState({
    totalCarbonSaved: "4.2M",
    ethicalProductsVerified: "100%",
    activeMonitoringNodes: "1,200+",
  });

  useEffect(() => {
    async function loadLiveHeroMetrics() {
      try {
        const res: any = await getPlatformContent();
        if (res?.success && res?.data) {
          setContentMetrics({
            totalCarbonSaved: res.data.totalCarbonSaved
              ? `${Number(res.data.totalCarbonSaved).toLocaleString()} `
              : "4.2M",
            ethicalProductsVerified: res.data.ethicalProductsVerified
              ? `${res.data.ethicalProductsVerified}%`
              : "100%",
            activeMonitoringNodes: res.data.activeMonitoringNodes
              ? Number(res.data.activeMonitoringNodes).toLocaleString()
              : "1,200+",
          });
        }
      } catch (err) {
        console.error("Failed to load platform global analytics context.");
      }
    }
    loadLiveHeroMetrics();
  }, []);

  useEffect(() => {
    // Check if the flag exists
    if (sessionStorage.getItem("loginSuccess") === "true") {
      toast.success("Login Successfull!");
      // Clear the flag immediately so it doesn't repeat
      sessionStorage.removeItem("loginSuccess");
    }
  }, []);

  return (
    <div className="font-sans text-[#1a1a1a] bg-white">
      <MarketplaceNavbar />

      {/* ── HERO ── */}
      <section className="relative min-h-[520px] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-[url('/forest-sea-hero-bg.jpg')] bg-center bg-cover bg-no-repeat 
                     after:content-[''] after:absolute after:inset-0 after:bg-blue-100/85"
        />
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-20 text-center">
          <div className="md:whitespace-nowrap inline-flex items-center justify-center text-center gap-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] md:text-sm font-medium px-3 py-2 rounded-3xl mb-7 shadow-[0_1px_6px_rgba(0,0,0,0.08)] before:content-['●'] before:text-green-600 before:text-[9px] before:flex-shrink-0">
            Projects across multiple countries making a real impact
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold text-black leading-[1.1] mb-5 tracking-tight">
            Turn Climate Risk into
            <br />
            <span className="bg-gradient-to-r from-[#0ea5b0] to-[#22c55e] bg-clip-text text-transparent">
              Environmental Action
            </span>
          </h1>
          <p className="text-[17px] text-gray-800 max-w-[500px] mx-auto mb-9 leading-relaxed">
            The category-defining platform where climate risk intelligence
            becomes measurable environmental impact through verified projects
          </p>
          <div className="flex items-center justify-center gap-3.5 flex-wrap">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 bg-[#1a82c4] hover:bg-[#3a9fd4] text-white font-semibold text-[15px] px-7 py-3 rounded-xl transition-colors duration-200"
            >
              Explore Projects →
            </Link>
            <button className="inline-flex items-center gap-2 bg-white border-[1.5px] border-[#1a82c4] text-[#1a82c4] hover:border-[#3a9fd4] hover:text-[#3a9fd4] font-semibold text-[15px] px-7 py-3 rounded-xl transition-colors duration-200 cursor-pointer">
              ▶ Watch Demo
            </button>
          </div>
          <div className="mt-7 text-sm text-gray-500 flex items-center justify-center gap-1.5 before:content-['✓'] before:text-green-400">
            Trusted by top companies and renowned NGOs
          </div>
        </div>
      </section>

      {/* ── FEATURED PROJECTS ── */}
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-[38px] font-extrabold text-[#1a1a1a] mb-2.5">
            Featured Projects
          </h2>
          <p className="text-sm text-gray-500">
            High-impact interventions delivering measurable climate results.
          </p>
          <Link
            href="/projects"
            className="text-sm text-[#1a82c4] font-semibold inline-flex items-center gap-1 mt-2"
          >
            View All Projects →
          </Link>
        </div>
        <ProjectsCarousel />
      </div>

      {/* ── WHY PRANA EARTH ── */}
      {/* Replace your component usage selector flag with this property pass row link */}
      {/* <WhyPranaEarth customMetrics={contentMetrics} /> */}

      {/* ── FOREST + OCEAN ──
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="relative h-[280px] overflow-hidden group cursor-pointer">
          <img
            src="/forest-sea-hero-bg.jpg"
            alt="Forest Conservation"
            className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
          <div className="absolute bottom-0 left-0 right-0 p-6 color text-white">
            <div className="text-2xl mb-2">
              <Trees size={24} className="text-green-400" />
            </div>
            <h3 className="text-xl font-extrabold mb-1">Forest Conservation</h3>
            <p className="text-sm text-white/80 mb-2.5">
              Protecting 2.3M hectares of critical forest ecosystems worldwide
            </p>
            <Link
              href="/projects"
              className="text-sm font-semibold text-white flex items-center gap-1"
            >
              Explore Projects →
            </Link>
          </div>
        </div>
        <div className="relative h-[280px] overflow-hidden group cursor-pointer">
          <img
            src="/forest-sea-hero-bg.jpg"
            alt="Ocean Protection"
            className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="text-2xl mb-2">
              <Waves size={24} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-extrabold mb-1">Ocean Protection</h3>
            <p className="text-sm text-white/80 mb-2.5">
              Safeguarding marine biodiversity and coastal communities
            </p>
            <Link
              href="/projects"
              className="text-sm font-semibold text-white flex items-center gap-1"
            >
              Explore Projects →
            </Link>
          </div>
        </div>
      </div> */}

      {/* ── IMPACT BANNER ── */}
      <section className="relative bg-gradient-to-br from-[#1a6eb5] via-[#1a9e7a] to-[#16a34a] text-white text-center py-20 px-6 overflow-hidden after:content-[''] after:absolute after:inset-0 after:bg-[url('/forest-sea-hero-bg.jpg')] after:bg-center after:bg-cover after:bg-no-repeat after:opacity-10 after:z-0">
        <div className="relative flex items-center justify-center z-10 text-4xl mb-5">
          <Globe size={30} className="text-white" />
        </div>
        <h2 className="relative z-10 text-2xl md:text-4xl font-extrabold mb-4">
          Creating Impact Across the Country
        </h2>
        <p className="relative z-10 text-sm text-white/80 max-w-[500px] mx-auto mb-12 leading-relaxed">
          From the farmlands of Punjab to the forests of Maharashtra, the
          backwaters of Kerala, and the grasslands of Gujarat, our verified
          projects are restoring ecosystems and empowering communities across
          India.
        </p>
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[700px] mx-auto">
          {impactStats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center bg-white/12 border border-white/20 rounded-xl p-5"
            >
              <div className="text-xl mb-2">{s.icon}</div>
              <div className="text-2xl font-extrabold">{s.value}</div>
              <div className="text-xs text-white/70 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/*Implementation Partners*/}
      <ImplementationPartners />

      {/* Partner CTA */}
      <PartnerCTA />

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

      {/* ── CTA BANNER ── */}
      <section className="relative bg-gradient-to-br from-[#1a6eb5] via-[#1a9e7a] to-[#16a34a] text-white py-[90px] px-6 text-center overflow-hidden after:content-[''] after:absolute after:inset-0 after:bg-[url('/forest-sea-hero-bg.jpg')] after:bg-center after:bg-cover after:bg-no-repeat after:opacity-5 after:z-0">
        <div className="relative z-10 max-w-[700px] mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-white/12 border border-white/40 border-dashed text-xs font-medium px-4 py-1.5 rounded-full mb-8 tracking-wide">
            <Globe /> Join {contentMetrics.activeMonitoringNodes} Organizations
            Taking Action
          </div>
          <h2 className="text-3xl md:text-5xl font-black max-w-[580px] mx-auto mb-[18px] leading-[1.1] tracking-tight">
            Ready to Turn Risk into Opportunity?
          </h2>
          <p className="text-sm text-white/82 max-w-[480px] mx-auto mb-10 leading-relaxed">
            Join leading organizations transforming climate challenges into
            environmental action
          </p>
          <div className="flex justify-center gap-3 flex-wrap mb-8">
            <Link
              href="/projects"
              className="bg-white text-emerald-800 font-bold text-sm px-6 py-3 rounded-lg inline-flex items-center gap-2 hover:opacity-90 transition-opacity border-none cursor-pointer"
            >
              Start Exploring →
            </Link>
            <button className="bg-transparent border-[1.5px] border-white/55 text-white font-semibold text-sm px-6 py-3 rounded-lg inline-flex items-center gap-2 hover:border-white hover:bg-white/10 transition-all cursor-pointer">
              ▶ Request Demo
            </button>
          </div>
          <div className="flex justify-center gap-7 flex-wrap text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <Check /> 100% Verified
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp /> Real-Time Tracking
            </span>
            <span className="flex items-center gap-1.5">
              <Globe /> Global Impact
            </span>
          </div>
        </div>
      </section>

      <MarketplaceFooter />
    </div>
  );
}
