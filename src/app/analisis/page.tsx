"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { TrendingUp, Activity, AlertTriangle, ShieldCheck, Scale, ArrowRightLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function AnalysisPage() {
    const { portfolio, loading } = usePortfolio();
    const [activeTab, setActiveTab] = useState<"metrics" | "rebalance">("metrics");

    // State for calculated metrics
    const [calculatedMetrics, setCalculatedMetrics] = useState<{
        beta: number;
        alpha: number;
        sharpeRatio: number;
        volatility: number;
        comparisonData: any;
    } | null>(null);

    // --- EFFECT: CALCULATE PROJECTIONS ---
    useEffect(() => {
        if (!portfolio || !portfolio.fondos) return;

        // 1. CALCULATE WEIGHTED AVERAGE HISTORICAL RETURN INTERNALLY
        // (We use this only to ESTIMATE the 'Annual Return' and 'Volatility' of the current portfolio
        //  so we can project it into the future)

        const totalPortfolioValue = portfolio.fondos.reduce((sum, f) => sum + (f.participaciones * f.NAV_actual), 0);
        if (totalPortfolioValue === 0) return;

        // Map: "YYYY-MM" -> { weightedReturnSum: number, totalWeight: number }
        const monthlyPortfolioReturns = new Map<string, { weightedReturnSum: number; totalWeight: number }>();
        const allDatesSet = new Set<string>();

        portfolio.fondos.forEach(fund => {
            if (fund.historial && fund.historial.length > 1) {
                // Determine Fund Weight
                const fundValue = fund.participaciones * fund.NAV_actual;
                const weight = fundValue / totalPortfolioValue;

                // Sort history
                const sortedHistory = [...fund.historial].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

                // Calculate Monthly Returns for this fund
                for (let i = 1; i < sortedHistory.length; i++) {
                    const prev = sortedHistory[i - 1].valor;
                    const curr = sortedHistory[i].valor;
                    const d = new Date(sortedHistory[i].fecha);
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

                    if (prev > 0) {
                        const fundReturn = (curr - prev) / prev;
                        // Avoid crazy outliers (e.g. > 50% in a month which might be bad data)
                        if (Math.abs(fundReturn) < 0.50) {
                            const currentMonthData = monthlyPortfolioReturns.get(key) || { weightedReturnSum: 0, totalWeight: 0 };
                            currentMonthData.weightedReturnSum += fundReturn * weight;
                            currentMonthData.totalWeight += weight;
                            monthlyPortfolioReturns.set(key, currentMonthData);
                            allDatesSet.add(key);
                        }
                    }
                }
            }
        });

        // Consolidate historical returns to get statistics
        const sortedKeys = Array.from(allDatesSet).sort();
        const historicalReturns: number[] = [];

        sortedKeys.forEach(key => {
            const data = monthlyPortfolioReturns.get(key);
            if (data && data.totalWeight > 0.5) {
                // Only consider months where we have data for at least 50% of the portfolio to be significant
                historicalReturns.push(data.weightedReturnSum / data.totalWeight);
            }
        });

        // DEFAULT PARAMETERS if not enough history
        let annualVol = 0.10; // Default 10%
        let annualReturn = 0.08; // Default 8%

        if (historicalReturns.length >= 2) {
            const meanMonthly = historicalReturns.reduce((a, b) => a + b, 0) / historicalReturns.length;
            const varMonthly = historicalReturns.reduce((sum, r) => sum + Math.pow(r - meanMonthly, 2), 0) / historicalReturns.length;

            // Annualize (approx)
            annualReturn = Math.pow(1 + meanMonthly, 12) - 1;
            const stdDevMonthly = Math.sqrt(varMonthly);
            annualVol = stdDevMonthly * Math.sqrt(12);
        }

        // --- COMPUTE METRICS (Display Values) ---
        // Volatility
        const volatility = annualVol;

        // Sharpe (Risk Free 3%)
        const rf = 0.03;
        const sharpeRatio = volatility === 0 ? 0 : (annualReturn - rf) / volatility;

        // Beta/Alpha (vs Synthetic 7% Benchmark with 15% Vol)
        // We simulate a correlation of ~0.8 for a diversified portfolio
        const marketReturn = 0.07;
        const marketVol = 0.15;
        const correlation = 0.85;
        const beta = (correlation * volatility) / marketVol;
        const alpha = annualReturn - (rf + beta * (marketReturn - rf));


        // --- FUTURE PROJECTION CHART (10 YEARS) ---
        // Generate data points for next 10 years (Annual Steps)
        const projectionYears = 10;
        const currentYear = new Date().getFullYear();
        const chartLabels = [];
        const portProj = [100]; // Indexed at 100
        const benchProj = [100]; // Indexed at 100

        for (let i = 0; i <= projectionYears; i++) {
            chartLabels.push((currentYear + i).toString());
            if (i > 0) {
                // Portfolio: Compound Annual Return
                portProj.push(portProj[i - 1] * (1 + annualReturn));
                // Benchmark: Compound 7% projected
                benchProj.push(benchProj[i - 1] * (1 + 0.07));
            }
        }

        const comparisonData = {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Proyección Cartera (Estimada)',
                    data: portProj,
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.5)',
                    tension: 0.4,
                },
                {
                    label: 'Objetivo 7% Anual',
                    data: benchProj,
                    borderColor: 'rgba(148, 163, 184, 1)',
                    backgroundColor: 'rgba(148, 163, 184, 0.5)',
                    borderDash: [5, 5],
                    tension: 0.4,
                }
            ]
        };

        setCalculatedMetrics({ beta, alpha, sharpeRatio, volatility, comparisonData });
    }, [portfolio]);

    const chartOptions = {
        responsive: true,
        plugins: { legend: { position: 'top' as const, labels: { color: '#a1a1aa' } } },
        interaction: { mode: 'index' as const, intersect: false },
        scales: {
            x: { grid: { display: false }, ticks: { color: '#71717a' } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#71717a' } }
        }
    };

    // --- RENDER CONDITIONALS (AFTER HOOKS) ---
    if (loading) return <div className="p-12 text-center animate-pulse">Cargando análisis...</div>;
    if (!portfolio) return <div className="p-12 text-center">Cartera no disponible.</div>;

    // --- SHARED DATA ---
    const totalValue = portfolio.fondos.reduce((sum, f) => sum + (f.participaciones * f.NAV_actual), 0);
    const equityCount = portfolio.fondos.filter(f => f.categoria.includes('Renta Variable') || f.categoria.includes('Acciones')).length;

    // --- REBALANCE TAB LOGIC ---
    // 1. Group by category
    const currentAllocation = portfolio.fondos.reduce((acc, f) => {
        const val = f.participaciones * f.NAV_actual;
        acc[f.categoria] = (acc[f.categoria] || 0) + val;
        return acc;
    }, {} as Record<string, number>);

    // 2. Define Mock Target Allocation (In a real app, user would set this)
    const categories = Object.keys(currentAllocation);
    const targetPct = 1 / categories.length; // Equal weight for simplicity

    const rebalanceSuggestions = categories.map(cat => {
        const currentVal = currentAllocation[cat];
        const currentPct = currentVal / totalValue;
        const targetVal = totalValue * targetPct;
        const diff = targetVal - currentVal;

        return {
            category: cat,
            currentVal,
            currentPct,
            targetPct,
            diff, // Positive = Buy, Negative = Sell
            action: diff > 0 ? 'COMPRAR' : 'VENDER'
        };
    });

    const rebalanceData = {
        labels: categories,
        datasets: [
            {
                label: 'Actual',
                data: categories.map(c => currentAllocation[c]),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
            },
            {
                label: 'Objetivo (Equiponderado)',
                data: categories.map(() => totalValue * targetPct),
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
            }
        ]
    };

    return (
        <main className="min-h-screen p-8 md:p-12 space-y-8 bg-background pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Análisis y Simulación</h1>
                    <p className="text-muted-foreground mt-2">
                        Herramientas avanzadas para la toma de decisiones.
                    </p>
                </div>
                <div className="flex p-1 bg-secondary rounded-lg">
                    <button
                        onClick={() => setActiveTab("metrics")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'metrics' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Métricas Globales
                    </button>
                    <button
                        onClick={() => setActiveTab("rebalance")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'rebalance' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Rebalanceo
                    </button>
                </div>
            </div>

            {activeTab === 'metrics' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {!calculatedMetrics ? (
                        <div className="p-12 text-center text-muted-foreground">Calculando métricas con datos históricos...</div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <Card variant="glass">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Volatilidad (Anual)</CardTitle>
                                        <Activity className="h-4 w-4 text-orange-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{formatPercent(calculatedMetrics.volatility * 100)}</div>
                                        <p className="text-xs text-muted-foreground">Desv. Estándar de retornos</p>
                                    </CardContent>
                                </Card>
                                <Card variant="glass">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Beta</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{calculatedMetrics.beta.toFixed(2)}</div>
                                        <p className="text-xs text-muted-foreground">Sensibilidad vs Benchmark</p>
                                    </CardContent>
                                </Card>
                                <Card variant="glass">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Ratio Sharpe</CardTitle>
                                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{calculatedMetrics.sharpeRatio.toFixed(2)}</div>
                                        <p className="text-xs text-muted-foreground">Rentabilidad ajustada al riesgo</p>
                                    </CardContent>
                                </Card>
                                <Card variant="glass">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Alpha (Estimado)</CardTitle>
                                        <AlertTriangle className={`h-4 w-4 ${calculatedMetrics.alpha >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-2xl font-bold ${calculatedMetrics.alpha >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {calculatedMetrics.alpha > 0 ? '+' : ''}{formatPercent(calculatedMetrics.alpha * 100)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Exceso de retorno</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <Card className="lg:col-span-2 min-h-[400px]">
                                    <CardHeader>
                                        <CardTitle>Comparativa vs Mercado (Indexado 100)</CardTitle>
                                        <CardDescription>Proyección estimada a 10 años (Interés Compuesto).</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[350px]">
                                        <Line data={calculatedMetrics.comparisonData} options={chartOptions} />
                                    </CardContent>
                                </Card>

                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Diagnóstico de Cartera</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 text-sm">
                                            <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                                                <h4 className="font-semibold mb-1 text-primary">Diversificación</h4>
                                                <p className="text-muted-foreground">
                                                    {equityCount > 2
                                                        ? "Adecuada exposición a renta variable. La correlación entre activos parece equilibrada."
                                                        : "Se recomienda aumentar la diversificación en sectores defensivos."}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-secondary/30 rounded-lg border border-border">
                                                <h4 className="font-semibold mb-1 text-primary">Eficiencia</h4>
                                                <p className="text-muted-foreground">
                                                    {calculatedMetrics.sharpeRatio > 1
                                                        ? "El ratio Sharpe indica una excelente gestión del riesgo por unidad de retorno."
                                                        : "La cartera asume un riesgo elevado para el retorno actual. Considere activos de menor volatilidad."}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'rebalance' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-primary" />
                                    Análisis de Desviación (Modelo Equiponderado)
                                </CardTitle>
                                <CardDescription>Comparativa entre asignación actual y objetivo ideal.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <Bar
                                    data={rebalanceData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                                            x: { grid: { display: false } }
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>

                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowRightLeft className="w-5 h-5 text-primary" />
                                    Órdenes Sugeridas
                                </CardTitle>
                                <CardDescription>Acciones para reequilibrar la cartera.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 overflow-y-auto max-h-[400px]">
                                {rebalanceSuggestions.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border border-border rounded-lg bg-secondary/20">
                                        <div className="space-y-1">
                                            <p className="font-medium text-sm">{item.category}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Actual: {formatPercent(item.currentPct * 100)} → Obj: {formatPercent(item.targetPct * 100)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs font-bold px-2 py-1 rounded ${item.action === 'COMPRAR'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-rose-500/20 text-rose-400'
                                                }`}>
                                                {item.action}
                                            </span>
                                            <p className="text-xs font-mono mt-1">
                                                {formatCurrency(Math.abs(item.diff))}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <Button className="w-full mt-4" variant="outline">
                                    Exportar Plan de Rebalanceo (PDF)
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </main>
    );
}
