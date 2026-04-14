"use client";

import { ReactNode, useEffect, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import AuthGate from "./AuthGate";
import MobileView from "./MobileView";
import { ToastProvider } from "./ui/Toast";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

export default function ClientShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <AuthGate>
      <ToastProvider>
        {isMobile ? (
          <MobileView />
        ) : (
          <>
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-y-auto bg-surface-secondary p-5">
                <div className="max-w-[1400px] mx-auto">{children}</div>
              </main>
            </div>
          </>
        )}
      </ToastProvider>
    </AuthGate>
  );
}
