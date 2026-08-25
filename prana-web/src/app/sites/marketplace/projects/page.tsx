"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Bookmark,
  ArrowRight,
  Droplet,
  Wind,
  Leaf,
  Sun,
  LayoutGrid,
} from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import MarketplaceFooter from "@/components/marketplace/footer";
// --- CHANGED: Imported backend action ---

import {
  getProjects,
  getSavedProjects,
  saveProject,
  unsaveProject,
} from "@/actions/project.actions";
import { getCurrentUser } from "@/actions/auth.actions";
import { toast } from "sonner";
// ----------------------------------------

// --- CHANGED: Added helper functions for dynamic data formatting ---
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

const getTagColor = (sector?: string) => {
  if (!sector) return "#10B981";
  const s = sector.toLowerCase();
  if (s.includes("water") || s.includes("blue")) return "#3B82F6";
  if (s.includes("solar") || s.includes("energy")) return "#eab308";
  return "#10B981";
};
// -------------------------------------------------------------------

// --- CHANGED: Updated filters to match actual database seeded sectors ---
const FILTER_TYPES = [
  { name: "All Projects", icon: LayoutGrid, sectorValue: "" },
  { name: "Carbon Forestry", icon: Leaf, sectorValue: "Carbon Forestry" },
  { name: "Blue Carbon", icon: Droplet, sectorValue: "Blue Carbon" },
  { name: "Solar Utility", icon: Sun, sectorValue: "Solar Utility" },
  { name: "Wind Energy", icon: Wind, sectorValue: "Wind Energy" },
];
// ------------------------------------------------------------------------

