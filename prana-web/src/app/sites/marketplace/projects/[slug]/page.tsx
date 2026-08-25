"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
// --- CHANGED: Added useParams to grab the project slug from the URL ---
import { useParams } from "next/navigation";
import { getProject } from "@/actions/project.actions";
import {
  saveProject,
  getSavedProjects,
  unsaveProject,
} from "@/actions/project.actions";
// ----------------------------------------------------------------------
import {
  ArrowLeft,
  MapPin,
  Activity,
  Leaf,
  Users,
  Calendar,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  Bookmark,
  ArrowRight,
} from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import Footer from "@/components/marketplace/footer";
import PremiumModal from "@/components/marketplace/premium-modal";
import { toast } from "sonner";
import { getUserSubscription } from "@/actions/billing.actions";

// Map Functionality
import dynamic from "next/dynamic";

const ReadOnlyMap = dynamic(() => import("@/components/common/read-only-map"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-gray-100 animate-pulse rounded-lg"></div>
  ),
});

// --- CHANGED: Added Helper Functions ---
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
// ---------------------------------------

export default function ProjectDetailsPage() {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isOpen, setIsOpen] = useState(false);

  const [hasMarketplaceAccess, setHasMarketplaceAccess] = useState(false);
const [loadingSubscription, setLoadingSubscription] = useState(true);

