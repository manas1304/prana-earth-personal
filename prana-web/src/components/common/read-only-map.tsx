"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for Leaflet's default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface ReadOnlyMapProps {
  lat: string | number;
  lng: string | number;
}

export default function ReadOnlyMap({ lat, lng }: ReadOnlyMapProps) {
  // If coordinates are missing, gracefully fall back
  if (!lat || !lng) {
    return (
      <div className="h-64 w-full bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 text-sm">
        Location coordinates not provided
      </div>
    );
  }

  const position: [number, number] = [Number(lat), Number(lng)];

  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
      {/* Zoom level 12 is closer up since it's a specific project location */}
      <MapContainer center={position} zoom={12} className="h-full w-full">
        <TileLayer 
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap contributors & CARTO'
        />
        <Marker position={position} />
      </MapContainer>
    </div>
  );
}