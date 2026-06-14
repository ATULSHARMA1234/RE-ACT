"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  Sparkles,
  Send,
  User,
  RefreshCw,
  ExternalLink,
  Loader2,
  Zap,
  MessageSquare,
  BarChart3,
  Users,
  Settings,
  Megaphone,
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
  { text: "How many customers do I have?", icon: Users, category: "Data" },
  { text: "Who are my top 5 highest-spending customers?", icon: BarChart3, category: "Analytics" },
  { text: "Create a win-back campaign for dormant users via WhatsApp", icon: Megaphone, category: "Campaigns" },
  { text: "What's the total revenue from orders?", icon: BarChart3, category: "Analytics" },
  { text: "Show me all at-risk high-value customers", icon: Users, category: "Segments" },
  { text: "Change dormant days threshold to 60", icon: Settings, category: "Settings" },
];

export default function AuraPage() {
  const router = useRouter();
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
          setTimeout(() => router.push(data.route), 1500);
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
          <li
            key={i}
            className="ml-4 list-disc text-small"
            dangerouslySetInnerHTML={{ __html: formatted.replace(/^[-•]\s*/, "") }}
          />
        );
      }
      if (formatted !== line) {
        return <p key={i} className="text-small" dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      return line ? (
        <p key={i} className="text-small">{line}</p>
      ) : (
        <div key={i} className="h-2" />
      );
    });
  };

  const showStarters = messages.length <= 1;

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-var(--topbar-height)-48px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-brand-coral flex items-center justify-center shadow-lg">
              <Sparkles size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-display font-display font-bold">Aura</h2>
              <p className="text-body text-text-secondary">Your intelligent CRM assistant — powered by AI</p>
            </div>
          </div>
          <button
            onClick={resetChat}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-card border border-border text-text-secondary hover:text-text-primary hover:border-[#8B5CF6]/40 transition-all text-small font-medium"
          >
            <RefreshCw size={14} />
            New Chat
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-surface-card border border-border rounded-2xl shadow-card overflow-hidden flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Starter Prompts Grid */}
            {showStarters && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Zap size={14} className="text-[#8B5CF6]" />
                  <span className="text-small font-semibold text-text-secondary uppercase tracking-wider">Quick Actions</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {STARTER_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt.text)}
                      className="text-left p-4 rounded-xl bg-surface-canvas border border-border/50 hover:border-[#8B5CF6]/40 hover:shadow-card transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <prompt.icon size={14} className="text-[#8B5CF6] opacity-60 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{prompt.category}</span>
                      </div>
                      <p className="text-small font-medium text-text-primary group-hover:text-[#8B5CF6] transition-colors leading-snug">
                        {prompt.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages List */}
            <div className="space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-brand-coral flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] rounded-2xl px-5 py-4 ${
                      msg.role === "user"
                        ? "bg-[#8B5CF6] text-white rounded-br-md"
                        : "bg-surface-canvas border border-border/50 text-text-primary rounded-bl-md"
                    }`}
                  >
                    <div className="space-y-1">{formatContent(msg.content)}</div>

                    {/* Route link */}
                    {msg.route && (
                      <button
                        onClick={() => router.push(msg.route!)}
                        className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#8B5CF6] bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-full px-3 py-1.5 hover:bg-[#8B5CF6]/10 transition-colors"
                      >
                        <ExternalLink size={11} /> Open Page
                      </button>
                    )}

                    {/* Action confirmation */}
                    {msg.action && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <p className="text-[11px] text-text-muted font-medium mb-2">
                          ⚡ Aura wants to execute: <strong className="text-text-primary">{msg.action.tool_name}</strong>
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmExecute(msg.action!)}
                            disabled={executing}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-green text-white text-[11px] font-bold hover:bg-brand-green/90 transition-colors disabled:opacity-50"
                          >
                            {executing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                            {executing ? "Running..." : "Confirm & Execute"}
                          </button>
                          <button
                            onClick={() =>
                              setMessages((prev) => [
                                ...prev,
                                { role: "assistant", content: "Alright, I won't execute that. What else can I help with?" },
                              ])
                            }
                            className="px-3 py-1.5 rounded-full bg-surface-panel text-text-secondary text-[11px] font-bold hover:text-text-primary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center shrink-0 mt-1">
                      <User size={14} className="text-[#8B5CF6]" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-brand-coral flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="bg-surface-canvas border border-border/50 rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-[#8B5CF6] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-[11px] text-text-muted font-medium ml-1">Aura is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input Bar */}
          <div className="px-6 py-4 border-t border-border bg-surface-card shrink-0">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Aura anything about your CRM..."
                  rows={1}
                  className="w-full resize-none rounded-xl bg-surface-canvas border border-border px-4 py-3 pr-12 text-body text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6]/50 outline-none transition-all"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
                <div className="absolute right-2 bottom-2 text-[10px] text-text-muted">
                  ⏎ Enter
                </div>
              </div>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-brand-coral flex items-center justify-center text-white shrink-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-lg"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
            <p className="text-[10px] text-text-muted mt-2 text-center">
              Aura uses Groq LLaMA to query live data, create campaigns, and manage your CRM.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
