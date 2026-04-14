"use client";

import { useState, useCallback } from "react";
import {
  MessageCircle,
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Send,
  X,
  Truck,
  Calendar,
  Package,
  FileText,
  ArrowRight,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { kakaoSamples } from "@/lib/data";
import ProductDot from "@/components/ui/ProductDot";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import PageTransition from "@/components/PageTransition";
import { useToast } from "@/components/ui/Toast";

// ── Types ──
interface ParsedResult {
  customer: string;
  customerId: string;
  product: string;
  productName: string;
  quantity: number;
  unit: string;
  requestTime: string;
  urgency: "normal" | "urgent";
  confidence: number;
}

// ── Product name mapping ──
const productMap: Record<string, { code: string; name: string }> = {
  "산소": { code: "O2", name: "액화산소" },
  "질소": { code: "N2", name: "액화질소" },
  "알곤": { code: "AR", name: "액화알곤" },
  "아르곤": { code: "AR", name: "액화알곤" },
  "탄산": { code: "CO2", name: "액화탄산" },
  "탄산가스": { code: "CO2", name: "액화탄산" },
  "lpg": { code: "LPG", name: "LPG" },
};

// ── Parse custom input ──
function parseMessage(text: string): ParsedResult | null {
  const lower = text.toLowerCase();

  // Detect product
  let product = "";
  let productName = "";
  for (const [keyword, info] of Object.entries(productMap)) {
    if (lower.includes(keyword)) {
      product = info.code;
      productName = info.name;
      break;
    }
  }

  // Extract quantity
  const qtyMatch = text.match(/(\d+\.?\d*)\s*(톤|ton|kg|킬로)/i);
  let quantity = 0;
  let unit = "kg";
  if (qtyMatch) {
    const num = parseFloat(qtyMatch[1]);
    const u = qtyMatch[2].toLowerCase();
    if (u === "톤" || u === "ton") {
      quantity = num * 1000;
      unit = "kg";
    } else {
      quantity = num;
      unit = "kg";
    }
  }

  // Detect urgency
  const urgencyKeywords = ["급", "긴급", "빨리", "asap"];
  const urgency = urgencyKeywords.some((kw) => lower.includes(kw))
    ? ("urgent" as const)
    : ("normal" as const);

  if (!product && quantity === 0) return null;

  return {
    customer: "직접 입력",
    customerId: "-",
    product: product || "미확인",
    productName: productName || "미확인",
    quantity,
    unit,
    requestTime: "확인 필요",
    urgency,
    confidence: product && quantity > 0 ? 85 : 60,
  };
}

// ── Field display config ──
interface FieldConfig {
  label: string;
  key: keyof ParsedResult;
  format?: (v: unknown) => string;
}

const fields: FieldConfig[] = [
  { label: "거래처", key: "customer" },
  { label: "거래처 코드", key: "customerId" },
  { label: "제품 코드", key: "product" },
  { label: "제품명", key: "productName" },
  {
    label: "수량",
    key: "quantity",
    format: (v) => `${Number(v).toLocaleString()} kg`,
  },
  {
    label: "납기 요청",
    key: "requestTime",
  },
  {
    label: "긴급도",
    key: "urgency",
    format: (v) => (v === "urgent" ? "긴급" : "일반"),
  },
];

export default function KakaoPage() {
  const { addToast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [customParsed, setCustomParsed] = useState<ParsedResult | null>(null);

  // Currently active parsed result
  const activeParsed: ParsedResult | null =
    selectedId !== null
      ? selectedId === -1
        ? customParsed
        : (kakaoSamples.find((s) => s.id === selectedId)?.parsed ?? null)
      : null;

  const handleSelectSample = useCallback((id: number) => {
    setSelectedId(id);
    setCustomParsed(null);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!customInput.trim()) return;
    const result = parseMessage(customInput);
    if (result) {
      setCustomParsed(result);
      setSelectedId(-1);
    } else {
      addToast("warning", "메시지를 분석할 수 없습니다. 제품명이나 수량을 포함해 주세요.");
    }
  }, [customInput, addToast]);

  const [orderedIds, setOrderedIds] = useState<Set<number>>(new Set());
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [addToDispatch, setAddToDispatch] = useState(true);

  const handleCreateOrder = useCallback(() => {
    setShowOrderModal(true);
    setOrderSubmitted(false);
  }, []);

  const handleConfirmOrder = useCallback(() => {
    setOrderSubmitted(true);
    if (selectedId !== null) {
      setOrderedIds((prev) => new Set(prev).add(selectedId));
    }
    setTimeout(() => {
      addToast("success", addToDispatch
        ? "ERP 주문이 생성되고 배차최적화에 반영되었습니다."
        : "ERP 주문이 생성되었습니다."
      );
    }, 500);
  }, [addToast, selectedId, addToDispatch]);

  // 주문번호 생성
  const orderNumber = `ORD-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}${String(new Date().getDate()).padStart(2,"0")}-${String(Math.floor(Math.random() * 900) + 100)}`;

  return (
    <PageTransition>
      <div className="flex gap-5 h-[calc(100vh-100px)]">
        {/* ── Left: KakaoTalk Chat UI ── */}
        <div className="w-[400px] shrink-0 flex flex-col rounded-[--radius-lg] overflow-hidden shadow-[--shadow-sm] border border-border-light">
          {/* Chat header */}
          <div className="bg-[#5B86A7] px-4 py-3 flex items-center gap-2 rounded-t-[--radius-lg]">
            <MessageCircle size={18} className="text-white" />
            <span className="text-white font-semibold text-sm">
              덕양가스 발주 채널
            </span>
            <span className="ml-auto text-white/70 text-xs">
              {kakaoSamples.length}건
            </span>
          </div>

          {/* Chat body */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scroll"
            style={{ background: "#B2C7D9" }}
          >
            {kakaoSamples.map((sample) => {
              const isSelected = selectedId === sample.id;
              return (
                <div key={sample.id} className="flex flex-col items-start">
                  {/* Sender name */}
                  <span className="text-xs font-bold text-text-secondary mb-1 ml-1">
                    {sample.sender}
                  </span>
                  {/* Bubble */}
                  <button
                    onClick={() => handleSelectSample(sample.id)}
                    className={`bg-surface rounded-[--radius-lg] shadow-[--shadow-xs] px-4 py-3 text-sm text-left leading-relaxed transition-all
                      ${
                        isSelected
                          ? "ring-2 ring-brand shadow-[--shadow-md]"
                          : "hover:shadow-[--shadow-md]"
                      }`}
                  >
                    {sample.message}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Chat input */}
          <div className="bg-surface border-t border-border px-3 py-3 flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAnalyze();
              }}
              placeholder="발주 메시지 입력..."
              className="flex-1 rounded-full bg-surface-secondary px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40 transition-shadow"
            />
            <button
              onClick={handleAnalyze}
              className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center hover:bg-brand-700 transition-colors shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* ── Right: AI Parsing Result ── */}
        <div className="flex-1 flex flex-col">
          {activeParsed === null ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={MessageCircle}
                title="카카오톡 메시지를 선택하세요"
                description="왼쪽 채팅에서 메시지를 클릭하면 AI 파싱 결과를 확인할 수 있습니다"
              />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                  <MessageCircle size={20} className="text-brand" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">AI 파싱 결과</h2>
                  <p className="text-xs text-text-muted">
                    자연어 발주 메시지를 자동으로 분석합니다
                  </p>
                </div>
                <div className="ml-auto">
                  <Badge
                    variant={
                      activeParsed.confidence >= 90
                        ? "green"
                        : activeParsed.confidence >= 80
                          ? "blue"
                          : "warning"
                    }
                  >
                    신뢰도 {activeParsed.confidence}%
                  </Badge>
                </div>
              </div>

              {/* Parsed fields */}
              <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pr-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    {fields.map((field) => {
                      const rawValue = activeParsed[field.key];
                      const displayValue = field.format
                        ? field.format(rawValue)
                        : String(rawValue);
                      const needsReview = activeParsed.confidence < 80;

                      return (
                        <div
                          key={field.key}
                          className={`bg-surface rounded-[--radius-lg] shadow-[--shadow-sm] border border-border-light p-4 flex items-center gap-3 ${
                            needsReview ? "border-l-2 border-l-warning" : "border-l-2 border-l-success"
                          }`}
                        >
                          <CheckCircle2
                            size={20}
                            className={
                              needsReview
                                ? "text-warning shrink-0"
                                : "text-success shrink-0"
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-text-muted">
                              {field.label}
                            </p>
                            <p className="text-base font-semibold text-text-primary truncate">
                              {displayValue}
                            </p>
                          </div>
                          {needsReview && (
                            <Badge variant="warning">확인 필요</Badge>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border">
                {selectedId !== null && orderedIds.has(selectedId) ? (
                  <button
                    disabled
                    className="flex items-center gap-2 px-5 py-2.5 bg-success-bg text-success rounded-[--radius-md] font-semibold text-sm border border-success/20 cursor-default"
                  >
                    <CheckCircle2 size={18} />
                    주문 생성 완료
                  </button>
                ) : (
                  <button
                    onClick={handleCreateOrder}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-[--radius-md] font-semibold text-sm hover:bg-brand-700 transition-colors"
                  >
                    <ClipboardCheck size={18} />
                    ERP 주문 생성
                  </button>
                )}
                <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-secondary text-text-secondary border border-border rounded-[--radius-md] font-semibold text-sm hover:bg-border-light transition-colors">
                  <Pencil size={16} />
                  수정
                </button>
                <button className="px-5 py-2.5 text-text-muted rounded-[--radius-md] font-medium text-sm hover:bg-surface-secondary transition-colors">
                  취소
                </button>
              </div>
            </>
          )}

          {/* Stats bar */}
          <div className="mt-4 flex items-center gap-6 bg-surface-secondary rounded-[--radius-lg] px-5 py-3 text-sm text-text-secondary border border-border-light">
            <span>
              오늘 카톡 발주{" "}
              <span className="font-bold text-text-primary">12건</span>
            </span>
            <span className="w-px h-4 bg-border" />
            <span>
              자동 인식{" "}
              <span className="font-bold text-success">11건 (91.7%)</span>
            </span>
            <span className="w-px h-4 bg-border" />
            <span>
              평균 처리{" "}
              <span className="font-bold text-text-primary">18초</span>
            </span>
          </div>
        </div>
      </div>
      {/* ── ERP Order Modal ── */}
      <AnimatePresence>
        {showOrderModal && activeParsed && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => !orderSubmitted && setShowOrderModal(false)} />

            <motion.div
              className="relative bg-surface rounded-[--radius-xl] shadow-[--shadow-xl] w-[560px] max-h-[85vh] overflow-y-auto"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {!orderSubmitted ? (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-brand" />
                      <h2 className="text-lg font-semibold text-text-primary">ERP 주문 생성</h2>
                    </div>
                    <button onClick={() => setShowOrderModal(false)} className="p-1.5 text-text-muted hover:text-text-secondary hover:bg-surface-secondary rounded-[--radius-md] transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  {/* Order Details */}
                  <div className="px-6 py-5 space-y-5">
                    {/* Order number */}
                    <div className="flex items-center justify-between bg-surface-secondary rounded-[--radius-md] px-4 py-3">
                      <span className="text-xs text-text-muted">주문번호</span>
                      <span className="text-sm font-semibold text-text-primary tabular-nums">{orderNumber}</span>
                    </div>

                    {/* Main info grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted">거래처</label>
                        <div className="bg-surface-secondary rounded-[--radius-md] px-3 py-2.5 text-sm font-medium text-text-primary">
                          {activeParsed.customer}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted">거래처 코드</label>
                        <div className="bg-surface-secondary rounded-[--radius-md] px-3 py-2.5 text-sm font-medium text-text-primary tabular-nums">
                          {activeParsed.customerId}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted flex items-center gap-1"><Package size={11} />제품</label>
                        <div className="bg-surface-secondary rounded-[--radius-md] px-3 py-2.5 text-sm font-medium text-text-primary flex items-center gap-2">
                          <ProductDot product={activeParsed.product} size={8} />
                          {activeParsed.productName}
                          <span className="text-xs text-text-muted ml-auto">{activeParsed.product}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted">수량</label>
                        <div className="bg-surface-secondary rounded-[--radius-md] px-3 py-2.5 text-sm font-bold text-text-primary tabular-nums">
                          {activeParsed.quantity.toLocaleString()} {activeParsed.unit}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted flex items-center gap-1"><Calendar size={11} />납기 요청</label>
                        <div className="bg-surface-secondary rounded-[--radius-md] px-3 py-2.5 text-sm font-medium text-text-primary">
                          {activeParsed.requestTime}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-text-muted">긴급도</label>
                        <div className={`rounded-[--radius-md] px-3 py-2.5 text-sm font-semibold ${
                          activeParsed.urgency === "urgent"
                            ? "bg-danger-bg text-danger"
                            : "bg-surface-secondary text-text-primary"
                        }`}>
                          {activeParsed.urgency === "urgent" ? "긴급" : "일반"}
                        </div>
                      </div>
                    </div>

                    {/* AI confidence */}
                    <div className="bg-info-bg rounded-[--radius-md] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-info font-semibold">AI 인식 신뢰도</span>
                        <span className="text-sm font-bold text-info tabular-nums">{activeParsed.confidence}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-info/10 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-info rounded-full" style={{ width: `${activeParsed.confidence}%` }} />
                      </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer bg-surface-secondary rounded-[--radius-md] px-4 py-3 hover:bg-border-light transition-colors">
                        <input type="checkbox" checked={addToDispatch} onChange={(e) => setAddToDispatch(e.target.checked)} className="w-4.5 h-4.5 rounded border-border text-brand accent-brand" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                            <Truck size={14} className="text-brand" />
                            배차최적화에 자동 반영
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">주문 생성 후 배차 최적화 대기열에 자동 추가됩니다</p>
                        </div>
                      </label>
                    </div>

                    {/* Source info */}
                    <div className="bg-surface-secondary rounded-[--radius-md] px-4 py-3 text-xs text-text-muted space-y-1">
                      <div className="flex justify-between">
                        <span>발주 채널</span>
                        <span className="text-text-secondary font-medium">카카오톡</span>
                      </div>
                      <div className="flex justify-between">
                        <span>원본 메시지</span>
                        <span className="text-text-secondary font-medium italic">
                          &quot;{selectedId && selectedId > 0 ? kakaoSamples.find(s => s.id === selectedId)?.message : customInput || "-"}&quot;
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>처리 담당</span>
                        <span className="text-text-secondary font-medium">AI 자동 파싱</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer buttons */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border-light bg-surface-secondary/50">
                    <button onClick={() => setShowOrderModal(false)} className="px-4 py-2.5 text-sm text-text-muted hover:text-text-secondary hover:bg-surface-secondary rounded-[--radius-md] transition-colors">
                      취소
                    </button>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-text-secondary border border-border rounded-[--radius-md] hover:bg-surface-secondary transition-colors">
                        <Printer size={14} />
                        인쇄
                      </button>
                      <button
                        onClick={handleConfirmOrder}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-[--radius-md] font-semibold text-sm hover:bg-brand-700 transition-colors"
                      >
                        주문 확정
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Success state */
                <div className="px-6 py-10 flex flex-col items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-success-bg flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 size={32} className="text-success" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-text-primary">주문이 생성되었습니다</h3>
                  <p className="text-sm text-text-muted mt-1 mb-6">
                    주문번호 <span className="font-semibold text-text-secondary tabular-nums">{orderNumber}</span>
                  </p>

                  <div className="w-full space-y-2 mb-6">
                    <div className="flex items-center gap-3 bg-surface-secondary rounded-[--radius-md] px-4 py-2.5 text-sm">
                      <CheckCircle2 size={16} className="text-success shrink-0" />
                      <span className="text-text-secondary">ERP 시스템에 주문 등록 완료</span>
                    </div>
                    {addToDispatch && (
                      <div className="flex items-center gap-3 bg-surface-secondary rounded-[--radius-md] px-4 py-2.5 text-sm">
                        <CheckCircle2 size={16} className="text-success shrink-0" />
                        <span className="text-text-secondary">배차최적화 대기열에 추가됨</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 bg-surface-secondary rounded-[--radius-md] px-4 py-2.5 text-sm">
                      <CheckCircle2 size={16} className="text-success shrink-0" />
                      <span className="text-text-secondary">{activeParsed.customer}에 발주 확인 알림 발송</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowOrderModal(false)}
                      className="px-5 py-2.5 bg-surface-secondary text-text-secondary rounded-[--radius-md] font-medium text-sm hover:bg-border-light transition-colors"
                    >
                      닫기
                    </button>
                    {addToDispatch && (
                      <button
                        onClick={() => { setShowOrderModal(false); window.location.href = "/dispatch"; }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-[--radius-md] font-semibold text-sm hover:bg-brand-700 transition-colors"
                      >
                        <Truck size={14} />
                        배차최적화로 이동
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
