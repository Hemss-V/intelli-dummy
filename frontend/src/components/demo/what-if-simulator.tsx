import { useEffect, useMemo, useState } from "react";
import { HelpCircle, ArrowRight, ShieldAlert, ShieldCheck } from "lucide-react";
import {
    useContagionImpact,
    useInvoiceDetail,
    useInvoiceQueue,
    useKPI,
    useManualOverrideInvoice
} from "@/hooks/use-dashboard-data";

export function WhatIfSimulator() {
    const [isApproved, setIsApproved] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [fundAmount, setFundAmount] = useState(0);

    const { data: queue, isLoading: queueLoading } = useInvoiceQueue();
    const { data: kpi } = useKPI();
    const { data: invoiceDetail } = useInvoiceDetail(selectedInvoiceId);
    const { data: contagion } = useContagionImpact(invoiceDetail?.supplier_id ? String(invoiceDetail.supplier_id) : null);
    const overrideMutation = useManualOverrideInvoice();

    useEffect(() => {
        if (!queue || queue.length === 0) return;
        if (selectedInvoiceId) return;
        const preferred = queue.find((q: any) => q.status === "BLOCKED" || q.status === "REVIEW");
        setSelectedInvoiceId(String((preferred || queue[0]).dbId));
    }, [queue, selectedInvoiceId]);

    useEffect(() => {
        if (!invoiceDetail?.amount) return;
        setFundAmount(Number(invoiceDetail.amount));
    }, [invoiceDetail?.id]);

    const selectedQueueInvoice = useMemo(
        () => queue?.find((q: any) => String(q.dbId) === String(selectedInvoiceId)),
        [queue, selectedInvoiceId]
    );

    const baseHealth = Number(kpi?.healthScore ?? 0);
    const contagionScore = Number(contagion?.contagionRiskScore ?? 0);
    const lenderExposure = Math.max(1, Number(kpi?.totalExposure ?? 0));
    const sizeImpact = Math.min(35, (fundAmount / lenderExposure) * 100);
    const contagionImpact = contagionScore * 0.35;
    const dropPercentage = Math.min(60, sizeImpact + contagionImpact);
    const calculatedHealth = isApproved ? Math.max(baseHealth - dropPercentage, 0).toFixed(1) : baseHealth.toFixed(1);

    const canOverride =
        !!selectedInvoiceId &&
        (selectedQueueInvoice?.status === "BLOCKED" || selectedQueueInvoice?.status === "REVIEW");

    const handleOverride = async () => {
        if (!selectedInvoiceId || !canOverride) return;
        await overrideMutation.mutateAsync({
            id: selectedInvoiceId,
            reason: `Dashboard simulation override. Exposure amount considered: ₹${Math.round(fundAmount)}`
        });
    };

    return (
        <div className="bg-card rounded-2xl p-6 glow-card border border-border/50 h-full flex flex-col relative overflow-hidden transition-colors duration-500">
            <div className={`absolute inset-0 opacity-10 transition-opacity duration-500 pointer-events-none ${isApproved ? 'bg-destructive' : 'bg-primary'}`}></div>

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                    <h2 className="text-lg font-semibold text-foreground glow-text flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        Disbursement Tool
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Simulate cascading risk of override</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 shrink-0 relative z-10">
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Target Invoice</label>
                    <select
                        value={selectedInvoiceId || ""}
                        onChange={(e) => setSelectedInvoiceId(e.target.value || null)}
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        disabled={queueLoading || !queue?.length}
                    >
                        {!queue?.length ? (
                            <option value="">No invoices</option>
                        ) : (
                            queue.map((inv: any) => (
                                <option key={inv.dbId} value={String(inv.dbId)}>
                                    {inv.id} ({inv.status})
                                </option>
                            ))
                        )}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Exposure Amount (INR)</label>
                    <input
                        type="number"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/50 p-1 rounded-full border border-border/50 mb-6 shrink-0 relative z-10">
                <button
                    onClick={() => setIsApproved(false)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${!isApproved ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Keep Blocked
                </button>
                <button
                    onClick={() => setIsApproved(true)}
                    className={`flex-1 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${isApproved ? 'bg-destructive text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Test Override
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4 relative z-10 h-full">
                <div className="grid grid-cols-2 gap-4">

                    <div className={`p-5 rounded-xl border transition-all duration-500 flex flex-col items-center justify-center text-center ${!isApproved ? 'bg-primary/10 border-primary/30' : 'bg-muted/10 border-border/50 opacity-50'}`}>
                        <ShieldCheck className={`w-8 h-8 mb-2 ${!isApproved ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="text-2xl font-mono font-bold text-foreground mb-1">{baseHealth}%</div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Base Health</div>
                    </div>

                    <div className="flex items-center justify-center -mx-4 z-20">
                        <div className="bg-card p-2 rounded-full border border-border/50 shadow-lg">
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>

                    <div className={`p-5 rounded-xl border transition-all duration-500 flex flex-col items-center justify-center text-center ${isApproved ? 'bg-destructive/10 border-destructive/50 shadow-[0_0_20px_rgba(220,38,38,0.2)] scale-105' : 'bg-muted/10 border-border/50 opacity-50'}`}>
                        <ShieldAlert className={`w-8 h-8 mb-2 ${isApproved ? 'text-destructive' : 'text-muted-foreground'}`} />
                        <div className="text-2xl font-mono font-bold text-foreground mb-1">
                            {isApproved ? `${calculatedHealth}%` : '---'}
                        </div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">New Health</div>
                    </div>

                </div>

                <div className={`p-3 rounded-xl border transition-all duration-500 ${isApproved ? 'bg-destructive/5 border-destructive/30' : 'bg-primary/5 border-primary/20'}`}>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {isApproved
                            ? `Override simulation for ${selectedQueueInvoice?.id || 'selected invoice'}: ₹${fundAmount.toLocaleString('en-IN')} disbursal with contagion score ${contagionScore} implies a projected ${dropPercentage.toFixed(1)}% health drop.`
                            : "Keeping the block preserves lender health and avoids contagion spread from the selected account."}
                    </p>
                </div>
                {isApproved && (
                    <button
                        onClick={handleOverride}
                        disabled={!canOverride || overrideMutation.isPending}
                        className="w-full py-2 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-wider hover:bg-destructive/20 disabled:opacity-50"
                    >
                        {overrideMutation.isPending ? "Applying Override..." : "Apply Override In Backend"}
                    </button>
                )}
                {overrideMutation.isSuccess && (
                    <div className="text-[10px] text-primary font-mono">Override applied. Queue/KPI refreshed from backend.</div>
                )}
                {overrideMutation.error && (
                    <div className="text-[10px] text-destructive font-mono">{(overrideMutation.error as Error).message}</div>
                )}
            </div>
        </div>
    );
}
