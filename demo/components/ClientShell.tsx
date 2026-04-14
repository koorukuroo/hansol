"use client";

import { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import AuthGate from "./AuthGate";
import { ToastProvider } from "./ui/Toast";

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <ToastProvider>
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-surface-secondary p-5">
            <div className="max-w-[1400px] mx-auto">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </AuthGate>
  );
}
