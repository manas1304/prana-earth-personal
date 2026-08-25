"use client";

import Link from "next/link";
import {
  ArrowRight,
  Target,
  Zap,
  Globe,
  Users,
  CheckCircle2,
} from "lucide-react";
import PredictNavbar from "@/components/predict/navbar";
import Footer from "@/components/marketplace/footer";
import MissionVisionValues from "@/components/marketplace/mission-vision-values";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PredictNavbar />

      {/* Hero Section */}
      <section className="relative w-full py-8 md:py-14 flex items-center overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('aboutSection-mockImage.png')" }}
        />

        {/* Dark Overlay for Text Readability */}
        <div className="absolute inset-0 z-0 bg-black/40" />

        {/* Content */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-6 w-full">
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
              Turning Climate Risk into Environmental Action
            </h1>
            <p className="text-base md:text-md text-white/90 mb-6 leading-relaxed max-w-xl">
              We're building the world's most trusted platform for corporate
              climate action, connecting Fortune 500 companies with verified
              environmental projects.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-[#1a82c4] hover:bg-[#156a9c] text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Get Started <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Mission & Values Section */}
      <MissionVisionValues />

      {/* How it Works Section */}
      <div className="bg-[#fcfdfd] py-24 border-t border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
              How Prana Earth Works
            </h2>
            <p className="text-[15px] text-gray-500 max-w-2xl mx-auto">
              Our platform combines climate science, AI technology, and verified
              environmental projects to deliver measurable impact
            </p>
          </div>

          <div className="space-y-20">
            {/* Step 1 */}
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/2">
                <span className="inline-block bg-[#eef5fa] text-[#1a82c4] text-[10px] font-bold px-3 py-1.5 rounded-full mb-6">
                  Step 01
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Climate Risk Assessment
                </h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Our AI platform analyzes your operations, supply chain, and
                  geographic footprint to identify specific climate
                  vulnerabilities and opportunities.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" />{" "}
                    Proprietary risk modeling
                  </li>
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" />{" "}
                    Real-time data integration
                  </li>
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" />{" "}
                    Scenario planning
                  </li>
                </ul>
              </div>
              <div className="w-full md:w-1/2">
                <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl h-[320px] flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <Image
                    src="/how-prana-earth-img1.png"
                    fill
                    alt="Image"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/2">
                <span className="inline-block bg-[#eef5fa] text-[#1a82c4] text-[10px] font-bold px-3 py-1.5 rounded-full mb-6">
                  Step 02
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Project Matching
                </h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  We match your specific risks with verified environmental
                  projects that deliver measurable impact where you need it
                  most.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" /> Smart
                    matching algorithm
                  </li>
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" />{" "}
                    Verified project database
                  </li>
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" /> Impact
                    forecasting
                  </li>
                </ul>
              </div>
              <div className="w-full md:w-1/2">
                <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl h-[320px] flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <Image
                    src="/how-prana-earth-img2.png"
                    fill
                    alt="Image"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-20">
              <div className="w-full md:w-1/2">
                <span className="inline-block bg-[#eef5fa] text-[#1a82c4] text-[10px] font-bold px-3 py-1.5 rounded-full mb-6">
                  Step 03
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Impact Tracking
                </h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Monitor impact metrics, generate compliance reports, and
                  demonstrate stakeholder value through our comprehensive
                  Project reports.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" /> Impact
                    monitoring
                  </li>
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" />{" "}
                    Automated reporting
                  </li>
                  <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" /> API
                    integration
                  </li>
                </ul>
              </div>
              <div className="w-full md:w-1/2">
                <div className="relative overflow-hidden bg-white border border-gray-100 rounded-3xl h-[320px] flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <Image
                    src="/how-prana-earth-img3.png"
                    fill
                    alt="Image"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#eef8fb] py-24 text-center px-6">
        <div className="max-w-[700px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">
            Ready to Transform Your Climate Strategy?
          </h2>
          <p className="text-[15px] text-gray-600 mb-10 leading-relaxed max-w-xl mx-auto">
            Join leading organizations using Prana Earth to turn climate risk
            into measurable environmental action
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={process.env.NEXT_PUBLIC_MARKETPLACE_URL || "http://marketplace.localhost:3000"}
              className="w-full sm:w-auto bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-3 px-8 rounded-lg text-sm transition"
            >
              Explore Projects
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto bg-white border border-[#1a82c4] text-[#1a82c4] hover:bg-blue-50 font-semibold py-3 px-8 rounded-lg text-sm transition"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
