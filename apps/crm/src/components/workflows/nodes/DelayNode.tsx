import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

export default function DelayNode({ data, selected }: any) {
  return (
    <div className={`bg-surface-card border-2 rounded-xl p-4 w-72 shadow-card backdrop-blur-md transition-all ${
      selected ? "border-brand-coral shadow-card-hover" : "border-border hover:border-brand-coral/50"
    }`}>
      {/* Incoming Handle */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-text-muted border-2 border-white" />

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-coral/10 text-brand-coral flex items-center justify-center shrink-0">
          <Clock size={16} />
        </div>
        <span className="font-semibold text-body text-text-primary capitalize">
          Delay: {data.config?.time || 'Wait'}
        </span>
      </div>

      {/* Outgoing Handle */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-brand-coral border-2 border-white" />
    </div>
  );
}
