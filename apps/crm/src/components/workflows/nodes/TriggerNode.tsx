import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';

export default function TriggerNode({ data, selected }: any) {
  return (
    <div className={`bg-surface-card border-2 rounded-xl p-4 w-72 shadow-card backdrop-blur-md transition-all ${
      selected ? "border-brand-blue shadow-card-hover" : "border-border hover:border-brand-blue/50"
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
          <Play size={16} />
        </div>
        <span className="font-semibold text-body text-text-primary capitalize">
          Trigger: {data.config?.condition || 'Event'}
        </span>
      </div>
      {data.config?.value && (
        <p className="text-small text-text-secondary pl-11">{data.config.value}</p>
      )}

      {/* Outgoing Handle only */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-brand-blue border-2 border-white" />
    </div>
  );
}
