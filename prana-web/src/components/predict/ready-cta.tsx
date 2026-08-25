import Image from "next/image";
import Link from "next/link";
import { Globe, ArrowRight, Shield, TrendingUp } from "lucide-react";

export default function ReadyCTA() {
  return (
    <section className="relative w-full min-h-[500px] flex items-center justify-center overflow-hidden py-20 px-6">
      {/* Background */}
      <Image
        src="/ready-to-turn-section-image-predict.png"
        alt="World map background"
        fill
        className="object-cover"
        sizes="100vw"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 max-w-[800px] mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white text-xs font-medium px-4 py-2 rounded-full mb-8">
          <Globe size={14} />
          Join 1,200+ Organizations Taking Action
        </div>

        {/* Heading */}
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">
          Ready to Turn Risk into Opportunity?
        </h2>

        {/* Subheading */}
        <p className="text-sm md:text-base font-semibold text-white/90 max-w-[680px] mx-auto mb-10">
          Join leading organizations transforming climate challenges into environmental action
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 bg-white text-[#1a82c4] font-semibold text-sm px-8 py-3.5 rounded-xl hover:bg-gray-100 transition-colors w-full sm:w-auto justify-center"
          >
            Start Free Assessment
            <ArrowRight size={16} />
          </Link>
          <Link
            href={process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://marketplace.localhost:3000"}
            className="inline-flex items-center gap-2 bg-transparent border border-white/50 text-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors w-full sm:w-auto justify-center"
          >
            <Globe size={16} />
            Explore Marketplace
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-white/70 text-xs">
          <span className="flex items-center gap-1.5">
            <Shield size={14} /> 100% Verified
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp size={14} /> Real-Time Tracking
          </span>
          <span className="flex items-center gap-1.5">
            <Globe size={14} /> Global Impact
          </span>
        </div>
      </div>
    </section>
  );
}