import { useState } from "react";
import { CopyPlus, Send, AlertTriangle, CheckCircle2, RefreshCw, Zap, ShieldCheck, Ghost, ChevronRight } from "lucide-react";
import { useSubmitInvoice, useScenarios } from "@/hooks/use-dashboard-data";

export function LiveSubmissionForm() {
    const [status, setStatus] = useState<'idle' | 'analyzing' | 'blocked' | 'approved'>('idle');
    const [activeCheckpoint, setActiveCheckpoint] = useState<number | null>(null);
    const [resultData, setResultData] = useState({ score: 0, reason: '', id: null });
    
    const { data: scenarios, isLoading: loadingScenarios } = useScenarios();
    const submitInvoice = useSubmitInvoice();

    const pipelineSteps = [
        { 
            id: 1, 
            label: "Identity Gate", 
            statement: "Verifying W3C Verifiable Credentials...", 
            success: "DID & VC Validated [OK]",
            desc: "Validates the digital identity of the supplier using decentralized identifiers (DIDs) to prevent shell company creation."
        },
        { 
            id: 2, 
            label: "Ingestion & Sanitization", 
            statement: "Normalizing JSON & Currency...", 
            success: "Data Sanitized [DONE]",
            desc: "Ensures the payload is safe, formats are consistent, and currency conversions are handled correctly."
        },
        { 
            id: 3, 
            label: "Fingerprinting", 
            statement: "Applying SHA-256 to PII...", 
            success: "Hash Generated [COMPLETED]",
            desc: "Creates a unique cryptographic footprint of the invoice to catch both exact and 'fuzzy' duplicates across the network."
        },
        { 
            id: 4, 
            label: "Triple Match Cross-Ref", 
            statement: "Auditing PO vs GRN vs Invoice...", 
            success: "Inventory Match Verified [CHECKED]",
            desc: "The core verification gate. Checks if the goods were actually ordered (PO) and physically received (GRN)."
        },
        { 
            id: 5, 
            label: "Velocity & Bot Engine", 
            statement: "Scanning 60m submission rate...", 
            success: "Temporal Flow Normal [OK]",
            desc: "Detects automated submission behavior or 'flash' floods of invoices that signal bot-driven fraud attacks."
        },
        { 
            id: 6, 
            label: "Neural Risk Scorer", 
            statement: "Executing 20+ weighted signals...", 
            success: "Composite Score Calculated",
            desc: "Aggregates revenue feasibility, dormant burst signals, and payment term anomalies into a final risk number."
        },
        { 
            id: 7, 
            label: "Graph Relationship Analysis", 
            statement: "Detecting 3-hop neighbor cycles...", 
            success: "Carousel Trade Scanned [CLEAR]",
            desc: "Goes beyond the invoice to check the entire network for circular trading and hidden beneficial ownership."
        },
        { 
            id: 8, 
            label: "Consensus Feedback", 
            statement: "Aggregating all gate verdicts...", 
            success: "Systemic Consensus Reached",
            desc: "Combines the outputs of all engines to reach a final GO/HOLD/BLOCK decision for disbursement."
        }
    ];

    const runScenario = async (type: 'honest' | 'mismatch' | 'duplicate') => {
        if (!scenarios || !scenarios[type]) {
            console.error("Scenario data missing for type:", type);
            return;
        }
        
        const data = scenarios[type];
        let payload: any = {};

        // Generate dynamic payload based on DB scenario data
        if (type === 'honest') {
            payload = {
                supplier_id: data.supplier_id,
                buyer_id: data.buyer_id,
                po_id: data.po_id,
                grn_id: data.grn_id,
                amount: parseFloat(data.amount || data.po_amount || '10000'), // Ensure amount is set
                invoice_number: `INV-${Date.now()}`,
                goods_category: data.goods_category || 'Industrial Equipment',
                expected_payment_date: new Date(Date.now() + 30 * 86400000).toISOString()
            };
            // Force exact match with GRN if available
            if (data.grn_amount) payload.amount = parseFloat(data.grn_amount);
            else if (data.amount) payload.amount = parseFloat(data.amount);

        } else if (type === 'mismatch') {
            payload = {
                supplier_id: data.supplier_id,
                buyer_id: data.buyer_id,
                po_id: data.po_id,
                grn_id: data.grn_id,
                amount: (parseFloat(data.po_amount || data.amount || '10000') * 1.5), // Force a mismatch
                invoice_number: `INV-${Date.now()}`,
                goods_category: 'Unverified Surplus Items',
                expected_payment_date: new Date(Date.now() + 30 * 86400000).toISOString()
            };
        } else if (type === 'duplicate') {
            payload = {
                supplier_id: data.supplier_id,
                buyer_id: data.buyer_id,
                po_id: data.po_id,
                grn_id: data.grn_id,
                amount: parseFloat(data.amount || '10000'),
                invoice_number: data.invoice_number || `DUP-${Date.now()}`, // Exact duplicate
                goods_category: 'Re-billed Services',
                expected_payment_date: new Date(Date.now() + 30 * 86400000).toISOString()
            };
        }

        console.log("Submitting Payload:", payload);

        setStatus('analyzing');
        
        // Elaborate Neural Pipeline Animation
        for (let i = 1; i <= pipelineSteps.length; i++) {
            setActiveCheckpoint(i);
            await new Promise(r => setTimeout(r, 600));
        }

        try {
            const res = await submitInvoice.mutateAsync(payload);
            setResultData({ score: res.riskScore, reason: res.recommendation, id: res.invoiceId });
            setStatus(res.status === 'BLOCKED' ? 'blocked' : 'approved');
        } catch (error: any) {
            console.error("Submission Error:", error);
            setResultData({ score: 0, reason: error.message || 'Submission Intercepted', id: null });
            setStatus('blocked');
        } finally {
            setActiveCheckpoint(null);
        }
    };

    return (
        <div className="bg-card rounded-2xl p-6 glow-card border border-border/50 h-full flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h2 className="text-lg font-semibold text-foreground glow-text flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Neural Pipeline Simulator
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Select a scenario to trigger the autonomous AI gates</p>
                </div>
            </div>

            <div className="flex-1 relative flex flex-col">
                {status !== 'idle' ? (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-md flex flex-col z-20 rounded-xl border border-border/50 p-6 overflow-hidden">
                        {status === 'analyzing' && (
                            <div className="w-full flex-1 flex flex-col">
                                <div className="text-center mb-6">
                                    <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                                    <div className="font-mono text-[10px] text-primary uppercase tracking-[0.3em] font-bold">Autonomous Evaluation Active</div>
                                </div>
                                
                                <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                                    {pipelineSteps.map((step) => {
                                        const isActive = activeCheckpoint === step.id;
                                        const isFinished = activeCheckpoint && activeCheckpoint > step.id;
                                        
                                        return (
                                            <div 
                                                key={step.id} 
                                                className={`relative flex items-start gap-4 p-3 rounded-lg border transition-all duration-500 group cursor-help ${
                                                    isActive 
                                                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(54,255,143,0.1)] translate-x-1' 
                                                    : isFinished 
                                                    ? 'bg-muted/20 border-primary/20 opacity-60' 
                                                    : 'bg-muted/5 border-border opacity-20'
                                                }`}
                                            >
                                                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-primary animate-ping' : isFinished ? 'bg-primary' : 'bg-muted-foreground'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-foreground">
                                                        {step.label}
                                                    </div>
                                                    <div className={`text-[11px] font-mono leading-tight ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                                        {isActive ? step.statement : isFinished ? step.success : 'Waiting...'}
                                                    </div>
                                                </div>
                                                
                                                <div className="absolute left-full ml-4 w-56 p-3 bg-card border border-border rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-xs text-muted-foreground leading-relaxed ring-1 ring-primary/20">
                                                    <div className="font-bold text-foreground mb-1 flex items-center gap-2">
                                                        <ShieldCheck className="w-3 h-3 text-primary" /> Mechanism
                                                    </div>
                                                    {step.desc}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {(status === 'blocked' || status === 'approved') && (
                            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                                {status === 'blocked' ? (
                                    <div className="bg-destructive/10 p-2 rounded-full mb-6 ring-4 ring-destructive/20 scale-125">
                                        <AlertTriangle className="w-12 h-12 text-destructive animate-pulse" />
                                    </div>
                                ) : (
                                    <div className="bg-primary/10 p-2 rounded-full mb-6 ring-4 ring-primary/20 scale-125">
                                        <CheckCircle2 className="w-12 h-12 text-primary" />
                                    </div>
                                )}
                                
                                <h3 className={`text-3xl font-black tracking-tighter mb-2 ${status === 'blocked' ? 'text-destructive' : 'text-primary'}`}>
                                    {status === 'blocked' ? 'GATE CLOSED' : 'AUTO-APPROVED'}
                                </h3>
                                
                                <div className={`text-sm font-mono p-4 rounded-xl border max-w-xs mb-8 ${status === 'blocked' ? 'bg-destructive/5 border-destructive/20 text-destructive' : 'bg-primary/5 border-primary/20 text-primary'}`}>
                                    <div className="text-[10px] uppercase font-bold mb-1 opacity-70">Final Consensus Score</div>
                                    <div className="text-2xl font-black">{resultData.score}/100</div>
                                    <div className="text-[10px] mt-1 border-t border-current/20 pt-1 uppercase tracking-widest">{resultData.reason || (status === 'blocked' ? 'Critical Risk Detected' : 'Flow Validated')}</div>
                                </div>

                                <button onClick={() => setStatus('idle')} className="group flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
                                    New Scenario <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 grid grid-rows-3 gap-4">
                        {/* Scenario 1: Honest */}
                        <button 
                            disabled={loadingScenarios || !scenarios?.honest}
                            onClick={() => runScenario('honest')}
                            className="bg-muted/30 border border-border/50 rounded-xl p-4 text-left hover:bg-primary/5 hover:border-primary/50 transition-all group relative overflow-hidden disabled:opacity-50"
                        >
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm mb-1 uppercase tracking-wider">
                                        <ShieldCheck className="w-4 h-4" /> Honest Supplier
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-snug max-w-[200px]">Valid PO/GRN match with verified identity and normal volume.</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </div>
                            <div className="absolute top-0 right-0 p-2 opacity-5">
                                <CheckCircle2 className="w-16 h-16 text-primary" />
                            </div>
                        </button>

                        {/* Scenario 2: Lazy Fraudster */}
                        <button 
                            disabled={loadingScenarios || !scenarios?.mismatch}
                            onClick={() => runScenario('mismatch')}
                            className="bg-muted/30 border border-border/50 rounded-xl p-4 text-left hover:bg-warning/5 hover:border-warning/50 transition-all group relative overflow-hidden disabled:opacity-50"
                        >
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-warning font-bold text-sm mb-1 uppercase tracking-wider">
                                        <Ghost className="w-4 h-4" /> Triple-Match Fail
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-snug max-w-[200px]">Invoice amount (₹) exceeds PO goods receipt. Classical inflation fraud.</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>

                        {/* Scenario 3: Bot Attack */}
                        <button 
                            disabled={loadingScenarios || !scenarios?.duplicate}
                            onClick={() => runScenario('duplicate')}
                            className="bg-muted/30 border border-border/50 rounded-xl p-4 text-left hover:bg-destructive/5 hover:border-destructive/50 transition-all group relative overflow-hidden disabled:opacity-50"
                        >
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-destructive font-bold text-sm mb-1 uppercase tracking-wider">
                                        <AlertTriangle className="w-4 h-4" /> Duplicate Re-billing
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-snug max-w-[200px]">Re-submitting an existing invoice number. BOT-powered collision attack.</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {loadingScenarios && (
                <div className="mt-4 p-2 bg-muted/50 rounded-lg text-center text-[10px] font-mono text-muted-foreground animate-pulse">
                    SYNCHRONIZING SCENARIOS WITH POSTGRES...
                </div>
            )}
        </div>
    );
}
