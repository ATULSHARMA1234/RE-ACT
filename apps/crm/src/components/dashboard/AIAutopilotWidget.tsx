"use client";

import { useState, useEffect } from "react";
import { Sparkles, Bot, Zap, Play, CheckCircle2, AlertCircle } from "lucide-react";

export default function AIAutopilotWidget() {
  const [isAutopilotOn, setIsAutopilotOn] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, time: "Just now", text: "Analyzing AT_RISK segment behavior patterns...", type: "process" },
    { id: 2, time: "2m ago", text: "Successfully recovered 3 abandoned carts. Revenue: $450", type: "success" },
    { id: 3, time: "15m ago", text: "A/B Test 'Summer Splash' completed. Variant B won by 14%.", type: "info" },
  ]);

  // Simulate incoming logs if autopilot is on
  useEffect(() => {
    if (!isAutopilotOn) return;

    const newLogs = [
      { text: "Detected 12 VIPs slipping away...", type: "alert" },
      { text: "Drafting targeted Win-Back SMS...", type: "process" },
      { text: "Sent Win-Back SMS to 12 VIPs.", type: "success" },
      { text: "Monitoring engagement for 'New Arrivals' campaign...", type: "info" },
    ];

    let i = 0;
    const interval = setInterval(() => {
      setLogs((prev) => {
        const updated = [{ id: Date.now(), time: "Just now", text: newLogs[i].text, type: newLogs[i].type }, ...prev];
        return updated.slice(0, 5); // Keep last 5
      });
      i = (i + 1) % newLogs.length;
    }, 4500);

    return () => clearInterval(interval);
  }, [isAutopilotOn]);

  return (
    <div className="bg-surface-card border border-brand-purple/20 rounded-xl shadow-card h-full flex flex-col relative overflow-hidden backdrop-blur-xl">
      {/* Background glow when active */}
      <div 
        className={`absolute -top-24 -right-24 w-48 h-48 bg-brand-purple/20 blur-3xl rounded-full transition-opacity duration-1000 ${isAutopilotOn ? "opacity-100" : "opacity-0"}`} 
      />

      <div className="p-6 border-b border-border flex items-center justify-between z-10 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isAutopilotOn ? 'bg-brand-purple text-white shadow-glow' : 'bg-surface-panel text-text-muted'}`}>
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-h3 font-display font-semibold flex items-center gap-2">
              AI Autopilot <Sparkles size={14} className="text-brand-purple" />
            </h2>
            <p className="text-small text-text-secondary">Fully autonomous campaign execution</p>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <button 
          onClick={() => setIsAutopilotOn(!isAutopilotOn)}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${isAutopilotOn ? 'bg-brand-purple' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isAutopilotOn ? 'translate-x-8' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-small font-semibold tracking-wider uppercase text-text-secondary">
            Live Activity Feed
          </span>
          {isAutopilotOn && (
            <span className="flex items-center gap-2 text-xs font-semibold text-brand-purple animate-pulse">
              <Zap size={12} /> Running
            </span>
          )}
        </div>

        <div className="flex-1 space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 text-small animate-fade-in">
              <div className="mt-0.5 shrink-0">
                {log.type === "success" && <CheckCircle2 size={16} className="text-brand-green" />}
                {log.type === "process" && <Play size={16} className="text-brand-blue" />}
                {log.type === "info" && <Sparkles size={16} className="text-brand-purple" />}
                {log.type === "alert" && <AlertCircle size={16} className="text-brand-amber" />}
              </div>
              <div>
                <p className="text-body text-text-primary leading-snug">{log.text}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{log.time}</p>
              </div>
            </div>
          ))}
          {!isAutopilotOn && (
            <div className="absolute inset-0 top-24 bg-surface-card/60 backdrop-blur-[2px] flex items-center justify-center">
              <p className="text-small font-semibold text-text-muted">Autopilot is currently paused.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
