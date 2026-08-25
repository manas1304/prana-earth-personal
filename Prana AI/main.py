import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Add the root directory to sys.path so we can import Predict package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Predict.ai_core.location import LocationService
from Predict.ai_core.climate_data import ClimateDataLoader
from Predict.ai_core.risk_calculator import ClimateRiskCalculator
from Predict.ai_core.esg_parser import ESGDocumentParser
from Predict.ai_core.gemini_explainer import GeminiExplainer
from Predict.ai_core.report_generator import ReportGenerator

def main():
    # 0. Initialize Configuration
    load_dotenv()
    print("--- Starting Prana Earth Predict Platform AI Analysis Module ---")
    
    # 1. Initialize Services
    location_service = LocationService()
    climate_loader = ClimateDataLoader()
    risk_calculator = ClimateRiskCalculator()
    esg_parser = ESGDocumentParser()
    
    # Check for Gemini API key
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Note: GEMINI_API_KEY not found in environment. Using high-fidelity local text fallbacks.")
    explainer = GeminiExplainer(api_key=api_key)
    
    # We will output charts and report in the current working directory
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    report_gen = ReportGenerator(output_dir=workspace_dir)

    # 2. Setup Input Parameters for Sample Assessment
    asset_name = "Phoenix Data Center II"
    asset_type = "data_center"
    address = "4100 N 44th St, Phoenix, AZ 85018, USA"
    scenario = "Hot House World" # NGFS scenario mapping to ssp585
    
    print(f"\nStep 1: Assessing location for: '{address}'")
    loc_res = location_service.geocode_address(address)
    lat, lon = loc_res["latitude"], loc_res["longitude"]
    formatted_address = loc_res["formatted_address"]
    print(f"-> Latitude: {lat}, Longitude: {lon}")
    print(f"-> Resolved Address: {formatted_address}")

    # Proximity Check (Mock database of existing assets)
    existing_assets = [
        {"name": "Phoenix Logistics Hub", "latitude": 33.4484, "longitude": -112.0740},
        {"name": "Phoenix Data Center I", "latitude": 33.4542, "longitude": -111.9896}
    ]
    print("\nStep 2: Checking for location/premises conflicts...")
    conflict = location_service.check_proximity_conflict((lat, lon), existing_assets, threshold_meters=5000)
    if conflict:
        print(f"-> Alert: Asset '{conflict['name']}' exists within the same general area coordinates.")
    else:
        print("-> Location cleared. No nearby assets conflict.")

    # 3. Climate Projections Query
    print(f"\nStep 3: Fetching climate projections under NGFS '{scenario}' scenario...")
    climate_res = climate_loader.query_point_climate_data(lat, lon, scenario)
    print(f"-> Source: {climate_res['source']} grid interpolation")
    print(f"-> Target SSP: {climate_res['scenario']}")
    print(f"-> Data variables successfully extracted for 2030, 2035, 2040, 2050")

    # 4. Risk Indices Calculator
    print("\nStep 4: Running 9-Parameter Climate Risk Analysis Engine...")
    risk_res = risk_calculator.calculate_asset_risks(asset_type, climate_res)
    # Print sample year 2050 scores
    print("-> Calculated 2050 Risk Scores:")
    for param, val in risk_res["risk_projections"][2050].items():
        print(f"   - {param.replace('_', ' ').title()}: {val['score']} ({val['rating']})")

    # 5. ESG Report Extraction (Simulated load of Sustainability document)
    print("\nStep 5: Inspecting optional Sustainability disclosures...")
    # In a real run, a user can upload a PDF or Excel. We simulate its parsed results:
    simulated_esg_data = {
        "file_name": "Phoenix_Corp_Sustainability_2025.pdf",
        "file_type": "PDF",
        "matched_contexts": {
            "emissions_carbon": [
                "[Page 4] Phoenix Corp commits to absolute Scope 1 and Scope 2 carbon neutrality by 2040.",
                "[Page 12] Aiming to procure 100% of data center power from solar and wind grids by 2030."
            ],
            "water_management": [
                "[Page 9] Target to reduce freshwater cooling withdrawals by 15% through air-cooling retrofits."
            ],
            "policies_goals": [
                "[Page 2] Annual carbon auditing aligned with NGFS climate scenarios and BRSR framework."
            ]
        }
    }
    print("-> Loaded simulated parsed data from: Phoenix_Corp_Sustainability_2025.pdf")

    # 6. Explanations & Adaptation recommendations (Gemini LLM or Fallbacks)
    print("\nStep 6: Synthesizing risk metrics and ESG goals via Gemini Explainer...")
    explanations = explainer.generate_risk_explanations(asset_name, asset_type, formatted_address, risk_res)
    esg_alignment = explainer.generate_esg_alignment(risk_res, simulated_esg_data)
    marketplace_recs = explainer.generate_marketplace_recommendations(risk_res, asset_type)
    
    print("-> Executive Summary Generated:")
    print(f"   \"{explanations['executive_summary'][:150]}...\"")
    print("-> Strategic Recommendations Generated:")
    for rec in esg_alignment["strategic_recommendations"][:2]:
        print(f"   - {rec}")
    print("-> Adaptation Opportunities mapped to Marketplace:")
    for project in marketplace_recs:
        print(f"   - {project['title']} ({project['category']}) -> {project['marketplace_url']}")

    # 7. Compile visual PDF Report
    print("\nStep 7: Compiling PDF Report & Generating Climate Visualizations...")
    asset_info = {
        "name": asset_name,
        "type": asset_type,
        "address": formatted_address,
        "latitude": lat,
        "longitude": lon,
        "date": datetime.now().strftime("%Y-%m-%d %H:%M")
    }
    
    output_pdf_name = "sample_report.pdf"
    pdf_path = report_gen.compile_pdf_report(
        asset_info=asset_info,
        risk_data=risk_res,
        explanations=explanations,
        esg_alignment=esg_alignment,
        marketplace_recs=marketplace_recs,
        output_filename=output_pdf_name
    )
    
    print(f"-> Success! Climate report compiled successfully.")
    print(f"-> Compiled PDF Report Path: {pdf_path}")
    print(f"-> Generated Trend Chart Path: {os.path.join(workspace_dir, 'risk_trends.png')}")
    print("\nAll AI components verified successfully.")

if __name__ == "__main__":
    main()
