"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Truck,
  Gauge as GaugeIcon,
  Eye,
  Pause,
  Play,
  User,
  Car,
  Construction,
  Trophy,
  Medal,
  Radio,
  Flame,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Zap,
  EyeOff,
  Brain,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

import { allVehicles, vehicles, drivers, safetyEvents } from "@/lib/data";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusDot from "@/components/ui/StatusDot";
import PageTransition from "@/components/PageTransition";

import "leaflet/dist/leaflet.css";

// ── Dynamic imports for react-leaflet (no SSR) ──
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false },
);
const LeafletTooltip = dynamic(
  () => import("react-leaflet").then((m) => m.Tooltip),
  { ssr: false },
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false },
);

// ── Seeded PRNG ──
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Direction config for Around View ──
const directionPos: Record<string, { cx: number; cy: number }> = {
  front: { cx: 200, cy: 55 },
  rear: { cx: 200, cy: 345 },
  left: { cx: 55, cy: 200 },
  right: { cx: 345, cy: 200 },
};
const directionLabel: Record<string, string> = {
  front: "전방",
  rear: "후방",
  left: "좌측",
  right: "우측",
};
const zoneConfig = [
  { id: "front", cx: 200, cy: 105, rx: 90, ry: 55 },
  { id: "rear", cx: 200, cy: 295, rx: 90, ry: 55 },
  { id: "left", cx: 105, cy: 200, rx: 55, ry: 90 },
  { id: "right", cx: 295, cy: 200, rx: 55, ry: 90 },
];
const cameraPositions = [
  { cx: 200, cy: 150, label: "F" },
  { cx: 200, cy: 250, label: "R" },
  { cx: 145, cy: 200, label: "L" },
  { cx: 255, cy: 200, label: "Ri" },
];
const levelColor: Record<string, string> = {
  safe: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  emergency: "#7C3AED",
};

// ── Detected object shapes for Around View ──
function DetectedObject({
  type,
  x,
  y,
  color,
}: {
  type: string;
  x: number;
  y: number;
  color: string;
}) {
  if (type === "pedestrian") {
    return (
      <g>
        <circle cx={x} cy={y - 6} r={4} fill={color} opacity={0.9} />
        <line x1={x} y1={y - 2} x2={x} y2={y + 8} stroke={color} strokeWidth={1.5} opacity={0.9} />
        <line x1={x - 4} y1={y + 3} x2={x + 4} y2={y + 3} stroke={color} strokeWidth={1.5} opacity={0.9} />
        <line x1={x} y1={y + 8} x2={x - 3} y2={y + 15} stroke={color} strokeWidth={1.5} opacity={0.9} />
        <line x1={x} y1={y + 8} x2={x + 3} y2={y + 15} stroke={color} strokeWidth={1.5} opacity={0.9} />
      </g>
    );
  }
  if (type === "vehicle") {
    return (
      <rect x={x - 10} y={y - 7} width={20} height={14} rx={3} fill={color} opacity={0.85} />
    );
  }
  return (
    <polygon
      points={`${x},${y - 8} ${x + 8},${y + 6} ${x - 8},${y + 6}`}
      fill={color}
      opacity={0.85}
    />
  );
}

// ── Event types for real-time feed ──
const eventTypes = [
  { type: "과속", severity: "danger", desc: "제한속도 초과 감지" },
  { type: "급제동", severity: "danger", desc: "급정거 감지 (G-force 초과)" },
  { type: "급가속", severity: "warning", desc: "급발진 감지" },
  { type: "졸음감지", severity: "danger", desc: "운전자 졸음 패턴 감지" },
  { type: "위험구역진입", severity: "warning", desc: "학교/주거 밀집구역 진입" },
  { type: "탱크압력이상", severity: "danger", desc: "탱크 내부 압력 임계치 초과" },
  { type: "사각지대경고", severity: "warning", desc: "사각지대 물체 감지" },
  { type: "안전복귀", severity: "safe", desc: "정상 운행 상태 복귀" },
] as const;

