"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, Wallet, PieChart } from "lucide-react";

export const KPICards = () => {
    const { portfolio, loading } = usePortfolio();

    if (loading || !portfolio) {
        return <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-card rounded-2xl" />)}
        </div>;
    }

    const inversionInicial = portfolio.fondos.reduce((acc, f) => acc + f.importe, 0);
    const valorActual = portfolio.fondos.reduce((acc, f) => acc + (f.participaciones * f.NAV_actual), 0);
    const rendimientoAbs = valorActual - inversionInicial;
    const rendimientoPct = inverted_roi(inversionInicial, valorActual);

    function inverted_roi(initial: number, current: number) {
        if (initial === 0) return 0;
        return ((current - initial) / initial) * 100;
    }

    const kpis = [
        {
            title: "Valoración Actual",
            value: formatCurrency(valorActual),
            subtext: "Patrimonio Total",
            icon: Wallet,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Inversión Inicial",
            value: formatCurrency(inversionInicial),
            subtext: "Capital Aportado",
            icon: PieChart,
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        },
        {
            title: "Rendimiento Total",
            value: formatCurrency(rendimientoAbs),
            subtext: "Ganancia/Pérdida Absoluta",
            icon: TrendingUp,
            color: rendimientoAbs >= 0 ? "text-emerald-500" : "text-rose-500",
            bg: rendimientoAbs >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
        },
        {
            title: "Rentabilidad %",
            value: formatPercent(rendimientoPct),
            subtext: "Retorno sobre Inversión",
            icon: ArrowUpRight,
            color: rendimientoPct >= 0 ? "text-emerald-500" : "text-rose-500",
            bg: rendimientoPct >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, index) => (
                <motion.div
                    key={kpi.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                    <Card variant="glass" className="hover:shadow-xl hover:bg-card/80 cursor-default">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {kpi.title}
                            </CardTitle>
                            <div className={cn("p-2 rounded-full", kpi.bg)}>
                                <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.value}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {kpi.subtext}
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
};
