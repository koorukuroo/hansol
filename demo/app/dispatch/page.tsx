"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Sparkles, Route, Loader2, CheckCircle2, BrainCircuit, GripVertical, Clock, Droplets, ChevronDown, ChevronUp, AlertTriangle, MapPin, Timer, Package } from "lucide-react";
import { motion, AnimatePresence, Reorder } from "framer-motion";

import { customers, vehicles } from "@/lib/data";
import Card from "@/components/ui/Card";
import ProductDot from "@/components/ui/ProductDot";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
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
const Polyline = dynamic(
  () => import("react-leaflet").then((m) => m.Polyline),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false },
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false },
);

// ── Priority system ──
type Priority = "urgent" | "high" | "normal";
const priorityConfig: Record<Priority, { label: string; bg: string; border: string; text: string }> = {
  urgent: { label: "긴급", bg: "bg-red-50", border: "border-l-danger", text: "text-danger" },
  high:   { label: "높음", bg: "bg-amber-50", border: "border-l-warning", text: "text-warning" },
  normal: { label: "보통", bg: "bg-surface", border: "border-l-border-light", text: "text-text-muted" },
};

// ── Delivery requests ──
interface DeliveryRequest {
  id: string;
  customerId: string;
  name: string;
  product: string;
  productName: string;
  quantity: number;
  type: "VMI" | "카톡";
  priority: Priority;
  tankLevel: number;
  depletionDays: number;
  requestTime: string;
  note?: string;
}

const initialRequests: DeliveryRequest[] = [
  { id: "D001", customerId: "C004", name: "삼성SDI", product: "N2", productName: "액화질소", quantity: 3500, type: "VMI", priority: "urgent", tankLevel: 8, depletionDays: 0.9, requestTime: "VMI 자동", note: "고갈 임박 — 즉시 배송 필요" },
  { id: "D002", customerId: "C002", name: "에쓰오일", product: "N2", productName: "액화질소", quantity: 6000, type: "VMI", priority: "urgent", tankLevel: 12, depletionDays: 1.7, requestTime: "VMI 자동", note: "정기보수 종료 후 소비량 급증" },
  { id: "D003", customerId: "C001", name: "현대미포조선", product: "N2", productName: "액화질소", quantity: 4000, type: "VMI", priority: "high", tankLevel: 18, depletionDays: 2.1, requestTime: "VMI 자동" },
  { id: "D004", customerId: "C014", name: "현대중공업", product: "AR", productName: "액화알곤", quantity: 4800, type: "VMI", priority: "high", tankLevel: 15, depletionDays: 2.1, requestTime: "VMI 자동" },
  { id: "D005", customerId: "C006", name: "SK에너지", product: "O2", productName: "액화산소", quantity: 5000, type: "카톡", priority: "high", tankLevel: 28, depletionDays: 4.4, requestTime: "14:10 카톡" },
  { id: "D006", customerId: "C003", name: "포스코", product: "AR", productName: "액화알곤", quantity: 3000, type: "카톡", priority: "normal", tankLevel: 35, depletionDays: 6.6, requestTime: "13:45 카톡" },
  { id: "D007", customerId: "C009", name: "울산대학교병원", product: "O2-M", productName: "의료용산소", quantity: 1400, type: "카톡", priority: "high", tankLevel: 22, depletionDays: 3.7, requestTime: "12:50 카톡", note: "의료기관 — 우선 배송" },
  { id: "D008", customerId: "C011", name: "한화솔루션 울산", product: "N2", productName: "액화질소", quantity: 4200, type: "카톡", priority: "normal", tankLevel: 40, depletionDays: 6.3, requestTime: "11:30 카톡" },
];

// Route colors
const beforeColors = ["#EF4444", "#F97316", "#DC2626", "#EA580C", "#F87171"];
const afterColors = ["#22C55E", "#3B82F6", "#16A34A", "#2563EB", "#4ADE80"];

