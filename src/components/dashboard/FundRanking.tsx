"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export const FundRanking = () => {
    const { portfolio } = usePortfolio();

    if (!portfolio || portfolio.fondos.length === 0) return null;

    // Calc returns
    const fundsWithReturn = portfolio.fondos.map(f => {
        const initialVal = f.importe;
        const currentVal = f.participaciones * f.NAV_actual;
        const pct = (currentVal - initialVal) / initialVal; // removed * 100 here to let formatPercent handle it, or check formatPercent implementation
        // utils formatPercent usually takes decimal 0.10 for 10% or 10 for 10%? 
        // Let's assume decimal based on standard, but checking previous usage:
        // FundDetailContent: const rentabilidadPct = (rentabilidad / fund.importe) * 100;
        // So formatPercent likely expects the number as 10.5 for 10.5%. Let's stick to multiplication.
        return {
            ...f,
            returnPct: ((currentVal - initialVal) / initialVal) * 100
        };
    });

    const sorted = [...fundsWithReturn].sort((a, b) => b.returnPct - a.returnPct);
    const top5 = sorted.slice(0, 5);
    const bottom5 = [...sorted].reverse().slice(0, 5);

    const RankingTable = ({ funds, type }: { funds: typeof top5, type: 'top' | 'bottom' }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border/50 text-xs text-muted-foreground bg-secondary/20">
                        <th className="py-2 px-3 text-left font-medium w-[70%]">Fondo</th>
                        <th className="py-2 px-3 text-right font-medium">Rentabilidad</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                    {funds.map((f) => (
                        <tr key={f.ISIN} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2 px-3 truncate max-w-[200px]" title={f.denominacion}>
                                {f.denominacion}
                            </td>
                            <td className={`py-2 px-3 text-right font-semibold ${f.returnPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {formatPercent(f.returnPct)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Top 5 Rentabilidad
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <RankingTable funds={top5} type="top" />
                </CardContent>
            </Card>

            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingDown className="w-4 h-4 text-rose-500" />
                        Bottom 5 Rentabilidad
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <RankingTable funds={bottom5} type="bottom" />
                </CardContent>
            </Card>
        </div>
    );
};
