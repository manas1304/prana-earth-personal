"use client";

import { useState, useRef, useEffect } from "react";
import PredictNavbar from "@/components/predict/navbar";
import Sidebar from "@/components/predict/sidebar";
import MarketplaceFooter from "@/components/marketplace/footer";
import { ChevronDown, ChevronUp } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "");

type AssessmentResult = {
  scenario: string;
  horizon: number;
  asset_type: string | null;
  composite_risk: number;
  hazard_scores: {
    flood: number;
    heat_stress: number;
    water_stress: number;
    drought: number;
    storm: number;
    wildfire: number;
  };
  exposure: { financial: number; population: number };
  adaptive_capacity: number;
  location: { h3_cell: string; h3_resolution: number };
};

type HazardColor = "green" | "amber" | "red";

function hazardColor(score: number): HazardColor {
  if (score < 35) return "green";
  if (score < 70) return "amber";
  return "red";
}

const TONE: Record<HazardColor, string> = {
  green: "bg-green-100 text-green-800 border-green-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  red:   "bg-red-100   text-red-800   border-red-200",
};

const HAZARD_LABELS: Record<keyof AssessmentResult["hazard_scores"], string> = {
  flood:        "Flood",
  heat_stress:  "Heat Stress",
  water_stress: "Water Stress",
  drought:      "Drought",
  storm:        "Storm",
  wildfire:     "Wildfire",
};

