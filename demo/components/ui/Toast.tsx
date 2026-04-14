"use client";

import { useEffect, useState, useCallback, createContext, useContext, ReactNode } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type ToastType = "success" | "warning" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  addToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const colors: Record<ToastType, string> = {
  success: "border-l-success text-success",
  warning: "border-l-warning text-warning",
  error: "border-l-danger text-danger",
  info: "border-l-info text-info",
};

const durations: Record<ToastType, number | null> = {
  success: 3000,
  warning: 5000,
  error: null,
  info: 3000,
};

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);

    const dur = durations[type];
    if (dur) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, dur);
    }
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[360px]">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`bg-surface-elevated rounded-[--radius-lg] shadow-[--shadow-lg] border border-border-light border-l-[3px] px-4 py-3 flex items-start gap-3 ${colors[t.type]}`}
              >
                <Icon size={18} className="mt-0.5 shrink-0" />
                <p className="text-sm leading-snug flex-1 text-text-primary">{t.message}</p>
                <button onClick={() => remove(t.id)} className="text-text-muted hover:text-text-secondary shrink-0">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
