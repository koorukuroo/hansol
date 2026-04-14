"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Calendar, AlertTriangle, Printer, X, FileText, CheckCircle2 } from "lucide-react";

import { vehicles, vehicleHealth } from "@/lib/data";
import Card from "@/components/ui/Card";
import Gauge from "@/components/ui/Gauge";
import StatusDot from "@/components/ui/StatusDot";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/components/ui/Toast";

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
  const printRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();

  const detail = selectedPlate ? vehicleHealth[selectedPlate] : null;
  const selectedVehicle = selectedPlate
    ? vehicles.find((v) => v.plateNumber === selectedPlate)
    : null;

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
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card hover={false}>
                <EmptyState
                  icon={Wrench}
                  title="차량을 선택하세요"
                  description="위 히트맵에서 차량을 클릭하면 상세 정보가 표시됩니다"
                />
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key={selectedPlate}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
            >
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
