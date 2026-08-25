"use client";

import { useState, useEffect } from "react";
import React from "react";
import Image from "next/image";
import { Clock, Check, ArrowRight, ArrowLeft, Send, CheckCircle2, Circle, Edit2, Lightbulb, Globe, Leaf } from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import Footer from "@/components/marketplace/footer";
import { useRouter } from "next/navigation";
import { submitDprInquiry } from "@/actions/dpr.actions";
import { checkAssessmentLimits } from "@/actions/billing.actions";
import { toast } from "sonner";

export default function RequestDPRPage({ params }: { params: Promise<any> }) {
  const router = useRouter();
  // Safely extract the ID/Slug from the dynamic route promise
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.slug || unwrappedParams.id;

  const [step, setStep] = useState(1);

  // Monthly assessment usage snapshot for gating the Submit button
  const [limits, setLimits] = useState<{
    used: number;
    limit: number;
    remaining: number | null;
    isEligible: boolean;
    isAuthenticated: boolean;
  }>({ used: 0, limit: 0, remaining: null, isEligible: false, isAuthenticated: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const limitReached = limits.limit > 0 && limits.used >= limits.limit;

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    companyName: "",
    industry: "",
    sustainabilityBudget: "$2.5M - $5M",
    primaryMotivation: "", // Cleared default
    regionsOfInterest: [] as string[], // Cleared default
    certifications: [] as string[], // Cleared default
    additionalRequirements: ""
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle helpers for arrays in Step 3
  const toggleRegion = (region: string) => {
    setFormData(prev => ({
      ...prev,
      regionsOfInterest: prev.regionsOfInterest.includes(region)
        ? prev.regionsOfInterest.filter(r => r !== region)
        : [...prev.regionsOfInterest, region]
    }));
  };

  const toggleCert = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter(c => c !== cert)
        : [...prev.certifications, cert]
    }));
  };

  const STEPS = [
    { num: 1, title: "Personal Details" },
    { num: 2, title: "Company Context" },
    { num: 3, title: "Requirements" },
    { num: 4, title: "Review & Submit" },
  ];

  // Validation Check before moving to the next step
  const nextStep = () => {
    if (step === 1 && (!formData.fullName || !formData.email || !formData.phone)) {
      return toast.error("Please fill in all personal details.");
    }
    if (step === 2 && (!formData.companyName || !formData.industry || !formData.primaryMotivation)) {
      return toast.error("Please complete all company context fields.");
    }
    if (step === 3 && (formData.regionsOfInterest.length === 0 || formData.certifications.length === 0)) {
      return toast.error("Please select at least one region and one certification.");
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const submitForm = async () => {
    if (limitReached) {
      toast.error(
        "Monthly assessment limit reached. Contact admin to increase your limit.",
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting your inquiry records safely...");
    try {
      const res: any = await submitDprInquiry({
        projectId: projectId,
        ...formData
      });

      if (res?.success) {
        toast.success("DPR inquiry submitted successfully!", { id: toastId });
        router.push(`/projects/${projectId}/request-dpr/success`);
      } else {
        toast.error(res?.message || "Failed to submit inquiry record.", { id: toastId });
      }
    } catch (error: any) {
      toast.error(error?.message || "An unhandled server communication failure occurred.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const indianStates = ["Maharashtra", "Karnataka", "Gujarat", "Tamil Nadu", "Delhi NCR", "Kerala"];
  const certOptions = [
    { id: "Verra (VCS)", name: "Verra (VCS)", desc: "Verified Carbon Standard", icon: Leaf },
    { id: "Gold Standard", name: "Gold Standard", desc: "Global Goals (GS4GG)", icon: CheckCircle2 },
    { id: "Plan Vivo", name: "Plan Vivo", desc: "Community-led standard", icon: Circle }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fafbfc]">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-[1100px] mx-auto w-full px-6 py-10">
        
        {/* Top Banner */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm mb-8 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0e5c8c]" />
          <div className="flex items-center gap-4 pl-4">
            <div className="w-14 h-14 rounded-lg overflow-hidden relative">
              <Image src="/project1.jpg" alt="Project" fill className="object-cover" />
            </div>
            <div>
              <span className="inline-block bg-blue-100 text-[#1a82c4] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1">Active Project</span>
              <h1 className="text-xl font-bold text-gray-900">Detailed Project Report (DPR) Inquiry</h1>
              <p className="text-xs text-gray-500">Associated Project ID: {projectId}</p>
            </div>
          </div>
          <div className="bg-[#f0f5fb] border border-[#d6e4f0] rounded-lg px-4 py-2 text-right">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Estimated Response Time</p>
            <p className="text-sm font-semibold text-[#1a82c4] flex items-center gap-1.5 justify-end"><Clock size={14} /> 2-3 Business Days</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Tracking */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
              <h3 className="text-base font-bold text-gray-900 mb-6">Inquiry Steps</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-gray-100">
                {STEPS.map((s) => {
                  const isActive = step === s.num;
                  const isPast = step > s.num;
                  return (
                    <div key={s.num} className="relative flex items-start gap-4">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 shrink-0 outline outline-4 outline-white ${
                        isActive ? "bg-[#1a82c4] text-white" : isPast ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400 border border-gray-200"
                      }`}>
                        {isPast ? <Check size={12} strokeWidth={3} /> : s.num}
                      </div>
                      <div className="mt-0.5">
                        {isActive && <p className="text-[9px] font-bold text-[#1a82c4] uppercase tracking-wider mb-0.5">Active Step</p>}
                        {!isActive && <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Step {s.num}</p>}
                        <p className={`text-sm font-bold ${isActive ? "text-gray-900" : isPast ? "text-gray-700" : "text-gray-400"}`}>{s.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Progress</p>
                <div className="w-full h-1.5 bg-gray-200 rounded-full mb-2 overflow-hidden">
                  <div className="h-full bg-[#1a82c4] rounded-full transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }} />
                </div>
                <p className="text-xs font-semibold text-gray-600">{Math.round(((step - 1) / 3) * 100)}% Complete</p>
              </div>
            </div>
          </div>

          {/* Main Form Area */}
          <div className="lg:col-span-9">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-8 flex-1">
                
                {/* STEP 1: Personal Details */}
                {step === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Let's start with the basics</h2>
                    <p className="text-sm text-gray-500 mb-8">Provide your primary contact information so our experts can reach out.</p>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">Full Name</label>
                          <input 
                            value={formData.fullName}
                            onChange={(e) => updateField("fullName", e.target.value)} 
                            type="text" 
                            placeholder="e.g. Alexander Thorne" 
                            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#1a82c4] transition-colors" 
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
                          <input 
                            value={formData.email}
                            onChange={(e) => updateField("email", e.target.value)} 
                            type="email" 
                            placeholder="alex@company.com" 
                            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#1a82c4] transition-colors" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">Phone Number</label>
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#1a82c4] transition-colors">
                          <div className="bg-[#f8f9fc] border-r border-gray-200 px-4 py-3 text-sm text-gray-600 flex items-center">
                            +91
                          </div>
                          <input 
                            value={formData.phone}
                            onChange={(e) => updateField("phone", e.target.value)} 
                            type="tel" 
                            placeholder="98765 43210" 
                            className="flex-1 px-4 py-3 text-sm outline-none" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Company Context */}
                {step === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Context</h2>
                    <p className="text-sm text-gray-500 mb-8">Provide detailed insights into your organization's structure and sustainability commitments to calibrate your DPR report accurately.</p>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">Company Registered Name</label>
                        <input 
                          value={formData.companyName}
                          onChange={(e) => updateField("companyName", e.target.value)} 
                          type="text" 
                          placeholder="e.g. Global Logistics Solutions Ltd." 
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#1a82c4] transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-2">Industry Sector</label>
                        <select 
                          value={formData.industry}
                          onChange={(e) => updateField("industry", e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#1a82c4] transition-colors appearance-none bg-white"
                        >
                          <option value="">Select your primary industry</option>
                          <option value="Renewable Energy">Renewable Energy</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Agriculture">Agriculture</option>
                          <option value="Technology">Technology</option>
                        </select>
                      </div>
                      <div className="pt-2">
                        <div className="flex justify-between items-end mb-2">
                          <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider">Annual Sustainability Budget ($ USD)</label>
                          <span className="text-sm font-bold text-[#1a82c4]">{formData.sustainabilityBudget}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3 overflow-hidden">
                          <div className="h-full bg-[#1a82c4] rounded-full w-1/2" />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 font-medium">
                          <span>&lt;$100k</span>
                          <span>$10M+</span>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-100">
                        <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-4">Primary Motivation For Report</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {["Regulatory Compliance", "Investor Relations", "Strategic Resilience", "Market Differentiation"].map((mot) => (
                            <label key={mot} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-[#1a82c4] transition-colors">
                              <input 
                                checked={formData.primaryMotivation === mot}
                                onChange={() => updateField("primaryMotivation", mot)} 
                                type="radio" 
                                name="motivation" 
                                className="mt-1" 
                              />
                              <div>
                                <p className="text-sm font-bold text-gray-900">{mot}</p>
                                <p className="text-xs text-gray-500 mt-1">Brief description of the motivation.</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 bg-[#f0f5fb] border-l-2 border-[#b58b29] rounded-r-lg p-4 flex gap-3">
                      <Lightbulb size={16} className="text-[#b58b29] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-gray-900 mb-1">Data Precision Tip</p>
                        <p className="text-[11px] text-gray-600 leading-relaxed">Selecting the correct industry sector allows our AI to benchmark your carbon intensity and physical risk exposure against sector-specific thresholds.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Requirements */}
                {step === 3 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Technical Requirements</h2>
                    <p className="text-sm text-gray-500 mb-8">Specify the project parameters, certification standards, and any additional constraints for your inquiry.</p>
                    
                    <div className="space-y-6">
                      <div className="border border-gray-200 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><Globe size={16} className="text-[#1a82c4]"/> Specific Regions of Interest</h4>
                        <p className="text-xs text-gray-500 mb-4">Select all regions where you seek climate project deployment.</p>
                        <div className="flex flex-wrap gap-2.5">
                          {indianStates.map((state) => {
                            const isSelected = formData.regionsOfInterest.includes(state);
                            return (
                              <button 
                                key={state} 
                                type="button"
                                onClick={() => toggleRegion(state)}
                                className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                                  isSelected 
                                    ? "bg-[#1a82c4] text-white border-[#1a82c4]" 
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {state} {isSelected && "✓"}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><CheckCircle2 size={16} className="text-[#1a82c4]"/> Required Certifications</h4>
                        <p className="text-xs text-gray-500 mb-4">Mandatory standards for project validation and credit issuance.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {certOptions.map((cert) => {
                            const isSelected = formData.certifications.includes(cert.id);
                            const Icon = cert.icon;
                            return (
                              <div 
                                key={cert.id}
                                onClick={() => toggleCert(cert.id)}
                                className={`rounded-lg p-4 relative cursor-pointer transition-colors border-2 ${
                                  isSelected 
                                    ? "border-emerald-500 bg-emerald-50/20" 
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full border-2 ${
                                  isSelected ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
                                }`} />
                                <Icon size={16} className={`${isSelected ? "text-emerald-600" : "text-gray-400"} mb-2`} />
                                <p className="text-sm font-bold text-gray-900">{cert.name}</p>
                                <p className="text-[10px] text-gray-500 mt-1">{cert.desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border border-gray-200 rounded-xl p-5">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Edit2 size={16} className="text-[#1a82c4]"/> Additional Specific Requirements</h4>
                        <textarea 
                          value={formData.additionalRequirements}
                          onChange={(e) => updateField("additionalRequirements", e.target.value)}
                          rows={3} 
                          placeholder="Describe any unique constraints, required vintage ranges..." 
                          className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#1a82c4] resize-none" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Review & Submit */}
                {step === 4 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Review your Inquiry</h2>
                    <p className="text-sm text-gray-500 mb-8">Please verify your details before final submission.</p>
                    
                    <div className="space-y-4 mb-8">
                      {/* Section 1 */}
                      <div className="border border-gray-200 rounded-xl p-5 bg-white">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><span className="text-gray-400">👤</span> Personal Details</h4>
                          <button onClick={() => setStep(1)} className="text-[11px] font-bold text-[#1a82c4] flex items-center gap-1 hover:underline"><Edit2 size={10} /> Edit</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Full Name</p><p className="text-sm font-medium text-gray-900">{formData.fullName}</p></div>
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Email</p><p className="text-sm font-medium text-gray-900">{formData.email}</p></div>
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Phone Number</p><p className="text-sm font-medium text-gray-900">+91 {formData.phone}</p></div>
                        </div>
                      </div>

                      {/* Section 2 */}
                      <div className="border border-gray-200 rounded-xl p-5 bg-white">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><span className="text-gray-400">🏢</span> Company Context</h4>
                          <button onClick={() => setStep(2)} className="text-[11px] font-bold text-[#1a82c4] flex items-center gap-1 hover:underline"><Edit2 size={10} /> Edit</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Industry</p><p className="text-sm font-medium text-gray-900">{formData.industry}</p></div>
                          <div><p className="text-[10px] font-bold text-gray-400 uppercase">Primary Motivation</p><p className="text-sm font-medium text-gray-900">{formData.primaryMotivation}</p></div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Company Registered Name</p>
                          <p className="text-sm font-medium text-gray-900">{formData.companyName}</p>
                        </div>
                      </div>

                      {/* Section 3 */}
                      <div className="border border-gray-200 rounded-xl p-5 bg-white">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><span className="text-gray-400">📋</span> Technical Requirements</h4>
                          <button onClick={() => setStep(3)} className="text-[11px] font-bold text-[#1a82c4] flex items-center gap-1 hover:underline"><Edit2 size={10} /> Edit</button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Regions</p>
                            <p className="text-sm font-medium text-gray-900">{formData.regionsOfInterest.join(", ")}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Certifications</p>
                            <div className="flex gap-2">
                              {formData.certifications.map(cert => (
                                <span key={cert} className="px-2 py-1 border border-gray-200 rounded text-[10px] font-medium text-gray-600">{cert}</span>
                              ))}
                            </div>
                          </div>
                          {formData.additionalRequirements && (
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Additional Requirements</p>
                              <p className="text-sm font-medium text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">{formData.additionalRequirements}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1a82c4] focus:ring-[#1a82c4]" defaultChecked />
                      <span className="text-sm font-medium text-gray-700">I confirm that the information provided is accurate and I agree to the terms of the DPR process.</span>
                    </label>

                    {limitReached && (
                      <div className="mt-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-700">
                            Monthly assessment limit reached
                          </p>
                          <p className="text-xs text-red-600 mt-0.5">
                            You have used {limits.used} of {limits.limit} assessments this month. Contact admin to increase your limit.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Bottom Nav Bar */}
              <div className="bg-[#f8f9fc] border-t border-gray-200 p-6 flex items-center justify-between">
                {step > 1 ? (
                  <button onClick={prevStep} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-6 rounded-lg text-sm transition flex items-center gap-2">
                    <ArrowLeft size={16} /> Back
                  </button>
                ) : (
                  <div /> // Empty div to keep alignment
                )}
                
                <div className="flex items-center gap-4">
                  {step === 3 && <button className="text-sm font-bold text-gray-600 hover:text-gray-900 transition">Save as Draft</button>}
                  
                  {step < 4 ? (
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500 font-medium">Step {step} of 4</span>
                      <button onClick={nextStep} className="bg-[#1a82c4] hover:bg-[#156a9c] text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition flex items-center gap-2 shadow-sm">
                        Next Step <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={submitForm}
                      disabled={isSubmitting || limitReached}
                      className="bg-[#0e5c8c] hover:bg-[#0a466b] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-8 rounded-lg text-sm transition flex items-center gap-2 shadow-md"
                    >
                      Submit Inquiry <Send size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}