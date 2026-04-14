"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Popup } from "react-leaflet";
import TruckMarker from "./TruckMarker";
import { vehicles, customers, routeData } from "@/lib/data";
import "leaflet/dist/leaflet.css";

// 운행 중인 차량에 대해 시뮬레이션 경로를 생성
// routeData.after의 경로를 기반으로, 차량 현재 위치를 경로 중간 지점으로 가정
const routeColors = ["#3B82F6", "#8B5CF6", "#06B6D4", "#F59E0B", "#EC4899"];

interface SimRoute {
  vehicleId: string;
  driver: string;
  plateNumber: string;
  traveled: [number, number][]; // 지나온 경로 (실선)
  remaining: [number, number][]; // 남은 경로 (점선)
  stops: { name: string; lat: number; lng: number; visited: boolean }[];
  color: string;
}

function buildSimRoutes(): SimRoute[] {
  const result: SimRoute[] = [];
  const runningVehicles = vehicles.filter((v) => v.status === "running");

  routeData.after.vehicles.forEach((rv, idx) => {
    const vehicle = runningVehicles.find(
      (v) => v.driver === rv.driver || v.id === rv.id
    );
    if (!vehicle) return;

    const allStops = rv.stops.map((s) => ({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
    }));

    // 차량 현재 위치를 경로의 40~70% 진행 지점으로 시뮬레이션
    const progress = 0.4 + (idx * 0.1); // 각 차량마다 다른 진행률
    const splitIdx = Math.max(1, Math.floor(allStops.length * progress));

    const traveled: [number, number][] = allStops
      .slice(0, splitIdx)
      .map((s) => [s.lat, s.lng]);
    // 현재 차량 위치를 지나온 경로 마지막에 추가
    traveled.push([vehicle.lat, vehicle.lng]);

    const remaining: [number, number][] = [[vehicle.lat, vehicle.lng]];
    allStops.slice(splitIdx).forEach((s) => remaining.push([s.lat, s.lng]));

    const stops = allStops.map((s, i) => ({
      ...s,
      visited: i < splitIdx,
    }));

    result.push({
      vehicleId: vehicle.id,
      driver: rv.driver,
      plateNumber: vehicle.plateNumber,
      traveled,
      remaining,
      stops,
      color: routeColors[idx % routeColors.length],
    });
  });

  return result;
}

const simRoutes = buildSimRoutes();

const customerRiskColor: Record<string, string> = {
  danger: "#DC2626",
  warning: "#D97706",
  safe: "#9CA3AF",
};

