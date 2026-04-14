"use client";

import dynamic from "next/dynamic";
import { Package, Truck, AlertTriangle, Wrench, Bell } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { customers, vehicles, cylinderVehicles, allVehicles, alerts, dailyDeliveries } from "@/lib/data";
import Card from "@/components/ui/Card";
import StatusDot from "@/components/ui/StatusDot";
import PageTransition from "@/components/PageTransition";

// ── Dynamic imports (no SSR) ──
const DashboardMap = dynamic(() => import("@/components/DashboardMap"), {
  ssr: false,
});

// ── Derived metrics ──
const dangerCustomers = customers.filter((c) => c.riskLevel === "danger");
const warningCustomers = customers.filter((c) => c.riskLevel === "warning");
const runningVehicles = allVehicles.filter((v) => v.status === "running");
const bulkRunning = vehicles.filter((v) => v.status === "running").length;
const cylRunning = cylinderVehicles.filter((v) => v.status === "running").length;

const productColors: Record<string, string> = {
  N2: "var(--color-product-n2)",
  O2: "var(--color-product-o2)",
  CO2: "var(--color-product-co2)",
  AR: "var(--color-product-ar)",
  LPG: "var(--color-product-lpg)",
};

export default function DashboardPage() {
  const now = new Date();
  const timestamp = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;

  const bannerFirst = dangerCustomers[0]?.shortName ?? "";
  const bannerRest = dangerCustomers.length - 1;

  return (
    <PageTransition>
      {/* ── 1. Status Banner ── */}
      <div className="bg-gradient-to-r from-navy-900 to-navy-800 py-3 px-5 flex items-center justify-between rounded-[--radius-lg]">
        <p className="text-xl font-semibold text-white leading-tight">
          <span className="text-red-400">위험 거래처 {dangerCustomers.length}곳</span>
          {" — "}
          {bannerFirst} 외 {bannerRest}곳 고갈 임박, 자동보충 대기 중
        </p>
        <span className="text-xs text-white/50 whitespace-nowrap ml-6">
          마지막 갱신 {timestamp}
        </span>
      </div>

      {/* ── 2. Metric Cards ── */}
      <div className="grid grid-cols-4 gap-4 mt-4">
        {/* 위험 거래처 (강조 카드) */}
        <Card className="cursor-pointer bg-danger-bg">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-danger/10 rounded-[--radius-md]">
              <AlertTriangle className="w-7 h-7 text-danger" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">거래처 이상</p>
              <p className="text-3xl font-bold tabular-nums leading-none mt-1">
                {dangerCustomers.length + warningCustomers.length}곳
              </p>
              <p className="text-xs mt-1.5 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <StatusDot status="danger" /> 위험 {dangerCustomers.length}
                </span>
                <span className="flex items-center gap-1">
                  <StatusDot status="warning" /> 경고 {warningCustomers.length}
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* 배송 건수 */}
        <Card className="cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-info-bg rounded-[--radius-md]">
              <Package className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">오늘 배송</p>
              <p className="text-3xl font-bold tabular-nums leading-none mt-1">
                74건
              </p>
              <p className="text-xs text-success mt-1">전일 대비 ▲12%</p>
            </div>
          </div>
        </Card>

        {/* 차량 가동률 */}
        <Card className="cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-success-bg rounded-[--radius-md]">
              <Truck className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">차량 가동</p>
              <p className="text-3xl font-bold tabular-nums leading-none mt-1">
                {runningVehicles.length}/{allVehicles.length}대
              </p>
              <p className="text-xs text-text-muted mt-1">
                벌크 {bulkRunning}/{vehicles.length} · 실린더 {cylRunning}/{cylinderVehicles.length}
              </p>
            </div>
          </div>
        </Card>

        {/* 정비 예정 */}
        <Card className="cursor-pointer">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-violet-50 rounded-[--radius-md]">
              <Wrench className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">정비 예정</p>
              <p className="text-3xl font-bold tabular-nums leading-none mt-1">
                3대
              </p>
              <p className="text-xs text-text-muted mt-1">이번 주 예정</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 3. Map + Alert Feed ── */}
      <div className="grid grid-cols-[1fr_380px] gap-4 mt-4">
        {/* Map */}
        <Card hover={false} className="p-0 overflow-hidden rounded-[--radius-lg]">
          <DashboardMap />
        </Card>

        {/* Alert Feed */}
        <Card hover={false}>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-text-muted" />
            <h2 className="text-base font-semibold text-text-primary">실시간 알림</h2>
          </div>
          <ul className="max-h-[500px] overflow-y-auto custom-scroll space-y-2 pr-1 -mr-1">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5 bg-surface-secondary rounded-[--radius-md] px-3 py-2.5">
                <StatusDot status={a.type} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-text-primary leading-snug">{a.message}</span>
                  <p className="text-xs text-text-muted tabular-nums mt-0.5">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* ── 4. Daily Delivery Chart ── */}
      <Card hover={false} className="mt-4">
        <h2 className="text-lg font-semibold text-text-primary mb-4">일별 배송량 추이</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={dailyDeliveries}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <defs>
              {Object.entries(productColors).map(([key, color]) => (
                <linearGradient
                  key={key}
                  id={`grad-${key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}t`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 13,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border-light)",
                boxShadow: "var(--shadow-md)",
              }}
              formatter={(value) =>
                value != null ? `${Number(value).toLocaleString()} kg` : ""
              }
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
              verticalAlign="top"
              align="right"
            />
            <Area
              type="monotone"
              dataKey="N2"
              stackId="1"
              stroke={productColors.N2}
              fill={`url(#grad-N2)`}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="O2"
              stackId="1"
              stroke={productColors.O2}
              fill={`url(#grad-O2)`}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="CO2"
              stackId="1"
              stroke={productColors.CO2}
              fill={`url(#grad-CO2)`}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="AR"
              stackId="1"
              stroke={productColors.AR}
              fill={`url(#grad-AR)`}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="LPG"
              stackId="1"
              stroke={productColors.LPG}
              fill={`url(#grad-LPG)`}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </PageTransition>
  );
}
