"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Send,
  User,
  ArrowRight,
  RefreshCw,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface Action {
  type: string;
  tool_name: string;
  data: any;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  route?: string;
  action?: Action;
}

const STARTER_PROMPTS = [
  "How many customers do I have and what's their distribution?",
  "Who are my top 5 highest-spending customers?",
  "Create a win-back campaign for dormant users via WhatsApp",
  "What's the total revenue from orders?",
  "Show me all at-risk high-value customers",
  "Change dormant days threshold to 60",
];

export default function CopilotWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm Aura, your intelligent beauty CRM assistant ✨\n\nI can query your real customer data, create campaigns, update settings, or analyze your CRM — all through natural language.\n\nTry asking me anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
            .filter((_, i) => i !== 0)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            route: data.route,
            action: data.action,
          },
        ]);

        if (data.route) {
          setTimeout(() => router.push(data.route), 500);
        }

        // Refresh for read-only queries that might have displayed data
        if (!data.action) {
          router.refresh();
          window.dispatchEvent(new Event("crm-data-updated"));
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.error || "Sorry, I hit an error. Please try again.",
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

  const handleConfirmExecute = async (action: Action) => {
    setExecuting(true);
    try {
      const res = await fetch("/api/ai/execute-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_name: action.tool_name, payload: action.data }),
      });
      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ ${data.message || "Action completed successfully!"}`,
          },
        ]);
        if (data.route) {
          setTimeout(() => {
            setIsOpen(false);
            router.push(data.route);
          }, 1500);
        } else {
          router.refresh();
          window.dispatchEvent(new Event("crm-data-updated"));
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `❌ ${data.error || "Failed to execute."}`,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Execution failed due to a network error." },
      ]);
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Hey! I'm Aura, your intelligent beauty CRM assistant ✨\n\nI can query your real customer data, create campaigns, update settings, or analyze your CRM — all through natural language.\n\nTry asking me anything!",
      },
    ]);
  };

  const formatContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      if (line.startsWith("- ") || line.startsWith("• ")) {
        return (
          <div key={i} className="flex gap-2 ml-1">
            <span className="text-brand-coral shrink-0">•</span>
            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, '') }} />
          </div>
        );
      }

      const numMatch = line.match(/^(\d+)\.\s/);
      if (numMatch) {
        return (
          <div key={i} className="flex gap-2 ml-1">
            <span className="text-brand-blue font-bold shrink-0">{numMatch[1]}.</span>
            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^\d+\.\s*/, '') }} />
          </div>
        );
      }

      if (!line.trim()) return <div key={i} className="h-2" />;

      return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  const renderActionCard = (action: Action) => {
    return (
      <div className="bg-white border border-brand-coral/30 rounded-xl p-3 shadow-sm w-full mt-2">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-brand-coral" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
            Proposed Action
          </span>
        </div>
        <div className="bg-surface-canvas rounded-lg p-3 border border-border mb-3 text-[12px] text-text-primary">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
            <span className="font-semibold capitalize text-brand-blue">
              {(action.tool_name || "").replace(/_/g, " ")}
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(action.data || {}).map(([k, v]) => {
              let displayValue = String(v);
              let displayKey = k.replace(/_/g, " ");

              if (k === "args" && typeof v === "string") {
                displayKey = "Details";
                try {
                  let cleanArgs = v.trim().replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/, "").trim();
                  let parsed;
                  try {
                    parsed = JSON.parse(cleanArgs);
                  } catch (e) {
                    parsed = new Function("return " + cleanArgs)();
                  }
                  
                  const payload = parsed.data || parsed.where || parsed;
                  displayValue = Object.entries(payload)
                    .map(([pk, pv]) => `${pk.replace(/_/g, " ")}: ${JSON.stringify(pv)}`)
                    .join(", ");
                } catch {}
              }

              return (
                <div key={k} className="flex justify-between items-start gap-4">
                  <span className="text-text-secondary capitalize shrink-0">{displayKey}:</span>
                  <span className="text-text-primary font-medium text-right truncate" title={displayValue}>
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => handleConfirmExecute(action)}
          disabled={executing}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-brand-coral text-white hover:bg-[#ff5d4b] disabled:opacity-60 rounded-lg text-[12px] font-bold transition-all shadow-sm"
        >
          {executing ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Executing…
            </>
          ) : (
            <>
              Confirm & Execute <ArrowRight size={12} />
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 group">
        <div
          className={`
          transition-all duration-300 pointer-events-none
          bg-surface-card border border-border text-text-primary px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest shadow-sm
          flex items-center gap-1.5
          ${isOpen ? "opacity-0 translate-x-4 scale-95" : "opacity-100 translate-x-0 scale-100"}
        `}
        >
          ASK AURA <ArrowRight size={12} strokeWidth={2.5} />
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 ${
            isOpen
              ? "w-14 h-14 rounded-full bg-surface-panel text-text-primary rotate-90 scale-90 border border-border"
              : "w-14 h-14 bg-transparent border-none outline-none"
          }`}
          aria-label="Toggle Aura Assistant"
        >
          {isOpen ? (
            <X size={24} className="-rotate-90" />
          ) : (
            <span
              className="text-[42px] leading-none select-none drop-shadow-2xl filter"
              style={{ filter: "drop-shadow(0 10px 15px rgba(0,0,0,0.2))" }}
              role="img"
              aria-label="Lipstick"
            >
              💄
            </span>
          )}
        </button>
      </div>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[420px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] bg-surface-canvas border border-border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in origin-bottom-right">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border bg-surface-card flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-coral to-brand-blue flex items-center justify-center shadow-md">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-body font-display font-bold text-text-primary leading-none">
                  Aura
                </h3>
                <p className="text-[11px] text-text-secondary mt-1">Natural Language • Live Data</p>
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

                <div
                  className={`max-w-[85%] space-y-1 ${
                    msg.role === "user" ? "items-end" : "items-start"
                  } flex flex-col`}
                >
                  <div
                    className={`px-3 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-brand-blue text-white rounded-tr-sm"
                        : "bg-surface-card border border-border text-text-primary rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? formatContent(msg.content) : msg.content}
                  </div>

                  {/* Action Card — Confirm & Execute */}
                  {msg.action && renderActionCard(msg.action)}

                  {/* Navigation link */}
                  {msg.route && !msg.action && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        router.push(msg.route!);
                      }}
                      className="flex items-center gap-2 px-3 py-2 bg-brand-blue/5 border border-brand-blue/20 hover:border-brand-blue/40 rounded-xl text-brand-blue font-medium text-[12px] transition-all w-full mt-2"
                    >
                      <ExternalLink size={14} />
                      Go to page
                      <ArrowRight size={12} className="ml-auto" />
                    </button>
                  )}
                </div>
              </div>
            ))}

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
                placeholder="Ask anything in natural language…"
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
