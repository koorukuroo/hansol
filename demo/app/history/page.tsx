"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  History,
  MapPin,
  Clock,
  Gauge as GaugeIcon,
  AlertTriangle,
  TrendingUp,
  Zap,
  Route,
  Calendar,
  Truck,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import { vehicles, customers } from "@/lib/data";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import ProductDot from "@/components/ui/ProductDot";
import PageTransition from "@/components/PageTransition";

import type { Waypoint, DeliveryStop } from "./RouteMap";

// ── Dynamic map (no SSR) ──
const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });

// ── Seeded PRNG ──
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── HQ coordinates ──
const HQ_LAT = 35.5234;
const HQ_LNG = 129.3456;

// ── Time helpers ──
function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function dateToSeed(dateStr: string): number {
  const parts = dateStr.split("-");
  return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2]);
}

// ── Event type definitions ──
interface TimelineEvent {
  time: string;
  event: string;
  location: string;
  speed: number;
  severity: "safe" | "warning" | "danger" | "idle";
}

// ── Generate trip data for a vehicle + date ──
function generateTripData(vehicleId: string, dateStr: string) {
  const vehicleIndex = vehicles.findIndex((v) => v.id === vehicleId);
  const seed = dateToSeed(dateStr) + (vehicleIndex + 1) * 1000;
  const rng = seededRng(seed);

  const vehicle = vehicles[vehicleIndex];

  // Pick 3-5 delivery stops from customer list
  const numStops = 3 + Math.floor(rng() * 3);
  const shuffled = [...customers].sort(() => rng() - 0.5);
  const selectedCustomers = shuffled.slice(0, numStops);

  // Generate waypoints: HQ -> stops -> HQ
  const waypoints: Waypoint[] = [];
  const stops: DeliveryStop[] = [];
  const events: TimelineEvent[] = [];

  let currentTime = 420 + Math.floor(rng() * 30); // 07:00 ~ 07:30
  let currentLat = HQ_LAT;
  let currentLng = HQ_LNG;

  // Departure event
  events.push({
    time: minutesToTimeStr(currentTime),
    event: "출발",
    location: "본사 (울산 달천)",
    speed: 0,
    severity: "safe",
  });

  // Add HQ start waypoint
  waypoints.push({ lat: HQ_LAT, lng: HQ_LNG, speed: 0, time: minutesToTimeStr(currentTime) });

  for (let si = 0; si < selectedCustomers.length; si++) {
    const customer = selectedCustomers[si];
    const targetLat = customer.lat;
    const targetLng = customer.lng;

    // Travel time: 15-25 minutes between stops
    const travelMinutes = 15 + Math.floor(rng() * 11);
    const travelWaypoints = 6 + Math.floor(rng() * 5); // 6-10 waypoints per leg

    // Generate waypoints along route with noise
    for (let wi = 1; wi <= travelWaypoints; wi++) {
      const progress = wi / travelWaypoints;
      const timePct = progress;
      const wTime = currentTime + travelMinutes * timePct;

      // Add realistic path noise
      const noise = 0.003;
      const lat = currentLat + (targetLat - currentLat) * progress + (rng() - 0.5) * noise;
      const lng = currentLng + (targetLng - currentLng) * progress + (rng() - 0.5) * noise;

      // Speed varies: city 25-50, highway segments occasionally 50-75
      const isHighway = rng() < 0.25;
      let speed: number;
      if (isHighway) {
        speed = 50 + Math.floor(rng() * 25);
      } else {
        speed = 25 + Math.floor(rng() * 25);
      }

      waypoints.push({ lat, lng, speed, time: minutesToTimeStr(Math.floor(wTime)) });

      // Random events during travel
      if (rng() < 0.08 && speed > 60) {
        events.push({
          time: minutesToTimeStr(Math.floor(wTime)),
          event: "과속",
          location: `${customer.shortName} 방면`,
          speed,
          severity: "danger",
        });
      }
      if (rng() < 0.06) {
        events.push({
          time: minutesToTimeStr(Math.floor(wTime)),
          event: "급제동",
          location: `${customer.shortName} 방면 교차로`,
          speed: Math.floor(speed * 0.6),
          severity: "warning",
        });
      }
      if (rng() < 0.04) {
        events.push({
          time: minutesToTimeStr(Math.floor(wTime)),
          event: "급가속",
          location: `${customer.shortName} 방면`,
          speed: speed + Math.floor(rng() * 10),
          severity: "warning",
        });
      }
    }

    currentTime += travelMinutes;
    currentLat = targetLat;
    currentLng = targetLng;

    // Arrive at stop
    const arriveTime = minutesToTimeStr(currentTime);
    events.push({
      time: arriveTime,
      event: "도착 (배송)",
      location: customer.name,
      speed: 0,
      severity: "safe",
    });

    // Add zero-speed waypoint at stop
    waypoints.push({ lat: targetLat, lng: targetLng, speed: 0, time: arriveTime });

    // Stay at stop: 10-20 minutes
    const stayMinutes = 10 + Math.floor(rng() * 11);

    // Possible idle event
    if (rng() < 0.3) {
      const idleTime = 3 + Math.floor(rng() * 5);
      events.push({
        time: minutesToTimeStr(currentTime + Math.floor(stayMinutes * 0.5)),
        event: `공회전 (${idleTime}분)`,
        location: customer.name,
        speed: 0,
        severity: "idle",
      });
    }

    const departTime = minutesToTimeStr(currentTime + stayMinutes);
    events.push({
      time: departTime,
      event: "출발 (배송완료)",
      location: customer.name,
      speed: 0,
      severity: "safe",
    });

    stops.push({
      lat: targetLat,
      lng: targetLng,
      name: customer.name,
      arriveTime,
      departTime,
      index: si + 1,
    });

    currentTime += stayMinutes;
  }

  // Return to HQ
  const returnTravelMinutes = 15 + Math.floor(rng() * 15);
  const returnWaypoints = 6 + Math.floor(rng() * 4);

  for (let wi = 1; wi <= returnWaypoints; wi++) {
    const progress = wi / returnWaypoints;
    const wTime = currentTime + returnTravelMinutes * progress;
    const noise = 0.003;
    const lat = currentLat + (HQ_LAT - currentLat) * progress + (rng() - 0.5) * noise;
    const lng = currentLng + (HQ_LNG - currentLng) * progress + (rng() - 0.5) * noise;

    const speed = 30 + Math.floor(rng() * 30);
    waypoints.push({ lat, lng, speed, time: minutesToTimeStr(Math.floor(wTime)) });
  }

  currentTime += returnTravelMinutes;

  // Add HQ return waypoint
  waypoints.push({ lat: HQ_LAT, lng: HQ_LNG, speed: 0, time: minutesToTimeStr(currentTime) });

  events.push({
    time: minutesToTimeStr(currentTime),
    event: "복귀",
    location: "본사 (울산 달천)",
    speed: 0,
    severity: "safe",
  });

  // Sort events by time
  events.sort((a, b) => a.time.localeCompare(b.time));

  // Pad events to ~25 total with additional driving events
  while (events.length < 25) {
    const randTime = 420 + Math.floor(rng() * (currentTime - 420));
    const eventTypes = ["정상 주행", "신호 대기", "구간 감속", "차선 변경"];
    const eventType = eventTypes[Math.floor(rng() * eventTypes.length)];
    events.push({
      time: minutesToTimeStr(randTime),
      event: eventType,
      location: selectedCustomers[Math.floor(rng() * selectedCustomers.length)].shortName + " 부근",
      speed: 20 + Math.floor(rng() * 40),
      severity: "safe",
    });
  }
  events.sort((a, b) => a.time.localeCompare(b.time));

  // ── Speed chart data ──
  const startHour = 7;
  const endHour = Math.min(Math.ceil(currentTime / 60), 18);
  const speedChart: { time: string; speed: number }[] = [];

  for (let h = startHour; h <= endHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      const totalMin = h * 60 + m;
      if (totalMin > currentTime + 10) break;

      // Find closest waypoint
      let closestSpeed = 0;
      let minDiff = Infinity;
      for (const wp of waypoints) {
        const wpMin = parseInt(wp.time.split(":")[0]) * 60 + parseInt(wp.time.split(":")[1]);
        const diff = Math.abs(wpMin - totalMin);
        if (diff < minDiff) {
          minDiff = diff;
          closestSpeed = wp.speed;
        }
      }
      speedChart.push({
        time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        speed: closestSpeed,
      });
    }
  }

  // ── Summary stats ──
  const movingWaypoints = waypoints.filter((w) => w.speed > 0);
  const maxSpeed = movingWaypoints.length > 0 ? Math.max(...movingWaypoints.map((w) => w.speed)) : 0;
  const avgSpeed = movingWaypoints.length > 0
    ? Math.round(movingWaypoints.reduce((s, w) => s + w.speed, 0) / movingWaypoints.length)
    : 0;

  const totalDistanceKm = Math.round(20 + rng() * 80);
  const totalTimeMinutes = currentTime - (420 + Math.floor(rng() * 30 * 0)); // approximate
  const totalTimeHours = Math.round((totalTimeMinutes - 420) / 6) / 10;

  const hardBrakeCount = events.filter((e) => e.event === "급제동").length;
  const hardAccelCount = events.filter((e) => e.event === "급가속").length;
  const overSpeedCount = events.filter((e) => e.event === "과속").length;
  const idleEvents = events.filter((e) => e.event.startsWith("공회전"));
  const idleMinutes = idleEvents.reduce((total, e) => {
    const match = e.event.match(/(\d+)분/);
    return total + (match ? parseInt(match[1]) : 0);
  }, 0);

  return {
    waypoints,
    stops,
    events,
    speedChart,
    summary: {
      totalDistanceKm,
      totalTimeStr: `${Math.floor(totalTimeHours)}시간 ${Math.round((totalTimeHours % 1) * 60)}분`,
      deliveryCount: numStops,
      maxSpeed,
      avgSpeed,
      hardBrakeCount,
      hardAccelCount,
      overSpeedCount,
      idleMinutes,
    },
    vehicle,
  };
}

