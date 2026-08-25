import Link from "next/link";
import { ArrowRight, Globe } from "lucide-react";
import Image from "next/image";

export default function PredictHero() {
  return (
    <section
      className="relative w-full min-h-[100svh] md:min-h-[865px] flex items-center justify-center overflow-hidden"
      style={{ top: 0, left: 0 }}
    >
      {/* Background Image */}
      <Image
        src="/hero-section-predict-image.png"
        alt="Hero background"
        fill
        className="object-cover"
        priority // ← preloads immediately, no lazy load delay
      />
      {/* Subtle overlay for text readability */}
      <div className="absolute inset-0 bg-white/20" />
      {/* Content */}
      <div className="relative z-10 max-w-[780px] w-full mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/90 border border-gray-200 text-gray-700 text-xs sm:text-sm font-medium px-4 py-2 rounded-full mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          2,500+ Projects . 47 Countries . Real Impact
        </div>

        {/* Heading */}
        <h1
          className="font-bold text-center mb-6 text-gray-900"
          style={{
            fontFamily: "var(--font-manrope)",
            fontSize: "clamp(36px, 8vw, 96px)",
            lineHeight: "1.11",
            letterSpacing: "0%",
          }}
        >
          Turning Risk
          <br />
          into <span style={{ color: "#216932" }}>Resilience</span>
        </h1>

        {/* Subheading */}
        <p
          className="text-center text-gray-800 max-w-[580px] mx-auto mb-10"
          style={{
            fontFamily: "var(--font-manrope)",
            fontWeight: 700,
            fontSize: "text-base md:text-[20px]",
            lineHeight: "34px",
          }}
        >
          Prana Earth Predict empowers organizations to assess climate risks,
          visualize future scenarios, generate ESG insights, and build
          resilience with AI-powered climate intelligence.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-colors duration-200"
          >
            Start Free Risk Assessment
            <ArrowRight size={18} />
          </Link>
          <Link
            href={process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://marketplace.localhost:3000"}
            className="inline-flex items-center gap-2 bg-white/90 hover:bg-white border border-gray-300 text-gray-800 font-semibold text-[15px] px-7 py-3.5 rounded-xl transition-colors duration-200"
          >
            <Globe size={18} className="text-[#1a82c4]" />
            Explore Marketplace
          </Link>
        </div>

        {/* Trust line */}
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-white">
          <span className="text-green-500">✓</span>
          Trusted by Fortune 500 companies and leading NGOs
        </div>
      </div>
    </section>
  );
}
