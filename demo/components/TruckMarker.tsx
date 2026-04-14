"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import type { Vehicle } from "@/lib/data";

const STATUS_CONFIG: Record<string, { bg: string; border: string; pulse: boolean }> = {
  running: { bg: "#22c55e", border: "#16a34a", pulse: true },
  idle: { bg: "#9ca3af", border: "#6b7280", pulse: false },
  warning: { bg: "#ef4444", border: "#dc2626", pulse: true },
};

function createTruckIcon(status: string) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
      <!-- drop shadow -->
      <defs>
        <filter id="s-${status}" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <!-- pin body -->
      <path d="M20 46 C20 46 4 30 4 18 A16 16 0 1 1 36 18 C36 30 20 46 20 46Z"
            fill="${config.bg}" stroke="${config.border}" stroke-width="1.5"
            filter="url(#s-${status})"/>
      <!-- truck icon (white) -->
      <g transform="translate(10, 8)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <!-- cargo body -->
        <rect x="0" y="3" width="12" height="10" rx="1.5" fill="white" fill-opacity="0.3"/>
        <!-- cabin -->
        <path d="M12 7 L17 7 L19 10.5 L19 13 L12 13 Z" fill="white" fill-opacity="0.3"/>
        <!-- bottom line -->
        <line x1="0" y1="13" x2="19" y2="13"/>
        <!-- wheels -->
        <circle cx="4.5" cy="15.5" r="2" fill="white" fill-opacity="0.5" stroke="white"/>
        <circle cx="15.5" cy="15.5" r="2" fill="white" fill-opacity="0.5" stroke="white"/>
        <!-- windshield -->
        <line x1="14" y1="8" x2="17.5" y2="8"/>
      </g>
    </svg>`;

  return L.divIcon({
    html: `<div class="truck-marker ${config.pulse ? "truck-pulse" : ""}">${svg}</div>`,
    className: "",
    iconSize: [40, 48],
    iconAnchor: [20, 46],
    popupAnchor: [0, -42],
  });
}

export default function TruckMarker({ vehicle }: { vehicle: Vehicle }) {
  const [icon, setIcon] = useState<L.DivIcon | null>(null);

  useEffect(() => {
    setIcon(createTruckIcon(vehicle.status));
  }, [vehicle.status]);

  if (!icon) return null;

  return (
    <Marker position={[vehicle.lat, vehicle.lng]} icon={icon}>
      <Popup>
        <div className="text-[13px] leading-relaxed min-w-[160px]">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: STATUS_CONFIG[vehicle.status]?.bg ?? "#9ca3af" }}
            />
            <span className="font-semibold">{vehicle.plateNumber}</span>
          </div>
          <p className="text-gray-500">{vehicle.driver} 기사</p>
          <hr className="my-1.5 border-gray-100" />
          <p>{vehicle.productName} / {vehicle.typeName}</p>
          <p className="mt-1">
            건강점수{" "}
            <span
              className="font-bold"
              style={{ color: vehicle.healthScore >= 80 ? "#22c55e" : vehicle.healthScore >= 60 ? "#eab308" : "#ef4444" }}
            >
              {vehicle.healthScore}점
            </span>
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
