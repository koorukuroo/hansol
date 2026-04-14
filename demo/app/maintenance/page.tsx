"use client";

import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Calendar, AlertTriangle, Printer, X, FileText, CheckCircle2, Package, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";

import { vehicles, vehicleHealth } from "@/lib/data";
import Card from "@/components/ui/Card";
import Gauge from "@/components/ui/Gauge";
import StatusDot from "@/components/ui/StatusDot";
import Badge from "@/components/ui/Badge";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/components/ui/Toast";

// ── Parts inventory (sample data) ──
const PARTS_INVENTORY: Record<string, { stock: number; unit: string; unitCost: number }> = {
  "브레이크 패드": { stock: 4, unit: "세트", unitCost: 180000 },
  "냉각수 시스템": { stock: 2, unit: "세트", unitCost: 350000 },
  "배터리": { stock: 3, unit: "개", unitCost: 520000 },
  "탱크 밸브": { stock: 5, unit: "개", unitCost: 420000 },
  "엔진 오일": { stock: 8, unit: "L(20L)", unitCost: 95000 },
};

// ── Heatmap cell color by health score ──
function healthColor(score: number): string {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-danger";
}

export default function MaintenancePage() {
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);
  const [hoveredVehicle, setHoveredVehicle] = useState<string | null>(null);
  const [showWorkOrder, setShowWorkOrder] = useState(false);
  const [calMonth, setCalMonth] = useState<{ year: number; month: number }>({ year: 2026, month: 3 }); // 0-indexed: 3 = April
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null); // "YYYY-MM-DD"
  const printRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  const detail = selectedPlate ? vehicleHealth[selectedPlate] : null;
  const selectedVehicle = selectedPlate
    ? vehicles.find((v) => v.plateNumber === selectedPlate)
    : null;

  // ── Parts overview (cross-vehicle aggregation) ──
  const partsOverview = useMemo(() => {
    const allHealth = Object.values(vehicleHealth);
    const partNames = ["브레이크 패드", "냉각수 시스템", "배터리", "탱크 밸브", "엔진 오일"];

    const partStats = partNames.map((name) => {
      const instances = allHealth.map((vh) => {
        const comp = vh.components.find((c) => c.name === name);
        return comp ? { ...comp, plate: vh.plateNumber, model: vh.model } : null;
      }).filter(Boolean) as { name: string; rul: number; health: number; status: string; plate: string; model: string }[];

      const danger = instances.filter((c) => c.health < 60);
      const caution = instances.filter((c) => c.health >= 60 && c.health < 70);
      const good = instances.filter((c) => c.health >= 70);
      const avgHealth = instances.length > 0 ? Math.round(instances.reduce((s, c) => s + c.health, 0) / instances.length) : 0;
      const avgRul = instances.length > 0 ? Math.round(instances.reduce((s, c) => s + c.rul, 0) / instances.length) : 0;
      const need30d = instances.filter((c) => c.rul <= 30).length; // need replacement within 30 days
      const inv = PARTS_INVENTORY[name];
      const shortage = Math.max(0, need30d - (inv?.stock ?? 0));

      return { name, total: instances.length, danger, caution, good, avgHealth, avgRul, need30d, stock: inv?.stock ?? 0, unit: inv?.unit ?? "", unitCost: inv?.unitCost ?? 0, shortage, instances };
    });

    // Urgent items: health < 60, sorted by RUL ascending
    const urgentItems = partStats.flatMap((ps) =>
      ps.danger.map((d) => ({ part: ps.name, plate: d.plate, health: d.health, rul: d.rul }))
    ).sort((a, b) => a.rul - b.rul);

    // Upcoming maintenance schedule
    const schedules = allHealth
      .map((vh) => ({ plate: vh.plateNumber, date: vh.nextMaintenance.date, type: vh.nextMaintenance.type, autoExcluded: vh.nextMaintenance.autoExcluded }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Summary KPIs
    const totalDanger = partStats.reduce((s, ps) => s + ps.danger.length, 0);
    const totalShortage = partStats.reduce((s, ps) => s + ps.shortage, 0);
    const avgFleetHealth = allHealth.length > 0
      ? Math.round(allHealth.reduce((s, vh) => s + vh.overallScore, 0) / allHealth.length)
      : 0;

    return { partStats, urgentItems, schedules, totalDanger, totalShortage, avgFleetHealth };
  }, []);

  return (
    <PageTransition>
      {/* ── Vehicle Health Heatmap ── */}
      <Card hover={false}>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          <Wrench className="inline-block w-5 h-5 mr-2 -mt-0.5 text-text-muted" />
          차량 건강 현황
        </h2>

        <div className="grid grid-cols-10 gap-2">
          {vehicles.map((v) => {
            const isSelected = selectedPlate === v.plateNumber;
            return (
              <div key={v.id} className="relative">
                <button
                  onClick={() =>
                    setSelectedPlate(
                      isSelected ? null : v.plateNumber,
                    )
                  }
                  onMouseEnter={() => setHoveredVehicle(v.id)}
                  onMouseLeave={() => setHoveredVehicle(null)}
                  className={`w-full aspect-square rounded-[--radius-md] flex items-center justify-center transition-all duration-150 ${healthColor(
                    v.healthScore,
                  )} ${
                    isSelected
                      ? "ring-2 ring-offset-2 ring-brand scale-105"
                      : "hover:ring-1 hover:ring-brand/30"
                  }`}
                >
                  <span className="text-xs text-white font-medium leading-tight text-center px-1">
                    {v.plateNumber}
                  </span>
                </button>

                {/* Tooltip */}
                {hoveredVehicle === v.id && (
                  <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-navy-900 text-white text-xs rounded-[--radius-md] px-3 py-2 whitespace-nowrap shadow-[--shadow-lg] pointer-events-none">
                    <p className="font-semibold">{v.plateNumber}</p>
                    <p>{v.model} ({v.year}년)</p>
                    <p>건강점수: <span className="font-bold">{v.healthScore}점</span></p>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-navy-900" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Selected Vehicle Detail ── */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {!detail || !selectedVehicle ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* ── Parts Overview Dashboard ── */}
              <div className="space-y-4">
                {/* Parts status table */}
                <Card hover={false}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-text-muted" />
                      <h3 className="text-sm font-semibold text-text-primary">부품별 전체 현황</h3>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-text-muted">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger" />교체 필요</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" />주의 관찰</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />양호</span>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left py-2 text-text-muted font-semibold w-28">부품명</th>
                        <th className="text-center py-2 text-danger font-semibold w-16">교체 필요</th>
                        <th className="text-center py-2 text-warning font-semibold w-16">주의</th>
                        <th className="text-center py-2 text-success font-semibold w-16">양호</th>
                        <th className="text-left py-2 text-text-muted font-semibold w-32">평균 건강도</th>
                        <th className="text-center py-2 text-text-muted font-semibold w-20">평균 잔여일</th>
                        <th className="text-center py-2 text-text-muted font-semibold w-16">재고</th>
                        <th className="text-center py-2 text-text-muted font-semibold w-20">30일 내 필요</th>
                        <th className="text-center py-2 text-text-muted font-semibold w-16">부족분</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partsOverview.partStats.map((ps) => (
                        <tr key={ps.name} className="border-b border-border-light last:border-0 hover:bg-surface-secondary transition-colors">
                          <td className="py-2.5 font-medium text-text-primary">{ps.name}</td>
                          <td className="py-2.5 text-center">
                            {ps.danger.length > 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-danger-bg text-danger font-bold">{ps.danger.length}</span>
                            ) : <span className="text-text-muted">-</span>}
                          </td>
                          <td className="py-2.5 text-center">
                            {ps.caution.length > 0 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-warning-bg text-warning font-bold">{ps.caution.length}</span>
                            ) : <span className="text-text-muted">-</span>}
                          </td>
                          <td className="py-2.5 text-center text-success font-medium">{ps.good.length}</td>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Gauge percent={ps.avgHealth} height="h-1.5" />
                              <span className="tabular-nums font-medium w-8 text-right">{ps.avgHealth}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-center tabular-nums">{ps.avgRul}일</td>
                          <td className="py-2.5 text-center tabular-nums font-medium">{ps.stock}{ps.unit.charAt(0)}</td>
                          <td className="py-2.5 text-center tabular-nums font-medium">{ps.need30d}대</td>
                          <td className="py-2.5 text-center">
                            {ps.shortage > 0 ? (
                              <span className="text-danger font-bold">{ps.shortage}개 부족</span>
                            ) : (
                              <span className="text-success font-medium">충분</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  {/* Urgent replacement list */}
                  <Card hover={false}>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={14} className="text-danger" />
                      <h3 className="text-sm font-semibold text-text-primary">긴급 교체 필요</h3>
                      {partsOverview.totalDanger > 0 && (
                        <span className="text-[10px] font-bold bg-danger-bg text-danger px-1.5 py-0.5 rounded-full">{partsOverview.totalDanger}건</span>
                      )}
                    </div>
                    {partsOverview.urgentItems.length === 0 ? (
                      <div className="py-6 text-center text-sm text-text-muted">
                        <CheckCircle2 size={24} className="text-success mx-auto mb-2" />
                        긴급 교체가 필요한 부품이 없습니다
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {partsOverview.urgentItems.map((item, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedPlate(item.plate)}
                            className="flex items-center gap-2 w-full text-left py-2 px-2.5 -mx-1 rounded-[--radius-md] hover:bg-surface-secondary transition-colors cursor-pointer"
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.rul <= 20 ? "bg-danger alert-pulse" : "bg-warning"}`} />
                            <span className="text-xs font-medium text-text-primary shrink-0 w-20 truncate">{item.part}</span>
                            <span className="text-[10px] text-text-muted shrink-0">{item.plate}</span>
                            <span className="text-xs font-bold tabular-nums text-danger shrink-0 w-8 text-right">{item.rul}일</span>
                            <div className="w-12 shrink-0">
                              <Gauge percent={item.health} height="h-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Parts inventory + upcoming schedule */}
                  <div className="flex flex-col gap-4">
                    {/* Inventory status */}
                    <Card hover={false}>
                      <div className="flex items-center gap-2 mb-3">
                        <ShoppingCart size={14} className="text-text-muted" />
                        <h3 className="text-sm font-semibold text-text-primary">부품 재고 vs 수요</h3>
                        {partsOverview.totalShortage > 0 && (
                          <span className="text-[10px] font-bold bg-danger-bg text-danger px-1.5 py-0.5 rounded-full">{partsOverview.totalShortage}건 부족</span>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        {partsOverview.partStats.map((ps) => (
                          <div key={ps.name} className="flex items-center gap-2">
                            <span className="text-xs text-text-secondary w-20 shrink-0 truncate">{ps.name}</span>
                            <div className="flex-1 flex items-center gap-1.5">
                              {/* Stock bar */}
                              <div className="flex-1 bg-border-light rounded-full h-3 overflow-hidden relative">
                                <div
                                  className="h-full bg-success/60 rounded-full"
                                  style={{ width: `${Math.min(100, (ps.stock / Math.max(1, ps.need30d + ps.stock)) * 100)}%` }}
                                />
                                {ps.need30d > 0 && (
                                  <div
                                    className="absolute top-0 h-full bg-danger/30 rounded-full"
                                    style={{ left: `${Math.min(100, (ps.stock / Math.max(1, ps.need30d + ps.stock)) * 100)}%`, width: `${Math.min(100 - (ps.stock / Math.max(1, ps.need30d + ps.stock)) * 100, (ps.need30d / Math.max(1, ps.need30d + ps.stock)) * 100)}%` }}
                                  />
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] tabular-nums text-success font-medium w-6 text-right">{ps.stock}</span>
                            <span className="text-[10px] text-text-muted">/</span>
                            <span className="text-[10px] tabular-nums text-text-secondary font-medium w-4">{ps.need30d}</span>
                          </div>
                        ))}
                        <p className="text-[10px] text-text-muted mt-1">녹색: 현재 재고 | 빨강: 30일 내 추가 필요</p>
                      </div>
                    </Card>

                  </div>
                </div>

                {/* ── Maintenance Calendar (full width) ── */}
                <Card hover={false}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-text-muted" />
                      <h3 className="text-sm font-semibold text-text-primary">정비 일정 캘린더</h3>
                      <span className="text-[10px] text-text-muted">{partsOverview.schedules.length}건 예정</span>
                    </div>
                    {/* Month navigation */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCalMonth((p) => {
                          const d = new Date(p.year, p.month - 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })}
                        className="p-1 hover:bg-surface-secondary rounded-[--radius-sm] transition-colors cursor-pointer"
                      >
                        <ChevronLeft size={14} className="text-text-muted" />
                      </button>
                      <span className="text-sm font-semibold text-text-primary tabular-nums w-24 text-center">
                        {calMonth.year}년 {calMonth.month + 1}월
                      </span>
                      <button
                        onClick={() => setCalMonth((p) => {
                          const d = new Date(p.year, p.month + 1, 1);
                          return { year: d.getFullYear(), month: d.getMonth() };
                        })}
                        className="p-1 hover:bg-surface-secondary rounded-[--radius-sm] transition-colors cursor-pointer"
                      >
                        <ChevronRight size={14} className="text-text-muted" />
                      </button>
                      <button
                        onClick={() => setCalMonth({ year: 2026, month: 3 })}
                        className="text-[10px] text-brand hover:underline cursor-pointer ml-1"
                      >
                        오늘
                      </button>
                    </div>
                  </div>

                  {(() => {
                    // Build schedule map: "YYYY-MM-DD" -> events[]
                    const schedMap = new Map<string, typeof partsOverview.schedules>();
                    partsOverview.schedules.forEach((s) => {
                      const arr = schedMap.get(s.date) || [];
                      arr.push(s);
                      schedMap.set(s.date, arr);
                    });

                    // Dynamic month calculation
                    const firstDay = new Date(calMonth.year, calMonth.month, 1);
                    const startDow = firstDay.getDay();
                    const daysInMonth = new Date(calMonth.year, calMonth.month + 1, 0).getDate();
                    const todayStr = "2026-04-15";

                    const cells: (number | null)[] = [];
                    for (let i = 0; i < startDow; i++) cells.push(null);
                    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                    while (cells.length % 7 !== 0) cells.push(null);

                    const dateStr = (day: number) =>
                      `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

                    // Events in this month for the detail list
                    const monthEvents = partsOverview.schedules.filter((s) => {
                      const dt = new Date(s.date);
                      return dt.getFullYear() === calMonth.year && dt.getMonth() === calMonth.month;
                    });

                    // Selected day events
                    const selectedDayEvents = selectedCalDay ? (schedMap.get(selectedCalDay) ?? []) : [];

                    const EVENT_COLORS = ["bg-warning", "bg-danger", "bg-brand", "bg-success"];

                    return (
                      <div className="grid grid-cols-[1fr_280px] gap-4">
                        {/* Calendar grid */}
                        <div>
                          <div className="grid grid-cols-7 gap-1 mb-1">
                            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                              <div key={d} className={`text-center text-[10px] font-semibold py-1 ${d === "일" ? "text-danger" : d === "토" ? "text-brand" : "text-text-muted"}`}>{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {cells.map((day, i) => {
                              if (day === null) return <div key={`e-${i}`} className="min-h-[56px]" />;
                              const ds = dateStr(day);
                              const events = schedMap.get(ds);
                              const hasEvent = events && events.length > 0;
                              const isToday = ds === todayStr;
                              const isPast = ds < todayStr;
                              const isSelected = ds === selectedCalDay;
                              const dow = i % 7;
                              return (
                                <button
                                  key={day}
                                  onClick={() => setSelectedCalDay(isSelected ? null : ds)}
                                  className={`relative min-h-[56px] p-1 rounded-[--radius-md] border text-left transition-all cursor-pointer
                                    ${isSelected ? "border-brand ring-1 ring-brand/30 bg-brand-50" : "border-transparent hover:border-border-light hover:bg-surface-secondary"}
                                    ${isToday && !isSelected ? "border-brand/40 bg-brand-50/50" : ""}
                                  `}
                                >
                                  <span className={`text-[11px] tabular-nums block mb-0.5
                                    ${isToday ? "text-brand font-bold" : ""}
                                    ${isPast && !isToday ? "text-text-muted/50" : ""}
                                    ${!isPast && !isToday ? "text-text-secondary" : ""}
                                    ${dow === 0 ? "text-danger/70" : ""} ${dow === 6 ? "text-brand/70" : ""}
                                  `}>
                                    {day}
                                    {isToday && <span className="text-[8px] ml-0.5 font-normal">오늘</span>}
                                  </span>
                                  {hasEvent && (
                                    <div className="space-y-0.5">
                                      {events.slice(0, 3).map((ev, ei) => (
                                        <div
                                          key={ei}
                                          className={`text-[8px] leading-tight px-1 py-0.5 rounded truncate text-white font-medium
                                            ${ev.autoExcluded ? EVENT_COLORS[1] : EVENT_COLORS[0]}
                                          `}
                                        >
                                          {ev.plate.slice(-4)} {ev.type.slice(0, 6)}
                                        </div>
                                      ))}
                                      {events.length > 3 && (
                                        <span className="text-[8px] text-text-muted px-1">+{events.length - 3}건</span>
                                      )}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {/* Legend */}
                          <div className="flex items-center gap-4 mt-2 text-[9px] text-text-muted">
                            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-warning" />정비 예정</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-1.5 rounded-sm bg-danger" />배차 제외</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-[--radius-sm] border border-brand/40 bg-brand-50/50" />오늘</span>
                          </div>
                        </div>

                        {/* Right panel: selected day detail or month summary */}
                        <div className="border-l border-border-light pl-4">
                          {selectedCalDay && selectedDayEvents.length > 0 ? (
                            <div>
                              <p className="text-xs font-semibold text-text-primary mb-3">
                                {new Date(selectedCalDay).getMonth() + 1}월 {new Date(selectedCalDay).getDate()}일 정비 ({selectedDayEvents.length}건)
                              </p>
                              <div className="space-y-2.5">
                                {selectedDayEvents.map((ev, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setSelectedPlate(ev.plate)}
                                    className="w-full text-left p-3 rounded-[--radius-md] border border-border-light hover:border-brand/30 hover:bg-brand-50/30 transition-all cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <span className="text-xs font-bold text-text-primary">{ev.plate}</span>
                                      {ev.autoExcluded && <Badge variant="danger">배차 제외</Badge>}
                                    </div>
                                    <p className="text-[11px] text-text-secondary">{ev.type}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : selectedCalDay ? (
                            <div className="flex flex-col items-center justify-center h-full text-text-muted">
                              <Calendar size={20} className="mb-2 opacity-30" />
                              <p className="text-xs">예정된 정비가 없습니다</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-semibold text-text-primary mb-3">
                                {calMonth.month + 1}월 정비 요약 ({monthEvents.length}건)
                              </p>
                              {monthEvents.length === 0 ? (
                                <p className="text-xs text-text-muted py-4 text-center">이 달에 예정된 정비가 없습니다</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {monthEvents.map((s, i) => {
                                    const dt = new Date(s.date);
                                    return (
                                      <button
                                        key={i}
                                        onClick={() => setSelectedPlate(s.plate)}
                                        className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-[--radius-sm] hover:bg-surface-secondary transition-colors cursor-pointer"
                                      >
                                        <span className="text-[10px] tabular-nums text-text-muted w-9 shrink-0">{dt.getMonth() + 1}/{dt.getDate()}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.autoExcluded ? "bg-danger" : "bg-warning"}`} />
                                        <span className="text-[11px] font-medium text-text-primary shrink-0">{s.plate}</span>
                                        <span className="text-[10px] text-text-muted flex-1 truncate">{s.type}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={selectedPlate}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
              {/* Back to overview */}
              <button
                onClick={() => setSelectedPlate(null)}
                className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-600 font-medium mb-3 cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
                전체 현황으로 돌아가기
              </button>

              <div className="grid grid-cols-[1fr_1fr] gap-4">
                {/* Left Column: Vehicle Info + RUL Gauges */}
                <div className="flex flex-col gap-4">
                  {/* Vehicle Info */}
                  <Card hover={false}>
                    <h3 className="text-lg font-semibold text-text-primary mb-3">차량 정보</h3>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-6">
                      <div>
                        <span className="text-sm text-text-muted">차량번호</span>
                        <p className="text-base font-semibold text-text-primary mt-0.5">{detail.plateNumber}</p>
                      </div>
                      <div>
                        <span className="text-sm text-text-muted">모델</span>
                        <p className="text-base font-semibold text-text-primary mt-0.5">{detail.model}</p>
                      </div>
                      <div>
                        <span className="text-sm text-text-muted">연식</span>
                        <p className="text-base font-semibold text-text-primary mt-0.5">{detail.year}년</p>
                      </div>
                      <div>
                        <span className="text-sm text-text-muted">주행거리</span>
                        <p className="text-base font-semibold text-text-primary mt-0.5 tabular-nums">
                          {detail.mileage.toLocaleString()} km
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Component RUL Gauges */}
                  <Card hover={false}>
                    <h3 className="text-lg font-semibold text-text-primary mb-3">부품 잔여수명 (RUL)</h3>
                    <motion.div
                      className="space-y-4"
                      initial="hidden"
                      animate="visible"
                      variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.2 } },
                      }}
                    >
                      {detail.components.map((comp) => (
                        <motion.div
                          key={comp.name}
                          variants={{
                            hidden: { opacity: 0, x: -20 },
                            visible: { opacity: 1, x: 0 },
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-text-secondary">
                              {comp.name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-text-muted">
                                잔여 {comp.rul}일
                              </span>
                              <span
                                className={`text-xs font-semibold ${
                                  comp.health >= 70
                                    ? "text-success"
                                    : comp.health >= 40
                                      ? "text-warning"
                                      : "text-danger"
                                }`}
                              >
                                {comp.health}%
                              </span>
                            </div>
                          </div>
                          <Gauge percent={comp.health} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </Card>
                </div>

                {/* Right Column: Alert Log + Maintenance Schedule */}
                <div className="flex flex-col gap-4">
                  {/* Alert Log */}
                  <Card hover={false}>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <h3 className="text-lg font-semibold text-text-primary">알림 이력</h3>
                    </div>
                    {detail.alerts.length === 0 ? (
                      <p className="text-sm text-text-muted py-4 text-center">
                        등록된 알림이 없습니다
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {detail.alerts.map((alert, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5"
                          >
                            <StatusDot
                              status={alert.severity === "danger" ? "danger" : "warning"}
                            />
                            <span className="text-xs text-text-muted tabular-nums shrink-0">
                              {alert.date}
                            </span>
                            <span className="text-sm text-text-secondary leading-snug">
                              {alert.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  {/* Maintenance Schedule */}
                  <Card hover={false}>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-brand" />
                      <h3 className="text-lg font-semibold text-text-primary">정비 일정</h3>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">다음 정비일</span>
                        <span className="font-semibold text-text-primary tabular-nums">
                          {detail.nextMaintenance.date}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">정비 유형</span>
                        <span className="font-semibold text-text-primary">
                          {detail.nextMaintenance.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">배차 자동 제외</span>
                        {detail.nextMaintenance.autoExcluded ? (
                          <Badge variant="blue">자동 제외</Badge>
                        ) : (
                          <Badge variant="safe">해당 없음</Badge>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowWorkOrder(true)}
                      className="mt-5 w-full py-2.5 bg-brand text-white text-sm font-semibold rounded-[--radius-md] hover:bg-brand-700 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 outline-none transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <FileText size={16} />
                      정비 작업지시서 생성
                    </button>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* ── Work Order Modal ── */}
      <AnimatePresence>
        {showWorkOrder && detail && selectedVehicle && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-surface-overlay"
              onClick={() => setShowWorkOrder(false)}
            />

            {/* Modal */}
            <motion.div
              className="relative bg-surface rounded-[--radius-xl] shadow-[--shadow-xl] w-[700px] max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
                  <FileText size={20} className="text-brand" />
                  정비 작업지시서
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (printRef.current) {
                        const printWindow = window.open("", "_blank");
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>정비 작업지시서 - ${detail.plateNumber}</title>
                                <style>
                                  * { margin: 0; padding: 0; box-sizing: border-box; }
                                  body { font-family: 'Pretendard', -apple-system, sans-serif; padding: 40px; color: #111827; }
                                  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                                  th, td { border: 1px solid #D1D5DB; padding: 10px 12px; text-align: left; font-size: 14px; }
                                  th { background: #F3F4F6; font-weight: 600; }
                                  h1 { font-size: 22px; text-align: center; margin-bottom: 8px; }
                                  h2 { font-size: 16px; margin: 20px 0 8px; border-bottom: 2px solid #111827; padding-bottom: 4px; }
                                  .subtitle { text-align: center; color: #6B7280; font-size: 14px; margin-bottom: 24px; }
                                  .header-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
                                  .badge { display: inline-block; background: #DBEAFE; color: #1D4ED8; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
                                  .badge-danger { background: #FEE2E2; color: #DC2626; }
                                  .badge-warning { background: #FEF3C7; color: #D97706; }
                                  .gauge-bar { height: 12px; border-radius: 6px; background: #E5E7EB; }
                                  .gauge-fill { height: 12px; border-radius: 6px; }
                                  .green { background: #22C55E; }
                                  .amber { background: #F59E0B; }
                                  .red { background: #EF4444; }
                                  .sign-area { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 40px; }
                                  .sign-box { border-top: 1px solid #9CA3AF; padding-top: 8px; text-align: center; font-size: 13px; color: #6B7280; }
                                  @media print { body { padding: 20px; } }
                                </style>
                              </head>
                              <body>
                                ${printRef.current.innerHTML}
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                          printWindow.print();
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-[--radius-md] transition-colors"
                  >
                    <Printer size={15} />
                    인쇄
                  </button>
                  <button
                    onClick={() => {
                      setShowWorkOrder(false);
                      addToast("success", "작업지시서가 생성되어 정비팀에 전달되었습니다.");
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand-700 rounded-[--radius-md] transition-colors"
                  >
                    <CheckCircle2 size={15} />
                    확정 및 전달
                  </button>
                  <button
                    onClick={() => setShowWorkOrder(false)}
                    className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-surface-secondary rounded-[--radius-md] transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Printable Content */}
              <div ref={printRef} className="px-6 py-5">
                <h1 style={{ fontSize: 22, textAlign: "center", marginBottom: 8, fontWeight: 700 }}>
                  정비 작업지시서
                </h1>
                <p className="subtitle" style={{ textAlign: "center", color: "#6B7280", fontSize: 14, marginBottom: 24 }}>
                  덕양가스 AI 통합 관제 플랫폼 — 자동 생성
                </p>

                {/* Basic Info */}
                <h2 style={{ fontSize: 16, marginBottom: 8, borderBottom: "2px solid #111827", paddingBottom: 4, fontWeight: 600 }}>
                  1. 차량 기본 정보
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0" }}>
                  <tbody>
                    {[
                      ["작업지시번호", `WO-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}${String(new Date().getDate()).padStart(2,"0")}-${detail.plateNumber.replace(/[^0-9]/g,"").slice(-4)}`],
                      ["발행일", new Date().toLocaleDateString("ko-KR")],
                      ["차량번호", detail.plateNumber],
                      ["차량모델", `${detail.model} (${detail.year}년식)`],
                      ["주행거리", `${detail.mileage.toLocaleString()} km`],
                      ["담당기사", selectedVehicle.driver],
                      ["종합 건강점수", `${detail.overallScore}점 / 100점`],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <th style={{ border: "1px solid #D1D5DB", padding: "8px 12px", background: "#F3F4F6", fontWeight: 600, fontSize: 13, width: "35%" }}>
                          {label}
                        </th>
                        <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 13 }}>
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Maintenance Items */}
                <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 8, borderBottom: "2px solid #111827", paddingBottom: 4, fontWeight: 600 }}>
                  2. 정비 항목
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0" }}>
                  <thead>
                    <tr>
                      {["부품명", "잔여수명(일)", "건강도(%)", "상태", "정비 내용"].map(h => (
                        <th key={h} style={{ border: "1px solid #D1D5DB", padding: "8px 12px", background: "#F3F4F6", fontWeight: 600, fontSize: 13 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.components.map((comp) => {
                      const needsWork = comp.health < 60;
                      const needsWatch = comp.health < 70 && comp.health >= 60;
                      return (
                        <tr key={comp.name} style={{ background: needsWork ? "#FEF2F2" : needsWatch ? "#FFFBEB" : "white" }}>
                          <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 13, fontWeight: 500 }}>
                            {comp.name}
                          </td>
                          <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 13, textAlign: "center" }}>
                            {comp.rul}일
                          </td>
                          <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 13, textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 10, borderRadius: 5, background: "#E5E7EB" }}>
                                <div style={{
                                  width: `${comp.health}%`,
                                  height: 10,
                                  borderRadius: 5,
                                  background: comp.health >= 70 ? "#22C55E" : comp.health >= 40 ? "#F59E0B" : "#EF4444",
                                }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, minWidth: 32 }}>{comp.health}%</span>
                            </div>
                          </td>
                          <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 12, textAlign: "center" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: needsWork ? "#FEE2E2" : needsWatch ? "#FEF3C7" : "#DCFCE7",
                              color: needsWork ? "#DC2626" : needsWatch ? "#D97706" : "#16A34A",
                            }}>
                              {needsWork ? "교체 필요" : needsWatch ? "주의 관찰" : "양호"}
                            </span>
                          </td>
                          <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 13 }}>
                            {needsWork
                              ? `${comp.name} 즉시 교체 — 잔여수명 ${comp.rul}일 이내`
                              : needsWatch
                                ? `${comp.name} 상태 점검 및 교체 준비`
                                : "정기 점검 시 확인"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Scheduled Maintenance */}
                <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 8, borderBottom: "2px solid #111827", paddingBottom: 4, fontWeight: 600 }}>
                  3. 정비 일정
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0" }}>
                  <tbody>
                    {[
                      ["정비 예정일", detail.nextMaintenance.date],
                      ["정비 유형", detail.nextMaintenance.type],
                      ["배차 자동 제외", detail.nextMaintenance.autoExcluded ? "예 (정비 완료 시까지 배차 제외)" : "아니오"],
                      ["예상 소요시간", detail.components.filter(c => c.health < 60).length > 1 ? "4~6시간" : "2~3시간"],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <th style={{ border: "1px solid #D1D5DB", padding: "8px 12px", background: "#F3F4F6", fontWeight: 600, fontSize: 13, width: "35%" }}>
                          {label}
                        </th>
                        <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 13 }}>
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Recent Alerts */}
                {detail.alerts.length > 0 && (
                  <>
                    <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 8, borderBottom: "2px solid #111827", paddingBottom: 4, fontWeight: 600 }}>
                      4. 최근 이상 알림 이력
                    </h2>
                    <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0" }}>
                      <thead>
                        <tr>
                          {["날짜", "심각도", "내용"].map(h => (
                            <th key={h} style={{ border: "1px solid #D1D5DB", padding: "8px 12px", background: "#F3F4F6", fontWeight: 600, fontSize: 13 }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.alerts.map((alert, i) => (
                          <tr key={i}>
                            <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 13, width: "20%" }}>
                              {alert.date}
                            </td>
                            <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 12, textAlign: "center", width: "15%" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                background: alert.severity === "danger" ? "#FEE2E2" : "#FEF3C7",
                                color: alert.severity === "danger" ? "#DC2626" : "#D97706",
                              }}>
                                {alert.severity === "danger" ? "위험" : "주의"}
                              </span>
                            </td>
                            <td style={{ border: "1px solid #D1D5DB", padding: "8px 12px", fontSize: 13 }}>
                              {alert.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {/* AI Recommendation */}
                <h2 style={{ fontSize: 16, marginTop: 20, marginBottom: 8, borderBottom: "2px solid #111827", paddingBottom: 4, fontWeight: 600 }}>
                  {detail.alerts.length > 0 ? "5" : "4"}. AI 정비 권고사항
                </h2>
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: 16, fontSize: 13, lineHeight: 1.7 }}>
                  <p style={{ fontWeight: 600, marginBottom: 8, color: "#1E40AF" }}>
                    AI 예지보전 시스템 분석 결과
                  </p>
                  <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
                    {detail.components.filter(c => c.health < 60).map(c => (
                      <li key={c.name}>
                        <strong>{c.name}</strong>: 건강도 {c.health}%, 잔여수명 {c.rul}일.
                        즉시 교체를 권고합니다. {c.rul < 30 ? "지연 시 운행 중 고장 위험이 있습니다." : ""}
                      </li>
                    ))}
                    {detail.components.filter(c => c.health >= 60 && c.health < 70).map(c => (
                      <li key={c.name}>
                        <strong>{c.name}</strong>: 건강도 {c.health}%, 잔여수명 {c.rul}일.
                        다음 정기점검 시 교체를 준비하시기 바랍니다.
                      </li>
                    ))}
                    <li>
                      정비 완료 후 <strong>배차 시스템에 자동 반영</strong>되며,
                      정비 기간 동안 해당 차량은 배차에서 제외됩니다.
                    </li>
                  </ul>
                </div>

                {/* Signature Area */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginTop: 48 }}>
                  {["작성자 (AI 시스템)", "정비 담당자", "관리자 확인"].map(label => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ height: 48 }} />
                      <div style={{ borderTop: "1px solid #9CA3AF", paddingTop: 8, fontSize: 13, color: "#6B7280" }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
