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
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Zap,
  ArrowRight,
  X,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  FileText,
  Map,
  Truck,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import type { LucideIcon } from "lucide-react";

import Image from "next/image";
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
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
      else setValue(target);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// ── Circular progress ring ──
function ProgressRing({ percent, color, size = 56, strokeWidth = 4 }: { percent: number; color: string; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animated = useCountUp(percent, 1400);
  const offset = circumference - (animated / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border-light)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.4, ease: "easeOut" }}
      />
    </svg>
  );
}

// ── Metric definitions ──
interface MetricDef {
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  colorBg: string;
  before: string;
  afterValue: number;
  afterSuffix: string;
  improvementPct: number; // 0-100 for ring
  direction: "up" | "down";
  isDecimal?: boolean;
}

const metrics: MetricDef[] = [
  { label: "납기단축율", description: "정시 배송 비율 향상", icon: Target, color: "#1A6DB5", colorBg: "bg-brand-50", before: "기준", afterValue: 30, afterSuffix: "%↑", improvementPct: 75, direction: "up" },
  { label: "공차율", description: "빈 차량 운행 비율 감소", icon: Route, color: "#059669", colorBg: "bg-success-bg", before: "7.6%", afterValue: 3.2, afterSuffix: "%", improvementPct: 85, direction: "down", isDecimal: true },
  { label: "긴급배송", description: "계획 외 긴급 출동 감소", icon: Siren, color: "#D97706", colorBg: "bg-warning-bg", before: "11.0%", afterValue: 2.2, afterSuffix: "%", improvementPct: 80, direction: "down", isDecimal: true },
  { label: "운송사고", description: "어라운드뷰 기반 사고 예방", icon: ShieldCheck, color: "#059669", colorBg: "bg-success-bg", before: "기준", afterValue: 60, afterSuffix: "%↓", improvementPct: 90, direction: "down" },
  { label: "물류비", description: "연간 물류 비용 절감", icon: Banknote, color: "#1AADCA", colorBg: "bg-info-bg", before: "기준", afterValue: 1.5, afterSuffix: "억↓", improvementPct: 70, direction: "down", isDecimal: true },
  { label: "CO2 배출", description: "탄소 배출량 절감", icon: Leaf, color: "#16A34A", colorBg: "bg-success-bg", before: "기준", afterValue: 120, afterSuffix: "톤↓", improvementPct: 65, direction: "down" },
];

