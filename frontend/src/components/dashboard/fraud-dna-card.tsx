import { Fingerprint, RefreshCcw } from "lucide-react";

interface BreakdownItem {
    factor: string;
    points?: number | string;
    detail?: string;
}

interface FraudDnaProps {
    dna?: {
        typology: string;
        confidence: number;
        evidence: string[];
        action?: string;
    } | null;
    isLoading?: boolean;
    breakdown?: BreakdownItem[];
    /** Set when the user picked a queue row (even before detail fetch completes). */
    hasSelection?: boolean;
}

function factorPoints(b: BreakdownItem): number {
    if (typeof b.points === "number") return b.points;
    if (typeof b.points === "string" && b.points.startsWith("x")) return 20;
    const n = parseInt(String(b.points), 10);
    return Number.isFinite(n) ? n : 0;
}

export function FraudDnaCard({ dna, isLoading, breakdown, hasSelection = false }: FraudDnaProps) {
    const factorRows =
        breakdown?.filter((b) => b.factor && b.factor !== "centrality_multiplier").slice(0, 6) ?? [];
    const maxPts = Math.max(1, ...factorRows.map(factorPoints));

    return (
        <div className="bg-card rounded-2xl p-6 glow-card border border-destructive/20 h-full flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h2 className="text-lg font-semibold text-foreground glow-text flex items-center gap-2">
                        <Fingerprint className="w-5 h-5 text-destructive" />
                        Fraud DNA Classifier
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Typology derived from the latest risk audit breakdown</p>
                </div>
                {isLoading && <RefreshCcw className="w-4 h-4 text-primary animate-spin" />}
            </div>

            <div className="flex-1 flex flex-col gap-6 relative z-10">
                {!hasSelection ? (
                    <div className="text-center p-4 rounded-xl border bg-muted/10 border-border">
                        <div className="text-xs font-bold uppercase tracking-wider mb-1 text-muted-foreground">No invoice selected</div>
                        <div className="text-sm text-muted-foreground">Choose a row in the Live Invoice Queue to load Fraud DNA.</div>
                    </div>
                ) : isLoading ? (
                    <div className="text-center p-4 rounded-xl border border-border/50 text-sm text-muted-foreground">Loading invoice analysis…</div>
                ) : !dna ? (
                    <div className="text-center p-4 rounded-xl border border-destructive/20 text-sm text-muted-foreground">
                        Could not load Fraud DNA for this invoice.
                    </div>
                ) : (
                    <>
                        <div
                            className={`text-center p-4 rounded-xl border transition-colors ${
                                dna.typology === "LOW_RISK_PROFILE"
                                    ? "bg-primary/5 border-primary/30"
                                    : "border-destructive/30 bg-destructive/10"
                            }`}
                        >
                            <div
                                className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                                    dna.typology === "LOW_RISK_PROFILE" ? "text-primary" : "text-destructive"
                                }`}
                            >
                                Primary typology
                            </div>
                            <div className="text-xl font-black tracking-tight text-foreground uppercase">
                                {dna.typology.replace(/_/g, " ")}
                            </div>
                            <div
                                className={`text-sm font-mono mt-1 ${
                                    dna.typology === "LOW_RISK_PROFILE" ? "text-primary" : "text-destructive"
                                }`}
                            >
                                {dna.confidence}% confidence
                            </div>
                        </div>

                        {factorRows.length > 0 && (
                            <div className="space-y-3">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Contributing factors (from audit)
                                </div>
                                {factorRows.map((t, i) => {
                                    const pts = factorPoints(t);
                                    const width = Math.min(100, Math.round((pts / maxPts) * 100));
                                    return (
                                        <div key={`${t.factor}-${i}`} className="flex items-center gap-4">
                                            <div className="w-36 text-xs font-medium text-foreground truncate" title={t.factor}>
                                                {t.factor.replace(/_/g, " ")}
                                            </div>
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-destructive/70 transition-all duration-500"
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                            <div className="text-xs font-mono font-bold w-12 text-right">
                                                {typeof t.points === "number" ? t.points : t.points}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {dna.evidence && dna.evidence.length > 0 && (
                            <div className="mt-2 space-y-1">
                                <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Evidence</div>
                                {dna.evidence.map((ev, i) => (
                                    <div key={i} className="text-[10px] text-muted-foreground font-mono leading-tight flex gap-2">
                                        <span className="text-destructive shrink-0">•</span>
                                        <span>{ev}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {dna.action && (
                            <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-3 leading-relaxed">{dna.action}</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
