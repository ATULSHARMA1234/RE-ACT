"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/segments": "Segments",
  "/campaigns": "Campaigns",
  "/campaigns/new": "Create Campaign",
  "/analytics": "Analytics",
};

export default function TopBar() {
  const pathname = usePathname();

  const getTitle = () => {
    // Check exact match first
    if (pageTitles[pathname]) return pageTitles[pathname];
    // Check prefix matches
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname.startsWith(path) && path !== "/") return title;
    }
    return "REACH";
  };

  return (
    <header className="h-topbar bg-white/40 backdrop-blur-2xl border-b border-white/60 flex items-center justify-between px-8 sticky top-0 z-40">
      <div>
        <h1 className="text-h1 font-display text-text-primary">{getTitle()}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center text-white text-small font-semibold">
          A
        </div>
      </div>
    </header>
  );
}
