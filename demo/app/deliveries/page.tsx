"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Truck,
  Search,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  CalendarRange,
  Package,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  BarChart3,
  PieChart as PieIcon,
  Table2,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts";
import { motion } from "framer-motion";

import { customers, vehicles, drivers } from "@/lib/data";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ProductDot from "@/components/ui/ProductDot";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/components/ui/Toast";

// ── Seeded PRNG ──
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Types ──
interface DeliveryRecord {
  id: number;
  date: string;
  dateLabel: string;
  type: "매출" | "매입";
  customerName: string;
  vehiclePlate: string;
  driver: string;
  product: string;
  quantity: number;
  status: "완료" | "진행중";
  time: string;
}

// ── Constants ──
const PRODUCTS = ["N2", "O2", "CO2", "AR", "LPG"] as const;
const PRODUCT_NAMES: Record<string, string> = { N2: "액화질소", O2: "액화산소", CO2: "액화탄산", AR: "액화알곤", LPG: "LPG" };
const PRODUCT_COLORS: Record<string, string> = {
  N2: "var(--color-product-n2)", O2: "var(--color-product-o2)",
  CO2: "var(--color-product-co2)", AR: "var(--color-product-ar)", LPG: "var(--color-product-lpg)",
};
const PIE_COLORS = ["#4B8DF8", "#E8564C", "#9066E0", "#1AADCA", "#E88A3E"];
const PAGE_SIZE = 15;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// ── Generate records ──
function generateRecords(): DeliveryRecord[] {
  const rng = seededRng(42);
  const records: DeliveryRecord[] = [];
  const customerNames = customers.map((c) => c.name);
  const driverNames = vehicles.map((v) => v.driver);
  const vehiclePlates = vehicles.map((v) => v.plateNumber);

  for (let i = 0; i < 220; i++) {
    const dayOffset = Math.floor(rng() * 31);
    const d = new Date(2026, 2, 15 + dayOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const isSale = rng() < 0.82;
    const product = PRODUCTS[Math.floor(rng() * PRODUCTS.length)];
    const quantity = isSale
      ? Math.round((1200 + rng() * 6800) / 100) * 100
      : Math.round((10000 + rng() * 10000) / 100) * 100;
    const custIdx = Math.floor(rng() * customerNames.length);
    const vehIdx = Math.floor(rng() * vehiclePlates.length);
    const hour = 6 + Math.floor(rng() * 12);
    const minute = Math.floor(rng() * 60);

    records.push({
      id: i + 1,
      date: `${yyyy}-${mm}-${dd}`,
      dateLabel: `${d.getMonth() + 1}.${dd}`,
      type: isSale ? "매출" : "매입",
      customerName: customerNames[custIdx],
      vehiclePlate: vehiclePlates[vehIdx],
      driver: driverNames[vehIdx],
      product,
      quantity,
      status: rng() < 0.94 ? "완료" : "진행중",
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    });
  }
  records.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  return records;
}

const ALL_RECORDS = generateRecords();

type SortKey = "date" | "quantity" | "customerName" | "product";
type SortDir = "asc" | "desc";
type ViewTab = "dashboard" | "table";

// ── Main ──
export default function DeliveriesPage() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const [activeView, setActiveView] = useState<ViewTab>(viewParam === "table" ? "table" : "dashboard");

  useEffect(() => {
    setActiveView(viewParam === "table" ? "table" : "dashboard");
  }, [viewParam]);

  // Filters
  const [startDate, setStartDate] = useState("2026-03-15");
  const [endDate, setEndDate] = useState("2026-04-14");
  const [selectedProduct, setSelectedProduct] = useState("전체");
  const [selectedType, setSelectedType] = useState<"전체" | "매출" | "매입">("전체");
  const [selectedCustomer, setSelectedCustomer] = useState("전체");
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "2026-03-15", endDate: "2026-04-14", product: "전체", type: "전체" as "전체" | "매출" | "매입", customer: "전체",
  });

  // Table state
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSearch = useCallback(() => {
    setAppliedFilters({ startDate, endDate, product: selectedProduct, type: selectedType, customer: selectedCustomer });
    setPage(1);
  }, [startDate, endDate, selectedProduct, selectedType, selectedCustomer]);

  const handleReset = useCallback(() => {
    setStartDate("2026-03-15"); setEndDate("2026-04-14");
    setSelectedProduct("전체"); setSelectedType("전체"); setSelectedCustomer("전체");
    setAppliedFilters({ startDate: "2026-03-15", endDate: "2026-04-14", product: "전체", type: "전체", customer: "전체" });
    setPage(1);
  }, []);

  // Select a specific customer (from chart click) and switch to table view
  const selectCustomer = useCallback((name: string) => {
    setSelectedCustomer(name);
    setAppliedFilters((prev) => ({ ...prev, customer: name }));
    setActiveView("table");
    setPage(1);
  }, []);

  // ── Filtered records ──
  const filteredRecords = useMemo(() => ALL_RECORDS.filter((r) => {
    if (r.date < appliedFilters.startDate || r.date > appliedFilters.endDate) return false;
    if (appliedFilters.product !== "전체" && r.product !== appliedFilters.product) return false;
    if (appliedFilters.type !== "전체" && r.type !== appliedFilters.type) return false;
    if (appliedFilters.customer !== "전체" && r.customerName !== appliedFilters.customer) return false;
    return true;
  }), [appliedFilters]);

  // ── Sorted + paginated ──
  const sortedRecords = useMemo(() => {
    const s = [...filteredRecords];
    s.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
      else if (sortKey === "quantity") cmp = a.quantity - b.quantity;
      else if (sortKey === "customerName") cmp = a.customerName.localeCompare(b.customerName);
      else cmp = a.product.localeCompare(b.product);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return s;
  }, [filteredRecords, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const paginatedRecords = sortedRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── KPI metrics ──
  const kpi = useMemo(() => {
    const total = filteredRecords.length;
    const totalQty = filteredRecords.reduce((s, r) => s + r.quantity, 0);
    const sales = filteredRecords.filter((r) => r.type === "매출");
    const salesQty = sales.reduce((s, r) => s + r.quantity, 0);
    const purchaseQty = totalQty - salesQty;
    const uniqueCustomers = new Set(filteredRecords.map((r) => r.customerName)).size;
    const uniqueDates = new Set(filteredRecords.map((r) => r.date)).size;
    const avgPerDay = uniqueDates > 0 ? Math.round(total / uniqueDates * 10) / 10 : 0;
    const completionRate = total > 0 ? Math.round(filteredRecords.filter((r) => r.status === "완료").length / total * 1000) / 10 : 0;
    return { total, totalQty, salesQty, purchaseQty, uniqueCustomers, avgPerDay, completionRate };
  }, [filteredRecords]);

  // ── Daily trend (line chart) ──
  const dailyTrend = useMemo(() => {
    const map = new Map<string, { qty: number; count: number }>();
    filteredRecords.forEach((r) => {
      const e = map.get(r.date) || { qty: 0, count: 0 };
      e.qty += r.quantity; e.count += 1;
      map.set(r.date, e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => {
      const dt = new Date(date);
      return { date: `${dt.getMonth() + 1}.${String(dt.getDate()).padStart(2, "0")}`, day: WEEKDAYS[dt.getDay()], qty: Math.round(d.qty / 1000), count: d.count, isWeekend: dt.getDay() === 0 || dt.getDay() === 6 };
    });
  }, [filteredRecords]);

  // ── Product breakdown (stacked bar) ──
  const dailyByProduct = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    filteredRecords.forEach((r) => {
      const e = map.get(r.date) || { N2: 0, O2: 0, CO2: 0, AR: 0, LPG: 0 };
      e[r.product] = (e[r.product] || 0) + r.quantity;
      map.set(r.date, e);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => {
      const dt = new Date(date);
      return { ...d, dateLabel: `${dt.getMonth() + 1}.${String(dt.getDate()).padStart(2, "0")}` };
    });
  }, [filteredRecords]);

  // ── Product pie ──
  const productPie = useMemo(() => {
    const t: Record<string, number> = {};
    filteredRecords.forEach((r) => { t[r.product] = (t[r.product] || 0) + r.quantity; });
    const total = Object.values(t).reduce((a, b) => a + b, 0);
    return PRODUCTS.map((p, i) => ({ name: p, fullName: PRODUCT_NAMES[p], value: t[p] || 0, pct: total > 0 ? Math.round((t[p] || 0) / total * 1000) / 10 : 0, color: PIE_COLORS[i] })).filter((d) => d.value > 0);
  }, [filteredRecords]);

  // ── Top customers ──
  const topCustomers = useMemo(() => {
    const map = new Map<string, { qty: number; count: number }>();
    filteredRecords.forEach((r) => {
      const e = map.get(r.customerName) || { qty: 0, count: 0 };
      e.qty += r.quantity; e.count += 1;
      map.set(r.customerName, e);
    });
    const totalQty = filteredRecords.reduce((s, r) => s + r.quantity, 0);
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.qty - a.qty)
      .map(([name, d], i) => ({
        rank: i + 1,
        name: customers.find((c) => c.name === name)?.shortName ?? name,
        fullName: name,
        qty: d.qty,
        count: d.count,
        pct: totalQty > 0 ? Math.round(d.qty / totalQty * 1000) / 10 : 0,
        product: customers.find((c) => c.name === name)?.product ?? "",
      }));
  }, [filteredRecords]);

  // ── Driver performance ──
  const driverPerf = useMemo(() => {
    const map = new Map<string, { qty: number; count: number }>();
    filteredRecords.forEach((r) => {
      const e = map.get(r.driver) || { qty: 0, count: 0 };
      e.qty += r.quantity; e.count += 1;
      map.set(r.driver, e);
    });
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b.qty - a.qty)
      .map(([name, d]) => {
        const dr = drivers.find((dd) => dd.name === name);
        return { name, qty: d.qty, count: d.count, vehicle: dr?.vehicle ?? "", safetyScore: dr?.safetyScore ?? 0 };
      });
  }, [filteredRecords]);

  // ── Weekday heatmap ──
  const weekdayData = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    filteredRecords.forEach((r) => {
      const dow = new Date(r.date).getDay();
      totals[dow] += r.quantity;
      counts[dow] += 1;
    });
    const maxQty = Math.max(...totals);
    return WEEKDAYS.map((label, i) => ({
      label,
      qty: totals[i],
      count: counts[i],
      intensity: maxQty > 0 ? totals[i] / maxQty : 0,
    }));
  }, [filteredRecords]);

  // ── AI Insights ──
  const insights = useMemo(() => {
    const msgs: { type: "success" | "warning" | "info"; text: string }[] = [];
    const top = topCustomers[0];
    if (top) msgs.push({ type: "info", text: `${top.name}이(가) 전체 물량의 ${top.pct}%를 차지하며 최대 거래처입니다.` });
    const top3pct = topCustomers.slice(0, 3).reduce((s, c) => s + c.pct, 0);
    if (top3pct > 50) msgs.push({ type: "warning", text: `상위 3개 거래처 집중도 ${top3pct.toFixed(1)}% — 거래처 다변화 검토 필요` });
    if (kpi.completionRate >= 95) msgs.push({ type: "success", text: `납품 완료율 ${kpi.completionRate}%로 목표(95%) 달성 중` });
    else msgs.push({ type: "warning", text: `납품 완료율 ${kpi.completionRate}% — 목표(95%) 미달` });
    const wkend = weekdayData.filter((d) => d.label === "토" || d.label === "일");
    const wkday = weekdayData.filter((d) => d.label !== "토" && d.label !== "일");
    const avgWkend = wkend.reduce((s, d) => s + d.qty, 0) / Math.max(1, wkend.length);
    const avgWkday = wkday.reduce((s, d) => s + d.qty, 0) / Math.max(1, wkday.length);
    if (avgWkday > 0) {
      const ratio = Math.round((1 - avgWkend / avgWkday) * 100);
      if (ratio > 20) msgs.push({ type: "info", text: `주말 배송량이 평일 대비 ${ratio}% 감소 — 주말 인력 최적화 가능` });
    }
    const n2pct = productPie.find((p) => p.name === "N2")?.pct ?? 0;
    if (n2pct > 35) msgs.push({ type: "info", text: `N2(액화질소)가 전체 ${n2pct}%로 주력 제품 — 공급 안정성 최우선` });
    return msgs;
  }, [topCustomers, kpi, weekdayData, productPie]);

  const fmt = (n: number) => n.toLocaleString("ko-KR");

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => { if (prev === key) { setSortDir((d) => d === "asc" ? "desc" : "asc"); return key; } setSortDir("desc"); return key; });
    setPage(1);
  }, []);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-text-muted" />;
    return sortDir === "asc" ? <ArrowUp size={12} className="text-brand" /> : <ArrowDown size={12} className="text-brand" />;
  };

  return (
    <PageTransition>
      <div className="space-y-4">
        {/* ── Header + View Tabs ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary">납품 이력</h1>
            <p className="text-sm text-text-muted mt-0.5">데이터 기반 배송 인사이트 · {appliedFilters.startDate.replace(/-/g, ".")} ~ {appliedFilters.endDate.replace(/-/g, ".")}</p>
          </div>
          <div className="flex items-center gap-1 bg-surface-secondary rounded-[--radius-md] p-1">
            {([
              { key: "dashboard" as const, icon: BarChart3, label: "대시보드", href: "/deliveries" },
              { key: "table" as const, icon: Table2, label: "상세 이력", href: "/deliveries?view=table" },
            ]).map((tab) => (
              <a
                key={tab.key}
                href={tab.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[--radius-sm] text-xs font-medium transition-colors cursor-pointer no-underline ${
                  activeView === tab.key
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

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "총 배송", value: `${fmt(kpi.total)}건`, sub: `일평균 ${kpi.avgPerDay}건`, icon: Truck, color: "text-brand", bg: "bg-brand-50", trend: 12 },
            { label: "매출 물량", value: `${fmt(Math.round(kpi.salesQty / 1000))}톤`, sub: "매출 배송 합계", icon: TrendingUp, color: "text-success", bg: "bg-success-bg", trend: 8 },
            { label: "매입 물량", value: `${fmt(Math.round(kpi.purchaseQty / 1000))}톤`, sub: "원료 매입 합계", icon: Package, color: "text-info", bg: "bg-info-bg", trend: -3 },
            { label: "활동 거래처", value: `${kpi.uniqueCustomers}곳`, sub: `전체 ${customers.length}곳 중`, icon: Building2, color: "text-warning", bg: "bg-warning-bg", trend: 0 },
            { label: "완료율", value: `${kpi.completionRate}%`, sub: kpi.completionRate >= 95 ? "목표 달성" : "목표 미달", icon: CalendarRange, color: kpi.completionRate >= 95 ? "text-success" : "text-danger", bg: kpi.completionRate >= 95 ? "bg-success-bg" : "bg-danger-bg", trend: kpi.completionRate >= 95 ? 2 : -5 },
          ].map((item) => (
            <Card key={item.label} hover={false} className="!py-3">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-[--radius-md] ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon size={18} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-text-muted">{item.label}</p>
                  <p className="text-lg font-bold tabular-nums leading-tight mt-0.5">{item.value}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] text-text-muted">{item.sub}</span>
                    {item.trend !== 0 && (
                      <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${item.trend > 0 ? "text-success" : "text-danger"}`}>
                        {item.trend > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {Math.abs(item.trend)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <Card hover={false} className="!py-2.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-surface-secondary border border-border-light rounded-[--radius-md] text-xs px-2 py-1.5 text-text-primary w-[130px]" />
              <span className="text-text-muted text-xs">~</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-surface-secondary border border-border-light rounded-[--radius-md] text-xs px-2 py-1.5 text-text-primary w-[130px]" />
            </div>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="bg-surface-secondary border border-border-light rounded-[--radius-md] text-xs px-2 py-1.5 text-text-primary">
              <option value="전체">전체 거래처</option>
              {customers.map((c) => <option key={c.id} value={c.name}>{c.shortName}</option>)}
            </select>
            <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="bg-surface-secondary border border-border-light rounded-[--radius-md] text-xs px-2 py-1.5 text-text-primary">
              <option value="전체">전체 제품</option>
              {PRODUCTS.map((p) => <option key={p} value={p}>{p} ({PRODUCT_NAMES[p]})</option>)}
            </select>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value as typeof selectedType)} className="bg-surface-secondary border border-border-light rounded-[--radius-md] text-xs px-2 py-1.5 text-text-primary">
              <option value="전체">전체 유형</option>
              <option value="매출">매출</option>
              <option value="매입">매입</option>
            </select>
            <button onClick={handleSearch} className="flex items-center gap-1 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-[--radius-md] hover:bg-brand-600 transition-colors cursor-pointer">
              <Search size={12} /> 검색
            </button>
            <button onClick={handleReset} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border-light rounded-[--radius-md] transition-colors cursor-pointer">
              <RotateCcw size={12} /> 초기화
            </button>
            <div className="flex-1" />
            {appliedFilters.customer !== "전체" && (
              <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-brand-50 text-brand rounded-full">
                {customers.find((c) => c.name === appliedFilters.customer)?.shortName ?? appliedFilters.customer}
                <button onClick={() => { setSelectedCustomer("전체"); setAppliedFilters((p) => ({ ...p, customer: "전체" })); setPage(1); }} className="ml-0.5 hover:text-brand-700 cursor-pointer">&times;</button>
              </span>
            )}
            <span className="text-xs text-text-muted tabular-nums">{fmt(filteredRecords.length)}건 조회</span>
          </div>
        </Card>

        {activeView === "dashboard" ? (
          <>
            {/* ── Row 1: Main Chart + AI Insights ── */}
            <div className="grid grid-cols-[1fr_320px] gap-4">
              {/* Daily Trend */}
              <Card hover={false}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-text-primary">일별 배송 추이</h2>
                  <div className="flex items-center gap-3 text-[11px] text-text-muted">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand" />배송량(톤)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-[2px] bg-danger rounded" style={{ width: 8 }} />건수</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={dailyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradQty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="qty" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}t`} />
                    <YAxis yAxisId="cnt" orientation="right" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-light)" }} formatter={(v) => v != null ? `${v}` : ""} />
                    <Area yAxisId="qty" type="monotone" dataKey="qty" fill="url(#gradQty)" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
                    <Line yAxisId="cnt" type="monotone" dataKey="count" stroke="var(--color-danger)" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              {/* AI Insights */}
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-warning" />
                  <h2 className="text-sm font-semibold text-text-primary">AI 인사이트</h2>
                </div>
                <div className="space-y-2.5">
                  {insights.map((ins, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`p-3 rounded-[--radius-md] text-xs leading-relaxed ${
                        ins.type === "success" ? "bg-success-bg text-success" : ins.type === "warning" ? "bg-warning-bg text-warning" : "bg-info-bg text-info"
                      }`}
                    >
                      {ins.text}
                    </motion.div>
                  ))}
                </div>

                {/* Weekday Heatmap */}
                <div className="mt-4 pt-3 border-t border-border-light">
                  <p className="text-[11px] text-text-muted mb-2">요일별 배송 패턴</p>
                  <div className="flex gap-1.5">
                    {weekdayData.map((d) => (
                      <div key={d.label} className="flex-1 text-center">
                        <div
                          className="h-8 rounded-[--radius-sm] mb-1 flex items-center justify-center text-[10px] font-bold tabular-nums"
                          style={{
                            backgroundColor: `color-mix(in srgb, var(--color-brand) ${Math.round(d.intensity * 80 + 10)}%, var(--color-surface-secondary))`,
                            color: d.intensity > 0.5 ? "white" : "var(--color-text-secondary)",
                          }}
                        >
                          {d.count}
                        </div>
                        <span className="text-[10px] text-text-muted">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* ── Row 2: Product Mix + Customer Ranking + Driver Perf ── */}
            <div className="grid grid-cols-3 gap-4">
              {/* Product Mix */}
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-2">
                  <PieIcon size={14} className="text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-primary">제품별 구성비</h2>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={productPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                      {productPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => v != null ? `${fmt(Math.round(Number(v) / 1000))}톤` : ""} contentStyle={{ fontSize: 12, borderRadius: "var(--radius-md)" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-1">
                  {productPie.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <ProductDot product={d.name} />
                      <span className="text-text-secondary flex-1">{d.fullName}</span>
                      <span className="font-bold tabular-nums text-text-primary">{d.pct}%</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Customer Ranking */}
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} className="text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-primary">거래처 물량 순위</h2>
                </div>
                <div className="space-y-1">
                  {topCustomers.slice(0, 8).map((c) => (
                    <button
                      key={c.fullName}
                      onClick={() => selectCustomer(c.fullName)}
                      className="flex items-center gap-2 w-full text-left py-1 px-1.5 -mx-1.5 rounded-[--radius-sm] hover:bg-surface-secondary transition-colors cursor-pointer"
                    >
                      <span className="text-[10px] text-text-muted w-3 tabular-nums text-right shrink-0">{c.rank}</span>
                      <ProductDot product={c.product} />
                      <span className="text-xs text-text-primary flex-1 truncate">{c.name}</span>
                      <div className="w-20 bg-border-light rounded-full h-1.5 shrink-0">
                        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(c.qty / (topCustomers[0]?.qty || 1)) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-text-primary w-10 text-right shrink-0">{c.pct}%</span>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Driver Performance */}
              <Card hover={false}>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-text-muted" />
                  <h2 className="text-sm font-semibold text-text-primary">기사별 배송 실적</h2>
                </div>
                <div className="space-y-1.5">
                  {driverPerf.map((d, i) => {
                    const safeColor = d.safetyScore >= 90 ? "text-success" : d.safetyScore >= 70 ? "text-warning" : "text-danger";
                    return (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted w-3 tabular-nums text-right shrink-0">{i + 1}</span>
                        <span className="text-xs font-medium text-text-primary w-14 shrink-0">{d.name}</span>
                        <span className="text-[10px] text-text-muted w-16 shrink-0">{d.vehicle}</span>
                        <div className="flex-1 text-right">
                          <span className="text-xs font-bold tabular-nums">{fmt(Math.round(d.qty / 1000))}t</span>
                          <span className="text-[10px] text-text-muted ml-1">({d.count}건)</span>
                        </div>
                        <span className={`text-[10px] font-bold tabular-nums w-6 text-right ${safeColor}`}>{d.safetyScore}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* ── Row 3: Product Stacked Bar ── */}
            <Card hover={false}>
              <h2 className="text-sm font-semibold text-text-primary mb-3">일별 제품별 배송량</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyByProduct} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}t`} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: "var(--radius-md)", border: "1px solid var(--color-border-light)" }} formatter={(v) => v != null ? `${fmt(Number(v))}kg` : ""} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} verticalAlign="top" align="right" />
                  {PRODUCTS.map((p) => <Bar key={p} dataKey={p} stackId="a" fill={PRODUCT_COLORS[p]} radius={p === "LPG" ? [2, 2, 0, 0] : undefined} />)}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        ) : (
          /* ── Table View ── */
          <Card hover={false} className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface-secondary border-b border-border-light">
                    {[
                      { key: "date" as const, label: "일시", w: "w-28" },
                      { key: "customerName" as const, label: "거래처", w: "w-36" },
                      { key: "product" as const, label: "제품", w: "w-24" },
                      { key: "quantity" as const, label: "물량(kg)", w: "w-24" },
                    ].map((col) => (
                      <th key={col.key} className={`text-left px-4 py-2.5 font-semibold text-text-secondary ${col.w}`}>
                        <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 cursor-pointer hover:text-text-primary">
                          {col.label} <SortIcon col={col.key} />
                        </button>
                      </th>
                    ))}
                    <th className="text-left px-4 py-2.5 font-semibold text-text-secondary w-20">유형</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-text-secondary w-24">차량</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-text-secondary w-16">기사</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-text-secondary w-16">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((r) => (
                    <tr key={r.id} className="border-b border-border-light hover:bg-surface-secondary transition-colors">
                      <td className="px-4 py-2.5 tabular-nums text-text-muted">{r.dateLabel} {r.time}</td>
                      <td className="px-4 py-2.5 font-medium">
                        <button
                          onClick={() => selectCustomer(r.customerName)}
                          className="text-text-primary hover:text-brand hover:underline cursor-pointer transition-colors"
                        >
                          {r.customerName}
                        </button>
                      </td>
                      <td className="px-4 py-2.5"><span className="flex items-center gap-1.5"><ProductDot product={r.product} />{r.product}</span></td>
                      <td className="px-4 py-2.5 tabular-nums font-medium text-text-primary">{fmt(r.quantity)}</td>
                      <td className="px-4 py-2.5"><Badge variant={r.type === "매출" ? "blue" : "green"}>{r.type}</Badge></td>
                      <td className="px-4 py-2.5 text-text-muted">{r.vehiclePlate}</td>
                      <td className="px-4 py-2.5 text-text-secondary">{r.driver}</td>
                      <td className="px-4 py-2.5"><Badge variant={r.status === "완료" ? "safe" : "warning"}>{r.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-light">
              <span className="text-xs text-text-muted">{fmt(sortedRecords.length)}건 중 {(page - 1) * PAGE_SIZE + 1}~{Math.min(page * PAGE_SIZE, sortedRecords.length)}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-[--radius-sm] hover:bg-surface-secondary disabled:opacity-30 cursor-pointer"><ChevronLeft size={14} /></button>
                <span className="text-xs tabular-nums px-2">{page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-[--radius-sm] hover:bg-surface-secondary disabled:opacity-30 cursor-pointer"><ChevronRight size={14} /></button>
              </div>
              <button onClick={() => { addToast("success", "CSV 다운로드를 시작합니다."); }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border-light rounded-[--radius-md] transition-colors cursor-pointer">
                <Download size={12} /> CSV
              </button>
            </div>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
