"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import AutoScroll from "embla-carousel-auto-scroll";

const PARTNERS = [
  { id: 1, name: "Water Conservation Alliance", logo: "/implementation-partner-mock-logo.jpg" },
  { id: 2, name: "Carbon Audit", logo: "/implementation-partner-mock-logo.jpg" },
  { id: 3, name: "Sustainability Partners", logo: "/implementation-partner-mock-logo.jpg" },
  { id: 4, name: "Renewable Partner", logo: "/implementation-partner-mock-logo.jpg" },
  { id: 5, name: "Global Initiative", logo: "/implementation-partner-mock-logo.jpg" },
];

export default function ImplementationPartners() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-[#064e3b] mb-4">
            Our Implementation Partners
          </h2>
          <p className="text-gray-500 text-[15px] leading-relaxed">
            Collaborating with global leaders to deliver verified nature-based solutions and climate resilience.
          </p>
        </div>

        {/* Carousel Container with Gradient Fades */}
        <div className="relative">
          {/* Left Fade */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />

          <Carousel
            opts={{
              loop: true,
              align: "start",
            }}
            plugins={[
              AutoScroll({
                speed: 1, // Slow, constant speed
                stopOnMouseEnter: true, // Pauses exactly when hovered
                stopOnInteraction: false, // Continues after user stops touching it
              }),
            ]}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {/* Duplicating the array slightly ensures a seamless infinite loop visually */}
              {[...PARTNERS, ...PARTNERS].map((partner, index) => (
                <CarouselItem key={`${partner.id}-${index}`} className="pl-4 basis-1/2 md:basis-1/4 lg:basis-1/5">
                  <div className="bg-white border border-gray-100 rounded-2xl aspect-square flex items-center justify-center p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative w-full h-full opacity-70 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      {/* Replace this div with your actual next/image tags */}
                      <Image src={partner.logo} alt={partner.name} width={64} height={64} className="object-contain" />
                      <p className="text-[10px] font-bold text-gray-800 text-center uppercase tracking-wider">
                        {partner.name}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Right Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        </div>

      </div>
    </section>
  );
}