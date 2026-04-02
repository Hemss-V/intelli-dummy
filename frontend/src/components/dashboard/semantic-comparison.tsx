import { FileText, Cpu, AlertTriangle, RefreshCcw } from "lucide-react";

interface SemanticComparisonProps {
    data?: {
        invoiceDescription: string;
        poDescription: string;
        grnDescription: string;
    } | null;
    isLoading?: boolean;
    breakdown?: any[];
    /** When false, show “select an invoice” empty state */
    hasSelection?: boolean;
}

export function SemanticComparison({ data, isLoading, breakdown, hasSelection = false }: SemanticComparisonProps) {
    const semanticMismatch = breakdown?.find(
        (b) =>
            b.factor === "semantic_mismatch" ||
            b.factor === "vague_description" ||
            b.factor === "templated_invoices"
    );

    const mismatchDetail = semanticMismatch?.detail as string | undefined;

    const isEmptyDoc =
        !data?.invoiceDescription?.trim() &&
        !data?.poDescription?.trim() &&
        !data?.grnDescription?.trim();

    return (
        <div className="bg-card rounded-2xl p-6 glow-card border border-warning/30 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-foreground glow-text flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-warning" />
                        Semantic Verification
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">PO / invoice / GRN text used in the risk engine semantic layer</p>
                </div>
                {isLoading ? (
                    <RefreshCcw className="w-4 h-4 text-warning animate-spin" />
                ) : semanticMismatch ? (
                    <div className="px-3 py-1 bg-warning/10 border border-warning/20 text-warning text-xs font-bold rounded-full flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        Flagged
                    </div>
                ) : hasSelection && !isEmptyDoc ? (
                    <div className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-full">
                        No semantic flags
                    </div>
                ) : null}
            </div>

            {!hasSelection ? (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-muted-foreground border border-dashed border-border/60 rounded-xl">
                    Select an invoice in the queue to load PO, invoice, and GRN fields from the database.
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background/50 border border-border/50 rounded-xl p-4 flex flex-col min-h-[120px]">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-border/50 pb-2">
                            <FileText className="w-3 h-3" /> Purchase Order
                        </div>
                        <div className="text-[11px] text-foreground/80 font-mono leading-relaxed mt-2 flex-1 break-words">
                            {data?.poDescription?.trim() ? `"${data.poDescription}"` : "— No goods category on linked PO —"}
                        </div>
                    </div>

                    <div
                        className={`rounded-xl p-4 flex flex-col min-h-[120px] relative ${
                            semanticMismatch ? "bg-warning/5 border border-warning/30" : "bg-background/50 border border-border/50"
                        }`}
                    >
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-border/50 pb-2">
                            <FileText className={`w-3 h-3 ${semanticMismatch ? "text-warning" : ""}`} /> Invoice
                        </div>
                        <div className="text-[11px] text-foreground/80 font-mono leading-relaxed mt-2 flex-1 break-words">
                            {data?.invoiceDescription?.trim() ? `"${data.invoiceDescription}"` : "— No goods category on invoice —"}
                        </div>
                        {semanticMismatch && mismatchDetail && (
                            <div className="mt-2 p-2 bg-warning/10 rounded border border-warning/20 text-[10px] text-warning">
                                {mismatchDetail}
                            </div>
                        )}
                    </div>

                    <div className="bg-background/50 border border-border/50 rounded-xl p-4 flex flex-col min-h-[120px]">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-border/50 pb-2">
                            <FileText className="w-3 h-3" /> Goods receipt
                        </div>
                        <div className="text-[11px] text-foreground/80 font-mono leading-relaxed mt-2 flex-1 break-words">
                            {data?.grnDescription?.trim()
                                ? `"${data.grnDescription}"`
                                : "— No receipt amount on linked GRN —"}
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-4 p-3 bg-muted/20 border border-border/50 rounded-lg text-xs leading-relaxed text-muted-foreground">
                <span className="font-bold text-warning mr-1">How this is used:</span>
                {semanticMismatch
                    ? `The risk engine recorded factor "${String(semanticMismatch.factor).replace(/_/g, " ")}". Descriptions above are loaded from your PO, invoice, and GRN rows (not hardcoded).`
                    : hasSelection
                      ? "The semantic layer runs at scoring time (Gemini, when configured). Matching text here reduces phantom-invoice signals; empty fields limit what the model can compare."
                      : "Choose an invoice to inspect stored document text."}
            </div>
        </div>
    );
}
