"use client";

import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  Ban,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import MarketplaceNavbar from "@/components/marketplace/navbar";
import Footer from "@/components/marketplace/footer";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/actions/auth.actions";
import { toast } from "sonner";
import {
  initiatePayment,
  verifyPayment,
  getSubscriptionPlans,
} from "@/actions/billing.actions";

// Type matching your schema.prisma SubscriptionType enum
type SubscriptionType = "FREE" | "PREDICT" | "MARKETPLACE" | "BUNDLE";

interface Plan {
  id: string;
  name: string;
  type: SubscriptionType;
  priceMonthly: number;
  priceYearly: number;
  maxAssets?: number;
  maxAssessments?: number;
  features?: any;
  isPubliclyVisible?: boolean;
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "yearly",
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // CHANGED: Added master array state to dynamically hold all plans from DB
  const [dbPlans, setDbPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    async function checkAuthAndPlans() {
      try {
        const response: any = await getCurrentUser();
        if (response?.success && response?.data?.user) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        setIsLoggedIn(false);
      }

      // CHANGED: Dynamic parsing structure extracting all tiers from DB map records
      try {
        const planRes: any = await getSubscriptionPlans();
        console.log("BACKEND PLANS RESPONSE:", planRes);
        if (planRes?.success && planRes?.data?.plans) {
          // Sort plans to show FREE first, then PREDICT, MARKETPLACE, and BUNDLE
          const order: Record<SubscriptionType, number> = {
            FREE: 0,
            MARKETPLACE: 1,
            PREDICT: 2,
            BUNDLE: 3,
          };
          const sortedPlans = [...planRes.data.plans].sort(
            (a: any, b: any) =>
              (order[a.type as SubscriptionType] ?? 99) -
              (order[b.type as SubscriptionType] ?? 99),
          );
          setDbPlans(sortedPlans);
        }
      } catch (err) {
        console.error("Failed to fetch subscription plan IDs", err);
      } finally {
        setLoadingPlans(false);
      }
    }

    checkAuthAndPlans();

    if (!document.getElementById("razorpay-sdk")) {
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // CHANGED: handleUpgrade now accepts the specific targeted selected plan ID dynamically
  const handleUpgrade = async (
    targetPlanId: string,
    planType: SubscriptionType,
  ) => {
    if (!isLoggedIn) {
      router.push(`/login?tab=login&redirectTo=/pricing`);
      return;
    }

    if (planType === "FREE") {
      toast.info("You are already on the Free tier.");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading("Initializing secure payment session...");

    try {
      const res: any = await initiatePayment({
        planId: targetPlanId,
        billingCycle: billingCycle.toUpperCase(),
      });

      if (!res?.success || !res.data) {
        throw new Error(res?.message || "Failed to initiate payment session.");
      }

      const { orderId, amount, currency } = res.data;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: "Prana Earth",
        description: `${planType} Subscription (${billingCycle})`,
        order_id: orderId,
        handler: async function (response: any) {
          toast.loading("Verifying transaction authenticity...", {
            id: toastId,
          });

          try {
            const verificationRes: any = await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verificationRes?.success) {
              toast.success(`Payment successful! Welcome to ${planType}.`, {
                id: toastId,
              });
              setIsProcessing(false);
              router.push("/");
              router.refresh();
            } else {
              toast.error(verificationRes?.message || "Verification failed.", {
                id: toastId,
              });
            }
          } catch (verifyErr: any) {
            toast.error(
              verifyErr?.message || "Error validating payment signature.",
              { id: toastId },
            );
          }
        },
        modal: {
          ondismiss: function () {
            toast.dismiss(toastId);
            setIsProcessing(false);
          },
        },
        theme: {
          color: "#0e5c8c",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error?.message || "Something went wrong.", { id: toastId });
      setIsProcessing(false);
    }
  };

  const faqs = [
    {
      q: "Can I switch plans mid-billing cycle?",
      a: "Yes, you can upgrade or downgrade at any time. If you upgrade, the new features become available immediately and your billing will be prorated.",
    },
    {
      q: "What is 'Advanced MRV Integration'?",
      a: "MRV stands for Measurement, Reporting, and Verification. Advanced integration allows you to connect your own monitoring APIs directly to our platform.",
    },
  ];

  // Helper dictionary mapping static feature texts to clean runtime layouts if features aren't present in DB metadata
  const getStaticFeatures = (type: SubscriptionType) => {
    switch (type) {
      case "FREE":
        return [
          { text: "High-level market summaries", active: true },
          { text: "Limited project visibility", active: true },
          { text: "10 monthly reports", active: true },
          { text: "Full concept note access", active: false },
        ];
      case "PREDICT":
        return [
          { text: "Full marketplace intelligence", active: true },
          { text: "Direct project document access", active: true },
          { text: "Exclusive Concept Note downloads", active: true },
          { text: "Unlimited report access", active: true },
          { text: "Real-time alerts & notifications", active: true },
        ];
      case "MARKETPLACE":
        return [
          { text: "Advanced marketplace dashboard access", active: true },
          { text: "Full project structural reports", active: true },
          { text: "Seamless direct developer inquiry lines", active: true },
          { text: "Priority investment pipelines", active: true },
          { text: "Dedicated support lines", active: true },
        ];
      case "BUNDLE":
        return [
          { text: "Everything in Predict & Marketplace", active: true },
          { text: "Full structural environmental data auditing", active: true },
          { text: "Advanced MRV API integration tools", active: true },
          { text: "Dedicated client account strategist", active: true },
          { text: "Custom webhook event listeners", active: true },
        ];
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col">
      <MarketplaceNavbar />

      {/* Header */}
      <div className="pt-16 pb-8 text-center max-w-[700px] mx-auto px-6">
        <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider mb-6">
          <ShieldCheck size={14} /> Plan Management
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
          Choose Your Access
        </h1>
        <p className="text-gray-500 text-[15px] leading-relaxed">
          Unlock the full power of environmental intelligence. From individual
          carbon project monitoring to portfolio-wide MRV integration, find the
          plan that scales with your climate impact.
        </p>
      </div>

      {/* Monthly/Yearly Toggle UI */}
      <div className="flex justify-center mb-12">
        <div className="bg-[#f0f4f8] p-1.5 rounded-full inline-flex items-center gap-1 border border-gray-200">
          <button
            onClick={() => setBillingCycle("monthly")}
            disabled={isProcessing}
            className={`px-6 py-2.5 text-sm font-semibold rounded-full transition-all ${
              billingCycle === "monthly"
                ? "bg-[#0e5c8c] text-white shadow-md"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            disabled={isProcessing}
            className={`px-6 py-2.5 text-sm font-semibold rounded-full transition-all flex items-center gap-2 ${
              billingCycle === "yearly"
                ? "bg-[#0e5c8c] text-white shadow-md"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Yearly
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                billingCycle === "yearly"
                  ? "bg-[#22c55e] text-white"
                  : "bg-green-100 text-green-700"
              }`}
            >
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* CHANGED: Dynamic Mapping Framework tracking over dbPlans instead of raw hardcoded component nodes */}
      {loadingPlans ? (
        <div className="text-center py-24 text-sm font-semibold text-gray-500">
          Loading dynamic database subscription tiers...
        </div>
      ) : (
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6 mb-24 items-stretch w-full">
          {dbPlans
            .filter(
              (plan) =>
                plan.isPubliclyVisible !== false &&
                (plan.type === "FREE" ||
                  plan.type === "MARKETPLACE" ||
                  plan.type === "BUNDLE"),
            )
            .map((plan) => {
              const isFeatured = plan.type === "MARKETPLACE";
              const planFeatures = getStaticFeatures(plan.type);

              // Calculate dynamic presentation prices display values
              const structuralPrice =
                billingCycle === "monthly"
                  ? plan.priceMonthly
                  : Math.round(plan.priceMonthly * 0.8);
              const baselinePrice = plan.priceMonthly;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-8 border flex flex-col justify-between transition-all ${
                    isFeatured
                      ? "bg-white border-2 border-[#0e5c8c] shadow-xl relative md:-translate-y-2"
                      : "bg-[#f8f9fc] border-gray-200"
                  }`}
                >
                  {plan.type === "PREDICT" && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0e5c8c] text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>

                    <div className="flex items-baseline gap-2 mb-1">
                      <span
                        className={`text-4xl font-extrabold ${isFeatured ? "text-[#0e5c8c]" : "text-gray-900"}`}
                      >
                        {plan.type === "FREE" ? "$0" : `$${structuralPrice}`}
                      </span>
                      {plan.type !== "FREE" && billingCycle === "yearly" && (
                        <span className="text-sm font-semibold text-gray-400 line-through">
                          ${baselinePrice}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 mb-6 font-medium">
                      {plan.type === "FREE"
                        ? "/month"
                        : billingCycle === "monthly"
                          ? "/month"
                          : "/mo billed annually"}
                    </div>

                    <p className="text-xs text-gray-500 mb-8 h-10">
                      {plan.type === "FREE" &&
                        "Essential visibility for environmental newcomers."}
                      {plan.type === "PREDICT" &&
                        "Complete marketplace intelligence for active investors."}
                      {plan.type === "MARKETPLACE" &&
                        "Advanced deal sourcing and transaction routing pipeline."}
                      {plan.type === "BUNDLE" &&
                        "Enterprise-grade ecosystem monitoring and MRV."}
                    </p>

                    {/* Replace the existing <ul> inside the dbPlans.map block with this: */}
                    <ul className="space-y-4 mb-8 text-sm">
                      {plan.features?.map((feat: string, fIdx: number) => (
                        <li
                          key={fIdx}
                          className="flex items-start gap-2 text-gray-700"
                        >
                          <CheckCircle2
                            size={16}
                            className="text-green-500 shrink-0 mt-0.5"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleUpgrade(plan.id, plan.type)}
                    disabled={isProcessing || plan.type === "PREDICT"}
                    className={`w-full py-3 rounded-lg font-semibold text-sm transition shadow-sm ${
                      plan.type === "FREE"
                        ? "bg-blue-100/50 text-blue-800 cursor-default shadow-none"
                        : isFeatured
                          ? "bg-[#0e5c8c] hover:bg-[#0a466b] text-white"
                          : "bg-blue-50 hover:bg-blue-100 text-[#0e5c8c] border border-blue-200"
                    }`}
                  >
                    {plan.type === "FREE"
                      ? "Current Plan"
                      : isProcessing
                        ? "Processing..."
                        : "Upgrade Now"}
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {/* Banner Section */}
      <div className="max-w-[1100px] mx-auto px-6 mb-24 w-full">
        <div className="relative rounded-2xl overflow-hidden h-[280px] w-full flex items-center px-10">
          <Image
            src="/forest-sea-hero-bg.jpg"
            alt="Mountain"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#072436] via-[#072436]/90 to-transparent" />

          <div className="relative z-10 max-w-[600px]">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Intelligence Matters?
            </h2>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              In the volatile carbon market, transparency is your greatest
              asset. Prana Earth provides the rigorous data auditing and
              site-specific monitoring needed to mitigate risk and verify actual
              impact in real-time.
            </p>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              <ShieldCheck size={14} /> Risk Mitigation
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-[700px] mx-auto px-6 mb-24 w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border-b border-gray-200 pb-4">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex justify-between items-center py-2 text-left"
              >
                <span className="text-sm font-bold text-gray-900">{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp size={18} className="text-gray-500" />
                ) : (
                  <ChevronDown size={18} className="text-gray-500" />
                )}
              </button>
              {openFaq === idx && (
                <p className="text-xs text-gray-600 mt-2 pr-8 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
