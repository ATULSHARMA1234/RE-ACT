"use client";

import { useState, useCallback, useRef, DragEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Play, Clock, MessageCircle, Trash2, X, Save, Split, Tag, ArrowLeft, Sparkles } from "lucide-react";
import Button from "@/components/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Custom Nodes
import TriggerNode from "@/components/workflows/nodes/TriggerNode";
import ActionNode from "@/components/workflows/nodes/ActionNode";
import SplitNode from "@/components/workflows/nodes/SplitNode";
import DelayNode from "@/components/workflows/nodes/DelayNode";
import MessageNode from "@/components/workflows/nodes/MessageNode";

const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
  splitNode: SplitNode,
  delayNode: DelayNode,
  messageNode: MessageNode,
};

let id = 0;
const getId = () => `dndnode_${id++}`;

function DnDFlow({ initialWorkflow, segments, name, setName, status, setStatus, isSaving, setIsSaving }: any) {
  const router = useRouter();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Convert legacy array format to React Flow format if necessary
  let initialNodes: Node[] = [];
  let initialEdges: Edge[] = [];
  
  if (initialWorkflow.nodes_json && !Array.isArray(initialWorkflow.nodes_json)) {
    // If it's the new format { nodes: [], edges: [] }
    initialNodes = initialWorkflow.nodes_json.nodes || [];
    initialEdges = initialWorkflow.nodes_json.edges || [];
  } else {
    // Legacy format or empty - just start fresh with a trigger node
    initialNodes = [
      {
        id: "trigger_1",
        type: "triggerNode",
        position: { x: 250, y: 50 },
        data: {
          originalType: "trigger",
          config: { condition: "Cart Abandoned", value: "Value > $50" },
        },
      },
    ];
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Map sidebar type to Custom Node type
      let nodeType = 'actionNode';
      if (type === 'trigger') nodeType = 'triggerNode';
      else if (type === 'split') nodeType = 'splitNode';
      else if (type === 'delay') nodeType = 'delayNode';
      else if (type === 'message') nodeType = 'messageNode';

      const newNode: Node = {
        id: getId(),
        type: nodeType,
        position,
        data: { 
          originalType: type,
          config: type === "message" ? { content: "Hey {{name}}, check this out!", channel: "EMAIL", segment_id: "" } 
          : type === "delay" ? { time: "2 Hours" } 
          : type === "split" ? { split_type: "A/B Test", percentage: "50" }
          : type === "action" ? { tag_name: "VIP" }
          : { condition: "New Event" }
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  const updateSelectedNodeConfig = (key: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              config: {
                ...n.data.config,
                [key]: value,
              },
            },
          };
        }
        return n;
      })
    );
  };

  // AI Workflow Generator State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingWorkflow, setIsGeneratingWorkflow] = useState(false);

  const generateWorkflow = async () => {
    if (!aiPrompt) return;
    setIsGeneratingWorkflow(true);
    try {
      const res = await fetch('/api/ai/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.success && data.workflow) {
        setNodes(data.workflow.nodes || []);
        setEdges(data.workflow.edges || []);
        toast.success("Workflow generated successfully!");
        setAiPrompt("");
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch (e) {
      toast.error("Generation failed");
    }
    setIsGeneratingWorkflow(false);
  };

  // AI Message Drafter State
  const [draftPrompt, setDraftPrompt] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  const generateDraft = async () => {
    if (!selectedNodeId || !draftPrompt) return;
    setIsDrafting(true);
    try {
      const channel = selectedNode?.data?.config?.channel || "EMAIL";
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignGoal: draftPrompt, channel })
      });
      const data = await res.json();
      if (data.success && data.message) {
        updateSelectedNodeConfig("content", data.message);
        toast.success("Message copy generated!");
        setDraftPrompt("");
      } else {
        toast.error(data.error || "Draft failed");
      }
    } catch (e) {
      toast.error("Draft failed");
    }
    setIsDrafting(false);
  };

  const saveWorkflow = async () => {
    setIsSaving(true);
    try {
      const payload = {
        nodes,
        edges,
      };
      await fetch(`/api/workflows/${initialWorkflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, nodes_json: payload, status }),
      });
      toast.success("Workflow saved successfully!");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save workflow");
    }
    setIsSaving(false);
  };

  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link href="/workflows" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-card border border-border shadow-sm hover:bg-surface-panel transition-colors">
            <ArrowLeft size={18} className="text-text-secondary" />
          </Link>
          <input 
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)}
            className="text-display font-display font-bold text-text-primary tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-text-muted w-[300px]"
            placeholder="Workflow Name"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`px-3 py-1.5 rounded-full text-small font-semibold border outline-none cursor-pointer transition-colors ${
              status === 'ACTIVE' 
                ? 'bg-[#E6F4EA] text-[#1E8E3E] border-[#1E8E3E]/30 hover:bg-[#DCECE0]' 
                : 'bg-surface-panel text-text-secondary border-border hover:bg-surface-panel/80'
            }`}
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push('/workflows')}>Cancel</Button>
          <Button className="flex items-center gap-2" onClick={saveWorkflow} disabled={isSaving}>
            <Save size={16} /> {isSaving ? "Saving..." : "Save Workflow"}
          </Button>
        </div>
      </div>

      <div className="bg-surface-card border border-border rounded-xl shadow-card flex-1 flex overflow-hidden">
        {/* Sidebar Tools */}
        <div className="w-64 border-r border-border bg-surface-panel/30 p-4 flex flex-col gap-3 overflow-y-auto z-10">
          <h3 className="text-small font-semibold uppercase tracking-wider text-text-secondary mb-1">Drag Nodes</h3>
          
          <div onDragStart={(event) => onDragStart(event, 'trigger')} draggable className="bg-white border border-border rounded-lg p-3 flex items-center gap-3 hover:border-brand-blue hover:shadow-card transition-all cursor-grab text-left">
            <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
              <Play size={16} />
            </div>
            <div>
              <span className="text-small font-semibold text-text-primary block">Trigger</span>
              <span className="text-[10px] text-text-secondary">Start a flow</span>
            </div>
          </div>
          
          <div onDragStart={(event) => onDragStart(event, 'delay')} draggable className="bg-white border border-border rounded-lg p-3 flex items-center gap-3 hover:border-brand-coral hover:shadow-card transition-all cursor-grab text-left">
            <div className="w-8 h-8 rounded-full bg-brand-coral/10 text-brand-coral flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <span className="text-small font-semibold text-text-primary block">Time Delay</span>
              <span className="text-[10px] text-text-secondary">Wait before next</span>
            </div>
          </div>

          <div onDragStart={(event) => onDragStart(event, 'split')} draggable className="bg-white border border-border rounded-lg p-3 flex items-center gap-3 hover:border-brand-amber hover:shadow-card transition-all cursor-grab text-left">
            <div className="w-8 h-8 rounded-full bg-brand-amber/10 text-brand-amber flex items-center justify-center shrink-0">
              <Split size={16} />
            </div>
            <div>
              <span className="text-small font-semibold text-text-primary block">Branch / Split</span>
              <span className="text-[10px] text-text-secondary">A/B Test or Logic</span>
            </div>
          </div>

          <h3 className="text-small font-semibold uppercase tracking-wider text-text-secondary mt-4 mb-1">Actions</h3>

          <div onDragStart={(event) => onDragStart(event, 'message')} draggable className="bg-white border border-border rounded-lg p-3 flex items-center gap-3 hover:border-brand-green hover:shadow-card transition-all cursor-grab text-left">
            <div className="w-8 h-8 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
              <MessageCircle size={16} />
            </div>
            <div>
              <span className="text-small font-semibold text-text-primary block">Send Message</span>
              <span className="text-[10px] text-text-secondary">SMS, WhatsApp, Email</span>
            </div>
          </div>

          <div onDragStart={(event) => onDragStart(event, 'action')} draggable className="bg-white border border-border rounded-lg p-3 flex items-center gap-3 hover:border-[#6D28D9] hover:shadow-card transition-all cursor-grab text-left">
            <div className="w-8 h-8 rounded-full bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center shrink-0">
              <Tag size={16} />
            </div>
            <div>
              <span className="text-small font-semibold text-text-primary block">Customer Action</span>
              <span className="text-[10px] text-text-secondary">Tag or update profile</span>
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          
          {/* AI Workflow Generator Prompt Bar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[600px] bg-white rounded-full shadow-lg border border-[#8B5CF6]/30 p-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-[#8B5CF6]" />
            </div>
            <input 
              type="text" 
              placeholder="Describe a workflow to generate... (e.g. VIP Abandoned Cart with A/B testing)" 
              className="flex-1 bg-transparent border-none focus:outline-none text-body"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateWorkflow()}
              disabled={isGeneratingWorkflow}
            />
            <Button 
              className="rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white border-none py-1.5 px-4 h-auto" 
              onClick={generateWorkflow} 
              disabled={isGeneratingWorkflow || !aiPrompt}
            >
              {isGeneratingWorkflow ? "Generating..." : "Generate ✨"}
            </Button>
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-[#F8FAFC]"
          >
            <Background color="#CBD5E1" gap={24} size={1} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Settings Panel */}
        {selectedNode && (
          <div className="w-80 border-l border-border bg-white p-6 flex flex-col gap-6 overflow-y-auto z-20 shadow-drawer">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-h2 font-display font-semibold capitalize">{selectedNode.data.originalType} Settings</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
                  setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
                  setSelectedNodeId(null);
                }} className="text-text-muted hover:text-status-danger p-1">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelectedNodeId(null)} className="text-text-muted hover:text-text-primary p-1">
                  <X size={20} />
                </button>
              </div>
            </div>

            {selectedNode.data.originalType === "trigger" && (
              <>
                <div className="space-y-2">
                  <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Event Source</label>
                  <select 
                    className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-blue outline-none bg-surface-canvas"
                    value={selectedNode.data.config.condition || ""}
                    onChange={(e) => updateSelectedNodeConfig("condition", e.target.value)}
                  >
                    <option>Order Placed</option>
                    <option>Added to Cart</option>
                    <option>Removed from Cart</option>
                    <option>Cart Abandoned</option>
                    <option>Checkout Started</option>
                    <option>Page Viewed</option>
                    <option>Added to Wishlist</option>
                    <option>Order Cancelled</option>
                    <option>Review Submitted</option>
                    <option>Coupon Applied</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Condition (Optional)</label>
                  <input 
                    type="text"
                    placeholder="e.g. Value > $50"
                    className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-blue outline-none"
                    value={selectedNode.data.config.value || ""}
                    onChange={(e) => updateSelectedNodeConfig("value", e.target.value)}
                  />
                </div>
              </>
            )}

            {selectedNode.data.originalType === "delay" && (
              <div className="space-y-2">
                <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Wait Time</label>
                <input 
                  type="text"
                  placeholder="e.g. 2 Hours, 1 Day"
                  className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-coral outline-none"
                  value={selectedNode.data.config.time || ""}
                  onChange={(e) => updateSelectedNodeConfig("time", e.target.value)}
                />
              </div>
            )}

            {selectedNode.data.originalType === "split" && (
              <>
                <div className="space-y-2">
                  <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Split Strategy</label>
                  <select 
                    className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-amber outline-none bg-surface-canvas"
                    value={selectedNode.data.config.split_type || ""}
                    onChange={(e) => updateSelectedNodeConfig("split_type", e.target.value)}
                  >
                    <option>A/B Test (Random)</option>
                    <option>Check Segment</option>
                  </select>
                </div>
                {selectedNode.data.config.split_type === "A/B Test (Random)" ? (
                  <div className="space-y-2">
                    <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Path A Percentage</label>
                    <input 
                      type="range"
                      min="1" max="99"
                      className="w-full accent-brand-amber"
                      value={selectedNode.data.config.percentage || 50}
                      onChange={(e) => updateSelectedNodeConfig("percentage", e.target.value)}
                    />
                    <div className="flex justify-between text-small text-text-muted">
                      <span>{selectedNode.data.config.percentage || 50}%</span>
                      <span>{100 - Number(selectedNode.data.config.percentage || 50)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Select Segment</label>
                    <select 
                      className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-amber outline-none bg-surface-canvas"
                      value={selectedNode.data.config.condition_segment_id || ""}
                      onChange={(e) => updateSelectedNodeConfig("condition_segment_id", e.target.value)}
                    >
                      <option value="">-- Choose Segment --</option>
                      {segments.map((seg: any) => (
                        <option key={seg.id} value={seg.id}>{seg.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {selectedNode.data.originalType === "action" && (
              <div className="space-y-2">
                <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Tag Name</label>
                <input 
                  type="text"
                  placeholder="e.g. VIP, At Risk"
                  className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-[#6D28D9] outline-none"
                  value={selectedNode.data.config.tag_name || ""}
                  onChange={(e) => updateSelectedNodeConfig("tag_name", e.target.value)}
                />
              </div>
            )}

            {selectedNode.data.originalType === "message" && (
              <>
                <div className="space-y-2">
                  <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Channel</label>
                  <select 
                    className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-green outline-none bg-surface-canvas"
                    value={selectedNode.data.config.channel || "EMAIL"}
                    onChange={(e) => updateSelectedNodeConfig("channel", e.target.value)}
                  >
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Filter by Segment (Optional)</label>
                  <select 
                    className="w-full p-2 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-green outline-none bg-surface-canvas"
                    value={selectedNode.data.config.segment_id || ""}
                    onChange={(e) => updateSelectedNodeConfig("segment_id", e.target.value)}
                  >
                    <option value="">Send to everyone in flow</option>
                    {segments.map((seg: any) => (
                      <option key={seg.id} value={seg.id}>{seg.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-small font-semibold text-text-secondary uppercase tracking-wider">Message Content</label>
                  
                  {/* AI Copywriter Inline Tool */}
                  <div className="bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-lg p-3 space-y-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#8B5CF6]" />
                      <span className="text-small font-semibold text-[#8B5CF6]">AI Copywriter</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. Write a 10% off welcome email" 
                        className="flex-1 p-2 text-xs border border-border rounded-md outline-none focus:border-[#8B5CF6] bg-white"
                        value={draftPrompt}
                        onChange={(e) => setDraftPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && generateDraft()}
                      />
                      <Button size="sm" variant="outline" className="text-[#8B5CF6] border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/10" onClick={generateDraft} disabled={isDrafting || !draftPrompt}>
                        {isDrafting ? "..." : "Draft"}
                      </Button>
                    </div>
                  </div>

                  <textarea 
                    className="w-full p-3 border border-border rounded-md text-body focus:ring-2 focus:ring-brand-green outline-none flex-1 min-h-[150px] resize-none"
                    value={selectedNode.data.config.content || ""}
                    onChange={(e) => updateSelectedNodeConfig("content", e.target.value)}
                    placeholder="Type your message here. Use {{name}} for variables."
                  />
                  <p className="text-[10px] text-text-muted mt-2">
                    AI Variables supported: {`{{name}}`}, {`{{last_item}}`}, {`{{discount_code}}`}
                  </p>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkflowEditorClient(props: any) {
  const [name, setName] = useState(props.initialWorkflow.name);
  const [status, setStatus] = useState(props.initialWorkflow.status || "DRAFT");
  const [isSaving, setIsSaving] = useState(false);

  return (
    <ReactFlowProvider>
      <DnDFlow {...props} name={name} setName={setName} status={status} setStatus={setStatus} isSaving={isSaving} setIsSaving={setIsSaving} />
    </ReactFlowProvider>
  );
}
