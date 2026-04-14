"use client";

import { useState, useMemo } from "react";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

import { customers, forecasts } from "@/lib/data";
import Card from "@/components/ui/Card";
import Gauge from "@/components/ui/Gauge";
import StatusDot from "@/components/ui/StatusDot";
import ProductDot from "@/components/ui/ProductDot";
import EmptyState from "@/components/ui/EmptyState";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/components/ui/Toast";

// Sort customers: danger first, then warning, then safe
const sortedCustomers = [...customers].sort((a, b) => {
  const order = { danger: 0, warning: 1, safe: 2 };
  return order[a.riskLevel] - order[b.riskLevel];
});

export default function ForecastPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { addToast } = useToast();

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

  return (
    <PageTransition>
      <div className="flex gap-4 h-[calc(100vh-80px)]">
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
    </PageTransition>
  );
}