// ── Event severity badge ──
const eventSeverityMap: Record<string, "danger" | "warning" | "safe" | "blue" | "green" | "violet"> = {
  safe: "green",
  warning: "warning",
  danger: "danger",
  idle: "blue",
};

const eventSeverityDot: Record<string, string> = {
  safe: "safe",
  warning: "warning",
  danger: "danger",
  idle: "idle",
};

// ── Custom tooltip for speed chart ──
function SpeedTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || !payload[0]) return null;
  const speed = payload[0].value;
  const color = speed >= 60 ? "#DC2626" : speed >= 40 ? "#D97706" : "#059669";
  return (
    <div className="bg-surface border border-border-light rounded-[--radius-sm] px-3 py-2 shadow-[--shadow-md] text-xs">
      <p className="text-text-muted mb-1">{label}</p>
      <p className="font-bold tabular-nums" style={{ color }}>
        {speed} km/h
      </p>
    </div>
  );
}

export default function HistoryPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0].id);
  const [selectedDate, setSelectedDate] = useState("2026-04-14");

  const tripData = useMemo(
    () => generateTripData(selectedVehicleId, selectedDate),
    [selectedVehicleId, selectedDate],
  );

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId)!;

  return (
    <PageTransition>
      <div className="flex gap-0 -m-4 min-h-[calc(100vh-64px)]">
        {/* ══════ Left Panel: Vehicle & Date Selector ══════ */}
        <aside className="w-[300px] shrink-0 bg-surface border-r border-border overflow-y-auto custom-scroll">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-light">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <History className="w-4 h-4 text-brand" />
              운행 이력
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              차량 선택 후 일자별 운행 이력 조회
            </p>
          </div>

          {/* Date picker */}
          <div className="px-4 py-3 border-b border-border-light">
            <label className="text-[11px] text-text-muted font-medium block mb-1.5 flex items-center gap-1">
              <Calendar size={12} />
              운행 일자
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-[--radius-sm] bg-surface-secondary text-text-primary focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>

          {/* Vehicle list */}
          <div className="divide-y divide-border-light">
            {vehicles.map((v) => {
              const isSelected = v.id === selectedVehicleId;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`w-full text-left px-4 py-3 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-brand-50 border-l-2 border-l-brand"
                      : "hover:bg-surface-secondary border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={v.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary tabular-nums">
                          {v.plateNumber}
                        </span>
                        <ProductDot product={v.product} size={6} />
                      </div>
                      <span className="text-xs text-text-muted">
                        {v.driver} 기사 · {v.productName}
                      </span>
                    </div>
                    {isSelected && (
                      <Truck size={14} className="text-brand shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Daily summary stats */}
          <div className="px-4 py-4 border-t border-border bg-surface-secondary">
            <p className="text-[11px] font-semibold text-text-secondary mb-3">
              일일 운행 요약
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-surface rounded-[--radius-sm] p-2.5 border border-border-light">
                <div className="flex items-center gap-1 mb-1">
                  <Route size={11} className="text-brand" />
                  <span className="text-[10px] text-text-muted">총 주행거리</span>
                </div>
                <span className="text-base font-bold tabular-nums text-text-primary">
                  {tripData.summary.totalDistanceKm}
                  <span className="text-[10px] text-text-muted font-normal ml-0.5">km</span>
                </span>
              </div>
              <div className="bg-surface rounded-[--radius-sm] p-2.5 border border-border-light">
                <div className="flex items-center gap-1 mb-1">
                  <Clock size={11} className="text-brand" />
                  <span className="text-[10px] text-text-muted">운행시간</span>
                </div>
                <span className="text-[13px] font-bold tabular-nums text-text-primary">
                  {tripData.summary.totalTimeStr}
                </span>
              </div>
              <div className="bg-surface rounded-[--radius-sm] p-2.5 border border-border-light">
                <div className="flex items-center gap-1 mb-1">
                  <MapPin size={11} className="text-brand" />
                  <span className="text-[10px] text-text-muted">배송 건수</span>
                </div>
                <span className="text-base font-bold tabular-nums text-text-primary">
                  {tripData.summary.deliveryCount}
                  <span className="text-[10px] text-text-muted font-normal ml-0.5">건</span>
                </span>
              </div>
              <div className="bg-surface rounded-[--radius-sm] p-2.5 border border-border-light">
                <div className="flex items-center gap-1 mb-1">
                  <GaugeIcon size={11} className="text-danger" />
                  <span className="text-[10px] text-text-muted">최고속도</span>
                </div>
                <span className="text-base font-bold tabular-nums text-text-primary">
                  {tripData.summary.maxSpeed}
                  <span className="text-[10px] text-text-muted font-normal ml-0.5">km/h</span>
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ══════ Right Panel ══════ */}
        <main className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
          <motion.div
            key={`${selectedVehicleId}-${selectedDate}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* ── Vehicle header ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-text-primary">
                  {selectedVehicle.plateNumber}
                </h1>
                <Badge variant="blue">{selectedVehicle.driver} 기사</Badge>
                <span className="flex items-center gap-1 text-sm text-text-secondary">
                  <ProductDot product={selectedVehicle.product} size={7} />
                  {selectedVehicle.productName}
                </span>
              </div>
              <span className="text-sm text-text-muted">{selectedDate}</span>
            </div>

            {/* ── Section 1: Route Map ── */}
            <Card padding="sm">
              <div className="flex items-center gap-2 px-2 pt-1 pb-2">
                <MapPin size={15} className="text-brand" />
                <h3 className="text-sm font-semibold text-text-primary">경로 지도</h3>
                <span className="text-[11px] text-text-muted ml-auto">
                  배송 {tripData.stops.length}건 · {tripData.summary.totalDistanceKm}km
                </span>
              </div>
              <div className="h-[450px] rounded-[--radius-md] overflow-hidden border border-border-light">
                <RouteMap
                  waypoints={tripData.waypoints}
                  stops={tripData.stops}
                  hqLat={HQ_LAT}
                  hqLng={HQ_LNG}
                />
              </div>
              {/* Stop info row */}
              <div className="flex items-center gap-2 px-2 pt-2 overflow-x-auto">
                <span className="flex items-center gap-1.5 text-[11px] text-text-muted shrink-0">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[9px] font-bold">S</span>
                  본사
                </span>
                {tripData.stops.map((stop, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-[11px] text-text-secondary shrink-0">
                    <span className="text-text-muted">&rarr;</span>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand/90 text-white text-[9px] font-bold">
                      {i + 1}
                    </span>
                    {stop.name.length > 8 ? stop.name.slice(0, 8) + ".." : stop.name}
                    <span className="text-[10px] text-text-muted">({stop.arriveTime})</span>
                  </span>
                ))}
                <span className="flex items-center gap-1.5 text-[11px] text-text-muted shrink-0">
                  <span className="text-text-muted">&rarr;</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand text-white text-[9px] font-bold">E</span>
                  복귀
                </span>
              </div>
            </Card>

            {/* ── Section 2: Timeline Event Log ── */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={15} className="text-brand" />
                <h3 className="text-sm font-semibold text-text-primary">운행 이벤트 타임라인</h3>
                <span className="text-[11px] text-text-muted ml-auto">
                  총 {tripData.events.length}건
                </span>
              </div>
              <div className="max-h-[320px] overflow-y-auto custom-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-text-muted border-b border-border-light sticky top-0 bg-surface z-10">
                      <th className="text-left pb-2 pl-2 w-[80px]">시간</th>
                      <th className="text-left pb-2 w-[28px]"></th>
                      <th className="text-left pb-2 w-[140px]">이벤트</th>
                      <th className="text-left pb-2">위치</th>
                      <th className="text-right pb-2 pr-2 w-[80px]">속도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {tripData.events.map((ev, i) => (
                      <tr key={`${ev.time}-${i}`} className="hover:bg-surface-secondary transition-colors">
                        <td className="py-2 pl-2 text-xs tabular-nums text-text-muted">{ev.time}</td>
                        <td className="py-2">
                          <StatusDot status={eventSeverityDot[ev.severity] || "safe"} />
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={eventSeverityMap[ev.severity] || "green"}
                            size="xs"
                          >
                            {ev.event}
                          </Badge>
                        </td>
                        <td className="py-2 text-xs text-text-secondary">{ev.location}</td>
                        <td className="py-2 pr-2 text-xs text-right tabular-nums text-text-secondary">
                          {ev.speed > 0 ? (
                            <span
                              className={
                                ev.speed >= 60
                                  ? "text-danger font-semibold"
                                  : ev.speed >= 40
                                    ? "text-warning"
                                    : "text-text-secondary"
                              }
                            >
                              {ev.speed} km/h
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ── Section 3: Speed/Driving Chart ── */}
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={15} className="text-brand" />
                <h3 className="text-sm font-semibold text-text-primary">속도 분석 차트</h3>
              </div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tripData.speedChart} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                    <defs>
                      <linearGradient id="speedAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                      interval={3}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 80]}
                    />
                    <Tooltip content={<SpeedTooltipContent />} />
                    <ReferenceLine
                      y={40}
                      stroke="#D97706"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: "40 km/h", fill: "#D97706", fontSize: 10, position: "insideTopRight" }}
                    />
                    <ReferenceLine
                      y={60}
                      stroke="#DC2626"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                      label={{ value: "60 km/h", fill: "#DC2626", fontSize: 10, position: "insideTopRight" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="speed"
                      stroke="var(--color-brand)"
                      strokeWidth={2}
                      fill="url(#speedAreaGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "var(--color-brand)", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Summary stats row */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border-light">
                <div className="flex items-center gap-4 flex-1 px-3 py-2.5 bg-surface-secondary rounded-[--radius-md]">
                  <div className="flex items-center gap-1.5">
                    <GaugeIcon size={13} className="text-brand" />
                    <span className="text-xs text-text-muted">평균속도</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">
                      {tripData.summary.avgSpeed}
                      <span className="text-[10px] text-text-muted font-normal ml-0.5">km/h</span>
                    </span>
                  </div>
                  <div className="w-px h-4 bg-border-light" />
                  <div className="flex items-center gap-1.5">
                    <GaugeIcon size={13} className="text-danger" />
                    <span className="text-xs text-text-muted">최고속도</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">
                      {tripData.summary.maxSpeed}
                      <span className="text-[10px] text-text-muted font-normal ml-0.5">km/h</span>
                    </span>
                  </div>
                  <div className="w-px h-4 bg-border-light" />
                  <div className="flex items-center gap-1.5">
                    <Zap size={13} className="text-warning" />
                    <span className="text-xs text-text-muted">급제동</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">
                      {tripData.summary.hardBrakeCount}
                      <span className="text-[10px] text-text-muted font-normal ml-0.5">회</span>
                    </span>
                  </div>
                  <div className="w-px h-4 bg-border-light" />
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-danger" />
                    <span className="text-xs text-text-muted">과속</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">
                      {tripData.summary.overSpeedCount}
                      <span className="text-[10px] text-text-muted font-normal ml-0.5">회</span>
                    </span>
                  </div>
                  <div className="w-px h-4 bg-border-light" />
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-info" />
                    <span className="text-xs text-text-muted">공회전</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">
                      {tripData.summary.idleMinutes}
                      <span className="text-[10px] text-text-muted font-normal ml-0.5">분</span>
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </main>
      </div>
    </PageTransition>
  );
}
