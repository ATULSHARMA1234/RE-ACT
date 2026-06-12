"use client";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CopilotWidget from "./CopilotWidget";
import CommandPalette from "@/components/CommandPalette";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="min-h-screen relative overflow-hidden bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: "url('/bg-skincare.png')" }}
    >
      {/* Subtle overlay to ensure text contrast while maintaining the image vibe */}
      <div className="absolute inset-0 bg-[#F7F4EF]/30 pointer-events-none" />
      
      {/* Decorative blurred orbs to enhance glass effect */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-white/40 rounded-full blur-[120px] pointer-events-none" />
      
      <Sidebar />
      <div className="ml-sidebar relative z-10">
        <TopBar />
        <main className="p-8">{children}</main>
      </div>
      <CopilotWidget />
      <CommandPalette />
    </div>
  );
}
