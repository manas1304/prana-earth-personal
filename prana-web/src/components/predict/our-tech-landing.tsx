import Image from "next/image";
import Link from "next/link";
import { Droplets, Leaf, CloudLightning, ArrowRight } from "lucide-react";

const techSteps = [
  {
    num: "01",
    icon: "/water-icon.svg",
    title: "Water Projects",
    desc: "Comprehensive water conservation and management initiatives targeting watersheds, groundwater recharge, and community water security.",
  },
  {
    num: "02",
    icon: "/plant-icon.svg",
    title: "Carbon Projects",
    desc: "Verified carbon sequestration projects spanning reforestation, mangrove restoration, and sustainable land management practices.",
  },
  {
    num: "03",
    icon: "/home-icon.svg",
    title: "Climate Risk",
    desc: "AI-powered climate risk assessment tools helping organizations identify vulnerabilities and build long-term resilience strategies.",
  },
];

export default function OurTech() {
  return (
    <section className="w-full bg-white py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-16">
          {/* Left Content */}
          <div className="flex-1 w-full ml-10">
            {/* Header */}
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Our Tech
              </h2>
              <p className="text-sm text-gray-500">
                Three types of tech we provide
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {techSteps.map((step) => (
                <div
                  key={step.num}
                  className="flex flex-col items-center text-center gap-2 flex-1"
                >
                  {/* Number top-left aligned within step */}
                  <div className="w-full flex justify-start mb-1">
                    <span className="text-xs font-bold text-white bg-[#216932] w-7 h-7 rounded-full flex items-center justify-center">
                      {step.num}
                    </span>
                  </div>
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-full border border-gray-300 flex items-center justify-center mb-2">
                    <Image
                      src={step.icon}
                      alt={step.title}
                      width={28}
                      height={28}
                    />
                  </div>
                  {/* Title */}
                  <h3 className="text-sm font-bold text-gray-900">
                    {step.title}
                  </h3>
                  {/* Desc */}
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10">
              <Link
                href="/our-tech"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#156a9c] transition-colors ml-40"
              >
                Learn more about our process
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Right Image */}
          <div className="w-full lg:w-[480px] shrink-0 relative h-[300px] lg:h-[367px]">
            <Image
              src="/our-tech-section-landing-page-image.png"
              alt="Our Tech - Climate Solutions"
              fill
              sizes="(max-width: 1024px) 100vw, 480px"
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
