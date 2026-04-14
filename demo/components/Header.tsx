"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { customers } from "@/lib/data";

export default function Header() {
  const [time, setTime] = useState("");

  const dangerCount = customers.filter((c) => c.riskLevel === "danger").length;

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const h = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setTime(`${y}.${m}.${d} ${h}:${min}:${s}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-14 bg-surface shadow-[--shadow-xs] flex items-center justify-between px-5 shrink-0 z-10">
      <Link href="/" className="flex items-center gap-3 h-full hover:opacity-80 transition-opacity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-dukyang.png"
          alt="덕양가스"
          className="h-10 w-auto"
        />
        <span className="w-px h-5 bg-border" />
        <span className="text-sm font-semibold text-text-secondary">
          AI 통합 관제
        </span>
      </Link>
      <div className="flex items-center gap-4">
        {dangerCount > 0 && (
          <div className="flex items-center gap-1.5 bg-danger-bg text-danger rounded-full px-2.5 py-1">
            <AlertTriangle size={13} />
            <span className="text-[11px] font-semibold tabular-nums">
              위험 {dangerCount}건
            </span>
          </div>
        )}
        <span className="text-sm text-text-muted tabular-nums">{time}</span>
      </div>
    </header>
  );
}
