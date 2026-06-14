"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { Send, Clock } from "lucide-react";

export default function LaunchCampaignButton({ 
  campaignId, 
  name, 
  segmentId, 
  channel, 
  messageTemplate 
}: { 
  campaignId: string;
  name: string;
  segmentId: string;
  channel: string;
  messageTemplate: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLaunch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns/fire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name,
          segment_id: segmentId,
          channel,
          message_template: messageTemplate
        })
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to launch campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleLaunch} 
      loading={loading} 
      icon={loading ? <Clock size={16} /> : <Send size={16} />}
    >
      Launch Campaign
    </Button>
  );
}
