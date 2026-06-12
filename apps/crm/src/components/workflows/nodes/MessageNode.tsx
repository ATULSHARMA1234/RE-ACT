import { Handle, Position } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';

export default function MessageNode({ data, selected }: any) {
  return (
    <div className={`bg-surface-card border-2 rounded-xl p-4 w-72 shadow-card backdrop-blur-md transition-all ${
      selected ? "border-brand-green shadow-card-hover" : "border-border hover:border-brand-green/50"
    }`}>
      {/* Incoming Handle */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-text-muted border-2 border-white" />

      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-brand-green/10 text-brand-green flex items-center justify-center shrink-0">
          <MessageCircle size={16} />
        </div>
        <span className="font-semibold text-body text-text-primary capitalize">
          Message: {data.config?.channel || 'SMS'}
        </span>
      </div>
      
      {data.config?.content && (
        <p className="text-small text-text-secondary pl-11 border border-border/50 bg-surface-panel/30 p-2 rounded-md mt-2 italic line-clamp-2">
          &quot;{data.config.content}&quot;
        </p>
      )}

      {/* Outgoing Handle */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-brand-green border-2 border-white" />
    </div>
  );
}
