"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Eye, Pause, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { safetyEvents, drivers, vehicles } from "@/lib/data";
import Card from "@/components/ui/Card";
import StatusDot from "@/components/ui/StatusDot";
import PageTransition from "@/components/PageTransition";

// ── Direction to SVG position map ──
const directionPos: Record<string, { cx: number; cy: number }> = {
  front: { cx: 300, cy: 80 },
  rear: { cx: 300, cy: 520 },
  left: { cx: 80, cy: 300 },
  right: { cx: 520, cy: 300 },
};

// ── Detection zone positions (ellipses around truck) ──
const zoneConfig: { id: string; cx: number; cy: number; rx: number; ry: number }[] = [
  { id: "front", cx: 300, cy: 150, rx: 140, ry: 80 },
  { id: "rear", cx: 300, cy: 450, rx: 140, ry: 80 },
  { id: "left", cx: 150, cy: 300, rx: 80, ry: 140 },
  { id: "right", cx: 450, cy: 300, rx: 80, ry: 140 },
];

// ── Camera positions ──
const cameraPositions = [
  { cx: 300, cy: 220, label: "F" },
  { cx: 300, cy: 380, label: "R" },
  { cx: 210, cy: 300, label: "L" },
  { cx: 390, cy: 300, label: "Ri" },
];

// ── Level to color ──
const levelColor: Record<string, string> = {
  safe: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  emergency: "#7C3AED",
};

// ── Unique vehicles from safetyEvents ──
const eventVehicles = Array.from(
  new Set(safetyEvents.map((e) => e.vehicle))
).map((plate) => {
  const v = vehicles.find((vv) => vv.plateNumber === plate);
  return {
    plateNumber: plate,
    status: v?.status ?? "running",
    driver: safetyEvents.find((e) => e.vehicle === plate)?.driver ?? "",
  };
});

// ── Object shape based on type ──
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
        <circle cx={x} cy={y - 8} r={6} fill={color} opacity={0.9} />
        <line
          x1={x}
          y1={y - 2}
          x2={x}
          y2={y + 12}
          stroke={color}
          strokeWidth={2}
          opacity={0.9}
        />
        <line
          x1={x - 6}
          y1={y + 4}
          x2={x + 6}
          y2={y + 4}
          stroke={color}
          strokeWidth={2}
          opacity={0.9}
        />
        <line
          x1={x}
          y1={y + 12}
          x2={x - 5}
          y2={y + 22}
          stroke={color}
          strokeWidth={2}
          opacity={0.9}
        />
        <line
          x1={x}
          y1={y + 12}
          x2={x + 5}
          y2={y + 22}
          stroke={color}
          strokeWidth={2}
          opacity={0.9}
        />
      </g>
    );
  }
  if (type === "vehicle") {
    return (
      <rect
        x={x - 15}
        y={y - 10}
        width={30}
        height={20}
        rx={4}
        fill={color}
        opacity={0.85}
      />
    );
  }
  // obstacle
  return (
    <polygon
      points={`${x},${y - 12} ${x + 12},${y + 8} ${x - 12},${y + 8}`}
      fill={color}
      opacity={0.85}
    />
  );
}