interface LiveEvent {
  id: string;
  time: string;
  severity: "danger" | "warning" | "safe";
  vehicle: string;
  eventType: string;
  description: string;
}

// ── Generate deterministic data ──
const rng14 = seededRng(20260414);

// Daily event trends (14 days)
const dailyEventTrend = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2026, 3, 1 + i);
  return {
    date: `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`,
    과속: Math.round(2 + rng14() * 6),
    급제동: Math.round(1 + rng14() * 5),
    기타: Math.round(1 + rng14() * 3),
  };
});

// Event type distribution
const eventDistribution = [
  { name: "과속", value: 32, color: "var(--color-danger, #DC2626)" },
  { name: "급제동", value: 24, color: "var(--color-warning, #D97706)" },
  { name: "급가속", value: 14, color: "#F59E0B" },
  { name: "위험구역", value: 12, color: "var(--color-brand, #1A6DB5)" },
  { name: "사각지대", value: 10, color: "var(--color-info, #3B82F6)" },
  { name: "기타", value: 8, color: "#9CA3AF" },
];
const eventDistTotal = eventDistribution.reduce((s, e) => s + e.value, 0);

// Monthly safety score trend (6 months)
const rngMonthly = seededRng(77777);
const monthlyScoreTrend = [
  { month: "11월", score: 70 + Math.round(rngMonthly() * 4) },
  { month: "12월", score: 73 + Math.round(rngMonthly() * 4) },
  { month: "1월", score: 76 + Math.round(rngMonthly() * 4) },
  { month: "2월", score: 79 + Math.round(rngMonthly() * 3) },
  { month: "3월", score: 82 + Math.round(rngMonthly() * 3) },
  { month: "4월", score: 85 + Math.round(rngMonthly() * 2) },
];

// ── Computed vehicle data for map ──
const rngVehicle = seededRng(42);
const vehicleMapData = allVehicles.map((v) => {
  const rand = rngVehicle();
  const speed = v.status === "running" ? 30 + Math.round(rand * 50) : 0;
  const isOverspeed = v.status === "running" && speed > 70;
  const safetyScore = Math.round(60 + rngVehicle() * 38);
  return {
    ...v,
    speed,
    isOverspeed,
    safetyScore,
    cargoType: v.productName,
  };
});

// Count metrics
const runningVehicles = allVehicles.filter((v) => v.status === "running");
const overspeedVehicles = vehicleMapData.filter((v) => v.isOverspeed);

// Danger zones
const dangerZones = [
  { center: [35.54, 129.33] as [number, number], label: "학교 밀집 구역", radius: 800 },
  { center: [35.51, 129.37] as [number, number], label: "주거 밀집 구역", radius: 800 },
];

