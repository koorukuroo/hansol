"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  TrendingUp,
  Map,
  MessageCircle,
  Eye,
  Wrench,
  ClipboardList,
  Truck,
  Radio,
  History,
  FileSpreadsheet,
} from "lucide-react";
import { allVehicles } from "@/lib/data";

interface SubItem {
  label: string;
  href: string;
}

interface MenuItem {
  icon: typeof BarChart3;
  label: string;
  href: string;
  children?: SubItem[];
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
      { icon: Radio, label: "텔레매틱스", href: "/telematics" },
      { icon: History, label: "운행 이력", href: "/history" },
      { icon: Eye, label: "안전 모니터링", href: "/safety" },
    ],
  },
  {
    label: "최적화",
    items: [
      {
        icon: TrendingUp,
        label: "수요예측 (VMI)",
        href: "/forecast",
        children: [
          { label: "통합 수요", href: "/forecast" },
          { label: "거래처별 상세", href: "/forecast?view=detail" },
        ],
      },
      { icon: Map, label: "배차 최적화", href: "/dispatch" },
      { icon: MessageCircle, label: "카톡 발주 AI", href: "/kakao" },
    ],
  },
  {
    label: "관리",
    items: [
      {
        icon: FileSpreadsheet,
        label: "납품 이력",
        href: "/deliveries",
        children: [
          { label: "대시보드", href: "/deliveries" },
          { label: "상세 이력", href: "/deliveries?view=table" },
        ],
      },
      { icon: Wrench, label: "예지보전", href: "/maintenance" },
      { icon: ClipboardList, label: "성과 KPI", href: "/kpi" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? "";

  const runningCount = allVehicles.filter((v) => v.status === "running").length;
  const totalCount = allVehicles.length;
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
              const isParentActive = pathname === item.href || (item.children && pathname.startsWith(item.href));
              const hasChildren = item.children && item.children.length > 0;
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-200 relative
                      ${
                        isParentActive
                          ? "text-white font-medium bg-white/8"
                          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                      }
                      focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-inset outline-none`}
                  >
                    {isParentActive && !hasChildren && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-400 rounded-r" />
                    )}
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                  {/* Sub-menu items */}
                  {hasChildren && isParentActive && (
                    <div className="ml-8 border-l border-white/10">
                      {item.children!.map((sub) => {
                        const subHasQuery = sub.href.includes("?");
                        const subView = subHasQuery ? new URLSearchParams(sub.href.split("?")[1]).get("view") : null;
                        const subActive = subHasQuery
                          ? currentView === subView
                          : pathname === sub.href && !currentView;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`block pl-4 pr-5 py-1.5 text-xs transition-colors duration-150 relative
                              ${subActive
                                ? "text-white font-medium"
                                : "text-gray-500 hover:text-gray-300"
                              }`}
                          >
                            {subActive && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3 bg-brand-400 rounded-r" />
                            )}
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Vehicle utilization gauge — links to telematics */}
      <Link
        href="/telematics"
        className="block px-5 py-3 border-t border-white/10 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
          <span className="flex items-center gap-2">
            <Truck size={14} className="text-gray-500" />
            가동{" "}
            <span className="text-white font-medium tabular-nums">
              {runningCount}/{totalCount}
            </span>
          </span>
          <span className="text-[10px] text-gray-500">상세 &rsaquo;</span>
        </div>
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-400 rounded-full transition-all duration-500"
            style={{ width: `${utilizationPercent}%` }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" />운행 {runningCount}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning" />{allVehicles.filter(v => v.status === "warning").length}</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-500" />대기 {allVehicles.filter(v => v.status === "idle").length}</span>
        </div>
      </Link>

      <div className="px-5 py-3 border-t border-white/10 text-[11px] text-gray-600">
        AI 물류 관제 v1.0
      </div>
    </aside>
  );
}
