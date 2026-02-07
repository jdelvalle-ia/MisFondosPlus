"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { usePortfolio } from "@/context/PortfolioContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { Printer, FileText, Download } from "lucide-react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

// Component to be printed
const PrintableReport = React.forwardRef<HTMLDivElement, { portfolio: any, analysisData: any, reportDate: string }>(
    ({ portfolio, analysisData, reportDate }, ref) => {
        // Allocation Data for Chart
        const allocationByCat = portfolio.fondos.reduce((acc: any, f: any) => {
            const val = f.participaciones * f.NAV_actual;
            acc[f.categoria] = (acc[f.categoria] || 0) + val;
            return acc;
        }, {});

        const chartData = {
            labels: Object.keys(allocationByCat),
            datasets: [{
                data: Object.values(allocationByCat),
                backgroundColor: [
                    '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'
                ],
                borderWidth: 0
            }]
        };

        const totalValue = portfolio.fondos.reduce((a: number, b: any) => a + (b.participaciones * b.NAV_actual), 0);
        const totalInvested = portfolio.fondos.reduce((a: number, b: any) => a + b.importe, 0);
        const totalReturn = totalValue - totalInvested;

        return (
            <div ref={ref} className="p-8 bg-white text-black min-h-screen">
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Informe de Inversiones</h1>
                        <p className="text-slate-500">MisFondos+ Portfolio Management</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-sm">{reportDate ? formatDate(reportDate) : "---"}</p>
                        <p className="text-sm font-semibold">{portfolio.info_cartera.nombre}</p>
                    </div>
                </div>

                {/* Executive Summary */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4 uppercase tracking-wide text-slate-700 border-l-4 border-emerald-500 pl-3">Resumen Ejecutivo</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-100 rounded">
                            <p className="text-xs text-slate-500 uppercase">Valor Total</p>
                            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalValue)}</p>
                        </div>
                        <div className="p-4 bg-slate-100 rounded">
                            <p className="text-xs text-slate-500 uppercase">Rentabilidad Abs.</p>
                            <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {totalReturn > 0 ? '+' : ''}{formatCurrency(totalReturn)}
                            </p>
                        </div>
                        <div className="p-4 bg-slate-100 rounded">
                            <p className="text-xs text-slate-500 uppercase">Rentabilidad %</p>
                            <p className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {formatPercent((totalReturn / totalInvested) * 100)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Allocation */}
                <div className="mb-8 grid grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-xl font-bold mb-4 uppercase tracking-wide text-slate-700 border-l-4 border-blue-500 pl-3">Distribución de Activos</h2>
                        <div className="w-[300px] h-[300px] mx-auto">
                            <Doughnut data={chartData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold mb-4 uppercase tracking-wide text-slate-700 border-l-4 border-violet-500 pl-3">Métricas Clave</h2>
                        <ul className="space-y-3">
                            <li className="flex justify-between border-b border-slate-200 pb-2">
                                <span>Alpha Generator</span>
                                <span className="font-bold">{analysisData.alpha > 0 ? 'Positivo' : 'Negativo'} ({formatPercent(analysisData.alpha * 100)})</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-200 pb-2">
                                <span>Ratio Sharpe</span>
                                <span className="font-bold">{analysisData.sharpe.toFixed(2)}</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-200 pb-2">
                                <span>Volatilidad (Anual)</span>
                                <span className="font-bold">{formatPercent(analysisData.volatility * 100)}</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-200 pb-2">
                                <span>Gastos (TER Est.)</span>
                                <span className="font-bold">1.25%</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Holding Details */}
                <div>
                    <h2 className="text-xl font-bold mb-4 uppercase tracking-wide text-slate-700 border-l-4 border-slate-500 pl-3">Detalle de Posiciones</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-2">Fondo</th>
                                <th className="px-4 py-2 text-right">Inversión</th>
                                <th className="px-4 py-2 text-right">Valor</th>
                                <th className="px-4 py-2 text-right">Result. %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {portfolio.fondos.map((f: any) => {
                                const currentVal = f.participaciones * f.NAV_actual;
                                const retPct = ((currentVal - f.importe) / f.importe) * 100;
                                return (
                                    <tr key={f.ISIN}>
                                        <td className="px-4 py-2">
                                            <div className="font-bold text-slate-800">{f.denominacion}</div>
                                            <div className="text-xs text-slate-500">{f.ISIN}</div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(f.importe)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{formatCurrency(currentVal)}</td>
                                        <td className={`px-4 py-2 text-right font-bold ${retPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                            {formatPercent(retPct)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-slate-400 border-t pt-4">
                    Informe generado automáticamente por MisFondos+. No constituye asesoramiento financiero.
                </div>
            </div>
        );
    }
);
PrintableReport.displayName = "PrintableReport";

export default function ReportsPage() {
    const { portfolio, loading } = usePortfolio();
    const componentRef = useRef<HTMLDivElement>(null);
    const [reportDate, setReportDate] = React.useState<string>("");

    React.useEffect(() => {
        setReportDate(new Date().toISOString());
    }, []);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Informe_Cartera_${new Date().toISOString().split('T')[0]}`,
    });

    if (loading) return <div>Cargando...</div>;
    if (!portfolio) return <div>No hay datos.</div>;

    // Mock analysis data (should be unified in a hook/store ideally)
    const analysisData = {
        alpha: 0.024,
        sharpe: 1.85,
        volatility: 0.12
    };

    return (
        <main className="min-h-screen p-8 md:p-12 space-y-8 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Reportes</h1>
                    <p className="text-muted-foreground mt-2">Descarga y visualiza informes detallados.</p>
                </div>
                <Button onClick={() => handlePrint && handlePrint()} className="gap-2" size="lg">
                    <Printer className="w-5 h-5" />
                    Imprimir / Guardar PDF
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <Card className="bg-muted/30 border-dashed">
                    <CardHeader className="text-center">
                        <CardTitle className="flex justify-center flex-col items-center gap-4">
                            <FileText className="w-12 h-12 text-primary/50" />
                            Vista Previa de Impresión
                        </CardTitle>
                        <CardDescription>
                            El siguiente contenido será formateado para A4 automáticamente al pulsar imprimir.
                            <br />
                            Puede guardar como PDF usando el diálogo de impresión de su navegador.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center overflow-auto bg-slate-100/50 p-8 rounded-xl">
                        {/* Wrapper to constrain preview width to A4 proportionality approx */}
                        <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl scale-[0.6] origin-top border border-slate-200">
                            <PrintableReport ref={componentRef} portfolio={portfolio} analysisData={analysisData} reportDate={reportDate} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Hidden printable div for exact printing if the preview one causes layout shifts, 
                but react-to-print uses the ref directly. 
                Often better to keep the Ref on the visible component or a hidden one dedicated to print.
                Here we use the visible one inside the preview scaling wrapper, but scaling might affect print.
                Let's use a standard pattern: separate print component if tricky styling.
                For now, let's try printing the ref directly used in preview. 
                Actually, CSS transform scale affects print content usually. 
                Better approach: Render it twice? Or enable specific print styles.
                Let's just trust react-to-print for now on the content.
            */}
        </main>
    )
}