export default function RiskAssessmentPage() {
  // Form state
  const [assetName, setAssetName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [assetSize, setAssetSize] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [scenario, setScenario] = useState("ssp585");
  const [horizon, setHorizon] = useState(2050);
  const [assetType, setAssetType] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setResult(null);

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setError("Please enter valid latitude and longitude numbers.");
      return;
    }
    if (!assetType) {
      setError("Please select an asset type.");
      return;
    }

    setSubmitting(true);
    try {
      const r = await fetch(`${API_BASE}/v1/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: latNum,
          lon: lonNum,
          scenario,
          horizon,
          asset_type: assetType,
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`Server returned ${r.status}: ${text.slice(0, 200)}`);
      }
      const body = (await r.json()) as AssessmentResult;
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PredictNavbar />

      <div className="flex flex-1 max-w-full">
        <div className="hidden lg:block"><Sidebar /></div>

        {/* Middle Section */}
        <main className="flex-1 p-8 overflow-y-auto bg-[#D9D9D9]/30" style={{ maxWidth: "1155px" }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Risk Assessment</h1>
            <p className="text-sm text-gray-500 mt-1">
              Provide asset details to assess climate-related risks and understand environmental vulnerabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8">
            {/* Left Column: Asset Details Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
              <h2 className="text-base font-bold text-gray-900 mb-6">Asset Details</h2>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-6">
                <InputField label="Asset Name *"
                  placeholder="Enter asset name"
                  value={assetName}
                  onChange={setAssetName} />
                <InputField label="Address / Location Line 1 *"
                  placeholder="Enter address or location"
                  value={addressLine1}
                  onChange={setAddressLine1} />
                <InputField label="Address / Location Line 2 *"
                  placeholder="Enter address or location"
                  value={addressLine2}
                  onChange={setAddressLine2} />
                <InputField label="Asset Size (Optional)"
                  placeholder="e.g. 10,000 sq ft"
                  value={assetSize}
                  onChange={setAssetSize} />
                <InputField label="Latitude *"
                  placeholder="e.g. 12.97"
                  value={lat}
                  onChange={setLat} />
                <InputField label="Longitude *"
                  placeholder="e.g. 77.59"
                  value={lon}
                  onChange={setLon} />
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5 mb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Scenario
                  </label>
                  <select
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700 outline-none focus:border-blue-500"
                  >
                    <option value="historical">historical</option>
                    <option value="ssp126">ssp126</option>
                    <option value="ssp245">ssp245</option>
                    <option value="ssp370">ssp370</option>
                    <option value="ssp585">ssp585</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1.5">
                    Horizon
                  </label>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(parseInt(e.target.value, 10))}
                    className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700 outline-none focus:border-blue-500"
                  >
                    <option value={2030}>2030</option>
                    <option value={2040}>2040</option>
                    <option value={2050}>2050</option>
                  </select>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Asset Type *</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Select the asset type that best describes your asset
                </p>
                <AssetTypeDropdown value={assetType} onChange={setAssetType} />
              </div>

              <div className="mt-auto pt-6 flex items-center justify-center gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-[#1a82c4] hover:bg-[#156a9c] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 px-8 rounded-md transition-colors"
                >
                  {submitting ? "Running assessment..." : "Start Assessment"}
                </button>
                <button
                  onClick={() => {
                    setAssetName("");
                    setAddressLine1("");
                    setAddressLine2("");
                    setAssetSize("");
                    setLat("");
                    setLon("");
                    setAssetType("");
                    setResult(null);
                    setError(null);
                  }}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold py-2.5 px-8 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-md p-3">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {result && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h3 className="text-base font-bold text-gray-900 mb-1">
                    Assessment Results
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    H3 cell <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">{result.location.h3_cell}</code>
                    {" "}(resolution {result.location.h3_resolution}) ·{" "}
                    {result.scenario} · {result.horizon} · {result.asset_type ?? "n/a"}
                  </p>

                  <div className="bg-gradient-to-br from-[#0f3d30] to-[#256b58] text-white rounded-xl p-6 mb-6">
                    <p className="text-xs uppercase tracking-wider text-white/70 mb-1">
                      Composite Risk
                    </p>
                    <p className="text-5xl font-bold">
                      {result.composite_risk.toFixed(1)}
                      <span className="text-2xl font-medium text-white/70"> / 100</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {(Object.keys(HAZARD_LABELS) as Array<keyof AssessmentResult["hazard_scores"]>).map((k) => {
                      const score = result.hazard_scores[k];
                      const color = hazardColor(score);
                      return (
                        <div
                          key={k}
                          className={`border rounded-lg p-3 ${TONE[color]}`}
                        >
                          <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                            {HAZARD_LABELS[k]}
                          </p>
                          <p className="text-2xl font-bold mt-1">{score.toFixed(1)}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                    <ExposureMetric label="Financial Exposure" value={result.exposure.financial} />
                    <ExposureMetric label="Population Exposure" value={result.exposure.population} />
                    <ExposureMetric label="Adaptive Capacity" value={result.adaptive_capacity} />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Location Preview */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
              <h2 className="text-base font-bold text-gray-900 mb-1">Location Preview</h2>
              <p className="text-xs text-gray-500 mb-4">
                This map shows the selected location of your asset.
              </p>

              {/* Map Placeholder */}
              <div className="w-full h-64 bg-gray-100 rounded-lg mb-4 overflow-hidden border border-gray-200 relative">
                <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=San+Francisco&zoom=13&size=600x300&maptype=roadmap&sensor=false')] bg-cover bg-center opacity-80 mix-blend-multiply"></div>
              </div>

              {/* Info Box */}
              <div className="bg-[#f0f7fb] rounded-lg p-5 mb-6 text-xs text-gray-600 leading-relaxed">
                <ul className="list-disc pl-4 space-y-2">
                  <li>Once the address/location is entered, a small preview map displaying the selected location is shown for your confirmation.</li>
                  <li>If you enter an already existing/similar asset location, we'll prompt you to confirm whether the assessment should continue, as multiple asset types may exist within the same premises/location.</li>
                  <li>Clicking "Start Assessment" begins the assessment processing workflow.</li>
                  <li>Before processing begins, you will be informed that the free assessment will be consumed once processing starts.</li>
                </ul>
              </div>

              <div className="mt-auto flex justify-end">
                <button className="bg-[#1a82c4] hover:bg-[#156a9c] text-white text-sm font-semibold py-2.5 px-6 rounded-md transition-colors">
                  Auto-fill The Location
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <MarketplaceFooter />
    </div>
  );
}

// --- Reusable Input Component ---
function InputField(props: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-900 mb-1.5">{props.label}</label>
      <input
        type="text"
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-500 transition-colors"
      />
    </div>
  );
}

// --- Custom Asset Type Dropdown ---
function AssetTypeDropdown(props: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [otherValue, setOtherValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    "data_center",
    "manufacturing_unit",
    "warehouse",
    "commercial_building",
    "industrial_facility",
    "energy_power_infrastructure",
    "office_campus",
    "logistics_transportation_hub",
    "agriculture_farmland",
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Map display label back to internal value
  const labelFor = (val: string) => {
    if (val === "Other") return otherValue ? `Other: ${otherValue}` : "Other";
    if (!val) return "Select asset type";
    // convert snake_case to "Snake Case"
    return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-md py-2.5 px-4 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none"
      >
        <span>{labelFor(props.value)}</span>
        {isOpen ? <ChevronUp size={18} className="text-gray-900" /> : <ChevronDown size={18} className="text-gray-900" />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto py-2">
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  props.onChange(opt);
                  setIsOpen(false);
                }}
                className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
            ))}
            <div className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <span
                onClick={() => {
                  props.onChange("Other");
                  setIsOpen(false);
                }}
                className="text-sm font-semibold text-gray-700 cursor-pointer flex-shrink-0"
              >
                Other
              </span>
              <input
                type="text"
                placeholder="Enter your asset type"
                value={otherValue}
                onChange={(e) => {
                  setOtherValue(e.target.value);
                  props.onChange("Other");
                }}
                className="ml-4 flex-1 border border-gray-300 rounded py-1.5 px-3 text-xs text-gray-700 outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExposureMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value.toFixed(1)}</p>
    </div>
  );
}
