"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getProjects } from "@/actions/project.actions";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import AutoScroll from "embla-carousel-auto-scroll";

// --- CHANGED: Added helper functions to format dynamic backend data for the UI ---
const formatMetricValue = (value?: number) => {
  if (!value) return "0";
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toString();
};

const extractSdgNumber = (sdgString: string) => {
  // Extracts "13" from "13 Climate Action"
  const match = sdgString.match(/^(\d+)/);
  return match ? match[1] : null;
};

const getTagColor = (sector?: string) => {
  // Simple color mapping based on sector keywords
  if (!sector) return "#10B981"; // Default green
  const s = sector.toLowerCase();
  if (s.includes("water") || s.includes("blue")) return "#3B82F6"; // Blue
  return "#10B981"; // Green for Forestry/Solar/Carbon
};
// ---------------------------------------------------------------------------------

export default function ProjectsCarousel() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const autoScrollPlugin = React.useRef(
    AutoScroll({ speed: 0.8, stopOnInteraction: false }),
  );

  useEffect(() => {
    async function fetchCarouselProjects() {
      try {
        const response = await getProjects({ limit: 5 });
        const res = response as any;
        if (res?.success && res?.data?.items) {
          setProjects(res.data.items);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCarouselProjects();
  }, []);

  if (isLoading) {
    return <div className="py-24 text-center text-gray-500">Loading projects...</div>;
  }

  if (projects.length === 0) {
    return <div className="py-24 text-center text-gray-500">No active projects available.</div>;
  }

  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6">
        <Carousel
          opts={{ align: "start", loop: true, dragFree: true }}
          plugins={[autoScrollPlugin.current]}
          onMouseEnter={() => autoScrollPlugin.current.stop()}
          onMouseLeave={() => autoScrollPlugin.current.play()}
          className="w-full"
        >
          <CarouselContent className="-ml-6">
            {projects.map((project) => {
              // --- CHANGED: Safely extracting dynamic nested data for each project card ---
              const primaryMetric = project.metadata?.coreMetrics?.[0];
              const sdgNumbers = project.metadata?.targetSdgs
                ?.map(extractSdgNumber)
                .filter(Boolean) || [];
              // ----------------------------------------------------------------------------

              return (
                <CarouselItem
                  key={project.id}
                  className="pl-6 basis-full md:basis-1/2 lg:basis-1/3"
                >
                  {/* --- CHANGED: Replaced placeholder UI with your exact requested Card UI --- */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-200 h-full flex flex-col">
                    
                    {/* Image Header */}
                    <div className="relative h-[140px] md:h-[180px] overflow-hidden bg-gray-100">
                      {project.thumbnailUrl && (
                        <img
                          src={project.thumbnailUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span
                        className="absolute z-10 top-3 left-3 text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
                        style={{ background: getTagColor(project.sector) }}
                      >
                        {project.sector || project.projectType || "Project"}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 md:p-5 flex flex-col flex-grow">
                      <h3 className="text-sm md:text-base font-bold text-[#1a1a1a] mb-1.5 line-clamp-1">
                        {project.title}
                      </h3>
                      
                      <p className="text-xs text-gray-400 flex items-center gap-1 mb-2.5">
                        📍 {project.location || "Global"}
                      </p>
                      
                      <p className="text-sm text-gray-600 leading-normal mb-3.5 line-clamp-2">
                        {project.description}
                      </p>

                      {/* Dynamic Metrics */}
                      <div className="mb-3.5 mt-auto">
                        <div className="text-[11px] text-gray-400 uppercase tracking-[0.5px]">
                          {primaryMetric?.name || "Target Goal"}
                        </div>
                        <div className="text-2xl font-extrabold text-[#16a34a]">
                          {primaryMetric 
                            ? formatMetricValue(primaryMetric.value)
                            : `${project.currency} ${formatMetricValue(project.fundingTarget)}`
                          }
                          <span className="text-xs font-normal text-gray-400 ml-1">
                            {primaryMetric?.unit || ""}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar (Visual placeholder for now as per your original UI) */}
                      <div className="h-[3px] bg-gray-200 rounded-sm mt-2">
                        <div className="h-full bg-[#1a82c4] rounded-sm w-[70%]" />
                      </div>

                      {/* Footer: SDGs and Link */}
                      <div className="flex items-center justify-between mt-3.5">
                        <div className="flex gap-1.5 mt-2.5">
                          {sdgNumbers.slice(0, 3).map((sdg: string) => (
                            <img
                              key={sdg}
                              src={`/sdg-icons/sdg-${sdg}.png`}
                              alt={`SDG ${sdg}`}
                              className="w-8 h-8 rounded"
                            />
                          ))}
                        </div>
                        <Link
                          href={`/projects/${project.slug}`}
                          className="text-sm font-semibold text-[#1a82c4] flex items-center gap-1"
                        >
                          View Details →
                        </Link>
                      </div>

                    </div>
                  </div>
                  {/* ------------------------------------------------------------------------ */}
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {/* Navigation Controls */}
          <div className="flex justify-center gap-3 mt-8">
            <CarouselPrevious className="relative top-0 left-0 translate-y-0 border-gray-200" />
            <CarouselNext className="relative top-0 right-0 translate-y-0 border-gray-200" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}