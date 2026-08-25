import re
from typing import Dict, Any, List, Tuple, Optional
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderServiceError
from shapely.geometry import Point

class LocationService:
    """
    Handles asset geocoding and location validation (coordinate translation and overlap checking).
    """
    def __init__(self, user_agent: str = "prana_earth_predict_platform"):
        self.geolocator = Nominatim(user_agent=user_agent)

    def geocode_address(self, address: str) -> Dict[str, Any]:
        """
        Geocodes an address string to latitude and longitude.
        Provides a stable fallback matching mock coordinates if geocoding fails or runs offline.
        """
        if not address or not address.strip():
            raise ValueError("Address cannot be empty")
        
        # Check if address already looks like "latitude, longitude"
        coord_match = re.match(r'^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$', address)
        if coord_match:
            lat, lon = float(coord_match.group(1)), float(coord_match.group(2))
            return {
                "latitude": lat,
                "longitude": lon,
                "formatted_address": f"Coordinates: {lat}, {lon}",
                "raw": {}
            }

        try:
            location = self.geolocator.geocode(address, timeout=10)
            if location:
                return {
                    "latitude": location.latitude,
                    "longitude": location.longitude,
                    "formatted_address": location.address,
                    "raw": location.raw
                }
        except GeocoderServiceError:
            # Geocoding service error - fall through to mock fallback
            pass
        
        # Stable mock fallback based on the address string hash to ensure repeatable mock assessments
        addr_hash = sum(ord(c) for c in address)
        # Shift slightly around default Coordinates (e.g. London area or Bangalore area)
        mock_lat = 12.9716 + (addr_hash % 100) * 0.001
        mock_lon = 77.5946 + (addr_hash % 200) * 0.001
        
        return {
            "latitude": round(mock_lat, 6),
            "longitude": round(mock_lon, 6),
            "formatted_address": f"{address.strip()} (Simulated Location)",
            "raw": {"status": "fallback"}
        }

    def check_proximity_conflict(
        self, 
        target_coords: Tuple[float, float], 
        existing_assets: List[Dict[str, Any]], 
        threshold_meters: float = 100.0
    ) -> Optional[Dict[str, Any]]:
        """
        Verifies if target coordinates overlap or lie within proximity (threshold_meters)
        of existing assets to warn the user or handle overlap.
        """
        target_point = Point(target_coords[1], target_coords[0]) # Point(lon, lat)
        
        # Approximate conversion: 1 degree latitude is approx 111,320 meters
        threshold_degrees = threshold_meters / 111320.0
        
        for asset in existing_assets:
            lat = asset.get("latitude")
            lon = asset.get("longitude")
            if lat is None or lon is None:
                continue
            
            asset_point = Point(lon, lat)
            if target_point.distance(asset_point) <= threshold_degrees:
                return asset
        return None
