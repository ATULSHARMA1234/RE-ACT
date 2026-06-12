import { Handle, Position } from '@xyflow/react';
import { Split } from 'lucide-react';

export default function SplitNode({ data, selected }: any) {
  return (
    <div className={`bg-surface-card border-2 rounded-xl p-4 w-72 shadow-card backdrop-blur-md transition-all ${
      selected ? "border-brand-amber shadow-card-hover" : "border-border hover:border-brand-amber/50"
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-text-muted border-2 border-white" />

      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full bg-brand-amber/10 text-brand-amber flex items-center justify-center shrink-0">
          <Split size={16} />
        </div>
        <span className="font-semibold text-body text-text-primary capitalize">
          Split: {data.config?.split_type || 'Condition'}
        </span>
      </div>

      {data.config?.percentage && (
        <p className="text-small text-text-secondary pl-11">Path A: {data.config.percentage}% / Path B: {100 - Number(data.config.percentage)}%</p>
      )}

      {/* Outgoing Handle A */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="a"
        style={{ left: '25%' }}
        className="w-3 h-3 bg-brand-amber border-2 border-white" 
      />
      {/* Outgoing Handle B */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="b"
        style={{ left: '75%' }}
        className="w-3 h-3 bg-brand-amber border-2 border-white" 
      />
    </div>
  );
}
