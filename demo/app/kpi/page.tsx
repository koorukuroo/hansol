"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Route,
  Siren,
  ShieldCheck,
  Banknote,
  Leaf,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { LucideIcon } from "lucide-react";

import Card from "@/components/ui/Card";
import PageTransition from "@/components/PageTransition";

// ── Count-up hook ──
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased * 10) / 10);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    }

    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

// ── Metric definitions ──
interface MetricDef {
  label: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  before: string;
  afterValue: number;
  afterSuffix: string;
  afterPrefix?: string;
  badgeText: string;
  badgeBg: string;
  badgeText_: string;
  valueColor: string;
  isDecimal?: boolean;
}

const metrics: MetricDef[] = [
  {
    label: "납기단축율",
    icon: Target,
    iconBg: "bg-brand-50",
    iconColor: "text-brand",
    before: "기준",
    afterValue: 30,
    afterSuffix: "%",
    afterPrefix: "",
    badgeText: "30%\u2191",
    badgeBg: "bg-brand-50",
    badgeText_: "text-brand-700",
    valueColor: "text-brand",
  },
  {
    label: "공차율",
    icon: Route,
    iconBg: "bg-success-bg",
    iconColor: "text-success",
    before: "7.6%",
    afterValue: 3.2,
    afterSuffix: "%",
    badgeText: "4.4%p\u2193",
    badgeBg: "bg-success-bg",
    badgeText_: "text-success",
    valueColor: "text-success",
    isDecimal: true,
  },
  {
    label: "긴급배송",
    icon: Siren,
    iconBg: "bg-success-bg",
    iconColor: "text-success",
    before: "11.0%",
    afterValue: 2.2,
    afterSuffix: "%",
    badgeText: "8.8%p\u2193",
    badgeBg: "bg-success-bg",
    badgeText_: "text-success",
    valueColor: "text-success",
    isDecimal: true,
  },
  {
    label: "운송사고",
    icon: ShieldCheck,
    iconBg: "bg-success-bg",
    iconColor: "text-success",
    before: "기준",
    afterValue: 60,
    afterSuffix: "%",
    afterPrefix: "",
    badgeText: "60%\u2193",
    badgeBg: "bg-success-bg",
    badgeText_: "text-success",
    valueColor: "text-success",
  },
  {
    label: "물류비",
    icon: Banknote,
    iconBg: "bg-success-bg",
    iconColor: "text-success",
    before: "기준",
    afterValue: 1.5,
    afterSuffix: "억",
    afterPrefix: "",
    badgeText: "1.5억\u2193",
    badgeBg: "bg-success-bg",
    badgeText_: "text-success",
    valueColor: "text-success",
    isDecimal: true,
  },
  {
    label: "CO2 배출",
    icon: Leaf,
    iconBg: "bg-success-bg",
    iconColor: "text-success",
    before: "기준",
    afterValue: 120,
    afterSuffix: "톤",
    afterPrefix: "",
    badgeText: "120톤\u2193",
    badgeBg: "bg-success-bg",
    badgeText_: "text-success",
    valueColor: "text-success",
  },
];

