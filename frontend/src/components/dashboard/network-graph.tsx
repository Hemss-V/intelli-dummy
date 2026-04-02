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
import { useNetwork, useEntityAlerts } from '@/hooks/use-dashboard-data';
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

/** Matches legend & renders reliably on SVG (theme primary can fail in stroke). */
const EDGE_VALIDATED = '#3b82f6';
const EDGE_GAP = 'hsl(var(--destructive))';
const EDGE_CAROUSEL = '#ca8a04';
const EDGE_HIGH_VOLUME = '#06b6d4';

const formatCompactCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value || 0);
};

export function NetworkGraph() {
  const { data: network, isLoading } = useNetwork();
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const { data: entityAlerts = [] } = useEntityAlerts(selectedNode?.id ?? null);

  const initialNodes = useMemo(() => {
    if (!network?.nodes?.length) return [];
    const sortedNodes = [...network.nodes].sort((a: any, b: any) => Number(a.id) - Number(b.id));
    const tiers = ['T1', 'T2', 'T3', 'T4', 'T5'];
    const byTier = new Map<string, any[]>();
    sortedNodes.forEach((node: any) => {
      const tier = tiers.includes(node.tier) ? node.tier : 'T5';
      const list = byTier.get(tier) || [];
      list.push(node);
      byTier.set(tier, list);
    });

    const tierYMap: Record<string, number> = { T1: 60, T2: 240, T3: 420, T4: 600, T5: 780 };
    const horizontalSpacing = 260;
    const allNodes: any[] = [];

    tiers.forEach((tier) => {
      const nodes = byTier.get(tier) || [];
      const totalWidth = Math.max(1, nodes.length - 1) * horizontalSpacing;
      const startX = 650 - (totalWidth / 2);
      nodes.forEach((node: any, idx: number) => {
        allNodes.push({
          id: node.id.toString(),
          type: 'scfNode',
          position: { x: startX + (idx * horizontalSpacing), y: tierYMap[tier] || 780 },
          data: node
        });
      });
    });

    return allNodes;
  }, [network?.nodes]);

  const initialEdges = useMemo(() => {
    if (!network?.edges?.length) return [];
    return network.edges.map((edge: any) => {
      const isGap = edge.type === 'gap';
      const isCarousel = edge.type === 'carousel';
      const isHighVolume = Boolean(edge.highVolumeFlag);
      const isNewEdge = Boolean(edge.newEdgeFlag);
      const edgeColor = isGap
        ? EDGE_GAP
        : isCarousel
          ? EDGE_CAROUSEL
          : isHighVolume
            ? EDGE_HIGH_VOLUME
            : EDGE_VALIDATED;
      let dash: string | undefined = undefined;
      if (isGap) dash = '5,5';
      else if (isCarousel) dash = '10,5';
      else if (isNewEdge) dash = '4,4';

      return {
        id: `e${edge.source}-${edge.target}`,
        source: edge.source.toString(),
        target: edge.target.toString(),
        animated: isCarousel || isNewEdge,
        style: {
          stroke: edgeColor,
          strokeWidth: isCarousel ? 3 : isHighVolume ? 2.5 : 2,
          strokeDasharray: dash,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
      };
    });
  }, [network?.edges]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNode(node.data);
  }, []);

  if (isLoading) return <div className="h-full w-full flex items-center justify-center text-primary glow-text font-mono animate-pulse">ESTABLISHING TOPOLOGY LINK...</div>;

  if (!isLoading && (!network?.nodes || network.nodes.length === 0)) {
    return (
      <div className="w-full h-full min-h-[500px] rounded-2xl border border-border/50 bg-card/40 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-muted-foreground max-w-md">
          No companies for this lender in the database.
        </p>
      </div>
    );
  }

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
          <div className="flex items-center gap-2"><div className="w-5 h-[3px] rounded-sm" style={{ backgroundColor: EDGE_VALIDATED }} /> Validated flow</div>
          <div className="flex items-center gap-2"><div className="w-5 h-0 border-t-[3px] border-dashed border-destructive" /> Verification gap</div>
          <div className="flex items-center gap-2"><div className="w-5 h-0 border-t-[3px] border-dashed" style={{ borderColor: EDGE_CAROUSEL }} /> Carousel cycle</div>
          <div className="flex items-center gap-2"><div className="w-5 h-[3px] rounded-sm" style={{ backgroundColor: EDGE_HIGH_VOLUME }} /> High volume</div>
          <div className="flex items-center gap-2"><div className="w-5 h-0 border-t-[3px] border-dashed border-cyan-500" /> New edge (&lt; 30d)</div>
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
              <div className="text-sm text-muted-foreground mb-1">Entity risk</div>
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-mono font-black ${selectedNode.status === 'BLOCKED' || Number(selectedNode.riskScore || 0) >= 60 ? 'text-destructive glow-text' : selectedNode.status === 'REVIEW' || Number(selectedNode.riskScore || 0) >= 30 ? 'text-warning glow-text' : 'text-primary glow-text'}`}>
                  {Number(selectedNode.riskScore || 0).toFixed(2)}/100
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
                    selectedNode.status === 'APPROVED' ? <><CheckCircle2 className="w-3 h-3" /> Approved</> :
                    <><AlertCircle className="w-3 h-3" /> Unknown</>}
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
                Alerts (this entity · from DB)
              </div>
              {entityAlerts.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No alert rows linked to this entity&apos;s invoices.</div>
              ) : (
                <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {entityAlerts.slice(0, 8).map((a: any) => (
                    <li key={a.id} className="p-2 rounded-lg border border-border/50 bg-muted/20 text-[11px] text-foreground">
                      <span className="font-semibold text-primary">{a.severity}</span>
                      {' · '}
                      {a.message || a.fraud_rule || 'Alert'}
                    </li>
                  ))}
                </ul>
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
