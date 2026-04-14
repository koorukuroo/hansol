"use client";

import { useEffect, useState, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  running: { bg: "#22c55e", border: "#16a34a" },
  idle: { bg: "#9ca3af", border: "#6b7280" },
  warning: { bg: "#ef4444", border: "#dc2626" },
};

function createPinIcon(status: string) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.idle;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <defs><filter id="ds" x="-20%" y="-10%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.25"/></filter></defs>
      <path d="M18 43 C18 43 3 28 3 16 A15 15 0 1 1 33 16 C33 28 18 43 18 43Z"
            fill="${c.bg}" stroke="${c.border}" stroke-width="1.5" filter="url(#ds)"/>
      <g transform="translate(8, 6)" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="0" y="3" width="12" height="10" rx="1.5" fill="white" fill-opacity="0.3"/>
        <path d="M12 7 L17 7 L19 10.5 L19 13 L12 13 Z" fill="white" fill-opacity="0.3"/>
        <line x1="0" y1="13" x2="19" y2="13"/>
        <circle cx="4.5" cy="15.5" r="2" fill="white" fill-opacity="0.5" stroke="white"/>
        <circle cx="15.5" cy="15.5" r="2" fill="white" fill-opacity="0.5" stroke="white"/>
      </g>
    </svg>`;
  return L.divIcon({ html: svg, className: "", iconSize: [36, 46], iconAnchor: [18, 46] });
}

export interface MissionStop {
  name: string;
  lat: number;
  lng: number;
  completed: boolean;
  quantity?: number;
}

interface Props {
  lat: number;
  lng: number;
  status: string;
  driver: string;
  plateNumber: string;
  stops?: MissionStop[];
}

export default function VehicleMapExpanded({ lat, lng, status, driver, plateNumber, stops }: Props) {
  const [icon, setIcon] = useState<L.DivIcon | null>(null);
  useEffect(() => { setIcon(createPinIcon(status)); }, [status]);

  // Build route: HQ → completed stops → current position → remaining stops → HQ
  const HQ: [number, number] = [35.5234, 129.3456];

  const { traveledPath, remainingPath } = useMemo(() => {
    if (!stops || stops.length === 0) return { traveledPath: [] as [number, number][], remainingPath: [] as [number, number][] };
    const completed = stops.filter((s) => s.completed);
    const pending = stops.filter((s) => !s.completed);

    const traveled: [number, number][] = [HQ];
    completed.forEach((s) => traveled.push([s.lat, s.lng]));
    traveled.push([lat, lng]); // current position

    const remaining: [number, number][] = [[lat, lng]];
    pending.forEach((s) => remaining.push([s.lat, s.lng]));
    remaining.push(HQ);

    return { traveledPath: traveled, remainingPath: remaining };
  }, [stops, lat, lng]);

  if (!icon) return null;

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      scrollWheelZoom={true}
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

      {/* Traveled route (solid) */}
      {traveledPath.length > 1 && (
        <Polyline positions={traveledPath} pathOptions={{ color: "#059669", weight: 4, opacity: 0.8 }} />
      )}
      {/* Remaining route (dashed) */}
      {remainingPath.length > 1 && (
        <Polyline positions={remainingPath} pathOptions={{ color: "#3B82F6", weight: 3, opacity: 0.6, dashArray: "8 6" }} />
      )}

      {/* HQ marker */}
      <CircleMarker center={HQ} radius={8} pathOptions={{ color: "#1A6DB5", fillColor: "#1A6DB5", fillOpacity: 1, weight: 0 }}>
        <Tooltip direction="top" offset={[0, -8]} permanent><span className="text-[10px] font-semibold">본사</span></Tooltip>
      </CircleMarker>

      {/* Stop markers */}
      {stops?.map((s, i) => (
        <CircleMarker
          key={i}
          center={[s.lat, s.lng]}
          radius={7}
          pathOptions={{
            color: s.completed ? "#059669" : "#3B82F6",
            fillColor: s.completed ? "#059669" : "#fff",
            fillOpacity: 1,
            weight: 2,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            <div className="text-[10px]">
              <p className="font-semibold">{s.name}</p>
              {s.quantity && <p>{s.quantity.toLocaleString()}kg</p>}
              <p className={s.completed ? "text-green-600" : "text-blue-600"}>{s.completed ? "배송 완료" : "배송 예정"}</p>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Current vehicle */}
      <Marker position={[lat, lng]} icon={icon}>
        <Tooltip direction="top" offset={[0, -46]} permanent>
          <span className="text-[10px] font-semibold">{driver} ({plateNumber})</span>
        </Tooltip>
      </Marker>
    </MapContainer>
  );
}
