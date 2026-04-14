"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Map,
  MessageCircle,
  Eye,
  Wrench,
  ClipboardList,
  Truck,
} from "lucide-react";
import { vehicles } from "@/lib/data";

interface MenuItem {
  icon: typeof BarChart3;
  label: string;
  href: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: "모니터링",
    items: [
      { icon: BarChart3, label: "대시보드", href: "/" },
      { icon: TrendingUp, label: "수요예측 (VMI)", href: "/forecast" },
      { icon: Eye, label: "안전 모니터링", href: "/safety" },
    ],
  },
  {
    label: "최적화",
    items: [
      { icon: Map, label: "배차 최적화", href: "/dispatch" },
      { icon: MessageCircle, label: "카톡 발주 AI", href: "/kakao" },
    ],
  },
  {
    label: "관리",
    items: [
      { icon: Wrench, label: "예지보전", href: "/maintenance" },
      { icon: ClipboardList, label: "성과 KPI", href: "/kpi" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const runningCount = vehicles.filter((v) => v.status === "running").length;
  const totalCount = vehicles.length;
  const utilizationPercent = Math.round((runningCount / totalCount) * 100);

  return (
    <aside className="w-60 shrink-0 bg-navy-950 text-gray-400 flex flex-col">
      <nav className="flex-1 py-2 overflow-y-auto custom-scroll">
        {menuGroups.map((group, gi) => (
          <div key={group.label}>
            <div
              className={`text-[11px] uppercase tracking-wider text-gray-500 px-5 py-2 ${gi === 0 ? "mt-2" : "mt-4"}`}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-200 relative
                    ${
                      active
                        ? "text-white font-medium bg-white/8"
                        : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                    }
                    focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-inset outline-none`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-400 rounded-r" />
                  )}
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Vehicle utilization gauge */}
      <div className="px-5 py-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
          <Truck size={14} className="text-gray-500" />
          <span>
            가동{" "}
            <span className="text-white font-medium tabular-nums">
              {runningCount}/{totalCount}
            </span>
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-400 rounded-full transition-all duration-500"
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
      </div>

      <div className="px-5 py-3 border-t border-white/10 text-[11px] text-gray-600">
        AI 물류 관제 v1.0
      </div>
    </aside>
  );
}