// ── Single metric card with count-up ──
function MetricCard({ m, index }: { m: MetricDef; index: number }) {
  const animated = useCountUp(m.afterValue, 1200);

  const displayValue = m.isDecimal ? animated.toFixed(1) : Math.round(animated);

  // Build display: prefix + value + suffix with special arrow indicators
  const afterDisplay = `${m.afterPrefix ?? ""}${displayValue}${m.afterSuffix}`;
  const arrowDown = m.badgeText.includes("\u2193") ? "\u2193" : "\u2191";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.15 }}
    >
      <Card hover={false}>
        <div className="flex flex-col gap-3">
          {/* Top row: icon + badge */}
          <div className="flex items-center justify-between">
            <div
              className={`shrink-0 w-12 h-12 rounded-full ${m.iconBg} flex items-center justify-center`}
            >
              <m.icon className={`w-5 h-5 ${m.iconColor}`} />
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.badgeBg} ${m.badgeText_}`}
            >
              {m.badgeText}
            </span>
          </div>

          {/* Metric name */}
          <p className="text-sm font-medium text-text-secondary">{m.label}</p>

          {/* Before value */}
          <p className="text-sm text-text-muted line-through">
            {m.before}
          </p>

          {/* After value */}
          <p className={`text-3xl font-bold tabular-nums leading-none ${m.valueColor}`}>
            {afterDisplay}
            {arrowDown === "\u2193" ? "\u2193" : "\u2191"}
          </p>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Monthly trend data ──
const monthlyData = [
  { month: "1월", 납기단축율: 5, 공차율: 7.4, 긴급배송: 10.8, 물류비: 100 },
  { month: "2월", 납기단축율: 8, 공차율: 7.1, 긴급배송: 10.2, 물류비: 98 },
  { month: "3월", 납기단축율: 12, 공차율: 6.5, 긴급배송: 9.0, 물류비: 94 },
  { month: "4월", 납기단축율: 15, 공차율: 6.0, 긴급배송: 7.8, 물류비: 90 },
  { month: "5월", 납기단축율: 18, 공차율: 5.6, 긴급배송: 6.5, 물류비: 87 },
  { month: "6월", 납기단축율: 22, 공차율: 5.0, 긴급배송: 5.2, 물류비: 82 },
  { month: "7월", 납기단축율: 24, 공차율: 4.6, 긴급배송: 4.5, 물류비: 78 },
  { month: "8월", 납기단축율: 26, 공차율: 4.2, 긴급배송: 3.8, 물류비: 75 },
  { month: "9월", 납기단축율: 27, 공차율: 3.9, 긴급배송: 3.2, 물류비: 72 },
  { month: "10월", 납기단축율: 28, 공차율: 3.6, 긴급배송: 2.8, 물류비: 68 },
  { month: "11월", 납기단축율: 29, 공차율: 3.4, 긴급배송: 2.5, 물류비: 66 },
  { month: "12월", 납기단축율: 30, 공차율: 3.2, 긴급배송: 2.2, 물류비: 63 },
];

const lineConfigs = [
  { key: "납기단축율", color: "#1A6DB5" },
  { key: "공차율", color: "#059669" },
  { key: "긴급배송", color: "#D97706" },
  { key: "물류비", color: "#1AADCA" },
] as const;

export default function KpiPage() {
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(lineConfigs.map((l) => l.key)),
  );

  const toggleLine = useCallback((key: string) => {
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow disabling all lines
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <PageTransition>
      {/* ── Before -> After KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m, i) => (
          <MetricCard key={m.label} m={m} index={i} />
        ))}
      </div>

      {/* ── Monthly Trend Chart ── */}
      <Card hover={false} className="mt-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">월별 성과 추이</h2>

        {/* Toggle buttons */}
        <div className="flex gap-2 mb-4">
          {lineConfigs.map((l) => (
            <button
              key={l.key}
              onClick={() => toggleLine(l.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                activeLines.has(l.key)
                  ? "border-transparent text-white"
                  : "border-border text-text-muted bg-surface"
              }`}
              style={
                activeLines.has(l.key)
                  ? { backgroundColor: l.color }
                  : undefined
              }
            >
              {l.key}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={monthlyData}
            margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9CA3AF" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 13,
                borderRadius: 10,
                border: "1px solid #F3F4F6",
                boxShadow: "0 4px 12px rgba(0,0,0,0.07)",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 13 }}
            />

            {/* Milestone vertical lines */}
            <ReferenceLine
              x="3월"
              stroke="#9CA3AF"
              strokeDasharray="5 5"
              label={{
                value: "파일럿",
                position: "top",
                fill: "#9CA3AF",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              x="6월"
              stroke="#9CA3AF"
              strokeDasharray="5 5"
              label={{
                value: "전면확대",
                position: "top",
                fill: "#9CA3AF",
                fontSize: 12,
                fontWeight: 600,
              }}
            />

            {lineConfigs.map((l) =>
              activeLines.has(l.key) ? (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  stroke={l.color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ) : null,
            )}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </PageTransition>
  );
}
