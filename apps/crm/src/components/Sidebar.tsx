"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  BarChart3,
  Sparkles,
  Filter,
  Settings,
  Workflow,
  Radio,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/segments", icon: Filter, label: "Segments" },
  { href: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { href: "/workflows", icon: Workflow, label: "Workflows" },
  { href: "/live-feed", icon: Radio, label: "Live Feed" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/aura", icon: Sparkles, label: "Aura AI" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-white/25 backdrop-blur-2xl border-r border-white/30 shadow-[4px_0_32px_rgba(0,0,0,0.03)] flex flex-col z-50">
      {/* Logo */}
      <div className="h-topbar flex items-center px-6 border-b border-ink-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center">
            <span className="text-white font-display font-bold text-body">R✦</span>
          </div>
          <span className="text-text-primary font-display font-bold text-h2 tracking-tight">
            Radiance
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-body font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white text-text-primary shadow-sm border border-border"
                  : "text-text-secondary hover:bg-white/30 hover:text-text-primary"
              }`}
            >
              <item.icon size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* AI Panel at bottom */}
      <div className="mt-auto p-4 border-t border-ink-border">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-border text-brand-coral shadow-sm">
          <Sparkles size={16} strokeWidth={1.5} />
          <span className="text-small font-medium">Powered by Groq</span>
        </div>
        <p className="text-[10px] text-text-muted mt-2 px-3">
          llama-3.1-8b-instant
        </p>
      </div>
    </aside>
  );
}
