"use client";

// --- CHANGED: Added necessary React hooks and Sonner for toasts ---
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getSavedProjects, unsaveProject } from "@/actions/project.actions";
// -----------------------------------------------------------------

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  MapPin,
  TrendingUp,
  TreePine,
  Wallet,
} from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import Footer from "@/components/marketplace/footer";

// --- CHANGED: Added helper functions to process dynamic data ---
const formatMetricValue = (value?: number) => {
  if (!value) return "0";
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return value.toString();
};

const extractSdgNumber = (sdgString: string) => {
  const match = sdgString.match(/^(\d+)/);
  return match ? match[1] : null;
};
// ---------------------------------------------------------------

export default function SavedProjectsPage() {
  // --- CHANGED: Added dynamic state for projects and loading ---
  const [savedProjects, setSavedProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch saved projects on mount
  useEffect(() => {
    async function fetchSaved() {
      try {
        const response: any = await getSavedProjects();
        if (response?.success && response?.data) {
          // Depending on your backend structure, it might be nested
          const items = response?.data?.formattedProjects || [];
          setSavedProjects(items);
        }
      } catch (error) {
        toast.error("Failed to load saved projects.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchSaved();
  }, []);

  // Handle unsaving a project
  const handleUnsave = async (projectId: string) => {
    try {
      const response: any = await unsaveProject(projectId);
      if (response?.success) {
        // Remove it from the local UI state immediately
        setSavedProjects((prev) =>
          prev.filter((item) => (item.project?.id || item.id) !== projectId),
        );
        toast.success("Project removed from saved list.");
      } else {
        toast.error(response?.message || "Failed to remove project.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };
  // -----------------------------------------------------------

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        {/* Header Section */}
        <div className="mb-8">
          <Link
            href="/projects" // --- CHANGED: Updated href to point to the marketplace ---
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Marketplace
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div className="max-w-2xl">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
                Saved Projects
              </h1>
              <p className="text-gray-600 text-[15px] leading-relaxed">
                Manage and review environmental initiatives you've bookmarked
                for potential support or investment.
              </p>
            </div>
            <div className="bg-blue-50 text-blue-800 text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap">
              {/* --- CHANGED: Dynamic count --- */}
              {isLoading ? "..." : savedProjects.length} Projects Saved
            </div>
          </div>

          <div className="w-full h-px bg-gray-200" />
        </div>

        {/* --- CHANGED: Loading State --- */}
        {isLoading && (
          <div className="py-20 flex justify-center text-gray-500">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Loading your saved projects...</p>
            </div>
          </div>
        )}

        {/* --- CHANGED: Empty State --- */}
        {!isLoading && savedProjects.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center bg-gray-50 rounded-3xl border border-gray-100">
            <Bookmark size={48} className="text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No saved projects yet
            </h3>
            <p className="text-gray-500 max-w-md mb-6 text-sm">
              Explore the marketplace and bookmark projects that align with your
              climate goals to keep track of them here.
            </p>
            <Link
              href="/projects"
              className="bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition"
            >
              Browse Marketplace
            </Link>
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && savedProjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* --- CHANGED: Mapping over dynamic data --- */}
            {savedProjects.map((item) => {
              // Extract the project object (handles if backend returns a join table structure)
              const project = item.project || item;

              // Safely extract dynamic metadata
              const sdgNumbers = project.metadata?.targetSdgs
                ?.map(extractSdgNumber)
                .filter(Boolean) || ["11", "14"]; // Fallback if missing

              const primaryMetric = project.metadata?.coreMetrics?.[0];
              const dynamicMetricText = primaryMetric
                ? `${formatMetricValue(primaryMetric.value)} ${primaryMetric.unit || primaryMetric.name}`
                : "15K Trees Planted this quarter";

              return (
                <div
                  key={project.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition-all"
                >
                  {/* Image Section */}
                  <div className="relative h-48 w-full bg-gray-100">
                    <Image
                      src={
                        project.thumbnailUrl ||
                        project.bannerUrl ||
                        "/forest-sea-hero-bg.jpg"
                      }
                      alt={project.title}
                      fill
                      className="object-cover"
                    />

                    {/* Bookmark Icon (Unsave) */}
                    {/* --- CHANGED: Added onClick handler to unsave --- */}
                    <button
                      onClick={() => handleUnsave(project.id)}
                      className="absolute top-3 right-3 bg-white hover:bg-gray-50 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors"
                      title="Remove from saved"
                    >
                      <Bookmark
                        size={16}
                        className="text-[#0e5c8c] fill-[#0e5c8c]"
                      />
                    </button>

                    {/* SDG Badges Overlaid on Image */}
                    <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap max-w-[80%]">
                      {sdgNumbers
                        .slice(0, 3)
                        .map((sdg: string, index: number) => (
                          <Image
                            key={index}
                            // Ensure this path matches the exact folder structure in your 'public' folder
                            src={`/sdg-icons/sdg-${sdg}.png`}
                            alt={`SDG ${sdg}`}
                            width={40}
                            height={40}
                            className="rounded-sm shadow-sm object-contain"
                          />
                        ))}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        <MapPin size={12} />{" "}
                        {project.location || project.country || "Global"}
                      </div>
                      <Link href={`/projects/${project.slug || project.id}`}>
                        <h3 className="text-[17px] font-bold text-gray-900 mb-2 hover:text-blue-600 transition-colors line-clamp-1">
                          {project.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-6">
                        {project.description}
                      </p>
                    </div>

                    <div>
                      {/* Dynamic Metric Section */}
                      <div className="flex items-center gap-2 text-xs font-bold text-[#16a34a] mb-6">
                        <TrendingUp size={16} />
                        {dynamicMetricText}
                      </div>

                      {/* Action Button */}
                      <Link
                        href={`/saved/${project.slug || project.id}/request-dpr`}
                        className="w-full bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
                      >
                        Invest in Project <Wallet size={16} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
