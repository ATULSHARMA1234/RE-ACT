"use client";

import { useState } from "react";
import { Play, Clock, MessageCircle, ArrowDown, Trash2, Plus, X } from "lucide-react";
import Button from "../Button";

export type NodeType = "trigger" | "delay" | "message";

export interface WorkflowNode {
  id: string;
  type: NodeType;
  config: Record<string, string>;
}

export default function WorkflowNodeBuilder() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: "1", type: "trigger", config: { condition: "Cart Abandoned", value: "Value > $50" } },
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("1");

  const addNode = (type: NodeType) => {
    const newNode: WorkflowNode = {
      id: Math.random().toString(36).substring(7),
      type,
      config: type === "message" ? { content: "Hey {{name}}, check this out!" } : type === "delay" ? { time: "2 Hours" } : { condition: "New Event" }
    };
    setNodes([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const removeNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes(nodes.filter(n => n.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const updateNodeConfig = (key: string, value: string) => {
    if (!selectedNodeId) return;
    setNodes(nodes.map(n => {
      if (n.id === selectedNodeId) {
        return { ...n, config: { ...n.config, [key]: value } };
      }
      return n;
    }));
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="bg-surface-card border border-border rounded-xl shadow-card h-[600px] flex overflow-hidden">
      
      {/* Sidebar Tools */}
      <div className="w-64 border-r border-border bg-surface-panel/30 p-4 flex flex-col gap-4">
        <h3 className="text-small font-semibold uppercase tracking-wider text-text-secondary mb-2">Available Nodes</h3>
        
        <button 
          onClick={() => addNode("trigger")}
          className="bg-white border border-border rounded-lg p-3 flex items-center gap-3 hover:border-brand-blue hover:shadow-card transition-all text-left"
        >
          <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
            <Play size={16} />
          </div>
          <div>
            <span className="text-small font-semibold text-text-primary block">Trigger</span>
            <span className="text-[10px] text-text-secondary">Start a flow</span>
          </div>
        </button>
        
        <button 
          onClick={() => addNode("delay")}
          className="bg-white border border-border rounded-lg p-3 flex items-center gap-3 hover:border-brand-coral hover:shadow-card transition-all text-left"
        >
          <div className="w-8 h-8 rounded-full bg-brand-coral/10 text-brand-coral flex items-center justify-center shrink-0">
            <Clock size={16} />
          </div>
          <div>
            <span className="text-small font-semibold text-text-primary block">Time Delay</span>
            <span className="text-[10px] text-text-secondary">Wait before next</span>
          </div>
        </button>

        <button 
          onClick={() => addNode("message")}
          className="bg-white border border-border rounded-lg p-3 flex items-center gap-3 hover:border-brand-green hover:shadow-card transition-all text-left"
        >
          <div className="w-8 h-8 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
            <MessageCircle size={16} />
          </div>
          <div>
            <span className="text-small font-semibold text-text-primary block">Send Message</span>
            <span className="text-[10px] text-text-secondary">SMS or Email</span>
          </div>
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-[#F8FAFC] relative overflow-y-auto flex flex-col items-center pt-12 pb-24">
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, #CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        <div className="relative z-10 flex flex-col items-center w-full max-w-md">
          {nodes.length === 0 ? (
            <div className="text-center p-12 bg-white/50 border border-border border-dashed rounded-xl w-full">
              <Play size={32} className="mx-auto text-text-muted mb-4" />
              <p className="text-body font-medium text-text-primary">Workflow is empty</p>
              <p className="text-small text-text-secondary mt-1">Add a trigger node to get started.</p>
            </div>
          ) : (
            nodes.map((node, index) => {
              const isSelected = selectedNodeId === node.id;
              return (
                <div key={node.id} className="flex flex-col items-center w-full">
                  
                  {/* Node Card */}
                  <div 
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`bg-white border-2 rounded-xl p-4 w-full shadow-sm relative transition-all cursor-pointer ${
                      isSelected 
                        ? node.type === "trigger" ? "border-brand-blue shadow-card-hover" 
                        : node.type === "delay" ? "border-brand-coral shadow-card-hover" 
                        : "border-brand-green shadow-card-hover"
                        : "border-border hover:border-text-muted"
                    }`}
                  >
                    {/* Delete Button */}
                    <button 
                      onClick={(e) => removeNode(node.id, e)}
                      className="absolute -right-3 -top-3 w-6 h-6 bg-white border border-border rounded-full flex items-center justify-center text-text-muted hover:text-status-danger hover:border-status-danger transition-colors shadow-sm z-20"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        node.type === "trigger" ? "bg-brand-blue/10 text-brand-blue" :
                        node.type === "delay" ? "bg-brand-coral/10 text-brand-coral" :
                        "bg-brand-green/10 text-brand-green"
                      }`}>
                        {node.type === "trigger" && <Play size={16} />}
                        {node.type === "delay" && <Clock size={16} />}
                        {node.type === "message" && <MessageCircle size={16} />}
                      </div>
                      <span className="font-semibold text-body capitalize">
                        {node.type}: {node.config.condition || node.config.time || "Send SMS"}
                      </span>
                    </div>

                    {/* Content Preview */}
                    {node.type === "trigger" && node.config.value && (
                      <p className="text-small text-text-secondary pl-11">{node.config.value}</p>
                    )}
                    {node.type === "message" && node.config.content && (
                      <p className="text-small text-text-secondary pl-11 border border-border/50 bg-surface-panel/30 p-2 rounded-md mt-2 italic line-clamp-2">
                        "{node.config.content}"
                      </p>
                    )}
                  </div>

                  {/* Arrow to Next Node */}
                  {index < nodes.length - 1 && (
                    <ArrowDown size={24} className="text-text-muted my-3" />
                  )}
                </div>
              );
            })
          )}

          {nodes.length > 0 && (
            <div className="mt-8 flex flex-col items-center">
               <ArrowDown size={24} className="text-text-muted mb-3" />
               <div className="w-12 h-12 rounded-full bg-white border border-border border-dashed shadow-sm flex items-center justify-center text-text-muted">
                 <span className="w-2 h-2 rounded-full bg-text-muted"></span>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {selectedNode && (
        <div className="w-80 border-l border-border bg-white p-6 flex flex-col gap-6 overflow-y-auto z-20 shadow-drawer">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="text-h2 font-display font-semibold capitalize">{selectedNode.type} Settings</h3>
            <button onClick={() => setSelectedNodeId(null)} className="text-text-muted hover:text-text-primary">
              <X size={20} />
            </button>
          </div>

          {selectedNode.type === "trigger" && (
            <>
              <div className="space-y-2">
                <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Event Source</label>
                <select 
                  className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-blue outline-none bg-surface-canvas"
                  value={selectedNode.config.condition || ""}
                  onChange={(e) => updateNodeConfig("condition", e.target.value)}
                >
                  <option>Cart Abandoned</option>
                  <option>Joined Segment</option>
                  <option>Order Placed</option>
                  <option>Custom Event</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Condition (Optional)</label>
                <input 
                  type="text"
                  placeholder="e.g. Value > $50"
                  className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-blue outline-none"
                  value={selectedNode.config.value || ""}
                  onChange={(e) => updateNodeConfig("value", e.target.value)}
                />
              </div>
            </>
          )}

          {selectedNode.type === "delay" && (
            <div className="space-y-2">
              <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Wait Time</label>
              <input 
                type="text"
                placeholder="e.g. 2 Hours, 1 Day"
                className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-coral outline-none"
                value={selectedNode.config.time || ""}
                onChange={(e) => updateNodeConfig("time", e.target.value)}
              />
            </div>
          )}

          {selectedNode.type === "message" && (
            <div className="space-y-2 flex-1 flex flex-col">
              <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Message Content</label>
              <textarea 
                className="w-full p-3 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-green outline-none flex-1 resize-none"
                value={selectedNode.config.content || ""}
                onChange={(e) => updateNodeConfig("content", e.target.value)}
                placeholder="Type your message here. Use {{name}} for variables."
              />
              <p className="text-[10px] text-text-muted mt-2">
                AI Variables supported: {`{{name}}`}, {`{{last_item}}`}, {`{{discount_code}}`}
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
