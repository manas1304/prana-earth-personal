"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { getProject } from "@/actions/project.actions";
import { submitExpressInterest } from "@/actions/express-interest.actions";
import { checkAssessmentLimits } from "@/actions/billing.actions";
import { MapPin, Calendar, Users, ShieldCheck, Leaf } from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import Footer from "@/components/marketplace/footer";

export default function ExpressInterestPage() {
  const params = useParams();
  const router = useRouter();

  // Dynamic States
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [limits, setLimits] = useState<{
    used: number;
    limit: number;
    remaining: number | null;
    isEligible: boolean;
    isAuthenticated: boolean;
  }>({ used: 0, limit: 0, remaining: null, isEligible: false, isAuthenticated: false });
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  // Fetch target project based on routing slug/id
  useEffect(() => {
    async function fetchProjectData() {
      const projectIdentifier = params?.id || params?.slug;
      if (!projectIdentifier) {
        setIsLoading(false);
        return;
      }
      try {
        const res = (await getProject(projectIdentifier as string)) as any;
        if (res?.success && res.data) {
          const projectData = (res.data as any).project || res.data;
          setProject(projectData);
        }
      } catch (error) {
        console.error("Failed to fetch project details:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProjectData();
  }, [params]);

  // Fetch monthly assessment limit snapshot for this user
  useEffect(() => {
    async function fetchLimits() {
      try {
        const res: any = await checkAssessmentLimits();
        if (res?.success && res.data) {
          setLimits({
            used: res.data.used ?? 0,
            limit: res.data.limit ?? 0,
            remaining: res.data.remaining ?? null,
            isEligible: !!res.data.isEligible,
            isAuthenticated: !!res.data.isAuthenticated,
          });
        }
      } catch (error) {
        console.error("Failed to fetch assessment limits:", error);
      }
    }
    fetchLimits();
  }, []);

  const limitReached =
    limits.limit > 0 && limits.used >= limits.limit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) {
      toast.error("Project context missing.");
      return;
    }

    if (limitReached) {
      toast.error(
        "Monthly assessment limit reached. Contact admin to increase your limit.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res: any = await submitExpressInterest({
        projectId: project.id,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        company: formData.company || null,
        message: formData.message || null,
      });

      if (res?.success) {
        toast.success("Interest submitted successfully!");
        router.push(`/projects/${project.slug}/express-interest/success`);
      } else {
        toast.error(res?.message || "Failed to submit interest.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex flex-col">
        <MarketplaceNavbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex flex-col items-center justify-center">
        <MarketplaceNavbar />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-900">
          <h2 className="text-xl font-bold mb-2">Project context not found</h2>
          <Link
            href="/projects"
            className="text-blue-600 hover:underline text-sm"
          >
            Return to Marketplace
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] flex flex-col">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-[1100px] mx-auto w-full px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-2 bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-[#0f4a6e] mb-2">
              Invest in Project
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              Provide your details to learn more about this initiative.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="jane@company.com"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors text-gray-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Acme Corp"
                    required
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#1a82c4] transition-colors text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1.5">
                  Optional Message 
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us more about your interest..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#1a82c4] transition-colors resize-none text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || limitReached}
                className="bg-[#1a82c4] hover:bg-[#156a9c] disabled:opacity-75 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition mt-2 inline-block"
              >
                {isSubmitting ? "Submitting..." : "Submit interest"}
              </button>

              {limitReached && (
                <p className="mt-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  Monthly assessment limit reached. Contact admin to increase your limit.
                </p>
              )}
            </form>
          </div>

          {/* Right Column: Dynamic Project Info Cards */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="relative h-40 w-full bg-gray-100">
                <Image
                  src={
                    project.thumbnailUrl ||
                    project.bannerUrl ||
                    "/forest-sea-hero-bg.jpg"
                  }
                  alt={project.title || "Project Image"}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#a7f3d0] text-[#065f46] text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Leaf size={10} /> High Impact
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {project.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6 line-clamp-4">
                  {project.description}
                </p>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <MapPin
                      size={16}
                      className="text-[#1a82c4] shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">
                        Location
                      </p>
                      <p className="text-xs text-gray-500">
                        {project.location || project.country || "Global"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Calendar
                      size={16}
                      className="text-[#1a82c4] shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">
                        Timeline
                      </p>
                      <p className="text-xs text-gray-500">
                        {project.tenure
                          ? `${project.tenure} Months`
                          : "Q3 2024 - Q4 2025"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Users
                      size={16}
                      className="text-[#1a82c4] shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-[11px] font-bold text-gray-900">
                        Partners
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {project.metadata?.implementationPartner ||
                          "Ocean Conservancy, Local Gov"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#f0f5fb] border border-[#d6e4f0] rounded-xl p-5 flex gap-3">
              <ShieldCheck size={20} className="text-[#1a82c4] shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-gray-900 mb-1">
                  Data Security
                </p>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Your information is securely encrypted and never shared with
                  third parties without explicit consent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
