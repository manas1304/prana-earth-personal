"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for Leaflet's default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationMapProps {
  lat: string | number;
  lng: string | number;
  onLocationSelect: (lat: string, lng: string) => void;
}

function ClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: string, lng: string) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    },
  });
  return null;
}

export default function LocationMap({
  lat,
  lng,
  onLocationSelect,
}: LocationMapProps) {
  const defaultCenter: [number, number] = [20.5937, 78.9629]; // Default to India
  const center: [number, number] =
    lat && lng ? [Number(lat), Number(lng)] : defaultCenter;

  return (
    <div className="h-48 w-full rounded-lg overflow-hidden border border-gray-200 relative z-0">
      <MapContainer center={center} zoom={4} className="h-full w-full">
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ClickHandler onLocationSelect={onLocationSelect} />
        {lat && lng && <Marker position={[Number(lat), Number(lng)]} />}
      </MapContainer>
    </div>
  );
}
