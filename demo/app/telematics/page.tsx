"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowUpDown,
  MapPin,
  ArrowRight,
  Package,
  Timer,
  CircleDot,
  X,
  Maximize2,
  Gauge as GaugeIcon,
  Thermometer,
  Battery,
  Droplets,
  ShieldCheck,
  Zap,
  Fuel,
  Weight,
  AlertTriangle,
  Clock,
  TrendingUp,
  Navigation,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { vehicles, customers, routeData } from "@/lib/data";
import { allTelematicsData } from "@/lib/telematics-data";
import type { TelematicsData, TelematicsEvent } from "@/lib/telematics-data";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import ProductDot from "@/components/ui/ProductDot";
import Gauge from "@/components/ui/Gauge";
import PageTransition from "@/components/PageTransition";

// ── Dynamic maps (no SSR) ──
const VehicleMap = dynamic(() => import("./VehicleMap"), { ssr: false });
const VehicleMapExpanded = dynamic(() => import("./VehicleMapExpanded"), { ssr: false });

// ── Status labels ──
const statusLabel: Record<string, string> = {
  running: "운행 중",
  idle: "대기",
  warning: "경고",
};
const statusBadge: Record<string, "safe" | "warning" | "danger"> = {
  running: "safe",
  idle: "blue" as "safe",
  warning: "danger",
};

// ── Event type labels ──
const eventTypeLabel: Record<string, string> = {
  brake: "급제동",
  accel: "급가속",
  speed: "과속",
  idle: "공회전",
  dtc: "DTC",
  door: "도어",
  geofence: "지오펜스",
};
const eventTypeVariant: Record<string, "danger" | "warning" | "safe" | "blue"> = {
  brake: "warning",
  accel: "warning",
  speed: "danger",
  idle: "blue",
  dtc: "danger",
  door: "blue",
  geofence: "blue",
};

// ── Semi-circular gauge SVG ──
function SemiGauge({
  value,
  max,
  label,
  unit,
  warn,
  size = 80,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  warn?: boolean;
  size?: number;
}) {
  const pct = Math.min(value / max, 1);
  const r = (size - 10) / 2;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - pct);
  const color = warn ? "var(--color-danger)" : pct > 0.85 ? "var(--color-warning)" : "var(--color-brand)";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="var(--color-border-light)"
          strokeWidth={6}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--color-text-primary)" className="tabular-nums">
          {typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fill="var(--color-text-muted)">
          {unit}
        </text>
      </svg>
      <span className="text-[11px] text-text-muted mt-0.5">{label}</span>
    </div>
  );
}

// ── Tire diagram ──
function TireDiagram({ pressure }: { pressure: TelematicsData["tirePressure"] }) {
  const warn = (v: number) => v < 6.5;
  const tireBox = (pos: string, val: number) => (
    <div
      className={`flex flex-col items-center justify-center rounded-[--radius-sm] px-2 py-1.5 border ${
        warn(val) ? "border-danger bg-danger-bg" : "border-border-light bg-surface-secondary"
      }`}
    >
      <span className="text-[10px] text-text-muted">{pos}</span>
      <span className={`text-sm font-bold tabular-nums ${warn(val) ? "text-danger" : "text-text-primary"}`}>
        {val.toFixed(1)}
      </span>
      <span className="text-[9px] text-text-muted">bar</span>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-1.5 w-fit mx-auto">
      {tireBox("FL", pressure.fl)}
      {tireBox("FR", pressure.fr)}
      {tireBox("RL", pressure.rl)}
      {tireBox("RR", pressure.rr)}
    </div>
  );
}

// ── Score color helper ──
function scoreColor(score: number): string {
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-warning";
  return "text-danger";
}

type SortKey = "status" | "health" | "speed" | "driver";

const sortLabels: Record<SortKey, string> = {
  status: "상태",
  health: "건강점수",
  speed: "속도",
  driver: "기사명",
};

const statusOrder: Record<string, number> = { warning: 0, running: 1, idle: 2 };