export default function ProjectMarketplace() {
  // --- CHANGED: Replaced static mock data with dynamic state ---
  const [activeCategory, setActiveCategory] = useState(""); // Empty string means "All"
  const [searchQuery, setSearchQuery] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalProjects, setTotalProjects] = useState(0);

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [savedProjectIds, setSavedProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [savingProjectIds, setSavingProjectIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSavedStatusLoading, setIsSavedStatusLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUserSavedProjects() {
      try {
        // Parallelize: kick off the saved-projects request alongside the user
        // request. We then discard the saved result if the user is anonymous.
        const userPromise = getCurrentUser();
        const savedPromise = getSavedProjects();

        const userResponse: any = await userPromise;
        const loggedIn = Boolean(
          userResponse?.success && userResponse?.data?.user,
        );

        if (!isMounted) return;

        setIsLoggedIn(loggedIn);

        if (!loggedIn) {
          setSavedProjectIds(new Set());
          return;
        }

        const savedResponse: any = await savedPromise;

        if (!isMounted) return;

        if (savedResponse?.success) {
          const savedItems = savedResponse?.data?.formattedProjects || [];

          const ids = savedItems
            .map((item: any) => item.project?.id || item.id)
            .filter((id: unknown): id is string => typeof id === "string");

          setSavedProjectIds(new Set(ids));
        } else {
          setSavedProjectIds(new Set());
          console.error(
            "Failed to load saved projects:",
            savedResponse?.message,
          );
        }
      } catch (error) {
        if (isMounted) {
          setIsLoggedIn(false);
          setSavedProjectIds(new Set());
        }

        console.error("Failed to load saved-project status:", error);
      } finally {
        if (isMounted) {
          setIsSavedStatusLoading(false);
        }
      }
    }

    loadUserSavedProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch projects whenever the search query or category filter changes.
  // The very first fetch runs immediately (no debounce) so the user sees
  // results as fast as possible; subsequent filter/search changes use a
  // short debounce to coalesce rapid keystrokes.
  const isFirstProjectsFetch = useRef(true);
  useEffect(() => {
    let cancelled = false;

    async function fetchMarketplaceProjects() {
      setIsLoading(true);
      try {
        const filters: any = {}; // Show active projects
        if (searchQuery) filters.search = searchQuery;
        if (activeCategory) filters.sector = activeCategory;

        const response = await getProjects(filters);
        const res = response as any;

        if (!cancelled && res?.success && res?.data) {
          setProjects(res.data.items || []);
          setTotalProjects(res.data.total || 0);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          isFirstProjectsFetch.current = false;
        }
      }
    }

    if (isFirstProjectsFetch.current) {
      fetchMarketplaceProjects();
      return () => {
        cancelled = true;
      };
    }

    const timeoutId = setTimeout(() => {
      fetchMarketplaceProjects();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [searchQuery, activeCategory]);
  // -------------------------------------------------------------

  // ...existing code...
  const handleToggleSave = async (projectId: string) => {
    if (!isLoggedIn) {
      toast.error("Please log in to save projects.");
      return;
    }

    if (savingProjectIds.has(projectId)) {
      return;
    }

    const wasSaved = savedProjectIds.has(projectId);

    setSavingProjectIds((previous) => {
      const next = new Set(previous);
      next.add(projectId);
      return next;
    });

    // Optimistically update the icon.
    setSavedProjectIds((previous) => {
      const next = new Set(previous);

      if (wasSaved) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }

      return next;
    });

    try {
      const response: any = wasSaved
        ? await unsaveProject(projectId)
        : await saveProject(projectId);

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update saved project.");
      }

      toast.success(
        wasSaved
          ? "Project removed from saved projects."
          : "Project saved successfully.",
      );
    } catch (error) {
      // Restore the previous icon state if the request fails.
      setSavedProjectIds((previous) => {
        const next = new Set(previous);

        if (wasSaved) {
          next.add(projectId);
        } else {
          next.delete(projectId);
        }

        return next;
      });

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update saved project.",
      );
    } finally {
      setSavingProjectIds((previous) => {
        const next = new Set(previous);
        next.delete(projectId);
        return next;
      });
    }
  };
  // ...existing code...

  return (
    <>
      <MarketplaceNavbar />
      <div className="bg-gray-50/50 min-h-screen pb-16">
        {/* Top Hero Section */}
        <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Project Marketplace
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Discover verified environmental projects making real impact
            worldwide
          </p>

          {/* Search Header Bar */}
          <div className="mt-6 max-w-xl relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by project name, location, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Main Grid View Panel */}
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-4 gap-8 mt-4">
          {/* Filters Sidebar Module */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 h-fit shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Filters</h3>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Project Sector
            </p>

            <div className="space-y-1.5">
              {FILTER_TYPES.map((filter) => {
                const Icon = filter.icon;
                const isSelected = activeCategory === filter.sectorValue;
                return (
                  <div key={filter.name} className="w-full">
                    <button
                      onClick={() => setActiveCategory(filter.sectorValue)}
                      className={`w-full flex items-center justify-between text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-blue-50 text-blue-600 border border-blue-100"
                          : "text-gray-600 hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          size={14}
                          className={
                            isSelected ? "text-blue-500" : "text-gray-400"
                          }
                        />
                        <span>{filter.name}</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Project Results Display */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-500 font-medium">
                {isLoading ? "Searching..." : `${totalProjects} projects found`}
              </span>
              {/* Only show if user is logged in */}
              {isLoggedIn && (
                <Link href={"/saved"}>
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50">
                    <Bookmark size={13} /> Saved Projects
                  </button>
                </Link>
              )}
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="py-20 text-center text-gray-500">
                Loading marketplace...
              </div>
            )}

            {/* Empty State */}
            {!isLoading && projects.length === 0 && (
              <div className="py-20 text-center bg-white border border-gray-200 rounded-2xl">
                <p className="text-gray-900 font-bold mb-1">
                  No projects found
                </p>
                <p className="text-sm text-gray-500">
                  Try adjusting your filters or search query.
                </p>
              </div>
            )}

            {/* Grid */}
            {!isLoading && projects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project) => {
                  // --- CHANGED: Safely extracting dynamic nested data for each grid card ---
                  const primaryMetric = project.metadata?.coreMetrics?.[0];

                  const sdgNumbers =
                    project.metadata?.targetSdgs
                      ?.map(extractSdgNumber)
                      .filter(Boolean) || [];

                  const isSaved = savedProjectIds.has(project.id);
                  const isSaving = savingProjectIds.has(project.id);

                  return (
                    <div
                      key={project.id}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group hover:shadow-md transition-all"
                    >
                      {/* Visual Card Media */}
                      <div className="relative h-48 w-full bg-gray-100">
                        <div
                          className="absolute top-3 left-3 z-10 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-wider"
                          style={{
                            backgroundColor: getTagColor(project.sector),
                          }}
                        >
                          {project.sector || "General"}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleSave(project.id)}
                          disabled={isSaving || isSavedStatusLoading}
                          aria-label={
                            isSaved
                              ? `Remove ${project.title} from saved projects`
                              : `Save ${project.title}`
                          }
                          aria-pressed={isSaved}
                          title={isSaved ? "Remove from saved" : "Save project"}
                          className={`absolute top-3 right-3 z-10 rounded-full bg-white/90 p-1.5 shadow-sm transition-colors hover:bg-white disabled:cursor-not-allowed ${
                            isSaved ? "text-blue-600" : "text-gray-700"
                          } ${isSaving ? "opacity-60" : ""}`}
                        >
                          <Bookmark
                            size={14}
                            className={
                              isSaved
                                ? "fill-blue-600 text-blue-600"
                                : "text-gray-700"
                            }
                          />
                        </button>

                        <div className="w-full h-full bg-gray-200 relative">
                          {project.thumbnailUrl ? (
                            <Image
                              src={project.thumbnailUrl}
                              alt={project.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info Text */}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-base font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-1">
                            {project.title}
                          </h4>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            {project.location || "Global"}
                          </p>
                          <p className="text-xs text-gray-500 mt-3 line-clamp-2 font-medium leading-relaxed">
                            {project.description}
                          </p>
                        </div>

                        {/* Impact Statistics */}
                        <div className="mt-5 pt-4 border-t border-gray-50">
                          <div className="flex flex-col mb-3">
                            <span className="text-gray-400 text-sm font-medium mb-1 uppercase tracking-[0.5px] text-[11px]">
                              {primaryMetric?.name || "Target Goal"}
                            </span>
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className="text-2xl font-bold"
                                style={{ color: getTagColor(project.sector) }}
                              >
                                {primaryMetric
                                  ? formatMetricValue(primaryMetric.value)
                                  : `${project.currency} ${formatMetricValue(project.fundingTarget)}`}
                              </span>
                              <span className="text-gray-400 text-sm">
                                {primaryMetric?.unit || ""}
                              </span>
                            </div>
                          </div>

                          {/* Footer Row */}
                          <div className="mt-4 flex items-center justify-between gap-2 pt-1">
                            <div className="flex gap-1.5">
                              {sdgNumbers.slice(0, 3).map((sdg: string) => (
                                <Image
                                  key={sdg}
                                  src={`/sdg-icons/sdg-${sdg}.png`}
                                  alt={`SDG ${sdg}`}
                                  width={32}
                                  height={32}
                                  loading="lazy"
                                  className="w-8 h-8 rounded"
                                />
                              ))}
                            </div>
                            <Link
                              href={`/projects/${project.slug}`}
                              prefetch={true}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-all"
                            >
                              View Details <ArrowRight size={13} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <MarketplaceFooter />
    </>
  );
}
