import unittest
import os
from Predict.ai_core.location import LocationService
from Predict.ai_core.climate_data import ClimateDataLoader
from Predict.ai_core.risk_calculator import ClimateRiskCalculator
from Predict.ai_core.esg_parser import ESGDocumentParser
from Predict.ai_core.gemini_explainer import GeminiExplainer

class TestPredictAICore(unittest.TestCase):
    def setUp(self):
        self.location_service = LocationService()
        self.climate_loader = ClimateDataLoader()
        self.risk_calculator = ClimateRiskCalculator()
        self.esg_parser = ESGDocumentParser()
        # Initializing without active key to test fallback robustness
        self.explainer = GeminiExplainer(api_key=None)

    def test_geocoding_fallback(self):
        res = self.location_service.geocode_address("123 Test St, Bangalore")
        self.assertIn("latitude", res)
        self.assertIn("longitude", res)
        self.assertIn("formatted_address", res)
        self.assertEqual(res["raw"].get("status"), "fallback")

    def test_proximity_conflict(self):
        existing = [{"latitude": 12.9716, "longitude": 77.5946, "name": "Asset A"}]
        # Coordinates very close to existing asset
        conflict = self.location_service.check_proximity_conflict(
            (12.9718, 77.5948), existing, threshold_meters=100.0
        )
        self.assertIsNotNone(conflict)
        self.assertEqual(conflict["name"], "Asset A")

        # Coordinates far from existing asset
        no_conflict = self.location_service.check_proximity_conflict(
            (13.5000, 78.5000), existing, threshold_meters=100.0
        )
        self.assertIsNone(no_conflict)

    def test_climate_loader_mapping(self):
        self.assertEqual(self.climate_loader.get_ssp_scenario("Orderly"), "ssp126")
        self.assertEqual(self.climate_loader.get_ssp_scenario("Disorderly"), "ssp245")
        self.assertEqual(self.climate_loader.get_ssp_scenario("Hot House World"), "ssp585")
        self.assertEqual(self.climate_loader.get_ssp_scenario("unknown"), "ssp245") # Default fallback

    def test_climate_loader_simulation(self):
        data = self.climate_loader.query_point_climate_data(12.9716, 77.5946, "ssp585")
        self.assertEqual(data["source"], "simulated")
        self.assertEqual(data["scenario"], "ssp585")
        self.assertIn(2030, data["projections"])
        self.assertIn("temperature", data["projections"][2030])

    def test_risk_calculation(self):
        climate_data = self.climate_loader.query_point_climate_data(12.9716, 77.5946, "ssp245")
        risks = self.risk_calculator.calculate_asset_risks("data_center", climate_data)
        self.assertEqual(risks["scenario"], "ssp245")
        self.assertIn(2050, risks["risk_projections"])
        
        # Verify the 9 parameters are present
        p_keys = [
            "flood_extreme_rain", "drought", "heat_stress", "wildfire", 
            "tropical_cyclones", "water_stress", "sea_level_rise", 
            "ocean_changes", "biodiversity_shifts"
        ]
        for p in p_keys:
            self.assertIn(p, risks["risk_projections"][2050])
            score = risks["risk_projections"][2050][p]["score"]
            rating = risks["risk_projections"][2050][p]["rating"]
            self.assertTrue(0.0 <= score <= 100.0)
            self.assertIn(rating, ["Low", "Medium", "High"])

    def test_esg_parser_missing_file(self):
        res_pdf = self.esg_parser.parse_sustainability_report_pdf("nonexistent.pdf")
        self.assertIn("Error", res_pdf["summary"])
        res_xlsx = self.esg_parser.parse_brsr_disclosure_excel("nonexistent.xlsx")
        self.assertIn("Error", res_xlsx["summary"])

    def test_gemini_explainer_fallback(self):
        climate_data = self.climate_loader.query_point_climate_data(12.9716, 77.5946, "ssp245")
        risks = self.risk_calculator.calculate_asset_risks("data_center", climate_data)
        res = self.explainer.generate_risk_explanations("Test Asset", "data_center", "Bangalore", risks)
        self.assertIn("executive_summary", res)
        self.assertIn("parameter_explanations", res)
        self.assertEqual(len(res["parameter_explanations"]), 9)

if __name__ == "__main__":
    unittest.main()