// 본사 좌표
const HQ = { name: "본사 (울산)", lat: 35.5234, lng: 129.3456 };

// 사용 가능 차량 (운행 중인 벌크 차량)
const availableVehicles = vehicles.filter((v) => v.status === "running").slice(0, 5);

// 두 좌표 간 거리 (km, 직선)
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 경로 총 거리 계산
function routeDistance(stops: { lat: number; lng: number }[]) {
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    total += haversine(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng);
  }
  return Math.round(total * 1.3); // 1.3x = 직선→도로 보정
}

interface OptStop {
  name: string;
  lat: number;
  lng: number;
  quantity?: number;
  product?: string;
  etaMin?: number; // 본사 출발 후 예상 소요시간 (분)
}

interface OptRoute {
  vehicleId: string;
  plateNumber: string;
  driver: string;
  stops: OptStop[];
  distance: number;
  deliveries: number;
  totalTimeMin: number; // 총 예상 소요시간 (분)
}

// 거리 기반 예상 시간 (분). 평균 40km/h + 거래처당 정차 20분
function estimateTime(distKm: number, stopCount: number) {
  return Math.round((distKm / 40) * 60 + stopCount * 20);
}

// 경로에 ETA 계산 부착
function attachETA(route: OptRoute) {
  let cumDist = 0;
  for (let i = 1; i < route.stops.length; i++) {
    const prev = route.stops[i - 1];
    const cur = route.stops[i];
    cumDist += haversine(prev.lat, prev.lng, cur.lat, cur.lng) * 1.3;
    cur.etaMin = estimateTime(cumDist, i);
  }
  route.totalTimeMin = estimateTime(route.distance, route.deliveries);
}

// Before: 비효율 배정 (라운드로빈, 교차 경로)
function generateBeforeRoutes(selectedRequests: DeliveryRequest[]): OptRoute[] {
  const vCount = Math.min(availableVehicles.length, Math.ceil(selectedRequests.length / 2));
  const routes: OptRoute[] = availableVehicles.slice(0, vCount).map((v) => ({
    vehicleId: v.id, plateNumber: v.plateNumber, driver: v.driver,
    stops: [{ ...HQ }], distance: 0, deliveries: 0, totalTimeMin: 0,
  }));
  selectedRequests.forEach((req, i) => {
    const c = customers.find((cc) => cc.id === req.customerId);
    if (!c) return;
    const r = routes[i % vCount];
    r.stops.push({ name: req.name, lat: c.lat, lng: c.lng, quantity: req.quantity, product: req.product });
    r.deliveries++;
  });
  routes.forEach((r) => { r.stops.push({ ...HQ }); r.distance = routeDistance(r.stops); attachETA(r); });
  return routes;
}

// After: 최적화 배정 (nearest-neighbor 클러스터링)
function generateAfterRoutes(selectedRequests: DeliveryRequest[]): OptRoute[] {
  const vCount = Math.min(availableVehicles.length, Math.ceil(selectedRequests.length / 2));
  const routes: OptRoute[] = availableVehicles.slice(0, vCount).map((v) => ({
    vehicleId: v.id, plateNumber: v.plateNumber, driver: v.driver,
    stops: [{ ...HQ }], distance: 0, deliveries: 0, totalTimeMin: 0,
  }));

  const points = selectedRequests.map((req) => {
    const c = customers.find((cc) => cc.id === req.customerId);
    return { name: req.name, lat: c?.lat ?? 35.52, lng: c?.lng ?? 129.35, quantity: req.quantity, product: req.product, assigned: false };
  });

  for (const r of routes) {
    let current = HQ;
    const remaining = points.filter((p) => !p.assigned).length;
    const unstarted = routes.filter((rr) => rr.deliveries === 0).length;
    const maxPerVehicle = Math.ceil(remaining / unstarted) || 2;
    for (let j = 0; j < maxPerVehicle; j++) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let k = 0; k < points.length; k++) {
        if (points[k].assigned) continue;
        const d = haversine(current.lat, current.lng, points[k].lat, points[k].lng);
        if (d < bestDist) { bestDist = d; bestIdx = k; }
      }
      if (bestIdx === -1) break;
      points[bestIdx].assigned = true;
      r.stops.push({ name: points[bestIdx].name, lat: points[bestIdx].lat, lng: points[bestIdx].lng, quantity: points[bestIdx].quantity, product: points[bestIdx].product });
      r.deliveries++;
      current = points[bestIdx];
    }
  }
  points.filter((p) => !p.assigned).forEach((p) => {
    const last = routes[routes.length - 1];
    last.stops.push({ name: p.name, lat: p.lat, lng: p.lng, quantity: p.quantity, product: p.product });
    last.deliveries++;
  });
  routes.forEach((r) => { r.stops.push({ ...HQ }); r.distance = routeDistance(r.stops); attachETA(r); });
  return routes.filter((r) => r.deliveries > 0);
}

