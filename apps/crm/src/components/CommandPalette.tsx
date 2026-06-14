"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Play, Users, Megaphone, Settings, Command, Mic, MicOff, Sparkles } from "lucide-react";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Agentic States
  const [actionProposal, setActionProposal] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [spokenMessage, setSpokenMessage] = useState("");

  const speak = (text: string) => {
    // The user requested to disable audio TTS, but we still want to display the message in the UI
    setSpokenMessage(text);
  };

  // Handle keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const isOpenRef = useRef(isOpen);
  
  // Reset state when closed, enable listening state when open
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setIsListening(true);
    } else {
      setSearch("");
      setIsListening(false);
      setProcessing(false);
      setActionProposal(null);
      setIsExecuting(false);
      setSpokenMessage("");
    }
  }, [isOpen]);

  const commands = [
    { id: 1, name: "Create new Workflow", action: () => router.push("/workflows") },
    { id: 2, name: "View Active Campaigns", action: () => router.push("/campaigns") },
    { id: 3, name: "Browse Customers", action: () => router.push("/customers") },
    { id: 4, name: "Pause all active campaigns", action: () => { alert("All campaigns paused."); setIsOpen(false); } },
    { id: 5, name: "Settings", action: () => router.push("/settings") },
  ];

  // Handle Speech Recognition (Continuous Background & Foreground)
  useEffect(() => {
    let recognition: any = null;
    let isIntentionallyStopped = false;

    if (typeof window !== "undefined" && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");

        if (!isOpenRef.current) {
          // BACKGROUND MODE: Looking for "Hey Aura"
          if (currentTranscript.toLowerCase().includes("hey aura") || currentTranscript.toLowerCase().includes("hey ora") || currentTranscript.toLowerCase().includes("hey laura")) {
            setIsOpen(true);
            setIsListening(true);
            setProcessing(false);
            
            // Extract anything said after the wake word
            const lowerTrans = currentTranscript.toLowerCase();
            const splitWord = lowerTrans.includes("hey aura") ? "hey aura" : (lowerTrans.includes("hey ora") ? "hey ora" : "hey laura");
            const match = lowerTrans.split(splitWord);
            const remainder = match[1]?.trim() || "";
            
            // We set search manually, then stop the recognition to clear its transcript buffer
            if (remainder) setSearch(remainder);
            try { recognition.stop(); } catch(e) {}
          }
        } else {
          // FOREGROUND MODE: User is talking to the open palette
          setSearch(currentTranscript);
        }
      };

      recognition.onend = () => {
        if (!isIntentionallyStopped) {
          // Auto-restart with a short delay to prevent rapid cycling
          setTimeout(() => {
            if (!isIntentionallyStopped) {
              try {
                recognition.start();
              } catch (e) {
                // Silently ignore — already running or can't restart
              }
            }
          }, 300);
        }
      };
      
      recognition.onerror = (event: any) => {
        // Suppress 'no-speech' — this is expected in continuous background listening
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          isIntentionallyStopped = true;
        }
        if (isOpenRef.current) {
          setIsListening(false);
        }
      };

      try {
        recognition.start();
      } catch (e) {
        console.error("Could not start speech recognition", e);
      }
    }

    return () => {
      isIntentionallyStopped = true;
      if (recognition) {
        try {
          recognition.stop();
        } catch(e) {}
      }
    };
  }, []);

  // Handle Enter Key for execution
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Enter" && !actionProposal && !isExecuting) {
        e.preventDefault();
        setProcessing(true);
        setTimeout(() => {
          executeVoiceCommand(search);
        }, 500);
      }
    };
    document.addEventListener("keydown", handleEnter);
    return () => document.removeEventListener("keydown", handleEnter);
  }, [isOpen, search, actionProposal, isExecuting]);

  const executeVoiceCommand = async (transcript: string) => {
    if (!transcript.trim()) {
      setIsOpen(false);
      return;
    }
    
    setProcessing(true);
    try {
      const res = await fetch("/api/ai/voice-agent/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript })
      });
      const data = await res.json();
      
      if (data.success && data.proposal) {
        // If it's just navigation or data querying, execute immediately
        if (data.proposal.action === "NAVIGATE" || data.proposal.action === "QUERY_DATA") {
          confirmAndExecute(data.proposal);
        } else {
          // Show confirmation card for CRUD operations
          setActionProposal(data.proposal);
          speak(`I am ready to ${data.proposal.action.replace("_", " ")}. Please confirm the details.`);
        }
      } else {
        speak("I'm sorry, I couldn't understand that command.");
        alert("Failed to parse intent.");
        setIsOpen(false);
      }
    } catch (e) {
      console.error(e);
      speak("There was a network error. Please try again.");
      setIsOpen(false);
    } finally {
      setProcessing(false);
    }
  };

  const confirmAndExecute = async (proposal: any) => {
    setIsExecuting(true);
    try {
      const res = await fetch("/api/ai/voice-agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: proposal.action, payload: proposal.payload })
      });
      const data = await res.json();
      
      if (data.success) {
        speak(data.message || "Action completed successfully.");
        if (data.route) {
          setTimeout(() => router.push(data.route), 1500);
        }
      } else {
        speak(data.error || "Failed to execute the action.");
        alert(data.error || "Failed to execute");
      }
    } catch (e) {
      console.error(e);
      speak("Execution failed due to a network error.");
      alert("Execution failed");
    } finally {
      setIsExecuting(false);
      if (proposal.action !== "QUERY_DATA") {
        setTimeout(() => setIsOpen(false), 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-24" onClick={() => setIsOpen(false)}>
      {/* Dimmed background overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in" />

      {/* Siri-like UI Container */}
      <div 
        className="relative z-10 flex flex-col items-center w-full max-w-2xl px-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Transcription or Confirmation Display */}
        {actionProposal ? (
          <div className="mb-12 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-2xl shadow-2xl animate-scale-in text-left">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-brand-purple" />
              Proposed Action: {actionProposal.action.replace("_", " ")}
            </h3>
            
            <div className="space-y-4">
              {Object.entries(actionProposal.payload).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-white/60 text-xs font-medium uppercase tracking-wider">{key.replace("_", " ")}</label>
                  <input 
                    type="text" 
                    value={String(value)}
                    onChange={(e) => setActionProposal({
                      ...actionProposal,
                      payload: { ...actionProposal.payload, [key]: e.target.value }
                    })}
                    className="bg-black/20 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-brand-purple transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => setActionProposal(null)}
                className="flex-1 py-3 rounded-lg bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
                disabled={isExecuting}
              >
                Cancel
              </button>
              <button 
                onClick={() => confirmAndExecute(actionProposal)}
                className="flex-1 py-3 rounded-lg bg-brand-purple text-white text-sm font-medium shadow-[0_0_15px_rgba(139,92,246,0.5)] hover:bg-[#7C3AED] transition-all flex justify-center items-center gap-2"
                disabled={isExecuting}
              >
                {isExecuting ? <Sparkles size={16} className="animate-spin-slow" /> : "Confirm & Execute"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-12 text-center animate-slide-up">
            <p className="text-display font-display text-white font-medium drop-shadow-lg tracking-tight leading-tight">
              {spokenMessage ? spokenMessage : (search || (isListening ? "Listening..." : (processing ? "Processing..." : "What can I help you with?")))}
            </p>
          </div>
        )}

        {/* The Siri Glowing Orb */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow rings */}
          <div className={`absolute w-32 h-32 rounded-full transition-all duration-700 ${isListening ? 'bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 blur-2xl animate-spin-slow opacity-80' : (processing ? 'bg-white blur-xl animate-pulse opacity-60' : 'bg-brand-purple blur-xl opacity-0')}`} />
          <div className={`absolute w-24 h-24 rounded-full transition-all duration-500 ${isListening ? 'bg-gradient-to-bl from-cyan-400 via-purple-500 to-red-500 blur-xl animate-pulse opacity-100' : 'opacity-0'}`} />
          
          {/* Core Orb */}
          <div className={`relative z-10 flex items-center justify-center rounded-full transition-all duration-300 ${isListening ? 'w-20 h-20 bg-black/40 backdrop-blur-md shadow-[inset_0_0_20px_rgba(255,255,255,0.3)]' : (processing ? 'w-16 h-16 bg-white/20 backdrop-blur-md' : 'w-12 h-12 bg-white/10 backdrop-blur-md')}`}>
            {processing ? (
              <Sparkles size={24} className="text-white animate-spin-slow" />
            ) : (
              <Mic size={isListening ? 28 : 20} className={`text-white transition-all ${isListening ? 'animate-pulse' : ''}`} />
            )}
          </div>
        </div>

        <p className="text-xs text-white/50 mt-8 font-medium tracking-widest uppercase">
          Press ENTER to send • Press ESC to cancel
        </p>
      </div>
    </div>
  );
}
