import { Handle, Position } from '@xyflow/react';
import { Clock, MessageCircle, Tag } from 'lucide-react';

export default function ActionNode({ data, selected }: any) {
  const isDelay = data.originalType === "delay";
  const isMessage = data.originalType === "message";
  const isAction = data.originalType === "action";

  const colorClass = isDelay ? "brand-coral" : isMessage ? "brand-green" : "[#6D28D9]";
  const bgClass = isDelay ? "bg-brand-coral/10 text-brand-coral" : isMessage ? "bg-brand-green/10 text-brand-green" : "bg-[#6D28D9]/10 text-[#6D28D9]";
  const borderClass = isDelay ? "border-brand-coral" : isMessage ? "border-brand-green" : "border-[#6D28D9]";

  return (
    <div className={`bg-surface-card border-2 rounded-xl p-4 w-72 shadow-card backdrop-blur-md transition-all ${
      selected ? `${borderClass} shadow-card-hover` : "border-border hover:border-text-muted"
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-text-muted border-2 border-white" />
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgClass}`}>
            {isDelay && <Clock size={16} />}
            {isMessage && <MessageCircle size={16} />}
            {isAction && <Tag size={16} />}
          </div>
          <span className="font-semibold text-body text-text-primary capitalize">
            {isDelay ? `Delay: ${data.config?.time || ''}` :
             isMessage ? `Send ${data.config?.channel || 'Message'}` :
             `Action: Add Tag`}
          </span>
        </div>
        {isMessage && data.config?.segment_id && (
          <span className="text-[10px] font-medium bg-surface-panel px-2 py-1 rounded-md text-text-secondary">
            Segment
          </span>
        )}
      </div>

      {isMessage && data.config?.content && (
        <p className="text-small text-text-secondary pl-11 border border-border/50 bg-surface-panel/30 p-2 rounded-md mt-2 italic line-clamp-2">
          {`"${data.config.content}"`}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-text-muted border-2 border-white" />
    </div>
  );
}