// ── Optimization step definitions (dynamic) ──
function getOptSteps(count: number, vehicleCount: number) {
  return [
    { label: "배송 데이터 분석", detail: `${count}건 배송 요청 + 거래처 위치 로딩` },
    { label: "차량 상태 확인", detail: `가용 차량 ${vehicleCount}대, 적재량·정비 일정 확인` },
    { label: "경로 최적화 (OR-Tools)", detail: "TSP/VRP 솔버 실행 중..." },
    { label: "차량-경로 매칭", detail: "제품 적합성·거리 최소화 배정" },
    { label: "최종 검증 완료", detail: "제약 조건 충족, 배차 확정" },
  ];
}

export default function DispatchPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [mapTab, setMapTab] = useState<"before" | "after">("after");
  const [optStep, setOptStep] = useState(-1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [beforeRoutes, setBeforeRoutes] = useState<OptRoute[]>([]);
  const [afterRoutes, setAfterRoutes] = useState<OptRoute[]>([]);
  const [optSteps, setOptSteps] = useState(getOptSteps(0, 0));
  const [focusedDriver, setFocusedDriver] = useState<string | null>(null);
  const stepTimer = useRef<ReturnType<typeof setTimeout>[]>([]);

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checked.size === requests.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(requests.map((d) => d.id)));
    }
  };

  const cyclePriority = useCallback((id: string) => {
    setRequests((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const cycle: Priority[] = ["urgent", "high", "normal"];
        const next = cycle[(cycle.indexOf(d.priority) + 1) % cycle.length];
        return { ...d, priority: next };
      }),
    );
  }, []);

  const selectedCount = checked.size;
  const urgentCount = requests.filter((d) => d.priority === "urgent").length;
  const highCount = requests.filter((d) => d.priority === "high").length;

  const handleOptimize = () => {
    const selectedReqs = requests.filter((d) => checked.has(d.id));
    if (selectedReqs.length === 0) return;

    // 선택된 요청으로 Before/After 경로 생성
    const bRoutes = generateBeforeRoutes(selectedReqs);
    const aRoutes = generateAfterRoutes(selectedReqs);
    setBeforeRoutes(bRoutes);
    setAfterRoutes(aRoutes);

    const steps = getOptSteps(selectedReqs.length, Math.min(availableVehicles.length, Math.ceil(selectedReqs.length / 2)));
    setOptSteps(steps);

    setLoading(true);
    setOptimized(false);
    setOptStep(0);

    stepTimer.current.forEach(clearTimeout);
    stepTimer.current = [];

    steps.forEach((_, i) => {
      if (i === 0) return;
      stepTimer.current.push(setTimeout(() => setOptStep(i), i * 700));
    });

    stepTimer.current.push(
      setTimeout(() => {
        setLoading(false);
        setOptimized(true);
        setOptStep(-1);
        setMapTab("after");
      }, steps.length * 700 + 400),
    );
  };

  useEffect(() => {
    return () => stepTimer.current.forEach(clearTimeout);
  }, []);

  const currentRoutes = mapTab === "before" ? beforeRoutes : afterRoutes;
  const routeColors = mapTab === "before" ? beforeColors : afterColors;

  const beforeTotal = beforeRoutes.reduce((s, r) => s + r.distance, 0);
  const afterTotal = afterRoutes.reduce((s, r) => s + r.distance, 0);
  const distReduction = beforeTotal > 0 ? Math.round((1 - afterTotal / beforeTotal) * 100) : 0;

  // Build polylines — filter by focusedDriver if set
  const visibleRoutes = focusedDriver
    ? currentRoutes.filter((r) => r.driver === focusedDriver)
    : currentRoutes;

  const polylines = visibleRoutes.map((r, i) => {
    const origIdx = currentRoutes.indexOf(r);
    return {
      positions: r.stops.map((s) => [s.lat, s.lng] as [number, number]),
      color: routeColors[origIdx % routeColors.length],
      vehicle: r.plateNumber,
      driver: r.driver,
      stops: r.stops,
    };
  });

  // All stop points (for markers)
  const allStops = useMemo(() => {
    const seen = new Set<string>();
    const stops: OptStop[] = [];
    for (const r of visibleRoutes) {
      for (const s of r.stops) {
        const key = `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`;
        if (!seen.has(key)) {
          seen.add(key);
          stops.push(s);
        }
      }
    }
    return stops;
  }, [visibleRoutes]);

  return (
    <PageTransition>
      <div className="flex gap-4 h-[calc(100vh-80px)]">
        {/* ── Left Panel: Delivery Requests ── */}
        <div className="w-[380px] shrink-0 flex flex-col bg-surface rounded-[--radius-lg] border border-border-light shadow-[--shadow-sm] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-light">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-text-primary">
                배송 요청
                <span className="text-sm font-normal text-text-muted ml-1">{requests.length}건</span>
              </h2>
              <button onClick={toggleAll} className="text-xs text-brand hover:underline cursor-pointer">
                {checked.size === requests.length ? "전체 해제" : "전체 선택"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              {urgentCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-danger bg-danger-bg px-2 py-0.5 rounded-full">
                  <AlertTriangle size={10} /> 긴급 {urgentCount}
                </span>
              )}
              {highCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning-bg px-2 py-0.5 rounded-full">
                  높음 {highCount}
                </span>
              )}
              <span className="text-[10px] text-text-muted ml-auto">드래그로 순서 변경</span>
            </div>
          </div>

          {/* Reorderable list */}
          <Reorder.Group axis="y" values={requests} onReorder={setRequests} className="flex-1 overflow-y-auto custom-scroll">
            {requests.map((d) => {
              const isChecked = checked.has(d.id);
              const isExpanded = expandedId === d.id;
              const pc = priorityConfig[d.priority];
              return (
                <Reorder.Item key={d.id} value={d} className={`border-b border-border-light border-l-[3px] ${pc.border} transition-colors ${isChecked ? pc.bg : "bg-surface"}`}>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary shrink-0 touch-none"><GripVertical size={14} /></div>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleCheck(d.id)} className="w-5 h-5 rounded border-border text-brand accent-brand shrink-0 cursor-pointer" />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : d.id)}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-text-primary truncate">{d.name}</span>
                        <ProductDot product={d.product} size={6} />
                        <span className="text-xs text-text-muted">{d.quantity.toLocaleString()}kg</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-12 h-1.5 bg-border-light rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${d.tankLevel < 20 ? "bg-danger" : d.tankLevel < 40 ? "bg-warning" : "bg-success"}`} style={{ width: `${d.tankLevel}%` }} />
                        </div>
                        <span className="text-[10px] text-text-muted tabular-nums">{d.tankLevel}%</span>
                        <span className="text-[10px] text-text-muted">·</span>
                        <Droplets size={9} className="text-text-muted" />
                        <span className={`text-[10px] tabular-nums ${d.depletionDays < 3 ? "text-danger font-semibold" : "text-text-muted"}`}>{d.depletionDays}일</span>
                      </div>
                    </div>
                    <button onClick={() => cyclePriority(d.id)} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${pc.text} ${pc.bg} hover:opacity-80`} title="클릭으로 우선순위 변경">{pc.label}</button>
                    <Badge variant={d.type === "VMI" ? "blue" : "green"} size="xs">{d.type}</Badge>
                    <button onClick={() => setExpandedId(isExpanded ? null : d.id)} className="text-text-muted hover:text-text-secondary shrink-0">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="px-4 pb-3 pt-1 ml-6 space-y-1.5 text-xs border-t border-border-light/50">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div><span className="text-text-muted">제품</span><p className="text-text-primary font-medium">{d.productName}</p></div>
                            <div><span className="text-text-muted">수량</span><p className="text-text-primary font-medium">{d.quantity.toLocaleString()} kg</p></div>
                            <div><span className="text-text-muted">탱크 잔량</span><p className={`font-medium ${d.tankLevel < 20 ? "text-danger" : "text-text-primary"}`}>{d.tankLevel}% ({d.depletionDays}일 후 고갈)</p></div>
                            <div><span className="text-text-muted">요청</span><p className="text-text-primary font-medium flex items-center gap-1"><Clock size={10} /> {d.requestTime}</p></div>
                          </div>
                          {d.note && (
                            <div className="bg-warning-bg text-warning rounded-[--radius-sm] px-2.5 py-1.5 text-[11px] flex items-start gap-1.5">
                              <AlertTriangle size={11} className="shrink-0 mt-0.5" />{d.note}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>

          {/* Optimize Button */}
          <div className="p-3 border-t border-border-light">
            <button
              onClick={handleOptimize}
              disabled={selectedCount === 0 || loading}
              className={`w-full py-2.5 rounded-[--radius-md] text-white font-semibold text-base
                flex items-center justify-center gap-2 transition-all duration-200
                ${
                  selectedCount === 0
                    ? "bg-success opacity-50 cursor-not-allowed"
                    : loading
                      ? "bg-success cursor-wait"
                      : "bg-success hover:bg-green-700 cursor-pointer"
                }`}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  최적화 계산 중...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  AI 최적 배차 실행 ({selectedCount}건)
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Right Panel: Results ── */}
        <div className="flex-1 overflow-y-auto custom-scroll space-y-4 relative">
          {/* AI Optimization Overlay */}
          <AnimatePresence>
            {loading && (
              <motion.div
                className="absolute inset-0 z-30 flex items-center justify-center bg-surface/80 backdrop-blur-sm rounded-[--radius-lg]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex flex-col items-center w-[420px]">
                  {/* Pulsing brain icon */}
                  <motion.div
                    className="w-16 h-16 rounded-[--radius-lg] bg-success-bg flex items-center justify-center mb-6"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <BrainCircuit className="w-8 h-8 text-success" />
                  </motion.div>

                  <p className="text-lg font-bold text-text-primary mb-1">
                    AI 배차 최적화 실행 중
                  </p>
                  <p className="text-sm text-text-muted mb-6">
                    {selectedCount}건 배송 요청에 대해 최적 경로를 계산합니다
                  </p>

                  {/* Step list */}
                  <div className="w-full space-y-2.5">
                    {optSteps.map((step, i) => {
                      const done = i < optStep;
                      const active = i === optStep;
                      return (
                        <motion.div
                          key={i}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-[--radius-md] transition-colors duration-300 ${
                            active
                              ? "bg-success-bg border border-success/20"
                              : done
                                ? "bg-surface-secondary"
                                : "opacity-40"
                          }`}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: active || done ? 1 : 0.4, x: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.25 }}
                        >
                          <div className="shrink-0">
                            {done ? (
                              <CheckCircle2 size={18} className="text-success" />
                            ) : active ? (
                              <Loader2 size={18} className="text-success animate-spin" />
                            ) : (
                              <div className="w-[18px] h-[18px] rounded-full border-2 border-border" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${active ? "text-success" : done ? "text-text-secondary" : "text-text-muted"}`}>
                              {step.label}
                            </p>
                            {(active || done) && (
                              <p className="text-xs text-text-muted mt-0.5 truncate">
                                {step.detail}
                              </p>
                            )}
                          </div>
                          {done && (
                            <span className="text-xs text-success font-medium shrink-0">완료</span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full mt-5 h-1.5 bg-border-light rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-success rounded-full"
                      initial={{ width: "0%" }}
                      animate={{
                        width: `${Math.min(100, ((optStep + 1) / optSteps.length) * 100)}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!optimized && !loading ? (
            <div className="space-y-4">
              {/* Legacy dispatch comparison */}
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <Route size={18} className="text-text-muted" />
                  <h2 className="text-base font-semibold text-text-primary">기존 배차 방식</h2>
                  <Badge variant="warning">수작업</Badge>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  현재 덕양가스는 엑셀 배차판과 ERP 수동 입력으로 배차를 진행합니다.
                  좌측에서 배송 요청을 선택하고 <span className="font-semibold text-brand">AI 최적 배차</span>를 실행하면
                  자동으로 최적 경로가 계산됩니다.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[--radius-md] overflow-hidden border border-border-light">
                    <div className="bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary border-b border-border-light">
                      기존 ERP 배차 화면
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/legacy-dispatch.png" alt="기존 배차 화면" className="w-full h-auto" />
                  </div>
                  <div className="rounded-[--radius-md] overflow-hidden border border-border-light">
                    <div className="bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-text-secondary border-b border-border-light">
                      수기 거래내역장
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/legacy-ledger.jpg" alt="수기 거래장부" className="w-full h-auto" />
                  </div>
                </div>
              </Card>

              {/* Pain points */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "배차 소요시간", value: "40분+", desc: "기사별 수작업 배정", color: "text-danger" },
                  { label: "공차율", value: "7.6%", desc: "경로 최적화 없음", color: "text-warning" },
                  { label: "긴급배송 비율", value: "11%", desc: "수요 예측 부재", color: "text-warning" },
                ].map((p) => (
                  <Card key={p.label} hover={false} padding="md">
                    <p className="text-xs text-text-muted">{p.label}</p>
                    <p className={`text-2xl font-bold tabular-nums mt-1 ${p.color}`}>{p.value}</p>
                    <p className="text-xs text-text-muted mt-0.5">{p.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          ) : optimized ? (
            <>
              {/* Comparison Stats */}
              <div className="grid grid-cols-3 gap-3">
                <AnimatePresence>
                  {[
                    {
                      label: "총 주행거리",
                      before: `${beforeTotal.toLocaleString()}km`,
                      after: `${afterTotal.toLocaleString()}km`,
                      delta: `▼${distReduction}%`,
                    },
                    {
                      label: "배송 건수",
                      before: `${checked.size}건 (미최적화)`,
                      after: `${checked.size}건 / ${afterRoutes.length}대`,
                      delta: `차량 ${afterRoutes.length}대 배정`,
                    },
                    {
                      label: "배차 소요시간",
                      before: "40분 (수작업)",
                      after: "5분 (AI)",
                      delta: "▼88%",
                    },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.4, ease: "easeOut" }}
                    >
                      <Card hover={false}>
                        <p className="text-xs text-text-secondary">{stat.label}</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-sm text-text-muted line-through">
                            {stat.before}
                          </span>
                          <span className="text-sm text-text-muted">→</span>
                          <span className="text-2xl font-bold text-text-primary leading-none">
                            {stat.after}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-success mt-1">
                          {stat.delta}
                        </p>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Route Result Cards — click to focus */}
              <div className="space-y-2">
                {focusedDriver && (
                  <button onClick={() => setFocusedDriver(null)} className="text-xs text-brand hover:underline mb-1">
                    전체 경로 보기
                  </button>
                )}
                <AnimatePresence>
                  {afterRoutes.map((r, i) => {
                    const color = afterColors[i % afterColors.length];
                    const isFocused = focusedDriver === r.driver;
                    const isDimmed = focusedDriver !== null && !isFocused;
                    return (
                      <motion.div
                        key={r.vehicleId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: isDimmed ? 0.4 : 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.35, ease: "easeOut" }}
                      >
                        <div
                          className={`bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light cursor-pointer transition-all duration-200 overflow-hidden
                            ${isFocused ? "ring-2 ring-brand shadow-[--shadow-md]" : "hover:shadow-[--shadow-md] hover:-translate-y-px"}`}
                          onClick={() => setFocusedDriver(isFocused ? null : r.driver)}
                        >
                          {/* Header row */}
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: color }}>
                              <span className="text-[8px] text-white font-bold">{i + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-text-primary">
                                {r.driver}
                                <span className="font-normal text-text-muted ml-1.5">{r.plateNumber}</span>
                              </p>
                              <p className="text-xs text-text-muted mt-0.5">
                                {r.stops.filter(s => s.name !== HQ.name).map(s => s.name).join(" → ")}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold tabular-nums text-text-primary">{r.distance}km</p>
                              <div className="flex items-center gap-1 text-xs text-text-muted justify-end">
                                <Timer size={10} />
                                <span>약 {r.totalTimeMin}분</span>
                                <span className="text-border mx-0.5">|</span>
                                <span>{r.deliveries}곳</span>
                              </div>
                            </div>
                          </div>

                          {/* Expanded detail — stop-by-stop */}
                          <AnimatePresence>
                            {isFocused && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-3 border-t border-border-light">
                                  <div className="mt-3 space-y-0">
                                    {r.stops.map((stop, si) => {
                                      const isHQ = stop.name === HQ.name;
                                      const isLast = si === r.stops.length - 1;
                                      return (
                                        <div key={si} className="flex items-start gap-3">
                                          {/* Timeline */}
                                          <div className="flex flex-col items-center w-5 shrink-0">
                                            <div className={`w-3 h-3 rounded-full border-2 ${isHQ ? "border-brand bg-brand" : "border-current bg-surface"}`}
                                              style={{ borderColor: isHQ ? undefined : color, color }}
                                            />
                                            {!isLast && <div className="w-px flex-1 min-h-[28px] bg-border-light" />}
                                          </div>
                                          {/* Content */}
                                          <div className={`flex-1 pb-3 ${isLast ? "pb-0" : ""}`}>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5">
                                                {isHQ ? <MapPin size={11} className="text-brand" /> : <Package size={11} className="text-text-muted" />}
                                                <span className={`text-xs font-medium ${isHQ ? "text-brand" : "text-text-primary"}`}>
                                                  {isHQ ? (si === 0 ? "출발: 본사" : "복귀: 본사") : stop.name}
                                                </span>
                                                {stop.product && <ProductDot product={stop.product} size={5} />}
                                              </div>
                                              {stop.etaMin && (
                                                <span className="text-[10px] text-text-muted tabular-nums flex items-center gap-0.5">
                                                  <Timer size={9} />
                                                  {stop.etaMin}분
                                                </span>
                                              )}
                                            </div>
                                            {stop.quantity && (
                                              <p className="text-[10px] text-text-muted mt-0.5 ml-3.5">
                                                {stop.quantity.toLocaleString()}kg 배송
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Map with Before/After tabs */}
              <Card hover={false} className="p-0 overflow-hidden">
                {/* Pill-style tab buttons */}
                <div className="flex gap-1 p-2 bg-surface-secondary border-b border-border-light">
                  {(["before", "after"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setMapTab(tab)}
                      className={`flex-1 py-2 text-sm font-medium rounded-[--radius-md] transition-all duration-200 cursor-pointer
                        ${
                          mapTab === tab
                            ? tab === "after"
                              ? "text-white bg-success shadow-[--shadow-sm]"
                              : "text-white bg-danger shadow-[--shadow-sm]"
                            : "text-text-muted hover:text-text-secondary hover:bg-surface"
                        }`}
                    >
                      {tab === "before" ? "Before (기존)" : "After (AI 최적화)"}
                    </button>
                  ))}
                </div>

                {/* Map */}
                <div className="h-[400px]">
                  <MapContainer
                    center={[35.52, 129.35]}
                    zoom={12}
                    scrollWheelZoom={true}
                    className="h-full w-full"
                    attributionControl={false}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />

                    {/* Polylines with driver labels */}
                    {polylines.map((p, i) => (
                      <Polyline
                        key={`${mapTab}-${i}-${focusedDriver}`}
                        positions={p.positions}
                        pathOptions={{
                          color: p.color,
                          weight: focusedDriver ? 5 : 3,
                          opacity: 0.85,
                        }}
                      >
                        <Popup>
                          <div className="text-xs">
                            <p className="font-semibold">{p.driver} ({p.vehicle})</p>
                            <p className="text-gray-500">{p.stops.filter(s => s.name !== HQ.name).map(s => s.name).join(" → ")}</p>
                          </div>
                        </Popup>
                      </Polyline>
                    ))}

                    {/* Stop markers — color-coded by route */}
                    {polylines.map((p, pi) =>
                      p.stops.filter((s) => s.name !== HQ.name).map((s, si) => (
                        <CircleMarker
                          key={`${mapTab}-${pi}-${si}-${focusedDriver}`}
                          center={[s.lat, s.lng]}
                          radius={focusedDriver ? 8 : 6}
                          pathOptions={{
                            color: p.color,
                            fillColor: "#fff",
                            fillOpacity: 1,
                            weight: 2.5,
                          }}
                        >
                          <Popup>
                            <div className="text-xs">
                              <p className="font-semibold">{s.name}</p>
                              {s.quantity && <p>{s.quantity.toLocaleString()}kg</p>}
                              {s.etaMin && <p className="text-gray-500">도착 예상: 출발 후 {s.etaMin}분</p>}
                              <p className="text-gray-400">{p.driver} 배정</p>
                            </div>
                          </Popup>
                        </CircleMarker>
                      ))
                    )}

                    {/* HQ marker */}
                    <CircleMarker
                      center={[HQ.lat, HQ.lng]}
                      radius={8}
                      pathOptions={{ color: "var(--color-brand)", fillColor: "var(--color-brand)", fillOpacity: 1, weight: 0 }}
                    >
                      <Popup><span className="text-xs font-semibold">본사 (울산)</span></Popup>
                    </CircleMarker>
                  </MapContainer>
                </div>

                {/* Driver legend inside map card */}
                {mapTab === "after" && afterRoutes.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border-light bg-surface-secondary">
                    <span className="text-[10px] text-text-muted shrink-0">기사별 경로:</span>
                    {afterRoutes.map((r, i) => (
                      <button
                        key={r.vehicleId}
                        onClick={() => setFocusedDriver(focusedDriver === r.driver ? null : r.driver)}
                        className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full transition-all cursor-pointer
                          ${focusedDriver === r.driver
                            ? "text-white font-semibold shadow-[--shadow-sm]"
                            : focusedDriver
                              ? "text-text-muted opacity-50 hover:opacity-80"
                              : "text-text-secondary hover:bg-surface"
                          }`}
                        style={focusedDriver === r.driver ? { backgroundColor: afterColors[i % afterColors.length] } : {}}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: afterColors[i % afterColors.length] }} />
                        {r.driver}
                        <span className="text-[10px] opacity-70">{r.distance}km</span>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </PageTransition>
  );
}
