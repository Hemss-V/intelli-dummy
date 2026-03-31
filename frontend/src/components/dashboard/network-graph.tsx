import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  Handle,
  Position,
  type NodeMouseHandler
} from '@xyflow/react';
import { useNetwork } from '@/hooks/use-dashboard-data';
import { AlertCircle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

const ScfNode = ({ data }: any) => {
  const isFlagged = data.isFlagged;
  const isAnchor = data.tier === 'T1';

  return (
    <div className={`
      relative px-4 py-3 rounded-xl border-2 glass-panel shadow-lg min-w-[140px] flex flex-col items-center justify-center
      ${isFlagged ? 'border-destructive shadow-destructive/20' : isAnchor ? 'border-primary shadow-primary/20 glow-card' : 'border-muted-foreground/30'}
      transition-all duration-300 hover:scale-105 cursor-pointer
    `}>
      <Handle type="target" position={Position.Top} className="opacity-0" />

      {isFlagged && (
        <div className="absolute -top-3 -right-3 animate-bounce">
          <AlertCircle className="text-destructive fill-destructive/20" size={24} />
        </div>
      )}

      <div className={`text-xs font-mono mb-1 ${isAnchor ? 'text-primary' : 'text-muted-foreground'}`}>
        {data.tier}
      </div>
      <div className="font-semibold text-sm text-center text-foreground whitespace-nowrap">
        {data.label}
      </div>
      {data.riskScore > 0 && (
        <div className="mt-2 w-full h-1 bg-black/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${data.riskScore > 75 ? 'bg-destructive' : data.riskScore > 40 ? 'bg-warning' : 'bg-primary'}`}
            style={{ width: `${data.riskScore}%` }}
          />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

const nodeTypes = { scfNode: ScfNode };

const formatCompactCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value || 0);
};

export function NetworkGraph() {
  const { data: network, isLoading } = useNetwork();
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const initialNodes = useMemo(() => {
    if (!network?.nodes) return [];
    const sortedNodes = [...network.nodes].sort((a: any, b: any) => Number(a.id) - Number(b.id));
    return sortedNodes.map((node: any, i: number) => {
      let x = 0, y = 0;
      if (node.tier === 'T1') { x = 400; y = 50; }
      else if (node.tier === 'T2') { x = 200 + (i * 150); y = 200; }
      else { x = 100 + ((i % 6) * 120); y = 350 + (Math.floor(i / 6) * 90); }

      return {
        id: node.id.toString(),
        type: 'scfNode',
        position: { x, y },
        data: node
      };
    });
  }, [network]);

  const initialEdges = useMemo(() => {
    if (!network?.edges) return [];
    return network.edges.map((edge: any) => {
      const isGap = edge.type === 'gap';
      const isCarousel = edge.type === 'carousel';
      return {
        id: `e${edge.source}-${edge.target}`,
        source: edge.source.toString(),
        target: edge.target.toString(),
        animated: isCarousel,
        style: {
          stroke: isGap ? 'hsl(var(--destructive))' : isCarousel ? 'hsl(var(--warning))' : 'hsl(var(--primary) / 0.5)',
          strokeWidth: isCarousel ? 3 : 2,
          strokeDasharray: isGap ? '5,5' : 'none',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isGap ? 'hsl(var(--destructive))' : isCarousel ? 'hsl(var(--warning))' : 'hsl(var(--primary) / 0.5)',
        },
      };
    });
  }, [network]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNode(node.data);
  }, []);

  if (isLoading) return <div className="h-full w-full flex items-center justify-center text-primary glow-text font-mono animate-pulse">ESTABLISHING TOPOLOGY LINK...</div>;

  return (
    <div className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden glow-card border border-border/50 relative bg-background/50">

      {/* Topology Header */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3 pointer-events-auto">
        <div className="bg-card/90 backdrop-blur-md border border-border/50 rounded-xl p-3 shadow-lg flex flex-col gap-1 w-[260px]">
          <label className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-2 tracking-wider">
            Live Network Topology
          </label>
        </div>

        <div className="bg-card/80 backdrop-blur border border-border/50 rounded-lg p-3 text-xs font-mono space-y-2 pointer-events-none">
          <div className="text-muted-foreground uppercase mb-2">Topology Legend</div>
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-primary/50"></div> Validated Flow</div>
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-destructive border border-dashed border-destructive"></div> Verification Gap</div>
          <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-warning"></div> Suspected Carousel</div>
        </div>
      </div>

      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        className="bg-transparent"
      >
        <Background color="rgba(255,255,255,0.05)" gap={20} size={1} />
        <Controls className="fill-primary border-border bg-card shadow-lg" />
      </ReactFlow>

      {/* Slide Over Panel for Node Inspection */}
      {selectedNode && (
        <div className="absolute top-0 right-0 h-full w-80 bg-card/95 backdrop-blur-xl border-l border-border/50 p-6 shadow-2xl z-50 transition-transform duration-300 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-xs font-mono font-bold text-primary mb-1">{selectedNode.tier} Entity</div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">{selectedNode.label}</h3>
            </div>
            <button onClick={() => setSelectedNode(null)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 flex-1">
            <div className="p-4 rounded-xl border border-border/50 bg-background/50">
              <div className="text-sm text-muted-foreground mb-1">Entity Risk Score</div>
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-mono font-black ${selectedNode.riskScore > 75 ? 'text-destructive glow-text' : selectedNode.riskScore > 40 ? 'text-warning glow-text' : 'text-primary glow-text'}`}>
                  {selectedNode.riskScore}/100
                </span>
                {selectedNode.isFlagged && <ShieldAlert className="w-6 h-6 text-destructive animate-pulse" />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
                <div className="text-xs text-muted-foreground mb-1 truncate">Status</div>
                <div className={`text-sm font-semibold flex items-center gap-1 ${selectedNode.status === 'BLOCKED' ? 'text-destructive' : selectedNode.status === 'REVIEW' ? 'text-warning' : 'text-primary'}`}>
                  {selectedNode.status === 'BLOCKED' ? <><AlertCircle className="w-3 h-3" /> Blocked</> :
                    selectedNode.status === 'REVIEW' ? <><AlertCircle className="w-3 h-3" /> Review</> :
                    <><CheckCircle2 className="w-3 h-3" /> Approved</>}
                </div>
              </div>
              <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
                <div className="text-xs text-muted-foreground mb-1 truncate">Financed Volume</div>
                <div className="text-sm font-mono font-semibold text-foreground">
                  ₹{formatCompactCurrency(Number(selectedNode.totalVolume || 0))}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Active invoices: {Number(selectedNode.activeInvoices || 0)}</div>

            <div className="space-y-2 mt-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Active Alerts ({selectedNode.isFlagged ? 1 : 0})
              </div>
              {selectedNode.isFlagged ? (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs leading-relaxed text-destructive/90">
                  <span className="font-bold">CRITICAL:</span> Node involved in suspected Tier-3 shell carousel. KYC documents failed signature check.
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No active alerts for this entity.</div>
              )}
            </div>

          </div>
          <button className="w-full py-3 rounded-xl border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-bold tracking-wide uppercase mt-4" onClick={() => window.location.href = `/supplier/${selectedNode.id}`}>
            View Complete Identity
          </button>
        </div>
      )}
    </div>
  );
}