// ── Single metric card ──
function MetricCard({ m, index }: { m: MetricDef; index: number }) {
  const animated = useCountUp(m.afterValue, 1200);
  const displayValue = m.isDecimal ? animated.toFixed(1) : Math.round(animated);
  const Arrow = m.direction === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card hover={false} className="relative overflow-hidden group">
        {/* Subtle gradient accent on left */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[--radius-lg]" style={{ backgroundColor: m.color }} />

        <div className="flex items-center gap-4 pl-3">
          {/* Progress ring with icon */}
          <div className="relative shrink-0">
            <ProgressRing percent={m.improvementPct} color={m.color} size={60} strokeWidth={4} />
            <div className="absolute inset-0 flex items-center justify-center">
              <m.icon size={20} style={{ color: m.color }} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary">{m.label}</h3>
              <Arrow size={14} style={{ color: m.color }} />
            </div>
            <p className="text-xs text-text-muted mt-0.5">{m.description}</p>

            {/* Before → After */}
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-xs text-text-muted line-through">{m.before}</span>
              <span className="text-xs text-text-muted">→</span>
              <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: m.color }}>
                {displayValue}{m.afterSuffix}
              </span>
            </div>
          </div>

          {/* Improvement badge */}
          <div className="shrink-0 text-right">
            <div className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-full" style={{ backgroundColor: `${m.color}15`, color: m.color }}>
              {m.improvementPct}점
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── Overall score ──
function OverallScore() {
  const avgScore = Math.round(metrics.reduce((s, m) => s + m.improvementPct, 0) / metrics.length);
  const animated = useCountUp(avgScore, 1600);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 rounded-[--radius-lg] p-6 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-12 w-28 h-28 rounded-full bg-white/5" />

        <div className="flex items-center gap-6 relative z-10">
          {/* Score ring */}
          <div className="relative shrink-0">
            <ProgressRing percent={avgScore} color="#FFFFFF" size={100} strokeWidth={6} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold tabular-nums leading-none">{Math.round(animated)}</span>
              <span className="text-xs text-white/60 mt-0.5">종합점수</span>
            </div>
          </div>

          {/* Summary text */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={18} className="text-amber-400" />
              <h1 className="text-xl font-bold">AI 도입 성과 대시보드</h1>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              AI 물류 관제 시스템 도입 후 6개 핵심 지표 종합 개선율입니다.
              연간 물류비 1.5억 절감, CO2 120톤 감축 효과가 예상됩니다.
            </p>

            {/* Mini stats */}
            <div className="flex items-center gap-5 mt-3">
              {[
                { label: "개선 지표", value: "6개", sub: "전체" },
                { label: "물류비 절감", value: "1.5억", sub: "연간" },
                { label: "CO2 감축", value: "120톤", sub: "연간" },
              ].map((s) => (
                <div key={s.label} className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold tabular-nums">{s.value}</span>
                  <span className="text-xs text-white/50">{s.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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
  { key: "납기단축율", color: "#1A6DB5", label: "납기단축율 (%)" },
  { key: "공차율", color: "#059669", label: "공차율 (%)" },
  { key: "긴급배송", color: "#D97706", label: "긴급배송 (%)" },
  { key: "물류비", color: "#1AADCA", label: "물류비 (지수)" },
] as const;

// ── Digital Transformation Before/After ──
function DigitalTransformation() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card hover={false} className="mt-5">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
          {/* Column 1: Legacy / Paper-based */}
          <div className="flex flex-col items-center text-center gap-3">
            <h3 className="text-sm font-semibold text-text-primary">종이 장부 시대</h3>
            <div className="relative w-full h-32 rounded-[--radius-md] overflow-hidden bg-surface-secondary">
              <Image
                src="/legacy-ledger.jpg"
                alt="수기 거래내역장"
                fill
                className="object-cover"
              />
            </div>
            <p className="text-xs text-text-muted">수기 거래내역장으로 납품 기록</p>
            <div className="flex flex-col gap-1.5 w-full">
              {["수기 기록 오류 빈번", "검색/분석 불가", "분실 위험"].map((pain) => (
                <div key={pain} className="flex items-center gap-2 text-xs text-red-600">
                  <X size={14} className="shrink-0 text-red-500" />
                  <span>{pain}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Arrow transition */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-brand-600">AI 전환</span>
            <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
              <ArrowRight size={28} className="text-brand-600" />
            </div>
          </div>

          {/* Column 3: AI-based */}
          <div className="flex flex-col items-center text-center gap-3">
            <h3 className="text-sm font-semibold text-text-primary">AI 통합 관제</h3>
            <div className="w-full h-32 rounded-[--radius-md] bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 flex items-center justify-center px-4">
              <p className="text-sm font-medium text-white leading-relaxed">
                실시간 데이터 기반<br />AI 의사결정
              </p>
            </div>
            <p className="text-xs text-text-muted">클라우드 기반 통합 관제 시스템</p>
            <div className="flex flex-col gap-1.5 w-full">
              {["실시간 자동 집계", "AI 예측 분석", "모바일 어디서나 접근"].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-xs text-green-700">
                  <CheckCircle2 size={14} className="shrink-0 text-green-600" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ── System Integration Flow ──
const flowSteps: { icon: LucideIcon; label: string; isAI: boolean }[] = [
  { icon: MessageCircle, label: "발주접수", isAI: false },
  { icon: Sparkles, label: "AI 파싱", isAI: true },
  { icon: FileText, label: "ERP 등록", isAI: false },
  { icon: TrendingUp, label: "수요예측", isAI: true },
  { icon: Map, label: "배차최적화", isAI: true },
  { icon: Truck, label: "배송", isAI: false },
  { icon: CheckCircle2, label: "납품확인", isAI: false },
];

function SystemIntegrationFlow() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <Card hover={false} className="mt-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">시스템 통합 처리 흐름</h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {flowSteps.map((step, i) => (
            <div key={step.label} className="flex items-center shrink-0">
              {/* Step pill */}
              <div
                className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-full border ${
                  step.isAI
                    ? "bg-brand-50 border-brand-200 text-brand-700"
                    : "bg-surface-secondary border-border-light text-text-secondary"
                }`}
              >
                <step.icon size={18} />
                <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
              </div>
              {/* Arrow separator (except last) */}
              {i < flowSteps.length - 1 && (
                <ArrowRight size={16} className="text-text-muted mx-1 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

export default function KpiPage() {
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(lineConfigs.map((l) => l.key)),
  );

  const toggleLine = useCallback((key: string) => {
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <PageTransition>
      {/* ── Overall Score Banner ── */}
      <OverallScore />

      {/* ── Digital Transformation Before/After ── */}
      <DigitalTransformation />

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-3 gap-4 mt-5">
        {metrics.map((m, i) => (
          <MetricCard key={m.label} m={m} index={i} />
        ))}
      </div>

      {/* ── System Integration Flow ── */}
      <SystemIntegrationFlow />

      {/* ── Monthly Trend Chart ── */}
      <Card hover={false} className="mt-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">월별 성과 추이</h2>
            <p className="text-xs text-text-muted mt-0.5">12개월 시뮬레이션 (3월 파일럿, 6월 전면확대)</p>
          </div>
          {/* Toggle pills */}
          <div className="flex gap-1.5">
            {lineConfigs.map((l) => (
              <button
                key={l.key}
                onClick={() => toggleLine(l.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                  activeLines.has(l.key)
                    ? "text-white shadow-[--shadow-sm]"
                    : "text-text-muted bg-surface-secondary hover:bg-border-light"
                }`}
                style={activeLines.has(l.key) ? { backgroundColor: l.color } : undefined}
              >
                {l.key}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthlyData} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
            <defs>
              {lineConfigs.map((l) => (
                <linearGradient key={l.key} id={`kpi-grad-${l.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={l.color} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={l.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                fontSize: 13,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-light)",
                boxShadow: "var(--shadow-md)",
              }}
            />

            {/* Milestones */}
            <ReferenceLine x="3월" stroke="#D1D5DB" strokeDasharray="5 5" label={{ value: "파일럿", position: "insideTopLeft", fill: "#9CA3AF", fontSize: 11, fontWeight: 600 }} />
            <ReferenceLine x="6월" stroke="#D1D5DB" strokeDasharray="5 5" label={{ value: "전면확대", position: "insideTopLeft", fill: "#9CA3AF", fontSize: 11, fontWeight: 600 }} />

            {/* Area fills + Lines */}
            {lineConfigs.map((l) =>
              activeLines.has(l.key) ? (
                <Area key={`area-${l.key}`} type="monotone" dataKey={l.key} fill={`url(#kpi-grad-${l.key})`} stroke="none" />
              ) : null,
            )}
            {lineConfigs.map((l) =>
              activeLines.has(l.key) ? (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  stroke={l.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: l.color, stroke: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: l.color, stroke: "#fff", strokeWidth: 2 }}
                />
              ) : null,
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </PageTransition>
  );
}
