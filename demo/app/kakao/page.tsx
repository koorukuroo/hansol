"use client";

import { useState, useCallback } from "react";
import {
  MessageCircle,
  CheckCircle2,
  ClipboardCheck,
  Pencil,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { kakaoSamples } from "@/lib/data";
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

  const handleCreateOrder = useCallback(() => {
    addToast("success", "ERP 주문이 생성되었습니다.");
    if (selectedId !== null) {
      setOrderedIds((prev) => new Set(prev).add(selectedId));
    }
  }, [addToast, selectedId]);

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
    </PageTransition>
  );
}
