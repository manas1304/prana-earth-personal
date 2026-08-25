import os
import json
from typing import Dict, Any, List, Optional
import google.generativeai as genai

class GeminiExplainer:
    """
    Interfaces with Google's Gemini API to generate business-friendly
    explanations, ESG alignments, and marketplace recommendations.
    Provides a high-quality local template fallback if the API key is missing or the call fails.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.has_api = False
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                # We default to gemini-1.5-flash for speed and reliability in MVP tasks
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                self.has_api = True
            except Exception as e:
                # Log or handle config issue
                self.has_api = False

    def generate_risk_explanations(
        self, 
        asset_name: str, 
        asset_type: str, 
        address: str, 
        risk_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates narrative explanations of calculated risk metrics.
        Returns a dictionary containing:
        - "executive_summary": overall analysis paragraph
        - "parameter_explanations": Dict[param, text] explanations for each of the 9 risks
        """
        scenario = risk_data.get("scenario", "ssp245")
        risk_proj = risk_data.get("risk_projections", {})
        
        # Prepare a structured summary of risks for the prompt
        risk_summary_text = ""
        for year in sorted(risk_proj.keys()):
            risk_summary_text += f"Year {year}:\n"
            for param, vals in risk_proj[year].items():
                risk_summary_text += f"  - {param}: Score={vals['score']}, Rating={vals['rating']}\n"

        system_instruction = (
            "You are an expert climate scientist and risk consultant for Prana Earth. "
            "Your task is to write business-friendly climate risk explanations for executive dashboards. "
            "Keep summaries professional, concise, actionable, and focus on the strategic impact. "
            "Return output as a JSON block with keys: 'executive_summary' (string) and "
            "'parameter_explanations' (object mapping risk parameter keys to short paragraph explanation strings)."
        )

        prompt = f"""
        Asset Name: {asset_name}
        Asset Type: {asset_type}
        Location: {address}
        Scenario: {scenario}
        
        Calculated Risks:
        {risk_summary_text}
        
        Please generate the climate vulnerability explanations and the overall executive summary.
        Ensure you cover the 9 parameters:
        - flood_extreme_rain
        - drought
        - heat_stress
        - wildfire
        - tropical_cyclones
        - water_stress
        - sea_level_rise
        - ocean_changes
        - biodiversity_shifts
        
        Return ONLY valid JSON in this format:
        {{
            "executive_summary": "...",
            "parameter_explanations": {{
                "flood_extreme_rain": "...",
                "drought": "...",
                "heat_stress": "...",
                "wildfire": "...",
                "tropical_cyclones": "...",
                "water_stress": "...",
                "sea_level_rise": "...",
                "ocean_changes": "...",
                "biodiversity_shifts": "..."
            }}
        }}
        """

        if self.has_api:
            try:
                response = self.model.generate_content(
                    contents=system_instruction + "\n\n" + prompt
                )
                text = response.text.strip()
                # Clean markdown wrapper if model returns ```json ... ```
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                cleaned_json = json.loads(text.strip())
                return cleaned_json
            except Exception as e:
                # Log error and fall back
                pass

        # Local fallback if API is not active or fails
        return self._fallback_risk_explanations(asset_name, asset_type, address, risk_data)

    def generate_esg_alignment(
        self, 
        risk_data: Dict[str, Any], 
        esg_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Aligns calculated climate risks with parsed sustainability commitments (from ESG PDF/Excel).
        """
        # Form summary of parsed contexts
        esg_contexts = esg_data.get("matched_contexts", {})
        esg_summary_text = ""
        for cat, matches in esg_contexts.items():
            if matches:
                esg_summary_text += f"Category {cat}:\n"
                for match in matches[:3]: # top 3 matches
                    esg_summary_text += f"  - {match}\n"
        
        if not esg_summary_text:
            esg_summary_text = "No prior ESG documentation uploaded or parsed. Baseline targets are unknown."

        prompt = f"""
        Corporate ESG contexts extracted:
        {esg_summary_text}
        
        Assessed Climate Scenario: {risk_data.get('scenario', 'ssp245')}
        
        Please provide:
        1. A summary of how the company's targets align with identified risks.
        2. A gap analysis (e.g. if Water Stress is projected to be High, but no water management is mentioned).
        3. Strategic recommendations.
        
        Format the output as a JSON block with keys 'alignment_summary', 'gaps_identified', and 'strategic_recommendations'.
        """
        
        if self.has_api:
            try:
                response = self.model.generate_content(prompt)
                text = response.text.strip()
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                return json.loads(text.strip())
            except Exception:
                pass

        # Local Fallback
        gaps = ["Lack of local site adaptation pathways for extreme weather scenarios."]
        has_water_risk = any(
            y.get("water_stress", {}).get("score", 0) > 60 for y in risk_data.get("risk_projections", {}).values()
        )
        has_water_esg = len(esg_contexts.get("water_management", [])) > 0
        if has_water_risk and not has_water_esg:
            gaps.append("High water stress risk projected, but sustainability filings do not declare site-level water conservation measures.")
            
        has_emissions_esg = len(esg_contexts.get("emissions_carbon", [])) > 0
        if not has_emissions_esg:
            gaps.append("GHG emissions reduction targets are not aligned with regional regulatory guidelines.")

        return {
            "alignment_summary": (
                "Based on the corporate sustainability report, there are partial strategies aligning with "
                "carbon footprint reductions. However, operational physical risk adaptations remain generalized."
            ),
            "gaps_identified": gaps,
            "strategic_recommendations": [
                "Draft site-specific water recycling systems to buffer water stress.",
                "Reinforce physical storage facilities to withstand storm wind parameters.",
                "Review carbon offsetting portfolio on Prana Earth Marketplace to offset scope emissions."
            ]
        }

    def generate_marketplace_recommendations(
        self, 
        risk_data: Dict[str, Any], 
        asset_type: str
    ) -> List[Dict[str, Any]]:
        """
        Recommends specific adaptation/mitigation project categories on marketplace.pranaearth.com
        based on the highest risk parameters calculated.
        """
        # Find highest average risk parameter across projections
        risk_proj = risk_data.get("risk_projections", {})
        param_sums = {}
        for year, params in risk_proj.items():
            for p_name, vals in params.items():
                param_sums[p_name] = param_sums.get(p_name, 0.0) + vals["score"]
        
        # Sort parameters by average score descending
        sorted_params = sorted(param_sums.items(), key=lambda x: x[1], reverse=True)
        top_param = sorted_params[0][0] if sorted_params else "flood_extreme_rain"
        
        # Recommendations catalog
        recommendations_db = {
            "flood_extreme_rain": [
                {
                    "title": "Coastal & Inland Wetlands Restoration",
                    "category": "Nature-Based Solution",
                    "description": "Establish natural buffer zones to absorb surge runoff, reducing flooding risks by up to 35%.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/wetland-restoration-09"
                },
                {
                    "title": "Industrial Stormwater Management Systems",
                    "category": "Engineering",
                    "description": "High-capacity drainage filters and detention ponds to protect asset assets from flash precipitation.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/stormwater-detention-12"
                }
            ],
            "drought": [
                {
                    "title": "Regenerative Agroforestry Schemes",
                    "category": "Agriculture",
                    "description": "Planting drought-resistant cover crops and tree grids to retain soil moisture and prevent desertification.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/agroforest-moisture-04"
                }
            ],
            "heat_stress": [
                {
                    "title": "Urban Canopies and Microclimate Coolers",
                    "category": "Adaptation",
                    "description": "Afforestation grids surrounding high-heat complexes to lower local temperatures by 2-3°C.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/microclimate-canopy-22"
                }
            ],
            "wildfire": [
                {
                    "title": "Vegetation Control & Firebreak Buffer Creation",
                    "category": "Land Management",
                    "description": "Proactive land clearing and fire retardant vegetation barriers around physical boundaries.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/firebreak-buffer-17"
                }
            ],
            "tropical_cyclones": [
                {
                    "title": "Mangrove Ecosystem Shield Program",
                    "category": "Ecosystem Protection",
                    "description": "Restore coastal mangrove strips to absorb high wind speeds and storm waves for seaside assets.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/mangrove-windshield-02"
                }
            ],
            "water_stress": [
                {
                    "title": "Corporate Greywater Recycling Project",
                    "category": "Water Resilience",
                    "description": "Closed-loop greywater purification infrastructure to lower freshwater dependency.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/greywater-closedloop-05"
                }
            ],
            "sea_level_rise": [
                {
                    "title": "Coastal Sea-Wall Protection Infrastructure",
                    "category": "Infrastructure",
                    "description": "Reinforce coastal physical structures and install tidal gates to secure logistics hubs against permanent rise.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/seawall-gate-11"
                }
            ],
            "ocean_changes": [
                {
                    "title": "Coral Reef Restoration & Artificial Reef Modules",
                    "category": "Marine Adaptation",
                    "description": "Encourage marine ecosystem growth to counteract ocean acidification impacts.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/marine-coralreef-08"
                }
            ],
            "biodiversity_shifts": [
                {
                    "title": "Native Species Bio-Corridor Implementation",
                    "category": "Ecosystem Preservation",
                    "description": "Establish contiguous biological corridors to support species migration and habitat integrity.",
                    "marketplace_url": "https://marketplace.pranaearth.com/projects/biodiverse-corridor-14"
                }
            ]
        }
        
        # Return matched recommendations
        recs = recommendations_db.get(top_param, recommendations_db["flood_extreme_rain"])
        # Add general mitigation carbon offset project recommendation
        recs.append({
            "title": "Afforestation Carbon Offsetting Scheme",
            "category": "Carbon Mitigation",
            "description": "Standardized carbon credits to offset residual emissions and align with net-zero roadmaps.",
            "marketplace_url": "https://marketplace.pranaearth.com/projects/carbon-offset-afforestation"
        })
        
        return recs

    def _fallback_risk_explanations(
        self, 
        asset_name: str, 
        asset_type: str, 
        address: str, 
        risk_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generates realistic and structured mock narratives for the climate dashboard report.
        """
        scenario = risk_data.get("scenario", "ssp245").upper()
        risk_proj = risk_data.get("risk_projections", {})
        
        # Calculate maximum risk for highlight in summary
        max_score = 0.0
        max_param = ""
        last_year = sorted(risk_proj.keys())[-1]
        
        for p, v in risk_proj[last_year].items():
            if v["score"] > max_score:
                max_score = v["score"]
                max_param = p.replace("_", " ").title()
        
        exec_sum = (
            f"Asset {asset_name} (a {asset_type.replace('_', ' ').title()}) situated at {address} "
            f"has been evaluated under the climate scenario {scenario}. Projections up to 2050 indicate "
            f"vulnerabilities driven primarily by {max_param} which registers a high risk score of {max_score} "
            f"by mid-century. Operational contingency plans should prioritize climate resilience retrofits."
        )

        param_explanations = {
            "flood_extreme_rain": (
                "Extreme precipitation trends indicate an increase in short-duration storm frequency. "
                "Flooding risk is elevated, threatening storm drainage capacities and low-level storage bays."
            ),
            "drought": (
                "Decreasing seasonal rainfall averages and elevated evapotranspiration suggest more persistent "
                "drought patterns. This could strain raw water reservoirs and escalate regional fire warnings."
            ),
            "heat_stress": (
                "Projected temperature increases show rising wet-bulb thresholds. Cooling energy demands are "
                "expected to spike, while operational capacity could be throttled during peak summer occurrences."
            ),
            "wildfire": (
                "Climatic fire weather indices indicate extended wildfire seasons. Assets in proximity to dry "
                "biomes or industrial zones face higher risk from smoke contamination and convective fire gusts."
            ),
            "tropical_cyclones": (
                "While cyclonic paths remain historically concentrated, modeling predicts a minor expansion of peak wind "
                "velocities, posing potential structural risks to cladding and roofing systems."
            ),
            "water_stress": (
                "Baseline water withdrawal vs renewable availability trends show increasing water scarcity. "
                "Water-dependent operations (e.g. data center liquid cooling) must explore closed-loop recycling."
            ),
            "sea_level_rise": (
                "Coastal baseline levels show progressive high-tide encroachments. Assets under low elevation "
                "zones may experience increased localized tidal flooding and saltwater intrusion."
            ),
            "ocean_changes": (
                "Ocean pH levels show structural acidification trends. Sea surface temperatures (SST) are "
                "projected to rise, affecting aquaculture yields and accelerating localized coral bleaching."
            ),
            "biodiversity_shifts": (
                "Local biomes indicate moderate transitions in species richness. Ecosystem services, such as soil "
                "stability and local hydrological filtration, may experience localized decline by 2050."
            )
        }
        
        return {
            "executive_summary": exec_sum,
            "parameter_explanations": param_explanations
        }
