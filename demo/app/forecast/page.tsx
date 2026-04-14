"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  TrendingUp,
  Sparkles,
  BarChart3,
  Users,
  Lightbulb,
  CalendarClock,
  Droplets,
  AlertTriangle,
  Target,
  Layers,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { customers, forecasts, kakaoSamples } from "@/lib/data";
import Card from "@/components/ui/Card";
import Gauge from "@/components/ui/Gauge";
import StatusDot from "@/components/ui/StatusDot";
import ProductDot from "@/components/ui/ProductDot";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/components/ui/Toast";

// ── Product constants ──
const PRODUCTS = ["N2", "O2", "CO2", "AR", "LPG", "O2-M"] as const;
const PRODUCT_NAMES: Record<string, string> = { N2: "액화질소", O2: "액화산소", CO2: "액화탄산", AR: "액화알곤", LPG: "LPG", "O2-M": "의료용산소" };
const PRODUCT_COLORS: Record<string, string> = {
  N2: "#4B8DF8", O2: "#E8564C", CO2: "#9066E0", AR: "#1AADCA", LPG: "#E88A3E", "O2-M": "#D65B93",
};

// Sort customers: danger first, then warning, then safe
const sortedCustomers = [...customers].sort((a, b) => {
  const order = { danger: 0, warning: 1, safe: 2 };
  return order[a.riskLevel] - order[b.riskLevel];
});

