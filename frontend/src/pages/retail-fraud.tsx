import { Database } from "lucide-react";
import { RetailNetworkGraph } from "@/components/dashboard/retail-network-graph";

export default function RetailFraudPage() {
    return (
        <div className="flex-1 overflow-auto bg-transparent p-4 md:p-8 custom-scrollbar flex flex-col h-full">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-foreground glow-text tracking-tight flex items-center gap-3">
                        <Database className="w-8 h-8 text-warning" />
                        Retail Fraud Map
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-sm flex items-center gap-2">
                        Dynamic detection of Mule Networks & Carousel Payment Loops
                        <span className="px-2 py-0.5 rounded bg-warning/20 text-warning text-xs border border-warning/30 font-bold animate-pulse">
                            LIVE
                        </span>
                    </p>
                </div>
            </header>

            {/* Main Graph Area */}
            <div className="flex-1 min-h-[600px] border-t border-border/50 pt-8 mt-2 relative">
                <RetailNetworkGraph />
            </div>
        </div>
    );
}
