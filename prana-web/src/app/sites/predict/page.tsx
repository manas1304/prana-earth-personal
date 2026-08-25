"use client"
import PredictNavbar from "@/components/predict/navbar";
import PredictHero from "@/components/predict/hero";
import HowItWorks from "@/components/predict/how-it-works";
import ImpactStats from "@/components/predict/impact-stats";
// import OurTech from "@/components/predict/our-tech-landing";
import WhyPranaEarth from "@/components/marketplace/why-prana-earth";
import ReadyCTA from "@/components/predict/ready-cta";
import MarketplaceFooter from "@/components/marketplace/footer";
import {useState, useEffect} from 'react'
import { getPlatformContent } from "@/actions/platform-content.actions";
import ThreeStepsToImpact from "@/components/predict/three-steps-to-impact";

export default function PredictLandingPage() {
  const [contentMetrics, setContentMetrics] = useState({
      totalCarbonSaved: "4.2M",
      ethicalProductsVerified: "100%",
      activeMonitoringNodes: "1,200+",
    });
  
    useEffect(() => {
      async function loadLiveHeroMetrics() {
        try {
          const res: any = await getPlatformContent();
          if (res?.success && res?.data) {
            setContentMetrics({
              totalCarbonSaved: res.data.totalCarbonSaved
                ? `${Number(res.data.totalCarbonSaved).toLocaleString()} `
                : "4.2M",
              ethicalProductsVerified: res.data.ethicalProductsVerified
                ? `${res.data.ethicalProductsVerified}%`
                : "100%",
              activeMonitoringNodes: res.data.activeMonitoringNodes
                ? Number(res.data.activeMonitoringNodes).toLocaleString()
                : "1,200+",
            });
          }
        } catch (err) {
          console.error("Failed to load platform global analytics context.");
        }
      }
      loadLiveHeroMetrics();
    }, []);
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <PredictNavbar />
      <PredictHero />
      <HowItWorks />
      <ThreeStepsToImpact />
      <ImpactStats />
      {/* <Why Prana Earth /> */}
      <WhyPranaEarth customMetrics={contentMetrics} />
      <ReadyCTA />
      <MarketplaceFooter />
    </div>
  );
}