export default function ForecastPage() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const customerParam = searchParams.get("customer");
  const [activeTab, setActiveTab] = useState<"consolidated" | "detail">(
    viewParam === "detail" ? "detail" : "consolidated",
  );
  const [selectedId, setSelectedId] = useState<string | null>(customerParam);

  // Sync tab and customer selection with URL parameters
  useEffect(() => {
    setActiveTab(viewParam === "detail" ? "detail" : "consolidated");
    if (customerParam) setSelectedId(customerParam);
  }, [viewParam, customerParam]);
  const [searchQuery, setSearchQuery] = useState("");
  const [productFilter, setProductFilter] = useState<string>("전체");
  const { addToast } = useToast();

  // ── Consolidated supply data (past actual + future predicted refills) ──
  const consolidatedData = useMemo(() => {
    const fmtN = (n: number) => n.toLocaleString("ko-KR");

    // Collect ALL refill events: past / confirmed / predicted
    type SupplyStatus = "past" | "confirmed" | "predicted";
    type SupplyEvent = { date: string; customer: string; customerFull: string; product: string; quantity: number; preLevel: number; type: SupplyStatus; driver?: string; vehicle?: string; source?: string };
    const allSupplyEvents: SupplyEvent[] = [];

    // Build confirmed customer set from kakao orders + danger-level VMI auto-triggers
    const confirmedCustomers = new Set<string>();
    const confirmedSources = new Map<string, string>();
    for (const k of kakaoSamples) {
      const c = customers.find((cc) => cc.name === k.parsed.customer);
      if (c) {
        confirmedCustomers.add(c.name);
        confirmedSources.set(c.name, "카톡 발주");
      }
    }
    // Danger-level customers → VMI auto-order confirmed
    for (const c of customers) {
      if (c.riskLevel === "danger" && !confirmedCustomers.has(c.name)) {
        confirmedCustomers.add(c.name);
        confirmedSources.set(c.name, "VMI 자동주문");
      }
    }

    // Daily supply aggregation by product (for chart)
    const dailySupply = new Map<string, Record<string, number>>();
    const addToDay = (date: string, product: string, qty: number) => {
      const existing = dailySupply.get(date) || {};
      existing[product] = (existing[product] || 0) + qty;
      dailySupply.set(date, existing);
    };

    for (const c of customers) {
      const fc = forecasts[c.name];
      if (!fc) continue;

      // Past: actual refill events from history (last 14 days)
      for (const h of fc.history.slice(-14)) {
        if (h.refill) {
          allSupplyEvents.push({
            date: h.date, customer: c.shortName, customerFull: c.name, product: c.product,
            quantity: h.refill.quantity, preLevel: h.refill.preLevel,
            type: "past", driver: h.refill.driver, vehicle: h.refill.vehicle,
          });
          addToDay(h.date, c.product, h.refill.quantity);
        }
      }

      // Future: classify as confirmed or predicted
      const isConfirmed = confirmedCustomers.has(c.name);
      let firstFutureHandled = false;
      for (const fp of fc.forecast) {
        if (fp.refillEvent) {
          // First refill for confirmed customers = confirmed, rest = predicted
          const status: SupplyStatus = (isConfirmed && !firstFutureHandled) ? "confirmed" : "predicted";
          if (isConfirmed && !firstFutureHandled) firstFutureHandled = true;
          allSupplyEvents.push({
            date: fp.date, customer: c.shortName, customerFull: c.name, product: c.product,
            quantity: fp.refillEvent.quantity, preLevel: fp.refillEvent.preLevel,
            type: status,
            source: status === "confirmed" ? confirmedSources.get(c.name) : undefined,
          });
          addToDay(fp.date, c.product, fp.refillEvent.quantity);
        }
      }
    }

    allSupplyEvents.sort((a, b) => a.date.localeCompare(b.date));

    // Find "today" boundary: last date that has a past event
    const pastDates = allSupplyEvents.filter((e) => e.type === "past").map((e) => e.date);
    const todayDate = pastDates.length > 0 ? pastDates.sort().pop()! : "2026-04-14";
    const todayDt = new Date(todayDate);
    const todayLabel = `${todayDt.getMonth() + 1}.${String(todayDt.getDate()).padStart(2, "0")}`;

    // Build timeline for chart
    const dailyTimeline = Array.from(dailySupply.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, products]) => {
        const dt = new Date(date);
        return {
          date,
          dateLabel: `${dt.getMonth() + 1}.${String(dt.getDate()).padStart(2, "0")}`,
          ...products,
          total: Object.values(products).reduce((s, v) => s + v, 0),
          isPast: date <= todayDate,
        };
      });

    // Separate past / confirmed / predicted
    const pastEvents = allSupplyEvents.filter((e) => e.type === "past");
    const confirmedEvents = allSupplyEvents.filter((e) => e.type === "confirmed");
    const predictedEvents = allSupplyEvents.filter((e) => e.type === "predicted");
    const pastTotal = pastEvents.reduce((s, e) => s + e.quantity, 0);
    const confirmedTotal = confirmedEvents.reduce((s, e) => s + e.quantity, 0);
    const predictedTotal = predictedEvents.reduce((s, e) => s + e.quantity, 0);
    const futureTotal = confirmedTotal + predictedTotal;

    // Product totals (from all events)
    const productTotals: Record<string, { past: number; future: number }> = {};
    for (const e of allSupplyEvents) {
      const existing = productTotals[e.product] || { past: 0, future: 0 };
      if (e.type === "past") existing.past += e.quantity;
      else existing.future += e.quantity;
      productTotals[e.product] = existing;
    }
    const totalAll = pastTotal + futureTotal;
    const productPie = Object.entries(productTotals)
      .sort(([, a], [, b]) => (b.past + b.future) - (a.past + a.future))
      .map(([name, d]) => ({
        name,
        fullName: PRODUCT_NAMES[name] || name,
        value: d.past + d.future,
        past: d.past,
        future: d.future,
        pct: totalAll > 0 ? Math.round((d.past + d.future) / totalAll * 1000) / 10 : 0,
        color: PRODUCT_COLORS[name] || "#999",
      }));

    // Urgent customers
    const urgentCustomers = customers
      .filter((c) => c.depletionDays <= 3)
      .sort((a, b) => a.depletionDays - b.depletionDays);

    // Average MAPE
    const mapes = Object.values(forecasts).map((f) => f.mape);
    const avgMape = mapes.length > 0 ? Math.round(mapes.reduce((s, m) => s + m, 0) / mapes.length * 10) / 10 : 0;

    // Peak supply day
    const peakDay = dailyTimeline.reduce((max, d) => d.total > (max?.total ?? 0) ? d : max, dailyTimeline[0]);

    // AI insights
    const insights: { type: "success" | "warning" | "info"; text: string }[] = [];
    if (urgentCustomers.length > 0) {
      insights.push({ type: "warning", text: `${urgentCustomers.map((c) => c.shortName).join(", ")} — 48시간 내 고갈 예상. 긴급 보충 필요` });
    }
    if (peakDay) {
      insights.push({ type: "info", text: `${peakDay.dateLabel}이 공급 피크일 (${fmtN(peakDay.total)}kg) — 차량 집중 배치 필요` });
    }
    // Days with 3+ deliveries
    const busyDays = dailyTimeline.filter((d) => {
      const dayEvents = allSupplyEvents.filter((e) => e.date === d.date);
      return dayEvents.length >= 3;
    });
    if (busyDays.length > 0) {
      insights.push({ type: "warning", text: `${busyDays.length}일이 3건 이상 동시 배송 — 배차 충돌 주의` });
    }
    const n2total = (productTotals["N2"]?.past ?? 0) + (productTotals["N2"]?.future ?? 0);
    if (totalAll > 0 && n2total / totalAll > 0.35) {
      insights.push({ type: "info", text: `N2(액화질소)가 총 공급의 ${(n2total / totalAll * 100).toFixed(1)}% — 공급 안정성 집중 관리` });
    }
    if (avgMape < 25) {
      insights.push({ type: "success", text: `평균 예측 정확도 MAPE ${avgMape}% — 양호한 수준` });
    }
    if (confirmedEvents.length > 0) {
      insights.push({ type: "success", text: `확정 주문 ${confirmedEvents.length}건(${fmtN(confirmedTotal)}kg) — 카톡 발주·VMI 자동주문 기반` });
    }
    insights.push({ type: "info", text: `과거 ${pastEvents.length}회(${fmtN(pastTotal)}kg) 완료 / 확정 ${confirmedEvents.length}회 / 예측 ${predictedEvents.length}회(${fmtN(predictedTotal)}kg)` });

    // First and last dateLabels for reference areas
    const pastTimeline = dailyTimeline.filter((d) => d.isPast);
    const futureTimeline = dailyTimeline.filter((d) => !d.isPast);
    const firstPastLabel = pastTimeline[0]?.dateLabel ?? todayLabel;
    const lastFutureLabel = futureTimeline[futureTimeline.length - 1]?.dateLabel ?? todayLabel;

    return { dailyTimeline, allSupplyEvents, pastEvents, confirmedEvents, predictedEvents, pastTotal, confirmedTotal, predictedTotal, futureTotal, productPie, urgentCustomers, avgMape, insights, todayLabel, firstPastLabel, lastFutureLabel };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sortedCustomers;
    const q = searchQuery.toLowerCase();
    return sortedCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        c.product.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;
  const forecast = selected ? forecasts[selected.name] : null;

  // Danger / Warning counts for header badges
  const dangerCount = sortedCustomers.filter((c) => c.riskLevel === "danger").length;
  const warningCount = sortedCustomers.filter((c) => c.riskLevel === "warning").length;

  // Chart data point type
  interface ChartPoint {
    date: string;
    label: string;
    history?: number;
    predicted?: number;
    noRefill?: number;
    lower?: number;
    upper?: number;
    range?: [number, number];
    // 과거 보충 이벤트
    historyRefill?: { driver: string; vehicle: string; quantity: number; preLevel: number; time: string };
    // 미래 보충 이벤트
    refillEvent?: { quantity: number; preLevel: number };
  }

  // Merge history + forecast into one chart dataset
  const chartData = useMemo((): ChartPoint[] => {
    if (!forecast) return [];

    const historySlice = forecast.history.slice(-14);
    const merged: ChartPoint[] = [];

    for (const h of historySlice) {
      const d = h.date.slice(5);
      merged.push({
        date: h.date,
        label: d,
        history: h.level,
        historyRefill: h.refill,
      });
    }

    // bridge: add last history point also as first forecast point
    const lastHist = historySlice[historySlice.length - 1];
    if (lastHist) {
      merged[merged.length - 1] = {
        ...merged[merged.length - 1],
        predicted: lastHist.level,
        noRefill: lastHist.level,
        range: [lastHist.level, lastHist.level],
      };
    }

    for (const f of forecast.forecast) {
      const d = f.date.slice(5);
      merged.push({
        date: f.date,
        label: d,
        predicted: f.predicted,
        noRefill: f.noRefill,
        lower: f.lower,
        upper: f.upper,
        range: [f.lower, f.upper],
        refillEvent: f.refillEvent,
      });
    }

    return merged;
  }, [forecast]);

  // Find refill events (future) for vertical markers
  const futureRefillPoints = useMemo(() => {
    return chartData.filter((d) => d.refillEvent);
  }, [chartData]);

  // Find past refill events for vertical markers
  const pastRefillPoints = useMemo(() => {
    return chartData.filter((d) => d.historyRefill);
  }, [chartData]);

  const handleOrder = () => {
    addToast(
      "success",
      "주문이 생성되었습니다. 배차최적화에 반영됩니다.",
    );
  };

  const fmt = (n: number) => n.toLocaleString("ko-KR");
  const cd = consolidatedData;

  return (
    <PageTransition>
      {/* ── Tab Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">수요예측 (VMI)</h1>
          <p className="text-sm text-text-muted mt-0.5">AI 기반 수요예측 · 14일 선행 분석</p>
        </div>
        <div className="flex items-center gap-1 bg-surface-secondary rounded-[--radius-md] p-1">
          {([
            { key: "consolidated" as const, icon: BarChart3, label: "통합 수요", href: "/forecast" },
            { key: "detail" as const, icon: Users, label: "거래처별 상세", href: "/forecast?view=detail" },
          ]).map((tab) => (
            <a
              key={tab.key}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius-sm] text-xs font-medium transition-colors cursor-pointer no-underline ${
                activeTab === tab.key
                  ? "bg-surface shadow-[--shadow-xs] text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </a>
          ))}
        </div>
      </div>

      {activeTab === "consolidated" ? (
        /* ═══════════════════════════════════════
           CONSOLIDATED DEMAND VIEW
           ═══════════════════════════════════════ */
        <div className="space-y-4">
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-5 gap-3">
            <Card hover={false} className="!py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[--radius-md] bg-success-bg flex items-center justify-center">
                  <Droplets size={18} className="text-success" />
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">과거 14일 공급 완료</p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{fmt(Math.round(cd.pastTotal / 1000))}톤</p>
                  <p className="text-[10px] text-text-muted">{cd.pastEvents.length}회 배송</p>
                </div>
              </div>
            </Card>
            <Card hover={false} className="!py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[--radius-md] bg-warning-bg flex items-center justify-center">
                  <CalendarClock size={18} className="text-warning" />
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">확정 주문</p>
                  <p className="text-lg font-bold tabular-nums leading-tight text-warning">{fmt(Math.round(cd.confirmedTotal / 1000))}톤</p>
                  <p className="text-[10px] text-text-muted">{cd.confirmedEvents.length}건 (카톡·VMI)</p>
                </div>
              </div>
            </Card>
            <Card hover={false} className="!py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[--radius-md] bg-brand-50 flex items-center justify-center">
                  <CalendarClock size={18} className="text-brand" />
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">AI 예측 수요</p>
                  <p className="text-lg font-bold tabular-nums leading-tight text-brand">{fmt(Math.round(cd.predictedTotal / 1000))}톤</p>
                  <p className="text-[10px] text-text-muted">{cd.predictedEvents.length}건 (미확정)</p>
                </div>
              </div>
            </Card>
            <Card hover={false} className="!py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[--radius-md] bg-danger-bg flex items-center justify-center">
                  <AlertTriangle size={18} className="text-danger" />
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">긴급 보충 (48h 이내)</p>
                  <p className="text-lg font-bold tabular-nums leading-tight text-danger">{cd.urgentCustomers.length}곳</p>
                </div>
              </div>
            </Card>
            <Card hover={false} className="!py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[--radius-md] bg-info-bg flex items-center justify-center">
                  <Target size={18} className="text-info" />
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">예측 정확도 (MAPE)</p>
                  <p className="text-lg font-bold tabular-nums leading-tight">{cd.avgMape}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* ── Main Chart + Refill Schedule ── */}
          <div className="grid grid-cols-[1fr_340px] gap-4">
            {/* 14-Day Stacked Area */}
            <Card hover={false}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">공급 타임라인 (실제 + 예측)</h2>
                  <p className="text-[10px] text-text-muted mt-0.5">보충 이벤트가 발생한 날의 제품별 공급량 (kg)</p>
                </div>
                <div className="flex items-center gap-1">
                  {["전체", ...PRODUCTS.filter((p) => cd.productPie.some((pp) => pp.name === p))].map((p) => (
                    <button
                      key={p}
                      onClick={() => setProductFilter(p)}
                      className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors cursor-pointer ${
                        productFilter === p
                          ? "bg-brand text-white"
                          : "bg-surface-secondary text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      {p === "전체" ? "전체" : p}
                    </button>
                  ))}
                </div>
              </div>
              {/* Axis legend */}
              <div className="flex items-center justify-between mb-2 ml-10 mr-12">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span className="w-4 h-2.5 rounded-sm bg-success/15 border border-success/30" />
                    과거 실적
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span className="w-4 h-2.5 rounded-sm bg-brand/10 border border-brand/20" />
                    미래 예측
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span className="w-4 h-2.5 rounded-sm bg-brand/20 border border-brand/40" />
                    좌축: 면적 (대용량)
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <span className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: "var(--color-product-co2)", opacity: 0.6 }} />
                    우축: 막대 (소용량)
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={cd.dailyTimeline} margin={{ top: 5, right: 50, left: -10, bottom: 0 }}>
                  <defs>
                    {cd.productPie.map((p) => (
                      <linearGradient key={p.name} id={`demand-${p.name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={p.color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={p.color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                  <XAxis
                    dataKey="dateLabel"
                    tick={(props: Record<string, unknown>) => {
                      const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
                      const isToday = payload.value === cd.todayLabel;
                      return (
                        <text x={x} y={(y as number) + 12} textAnchor="middle" fontSize={isToday ? 11 : 10} fontWeight={isToday ? 700 : 400} fill={isToday ? "var(--color-text-primary)" : "var(--color-text-muted)"}>
                          {isToday ? `● ${payload.value}` : payload.value}
                        </text>
                      );
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  {/* Left axis: major products */}
                  <YAxis
                    yAxisId="major"
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}t`}
                  />
                  {/* Right axis: minor products */}
                  <YAxis
                    yAxisId="minor"
                    orientation="right"
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-light)", boxShadow: "var(--shadow-md)" }}
                    formatter={(v) => v != null ? `${Number(v).toLocaleString()}kg` : ""}
                    labelFormatter={(label) => {
                      const item = cd.dailyTimeline.find((d) => d.dateLabel === label);
                      return item?.isPast ? `📋 ${label} — 실적 (공급 완료)` : `🔮 ${label} — 예측 (공급 예정)`;
                    }}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} verticalAlign="top" align="right" />

                  {/* Background zones: past (green tint) vs future (blue tint) */}
                  <ReferenceArea
                    yAxisId="major"
                    x1={cd.firstPastLabel}
                    x2={cd.todayLabel}
                    fill="var(--color-success)"
                    fillOpacity={0.04}
                    stroke="none"
                  />
                  <ReferenceArea
                    yAxisId="major"
                    x1={cd.todayLabel}
                    x2={cd.lastFutureLabel}
                    fill="var(--color-brand)"
                    fillOpacity={0.04}
                    stroke="none"
                  />

                  {/* "오늘" divider line */}
                  <ReferenceLine
                    yAxisId="major"
                    x={cd.todayLabel}
                    stroke="var(--color-text-primary)"
                    strokeWidth={2}
                    strokeDasharray="none"
                    label={{
                      value: "오늘",
                      position: "insideTopLeft",
                      fill: "var(--color-text-primary)",
                      fontSize: 11,
                      fontWeight: 700,
                      offset: 6,
                    }}
                  />

                  {/* Major products: Stacked Area (left axis) */}
                  {(productFilter === "전체" ? ["N2", "O2", "AR"] : [productFilter]).filter((p) => ["N2", "O2", "AR"].includes(p)).map((p) => (
                    <Area
                      key={p}
                      yAxisId="major"
                      type="monotone"
                      dataKey={p}
                      stackId={productFilter === "전체" ? "major" : undefined}
                      stroke={PRODUCT_COLORS[p]}
                      fill={`url(#demand-${p})`}
                      strokeWidth={1.5}
                      name={PRODUCT_NAMES[p]}
                    />
                  ))}
                  {/* Minor products: Stacked Bars (right axis) */}
                  {(productFilter === "전체" ? ["CO2", "LPG", "O2-M"] : [productFilter]).filter((p) => ["CO2", "LPG", "O2-M"].includes(p)).map((p) => (
                    <Bar
                      key={p}
                      yAxisId="minor"
                      dataKey={p}
                      stackId="minor"
                      fill={PRODUCT_COLORS[p]}
                      opacity={0.7}
                      radius={p === "O2-M" ? [2, 2, 0, 0] : undefined}
                      barSize={12}
                      name={`${PRODUCT_NAMES[p]} ⓡ`}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Refill Schedule */}
            <Card hover={false} className="!p-0 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border-light flex items-center gap-2">
                <Layers size={14} className="text-text-muted" />
                <h2 className="text-sm font-semibold text-text-primary">공급 이력 + 예정</h2>
                <span className="text-[10px] text-text-muted ml-auto tabular-nums">{cd.allSupplyEvents.length}건</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scroll max-h-[280px]">
                {(() => {
                  let lastDate = "";
                  return cd.allSupplyEvents.map((r, i) => {
                    const showDate = r.date !== lastDate;
                    lastDate = r.date;
                    const dt = new Date(r.date);
                    const dateLabel = `${dt.getMonth() + 1}.${String(dt.getDate()).padStart(2, "0")}`;
                    const statusConfig = {
                      past: { label: "완료", bg: "bg-success-bg", text: "text-success", qty: "text-success" },
                      confirmed: { label: r.source === "카톡 발주" ? "카톡 확정" : "VMI 확정", bg: "bg-warning-bg", text: "text-warning", qty: "text-warning" },
                      predicted: { label: "AI 예측", bg: "bg-surface-secondary", text: "text-text-muted", qty: "text-brand" },
                    }[r.type];
                    return (
                      <div key={i}>
                        {showDate && (
                          <div className={`px-4 py-1.5 text-[10px] font-semibold sticky top-0 flex items-center gap-2 ${
                            dateLabel === cd.todayLabel ? "bg-brand-50 text-brand" : "bg-surface-secondary text-text-muted"
                          }`}>
                            {dateLabel}
                            {dateLabel === cd.todayLabel && <span className="text-[9px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-full">오늘</span>}
                          </div>
                        )}
                        <div className="px-4 py-2 flex items-center gap-2.5 border-b border-border-light last:border-0">
                          <ProductDot product={r.product} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-text-primary truncate">{r.customer}</p>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-text-muted">
                              {PRODUCT_NAMES[r.product]} · 잔량 {r.preLevel}%
                              {r.type === "past" && r.driver ? ` · ${r.driver}` : ""}
                            </p>
                          </div>
                          <span className={`text-xs font-bold tabular-nums ${statusConfig.qty}`}>{fmt(r.quantity)}kg</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </Card>
          </div>

          {/* ── Bottom Row: Product Pie + Urgent Customers ── */}
          <div className="grid grid-cols-[340px_1fr] gap-4">
            {/* Product Pie */}
            <Card hover={false}>
              <h2 className="text-sm font-semibold text-text-primary mb-2">제품별 공급 비율 (과거+예정)</h2>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={cd.productPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {cd.productPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => v != null ? `${fmt(Math.round(Number(v) / 1000))}톤` : ""} contentStyle={{ fontSize: 12, borderRadius: "var(--radius-md)" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {cd.productPie.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <ProductDot product={d.name} />
                    <span className="text-text-secondary flex-1">{d.fullName}</span>
                    <span className="tabular-nums text-success text-[10px]">{fmt(Math.round(d.past / 1000))}t</span>
                    <span className="text-text-muted text-[10px]">+</span>
                    <span className="tabular-nums text-brand text-[10px]">{fmt(Math.round(d.future / 1000))}t</span>
                    <span className="font-bold tabular-nums text-text-primary w-10 text-right">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Urgent Customers + AI Insights */}
            <div className="grid grid-cols-2 gap-4">
              {/* Urgent customers table */}
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-danger" />
                  <h2 className="text-sm font-semibold text-text-primary">고갈 임박 거래처</h2>
                </div>
                <div className="space-y-1">
                  {customers
                    .filter((c) => c.depletionDays <= 10)
                    .sort((a, b) => a.depletionDays - b.depletionDays)
                    .map((c) => {
                      const fc = forecasts[c.name];
                      return (
                        <a
                          key={c.id}
                          href={`/forecast?view=detail&customer=${c.id}`}
                          className="flex items-center gap-2 py-1.5 px-1.5 -mx-1.5 rounded-[--radius-sm] hover:bg-surface-secondary transition-colors cursor-pointer no-underline"
                        >
                          <StatusDot status={c.riskLevel} />
                          <span className="text-xs font-medium text-text-primary flex-1 truncate">{c.shortName}</span>
                          <ProductDot product={c.product} />
                          <span className={`text-xs font-bold tabular-nums w-10 text-right ${c.depletionDays <= 3 ? "text-danger" : "text-warning"}`}>
                            {c.depletionDays}일
                          </span>
                          <span className="text-[10px] text-text-muted tabular-nums w-14 text-right">
                            {fc ? fmt(fc.recommendedRefill) : "-"}kg
                          </span>
                        </a>
                      );
                    })}
                </div>
              </Card>

              {/* AI Insights */}
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={14} className="text-warning" />
                  <h2 className="text-sm font-semibold text-text-primary">AI 인사이트</h2>
                </div>
                <div className="space-y-2">
                  {cd.insights.map((ins, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-[--radius-md] text-xs leading-relaxed ${
                        ins.type === "success" ? "bg-success-bg text-success" : ins.type === "warning" ? "bg-warning-bg text-warning" : "bg-info-bg text-info"
                      }`}
                    >
                      {ins.text}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : (
      /* ═══════════════════════════════════════
         DETAIL VIEW (existing)
         ═══════════════════════════════════════ */
      <div className="flex gap-4 h-[calc(100vh-130px)]">
        {/* ── Left Panel: Customer List ── */}
        <div className="w-[340px] shrink-0 flex flex-col bg-surface rounded-[--radius-lg] border border-border-light shadow-[--shadow-sm] overflow-hidden">
          {/* Header with badges */}
          <div className="p-3 border-b border-border-light">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-danger-bg px-2 py-0.5 rounded-full">
                <StatusDot status="danger" size={6} /> 위험 {dangerCount}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning-bg px-2 py-0.5 rounded-full">
                <StatusDot status="warning" size={6} /> 경고 {warningCount}
              </span>
            </div>
            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="거래처/가스 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-surface-secondary border border-border-light rounded-[--radius-md]
                  focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
                  placeholder:text-text-muted"
              />
            </div>
          </div>

          {/* Customer rows */}
          <div className="flex-1 overflow-y-auto custom-scroll">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="검색 결과가 없습니다"
                description="다른 키워드로 검색해보세요"
              />
            ) : (
              filtered.map((c) => {
                const isSelected = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b border-border-light transition-colors duration-150
                      hover:bg-surface-secondary cursor-pointer
                      ${isSelected ? "bg-brand-50 border-l-2 border-l-brand" : "border-l-2 border-l-transparent"}`}
                  >
                    <div className="flex items-center gap-2">
                      <StatusDot status={c.riskLevel} />
                      <span className="text-sm font-medium text-text-primary truncate flex-1">
                        {c.shortName}
                      </span>
                      <ProductDot product={c.product} />
                      <span className="text-xs text-text-secondary">
                        {c.productName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1">
                        <Gauge percent={c.currentLevel} height="h-2" />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-text-primary w-10 text-right">
                        {c.currentLevel}%
                      </span>
                      <span
                        className={`text-xs font-semibold tabular-nums w-12 text-right ${
                          c.riskLevel === "danger"
                            ? "text-danger"
                            : c.riskLevel === "warning"
                              ? "text-warning"
                              : "text-text-muted"
                        }`}
                      >
                        {c.depletionDays}일
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Panel: Detail ── */}
        <div className="flex-1 overflow-y-auto custom-scroll space-y-4">
          {!selected || !forecast ? (
            <div className="h-full flex items-center justify-center">
              <EmptyState
                icon={TrendingUp}
                title="거래처를 선택하세요"
                description="좌측 목록에서 거래처를 선택하면 수요예측 상세를 확인할 수 있습니다"
              />
            </div>
          ) : (
            <>
              {/* Customer Info */}
              <Card hover={false} className="border-l-4 border-l-brand">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusDot status={selected.riskLevel} size={12} />
                    <h2 className="text-xl font-semibold text-text-primary">{selected.name}</h2>
                    <ProductDot product={selected.product} size={10} />
                    <span className="text-sm text-text-secondary">
                      {selected.productName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>탱크 용량 {selected.tankCapacity.toLocaleString()}kg</span>
                    <span className="text-border">|</span>
                    <span>월 배송 {selected.monthlyDeliveries}회</span>
                  </div>
                </div>
              </Card>

              {/* Forecast Chart */}
              <Card hover={false}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-text-primary">
                    14일 수요예측 차트{" "}
                    <span className="text-xs font-normal text-text-muted ml-1">
                      MAPE {forecast.mape}%
                    </span>
                  </h3>
                  {futureRefillPoints.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-success bg-success-bg px-2.5 py-1 rounded-full border border-success/20">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      VMI 보충 {futureRefillPoints.length}회 예정
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#F97316" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="dangerZone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0]?.payload;
                        return (
                          <div className="bg-surface rounded-[--radius-md] shadow-[--shadow-lg] border border-border-light px-3 py-2.5 text-sm">
                            <p className="font-semibold text-text-primary mb-1.5">{label}</p>
                            {data?.history != null && (
                              <p className="flex items-center gap-2">
                                <span className="w-2.5 h-0.5 bg-blue-500 rounded" />
                                <span className="text-text-muted">실측 잔량</span>
                                <span className="font-semibold ml-auto">{data.history}%</span>
                              </p>
                            )}
                            {/* 과거 보충 이벤트 상세 */}
                            {data?.historyRefill && (
                              <div className="mt-1.5 pt-1.5 border-t border-border-light space-y-1">
                                <p className="text-blue-700 font-semibold flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  보충 완료
                                </p>
                                <div className="text-xs text-text-muted space-y-0.5 pl-3">
                                  <p>기사: <span className="text-text-secondary font-medium">{data.historyRefill.driver}</span> ({data.historyRefill.vehicle})</p>
                                  <p>도착: <span className="text-text-secondary font-medium">{data.historyRefill.time}</span></p>
                                  <p>보충량: <span className="text-text-secondary font-medium">{data.historyRefill.quantity.toLocaleString()}kg</span></p>
                                  <p>잔량: <span className="text-danger">{data.historyRefill.preLevel}%</span> → <span className="text-brand font-medium">{data.history}%</span></p>
                                </div>
                              </div>
                            )}
                            {data?.predicted != null && !data?.history && (
                              <p className="flex items-center gap-2">
                                <span className="w-2.5 h-0.5 bg-orange-500 rounded" />
                                <span className="text-text-muted">VMI 보충 시</span>
                                <span className="font-semibold ml-auto">{data.predicted}%</span>
                              </p>
                            )}
                            {data?.noRefill != null && !data?.history && (
                              <p className="flex items-center gap-2">
                                <span className="w-2.5 h-0.5 bg-red-400 rounded" />
                                <span className="text-text-muted">보충 없음</span>
                                <span className="font-semibold ml-auto text-danger">{data.noRefill}%</span>
                              </p>
                            )}
                            {/* 미래 보충 이벤트 */}
                            {data?.refillEvent && (
                              <div className="mt-1.5 pt-1.5 border-t border-border-light">
                                <p className="text-success font-semibold flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-success" />
                                  VMI 보충 예정 {data.refillEvent.quantity.toLocaleString()}kg
                                </p>
                                <p className="text-text-muted text-xs">
                                  잔량 {data.refillEvent.preLevel}% → {data.predicted}%
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      }}
                    />
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Legend
                      iconSize={12}
                      wrapperStyle={{ fontSize: 12 }}
                      {...{ payload: [
                        { value: "실측", type: "line", color: "#3B82F6" },
                        { value: "VMI 보충 시", type: "line", color: "#F97316" },
                        { value: "보충 없음", type: "line", color: "#F87171" },
                        { value: "신뢰구간", type: "rect", color: "rgba(249,115,22,0.15)" },
                      ] } as Record<string, unknown>}
                    />
                    {/* 위험 구간 배경 (0~20%) */}
                    <ReferenceLine
                      y={20}
                      stroke="#EF4444"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      label={{
                        value: "보충 임계 20%",
                        position: "insideTopRight",
                        fill: "#EF4444",
                        fontSize: 11,
                      }}
                    />
                    {/* 오늘 기준선 */}
                    {(() => {
                      const lastHist = chartData.filter((d) => d.history != null);
                      const todayLabel = lastHist[lastHist.length - 1]?.label;
                      if (!todayLabel) return null;
                      return (
                        <ReferenceLine
                          x={todayLabel}
                          stroke="#6B7280"
                          strokeWidth={1.5}
                          label={{
                            value: "오늘",
                            position: "insideBottomRight",
                            fill: "#374151",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        />
                      );
                    })()}
                    {/* 과거 보충 시점 세로선 (파란색, 라벨 없음 — 툴팁에서 상세 확인) */}
                    {pastRefillPoints.map((rp) => (
                      <ReferenceLine
                        key={`past-${rp.date}`}
                        x={rp.label}
                        stroke="#3B82F6"
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                    ))}
                    {/* 미래 보충 시점 세로선 (초록색) */}
                    {futureRefillPoints.map((rp) => (
                      <ReferenceLine
                        key={`future-${rp.date}`}
                        x={rp.label}
                        stroke="#22C55E"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        label={{
                          value: `VMI 보충 ${rp.refillEvent!.quantity.toLocaleString()}kg`,
                          position: "insideTopLeft",
                          fill: "#16A34A",
                          fontSize: 10,
                          fontWeight: 600,
                          offset: 10,
                        }}
                      />
                    ))}
                    {/* 신뢰구간 영역 */}
                    <Area
                      dataKey="range"
                      fill="url(#confidenceGrad)"
                      stroke="none"
                      name="신뢰구간"
                      legendType="none"
                    />
                    {/* 실측 */}
                    <Line
                      type="monotone"
                      dataKey="history"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={(props: Record<string, unknown>) => {
                        const { cx, cy, payload, value } = props as { cx: number; cy: number; payload: ChartPoint; value?: number };
                        // 데이터가 없는 구간에서는 dot을 렌더링하지 않음
                        if (value == null || payload?.history == null || !isFinite(cy)) {
                          return <g key={`empty-${cx}`} />;
                        }
                        if (payload?.historyRefill) {
                          return (
                            <g key={`hist-refill-${cx}`}>
                              <circle cx={cx} cy={cy} r={8} fill="#3B82F6" fillOpacity={0.15} />
                              <circle cx={cx} cy={cy} r={5} fill="#3B82F6" stroke="white" strokeWidth={2} />
                              <text x={cx + 10} y={cy - 8} textAnchor="start" fill="#2563EB" fontSize={9} fontWeight={600}>
                                {payload.historyRefill.driver} {payload.historyRefill.quantity.toLocaleString()}kg
                              </text>
                            </g>
                          );
                        }
                        return <circle key={`hist-dot-${cx}`} cx={cx} cy={cy} r={3} fill="#3B82F6" />;
                      }}
                      name="실측"
                      connectNulls={false}
                    />
                    {/* 보충 없음 시나리오 (빨간 점선) */}
                    <Line
                      type="monotone"
                      dataKey="noRefill"
                      stroke="#F87171"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="보충 없음"
                      connectNulls={false}
                    />
                    {/* VMI 보충 시 예측 (주황 실선) */}
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#F97316"
                      strokeWidth={2.5}
                      dot={(props: Record<string, unknown>) => {
                        const { cx, cy, payload, value } = props as { cx: number; cy: number; payload: ChartPoint; value?: number };
                        // 데이터가 없는 구간에서는 dot을 렌더링하지 않음
                        if (value == null || payload?.predicted == null || !isFinite(cy)) {
                          return <g key={`empty-pred-${cx}`} />;
                        }
                        if (payload?.refillEvent) {
                          return (
                            <g key={`refill-${cx}`}>
                              <circle cx={cx} cy={cy} r={8} fill="#22C55E" fillOpacity={0.2} />
                              <circle cx={cx} cy={cy} r={5} fill="#22C55E" stroke="white" strokeWidth={2} />
                            </g>
                          );
                        }
                        return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={3} fill="#F97316" />;
                      }}
                      name="VMI 보충 시"
                      connectNulls={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-3">
                <Card hover={false}>
                  <p className="text-xs text-text-secondary">현재 잔량</p>
                  <p className="text-2xl font-bold tabular-nums mt-1 leading-none">
                    {forecast.currentLevel}
                    <span className="text-base font-normal text-text-muted">%</span>
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {Math.round(
                      (selected.tankCapacity * forecast.currentLevel) / 100,
                    ).toLocaleString()}
                    kg
                  </p>
                </Card>

                <Card hover={false}>
                  <p className="text-xs text-text-secondary">일평균 소비</p>
                  <p className="text-2xl font-bold tabular-nums mt-1 leading-none">
                    {selected.dailyConsumption.toLocaleString()}
                    <span className="text-base font-normal text-text-muted">
                      kg
                    </span>
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {(
                      (selected.dailyConsumption / selected.tankCapacity) *
                      100
                    ).toFixed(1)}
                    %/일
                  </p>
                </Card>

                <Card hover={false}>
                  <p className="text-xs text-text-secondary">고갈 예상일</p>
                  <p
                    className={`text-2xl font-bold tabular-nums mt-1 leading-none ${
                      selected.depletionDays <= 3 ? "text-danger" : ""
                    }`}
                  >
                    {forecast.depletionDate.slice(5)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {selected.depletionDays}일 후
                  </p>
                </Card>

                <Card hover={false}>
                  <p className="text-xs text-text-secondary">권장 보충량</p>
                  <p className="text-2xl font-bold tabular-nums mt-1 leading-none text-brand">
                    {forecast.recommendedRefill.toLocaleString()}
                    <span className="text-base font-normal text-text-muted">
                      kg
                    </span>
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    잔량 대비{" "}
                    {Math.round(
                      (forecast.recommendedRefill / selected.tankCapacity) * 100,
                    )}
                    % 충전
                  </p>
                </Card>
              </div>

              {/* Top Factors */}
              <Card hover={false}>
                <h3 className="text-base font-semibold text-text-primary mb-3">
                  주요 영향 요인 (AI 분석)
                </h3>
                <ul className="space-y-2">
                  {forecast.topFactors.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <span className="w-5 h-5 rounded-full bg-brand-50 text-brand text-xs font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* VMI Order Button */}
              <button
                onClick={handleOrder}
                className="w-full bg-brand hover:bg-brand-600 text-white font-semibold py-3 rounded-[--radius-md]
                  transition-colors duration-200 flex items-center justify-center gap-2 text-base
                  cursor-pointer"
              >
                <Sparkles size={18} />
                VMI 자동보충 주문 생성
              </button>
            </>
          )}
        </div>
      </div>
      )}
    </PageTransition>
  );
}
