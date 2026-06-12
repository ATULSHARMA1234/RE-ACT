"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Button from "@/components/Button";
import { Sparkles, Megaphone, CheckCircle2, ChevronRight, ChevronLeft, Send } from "lucide-react";

function NewCampaignPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [channels, setChannels] = useState<string[]>(["EMAIL"]);
  const [goal, setGoal] = useState("");
  const [message, setMessage] = useState("");

  // Auto-fill from search params
  useEffect(() => {
    const qGoal = searchParams.get("goal");
    const qChannel = searchParams.get("channel");
    const qName = searchParams.get("name");

    if (qGoal) setGoal(qGoal);
    if (qChannel) setChannels(qChannel.split(",").map(c => c.trim().toUpperCase()));
    if (qName) setName(qName);
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/segments")
      .then(r => r.json())
      .then(data => {
        if (data.segments) setSegments(data.segments);
      });
  }, []);

  const handleDraftAI = async () => {
    if (!segmentId || !goal || !channel) return;
    setLoading(true);
    try {
      const selectedSeg = segments.find(s => s.id === segmentId);
      const res = await fetch("/api/campaigns/draft", {
        method: "POST",
        body: JSON.stringify({
          campaignGoal: goal,
          audienceDescription: selectedSeg?.name || "Selected Segment",
          channel: channels.join(", ")
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.draft);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFire = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns/fire", {
        method: "POST",
        body: JSON.stringify({
          name,
          segment_id: segmentId,
          channel: channels.join(", "),
          message_template: message
        })
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/campaigns/${data.campaign_id}`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-brand-blue text-white' : 'bg-surface-panel text-text-muted'}`}>1</div>
            <span className={`font-medium ${step >= 1 ? 'text-text-primary' : 'text-text-muted'}`}>Audience</span>
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-brand-blue text-white' : 'bg-surface-panel text-text-muted'}`}>2</div>
            <span className={`font-medium ${step >= 2 ? 'text-text-primary' : 'text-text-muted'}`}>Message</span>
          </div>
          <div className="h-px bg-border flex-1" />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-brand-blue text-white' : 'bg-surface-panel text-text-muted'}`}>3</div>
            <span className={`font-medium ${step >= 3 ? 'text-text-primary' : 'text-text-muted'}`}>Review</span>
          </div>
        </div>

        <div className="bg-surface-card border border-border rounded-lg shadow-card p-8">
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-small font-semibold text-text-secondary uppercase mb-2">Campaign Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  placeholder="e.g. Summer VIP Sale"
                />
              </div>

              <div>
                <label className="block text-small font-semibold text-text-secondary uppercase mb-2">Select Segment</label>
                {segments.length === 0 ? (
                  <div className="p-4 bg-surface-panel rounded-lg text-body text-text-secondary">
                    No segments found. Go to Segments page to create one.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {segments.map(seg => (
                      <label key={seg.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${segmentId === seg.id ? 'border-brand-blue bg-brand-blue/5' : 'border-border hover:bg-surface-panel'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="radio" 
                            name="segment" 
                            value={seg.id} 
                            checked={segmentId === seg.id}
                            onChange={() => setSegmentId(seg.id)}
                            className="w-4 h-4 text-brand-blue focus:ring-brand-blue"
                          />
                          <span className="font-medium">{seg.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} disabled={!name || !segmentId} icon={<ChevronRight size={16} />}>Next Step</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <label className="block text-small font-semibold text-text-secondary uppercase mb-2">Channel</label>
                <div className="flex gap-4">
                  {['EMAIL', 'WHATSAPP', 'SMS'].map(ch => (
                    <button
                      key={ch}
                      onClick={() => {
                        if (channels.includes(ch)) {
                          if (channels.length > 1) {
                            setChannels(channels.filter(c => c !== ch));
                          }
                        } else {
                          setChannels([...channels, ch]);
                        }
                      }}
                      className={`flex-1 py-3 border rounded-lg font-medium transition-colors ${channels.includes(ch) ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-border hover:bg-surface-panel text-text-secondary'}`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-brand-coral-light border border-brand-coral-border rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4 text-brand-coral-text">
                  <Sparkles size={20} />
                  <h3 className="font-semibold">Draft with AI</h3>
                </div>
                <textarea
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  placeholder="Describe the goal of your campaign (e.g. Announce a 20% off summer sale for loyal customers)..."
                  className="w-full h-24 p-3 rounded border border-brand-coral-border focus:outline-none mb-3 resize-none"
                />
                <Button variant="ai" onClick={handleDraftAI} loading={loading} icon={<Sparkles size={16} />}>
                  Generate Draft
                </Button>
              </div>

              <div>
                <label className="block text-small font-semibold text-text-secondary uppercase mb-2">Message Content</label>
                <p className="text-small text-text-muted mb-2">Available tokens: {"{{first_name}}, {{last_product}}, {{days_since_purchase}}"}</p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full h-40 p-4 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                  placeholder="Your message content here..."
                />
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setStep(1)} icon={<ChevronLeft size={16} />}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={!message} icon={<ChevronRight size={16} />}>Next Step</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-surface-panel rounded-lg p-6 space-y-4">
                <h3 className="text-h2 font-display font-semibold mb-4">Review Campaign</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-text-secondary">Name</div>
                  <div className="col-span-2 font-medium">{name}</div>
                  
                  <div className="text-text-secondary">Segment</div>
                  <div className="col-span-2 font-medium">{segments.find(s => s.id === segmentId)?.name}</div>
                  
                  <div className="text-text-secondary">Channel</div>
                  <div className="col-span-2 font-medium">{channels.join(", ")}</div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="text-text-secondary mb-2">Message</div>
                  <div className="p-4 bg-white border border-border rounded whitespace-pre-wrap">
                    {message}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setStep(2)} icon={<ChevronLeft size={16} />}>Back</Button>
                <Button onClick={handleFire} loading={loading} icon={<Send size={16} />}>Fire Campaign</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 rounded-full border-2 border-brand-coral/30 border-t-brand-coral animate-spin" />
        </div>
      </AppShell>
    }>
      <NewCampaignPageContent />
    </Suspense>
  );
}
