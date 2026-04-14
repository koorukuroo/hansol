"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Sparkles, Route, Loader2, CheckCircle2, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { customers, routeData } from "@/lib/data";
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

// ── Delivery requests (mix VMI auto + kakao manual) ──
interface DeliveryRequest {
  id: string;
  customerId: string;
  name: string;
  product: string;
  productName: string;
  quantity: number;
  type: "VMI" | "카톡";
}

const deliveryRequests: DeliveryRequest[] = [
  { id: "D001", customerId: "C004", name: "삼성SDI", product: "N2", productName: "액화질소", quantity: 3500, type: "VMI" },
  { id: "D002", customerId: "C002", name: "에쓰오일", product: "N2", productName: "액화질소", quantity: 6000, type: "VMI" },
  { id: "D003", customerId: "C001", name: "현대미포조선", product: "N2", productName: "액화질소", quantity: 4000, type: "VMI" },
  { id: "D004", customerId: "C014", name: "현대중공업", product: "AR", productName: "액화알곤", quantity: 4800, type: "VMI" },
  { id: "D005", customerId: "C006", name: "SK에너지", product: "O2", productName: "액화산소", quantity: 5000, type: "카톡" },
  { id: "D006", customerId: "C003", name: "포스코", product: "AR", productName: "액화알곤", quantity: 3000, type: "카톡" },
  { id: "D007", customerId: "C009", name: "울산대학교병원", product: "O2-M", productName: "의료용산소", quantity: 1400, type: "카톡" },
  { id: "D008", customerId: "C011", name: "한화솔루션 울산", product: "N2", productName: "액화질소", quantity: 4200, type: "카톡" },
];

// Route colors
const beforeColors = ["#EF4444", "#F97316", "#DC2626", "#EA580C", "#F87171"];
const afterColors = ["#22C55E", "#3B82F6", "#16A34A", "#2563EB", "#4ADE80"];

// ── Vehicle lookup ──
const vehicleLookup: Record<string, string> = {
  V001: "84노1302",
  V002: "88소1619",
  V004: "91가2345",
  V005: "85누3456",
  V006: "87다5678",
};

// ── Optimization step definitions ──
const OPT_STEPS = [
  { label: "배송 데이터 분석", detail: "8건 배송 요청 + 거래처 위치 로딩" },
  { label: "차량 상태 확인", detail: "가용 차량 5대, 적재량·정비 일정 확인" },
  { label: "경로 최적화 (OR-Tools)", detail: "TSP/VRP 솔버 실행 중..." },
  { label: "차량-경로 매칭", detail: "제품 적합성·거리 최소화 배정" },
  { label: "최종 검증 완료", detail: "제약 조건 충족, 배차 확정" },
];

