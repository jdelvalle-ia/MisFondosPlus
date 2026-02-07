"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { useState } from "react";
import { Terminal, X, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export const AuditConsole = () => {
    const { logs, isConsoleOpen, toggleConsole } = usePortfolio();
    const [isMinimized, setIsMinimized] = useState(false);

    if (!isConsoleOpen) return null;

    return (
        <div className={cn(
            "fixed bottom-6 right-6 z-50 bg-black/90 border border-green-900 rounded-lg shadow-2xl font-mono text-green-400 transition-all duration-300 flex flex-col",
            isMinimized ? "w-64 h-12" : "w-[600px] h-96"
        )}>
            <div className="flex items-center justify-between p-2 border-b border-green-900 bg-green-950/20 rounded-t-lg">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    AUDIT_IS: ACTIVE
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:text-white transition-colors">
                        {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
                    </button>
                    <button onClick={toggleConsole} className="p-1 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="flex-1 overflow-y-auto p-3 space-y-1 text-xs scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent">
                    {logs.length === 0 && <div className="text-green-800 italic opacity-50">System initialized. Waiting for events...</div>}
                    {logs.map((log, i) => (
                        <div key={i} className="break-words border-l-2 border-green-900 pl-2 opacity-90 hover:opacity-100 hover:bg-green-900/10">
                            {log}
                        </div>
                    ))}
                    <div className="text-green-500/30 pt-2 animate-pulse">_</div>
                </div>
            )}
        </div>
    );
};