// ── Generate initial events ──
function generateEvent(): LiveEvent {
  const et = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const v = runningVehicles[Math.floor(Math.random() * runningVehicles.length)];
  const now = new Date();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`,
    severity: et.severity as "danger" | "warning" | "safe",
    vehicle: v?.plateNumber ?? "84노1302",
    eventType: et.type,
    description: et.desc,
  };
}

function generateInitialEvents(count: number): LiveEvent[] {
  const events: LiveEvent[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const et = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const v = runningVehicles[Math.floor(Math.random() * runningVehicles.length)];
    const t = new Date(base.getTime() - (count - i) * 3000);
    events.push({
      id: `init-${i}`,
      time: `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}`,
      severity: et.severity as "danger" | "warning" | "safe",
      vehicle: v?.plateNumber ?? "84노1302",
      eventType: et.type,
      description: et.desc,
    });
  }
  return events.reverse();
}

// ── Safety grade calculation ──
const todayDangerCount = safetyEvents.filter(
  (e) => e.level === "danger" || e.level === "emergency",
).length;
const todayWarningCount = safetyEvents.filter(
  (e) => e.level === "warning",
).length;
const safetyGrade = todayDangerCount > 0 ? "C" : todayWarningCount > 0 ? "B" : "A";
const gradeColor =
  safetyGrade === "A"
    ? "bg-success text-white"
    : safetyGrade === "B"
      ? "bg-warning text-white"
      : "bg-danger text-white";
const gradeLabel =
  safetyGrade === "A"
    ? "양호"
    : safetyGrade === "B"
      ? "주의"
      : "경고";

// Most recent danger/warning event
const recentAlertEvent = safetyEvents.find(
  (e) => e.level === "danger" || e.level === "emergency" || e.level === "warning",
);

// ── Sort config ──
type SortKey = "safetyScore" | "suddenBrake" | "speeding" | "blindSpotWarning";

export default function SafetyPage() {
  // Live events
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>(() =>
    generateInitialEvents(8),
  );
  const feedRef = useRef<HTMLDivElement>(null);

  // Around view
  const [avEventIndex, setAvEventIndex] = useState(0);
  const [avPlaying, setAvPlaying] = useState(true);
  const avEvents = safetyEvents.filter((e) => e.direction);

  // Driver ranking sort
  const [sortKey, setSortKey] = useState<SortKey>("safetyScore");
  const [sortAsc, setSortAsc] = useState(false);

  const sortedDrivers = useMemo(() => {
    const arr = [...drivers];
    arr.sort((a, b) => {
      let aVal: number, bVal: number;
      if (sortKey === "safetyScore") {
        aVal = a.safetyScore;
        bVal = b.safetyScore;
      } else if (sortKey === "suddenBrake") {
        aVal = a.incidents.suddenBrake;
        bVal = b.incidents.suddenBrake;
      } else if (sortKey === "speeding") {
        aVal = a.incidents.speeding;
        bVal = b.incidents.speeding;
      } else {
        aVal = a.incidents.blindSpotWarning;
        bVal = b.incidents.blindSpotWarning;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return arr;
  }, [sortKey, sortAsc]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortAsc((a) => !a);
      } else {
        setSortKey(key);
        setSortAsc(key === "safetyScore" ? false : true);
      }
    },
    [sortKey],
  );

  // Auto-add live events every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveEvents((prev) => {
        const newEvent = generateEvent();
        return [newEvent, ...prev].slice(0, 15);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Scroll feed to top on new event
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [liveEvents]);

  // Around view cycling
  useEffect(() => {
    if (!avPlaying || avEvents.length === 0) return;
    const interval = setInterval(() => {
      setAvEventIndex((prev) => (prev + 1) % avEvents.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [avPlaying, avEvents.length]);

  const currentAvEvent = avEvents.length > 0 ? avEvents[avEventIndex % avEvents.length] : null;
  const activeDirection = currentAvEvent?.direction ?? null;
  const activeLevel = currentAvEvent?.level ?? "safe";

  // Column sort indicator
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-text-muted opacity-50" />;
    return sortAsc ? (
      <ChevronUp size={12} className="text-brand" />
    ) : (
      <ChevronDown size={12} className="text-brand" />
    );
  };

  return (
    <PageTransition>
      {/* ── CSS for pulse animation ── */}
      <style jsx global>{`
        @keyframes alert-pulse {
          0%, 100% { r: 8; opacity: 1; }
          50% { r: 14; opacity: 0.4; }
        }
        .alert-pulse-marker {
          animation: alert-pulse 1.2s ease-in-out infinite;
        }
        @keyframes live-dot-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .live-dot {
          animation: live-dot-pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Section 1: Safety Status Banner */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 rounded-[--radius-lg] py-5 px-6 mb-4">
        <div className="flex items-center gap-6">
          {/* Left: Safety Grade */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${gradeColor} shadow-lg text-3xl font-black`}
            >
              {safetyGrade}
            </div>
            <span className="text-white/70 text-xs mt-1.5">오늘 안전 등급</span>
            <span className="text-white text-[11px] font-semibold">{gradeLabel}</span>
          </div>

          {/* Center: Key Metrics */}
          <div className="flex-1 grid grid-cols-4 gap-4">
            {[
              {
                label: "운행 차량",
                value: runningVehicles.length,
                unit: "대",
                icon: Truck,
                color: "text-emerald-400",
              },
              {
                label: "안전 이벤트",
                value: safetyEvents.length,
                unit: "건",
                icon: Activity,
                color: "text-amber-400",
              },
              {
                label: "위험물 적재",
                value: runningVehicles.length,
                unit: "대",
                icon: Flame,
                color: "text-orange-400",
              },
              {
                label: "과속 차량",
                value: overspeedVehicles.length,
                unit: "대",
                icon: GaugeIcon,
                color: "text-red-400",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white/10 backdrop-blur-sm rounded-[--radius-md] px-4 py-3 text-center"
              >
                <m.icon size={18} className={`${m.color} mx-auto mb-1`} />
                <p className="text-white/60 text-[11px]">{m.label}</p>
                <p className="text-white text-xl font-bold tabular-nums leading-tight">
                  {m.value}
                  <span className="text-sm font-normal text-white/50 ml-0.5">{m.unit}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Right: Most Recent Alert */}
          <div className="w-[260px] shrink-0">
            {recentAlertEvent ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-[--radius-md] px-4 py-3 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-white/50 text-[11px]">최근 알림</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white/60 text-xs tabular-nums">{recentAlertEvent.time}</span>
                  <span className="text-white text-xs font-semibold">{recentAlertEvent.vehicle}</span>
                </div>
                <p className="text-white/80 text-sm leading-snug">{recentAlertEvent.typeName}</p>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-[--radius-md] px-4 py-3 text-center">
                <ShieldCheck size={20} className="text-emerald-400 mx-auto mb-1" />
                <p className="text-white/70 text-sm">이상 없음</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Section 2: Real-time Monitoring */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "1fr 400px" }}>
        {/* Left: Safety Map */}
        <Card padding="sm" className="!p-0 overflow-hidden h-[450px]">
          <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
            <MapPin size={16} className="text-brand" />
            <h3 className="text-base font-semibold text-text-primary">실시간 안전 지도</h3>
            <Badge variant="blue" size="xs">LIVE</Badge>
          </div>
          <div className="relative" style={{ height: 400 }}>
            <MapContainer
              center={[35.52, 129.35]}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
              attributionControl={false}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

              {/* Danger zones */}
              {dangerZones.map((zone) => (
                <Circle
                  key={zone.label}
                  center={zone.center}
                  radius={zone.radius}
                  pathOptions={{
                    color: "#DC2626",
                    fillColor: "#DC2626",
                    fillOpacity: 0.08,
                    weight: 1.5,
                    dashArray: "6 4",
                  }}
                >
                  <LeafletTooltip direction="top" permanent className="!bg-red-50 !text-red-700 !border-red-200 !text-[11px] !font-semibold !shadow-sm">
                    {zone.label}
                  </LeafletTooltip>
                </Circle>
              ))}

              {/* Vehicle markers */}
              {vehicleMapData.map((v) => {
                let fillColor = "#9CA3AF"; // idle gray
                let radius = 5;
                if (v.status === "running" && v.isOverspeed) {
                  fillColor = "#DC2626";
                  radius = 8;
                } else if (v.status === "warning") {
                  fillColor = "#D97706";
                  radius = 7;
                } else if (v.status === "running") {
                  fillColor = "#059669";
                  radius = 6;
                }

                return (
                  <CircleMarker
                    key={v.id}
                    center={[v.lat, v.lng]}
                    radius={radius}
                    pathOptions={{
                      color: fillColor,
                      fillColor,
                      fillOpacity: 0.9,
                      weight: v.isOverspeed ? 3 : 2,
                      opacity: 1,
                    }}
                    className={v.isOverspeed ? "alert-pulse-marker" : ""}
                  >
                    <LeafletTooltip direction="top" className="!text-xs !leading-relaxed">
                      <div className="font-semibold">{v.plateNumber}</div>
                      <div>{v.driver} 기사</div>
                      <div>속도: {v.speed}km/h {v.isOverspeed ? "(과속!)" : ""}</div>
                      <div>화물: {v.cargoType}</div>
                      <div>안전점수: {v.safetyScore}점</div>
                    </LeafletTooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* Legend overlay */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-[--radius-md] px-3 py-2.5 shadow-[--shadow-sm] border border-border-light">
              <p className="text-[10px] font-semibold text-text-muted mb-1.5 uppercase tracking-wider">범례</p>
              <div className="space-y-1">
                {[
                  { color: "#059669", label: "정상 운행" },
                  { color: "#DC2626", label: "과속 차량" },
                  { color: "#D97706", label: "경고 상태" },
                  { color: "#9CA3AF", label: "대기 중" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] text-text-secondary">{item.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 pt-0.5 border-t border-border-light mt-1">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-dashed border-red-400 bg-red-50" />
                  <span className="text-[11px] text-text-secondary">위험 구역</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Right: Real-time Event Feed */}
        <Card padding="sm" className="!p-0 overflow-hidden flex flex-col h-[450px]">
          <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
            <Radio size={16} className="text-brand" />
            <h3 className="text-base font-semibold text-text-primary">실시간 안전 이벤트</h3>
            <span className="live-dot ml-auto w-2 h-2 rounded-full bg-success inline-block" />
            <span className="text-[11px] text-success font-medium">LIVE</span>
          </div>
          <div ref={feedRef} className="flex-1 overflow-y-auto custom-scroll">
            <AnimatePresence initial={false}>
              {liveEvents.map((evt) => {
                const isDanger = evt.severity === "danger";
                const bgClass = isDanger ? "bg-danger-bg" : "";
                const sevBadge: "danger" | "warning" | "safe" =
                  evt.severity === "danger"
                    ? "danger"
                    : evt.severity === "warning"
                      ? "warning"
                      : "safe";
                return (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-start gap-2.5 px-4 py-2.5 border-b border-border-light last:border-0 ${bgClass}`}
                  >
                    <StatusDot status={evt.severity === "safe" ? "running" : evt.severity} size={8} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-text-muted tabular-nums">{evt.time}</span>
                        <Badge variant="blue" size="xs">{evt.vehicle}</Badge>
                        <Badge variant={sevBadge} size="xs">{evt.eventType}</Badge>
                      </div>
                      <p className="text-[13px] text-text-secondary leading-snug mt-0.5">{evt.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Section 3: Driver Safety + Around View */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Left: Driver Safety Ranking */}
        <Card padding="sm" className="!p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
            <Trophy size={16} className="text-warning" />
            <h3 className="text-base font-semibold text-text-primary">기사별 안전 점수</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-secondary">
                  <th className="text-left px-3 py-2.5 text-xs text-text-muted font-semibold w-12">순위</th>
                  <th className="text-left px-3 py-2.5 text-xs text-text-muted font-semibold">기사명</th>
                  <th className="text-left px-3 py-2.5 text-xs text-text-muted font-semibold">차량번호</th>
                  <th
                    className="text-center px-3 py-2.5 text-xs text-text-muted font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                    onClick={() => handleSort("safetyScore")}
                  >
                    <span className="inline-flex items-center gap-1">
                      안전점수 <SortIcon col="safetyScore" />
                    </span>
                  </th>
                  <th
                    className="text-center px-3 py-2.5 text-xs text-text-muted font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                    onClick={() => handleSort("suddenBrake")}
                  >
                    <span className="inline-flex items-center gap-1">
                      급제동 <SortIcon col="suddenBrake" />
                    </span>
                  </th>
                  <th
                    className="text-center px-3 py-2.5 text-xs text-text-muted font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                    onClick={() => handleSort("speeding")}
                  >
                    <span className="inline-flex items-center gap-1">
                      과속 <SortIcon col="speeding" />
                    </span>
                  </th>
                  <th
                    className="text-center px-3 py-2.5 text-xs text-text-muted font-semibold cursor-pointer select-none hover:text-text-primary transition-colors"
                    onClick={() => handleSort("blindSpotWarning")}
                  >
                    <span className="inline-flex items-center gap-1">
                      사각지대 <SortIcon col="blindSpotWarning" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDrivers.map((d, idx) => {
                  const scoreColor =
                    d.safetyScore >= 90
                      ? "text-success"
                      : d.safetyScore >= 70
                        ? "text-warning"
                        : "text-danger";
                  const rankIcon =
                    sortKey === "safetyScore" && !sortAsc
                      ? idx === 0
                        ? <Trophy size={14} className="text-yellow-500" />
                        : idx === 1
                          ? <Medal size={14} className="text-gray-400" />
                          : idx === 2
                            ? <Medal size={14} className="text-amber-600" />
                            : <span className="text-text-muted tabular-nums text-xs">{idx + 1}</span>
                      : <span className="text-text-muted tabular-nums text-xs">{idx + 1}</span>;

                  return (
                    <tr
                      key={d.name}
                      className="border-b border-border-light last:border-0 hover:bg-surface-secondary transition-colors"
                    >
                      <td className="px-3 py-2.5 text-center">{rankIcon}</td>
                      <td className="px-3 py-2.5 font-medium text-text-primary">{d.name}</td>
                      <td className="px-3 py-2.5 text-text-secondary tabular-nums text-xs">{d.vehicle}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`text-base font-bold tabular-nums ${scoreColor}`}>
                          {d.safetyScore}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-text-secondary">
                        {d.incidents.suddenBrake > 0 ? (
                          <span className="text-danger font-semibold">{d.incidents.suddenBrake}</span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-text-secondary">
                        {d.incidents.speeding > 0 ? (
                          <span className="text-danger font-semibold">{d.incidents.speeding}</span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center tabular-nums text-text-secondary">
                        {d.incidents.blindSpotWarning > 0 ? (
                          <span className="text-warning font-semibold">{d.incidents.blindSpotWarning}</span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right: Around View Simulation */}
        <Card padding="sm" className="!p-0 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-brand" />
              <h3 className="text-base font-semibold text-text-primary">어라운드뷰 모니터링</h3>
              {currentAvEvent && (
                <Badge
                  variant={
                    currentAvEvent.level === "danger" || currentAvEvent.level === "emergency"
                      ? "danger"
                      : currentAvEvent.level === "warning"
                        ? "warning"
                        : "safe"
                  }
                >
                  {currentAvEvent.levelName}
                </Badge>
              )}
            </div>
            <button
              onClick={() => setAvPlaying((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius-md] border border-border text-xs font-medium text-text-secondary hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              {avPlaying ? (
                <>
                  <Pause size={12} /> 일시정지
                </>
              ) : (
                <>
                  <Play size={12} /> 재생
                </>
              )}
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            {/* SVG Around View */}
            <div className="flex-1 flex items-center justify-center p-3">
              <svg
                viewBox="0 0 400 400"
                className="bg-gray-900 rounded-[--radius-md] w-full"
                style={{ maxHeight: 280, aspectRatio: "1", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)" }}
              >
                {/* Grid */}
                {[80, 160, 240, 320].map((v) => (
                  <g key={v}>
                    <line x1={v} y1={0} x2={v} y2={400} stroke="#1f2937" strokeWidth={0.5} />
                    <line x1={0} y1={v} x2={400} y2={v} stroke="#1f2937" strokeWidth={0.5} />
                  </g>
                ))}

                {/* Distance rings */}
                {["3m", "5m"].map((label, i) => {
                  const r = 80 + i * 50;
                  return (
                    <g key={label}>
                      <circle cx={200} cy={200} r={r} fill="none" stroke="#374151" strokeWidth={0.5} strokeDasharray="4 4" />
                      <text x={200 + r - 5} y={195} fill="#4B5563" fontSize={8}>{label}</text>
                    </g>
                  );
                })}

                {/* Detection zones */}
                {zoneConfig.map((zone) => {
                  const isActive = zone.id === activeDirection;
                  const fillColor = isActive ? (levelColor[activeLevel] ?? levelColor.safe) : levelColor.safe;
                  return (
                    <ellipse
                      key={zone.id}
                      cx={zone.cx}
                      cy={zone.cy}
                      rx={zone.rx}
                      ry={zone.ry}
                      fill={fillColor}
                      opacity={isActive ? 0.25 : 0.06}
                      stroke={fillColor}
                      strokeWidth={isActive ? 2 : 0.5}
                      strokeOpacity={isActive ? 0.7 : 0.1}
                      style={{ transition: "all 0.5s ease" }}
                    />
                  );
                })}

                {/* Direction labels */}
                {zoneConfig.map((zone) => (
                  <text
                    key={`label-${zone.id}`}
                    x={zone.cx}
                    y={
                      zone.id === "front"
                        ? zone.cy - zone.ry + 14
                        : zone.id === "rear"
                          ? zone.cy + zone.ry - 6
                          : zone.cy
                    }
                    textAnchor="middle"
                    fill={zone.id === activeDirection ? "#E5E7EB" : "#4B5563"}
                    fontSize={10}
                    fontWeight={zone.id === activeDirection ? 600 : 400}
                    style={{ transition: "fill 0.5s ease" }}
                  >
                    {directionLabel[zone.id]}
                  </text>
                ))}

                {/* Truck body */}
                <rect x={160} y={175} width={80} height={50} rx={7} fill="#374151" stroke="#4B5563" strokeWidth={1.5} />
                <rect x={175} y={163} width={50} height={16} rx={4} fill="#4B5563" stroke="#6B7280" strokeWidth={1} />
                <text x={200} y={205} textAnchor="middle" fill="#6B7280" fontSize={8} fontWeight={600}>TANK</text>

                {/* Camera dots */}
                {cameraPositions.map((cam) => (
                  <g key={cam.label}>
                    <circle cx={cam.cx} cy={cam.cy} r={7} fill="#1A6DB5" opacity={0.85} />
                    <text x={cam.cx} y={cam.cy + 3} textAnchor="middle" fill="white" fontSize={6} fontWeight={700}>
                      {cam.label}
                    </text>
                  </g>
                ))}

                {/* Animated detected object */}
                <AnimatePresence mode="wait">
                  {currentAvEvent && currentAvEvent.direction && currentAvEvent.type !== "clear" && (
                    <motion.g
                      key={`${avEventIndex}-${currentAvEvent.type}`}
                      initial={{
                        opacity: 0,
                        x: directionPos[currentAvEvent.direction]?.cx ?? 200,
                        y: directionPos[currentAvEvent.direction]?.cy ?? 200,
                      }}
                      animate={{
                        opacity: 1,
                        x: 200 + ((directionPos[currentAvEvent.direction]?.cx ?? 200) - 200) * 0.55,
                        y: 200 + ((directionPos[currentAvEvent.direction]?.cy ?? 200) - 200) * 0.55,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                    >
                      <DetectedObject
                        type={currentAvEvent.type}
                        x={0}
                        y={0}
                        color={levelColor[currentAvEvent.level] ?? levelColor.safe}
                      />
                    </motion.g>
                  )}
                </AnimatePresence>

                {/* HUD */}
                {currentAvEvent && (
                  <g>
                    <rect x={8} y={8} width={160} height={38} rx={8} fill="black" opacity={0.55} />
                    <circle cx={22} cy={22} r={4} fill={levelColor[currentAvEvent.level] ?? levelColor.safe}>
                      {(currentAvEvent.level === "danger" || currentAvEvent.level === "emergency") && (
                        <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
                      )}
                    </circle>
                    <text x={32} y={22} fill="white" fontSize={10} fontWeight={600}>{currentAvEvent.typeName}</text>
                    <text x={32} y={36} fill="#9CA3AF" fontSize={8}>
                      {currentAvEvent.direction
                        ? `${directionLabel[currentAvEvent.direction]} ${currentAvEvent.distance}m`
                        : currentAvEvent.levelName}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* Compact event log below */}
            <div className="border-t border-border-light px-4 py-2 max-h-[120px] overflow-y-auto custom-scroll">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">최근 감지</p>
              {safetyEvents.slice(0, 5).map((evt, i) => {
                const evtColor =
                  evt.level === "emergency" || evt.level === "danger"
                    ? "text-danger"
                    : evt.level === "warning"
                      ? "text-warning"
                      : "text-success";
                return (
                  <div key={i} className="flex items-center gap-2 py-0.5">
                    <span className="text-[11px] text-text-muted tabular-nums">{evt.time}</span>
                    <StatusDot status={evt.level === "emergency" ? "danger" : evt.level} size={6} />
                    <span className={`text-[11px] ${evtColor}`}>{evt.typeName}</span>
                    <span className="text-[10px] text-text-muted ml-auto">
                      {evt.direction ? `${directionLabel[evt.direction]} ${evt.distance}m` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* Section 4: Safety Statistics */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-4">
        {/* Left: Daily Event Trend */}
        <Card padding="sm" className="!p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
            <BarChart3 size={16} className="text-brand" />
            <h3 className="text-base font-semibold text-text-primary">일별 안전 이벤트 추이</h3>
          </div>
          <div className="px-3 py-3" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyEventTrend} barGap={0}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light, #E5E7EB)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--color-text-muted, #9CA3AF)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--color-text-muted, #9CA3AF)" }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <RTooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--color-border-light, #E5E7EB)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="과속" stackId="a" fill="var(--color-danger, #DC2626)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="급제동" stackId="a" fill="var(--color-warning, #D97706)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="기타" stackId="a" fill="#9CA3AF" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Center: Event Type Distribution */}
        <Card padding="sm" className="!p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
            <PieChartIcon size={16} className="text-brand" />
            <h3 className="text-base font-semibold text-text-primary">이벤트 유형별 분포</h3>
          </div>
          <div className="px-3 py-3 flex items-center" style={{ height: 220 }}>
            <div className="w-1/2" style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {eventDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid var(--color-border-light, #E5E7EB)",
                    }}
                    formatter={(value) => [`${value}건 (${Math.round((Number(value) / eventDistTotal) * 100)}%)`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-1.5 pl-2">
              {eventDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-text-secondary flex-1">{entry.name}</span>
                  <span className="text-xs font-bold tabular-nums text-text-primary">
                    {Math.round((entry.value / eventDistTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Right: Monthly Safety Score Trend */}
        <Card padding="sm" className="!p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
            <TrendingUp size={16} className="text-brand" />
            <h3 className="text-base font-semibold text-text-primary">월간 안전점수 추이</h3>
          </div>
          <div className="px-3 py-3" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyScoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light, #E5E7EB)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "var(--color-text-muted, #9CA3AF)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[60, 100]}
                  tick={{ fontSize: 10, fill: "var(--color-text-muted, #9CA3AF)" }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <RTooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--color-border-light, #E5E7EB)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value) => [`${value}점`, "안전점수"]}
                />
                <ReferenceLine
                  y={80}
                  stroke="#9CA3AF"
                  strokeDasharray="5 5"
                  label={{
                    value: "목표",
                    position: "insideTopRight",
                    fill: "#9CA3AF",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-brand, #1A6DB5)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "var(--color-brand, #1A6DB5)", strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
