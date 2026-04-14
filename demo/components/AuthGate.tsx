"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ArrowRight, AlertCircle } from "lucide-react";

const PASSWORD = "hansol";
const STORAGE_KEY = "dukyang-auth";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === "true") setAuthed(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (input === PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setAuthed(true);
    } else {
      setError(true);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setError(false), 3000);
    }
  }, [input]);

  if (checking) return null;
  if (authed) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-brand-800">
      {/* Decorative circles */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-brand/5 blur-3xl" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-brand/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-[400px]"
      >
        {/* Logo + Title */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-dukyang-white.png"
            alt="덕양가스"
            className="h-10 w-auto mx-auto mb-5"
          />
          <h1 className="text-xl font-bold text-white">AI 통합 관제 플랫폼</h1>
          <p className="text-sm text-white/50 mt-1">시스템 접속을 위해 비밀번호를 입력하세요</p>
        </div>

        {/* Login card */}
        <motion.div
          animate={shaking ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="bg-white/10 backdrop-blur-xl rounded-[--radius-xl] border border-white/10 p-6"
        >
          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="비밀번호"
              autoFocus
              className={`w-full pl-11 pr-14 py-3.5 bg-white/5 border rounded-[--radius-lg] text-white text-sm placeholder:text-white/30 outline-none transition-colors ${
                error ? "border-red-400/60 bg-red-500/5" : "border-white/15 focus:border-brand-400/60 focus:bg-white/8"
              }`}
            />
            <button
              onClick={handleSubmit}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-[--radius-md] bg-brand hover:bg-brand-400 transition-colors text-white"
            >
              <ArrowRight size={16} />
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-red-400 mt-3"
              >
                <AlertCircle size={12} />
                비밀번호가 올바르지 않습니다
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-xs text-white/20 mt-6">
          덕양가스 AI 물류 관제 시스템 v1.0
        </p>
      </motion.div>
    </div>
  );
}
