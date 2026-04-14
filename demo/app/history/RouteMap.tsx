"use client";

import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface Waypoint {
  lat: number;
  lng: number;
  speed: number;
  time: string;
}

export interface DeliveryStop {
  lat: number;
  lng: number;
  name: string;
  arriveTime: string;
  departTime: string;
  index: number;
}

interface RouteMapProps {
  waypoints: Waypoint[];
  stops: DeliveryStop[];
  hqLat: number;
  hqLng: number;
}

function getSpeedColor(speed: number): string {
  if (speed >= 60) return "#DC2626";
  if (speed >= 40) return "#D97706";
  return "#059669";
}

export default function RouteMap({ waypoints, stops, hqLat, hqLng }: RouteMapProps) {
  // Build speed-colored polyline segments
  const segments: { positions: [number, number][]; color: string }[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const color = getSpeedColor(waypoints[i].speed);
    const pos: [number, number][] = [
      [waypoints[i].lat, waypoints[i].lng],
      [waypoints[i + 1].lat, waypoints[i + 1].lng],
    ];
    if (segments.length > 0 && segments[segments.length - 1].color === color) {
      segments[segments.length - 1].positions.push(pos[1]);
    } else {
      segments.push({ positions: pos, color });
    }
  }

  // Compute center
  const centerLat = waypoints.length > 0
    ? waypoints.reduce((s, w) => s + w.lat, 0) / waypoints.length
    : hqLat;
  const centerLng = waypoints.length > 0
    ? waypoints.reduce((s, w) => s + w.lng, 0) / waypoints.length
    : hqLng;

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

        {/* Speed-colored route segments */}
        {segments.map((seg, i) => (
          <Polyline
            key={i}
            positions={seg.positions}
            pathOptions={{ color: seg.color, weight: 4, opacity: 0.85 }}
          />
        ))}

        {/* HQ Start marker */}
        <CircleMarker
          center={[hqLat, hqLng]}
          radius={10}
          pathOptions={{
            fillColor: "#1A6DB5",
            fillOpacity: 1,
            color: "#FFFFFF",
            weight: 3,
          }}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">본사 (출발/복귀)</p>
            </div>
          </Popup>
        </CircleMarker>

        {/* Delivery stop markers */}
        {stops.map((stop) => (
          <CircleMarker
            key={stop.index}
            center={[stop.lat, stop.lng]}
            radius={12}
            pathOptions={{
              fillColor: "#1A6DB5",
              fillOpacity: 0.9,
              color: "#FFFFFF",
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{stop.name}</p>
                <p>도착: {stop.arriveTime}</p>
                <p>출발: {stop.departTime}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Stop number labels rendered as overlays - since CircleMarker doesn't easily support text */}
      {/* Speed legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 rounded-[--radius-sm] px-3 py-2 shadow-[--shadow-sm] border border-border-light">
        <p className="text-[10px] font-semibold text-text-secondary mb-1">속도 범례</p>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-1 rounded-full" style={{ backgroundColor: "#059669" }} />
            0-40 km/h
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-1 rounded-full" style={{ backgroundColor: "#D97706" }} />
            40-60 km/h
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-1 rounded-full" style={{ backgroundColor: "#DC2626" }} />
            60+ km/h
          </span>
        </div>
      </div>
    </div>
  );
}
