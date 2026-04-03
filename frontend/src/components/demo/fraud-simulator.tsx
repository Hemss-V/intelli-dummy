import { useState, useEffect, useRef, useMemo } from "react";
import { Play, RotateCcw, ShieldAlert, Activity, CheckCircle2 } from "lucide-react";
import { useKPI } from "@/hooks/use-dashboard-data";
import { API_BASE, WS_URL } from "@/lib/api-config";

export function FraudSimulator() {
    const [phase, setPhase] = useState<'idle' | 'injecting' | 'catching' | 'complete'>('idle');
    const [invoicesProcessed, setInvoicesProcessed] = useState(0);
    const [targetVolume, setTargetVolume] = useState(150);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [estimatedDurationMs, setEstimatedDurationMs] = useState<number | null>(null);
    const { data: kpi } = useKPI();
    const wsRef = useRef<WebSocket | null>(null);

    // Dynamic Average: Calculate real average invoice amount from current portfolio
    const avgInvoiceAmount = useMemo(() => {
        if (!kpi || !kpi.activeInvoices || kpi.activeInvoices === 0) return 0;
        return kpi.totalExposure / kpi.activeInvoices;
    }, [kpi]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);
    };

    useEffect(() => {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'STRESS_TEST_PROGRESS') {
                    setInvoicesProcessed(data.processed);
                    if (data.isComplete) {
                        setPhase('complete');
                    }
                }
            } catch (e) {
                console.error("WS Parse error", e);
            }
        };

        return () => {
            ws.close();
        };
    }, []);

    const startAnalysis = async () => {
        setErrorMsg(null);
        setPhase('injecting');
        
        setTimeout(async () => {
             try {
                const lenderId = localStorage.getItem('sherlock-lender-id') || '1';
                const response = await fetch(`${API_BASE}/stress-test`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-lender-id': lenderId
                    },
                    body: JSON.stringify({ volume: targetVolume })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || 'Backend Stress Test Failed');
                }
                const data = await response.json();
                setEstimatedDurationMs(Number(data.estimatedDuration || 0));
                setPhase('catching');
            } catch (error) {
                console.error(error);
                setErrorMsg(error instanceof Error ? error.message : 'Stress test failed');
                setPhase('idle');
            }
        }, 1200);
    };

    const reset = () => {
        setPhase('idle');
        setInvoicesProcessed(0);
        setEstimatedDurationMs(null);
        setErrorMsg(null);
    };

    const totalExposurePrevented = invoicesProcessed * avgInvoiceAmount;

    return (
        <div className="bg-card rounded-2xl p-6 glow-card border border-primary/20 h-full flex flex-col relative overflow-hidden">
            {phase === 'complete' && (
                <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-500">
                    <div className="bg-card border-2 border-primary p-8 rounded-2xl shadow-[0_0_50px_rgba(54,255,143,0.3)] text-center max-w-sm">
                        <ShieldAlert className="w-16 h-16 text-primary mx-auto mb-4" />
                        <h2 className="text-2xl font-bold glow-text text-foreground mb-2">Cascade Neutralized</h2>
                        <div className="text-4xl font-mono font-black text-primary mb-2">{targetVolume}</div>
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-6">Invoices Blocked</p>

                        <div className="p-4 bg-muted/30 rounded-xl border border-primary/20 mb-6">
                            <div className="text-sm text-foreground mb-1 font-medium">Total Exposure Prevented</div>
                            <div className="text-2xl font-mono text-primary font-bold">
                                {formatCurrency(targetVolume * avgInvoiceAmount)}
                            </div>
                        </div>

                        <button onClick={reset} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-bold uppercase tracking-wider text-sm">
                            <RotateCcw className="w-4 h-4" /> Reset Simulation
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                    <h2 className="text-lg font-semibold text-foreground glow-text flex items-center gap-2">
                        <Activity className="w-5 h-5 text-destructive" />
                        Attack Simulator
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1 tracking-tight">Backend-backed performance validation</p>
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-6 relative z-10">

                {phase === 'idle' && (
                    <div className="w-full max-w-xs mx-auto space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attack Volume (Invoices)</label>
                            <input
                                type="number"
                                value={targetVolume}
                                onChange={(e) => setTargetVolume(parseInt(e.target.value) || 10)}
                                className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-center"
                            />
                        </div>
                        <div className="text-[10px] text-center text-muted-foreground uppercase tracking-widest bg-background/50 py-1.5 rounded-lg border border-border/50">
                            Avg Risk / Unit: <span className="text-primary font-bold">{avgInvoiceAmount > 0 ? formatCurrency(avgInvoiceAmount) : 'N/A'}</span>
                        </div>
                        <button
                            onClick={startAnalysis}
                            className="group relative w-full py-4 rounded-xl bg-destructive/10 border-2 border-destructive/50 text-destructive hover:bg-destructive hover:text-white transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-destructive/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <div className="relative z-10 flex flex-col items-center gap-1">
                                <Play className="w-6 h-6" />
                                <div className="font-bold tracking-widest uppercase text-sm">Launch Stress Test</div>
                            </div>
                        </button>
                    </div>
                )}

                {phase === 'injecting' && (
                    <div className="flex flex-col items-center animate-pulse">
                        <Activity className="w-12 h-12 text-destructive mb-4" />
                        <div className="text-xl font-bold text-destructive tracking-widest uppercase">Breach Initiated...</div>
                        <div className="text-sm text-muted-foreground font-mono mt-2">Flooding network with synthetic invoices</div>
                    </div>
                )}

                {phase === 'catching' && (
                    <div className="flex flex-col items-center w-full max-w-xs mx-auto">
                        <CheckCircle2 className="w-12 h-12 text-primary mb-4 animate-bounce" />
                        <div className="text-xl font-bold text-primary tracking-widest uppercase mb-4">AI Defense Active</div>

                        <div className="w-full bg-muted rounded-full h-4 mb-2 overflow-hidden border border-border">
                            <div className="bg-primary h-full transition-all duration-300 glow-border" style={{ width: `${(invoicesProcessed / targetVolume) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between w-full text-sm font-mono text-muted-foreground mb-4">
                            <span>Processing (Real-time)</span>
                            <span className="text-primary font-bold">{invoicesProcessed} / {targetVolume}</span>
                        </div>
                        <div className="text-[10px] font-mono text-center text-primary/70 uppercase tracking-tighter">
                             Total Blocked: {formatCurrency(totalExposurePrevented)}
                        </div>
                        {estimatedDurationMs ? (
                            <div className="text-[10px] mt-2 font-mono text-center text-muted-foreground">
                                Backend ETA: {(estimatedDurationMs / 1000).toFixed(1)}s
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
            {errorMsg && (
                <div className="mt-3 p-2 bg-destructive/10 border border-destructive/30 rounded-lg text-[10px] text-destructive font-mono">
                    {errorMsg}
                </div>
            )}
        </div>
    );
}
