"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  User,
  ArrowRight,
  RefreshCw,
  Filter,
  Megaphone,
  X,
  MessageSquare
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: {
    type: "SEGMENT" | "CAMPAIGN";
    data: Record<string, unknown>;
  };
}

const STARTER_PROMPTS = [
  "Who are my most valuable customers that haven't bought recently?",
  "I want to win back dormant customers — what's the best approach?",
  "Help me create a campaign for my repeat buyers on WhatsApp",
  "Which customer segment should I focus on first?",
];

export default function CopilotWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm REACH, your AI marketing co-pilot 👋\n\nTell me about your customers, your goals, or what kind of campaign you're thinking about — and I'll help you target the right audience, craft the right message, and choose the right channel.\n\nWhat's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when messages change or widget opens
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages
            .filter((m) => m.role !== "assistant" || m !== messages[0]) // skip greeting from history
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message, action: data.action },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I hit an error. Please check your Groq API key configuration.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error. Make sure the dev server is running.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleActionClick = (action: Message["action"]) => {
    if (!action) return;
    setIsOpen(false); // Close widget when taking action to let user see the new page
    if (action.type === "CAMPAIGN") {
      const d = action.data as { name?: string; channel?: string; goal?: string };
      const params = new URLSearchParams({
        name: d.name || "",
        channel: d.channel || "EMAIL",
        goal: d.goal || "",
      });
      router.push(`/campaigns/new?${params.toString()}`);
    } else if (action.type === "SEGMENT") {
      router.push("/segments");
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hey! I'm REACH, your AI marketing co-pilot 👋\n\nTell me about your customers, your goals, or what kind of campaign you're thinking about — and I'll help you target the right audience, craft the right message, and choose the right channel.\n\nWhat's on your mind?",
      },
    ]);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 ${
          isOpen 
            ? 'bg-surface-panel text-text-primary rotate-90 scale-90 border border-border' 
            : 'bg-gradient-to-br from-brand-coral to-brand-blue text-white hover:scale-105 hover:shadow-brand-blue/30'
        }`}
        aria-label="Toggle REACH Co-Pilot"
      >
        {isOpen ? <X size={24} className="-rotate-90" /> : <Sparkles size={24} />}
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] bg-surface-canvas border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in origin-bottom-right">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-border bg-surface-card flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-coral to-brand-blue flex items-center justify-center shadow-md">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-body font-display font-bold text-text-primary leading-none">
                  REACH Co-Pilot
                </h3>
                <p className="text-[11px] text-text-secondary mt-1">
                  Powered by Groq
                </p>
              </div>
            </div>
            <button
              onClick={resetChat}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-panel rounded-lg transition-all"
              title="Reset conversation"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-canvas">
            {/* Starter prompts — only show when only greeting */}
            {messages.length === 1 && (
              <div className="flex flex-col gap-2 mb-4">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left p-3 bg-surface-card border border-border rounded-xl hover:border-brand-blue/40 hover:bg-brand-blue/5 transition-all text-small text-text-secondary hover:text-text-primary"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-1">
                  {msg.role === "assistant" ? (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-coral to-brand-blue flex items-center justify-center shadow-sm">
                      <Sparkles size={12} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-surface-panel border border-border flex items-center justify-center">
                      <User size={12} className="text-text-secondary" />
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`max-w-[85%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-brand-blue text-white rounded-tr-sm"
                        : "bg-surface-card border border-border text-text-primary rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Action Card */}
                  {msg.action && (
                    <button
                      onClick={() => handleActionClick(msg.action)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-brand-coral/30 hover:border-brand-coral hover:bg-brand-coral/5 rounded-xl text-brand-coral font-medium text-[12px] transition-all shadow-sm group w-full text-left leading-tight"
                    >
                      {msg.action.type === "SEGMENT" ? (
                        <Filter size={14} className="shrink-0" />
                      ) : (
                        <Megaphone size={14} className="shrink-0" />
                      )}
                      <span>
                        {msg.action.type === "SEGMENT"
                          ? "Open Segment Builder"
                          : "Create this Campaign"}
                      </span>
                      <ArrowRight
                        size={12}
                        className="ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform"
                      />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-coral to-brand-blue flex items-center justify-center shadow-sm shrink-0">
                  <Sparkles size={12} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-surface-card border border-border shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-brand-coral/60 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-brand-coral/60 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-brand-coral/60 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="shrink-0 p-4 bg-surface-card border-t border-border">
            <div className="flex gap-2 items-end bg-surface-canvas border border-border rounded-xl px-3 py-2 shadow-inner focus-within:border-brand-blue/50 focus-within:ring-1 focus-within:ring-brand-blue/20 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask REACH anything…"
                className="flex-1 resize-none bg-transparent text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none leading-relaxed py-1"
                disabled={loading}
                style={{ height: "24px" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="shrink-0 w-8 h-8 rounded-lg bg-brand-blue hover:bg-brand-blue/90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
          
        </div>
      )}
    </>
  );
}
