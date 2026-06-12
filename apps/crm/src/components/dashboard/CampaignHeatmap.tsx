"use client";

import { useState, useEffect } from "react";
import { Calendar, Loader2 } from "lucide-react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const times = ["Morning", "Afternoon", "Evening"];

export default function CampaignHeatmap() {
  const [heatmapData, setHeatmapData] = useState<number[][]>([
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(res => {
        if (res.heatmap) setHeatmapData(res.heatmap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hasData = heatmapData.some(row => row.some(v => v > 0));

  return (
    <div className="bg-surface-card border border-border rounded-lg p-6 shadow-card h-[400px] flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="text-brand-coral" size={20} />
        <h3 className="text-h2 font-display font-semibold">Engagement Heatmap</h3>
      </div>
      
      <div className="flex-1 w-full min-h-0 flex flex-col justify-center">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-text-muted" />
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <Calendar size={32} className="opacity-20 mb-2" />
            <p className="text-small">No engagement data yet. Send campaigns to see activity patterns.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[auto_1fr] gap-4 h-full">
            {/* Y Axis Labels */}
            <div className="flex flex-col justify-around text-small text-text-secondary pr-2 border-r border-border/50">
              {times.map((time) => (
                <span key={time}>{time}</span>
              ))}
            </div>

            {/* Heatmap Grid */}
            <div className="flex flex-col justify-around">
              {heatmapData.map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-7 gap-2 h-16">
                  {row.map((intensity, colIndex) => (
                    <div
                      key={colIndex}
                      className="rounded-md transition-all duration-300 hover:ring-2 ring-brand-coral/50"
                      style={{
                        backgroundColor: `rgba(255, 107, 74, ${Math.max(0.05, intensity)})`,
                        cursor: 'pointer'
                      }}
                      title={`${days[colIndex]} ${times[rowIndex]}: ${(intensity * 100).toFixed(0)}% engagement`}
                    />
                  ))}
                </div>
              ))}
              
              {/* X Axis Labels */}
              <div className="grid grid-cols-7 gap-2 mt-4">
                {days.map((day) => (
                  <div key={day} className="text-center text-small text-text-secondary">
                    {day}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
