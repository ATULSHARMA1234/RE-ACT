"use client";

import { useState, useEffect } from "react";
import { Mail, MessageCircle, Smartphone, Loader2 } from "lucide-react";

interface ChannelData {
  channel: string;
  volume: number;
  delivery: string;
  openRate: string;
}

const iconMap: Record<string, React.ReactNode> = {
  EMAIL: <Mail size={18} className="text-[#86A8C4]" />,
  WHATSAPP: <MessageCircle size={18} className="text-[#10A144]" />,
  SMS: <Smartphone size={18} className="text-[#86A8C4]" />,
};

export default function ChannelPerformanceWidget() {
  const [channels, setChannels] = useState<ChannelData[]>([
    { channel: "EMAIL", volume: 0, delivery: "0%", openRate: "0%" },
    { channel: "WHATSAPP", volume: 0, delivery: "0%", openRate: "0%" },
    { channel: "SMS", volume: 0, delivery: "0%", openRate: "0%" },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(res => {
        if (res.channelPerformance) setChannels(res.channelPerformance);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-surface-card border border-border rounded-xl p-6 h-full flex flex-col shadow-card">
      <h3 className="text-2xl font-bold text-[#1F2937] mb-6">
        Channel Performance
      </h3>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-text-muted" />
        </div>
      ) : (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {channels.map((channel) => (
            <div
              key={channel.channel}
              className="border border-[#7B7B7B]/30 rounded-xl p-5 bg-transparent"
            >
              <div className="flex items-center gap-3 mb-5">
                {iconMap[channel.channel]}
                <span className="font-serif font-bold text-[15px] tracking-wider text-[#1F2937]">
                  {channel.channel}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[15px] text-[#86A8C4]">Volume</span>
                  <span className="font-medium text-[15px] text-[#1F2937]">
                    {channel.volume.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[15px] text-[#86A8C4]">Delivery</span>
                  <span className="font-medium text-[15px] text-[#1F2937]">
                    {channel.delivery}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[15px] text-[#86A8C4]">Open Rate</span>
                  <span className="font-medium text-[15px] text-[#4D8FC4]">
                    {channel.openRate}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