export default function DashboardMap() {
  const [focusedVehicle, setFocusedVehicle] = useState<string | null>(null);
  const [showCustomers, setShowCustomers] = useState(true);

  // 포커스 시 해당 차량 경로만, 아니면 전체
  const visibleRoutes = focusedVehicle
    ? simRoutes.filter((r) => r.vehicleId === focusedVehicle)
    : simRoutes;

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

        {/* 거래처 마커 — 경로/트럭 뒤에 렌더링 */}
        {showCustomers &&
          customers.map((c) => (
            <CircleMarker
              key={`cust-${c.id}`}
              center={[c.lat, c.lng]}
              radius={4}
              pathOptions={{
                color: customerRiskColor[c.riskLevel],
                fillColor: customerRiskColor[c.riskLevel],
                fillOpacity: c.riskLevel === "safe" ? 0.4 : 1,
                weight: 1,
                opacity: c.riskLevel === "safe" ? 0.4 : 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                <div className="text-xs">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-gray-500">{c.productName}</p>
                  <p className="text-gray-500">탱크 잔량: {c.currentLevel}%</p>
                  <p className={c.riskLevel === "danger" ? "text-red-600 font-semibold" : c.riskLevel === "warning" ? "text-amber-600 font-semibold" : "text-gray-400"}>
                    소진 예상: {c.depletionDays}일
                  </p>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}

        {/* Route polylines */}
        {visibleRoutes.map((r) => (
          <span key={r.vehicleId}>
            {/* 지나온 경로: 실선 */}
            {r.traveled.length > 1 && (
              <Polyline
                positions={r.traveled}
                pathOptions={{
                  color: r.color,
                  weight: focusedVehicle ? 4 : 2.5,
                  opacity: focusedVehicle ? 0.9 : 0.5,
                }}
              />
            )}
            {/* 남은 경로: 점선 */}
            {r.remaining.length > 1 && (
              <Polyline
                positions={r.remaining}
                pathOptions={{
                  color: r.color,
                  weight: focusedVehicle ? 4 : 2.5,
                  opacity: focusedVehicle ? 0.7 : 0.35,
                  dashArray: "8 6",
                }}
              />
            )}
            {/* 정류장 마커 */}
            {r.stops
              .filter((s) => s.name !== "본사 (울산)" && s.name !== "본사")
              .map((s, si) => (
                <CircleMarker
                  key={`${r.vehicleId}-stop-${si}`}
                  center={[s.lat, s.lng]}
                  radius={focusedVehicle === r.vehicleId ? 7 : 4}
                  pathOptions={{
                    color: r.color,
                    fillColor: s.visited ? r.color : "#fff",
                    fillOpacity: 1,
                    weight: 2,
                    opacity: focusedVehicle ? 1 : 0.6,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]}>
                    <div className="text-xs">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-gray-500">{s.visited ? "배송 완료" : "배송 예정"}</p>
                      <p className="text-gray-400">{r.driver} 담당</p>
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
          </span>
        ))}

        {/* 본사 마커 */}
        <CircleMarker
          center={[35.5234, 129.3456]}
          radius={9}
          pathOptions={{ color: "var(--color-brand)", fillColor: "var(--color-brand)", fillOpacity: 1, weight: 0 }}
        >
          <Popup><span className="text-xs font-semibold">본사 (울산)</span></Popup>
        </CircleMarker>

        {/* 트럭 마커 — 모든 차량 */}
        {vehicles.map((v) => (
          <TruckMarker key={v.id} vehicle={v} />
        ))}
      </MapContainer>

      {/* Legend + route filter */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-surface/95 backdrop-blur-sm rounded-[--radius-md] shadow-[--shadow-sm] border border-border-light px-3 py-2.5">
        <div className="flex items-center gap-4 text-xs text-text-secondary mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-success" />
            운행 {vehicles.filter((v) => v.status === "running").length}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-warning" />
            경고 {vehicles.filter((v) => v.status === "warning").length}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-text-muted" />
            대기 {vehicles.filter((v) => v.status === "idle").length}
          </span>
        </div>
        <div className="flex items-center gap-1 border-t border-border-light pt-2">
          <span className="text-[10px] text-text-muted mr-1">경로:</span>
          {focusedVehicle && (
            <button onClick={() => setFocusedVehicle(null)} className="text-[10px] text-brand hover:underline mr-1 cursor-pointer">전체</button>
          )}
          {simRoutes.map((r) => (
            <button
              key={r.vehicleId}
              onClick={() => setFocusedVehicle(focusedVehicle === r.vehicleId ? null : r.vehicleId)}
              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full transition-all cursor-pointer ${
                focusedVehicle === r.vehicleId
                  ? "text-white font-semibold"
                  : focusedVehicle
                    ? "text-text-muted opacity-50"
                    : "text-text-secondary hover:bg-surface-secondary"
              }`}
              style={focusedVehicle === r.vehicleId ? { backgroundColor: r.color } : {}}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
              {r.driver}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-[9px] text-text-muted mt-1.5 pt-1.5 border-t border-border-light">
          <span className="flex items-center gap-1">
            <span className="w-4 h-0 border-t-2" style={{ borderColor: "#6B7280" }} /> 지나온 경로
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: "#6B7280" }} /> 남은 경로
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500" /> 완료
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white border border-gray-400" /> 예정
          </span>
        </div>
        {/* 거래처 표시 토글 + 범례 */}
        <div className="flex items-center gap-3 text-[9px] text-text-muted mt-1.5 pt-1.5 border-t border-border-light">
          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCustomers}
              onChange={(e) => setShowCustomers(e.target.checked)}
              className="w-3 h-3 accent-brand rounded"
            />
            <span className="text-[10px] text-text-secondary font-medium">거래처 표시</span>
          </label>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#DC2626" }} /> 위험
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#D97706" }} /> 경고
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: "#9CA3AF" }} /> 정상
          </span>
        </div>
      </div>
    </div>
  );
}
