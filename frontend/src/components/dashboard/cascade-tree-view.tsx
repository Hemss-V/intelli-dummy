import { useMemo, useState, useEffect } from "react";
import { GitMerge, Layers, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useCascadeExposure, usePos } from "@/hooks/use-dashboard-data";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

export function CascadeTreeView() {
    const { data: pos } = usePos();
    const [rootPoId, setRootPoId] = useState<string | number | null>(null);

    useEffect(() => {
        if (pos?.length && rootPoId == null) {
            setRootPoId(pos[0].id);
        }
    }, [pos, rootPoId]);

    const { data: cascade, isLoading } = useCascadeExposure(rootPoId);

    const nodes = useMemo(() => {
        const rows = cascade?.tiers || [];
        if (!rows.length) return [];
        return rows.map((row: any) => ({
            id: `PO-${row.id}`,
            rawId: Number(row.id),
            parentRawId: row.root_po_id ? Number(row.root_po_id) : null,
            tier: `T${row.tier_level}`,
            entity: row.supplier_name || `Supplier ${row.supplier_id}`,
            type: row.tier_level === 1 ? "Root PO" : "Linked PO",
            amount: Number(row.amount || 0),
            risk: Number(cascade?.ratio || 0) > 1.1 && row.tier_level > 1 ? "high" : "low",
            status: Number(cascade?.ratio || 0) > 1.1 && row.tier_level > 1 ? "FLAGGED" : "VERIFIED",
            depth: Number(row.tier_level || 1)
        }));
    }, [cascade]);

    const root = nodes[0];
    const totalFinanced = Number(cascade?.totalFinanced || 0);
    const rootAmount = Number(cascade?.rootAmount || 0);
    const Ratio = Number(cascade?.ratio || 0);

    const renderNode = (node: any, depth = 0) => {
        const isCritical = node.risk === 'critical' || node.risk === 'high';
        const children = nodes.filter((n: any) => n.parentRawId === node.rawId);
        const hasChildren = children.length > 0;

        return (
            <div key={node.id} className="w-full">
                {/* Connection Line */}
                {depth > 0 && (
                    <div className="absolute -left-6 top-6 w-6 h-px bg-border group-hover:bg-primary/50 transition-colors"></div>
                )}
                {depth > 0 && hasChildren && (
                    <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-border group-hover:bg-primary/50 transition-colors z-0"></div>
                )}

                <div className={`relative z-10 p-3 mb-2 rounded-xl border flex items-center justify-between transition-colors
          ${isCritical ? 'bg-destructive/10 border-destructive/40 shadow-[0_0_10px_rgba(220,38,38,0.1)]' : 'bg-card border-border hover:border-primary/50'}
        `}>
                    <div className="flex items-center gap-3">
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase font-mono
              ${node.tier === 'T1' ? 'bg-primary/20 text-primary' : node.tier === 'T2' ? 'bg-accent/20 text-accent-foreground' : 'bg-muted text-muted-foreground'}
            `}>
                            {node.tier}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                                {node.entity}
                                {isCritical ? <ShieldAlert className="w-3.5 h-3.5 text-destructive" /> : <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">{node.id} • {node.type}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-mono text-sm font-bold text-foreground">
                            {formatCurrency(node.amount)}
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider px-1.5 rounded inline-block mt-0.5 ${isCritical ? 'bg-destructive text-white' : 'bg-primary/10 text-primary'
                            }`}>
                            {node.status}
                        </div>
                    </div>
                </div>

                {hasChildren && (
                    <div className="pl-6 border-l border-border relative ml-3 mt-1 pb-1">
                        {children.map((child: any) => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-card rounded-2xl p-6 glow-card border border-border/50 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-foreground glow-text flex items-center gap-2">
                        <GitMerge className="w-5 h-5 text-primary" />
                        Cross-Tier Cascade Exposure
                    </h2>
                    <p className="text-sm text-muted-foreground">Monitoring Deep-Tier Multi-Financing</p>
                </div>
                {pos && pos.length > 0 && (
                    <label className="text-xs flex flex-col gap-1 min-w-[200px]">
                        <span className="text-muted-foreground uppercase font-semibold">Root PO (from DB)</span>
                        <select
                            className="bg-background border border-border rounded-lg px-2 py-2 text-sm font-mono"
                            value={rootPoId ?? ""}
                            onChange={(e) => setRootPoId(e.target.value ? Number(e.target.value) : null)}
                        >
                            {pos.map((p: any) => (
                                <option key={p.id} value={p.id}>
                                    PO-{p.id} · ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
            </div>

            {/* Metrics Banner */}
            <div className={`p-4 rounded-xl border mb-6 flex items-center justify-between ${Ratio > 1.1 ? 'bg-destructive/10 border-destructive/50' : 'bg-muted/10 border-border'
                }`}>
                <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Root PO Value</div>
                    <div className="font-mono text-xl text-foreground font-bold">{formatCurrency(rootAmount)}</div>
                </div>
                <div className="text-center">
                    <Layers className={`w-6 h-6 mx-auto mb-1 ${Ratio > 1.1 ? 'text-destructive' : 'text-primary'}`} />
                    <div className={`text-xs font-bold ${Ratio > 1.1 ? 'text-destructive' : 'text-primary'}`}>
                        {(Ratio * 100).toFixed(1)}% FINANCED
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Cumulative Tiered Financing</div>
                    <div className={`font-mono text-xl font-bold ${Ratio > 1.1 ? 'text-destructive glow-text' : 'text-foreground'}`}>
                        {formatCurrency(totalFinanced)}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading && <div className="text-sm text-muted-foreground">Loading cascade exposure...</div>}
                {!isLoading && !root && <div className="text-sm text-muted-foreground">No purchase orders found for cascade analysis.</div>}
                {!isLoading && root && renderNode(root)}
            </div>
        </div>
    );
}