useEffect(() => {
  async function fetchSubscription() {
    try {
      const res: any = await getUserSubscription();
      // planType is "MARKETPLACE" or "BUNDLE" for marketplace subscribers (FREE for others)
      const planType = res?.data?.planType;
      // isMarketplaceAccess is exposed by getUserSubscription — it's true for MARKETPLACE and BUNDLE
      const eligible =
        !!res?.data?.isMarketplaceAccess ||
        planType === "MARKETPLACE" ||
        planType === "BUNDLE";
      setHasMarketplaceAccess(eligible);
    } catch (err) {
      console.error("Failed to load user subscription", err);
      setHasMarketplaceAccess(false);
    } finally {
      setLoadingSubscription(false);
    }
  }
  fetchSubscription();
}, []);

  // --- CHANGED: State and Data Fetching Logic ---
  const params = useParams();
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProjectData() {
      if (!params?.slug) return;
      try {
        const [projectRes, savedRes]: any = await Promise.all([
          getProject(params.slug as string),
          getSavedProjects(), // Fetch the user's saved list
        ]);

        if (projectRes?.success && projectRes?.data?.project) {
          const currentProject = projectRes.data.project;
          setProject(currentProject);

          // Check if current project ID exists in the saved list
          const savedItems = savedRes?.data?.formattedProjects || [];
          const alreadySaved = savedItems.some(
            (item: any) => (item.project?.id || item.id) === currentProject.id,
          );
          setIsSaved(alreadySaved);
        }
      } catch (error) {
        console.error("Failed to fetch:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjectData();
  }, [params?.slug]);

  const handleToggleSave = async () => {
    if (!project?.id) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        const res: any = await unsaveProject(project.id);
        if (res?.success) setIsSaved(false);
      } else {
        const res: any = await saveProject(project.id);
        if (res?.success) setIsSaved(true);
      }
      toast.success(
        isSaved ? "Project removed from saved" : "Project saved successfully!",
      );
    } catch (error) {
      toast.error("Failed to update saved status.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MarketplaceNavbar />

        <div className="flex-1 flex flex-col">
          {/* Skeleton Hero Section */}
          <div className="w-full h-[400px] bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          {/* Skeleton Main Content */}
          <div className="max-w-[1200px] mx-auto px-6 py-10 w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 animate-pulse rounded-2xl w-full"></div>
              <div className="h-80 bg-gray-200 animate-pulse rounded-2xl w-full"></div>
            </div>

            {/* Right Column (Sidebar) */}
            <div className="space-y-6">
              <div className="h-96 bg-gray-200 animate-pulse rounded-2xl w-full"></div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <MarketplaceNavbar />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-900">
          <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
          <Link href="/projects" className="text-blue-600 hover:underline">
            Return to Marketplace
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Safely extract dynamic metadata
  const sdgNumbers = project.metadata?.targetSdgs
    ?.map(extractSdgNumber)
    .filter(Boolean) || [6, 13, 15]; // Fallback to 6, 13, 15
  const metrics = project.metadata?.coreMetrics || [];
  // ----------------------------------------------

  const handleShareProject = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  const handleDownloadSummary = () => {
    // 1. Safely extract arrays into readable strings
    const sdgsText = project.sdgs
      ? project.sdgs.map((sdg: any) => sdg.title || sdg).join(", ")
      : "N/A";

    const impactText = project.impactMetrics
      ? project.impactMetrics
          .map((m: any) => `${m.label}: ${m.value}`)
          .join("\n")
      : "N/A";

    // 2. Build the full template (kept left-aligned so the .txt file looks clean)
    const summaryText = `PROJECT SUMMARY
-----------------------------------
Title: ${project.title || "N/A"}
Sector: ${project.sector || "N/A"}
Location: ${project.location || "N/A"}
Status: ${project.status || "N/A"}
Developer: ${project.developer || "N/A"}

DESCRIPTION
-----------------------------------
${project.description || "N/A"}

SUSTAINABLE DEVELOPMENT GOALS (SDGs)
-----------------------------------
${sdgsText}

IMPACT METRICS
-----------------------------------
${impactText}

FINANCIALS
-----------------------------------
Funding Required: ${project.fundingRequired || "N/A"}
Project Size: ${project.projectSize || "N/A"}
`.trim();

    // 3. Trigger Download
    const blob = new Blob([summaryText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.slug || "project"}-summary.txt`;
    document.body.appendChild(link);
    link.click();
    toast.success("Report downloaded successfully!");

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MarketplaceNavbar />

      {/* Sub-nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1200px] mx-auto px-6 py-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft size={16} /> Back to Marketplace
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[400px] w-full bg-gray-900">
        <Image
          // --- CHANGED: Dynamic Hero Image with Fallback ---
          src={
            project.bannerUrl ||
            project.thumbnailUrl ||
            "/forest-sea-hero-bg.jpg"
          }
          alt={project.title}
          fill
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />

        <div className="absolute bottom-10 left-0 right-0">
          <div className="max-w-[1200px] mx-auto px-6">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
              {/* --- CHANGED: Dynamic Status --- */}
              {project.status?.replace("_", " ")}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {/* --- CHANGED: Dynamic Title --- */}
              {project.title}
            </h1>
            <div className="flex items-center gap-4 text-gray-200 text-sm font-medium">
              <span className="flex items-center gap-1.5">
                {/* --- CHANGED: Dynamic Location --- */}
                <MapPin size={16} />{" "}
                {project.location || project.country || "Global"}
              </span>
              <span className="w-1 h-1 rounded-full bg-gray-400" />
              <span>
                {project.sector ||
                  project.projectType ||
                  "Environmental Action"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-[1200px] mx-auto px-6 py-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Project Overview
              </h2>
              <div className="text-sm text-gray-600 space-y-4 leading-relaxed whitespace-pre-wrap">
                {/* --- CHANGED: Dynamic Description --- */}
                <p>
                  {project.description ||
                    "Comprehensive environmental initiative targeting critical climate restoration. This project implements innovative conservation techniques and community-driven management practices."}
                </p>
                {/* Fallback extra paragraph if the description is very short to maintain the UI design */}
                {(!project.description || project.description.length < 150) && (
                  <p>
                    The project addresses critical resource scarcity issues
                    through a comprehensive approach to environmental
                    management. By implementing traditional and modern
                    conservation techniques, we are helping restore the natural
                    cycle in severely degraded regions. The project works
                    directly with local communities to ensure long-term
                    sustainability and local ownership.
                  </p>
                )}
              </div>
            </div>

            {/* AI Impact Insights (STATIC UI) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      AI Impact Insights
                    </h3>
                    <p className="text-xs text-gray-500">
                      Real-time predictive modeling based on satellite telemetry
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Success Score
                  </p>
                  <p className="text-3xl font-extrabold text-blue-600">
                    94<span className="text-lg">%</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Climate Risk
                    </span>
                    <AlertTriangle size={14} className="text-red-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    Low Impact
                  </p>
                  <div className="w-full h-1 bg-gray-200 rounded-full mb-3">
                    <div className="w-1/4 h-full bg-green-500 rounded-full" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Drought resilience verified through historical trends.
                  </p>
                </div>
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Biodiversity
                    </span>
                    <Leaf size={14} className="text-green-600" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    +22% Gain
                  </p>
                  <div className="w-full h-1 bg-gray-200 rounded-full mb-3">
                    <div className="w-3/4 h-full bg-blue-500 rounded-full" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Native flora resurgence expected in Q3 2025.
                  </p>
                </div>
                <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">
                      Socio-Economic
                    </span>
                    <Users size={14} className="text-blue-400" />
                  </div>
                  <p className="text-lg font-bold text-gray-900 mb-2">
                    High Yield
                  </p>
                  <div className="w-full h-1 bg-gray-200 rounded-full mb-3">
                    <div className="w-5/6 h-full bg-blue-500 rounded-full" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Targeting sustainable local job creation.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity size={14} className="text-blue-600" />
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    Automated Summary
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic">
                  "This project leverages a hybrid decentralized architecture
                  that significantly mitigates seasonal climate risks.
                  Predictive models suggest a high ROI in ecosystem services
                  value over the project tenure, with primary impacts observed
                  in resource retention rates."
                </p>
              </div>
            </div>

            {/* Impact Metrics (DYNAMIC) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Impact Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* --- CHANGED: Dynamically map up to 4 metrics from the backend. Fallback to static if none exist --- */}
                {metrics.length > 0 ? (
                  metrics.slice(0, 4).map((metric: any, index: number) => (
                    <div key={index} className="bg-gray-50 p-5 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1 truncate">
                        {metric.name}
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900">
                        {formatMetricValue(metric.value)}{" "}
                        <span className="text-sm font-medium text-gray-500 ml-1">
                          {metric.unit}
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="bg-gray-50 p-5 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        Water Recharged
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900">
                        1.8M liters{" "}
                        <span className="text-sm font-bold text-green-500 ml-1">
                          +15%
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        Land Restored
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900">
                        375 hectares{" "}
                        <span className="text-sm font-bold text-green-500 ml-1">
                          +12%
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        Families Benefited
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900">
                        3,750{" "}
                        <span className="text-sm font-bold text-green-500 ml-1">
                          +8%
                        </span>
                      </p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-xl">
                      <p className="text-xs text-gray-500 font-medium mb-1">
                        Employment Created
                      </p>
                      <p className="text-2xl font-extrabold text-gray-900">
                        120 jobs{" "}
                        <span className="text-sm font-bold text-green-500 ml-1">
                          +5%
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Location Map Placeholder (STATIC UI) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Project Location
              </h2>
              <ReadOnlyMap
                lat={project.metadata?.latitude}
                lng={project.metadata?.longitude}
              />
            </div>

            {/* Milestones (STATIC UI) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Project Milestones
              </h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100/80 flex items-center justify-center shrink-0">
                    <CheckCircle2
                      size={20}
                      className="text-green-700"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-[15px]">
                      Site Assessment Complete
                    </h4>
                    <span className="text-[13px] text-gray-500 mt-0.5 block">
                      Jan 2024
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-100/80 flex items-center justify-center shrink-0">
                    <CheckCircle2
                      size={20}
                      className="text-green-700"
                      strokeWidth={2}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-[15px]">
                      Community Training
                    </h4>
                    <span className="text-[13px] text-gray-500 mt-0.5 block">
                      Mar 2024
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-sky-200/50 flex items-center justify-center shrink-0">
                    <div className="w-3.5 h-3.5 bg-[#1a82c4] rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-[15px]">
                      Infrastructure Development
                    </h4>
                    <span className="text-[13px] text-gray-500 mt-0.5 block">
                      Ongoing
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <div className="w-3.5 h-3.5 bg-gray-300 rounded-full" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-[15px]">
                      Impact Validation
                    </h4>
                    <span className="text-[13px] text-gray-500 mt-0.5 block">
                      Dec 2025
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SDGs (DYNAMIC) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                UN SDG Alignment
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                This project contributes to the following United Nations
                Sustainable Development Goals:
              </p>
              <div className="flex flex-wrap gap-4">
                {/* --- CHANGED: Dynamically map SDGs --- */}
                {sdgNumbers.map((sdg: string) => (
                  <div
                    key={sdg}
                    className="border border-gray-200 rounded-lg p-2 w-24"
                  >
                    <Image
                      src={`/sdg-icons/sdg-${sdg}.png`}
                      alt={`SDG ${sdg}`}
                      width={80}
                      height={80}
                      className="w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="space-y-6">
            {/* Project Details Sidebar (MIXED DYNAMIC/STATIC) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-5">
                Project Details
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  <Calendar size={18} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase font-medium">
                      Start Date
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      January 2024
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Activity size={18} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase font-medium">
                      Duration
                    </p>
                    {/* --- CHANGED: Dynamic Tenure --- */}
                    <p className="text-sm font-bold text-gray-900">
                      {project.tenure ? `${project.tenure} months` : "3 years"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Users size={18} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase font-medium">
                      Implementation Partner
                    </p>
                    {/* --- CHANGED: Dynamic Partner or fallback --- */}
                    <p className="text-sm font-bold text-gray-900">
                      {project.metadata?.implementationPartner ||
                        "Prana Verified Partner"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 mb-6">
                <p className="text-[11px] text-gray-500 uppercase font-medium mb-1">
                  Total Investment Target
                </p>
                <p className="text-3xl font-extrabold text-[#1a82c4]">
                  {/* --- CHANGED: Dynamic Target --- */}
                  {project.currency}{" "}
                  {project.fundingTarget?.toLocaleString() || "450,000"}
                </p>
              </div>

              <div className="mb-6">
                <p className="text-[11px] text-gray-500 uppercase font-medium mb-2">
                  Progress
                </p>
                <div className="w-full h-2 bg-gray-100 rounded-full mb-2">
                  <div className="w-3/4 h-full bg-[#16a34a] rounded-full" />
                </div>
                <p className="text-xs font-bold text-gray-900">75% Complete</p>
              </div>

              <div className="space-y-3">
                <Link
                  href={`/projects/${project.slug}/express-interest`}
                  className="w-full bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-2.5 rounded-lg text-sm transition flex justify-center items-center gap-2"
                >
                  Invest in Project <Activity size={16} />
                </Link>
                {/* --- CHANGED: Safely wire up Document URL if it exists --- */}
                {project.metadata?.documents?.[0]?.url ? (
                  <Link
                    href={project.metadata.documents[0].url}
                    target="_blank"
                    className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition flex justify-center items-center gap-2"
                  >
                    <Download size={16} /> Download{" "}
                    {project.metadata.documents[0].name || "Summary"}
                  </Link>
                ) : (
                  <button
                    onClick={handleDownloadSummary}
                    className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition flex justify-center items-center gap-2"
                  >
                    <Download size={16} /> Download Summary
                  </button>
                )}

                <button
                  onClick={handleShareProject}
                  className="w-full bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg text-sm transition flex justify-center items-center gap-2"
                >
                  <Share2 size={16} /> Share Project
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleToggleSave}
                    disabled={isSaving}
                    className={`border border-gray-300 font-semibold py-2.5 rounded-lg text-sm transition flex justify-center items-center gap-2 ${
                      isSaved
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-white hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <Bookmark
                      size={16}
                      className={
                        isSaved
                          ? "text-blue-600 fill-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {isSaved ? "Saved" : "Save Project"}
                  </button>
                  <Link
                    href={`/projects/${project.id}/request-dpr`}
                    className="bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-2.5 rounded-lg text-sm transition flex justify-center items-center gap-2"
                  >
                    Request DPR <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>

            {/* AI Recommendations (STATIC UI) */}
            <div className="bg-blue-50/40 rounded-2xl p-6 border border-blue-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-blue-700">
                  AI Recommendations
                </h3>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-3 border border-gray-100 flex gap-3">
                  <CheckCircle2
                    size={16}
                    className="text-green-500 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      Prioritize local impact
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      85% risk reduction potential
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100 flex gap-3">
                  <CheckCircle2
                    size={16}
                    className="text-green-500 shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      Increase carbon offset allocation
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Meet 2030 targets faster
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Concept Note (Dynamic UI based on subscription) */}
<div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
    Concept Note
  </p>
  <h4 className="text-sm font-bold text-gray-900 mb-2">
    Methodology & Sequestration Logic
  </h4>

  {loadingSubscription ? (
    // Skeleton while we don't yet know subscription status
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-200 rounded w-4/6" />
    </div>
  ) : hasMarketplaceAccess ? (
    // SUBSCRIBED USER — full content visible, button says "View Full Concept Note"
    <>
      <p className="text-xs text-gray-600 leading-relaxed">
        The project utilizes a multi-layered restoration framework. By
        integrating satellite-derived LIDAR data with ground-level sensors,
        we establish a robust baseline for sustainability in affected regions.
        The primary mechanism involves the enhancement of biomass density
        through deep root system development.
      </p>
      <Link
        href={`/projects/${project.slug}/concept-note`}
        className="mt-4 w-full block text-center bg-[#0e5c8c] hover:bg-[#0a466b] text-white font-semibold py-2.5 rounded-lg text-sm transition"
      >
        View Full Concept Note
      </Link>
    </>
  ) : (
    // UNSUBSCRIBED USER — locked blurred card + Upgrade CTA (your current design)
    <div className="relative">
      <p className="text-xs text-gray-500 leading-relaxed blur-[2px] select-none">
        The project utilizes a multi-layered restoration framework. By
        integrating satellite-derived LIDAR data with ground-level sensors,
        we establish a robust baseline for sustainability in affected regions.
        The primary mechanism involves the enhancement of biomass density
        through deep root system development.
      </p>
      <div className="mt-4 bg-gradient-to-t from-white via-white/80 to-transparent -mt-12 pt-12 flex flex-col items-center text-center">
        <div className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center mb-3">
          <Lock size={18} className="text-[#1a82c4]" />
        </div>
        <p className="text-sm font-bold text-gray-900 mb-1">
          Unlock Full Concept Note
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Gain exclusive access to technical audits, satellite logs, and
          financial projections.
        </p>
        <Link
          href={`/projects/${project.slug}/concept-note`}
          className="w-full block text-center bg-[#0e5c8c] hover:bg-[#0a466b] text-white font-semibold py-2.5 rounded-lg text-sm transition"
        >
          Upgrade to Premium
        </Link>
      </div>
    </div>
  )}
</div>

            {/* 12-Month Forecast (STATIC UI) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-5">
                12-Month Forecast
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-medium mb-1">
                    <span>Projected Offset/Impact</span>
                    <span className="text-green-500 font-bold">+32%</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    Steady Growth
                  </p>
                </div>
                <div className="h-px bg-gray-100 w-full" />
                <div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-medium mb-1">
                    <span>Ecosystem Restoration</span>
                    <span className="text-green-500 font-bold">+21%</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">On Target</p>
                </div>
              </div>
            </div>

            {/* Data Sources (STATIC UI) */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">
                Data Sources
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> NOAA
                  Climate Data
                </li>
                <li className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> World
                  Bank Indicators
                </li>
                <li className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" /> UN
                  SDG Database
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Related Projects (STATIC UI) */}
        <div className="mt-16 mb-8 border-t border-gray-200 pt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Related Climate Projects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group cursor-pointer">
              <div className="relative h-40 w-full rounded-xl overflow-hidden mb-3">
                <Image
                  src="/forest-sea-hero-bg.jpg"
                  alt="Tamil Nadu"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">
                Tamil Nadu Reforestation
              </h4>
              <p className="text-[11px] text-gray-500">
                Afforestation project covering 450 hectares of degraded land.
              </p>
            </div>
            <div className="group cursor-pointer">
              <div className="relative h-40 w-full rounded-xl overflow-hidden mb-3">
                <Image
                  src="/forest-sea-hero-bg.jpg"
                  alt="Rajasthan"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">
                Rajasthan Solar Park
              </h4>
              <p className="text-[11px] text-gray-500">
                Grid-connected PV system delivering 250MW of clean energy.
              </p>
            </div>
            <div className="group cursor-pointer">
              <div className="relative h-40 w-full rounded-xl overflow-hidden mb-3">
                <Image
                  src="/forest-sea-hero-bg.jpg"
                  alt="Kerala Tea"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">
                Kerala Tea Estates
              </h4>
              <p className="text-[11px] text-gray-500">
                Regenerative agriculture and fair trade supply chain initiative.
              </p>
            </div>
            <div className="group cursor-pointer">
              <div className="relative h-40 w-full rounded-xl overflow-hidden mb-3">
                <Image
                  src="/forest-sea-hero-bg.jpg"
                  alt="Gujarat Wind"
                  fill
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
              </div>
              <h4 className="text-sm font-bold text-gray-900 mb-1">
                Gujarat Coastal Wind
              </h4>
              <p className="text-[11px] text-gray-500">
                Offshore wind cluster providing 100% renewable power.
              </p>
            </div>
          </div>
        </div>
      </div>

      <PremiumModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <Footer />
    </div>
  );
}