export default function SafetyPage() {
  const [selectedVehicle, setSelectedVehicle] = useState(
    eventVehicles[0]?.plateNumber ?? ""
  );
  const [eventIndex, setEventIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [eventLog, setEventLog] = useState<typeof safetyEvents>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // Filter events for selected vehicle only
  const vehicleEvents = useMemo(
    () => safetyEvents.filter((e) => e.vehicle === selectedVehicle),
    [selectedVehicle]
  );

  // Current event in the simulation
  const currentEvent =
    vehicleEvents.length > 0
      ? vehicleEvents[eventIndex % vehicleEvents.length]
      : null;

  // Auto-simulation: cycle through events
  useEffect(() => {
    if (!playing || vehicleEvents.length === 0) return;
    const interval = setInterval(() => {
      setEventIndex((prev) => {
        const next = (prev + 1) % vehicleEvents.length;
        const nextEvent = vehicleEvents[next];
        setEventLog((log) => [nextEvent, ...log].slice(0, 20));
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [playing, vehicleEvents]);

  // Reset event index when switching vehicle
  useEffect(() => {
    setEventIndex(0);
    setEventLog([]);
    if (vehicleEvents.length > 0) {
      setEventLog([vehicleEvents[0]]);
    }
  }, [selectedVehicle, vehicleEvents]);

  // Auto-scroll event log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0;
    }
  }, [eventLog]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  // Determine active zone color
  const activeDirection = currentEvent?.direction ?? null;
  const activeLevel = currentEvent?.level ?? "safe";

  return (
    <PageTransition>
      <div className="flex gap-5 h-[calc(100vh-100px)]">
        {/* ── Left: Vehicle list ── */}
        <div className="w-[260px] shrink-0 bg-surface rounded-[--radius-lg] border border-border-light shadow-[--shadow-sm] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Eye size={18} className="text-text-muted" />
            <span className="text-lg font-semibold text-text-primary">차량 목록</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scroll">
            {eventVehicles.map((v) => {
              const isSelected = v.plateNumber === selectedVehicle;
              return (
                <button
                  key={v.plateNumber}
                  onClick={() => setSelectedVehicle(v.plateNumber)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors text-sm
                    ${
                      isSelected
                        ? "bg-brand-50 border-l-2 border-brand"
                        : "hover:bg-surface-secondary border-l-2 border-transparent"
                    }`}
                >
                  <StatusDot status={v.status} />
                  <div>
                    <span className="font-semibold text-text-primary">
                      {v.plateNumber}
                    </span>
                    <p className="text-xs text-text-muted">{v.driver}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Center + Right ── */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex gap-4 flex-1 min-h-0">
            {/* ── Center: Bird's Eye View SVG ── */}
            <div className="flex-1 flex flex-col">
              <Card hover={false} className="!p-3 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    <Eye size={18} className="text-brand" />
                    어라운드뷰 ({selectedVehicle})
                  </h2>
                  <button
                    onClick={togglePlay}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius-md] border border-border text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors"
                  >
                    {playing ? (
                      <>
                        <Pause size={14} /> 일시정지
                      </>
                    ) : (
                      <>
                        <Play size={14} /> 재생
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <svg
                    viewBox="0 0 600 600"
                    className="bg-gray-900 rounded-[--radius-lg] w-full max-h-[480px]"
                    style={{ aspectRatio: "1", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3)" }}
                  >
                    {/* Grid lines */}
                    {[100, 200, 300, 400, 500].map((v) => (
                      <g key={v}>
                        <line
                          x1={v}
                          y1={0}
                          x2={v}
                          y2={600}
                          stroke="#1f2937"
                          strokeWidth={0.5}
                        />
                        <line
                          x1={0}
                          y1={v}
                          x2={600}
                          y2={v}
                          stroke="#1f2937"
                          strokeWidth={0.5}
                        />
                      </g>
                    ))}

                    {/* Detection zones (semi-transparent ellipses) */}
                    {zoneConfig.map((zone) => {
                      const isActive = zone.id === activeDirection;
                      const fillColor = isActive
                        ? levelColor[activeLevel] ?? levelColor.safe
                        : levelColor.safe;
                      return (
                        <ellipse
                          key={zone.id}
                          cx={zone.cx}
                          cy={zone.cy}
                          rx={zone.rx}
                          ry={zone.ry}
                          fill={fillColor}
                          opacity={isActive ? 0.25 : 0.08}
                          stroke={fillColor}
                          strokeWidth={isActive ? 2 : 1}
                          strokeOpacity={isActive ? 0.6 : 0.15}
                          style={{
                            transition:
                              "fill 0.5s ease, opacity 0.5s ease, stroke 0.5s ease",
                          }}
                        />
                      );
                    })}

                    {/* Tank truck body (top view) */}
                    <rect
                      x={200}
                      y={260}
                      width={200}
                      height={80}
                      rx={12}
                      fill="#4B5563"
                      stroke="#6B7280"
                      strokeWidth={2}
                    />
                    {/* Cab */}
                    <rect
                      x={230}
                      y={240}
                      width={140}
                      height={30}
                      rx={8}
                      fill="#6B7280"
                      stroke="#9CA3AF"
                      strokeWidth={1}
                    />
                    {/* Tank cylinder */}
                    <ellipse
                      cx={300}
                      cy={310}
                      rx={70}
                      ry={20}
                      fill="#374151"
                      stroke="#4B5563"
                      strokeWidth={1}
                    />
                    {/* Label */}
                    <text
                      x={300}
                      y={316}
                      textAnchor="middle"
                      fill="#9CA3AF"
                      fontSize={12}
                      fontWeight={600}
                    >
                      TANK
                    </text>

                    {/* Camera positions */}
                    {cameraPositions.map((cam) => (
                      <g key={cam.label}>
                        <circle
                          cx={cam.cx}
                          cy={cam.cy}
                          r={10}
                          fill="#3B82F6"
                          opacity={0.8}
                        />
                        <text
                          x={cam.cx}
                          y={cam.cy + 4}
                          textAnchor="middle"
                          fill="white"
                          fontSize={8}
                          fontWeight={700}
                        >
                          {cam.label}
                        </text>
                      </g>
                    ))}

                    {/* Detected object animation */}
                    <AnimatePresence mode="wait">
                      {currentEvent &&
                        currentEvent.direction &&
                        currentEvent.type !== "clear" && (
                          <motion.g
                            key={`${eventIndex}-${currentEvent.type}`}
                            initial={{
                              opacity: 0,
                              x:
                                directionPos[currentEvent.direction]?.cx ??
                                300,
                              y:
                                directionPos[currentEvent.direction]?.cy ??
                                300,
                            }}
                            animate={{
                              opacity: 1,
                              x:
                                300 +
                                ((directionPos[currentEvent.direction]?.cx ??
                                  300) -
                                  300) *
                                  0.55,
                              y:
                                300 +
                                ((directionPos[currentEvent.direction]?.cy ??
                                  300) -
                                  300) *
                                  0.55,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                          >
                            <DetectedObject
                              type={currentEvent.type}
                              x={0}
                              y={0}
                              color={
                                levelColor[currentEvent.level] ??
                                levelColor.safe
                              }
                            />
                          </motion.g>
                        )}
                    </AnimatePresence>

                    {/* Distance labels */}
                    {["3m", "5m", "8m"].map((label, i) => {
                      const r = 100 + i * 60;
                      return (
                        <g key={label}>
                          <circle
                            cx={300}
                            cy={300}
                            r={r}
                            fill="none"
                            stroke="#374151"
                            strokeWidth={0.5}
                            strokeDasharray="4 4"
                          />
                          <text
                            x={300 + r - 5}
                            y={295}
                            fill="#6B7280"
                            fontSize={9}
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Current status indicator */}
                    {currentEvent && (
                      <g>
                        <rect
                          x={10}
                          y={10}
                          width={200}
                          height={50}
                          rx={8}
                          fill="black"
                          opacity={0.6}
                        />
                        <circle
                          cx={28}
                          cy={28}
                          r={5}
                          fill={
                            levelColor[currentEvent.level] ?? levelColor.safe
                          }
                        />
                        <text x={40} y={25} fill="white" fontSize={11}>
                          {currentEvent.typeName}
                        </text>
                        <text x={40} y={45} fill="#9CA3AF" fontSize={10}>
                          {currentEvent.direction
                            ? `방향: ${currentEvent.direction} / ${currentEvent.distance}m`
                            : currentEvent.levelName}
                        </text>
                      </g>
                    )}
                  </svg>
                </div>
              </Card>
            </div>

            {/* ── Right: Event log ── */}
            <div className="w-[280px] shrink-0 bg-surface rounded-[--radius-lg] border border-border-light shadow-[--shadow-sm] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-text-primary">이벤트 로그</h3>
              </div>
              <div
                ref={logRef}
                className="flex-1 overflow-y-auto custom-scroll px-3 py-2 space-y-2"
              >
                <AnimatePresence initial={false}>
                  {eventLog.map((evt, i) => (
                    <motion.div
                      key={`${evt.time}-${i}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-start gap-2 text-sm py-1.5 border-b border-border-light last:border-0"
                    >
                      <span className="text-text-muted tabular-nums shrink-0 text-xs mt-0.5">
                        {evt.time}
                      </span>
                      <StatusDot status={evt.level} size={7} />
                      <span className="text-text-secondary leading-snug">
                        {evt.typeName}
                        {evt.direction && (
                          <span className="text-text-muted">
                            {" "}
                            ({evt.direction}, {evt.distance}m)
                          </span>
                        )}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {eventLog.length === 0 && (
                  <p className="text-sm text-text-muted text-center py-8">
                    시뮬레이션 대기 중...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom: Driver safety scores ── */}
          <Card hover={false} className="!p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              기사별 안전 점수
            </h3>
            <div className="space-y-2">
              {drivers.map((d) => {
                const barColor =
                  d.safetyScore >= 90
                    ? "bg-success"
                    : d.safetyScore >= 70
                      ? "bg-warning"
                      : "bg-danger";
                const textColor =
                  d.safetyScore >= 90
                    ? "text-success"
                    : d.safetyScore >= 70
                      ? "text-warning"
                      : "text-danger";
                const trackColor =
                  d.safetyScore >= 90
                    ? "bg-success-bg"
                    : d.safetyScore >= 70
                      ? "bg-warning-bg"
                      : "bg-danger-bg";
                return (
                  <div key={d.name} className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary w-[60px] shrink-0 truncate">
                      {d.name}
                    </span>
                    <span className="text-xs text-text-muted w-[70px] shrink-0">
                      {d.vehicle}
                    </span>
                    <div className={`flex-1 ${trackColor} rounded-[--radius-sm] h-5 overflow-hidden relative`}>
                      <div
                        className={`h-full rounded-[--radius-sm] ${barColor} transition-all duration-500`}
                        style={{
                          width: `${d.safetyScore}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-sm font-bold w-[40px] text-right tabular-nums ${textColor}`}
                    >
                      {d.safetyScore}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
