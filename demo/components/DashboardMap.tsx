"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import { vehicles } from "@/lib/data";
import "leaflet/dist/leaflet.css";

const statusColors: Record<string, string> = {
  running: "#059669",
  idle: "#9CA3AF",
  warning: "#D97706",
};

export default function DashboardMap() {
  return (
    <div className="relative h-[500px]">
      <MapContainer
        center={[35.52, 129.35]}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        {vehicles.map((v) => {
          const color = statusColors[v.status] || "#9CA3AF";
          return (
            <CircleMarker
              key={v.id}
              center={[v.lat, v.lng]}
              radius={6}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2,
                opacity: 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="text-xs">
                  <p className="font-semibold">{v.plateNumber}</p>
                  <p className="text-gray-500">{v.driver} · {v.productName}</p>
                  <p className="text-gray-400">건강 {v.healthScore}점</p>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Status legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-surface/90 backdrop-blur-sm rounded-[--radius-md] shadow-[--shadow-sm] border border-border-light px-3 py-2 flex items-center gap-4 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          운행 {vehicles.filter(v => v.status === "running").length}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          경고 {vehicles.filter(v => v.status === "warning").length}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-text-muted" />
          대기 {vehicles.filter(v => v.status === "idle").length}
        </span>
      </div>
    </div>
  );
}
