"use client";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CopilotWidget from "./CopilotWidget";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-canvas">
      <Sidebar />
      <div className="ml-sidebar">
        <TopBar />
        <main className="p-8">{children}</main>
      </div>
      <CopilotWidget />
    </div>
  );
}