export default function TelematicsPage() {
  const defaultVehicle = vehicles.find((v) => v.status === "running") ?? vehicles[0];
  const [selectedId, setSelectedId] = useState(defaultVehicle.id);
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }, [sortKey]);

  const sortedVehicles = useMemo(() => {
    const sorted = [...vehicles].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "status":
          cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
          break;
        case "health":
          cmp = a.healthScore - b.healthScore;
          break;
        case "speed": {
          const sa = allTelematicsData[a.id]?.currentSpeed ?? 0;
          const sb = allTelematicsData[b.id]?.currentSpeed ?? 0;
          cmp = sa - sb;
          break;
        }
        case "driver":
          cmp = a.driver.localeCompare(b.driver, "ko");
          break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [sortKey, sortAsc]);

  const vehicle = vehicles.find((v) => v.id === selectedId)!;
  const baseData = allTelematicsData[selectedId];

  // Live telemetry simulation — running vehicles fluctuate every 2s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (vehicle.status !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, [vehicle.status, selectedId]);

  const data = useMemo(() => {
    if (vehicle.status !== "running") return baseData;
    // Fluctuation (양방향) — 속도, RPM 등 계기판 수치용
    const jitter = (base: number, range: number) => {
      const seed = tick * 7 + base * 13;
      const pseudo = Math.sin(seed) * 0.5 + 0.5;
      return Math.round((base + (pseudo - 0.5) * range) * 10) / 10;
    };
    // 연료: tick마다 소량씩 감소만 (절대 증가 안 함)
    const fuelDrain = tick * 0.03; // 2초마다 0.03% 감소
    const fuelNow = Math.max(1, Math.round((baseData.fuelLevel - fuelDrain) * 10) / 10);
    return {
      ...baseData,
      currentSpeed: Math.max(0, Math.round(jitter(baseData.currentSpeed, 12))),
      engineRpm: Math.max(600, Math.round(jitter(baseData.engineRpm, 200))),
      coolantTemp: Math.round(jitter(baseData.coolantTemp, 3) * 10) / 10,
      oilPressure: Math.round(jitter(baseData.oilPressure, 0.4) * 10) / 10,
      batteryVoltage: Math.round(jitter(baseData.batteryVoltage, 0.3) * 10) / 10,
      fuelLevel: fuelNow,
      fuelConsumptionLph: Math.round(jitter(baseData.fuelConsumptionLph, 3) * 10) / 10,
      fuelEfficiency: Math.round(jitter(baseData.fuelEfficiency, 0.3) * 10) / 10,
      co2Emission: Math.round(jitter(baseData.co2Emission, 10)),
      loadWeight: Math.round(jitter(baseData.loadWeight, 50)),
      tankPressure: Math.round(jitter(baseData.tankPressure, 0.3) * 10) / 10,
    };
  }, [baseData, tick, vehicle.status]);

  // 운행 중 차량의 배송 미션 시뮬레이션
  const mission = useMemo(() => {
    if (vehicle.status !== "running") return null;
    const rng = (() => { let s = vehicle.id.charCodeAt(1) * 100 + vehicle.id.charCodeAt(2); return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
    // 경로에서 3~4개 정류장 생성
    const pool = customers.filter((c) => c.product === vehicle.product || rng() > 0.6).slice(0, 6);
    const stops = pool.slice(0, 3 + Math.floor(rng() * 2)).map((c, i) => ({
      name: c.shortName,
      product: c.productName,
      quantity: Math.round((1000 + rng() * 4000) / 100) * 100,
      eta: Math.round(15 + i * 20 + rng() * 15),
      completed: i < 1 + Math.floor(rng() * 2),
      lat: c.lat,
      lng: c.lng,
    }));
    const totalLoad = stops.reduce((s, st) => s + st.quantity, 0);
    const delivered = stops.filter((s) => s.completed).reduce((s, st) => s + st.quantity, 0);
    const currentIdx = stops.findIndex((s) => !s.completed);
    return { stops, totalLoad, delivered, remaining: totalLoad - delivered, currentIdx, departureTime: "07:15" };
  }, [vehicle]);

  // Memoize chart data slices
  const speedData = useMemo(
    () =>
      data.speedHistory.filter((_, i) => i % 3 === 0).map((d) => ({
        time: d.time,
        speed: d.speed,
      })),
    [data.speedHistory],
  );

  const fuelData = useMemo(() => data.fuelHistory, [data.fuelHistory]);

  return (
    <PageTransition>
      <div className="flex gap-0 -m-4 min-h-[calc(100vh-64px)]">
        {/* ══════ Left: Vehicle List ══════ */}
        <aside className="w-[280px] shrink-0 bg-surface border-r border-border overflow-y-auto custom-scroll">
          <div className="px-4 py-3 border-b border-border-light">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">
                <Activity className="inline-block w-4 h-4 mr-1.5 -mt-0.5 text-brand" />
                차량 목록
              </h2>
              <span className="text-[10px] text-text-muted">
                {vehicles.length}대
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {(["status", "health", "speed", "driver"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`text-[10px] px-2 py-1 rounded-full transition-colors cursor-pointer flex items-center gap-0.5 ${
                    sortKey === key
                      ? "bg-brand-50 text-brand font-semibold"
                      : "text-text-muted hover:bg-surface-secondary"
                  }`}
                >
                  {sortLabels[key]}
                  {sortKey === key && (
                    <ArrowUpDown size={8} className="opacity-60" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            {sortedVehicles.map((v) => {
              const isSelected = v.id === selectedId;
              const td = allTelematicsData[v.id];
              return (
                <motion.button
                  key={v.id}
                  layout
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  onClick={() => setSelectedId(v.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border-light cursor-pointer ${
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
                      <span className="text-xs text-text-muted">{v.driver} 기사</span>
                    </div>
                    <div className="text-right shrink-0">
                      {v.status === "running" ? (
                        <span className="text-sm font-bold text-text-primary tabular-nums">
                          {td.currentSpeed}<span className="text-[10px] text-text-muted font-normal ml-0.5">km/h</span>
                        </span>
                      ) : v.status === "idle" ? (
                        <span className="text-xs text-text-muted">대기</span>
                      ) : (
                        <span className="text-xs text-danger font-semibold">경고</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1.5">
                    <Gauge percent={v.healthScore} height="h-1" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* ══════ Right: Dashboard ══════ */}
        <main className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
          <motion.div
            key={selectedId}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Section 1: Vehicle Status Header ── */}
            <Card>
              <div className="flex items-start gap-6">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-text-primary tabular-nums">
                      {vehicle.plateNumber}
                    </h1>
                    <Badge variant={statusBadge[vehicle.status] ?? "safe"}>
                      {statusLabel[vehicle.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span>{vehicle.driver} 기사</span>
                    <span className="text-text-muted">|</span>
                    <span>{vehicle.model} ({vehicle.year})</span>
                    <span className="text-text-muted">|</span>
                    <span className="flex items-center gap-1">
                      <ProductDot product={vehicle.product} size={7} />
                      {vehicle.productName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-text-muted">
                    <Navigation size={12} />
                    {vehicle.location} ({vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)})
                  </div>
                </div>

                {/* Speed */}
                <div className="text-right shrink-0">
                  <div className="text-4xl font-bold tabular-nums text-text-primary leading-none">
                    {data.currentSpeed}
                  </div>
                  <div className="text-xs text-text-muted mt-1">km/h</div>
                </div>

                {/* Mini map — click to expand */}
                <div
                  className="w-[200px] h-[120px] rounded-[--radius-md] overflow-hidden border border-border-light shrink-0 relative cursor-pointer group"
                  onClick={() => setMapExpanded(true)}
                >
                  <VehicleMap lat={vehicle.lat} lng={vehicle.lng} status={vehicle.status} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-surface/90 rounded-full p-1.5 shadow-[--shadow-sm]">
                      <Maximize2 size={14} className="text-text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Mission Status (running vehicles only) ── */}
            {mission && (
              <Card className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                    <MapPin size={16} className="text-brand" />
                    배송 미션 현황
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Timer size={11} />출발 {mission.departureTime}</span>
                    <span>적재 {mission.totalLoad.toLocaleString()}kg</span>
                    <span className="text-success font-semibold">배송 {mission.delivered.toLocaleString()}kg</span>
                    <span>잔여 {mission.remaining.toLocaleString()}kg</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-border-light rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: `${Math.round((mission.delivered / mission.totalLoad) * 100)}%` }} />
                </div>

                {/* Stop timeline */}
                <div className="flex items-start gap-0">
                  {/* 본사 출발 */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: 70 }}>
                    <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center">
                      <MapPin size={12} className="text-white" />
                    </div>
                    <div className="w-px h-4 bg-border-light" />
                    <p className="text-[10px] text-text-muted mt-1 text-center">본사 출발</p>
                    <p className="text-[10px] text-text-muted tabular-nums">{mission.departureTime}</p>
                  </div>

                  {mission.stops.map((stop, i) => {
                    const isCurrent = i === mission.currentIdx;
                    const isCompleted = stop.completed;
                    return (
                      <div key={i} className="flex items-center flex-1 min-w-0">
                        {/* Arrow connector */}
                        <div className={`flex-1 h-px ${isCompleted ? "bg-success" : "bg-border-light"} relative`}>
                          {isCurrent && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-brand font-semibold whitespace-nowrap bg-brand-50 px-1.5 py-0.5 rounded-full">
                              이동 중 ~{stop.eta}분
                            </div>
                          )}
                        </div>
                        {/* Stop node */}
                        <div className="flex flex-col items-center shrink-0" style={{ width: 80 }}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCompleted ? "bg-success text-white" : isCurrent ? "bg-brand text-white alert-pulse" : "bg-surface-secondary text-text-muted border border-border"
                          }`}>
                            {isCompleted ? "✓" : i + 1}
                          </div>
                          <p className={`text-[10px] mt-1 text-center font-medium truncate w-full ${isCurrent ? "text-brand" : isCompleted ? "text-success" : "text-text-muted"}`}>
                            {stop.name}
                          </p>
                          <p className="text-[9px] text-text-muted tabular-nums">{stop.quantity.toLocaleString()}kg</p>
                          {isCompleted && <p className="text-[9px] text-success">완료</p>}
                          {isCurrent && <p className="text-[9px] text-brand font-semibold">다음 배송</p>}
                        </div>
                      </div>
                    );
                  })}

                  {/* 본사 복귀 */}
                  <div className="flex items-center flex-none">
                    <div className="flex-1 h-px bg-border-light w-8" />
                    <div className="flex flex-col items-center shrink-0" style={{ width: 70 }}>
                      <div className="w-6 h-6 rounded-full bg-surface-secondary border border-border flex items-center justify-center">
                        <CircleDot size={12} className="text-text-muted" />
                      </div>
                      <p className="text-[10px] text-text-muted mt-1">본사 복귀</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Grid: Health + Driving ── */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Section 2: Vehicle Health */}
              <Card>
                <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <GaugeIcon size={16} className="text-brand" />
                  차량 상태
                </h3>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <SemiGauge value={data.engineRpm} max={2500} label="엔진 RPM" unit="rpm" />
                  <SemiGauge
                    value={data.coolantTemp}
                    max={120}
                    label="냉각수 온도"
                    unit={"\u00B0C"}
                    warn={data.coolantTemp > 95}
                  />
                  <SemiGauge value={data.oilPressure} max={6} label="유압" unit="bar" />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Battery size={14} className={data.batteryVoltage < 12 ? "text-danger" : "text-text-muted"} />
                      <span className="text-xs text-text-muted">배터리</span>
                    </div>
                    <span className={`text-lg font-bold tabular-nums ${data.batteryVoltage < 12 ? "text-danger" : "text-text-primary"}`}>
                      {data.batteryVoltage.toFixed(1)}
                      <span className="text-xs text-text-muted font-normal ml-0.5">V</span>
                    </span>
                    {data.batteryVoltage < 12 && (
                      <span className="text-[10px] text-danger mt-0.5">전압 저하</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Fuel size={14} className="text-text-muted" />
                      <span className="text-xs text-text-muted">연료</span>
                    </div>
                    <span className="text-lg font-bold tabular-nums text-text-primary">
                      {data.fuelLevel}
                      <span className="text-xs text-text-muted font-normal ml-0.5">%</span>
                    </span>
                    <div className="w-full mt-1">
                      <Gauge percent={data.fuelLevel} height="h-1.5" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Thermometer size={14} className="text-text-muted" />
                      <span className="text-xs text-text-muted">타이어 압력</span>
                    </div>
                    <TireDiagram pressure={data.tirePressure} />
                  </div>
                </div>

                {/* DTC Codes */}
                {data.dtcCodes.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-light">
                    <p className="text-xs font-semibold text-text-secondary mb-2">DTC 코드</p>
                    <div className="space-y-1.5">
                      {data.dtcCodes.map((dtc, i) => (
                        <div
                          key={`${dtc.code}-${i}`}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[--radius-sm] text-xs ${
                            dtc.severity === "danger"
                              ? "bg-danger-bg text-danger"
                              : dtc.severity === "warning"
                                ? "bg-warning-bg text-warning"
                                : "bg-info-bg text-info"
                          }`}
                        >
                          <AlertTriangle size={12} />
                          <span className="font-mono font-semibold">{dtc.code}</span>
                          <span>{dtc.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Section 3: Driving Behavior */}
              <Card>
                <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand" />
                  운전 행동 분석
                </h3>

                {/* Driving score */}
                <div className="flex items-center gap-6 mb-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold tabular-nums ${scoreColor(data.drivingScore)}`}>
                      {data.drivingScore}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">운전 점수</div>
                  </div>

                  <div className="flex-1 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold tabular-nums text-text-primary">{data.todayDistance}</div>
                      <div className="text-[11px] text-text-muted">주행거리 (km)</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold tabular-nums text-text-primary">{data.avgSpeed}</div>
                      <div className="text-[11px] text-text-muted">평균속도 (km/h)</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold tabular-nums text-text-primary">{data.idleTimeMin}</div>
                      <div className="text-[11px] text-text-muted">공회전 (분)</div>
                    </div>
                  </div>
                </div>

                {/* Safety events */}
                <div className="flex items-center gap-4 mb-4 px-3 py-2.5 bg-surface-secondary rounded-[--radius-md]">
                  <div className="flex items-center gap-1.5">
                    <Zap size={13} className="text-warning" />
                    <span className="text-xs text-text-muted">급제동</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">{data.hardBrakeCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={13} className="text-warning" />
                    <span className="text-xs text-text-muted">급가속</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">{data.hardAccelCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-danger" />
                    <span className="text-xs text-text-muted">과속</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">{data.overSpeedCount}</span>
                  </div>
                </div>

                {/* Speed chart */}
                <div className="mt-2">
                  <p className="text-xs font-semibold text-text-secondary mb-2">속도 변화 (최근 60분)</p>
                  <div className="h-[140px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={speedData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                          interval={4}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 80]}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border-light)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 12,
                          }}
                          labelFormatter={(label) => `${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="speed"
                          stroke="var(--color-brand)"
                          strokeWidth={1.5}
                          fill="url(#speedGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Section 4: Cargo + Fuel ── */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Cargo */}
              <Card>
                <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Weight size={16} className="text-brand" />
                  화물 상태
                </h3>

                <div className="space-y-4">
                  {/* Load */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-muted">적재량</span>
                      <span className="text-sm font-bold tabular-nums text-text-primary">
                        {data.loadWeight.toLocaleString()} / {data.maxLoad.toLocaleString()} kg
                      </span>
                    </div>
                    <Gauge percent={Math.round((data.loadWeight / data.maxLoad) * 100)} height="h-2" />
                  </div>

                  {/* Tank info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-secondary rounded-[--radius-md] p-3 text-center">
                      <p className="text-xs text-text-muted mb-1">탱크 압력</p>
                      <p className="text-xl font-bold tabular-nums text-text-primary">
                        {data.tankPressure.toFixed(1)}
                        <span className="text-xs text-text-muted font-normal ml-0.5">bar</span>
                      </p>
                    </div>
                    <div className="bg-surface-secondary rounded-[--radius-md] p-3 text-center">
                      <p className="text-xs text-text-muted mb-1">탱크 온도</p>
                      <p className="text-xl font-bold tabular-nums text-text-primary">
                        {data.tankTemp.toFixed(1)}
                        <span className="text-xs text-text-muted font-normal ml-0.5">{"\u00B0C"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Product info */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-info-bg rounded-[--radius-sm]">
                    <ProductDot product={vehicle.product} size={8} />
                    <span className="text-xs text-info font-medium">{vehicle.productName} 운반 중</span>
                  </div>
                </div>
              </Card>

              {/* Fuel management */}
              <Card>
                <h3 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Droplets size={16} className="text-brand" />
                  연료 관리
                </h3>

                <div className="space-y-3">
                  {/* Fuel level */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-text-muted">연료 잔량</span>
                      <span className="text-sm font-bold tabular-nums text-text-primary">{data.fuelLevel}%</span>
                    </div>
                    <Gauge percent={data.fuelLevel} height="h-2" />
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-surface-secondary rounded-[--radius-sm] p-2">
                      <p className="text-xs text-text-muted">연비</p>
                      <p className="text-sm font-bold tabular-nums text-text-primary">{data.fuelEfficiency}</p>
                      <p className="text-[10px] text-text-muted">km/L</p>
                    </div>
                    <div className="bg-surface-secondary rounded-[--radius-sm] p-2">
                      <p className="text-xs text-text-muted">금일 사용</p>
                      <p className="text-sm font-bold tabular-nums text-text-primary">{data.todayFuelUsed}</p>
                      <p className="text-[10px] text-text-muted">L</p>
                    </div>
                    <div className="bg-surface-secondary rounded-[--radius-sm] p-2">
                      <p className="text-xs text-text-muted">CO2</p>
                      <p className="text-sm font-bold tabular-nums text-text-primary">{data.co2Emission}</p>
                      <p className="text-[10px] text-text-muted">g/km</p>
                    </div>
                  </div>

                  {/* Fuel chart */}
                  <div>
                    <p className="text-xs font-semibold text-text-secondary mb-2">연료 추이 (24시간)</p>
                    <div className="h-[110px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={fuelData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                          <defs>
                            <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                            interval={3}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--color-surface)",
                              border: "1px solid var(--color-border-light)",
                              borderRadius: "var(--radius-sm)",
                              fontSize: 12,
                            }}
                            labelFormatter={(label) => `${label}`}
                          />
                          <Area
                            type="monotone"
                            dataKey="level"
                            stroke="var(--color-success)"
                            strokeWidth={1.5}
                            fill="url(#fuelGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Section 5: Events Log ── */}
            <div className="mt-4">
              <Card>
                <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-brand" />
                  최근 이벤트
                </h3>

                <div className="max-h-[240px] overflow-y-auto custom-scroll">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-text-muted border-b border-border-light">
                        <th className="text-left pb-2 w-[70px]">시간</th>
                        <th className="text-left pb-2 w-[32px]"></th>
                        <th className="text-left pb-2 w-[80px]">유형</th>
                        <th className="text-left pb-2">상세</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {data.events.map((ev: TelematicsEvent, i: number) => (
                        <tr key={`${ev.time}-${i}`} className="hover:bg-surface-secondary transition-colors">
                          <td className="py-2 text-xs tabular-nums text-text-muted">{ev.time}</td>
                          <td className="py-2">
                            <StatusDot status={ev.severity === "danger" ? "danger" : ev.severity === "warning" ? "warning" : "safe"} />
                          </td>
                          <td className="py-2">
                            <Badge variant={eventTypeVariant[ev.type] ?? "blue"} size="xs">
                              {eventTypeLabel[ev.type] ?? ev.type}
                            </Badge>
                          </td>
                          <td className="py-2 text-xs text-text-secondary">{ev.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </motion.div>
        </main>
      </div>

      {/* ══════ Expanded Map Modal ══════ */}
      <AnimatePresence>
        {mapExpanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setMapExpanded(false)} />
            <motion.div
              className="relative bg-surface rounded-[--radius-xl] shadow-[--shadow-xl] w-[85vw] h-[80vh] overflow-hidden"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.25 }}
            >
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-5 py-3 bg-surface/90 backdrop-blur-sm border-b border-border-light">
                <div className="flex items-center gap-3">
                  <StatusDot status={vehicle.status} size={10} />
                  <span className="text-base font-semibold text-text-primary">{vehicle.plateNumber}</span>
                  <span className="text-sm text-text-secondary">{vehicle.driver} 기사</span>
                  <ProductDot product={vehicle.product} size={7} />
                  <span className="text-sm text-text-muted">{vehicle.productName}</span>
                  {vehicle.status === "running" && (
                    <Badge variant="safe">{data.currentSpeed} km/h 운행 중</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Legend */}
                  <div className="flex items-center gap-3 text-[10px] text-text-muted mr-4">
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-success rounded" /> 지나온 경로
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-4 h-0.5 bg-blue-500 rounded border-t border-dashed" style={{ borderTopStyle: "dashed" }} /> 남은 경로
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-success" /> 완료
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-white border border-blue-500" /> 예정
                    </span>
                  </div>
                  <button
                    onClick={() => setMapExpanded(false)}
                    className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-[--radius-md] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Map */}
              <div className="h-full pt-[52px]">
                <VehicleMapExpanded
                  lat={vehicle.lat}
                  lng={vehicle.lng}
                  status={vehicle.status}
                  driver={vehicle.driver}
                  plateNumber={vehicle.plateNumber}
                  stops={mission?.stops.map((s) => ({
                    name: s.name,
                    lat: s.lat,
                    lng: s.lng,
                    completed: s.completed,
                    quantity: s.quantity,
                  }))}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
