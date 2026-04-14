"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck,
  MapPin,
  Package,
  Fuel,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Navigation,
  Phone,
  ThermometerSun,
  Timer,
  User,
  Shield,
  Battery,
} from "lucide-react";

import { vehicles, customers, drivers, allVehicles } from "@/lib/data";
import { allTelematicsData } from "@/lib/telematics-data";
import StatusDot from "./ui/StatusDot";
import ProductDot from "./ui/ProductDot";

// ── Seeded RNG for mission data ──
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ── Driver selection screen ──
function DriverSelect({ onSelect }: { onSelect: (name: string) => void }) {
  const bulkDrivers = drivers.map((d) => {
    const v = vehicles.find((v) => v.plateNumber === d.vehicle);
    return { ...d, vehicleStatus: v?.status ?? "idle", product: v?.product ?? "" };
  });

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <div className="bg-gradient-to-b from-navy-900 to-navy-800 px-5 pt-12 pb-6 text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-dukyang.png" alt="덕양가스" className="h-7 w-auto brightness-0 invert opacity-80 mb-4" />
        <h1 className="text-xl font-bold">기사 모바일</h1>
        <p className="text-sm text-white/60 mt-1">본인의 이름을 선택하세요</p>
      </div>

      {/* Driver list */}
      <div className="px-4 py-4 space-y-2">
        {bulkDrivers.map((d) => (
          <button
            key={d.name}
            onClick={() => onSelect(d.name)}
            className="w-full flex items-center gap-3 bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light px-4 py-3.5 active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
              <User size={20} className="text-brand" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-semibold text-text-primary">{d.name}</p>
              <p className="text-xs text-text-muted">{d.vehicle} · {d.product}</p>
            </div>
            <StatusDot status={d.vehicleStatus} size={10} />
            <ChevronRight size={16} className="text-text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Mobile dashboard for selected driver ──
function DriverDashboard({ driverName, onBack }: { driverName: string; onBack: () => void }) {
  const driver = drivers.find((d) => d.name === driverName)!;
  const vehicle = vehicles.find((v) => v.plateNumber === driver.vehicle)!;
  const telemetry = allTelematicsData[vehicle.id];

  // Live tick for running vehicles
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (vehicle.status !== "running") return;
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, [vehicle.status]);

  const liveSpeed = useMemo(() => {
    if (vehicle.status !== "running") return 0;
    const seed = tick * 7 + telemetry.currentSpeed * 13;
    const jitter = Math.sin(seed) * 6;
    return Math.max(0, Math.round(telemetry.currentSpeed + jitter));
  }, [tick, telemetry.currentSpeed, vehicle.status]);

  const liveFuel = useMemo(() => {
    return Math.max(1, Math.round((telemetry.fuelLevel - tick * 0.02) * 10) / 10);
  }, [tick, telemetry.fuelLevel]);

  // Generate mission stops
  const mission = useMemo(() => {
    const rng = seededRng(vehicle.id.charCodeAt(1) * 100 + vehicle.id.charCodeAt(2));
    const pool = customers.filter((c) => c.product === vehicle.product || rng() > 0.6).slice(0, 5);
    const stops = pool.slice(0, 3 + Math.floor(rng() * 2)).map((c, i) => ({
      name: c.shortName,
      fullName: c.name,
      product: c.productName,
      quantity: Math.round((1000 + rng() * 4000) / 100) * 100,
      eta: Math.round(15 + i * 20 + rng() * 15),
      completed: i < 1 + Math.floor(rng() * 2),
    }));
    const totalLoad = stops.reduce((s, st) => s + st.quantity, 0);
    const delivered = stops.filter((s) => s.completed).reduce((s, st) => s + st.quantity, 0);
    return { stops, totalLoad, delivered, remaining: totalLoad - delivered };
  }, [vehicle, customers]);

  const [activeTab, setActiveTab] = useState<"mission" | "vehicle" | "safety">("mission");

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-surface-secondary pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-navy-900 to-navy-800 px-5 pt-10 pb-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onBack} className="text-xs text-white/50">기사 변경</button>
          <span className="text-xs text-white/40">{timeStr}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
            <User size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">{driverName} 기사</h1>
            <p className="text-xs text-white/60">{vehicle.plateNumber} · {vehicle.productName}</p>
          </div>
          <div className="ml-auto text-right">
            {vehicle.status === "running" ? (
              <>
                <p className="text-2xl font-bold tabular-nums">{liveSpeed}</p>
                <p className="text-[10px] text-white/50">km/h</p>
              </>
            ) : (
              <span className="text-sm text-white/50">{vehicle.status === "idle" ? "대기 중" : "경고"}</span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-4 text-xs">
          <span className="flex items-center gap-1 text-white/70">
            <Fuel size={12} /> {liveFuel}%
          </span>
          <span className="flex items-center gap-1 text-white/70">
            <Battery size={12} /> {telemetry.batteryVoltage}V
          </span>
          <span className="flex items-center gap-1 text-white/70">
            <ThermometerSun size={12} /> {telemetry.coolantTemp}°C
          </span>
          <span className="flex items-center gap-1 text-white/70">
            <Shield size={12} /> 안전 {driver.safetyScore}점
          </span>
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        <AnimatePresence mode="wait">
          {activeTab === "mission" && (
            <motion.div key="mission" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
              {/* Progress */}
              <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4 mb-3">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                  <span>배송 진행</span>
                  <span className="font-semibold text-text-primary">
                    {mission.stops.filter((s) => s.completed).length}/{mission.stops.length}곳
                  </span>
                </div>
                <div className="w-full h-2.5 bg-border-light rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: `${Math.round((mission.delivered / mission.totalLoad) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-text-muted mt-1.5">
                  <span>배송 {mission.delivered.toLocaleString()}kg</span>
                  <span>잔여 {mission.remaining.toLocaleString()}kg</span>
                </div>
              </div>

              {/* Stop list */}
              <div className="space-y-2">
                {mission.stops.map((stop, i) => {
                  const isCurrent = !stop.completed && (i === 0 || mission.stops[i - 1].completed);
                  return (
                    <div
                      key={i}
                      className={`bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border px-4 py-3 ${
                        isCurrent ? "border-brand ring-1 ring-brand/20" : "border-border-light"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          stop.completed ? "bg-success text-white" : isCurrent ? "bg-brand text-white" : "bg-surface-secondary text-text-muted border border-border"
                        }`}>
                          {stop.completed ? <CheckCircle2 size={14} /> : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${isCurrent ? "text-brand" : stop.completed ? "text-success" : "text-text-primary"}`}>
                            {stop.name}
                          </p>
                          <p className="text-xs text-text-muted">{stop.product} · {stop.quantity.toLocaleString()}kg</p>
                        </div>
                        <div className="text-right shrink-0">
                          {stop.completed ? (
                            <span className="text-xs text-success font-semibold">완료</span>
                          ) : isCurrent ? (
                            <span className="text-xs text-brand font-semibold flex items-center gap-0.5"><Timer size={10} />~{stop.eta}분</span>
                          ) : (
                            <span className="text-xs text-text-muted">{stop.eta}분 후</span>
                          )}
                        </div>
                      </div>
                      {isCurrent && (
                        <div className="flex gap-2 mt-3">
                          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand text-white text-xs font-semibold rounded-[--radius-md]">
                            <Navigation size={13} /> 내비게이션
                          </button>
                          <button className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-surface-secondary text-text-secondary text-xs font-semibold rounded-[--radius-md] border border-border">
                            <Phone size={13} /> 연락
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Return to HQ */}
                <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light px-4 py-3 opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-surface-secondary border border-border flex items-center justify-center">
                      <MapPin size={13} className="text-text-muted" />
                    </div>
                    <p className="text-sm text-text-muted">본사 복귀</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "vehicle" && (
            <motion.div key="vehicle" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
              <div className="space-y-3">
                {/* Vehicle info */}
                <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">차량 정보</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-text-muted">차량번호</span><p className="font-semibold text-text-primary mt-0.5">{vehicle.plateNumber}</p></div>
                    <div><span className="text-text-muted">모델</span><p className="font-semibold text-text-primary mt-0.5">{vehicle.model}</p></div>
                    <div><span className="text-text-muted">연식</span><p className="font-semibold text-text-primary mt-0.5">{vehicle.year}년</p></div>
                    <div><span className="text-text-muted">주행거리</span><p className="font-semibold text-text-primary mt-0.5 tabular-nums">{vehicle.mileage.toLocaleString()}km</p></div>
                  </div>
                </div>

                {/* Gauges */}
                <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">차량 상태</h3>
                  <div className="space-y-3">
                    {[
                      { label: "연료", value: liveFuel, unit: "%", icon: Fuel, warn: liveFuel < 20 },
                      { label: "엔진 RPM", value: telemetry.engineRpm, unit: "rpm", icon: Gauge, warn: false },
                      { label: "냉각수", value: telemetry.coolantTemp, unit: "°C", icon: ThermometerSun, warn: telemetry.coolantTemp > 95 },
                      { label: "배터리", value: telemetry.batteryVoltage, unit: "V", icon: Battery, warn: telemetry.batteryVoltage < 12 },
                      { label: "건강점수", value: vehicle.healthScore, unit: "점", icon: Shield, warn: vehicle.healthScore < 60 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <item.icon size={16} className={item.warn ? "text-danger" : "text-text-muted"} />
                        <span className="text-xs text-text-secondary w-16">{item.label}</span>
                        <div className="flex-1 h-2 bg-border-light rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.warn ? "bg-danger" : "bg-success"}`}
                            style={{ width: `${Math.min(100, (item.value / (item.label === "엔진 RPM" ? 2500 : item.label === "냉각수" ? 120 : item.label === "배터리" ? 15 : 100)) * 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold tabular-nums w-14 text-right ${item.warn ? "text-danger" : "text-text-primary"}`}>
                          {item.value}{item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tire pressure */}
                <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">타이어 공기압</h3>
                  <div className="grid grid-cols-2 gap-2 max-w-[200px] mx-auto">
                    {(["fl", "fr", "rl", "rr"] as const).map((pos) => {
                      const val = telemetry.tirePressure[pos];
                      const low = val < 6.5;
                      return (
                        <div key={pos} className={`text-center py-2 rounded-[--radius-md] text-xs ${low ? "bg-danger-bg text-danger" : "bg-surface-secondary text-text-primary"}`}>
                          <p className="text-[10px] text-text-muted uppercase">{pos}</p>
                          <p className="font-bold tabular-nums">{val} bar</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* DTC codes */}
                {telemetry.dtcCodes.length > 0 && (
                  <div className="bg-danger-bg rounded-[--radius-lg] border border-danger/20 p-4">
                    <h3 className="text-sm font-semibold text-danger mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> 고장 코드
                    </h3>
                    {telemetry.dtcCodes.map((dtc, i) => (
                      <div key={i} className="text-xs py-1.5 border-b border-danger/10 last:border-0">
                        <span className="font-mono font-semibold text-danger">{dtc.code}</span>
                        <span className="text-text-secondary ml-2">{dtc.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "safety" && (
            <motion.div key="safety" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
              <div className="space-y-3">
                {/* Safety score */}
                <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4 text-center">
                  <p className="text-xs text-text-muted mb-2">나의 안전 점수</p>
                  <p className={`text-5xl font-bold tabular-nums ${driver.safetyScore >= 90 ? "text-success" : driver.safetyScore >= 70 ? "text-warning" : "text-danger"}`}>
                    {driver.safetyScore}
                  </p>
                  <p className="text-xs text-text-muted mt-1">/ 100점</p>
                  <div className="w-full h-2 bg-border-light rounded-full mt-3 overflow-hidden">
                    <div className={`h-full rounded-full ${driver.safetyScore >= 90 ? "bg-success" : driver.safetyScore >= 70 ? "bg-warning" : "bg-danger"}`} style={{ width: `${driver.safetyScore}%` }} />
                  </div>
                </div>

                {/* Incidents */}
                <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">이번 달 안전 이벤트</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "급제동", value: driver.incidents.suddenBrake, color: driver.incidents.suddenBrake > 2 ? "text-danger" : "text-text-primary" },
                      { label: "사각지대", value: driver.incidents.blindSpotWarning, color: driver.incidents.blindSpotWarning > 4 ? "text-warning" : "text-text-primary" },
                      { label: "과속", value: driver.incidents.speeding, color: driver.incidents.speeding > 0 ? "text-danger" : "text-text-primary" },
                    ].map((item) => (
                      <div key={item.label} className="text-center bg-surface-secondary rounded-[--radius-md] py-3">
                        <p className={`text-2xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ranking */}
                <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">기사 안전 순위</h3>
                  <p className="text-xs text-text-muted mb-2">전체 {drivers.length}명 중</p>
                  <p className="text-3xl font-bold text-brand tabular-nums">{driver.rank}위</p>
                  <div className="w-full h-1.5 bg-border-light rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${Math.round((1 - (driver.rank - 1) / drivers.length) * 100)}%` }} />
                  </div>
                </div>

                {/* Recent events from telemetry */}
                <div className="bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">최근 이벤트</h3>
                  <div className="space-y-2">
                    {telemetry.events.slice(0, 5).map((evt, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs">
                        <StatusDot status={evt.severity === "danger" ? "danger" : evt.severity === "warning" ? "warning" : "safe"} size={6} />
                        <span className="text-text-muted tabular-nums w-12 shrink-0">{evt.time}</span>
                        <span className="text-text-secondary">{evt.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-light flex items-center h-16 z-50 safe-area-pb">
        {[
          { id: "mission" as const, icon: Package, label: "배송" },
          { id: "vehicle" as const, icon: Truck, label: "차량" },
          { id: "safety" as const, icon: Shield, label: "안전" },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? "text-brand" : "text-text-muted"
              }`}
            >
              <tab.icon size={20} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main mobile view ──
export default function MobileView() {
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  if (!selectedDriver) {
    return <DriverSelect onSelect={setSelectedDriver} />;
  }

  return <DriverDashboard driverName={selectedDriver} onBack={() => setSelectedDriver(null)} />;
}
