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
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/segments", icon: Filter, label: "Segments" },
  { href: "/campaigns", icon: Megaphone, label: "Campaigns" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-sidebar bg-ink-navy flex flex-col z-50">
      {/* Logo */}
      <div className="h-topbar flex items-center px-6 border-b border-ink-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-coral flex items-center justify-center">
            <span className="text-white font-display font-bold text-body">R</span>
          </div>
          <span className="text-white font-display font-bold text-h2 tracking-tight">
            REACH
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-body font-medium transition-all duration-150 ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-text-muted hover:bg-white/5 hover:text-white"
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
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-dark text-brand-coral">
          <Sparkles size={16} strokeWidth={1.5} />
          <span className="text-small font-medium">Powered by Groq</span>
        </div>
        <p className="text-[10px] text-text-muted mt-2 px-3">
          llama-3.3-70b-versatile
        </p>
      </div>
    </aside>
  );
}
