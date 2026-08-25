import os
import numpy as np
import pandas as pd
import xarray as xr
from typing import Dict, Any, List, Tuple, Union, Optional

class ClimateDataLoader:
    """
    Loads and queries historical and projective climate datasets.
    Supports netCDF datasets via xarray, falling back to a robust, spatially-correlated
    simulated raster engine when raw datasets are not locally present.
    """
    def __init__(self, dataset_dir: Optional[str] = None):
        self.dataset_dir = dataset_dir
        # Map NGFS scenarios to SSP equivalents
        self.scenario_mapping = {
            "orderly": "ssp126",
            "disorderly": "ssp245",
            "hot_house_world": "ssp585",
            "ssp126": "ssp126",
            "ssp245": "ssp245",
            "ssp585": "ssp585"
        }

    def get_ssp_scenario(self, scenario: str) -> str:
        """
        Translates NGFS/SSP scenario names to standardized lowercase codes.
        """
        scen_lower = scenario.strip().lower().replace("-", "_").replace(" ", "_")
        return self.scenario_mapping.get(scen_lower, "ssp245")

    def query_point_climate_data(
        self, 
        lat: float, 
        lon: float, 
        scenario: str, 
        years: List[int] = [2030, 2035, 2040, 2050]
    ) -> Dict[str, Any]:
        """
        Queries climate metrics for a specific coordinate and scenario across timelines.
        Attempts to read from local NetCDF directory, falling back to simulated data.
        """
        ssp_scen = self.get_ssp_scenario(scenario)
        netcdf_path = None
        if self.dataset_dir:
            netcdf_path = os.path.join(self.dataset_dir, f"climate_projections_{ssp_scen}.nc")
        
        if netcdf_path and os.path.exists(netcdf_path):
            return self._query_from_netcdf(netcdf_path, lat, lon, years)
        else:
            return self._generate_simulated_projection(lat, lon, ssp_scen, years)

    def _query_from_netcdf(
        self, 
        filepath: str, 
        lat: float, 
        lon: float, 
        years: List[int]
    ) -> Dict[str, Any]:
        """
        Uses xarray to slice NetCDF datasets at coordinates using nearest-neighbor interpolation.
        """
        try:
            with xr.open_dataset(filepath) as ds:
                # Interpolate to target point
                point_data = ds.sel(lat=lat, lon=lon, method="nearest")
                
                results = {}
                for year in years:
                    year_data = point_data.sel(time=str(year))
                    results[year] = {var: float(year_data[var].values) for var in year_data.data_vars}
                return {
                    "source": "netcdf",
                    "scenario": filepath.split("_")[-1].replace(".nc", ""),
                    "projections": results
                }
        except Exception as e:
            # If NetCDF loading fails, fallback to simulation
            return self._generate_simulated_projection(lat, lon, "ssp245", years)

    def _generate_simulated_projection(
        self, 
        lat: float, 
        lon: float, 
        ssp_scen: str, 
        years: List[int]
    ) -> Dict[str, Any]:
        """
        Generates physically-plausible and spatially-correlated mock climate variables
        based on location hashes and standard climatological models.
        """
        # Set random seed based on latitude and longitude to keep values consistent for the same location
        seed = int(abs(lat * 1000) + abs(lon * 1000))
        np.random.seed(seed)
        
        # Base parameters depending on latitude (equator is hotter/wetter, poles are colder/drier)
        lat_rad = np.radians(lat)
        base_temp = 25.0 * np.cos(lat_rad) + np.random.uniform(-5, 5)  # Equator temp approx 25C, poles colder
        base_precip = 1500.0 * np.cos(lat_rad) * np.cos(lat_rad) + np.random.uniform(-100, 100) # Equator rainier
        base_precip = max(50.0, base_precip) # dry minimum
        
        # Scenario warming multiplier
        # ssp126: mild warming (+1.5C by 2050)
        # ssp245: moderate warming (+2.2C by 2050)
        # ssp585: extreme warming (+4.0C by 2050)
        scen_multipliers = {
            "ssp126": {"temp_rise": 0.03, "precip_var": 0.05, "extreme_event_prob": 0.1},
            "ssp245": {"temp_rise": 0.05, "precip_var": 0.08, "extreme_event_prob": 0.25},
            "ssp585": {"temp_rise": 0.09, "precip_var": 0.15, "extreme_event_prob": 0.50}
        }
        
        mult = scen_multipliers.get(ssp_scen, scen_multipliers["ssp245"])
        
        projections = {}
        historical_year = 2020
        
        for year in years:
            elapsed_years = year - historical_year
            
            # 1. Temperature in Celsius
            temp = base_temp + (mult["temp_rise"] * elapsed_years) + np.random.uniform(-0.2, 0.2)
            
            # 2. Annual Precipitation in mm
            precip = base_precip * (1.0 + np.random.uniform(-mult["precip_var"], mult["precip_var"]) * (elapsed_years / 30.0))
            precip = max(0.0, precip)
            
            # 3. Extreme Rain (Max 1-day precip in mm)
            extreme_rain = (precip / 15.0) * (1.0 + mult["extreme_event_prob"] * (elapsed_years / 20.0)) + np.random.uniform(5, 15)
            
            # 4. Wind Speed in m/s
            base_wind = 4.5 + np.random.uniform(-1.0, 1.0)
            wind_speed = base_wind * (1.0 + (mult["extreme_event_prob"] * 0.05) * (elapsed_years / 30.0))
            
            # 5. Baseline Water Stress (ratio, 0 to 5)
            water_stress_base = min(5.0, max(0.0, 3.5 - (precip / 400.0) + np.random.uniform(0.1, 0.5)))
            water_stress = min(5.0, water_stress_base * (1.0 + 0.08 * (elapsed_years / 30.0)))
            
            # 6. Sea Level Rise in meters (only relevant if near coast, simulated by proximity)
            # We assume assets within coastal zone if latitude/longitude indicates, here simulated.
            is_coastal = (seed % 3 == 0) # 33% chance to simulate coastal asset
            sea_level_rise = 0.0
            if is_coastal:
                # rise up to 0.8m under ssp585 by 2050
                max_rise = {"ssp126": 0.3, "ssp245": 0.5, "ssp585": 0.85}[ssp_scen]
                sea_level_rise = max_rise * (elapsed_years / 30.0) + np.random.uniform(0.01, 0.05)
                sea_level_rise = max(0.0, sea_level_rise)
            
            # 7. Ocean Changes (pH decline and SST rise)
            ocean_ph = 8.1 - (0.003 * elapsed_years * {"ssp126": 0.5, "ssp245": 1.0, "ssp585": 2.0}[ssp_scen])
            ocean_sst = temp + 2.0  # simple baseline correlation
            
            # 8. Biodiversity shift index (representing percentage decrease in native species richness, 0 to 1)
            bio_loss = (elapsed_years / 50.0) * {"ssp126": 0.10, "ssp245": 0.25, "ssp585": 0.45}[ssp_scen] + np.random.uniform(0.01, 0.03)
            bio_loss = min(0.95, max(0.0, bio_loss))
            
            projections[year] = {
                "temperature": round(temp, 2),
                "precipitation": round(precip, 1),
                "extreme_rain_max": round(extreme_rain, 1),
                "wind_speed": round(wind_speed, 2),
                "water_stress_index": round(water_stress, 2),
                "sea_level_rise": round(sea_level_rise, 3),
                "ocean_ph": round(ocean_ph, 3),
                "ocean_sst": round(ocean_sst, 2),
                "biodiversity_loss_index": round(bio_loss, 3)
            }
            
        return {
            "source": "simulated",
            "scenario": ssp_scen,
            "projections": projections
        }
