import os
import sys
import tempfile
import time
from datetime import datetime
import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt

# Add the workspace root to sys.path so we can import Predict package
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from Predict.ai_core.location import LocationService
from Predict.ai_core.climate_data import ClimateDataLoader
from Predict.ai_core.risk_calculator import ClimateRiskCalculator
from Predict.ai_core.esg_parser import ESGDocumentParser
from Predict.ai_core.gemini_explainer import GeminiExplainer
from Predict.ai_core.report_generator import ReportGenerator

# Page config & branding stylesheet
st.set_page_config(
    page_title="Prana Earth Predict Platform - AI Analysis UI",
    page_icon="🌍",
    layout="wide"
)

# Custom header CSS for premium look
st.markdown("""
<style>
    .main-title {
        color: #0f3d30;
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-weight: 800;
        font-size: 2.5rem;
        margin-bottom: 0px;
    }
    .subtitle {
        color: #d9822b;
        font-size: 1.1rem;
        margin-bottom: 25px;
        font-weight: 500;
    }
    .processing-card {
        background-color: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
    }
    .rec-card {
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #cbd5e0;
        background-color: #f8fafc;
        margin-bottom: 12px;
        transition: transform 0.2s;
    }
    .rec-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .rating-low {
        color: #2f855a;
        font-weight: bold;
    }
    .rating-med {
        color: #dd6b20;
        font-weight: bold;
    }
    .rating-high {
        color: #c53030;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

def run_assessment_pipeline(
    asset_name: str,
    asset_type: str,
    address: str,
    scenario: str,
    years: list,
    uploaded_pdf,
    uploaded_xlsx
) -> dict:
    """
    Executes the backend AI analysis pipeline step-by-step with visual feedback.
    """
    # 1. Initialize services
    location_service = LocationService()
    climate_loader = ClimateDataLoader()
    risk_calculator = ClimateRiskCalculator()
    esg_parser = ESGDocumentParser()
    
    api_key = os.environ.get("GEMINI_API_KEY")
    explainer = GeminiExplainer(api_key=api_key)
    
    workspace_dir = os.path.dirname(os.path.abspath(__file__))
    report_gen = ReportGenerator(output_dir=workspace_dir)
    
    # 2. Execution wizard UI steps
    status_cols = st.columns(4)
    
    # Step A: Location Geocoding
    with status_cols[0]:
        with st.spinner("📍 Geocoding Location..."):
            time.sleep(0.8) # Simulated speed for visual pacing
            loc_res = location_service.geocode_address(address)
            lat, lon = loc_res["latitude"], loc_res["longitude"]
            formatted_address = loc_res["formatted_address"]
            st.success("Resolved Address!")
            
    # Proximity Check (Mock database)
    existing_assets = [
        {"name": "Phoenix Logistics Hub", "latitude": 33.4484, "longitude": -112.0740},
        {"name": "Phoenix Data Center I", "latitude": 33.4542, "longitude": -111.9896},
        {"name": "London Office Campus", "latitude": 51.5074, "longitude": -0.1278}
    ]
    conflict = location_service.check_proximity_conflict((lat, lon), existing_assets, threshold_meters=5000)
    
    # Step B: Climate Models Querying
    with status_cols[1]:
        with st.spinner("🌍 Querying Climate Models..."):
            time.sleep(1.0)
            climate_res = climate_loader.query_point_climate_data(lat, lon, scenario, years=years)
            st.success("Climate Data Fetched!")
            
    # Step C: Risk Calculations & ESG Parsing
    with status_cols[2]:
        with st.spinner("📊 Calculating Risk Indices..."):
            time.sleep(0.8)
            risk_res = risk_calculator.calculate_asset_risks(asset_type, climate_res)
            
            # Parse uploaded ESG reports if provided
            esg_data = {"matched_contexts": {}}
            
            if uploaded_pdf:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(uploaded_pdf.read())
                    tmp_path = tmp.name
                try:
                    esg_data = esg_parser.parse_sustainability_report_pdf(tmp_path)
                finally:
                    os.remove(tmp_path)
                    
            elif uploaded_xlsx:
                with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
                    tmp.write(uploaded_xlsx.read())
                    tmp_path = tmp.name
                try:
                    esg_data = esg_parser.parse_brsr_disclosure_excel(tmp_path)
                finally:
                    os.remove(tmp_path)
                    
            st.success("Calculations Complete!")
            
    # Step D: Gemini Synthesis & PDF Report
    with status_cols[3]:
        with st.spinner("🤖 Triggering Gemini AI..."):
            time.sleep(1.2)
            explanations = explainer.generate_risk_explanations(asset_name, asset_type, formatted_address, risk_res)
            esg_alignment = explainer.generate_esg_alignment(risk_res, esg_data)
            marketplace_recs = explainer.generate_marketplace_recommendations(risk_res, asset_type)
            
            asset_info = {
                "name": asset_name,
                "type": asset_type,
                "address": formatted_address,
                "latitude": lat,
                "longitude": lon,
                "date": datetime.now().strftime("%Y-%m-%d %H:%M")
            }
            
            pdf_path = report_gen.compile_pdf_report(
                asset_info=asset_info,
                risk_data=risk_res,
                explanations=explanations,
                esg_alignment=esg_alignment,
                marketplace_recs=marketplace_recs,
                output_filename="downloaded_report.pdf"
            )
            st.success("Report PDF Generated!")

    return {
        "lat": lat,
        "lon": lon,
        "address": formatted_address,
        "conflict": conflict,
        "risk_res": risk_res,
        "explanations": explanations,
        "esg_alignment": esg_alignment,
        "marketplace_recs": marketplace_recs,
        "pdf_path": pdf_path
    }

# --- APPLICATION LAYOUT ---

st.markdown('<div class="main-title">🌍 Prana Earth Predict Platform</div>', unsafe_allow_html=True)
st.markdown('<div class="subtitle">AI-Driven Physical Climate Risk & ESG Analysis Playground</div>', unsafe_allow_html=True)

# 1. Inputs Sidebar
st.sidebar.header("Asset Details Input")
asset_name = st.sidebar.text_input("Asset Name", value="London Data Center III")
asset_type = st.sidebar.selectbox(
    "Asset Type",
    options=[
        "data_center",
        "manufacturing_unit",
        "warehouse",
        "agriculture_farmland",
        "commercial_building",
        "energy_power_infrastructure",
        "logistics_transportation_hub"
    ],
    format_func=lambda x: x.replace("_", " ").title()
)
address = st.sidebar.text_area("Address / Location", value="100 Cheapside, London, EC2V 6DT, UK")
scenario = st.sidebar.selectbox(
    "NGFS / SSP Climate Scenario",
    options=["Orderly", "Disorderly", "Hot House World"],
    index=2
)
years = st.sidebar.multiselect(
    "Timeline Projections",
    options=[2030, 2035, 2040, 2050],
    default=[2030, 2035, 2040, 2050]
)

st.sidebar.markdown("---")
st.sidebar.header("Corporate ESG Uploads (Optional)")
uploaded_pdf = st.sidebar.file_uploader("Upload Sustainability Report (PDF)", type=["pdf"])
uploaded_xlsx = st.sidebar.file_uploader("Upload BRSR Disclosures (Excel)", type=["xlsx"])

st.sidebar.markdown("---")
run_btn = st.sidebar.button("🚀 Start Assessment Pipeline", use_container_width=True)

# Main Area
if run_btn:
    if not address.strip():
        st.error("Please enter a valid asset location.")
    elif not years:
        st.error("Please select at least one projection timeline.")
    else:
        st.info(f"Running full assessment for '{asset_name}' under '{scenario}' scenario...")
        results = run_assessment_pipeline(
            asset_name=asset_name,
            asset_type=asset_type,
            address=address,
            scenario=scenario,
            years=years,
            uploaded_pdf=uploaded_pdf,
            uploaded_xlsx=uploaded_xlsx
        )
        st.session_state["assessment_results"] = results
        st.session_state["asset_name_state"] = asset_name
        st.session_state["asset_type_state"] = asset_type
        st.session_state["scenario_state"] = scenario

# Render Results from Session State
if "assessment_results" in st.session_state:
    res = st.session_state["assessment_results"]
    st.markdown("---")
    
    # 2. Executive summary & Downloads
    top_col1, top_col2 = st.columns([3, 1])
    with top_col1:
        st.subheader(f"Dashboard Overview: {st.session_state['asset_name_state']}")
        st.caption(f"Location: {res['address']} | Coordinates: {res['lat']}, {res['lon']}")
    with top_col2:
        # Provide direct PDF Download
        if os.path.exists(res["pdf_path"]):
            with open(res["pdf_path"], "rb") as f:
                pdf_bytes = f.read()
            st.download_button(
                label="📥 Download Printable PDF",
                data=pdf_bytes,
                file_name=f"{st.session_state['asset_name_state'].replace(' ', '_')}_Climate_Report.pdf",
                mime="application/pdf",
                use_container_width=True
            )

    # Proximity Alarm
    if res["conflict"]:
        st.warning(
            f"⚠️ **Location Overlap Detected**: This asset lies in the same premises/vicinity as "
            f"**{res['conflict']['name']}** (Distance Conflict < 5km). Projections mapped reflect this premises."
        )

    # 3. Location preview and Executive Summary Column Split
    col_map, col_exec = st.columns([1, 2])
    with col_map:
        st.markdown("**Validated Coordinates Map**")
        map_df = pd.DataFrame({"lat": [res["lat"]], "lon": [res["lon"]]})
        st.map(map_df, zoom=12)
    with col_exec:
        st.markdown("**AI Executive Summary**")
        st.info(res["explanations"]["executive_summary"])

    # 4. Projections & Metrics Table Section
    st.markdown("### Projected Climate Vulnerability Matrix")
    
    # Generate HTML Table for premium color-coded cells
    risk_proj = res["risk_res"]["risk_projections"]
    proj_years = sorted(risk_proj.keys())
    param_keys = list(risk_proj[proj_years[0]].keys())
    
    html_table = "<table style='width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;'>"
    # Header Row
    html_table += "<tr style='background-color: #0f3d30; color: white; border-bottom: 2px solid #cbd5e0;'>"
    html_table += "<th style='padding: 10px; text-align: left;'>Risk Parameter</th>"
    for y in proj_years:
        html_table += f"<th style='padding: 10px; text-align: center;'>Year {y}</th>"
    html_table += "</tr>"
    
    # Rows
    for pk in param_keys:
        html_table += "<tr style='border-bottom: 1px solid #e2e8f0;'>"
        html_table += f"<td style='padding: 10px; font-weight: bold;'>{pk.replace('_', ' ').title()}</td>"
        for y in proj_years:
            val = risk_proj[y][pk]
            score = val["score"]
            rating = val["rating"]
            
            # Color coding rating
            if rating == "High":
                color_css = "background-color: #ffe6e6; color: #c53030;"
            elif rating == "Medium":
                color_css = "background-color: #fff0e6; color: #dd6b20;"
            else:
                color_css = "background-color: #eafaf1; color: #2f855a;"
                
            html_table += f"<td style='padding: 10px; text-align: center; font-weight: bold; {color_css}'>{score} ({rating})</td>"
        html_table += "</tr>"
    html_table += "</table>"
    
    st.markdown(html_table, unsafe_allow_html=True)
    st.markdown("")

    # 5. Charts & Parameter Narratives
    col_chart, col_narrative = st.columns([1, 1])
    with col_chart:
        st.markdown("**Trajectory Trends Graph**")
        # Read risk trends file or generate directly to ensure fresh state
        chart_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "risk_trends.png")
        if os.path.exists(chart_file):
            st.image(chart_file, use_container_width=True)
        else:
            st.caption("Graph visualization loading...")
            
    with col_narrative:
        st.markdown("**Vulnerability Driver Explanations**")
        # Accordions for parameters
        for pk in param_keys:
            p_title = pk.replace("_", " ").title()
            final_val = risk_proj[proj_years[-1]][pk]
            rating_text = final_val["rating"]
            
            if rating_text == "High":
                rating_badge = f"<span class='rating-high'>{rating_text}</span>"
            elif rating_text == "Medium":
                rating_badge = f"<span class='rating-med'>{rating_text}</span>"
            else:
                rating_badge = f"<span class='rating-low'>{rating_text}</span>"
                
            with st.expander(f"{p_title} (2050 Risk Level: {rating_text})"):
                st.markdown(f"**Vulnerability Analysis:** {res['explanations']['parameter_explanations'][pk]}")
                st.markdown(f"**Risk Rating:** {rating_badge}", unsafe_allow_html=True)

    # 6. ESG & Marketplace recommendations
    st.markdown("### ESG Strategy & Adaptation Alignment")
    col_esg, col_market = st.columns([1, 1])
    
    with col_esg:
        st.markdown("**Sustainability Report Alignment**")
        st.markdown(f"**Alignment Context:** {res['esg_alignment']['alignment_summary']}")
        
        st.markdown("**Identified Gaps:**")
        for gap in res["esg_alignment"]["gaps_identified"]:
            st.markdown(f"- 🔴 {gap}")
            
        st.markdown("**Strategic Recommendations:**")
        for rec in res["esg_alignment"]["strategic_recommendations"]:
            st.markdown(f"- 🛠️ {rec}")
            
    with col_market:
        st.markdown("**Marketplace Adaptation Options (marketplace.pranaearth.com)**")
        for rec in res["marketplace_recs"]:
            st.markdown(f"""
            <div class='rec-card'>
                <span style='font-size: 12px; font-weight: bold; color: #0f3d30; text-transform: uppercase;'>{rec['category']}</span>
                <h5 style='margin: 4px 0 8px 0; color: #d9822b; font-size: 16px;'>{rec['title']}</h5>
                <p style='font-size: 13px; color: #4a5568; margin-bottom: 10px; line-height: 1.4;'>{rec['description']}</p>
                <a href='{rec['marketplace_url']}' target='_blank' style='text-decoration: none; color: #0066cc; font-weight: bold; font-size: 13px;'>Explore adaptation project →</a>
            </div>
            """, unsafe_allow_html=True)
else:
    # Initial state screen layout
    st.info("👈 Please configure the asset parameters in the sidebar panel and click 'Start Assessment Pipeline' to see results.")
