from typing import Dict, Any, List

class ClimateRiskCalculator:
    """
    Computes normalized (0-100) risk scores for 9 climate risk parameters
    based on raw environmental data and asset-type sensitivity matrices.
    """
    def __init__(self):
        # Asset type sensitivity multipliers for various risk indices.
        # Format: {asset_type: {parameter: multiplier}}
        self.asset_sensitivities = {
            "data_center": {
                "flood": 1.40,
                "drought": 0.60,
                "heat_stress": 1.45,
                "wildfire": 0.90,
                "cyclones": 1.15,
                "water_stress": 1.35, # direct impact on cooling systems
                "sea_level_rise": 1.00,
                "ocean_changes": 0.50,
                "biodiversity": 0.50
            },
            "manufacturing_unit": {
                "flood": 1.25,
                "drought": 0.90,
                "heat_stress": 1.15,
                "wildfire": 1.10,
                "cyclones": 1.20,
                "water_stress": 1.25,
                "sea_level_rise": 1.10,
                "ocean_changes": 0.70,
                "biodiversity": 0.70
            },
            "warehouse": {
                "flood": 1.30,
                "drought": 0.70,
                "heat_stress": 1.10,
                "wildfire": 1.20,
                "cyclones": 1.15,
                "water_stress": 0.80,
                "sea_level_rise": 1.10,
                "ocean_changes": 0.60,
                "biodiversity": 0.60
            },
            "agriculture_farmland": {
                "flood": 1.10,
                "drought": 1.50,
                "heat_stress": 1.30,
                "wildfire": 1.40,
                "cyclones": 1.25,
                "water_stress": 1.45,
                "sea_level_rise": 0.85,
                "ocean_changes": 1.30, # aquaculture / coastal runoff
                "biodiversity": 1.45
            },
            "commercial_building": {
                "flood": 1.15,
                "drought": 0.80,
                "heat_stress": 1.00,
                "wildfire": 1.00,
                "cyclones": 1.10,
                "water_stress": 1.00,
                "sea_level_rise": 1.00,
                "ocean_changes": 0.80,
                "biodiversity": 0.80
            },
            "energy_power_infrastructure": {
                "flood": 1.35,
                "drought": 1.20,
                "heat_stress": 1.25,
                "wildfire": 1.30,
                "cyclones": 1.35,
                "water_stress": 1.20,
                "sea_level_rise": 1.20,
                "ocean_changes": 0.90,
                "biodiversity": 0.90
            },
            "logistics_transportation_hub": {
                "flood": 1.30,
                "drought": 0.80,
                "heat_stress": 1.00,
                "wildfire": 1.10,
                "cyclones": 1.30,
                "water_stress": 0.90,
                "sea_level_rise": 1.25, # Ports / low elevation
                "ocean_changes": 0.90,
                "biodiversity": 0.70
            }
        }
        self.default_sensitivity = {
            "flood": 1.0,
            "drought": 1.0,
            "heat_stress": 1.0,
            "wildfire": 1.0,
            "cyclones": 1.0,
            "water_stress": 1.0,
            "sea_level_rise": 1.0,
            "ocean_changes": 1.0,
            "biodiversity": 1.0
        }

    def get_sensitivity_multipliers(self, asset_type: str) -> Dict[str, float]:
        """
        Retrieves the parameter vulnerability multipliers for a given asset type.
        """
        clean_type = asset_type.strip().lower().replace(" ", "_").replace("/", "_")
        return self.asset_sensitivities.get(clean_type, self.default_sensitivity)

    def classify_risk(self, score: float) -> str:
        """
        Classifies risk scores into qualitative bins.
        """
        if score <= 35.0:
            return "Low"
        elif score <= 70.0:
            return "Medium"
        else:
            return "High"

    def calculate_asset_risks(self, asset_type: str, climate_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes 9-parameter risk scores across all projected years.
        
        Input climate_data schema:
        {
            "source": str,
            "scenario": str,
            "projections": {
                year (int): {
                    "temperature": float,
                    ...
                }
            }
        }
        """
        multipliers = self.get_sensitivity_multipliers(asset_type)
        projections = climate_data.get("projections", {})
        
        risk_results = {}
        
        for year, vars_in in projections.items():
            temp = vars_in.get("temperature", 20.0)
            precip = vars_in.get("precipitation", 1000.0)
            ext_rain = vars_in.get("extreme_rain_max", 50.0)
            wind = vars_in.get("wind_speed", 5.0)
            w_stress = vars_in.get("water_stress_index", 2.0)
            slr = vars_in.get("sea_level_rise", 0.0)
            ph = vars_in.get("ocean_ph", 8.1)
            sst = vars_in.get("ocean_sst", 20.0)
            bio_loss = vars_in.get("biodiversity_loss_index", 0.1)
            
            # --- Formula Computations (Normalized 0 to 100) ---
            
            # 1. Flood / Extreme Rain
            flood_raw = (ext_rain - 15) * 1.6 + (precip / 1200.0) * 15.0
            flood_score = min(100.0, max(0.0, flood_raw * multipliers["flood"]))
            
            # 2. Drought
            drought_raw = 100.0 - (precip / 15.0) + (temp - 18.0) * 2.2
            drought_score = min(100.0, max(0.0, drought_raw * multipliers["drought"]))
            
            # 3. Heat Stress
            heat_raw = (temp - 12) * 3.8
            heat_score = min(100.0, max(0.0, heat_raw * multipliers["heat_stress"]))
            
            # 4. Wildfire
            wildfire_raw = (temp * 1.8) - (precip / 150.0) * 1.8 + (wind * 2.5)
            wildfire_score = min(100.0, max(0.0, wildfire_raw * multipliers["wildfire"]))
            
            # 5. Tropical Cyclones
            cyclones_raw = (wind - 4.2) * 14.5
            cyclones_score = min(100.0, max(0.0, cyclones_raw * multipliers["cyclones"]))
            
            # 6. Water Stress
            water_stress_score = min(100.0, max(0.0, (w_stress * 20.0) * multipliers["water_stress"]))
            
            # 7. Sea Level Rise
            slr_score = min(100.0, max(0.0, (slr * 100.0) * multipliers["sea_level_rise"]))
            
            # 8. Ocean Changes (pH drop + SST rise)
            ocean_raw = (8.15 - ph) * 320.0 + (sst - 18.0) * 2.5
            ocean_score = min(100.0, max(0.0, ocean_raw * multipliers["ocean_changes"]))
            
            # 9. Biodiversity Shifts
            bio_score = min(100.0, max(0.0, (bio_loss * 100.0) * multipliers["biodiversity"]))
            
            # Rounding and mapping qualitative scales
            risk_results[int(year)] = {
                "flood_extreme_rain": {
                    "score": round(flood_score, 1),
                    "rating": self.classify_risk(flood_score)
                },
                "drought": {
                    "score": round(drought_score, 1),
                    "rating": self.classify_risk(drought_score)
                },
                "heat_stress": {
                    "score": round(heat_score, 1),
                    "rating": self.classify_risk(heat_score)
                },
                "wildfire": {
                    "score": round(wildfire_score, 1),
                    "rating": self.classify_risk(wildfire_score)
                },
                "tropical_cyclones": {
                    "score": round(cyclones_score, 1),
                    "rating": self.classify_risk(cyclones_score)
                },
                "water_stress": {
                    "score": round(water_stress_score, 1),
                    "rating": self.classify_risk(water_stress_score)
                },
                "sea_level_rise": {
                    "score": round(slr_score, 1),
                    "rating": self.classify_risk(slr_score)
                },
                "ocean_changes": {
                    "score": round(ocean_score, 1),
                    "rating": self.classify_risk(ocean_score)
                },
                "biodiversity_shifts": {
                    "score": round(bio_score, 1),
                    "rating": self.classify_risk(bio_score)
                }
            }
            
        return {
            "asset_type": asset_type,
            "scenario": climate_data.get("scenario", "ssp245"),
            "risk_projections": risk_results
        }
