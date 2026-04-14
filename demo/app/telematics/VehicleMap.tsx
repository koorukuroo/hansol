"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  running: { bg: "#22c55e", border: "#16a34a" },
  idle: { bg: "#9ca3af", border: "#6b7280" },
  warning: { bg: "#ef4444", border: "#dc2626" },
};

function createPinIcon(status: string) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.idle;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 34 C14 34 2 22 2 13 A12 12 0 1 1 26 13 C26 22 14 34 14 34Z"
            fill="${c.bg}" stroke="${c.border}" stroke-width="1.5"/>
      <circle cx="14" cy="13" r="4" fill="white" fill-opacity="0.8"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  });
}

interface VehicleMapProps {
  lat: number;
  lng: number;
  status: string;
}

export default function VehicleMap({ lat, lng, status }: VehicleMapProps) {
  const [icon, setIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    setIcon(createPinIcon(status));
  }, [status]);

  if (!icon) return null;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      <Marker position={[lat, lng]} icon={icon} />
    </MapContainer>
  );
}