export default function DispatchPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [mapTab, setMapTab] = useState<"before" | "after">("after");
  const [optStep, setOptStep] = useState(-1);
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
    if (checked.size === deliveryRequests.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(deliveryRequests.map((d) => d.id)));
    }
  };

  const selectedCount = checked.size;

  const handleOptimize = () => {
    setLoading(true);
    setOptimized(false);
    setOptStep(0);

    // Clear any leftover timers
    stepTimer.current.forEach(clearTimeout);
    stepTimer.current = [];

    // Progress through steps
    OPT_STEPS.forEach((_, i) => {
      if (i === 0) return;
      stepTimer.current.push(
        setTimeout(() => setOptStep(i), i * 700),
      );
    });

    // Finish
    stepTimer.current.push(
      setTimeout(() => {
        setLoading(false);
        setOptimized(true);
        setOptStep(-1);
        setMapTab("after");
      }, OPT_STEPS.length * 700 + 400),
    );
  };

  useEffect(() => {
    return () => stepTimer.current.forEach(clearTimeout);
  }, []);

  const currentRoute = mapTab === "before" ? routeData.before : routeData.after;
  const routeColors = mapTab === "before" ? beforeColors : afterColors;

  // Build polylines from stops
  const polylines = currentRoute.vehicles.map((v, i) => ({
    positions: v.stops.map((s) => [s.lat, s.lng] as [number, number]),
    color: routeColors[i % routeColors.length],
    vehicle: vehicleLookup[v.id] || v.id,
    driver: v.driver,
  }));

  // All stop points (for markers)
  const allStops = useMemo(() => {
    const seen = new Set<string>();
    const stops: { name: string; lat: number; lng: number }[] = [];
    for (const v of currentRoute.vehicles) {
      for (const s of v.stops) {
        const key = `${s.lat},${s.lng}`;
        if (!seen.has(key)) {
          seen.add(key);
          stops.push(s);
        }
      }
    }
    return stops;
  }, [currentRoute]);

  return (
    <PageTransition>
      <div className="flex gap-4 h-[calc(100vh-80px)]">
        {/* ── Left Panel: Delivery Requests ── */}
        <div className="w-[340px] shrink-0 flex flex-col bg-surface rounded-[--radius-lg] border border-border-light shadow-[--shadow-sm] overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border-light flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">
              배송 요청{" "}
              <span className="text-sm font-normal text-text-muted">
                {deliveryRequests.length}건
              </span>
            </h2>
            <button
              onClick={toggleAll}
              className="text-xs text-brand hover:underline cursor-pointer"
            >
              {checked.size === deliveryRequests.length ? "전체 해제" : "전체 선택"}
            </button>
          </div>

          {/* Request rows */}
          <div className="flex-1 overflow-y-auto custom-scroll">
            {deliveryRequests.map((d) => {
              const isChecked = checked.has(d.id);
              return (
                <label
                  key={d.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-border-light
                    hover:bg-surface-secondary cursor-pointer transition-colors duration-150
                    ${isChecked ? "bg-brand-50/50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCheck(d.id)}
                    className="w-4 h-4 rounded border-border text-brand accent-brand shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {d.name}
                      </span>
                      <ProductDot product={d.product} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-secondary">
                        {d.quantity.toLocaleString()}kg
                      </span>
                      <Badge variant={d.type === "VMI" ? "blue" : "green"}>
                        {d.type}
                      </Badge>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

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
                    {OPT_STEPS.map((step, i) => {
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
                        width: `${Math.min(100, ((optStep + 1) / OPT_STEPS.length) * 100)}%`,
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!optimized && !loading ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={Route}
                title="배송 요청을 선택하세요"
                description="좌측에서 배송 요청을 선택하고 AI 최적 배차를 실행하세요"
              />
            </div>
          ) : optimized ? (
            <>
              {/* Comparison Stats */}
              <div className="grid grid-cols-3 gap-3">
                <AnimatePresence>
                  {[
                    {
                      label: "총 주행거리",
                      before: "1,240km",
                      after: "890km",
                      delta: "▼28%",
                    },
                    {
                      label: "공차율",
                      before: "7.6%",
                      after: "3.2%",
                      delta: "▼58%",
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

              {/* Route Result Cards */}
              <div className="space-y-2">
                <AnimatePresence>
                  {routeData.after.vehicles.map((v, i) => (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.3 + i * 0.08,
                        duration: 0.35,
                        ease: "easeOut",
                      }}
                    >
                      <Card hover={false} className="!py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle2
                              size={18}
                              className="text-success shrink-0"
                            />
                            <div>
                              <p className="text-sm font-semibold text-text-primary">
                                {vehicleLookup[v.id] || v.id}{" "}
                                <span className="font-normal text-text-secondary">
                                  ({v.driver})
                                </span>
                              </p>
                              <p className="text-xs text-text-muted mt-0.5">
                                {v.stops.map((s) => s.name).join(" → ")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold tabular-nums text-text-primary">
                              {v.distance}km
                            </p>
                            <p className="text-xs text-text-muted">
                              {v.deliveries}곳 배송
                            </p>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
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

                    {/* Polylines */}
                    {polylines.map((p, i) => (
                      <Polyline
                        key={`${mapTab}-${i}`}
                        positions={p.positions}
                        pathOptions={{
                          color: p.color,
                          weight: 3,
                          opacity: 0.8,
                        }}
                      />
                    ))}

                    {/* Stop markers */}
                    {allStops.map((s, i) => (
                      <CircleMarker
                        key={`${mapTab}-stop-${i}`}
                        center={[s.lat, s.lng]}
                        radius={6}
                        pathOptions={{
                          color: s.name === "본사" ? "var(--color-brand)" : "var(--color-text-secondary)",
                          fillColor: s.name === "본사" ? "var(--color-brand)" : "var(--color-surface)",
                          fillOpacity: 1,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <span className="text-sm font-medium">{s.name}</span>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                </div>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </PageTransition>
  );
}
