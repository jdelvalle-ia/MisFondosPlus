"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, TrendingUp, TrendingDown, Building2, Tag, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Line } from "react-chartjs-2";
import { useEffect, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js';
import { IFondo } from "@/types";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

interface FundDetailContentProps {
    isin: string;
}

export const FundDetailContent = ({ isin }: FundDetailContentProps) => {
    const { portfolio, loading } = usePortfolio();
    const router = useRouter();
    const [fund, setFund] = useState<IFondo | null>(null);

    // State for simulated history
    const [historyData, setHistoryData] = useState<{
        enrichedHistory: any[];
        chartData: any;
        historyMonths: number;
    } | null>(null);

    const valorActual = fund ? fund.participaciones * fund.NAV_actual : 0;
    const rentabilidad = fund ? valorActual - fund.importe : 0;
    const rentabilidadPct = fund ? (rentabilidad / fund.importe) * 100 : 0;
    const isPositive = rentabilidad >= 0;

    useEffect(() => {
        if (!loading && portfolio) {
            const found = portfolio.fondos.find(f => f.ISIN === isin);
            if (found) {
                setFund(found);
            }
        }
    }, [portfolio, loading, isin]);

    useEffect(() => {
        if (!fund) return;

        // Calculate months since purchase or default to 24 if purchase is recent
        const purchaseDate = new Date(fund.fecha_compra);
        const today = new Date();
        const monthsSincePurchase = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth());
        const historyMonths = Math.max(monthsSincePurchase, 24);

        // Check if we have real history
        let historyDataPoints;

        if (fund.historial && fund.historial.length > 2) {
            // USE REAL DATA
            historyDataPoints = fund.historial.map(h => ({
                fecha: h.fecha.split('T')[0],
                valor: h.valor / fund.participaciones, // Restore Unit NAV
                valorTotal: h.valor
            }));
            // Sort by date ascending just in case
            historyDataPoints.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        } else {
            // USE SIMULATED DATA (Fallback)
            historyDataPoints = Array.from({ length: historyMonths + 1 }, (_, i) => {
                const d = new Date();
                d.setMonth(d.getMonth() - (historyMonths - i));

                const progress = i / historyMonths;
                const base = (fund.importe / fund.participaciones);
                const target = fund.NAV_actual;

                const trend = base + (target - base) * progress;
                const volatility = base * 0.05;
                const noise = (Math.random() - 0.5) * volatility;

                const nav = Math.max(0, trend + noise);

                return {
                    fecha: d.toISOString().split('T')[0],
                    valor: nav,
                    valorTotal: nav * fund.participaciones
                };
            });
        }

        const enrichedHistory = historyDataPoints.map((point, index, array) => {
            const pointDate = new Date(point.fecha);
            const currentYear = pointDate.getFullYear();

            // Find baseline for YTD: Last value of previous year
            const prevYearClose = [...array]
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) // Sort desc
                .find(p => {
                    const d = new Date(p.fecha);
                    return d.getFullYear() === currentYear - 1;
                });

            // Fallback: Use the very first data point of the current year (start of investment/history)
            const firstOfCurrentYear = array.find(p => new Date(p.fecha).getFullYear() === currentYear);

            // Baseline is ideally Close of Prev Year. If not, Open of Curr Year.
            const baseline = prevYearClose || firstOfCurrentYear || point;

            const ytdReturn = baseline.valor > 0
                ? ((point.valor - baseline.valor) / baseline.valor) * 100
                : 0;

            return {
                ...point,
                rendimientoAnual: ytdReturn
            };
        });

        const chartData = {
            labels: enrichedHistory.map(h => formatDate(h.fecha)),
            datasets: [
                {
                    label: 'Valor Liquidativo',
                    data: enrichedHistory.map(h => h.valor),
                    borderColor: isPositive ? 'rgba(16, 185, 129, 1)' : 'rgba(244, 63, 94, 1)',
                    backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                    fill: true,
                    tension: 0.4,
                }
            ]
        };

        setHistoryData({ enrichedHistory, chartData, historyMonths });
        console.log("📊 [DEBUG COMPONENT HISTORY]:", enrichedHistory.length, "items", enrichedHistory);

    }, [fund, isPositive]); // Re-run if fund changes

    if (loading) return <div className="p-12 text-center">Cargando datos del fondo...</div>;
    if (!portfolio) return <div className="p-12 text-center">Cartera no disponible.</div>;
    if (!fund) return <div className="p-12 text-center">Fondo no encontrado ({isin}). <Link href="/fondos" className="text-primary underline">Volver</Link></div>;


    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => formatCurrency(context.raw)
                }
            }
        },
        scales: {
            x: { grid: { display: false } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' } }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Link href="/fondos" className="hover:text-foreground transition-colors">Fondos</Link>
                        <span>/</span>
                        <span>{fund.ISIN}</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">{fund.denominacion}</h1>
                    <div className="flex flex-wrap gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground border border-border">
                            <Building2 className="w-3 h-3 mr-2 opacity-70" />
                            {fund.gestora}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground border border-border">
                            <Tag className="w-3 h-3 mr-2 opacity-70" />
                            {fund.categoria}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-secondary text-secondary-foreground border border-border">
                            <Calendar className="w-3 h-3 mr-2 opacity-70" />
                            Comprado el {formatDate(fund.fecha_compra)}
                        </span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card variant="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Valor Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(valorActual)}</div>
                        <p className="text-xs text-muted-foreground">{fund.participaciones} part. x {formatCurrency(fund.NAV_actual)}</p>
                    </CardContent>
                </Card>
                <Card variant="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rentabilidad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold flex items-center gap-2 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            {formatCurrency(rentabilidad)}
                        </div>
                        <p className={`text-xs ${isPositive ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                            {formatPercent(rentabilidadPct)} retorno total
                        </p>
                    </CardContent>
                </Card>
                <Card variant="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Inversión Inicial</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{formatCurrency(fund.importe)}</div>
                        <p className="text-xs text-muted-foreground">Coste base</p>
                    </CardContent>
                </Card>
                <Card variant="glass">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">NAV Fecha</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">{formatCurrency(fund.NAV_actual)}</div>
                        <p className="text-xs text-muted-foreground">{formatDate(fund.fecha_NAV)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card className="h-[400px]">
                        <CardHeader>
                            <CardTitle>Evolución del valor ({fund.historial && fund.historial.length > 2 ? 'Datos reales' : 'Simulado'})</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[320px]">
                            {historyData ? (
                                <Line data={historyData.chartData} options={chartOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">Generando gráfico...</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col mt-6 h-[500px]">
                        <CardHeader>
                            <CardTitle>Tabla Histórica ({historyData ? historyData.enrichedHistory.length : '...'} meses)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0">
                            <div className="h-full overflow-y-auto pr-2 custom-scrollbar p-6 pt-0">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-muted-foreground sticky top-0 bg-card z-10 bg-opacity-100 py-2">
                                        <tr className="border-b border-border">
                                            <th className="text-left pb-2 pl-2 bg-card">Fecha</th>
                                            <th className="text-right pb-2 bg-card">Valor Liq.</th>
                                            <th className="text-right pb-2 bg-card">Valor Total</th>
                                            <th className="text-right pb-2 pr-2 bg-card">Rend. Año (YTD)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {historyData && [...historyData.enrichedHistory].reverse().map((h, i) => (
                                            <tr key={i} className="hover:bg-muted/50 transition-colors">
                                                <td className="py-2 pl-2 text-muted-foreground">{formatDate(h.fecha)}</td>
                                                <td className="py-2 text-right font-mono">{formatCurrency(h.valor)}</td>
                                                <td className="py-2 text-right font-mono font-medium">{formatCurrency(h.valorTotal)}</td>
                                                <td className={`py-2 text-right pr-2 ${h.rendimientoAnual >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {formatPercent(h.rendimientoAnual)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datos Técnicos</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between border-b border-border pb-2">
                                <span className="text-muted-foreground">Moneda</span>
                                <span className="font-medium">{fund.moneda || 'EUR'}</span>
                            </div>
                            <div className="flex justify-between border-b border-border pb-2">
                                <span className="text-muted-foreground">Comisiones</span>
                                <span className="font-medium">{formatCurrency(fund.comisiones)}</span>
                            </div>
                            <div className="flex justify-between border-b border-border pb-2">
                                <span className="text-muted-foreground">ISIN</span>
                                <span className="font-mono text-xs bg-secondary px-2 py-1 rounded">{fund.ISIN}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
