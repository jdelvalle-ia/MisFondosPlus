"use client";

import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { usePortfolio } from "@/context/PortfolioContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { Printer, FileText, BarChart3, BrainCircuit, ArrowLeft } from "lucide-react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { PortfolioAnalysisForm } from "@/components/reportes/PortfolioAnalysisForm";
import { PortfolioAnalysisReport } from "@/components/reportes/PortfolioAnalysisReport";
import { InvestmentSnapshotReport } from "@/components/reportes/InvestmentSnapshotReport";

ChartJS.register(CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

export default function ReportsPage() {
    const { portfolio, loading } = usePortfolio();

    // Feature States
    const [activeTab, setActiveTab] = useState<"basic" | "analysis">("basic");
    const [aiReportMarkdown, setAiReportMarkdown] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    // Refs for printing
    const basicReportRef = useRef<HTMLDivElement>(null);
    const aiReportRef = useRef<HTMLDivElement>(null);
    const [reportDate, setReportDate] = React.useState<string>("");

    React.useEffect(() => {
        setReportDate(new Date().toISOString());
    }, []);

    const handlePrintBasic = useReactToPrint({
        contentRef: basicReportRef,
        documentTitle: `Informe_Cartera_${new Date().toISOString().split('T')[0]}`,
    });

    const handlePrintAi = useReactToPrint({
        contentRef: aiReportRef,
        documentTitle: `Informe_Estrategico_${new Date().toISOString().split('T')[0]}`,
    });

    const handleGenerateAiReport = async (formData: any) => {
        if (!portfolio) return;
        setAiLoading(true);
        try {
            // 1. Calculate History & Balances for ALL funds first
            const fundsWithBalances = portfolio.fondos.map((fund: any) => {
                const history = fund.historial ? [...fund.historial].sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) : [];
                const startDateObj = new Date(formData.startDate);
                const endDateObj = new Date(formData.endDate);

                const startPoint = history.find((h: any) => new Date(h.fecha) <= startDateObj) || history[history.length - 1];
                const endPoint = history.find((h: any) => new Date(h.fecha) <= endDateObj) || history[0];

                // Determine Unit Values
                let startVal = startPoint ? Number(startPoint.valor) : (fund.participaciones > 0 ? fund.importe / fund.participaciones : 0);
                let startPointDate = startPoint ? new Date(startPoint.fecha) : null;

                // For End Value: Check if NAV_actual is a better match
                let endVal = endPoint ? Number(endPoint.valor) : 0;
                let endPointDate = endPoint ? new Date(endPoint.fecha) : null;

                // Priority Logic for End Date:
                // If we have NAV_actual and it is closer to endDateObj (or cleaner) than the stale history point
                if (fund.NAV_actual && fund.fecha_NAV) {
                    const navDate = new Date(fund.fecha_NAV);
                    // If existing endPoint is older than 20 days from target, but NAV_actual is closer?
                    // Or simpler: If existing endPoint month != target endDate Month, but NAV_actual Month == target Month
                    // Or just: If NAV_actual is NEWER than endPoint, assume it's the "Current" state intended.

                    if (!endPointDate || navDate > endPointDate) {
                        // Only swap if NAV_date <= endDateObj (don't use future data for past report)
                        // OR if endDateObj is "Today/Future" (meaning "Current Status report")

                        // Relaxed Check: If report end date is seemingly "current" (within last 30 days of real time)
                        // and NAV_actual is newer than history.
                        const isReportCurrent = endDateObj.getTime() > (Date.now() - 35 * 24 * 60 * 60 * 1000); // Report date is recent

                        if (isReportCurrent || navDate <= endDateObj) {
                            endVal = Number(fund.NAV_actual);
                            endPointDate = navDate;
                        }
                    }
                }

                if (isNaN(startVal)) startVal = 0;
                if (isNaN(endVal)) endVal = 0;

                const startBalance = startVal * fund.participaciones;
                const endBalance = endVal * fund.participaciones;

                return {
                    ...fund,
                    startBalance,
                    endBalance,
                    startPointDate,
                    endPointDate
                };
            });

            // 2. Calculate Portfolio Totals
            const totalStartBalance = fundsWithBalances.reduce((acc: number, f: any) => acc + f.startBalance, 0);
            const totalEndBalance = fundsWithBalances.reduce((acc: number, f: any) => acc + f.endBalance, 0);

            // 3. Prepare Final Data with Weights and Formatted Strings
            const enrichedPortfolio = {
                ...portfolio,
                fondos: fundsWithBalances.map((fund: any) => {
                    // Growth
                    let growthPct = 0;
                    if (fund.startBalance > 5) {
                        growthPct = ((fund.endBalance - fund.startBalance) / fund.startBalance) * 100;
                        if (growthPct > 1000) growthPct = 0; // Cap errors
                        if (growthPct < -100) growthPct = -100;
                    }

                    // Weight (based on END balance of the period)
                    const weightPct = totalEndBalance > 0 ? (fund.endBalance / totalEndBalance) * 100 : 0;

                    // Formatter
                    const formatMoney = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
                    const formatPct = (val: number) => new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val / 100);
                    const formatShortDate = (date: Date) => date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });

                    // Date Check Logic
                    let saldoInicialStr = formatMoney(fund.startBalance);
                    if (fund.startPointDate) {
                        const requestedMonth = new Date(formData.startDate).getMonth();
                        const actualMonth = fund.startPointDate.getMonth();
                        const requestedYear = new Date(formData.startDate).getFullYear();
                        const actualYear = fund.startPointDate.getFullYear();

                        if (requestedMonth !== actualMonth || requestedYear !== actualYear) {
                            saldoInicialStr += ` (${formatShortDate(fund.startPointDate)})`;
                        }
                    }

                    let saldoFinalStr = formatMoney(fund.endBalance);
                    if (fund.endPointDate) {
                        const requestedMonth = new Date(formData.endDate).getMonth();
                        const actualMonth = fund.endPointDate.getMonth();
                        const requestedYear = new Date(formData.endDate).getFullYear();
                        const actualYear = fund.endPointDate.getFullYear();

                        if (requestedMonth !== actualMonth || requestedYear !== actualYear) {
                            saldoFinalStr += ` (${formatShortDate(fund.endPointDate)})`;
                        }
                    }

                    return {
                        ...fund,
                        reportData: {
                            saldoInicial: saldoInicialStr,
                            saldoFinal: saldoFinalStr,
                            crecimientoPct: formatPct(growthPct),
                            pesoPct: formatPct(weightPct)
                        }
                    };
                })
            };

            // 4. Calculate Portfolio Stats for the prompt
            const portfolioAbsoluteReturn = totalEndBalance - totalStartBalance;
            const portfolioPctReturn = totalStartBalance > 0 ? (portfolioAbsoluteReturn / totalStartBalance) * 100 : 0;

            const portfolioStats = {
                totalStartValue: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalStartBalance),
                totalEndValue: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalEndBalance),
                absoluteReturn: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(portfolioAbsoluteReturn),
                pctReturn: new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(portfolioPctReturn / 100)
            };

            const response = await fetch('/api/reports/portfolio-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    portfolioData: enrichedPortfolio,
                    portfolioStats, // Send calculated stats
                    ...formData
                })
            });

            const data = await response.json();
            if (data.report) {
                setAiReportMarkdown(data.report);
            } else {
                console.error("Error generating report:", data.error);
                alert("Error generando el informe: " + (data.error || "Error desconocido"));
            }
        } catch (error) {
            console.error("Fetch error:", error);
            alert("Error de conexión al generar el informe.");
        } finally {
            setAiLoading(false);
        }
    };

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
            </div>

            {/* Tab Selection */}
            <div className="flex gap-4 border-b border-border pb-1">
                <button
                    onClick={() => setActiveTab("basic")}
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "basic"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Informe de Inversiones
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab("analysis")}
                    className={`pb-2 px-4 text-sm font-medium transition-colors ${activeTab === "analysis"
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4" />
                        Informe de Estrategia (IA)
                    </div>
                </button>
            </div>

            {/* Content Area */}
            {activeTab === "basic" && (
                <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-end">
                        <Button onClick={() => handlePrintBasic && handlePrintBasic()} className="gap-2" size="lg">
                            <Printer className="w-5 h-5" />
                            Imprimir / Guardar PDF
                        </Button>
                    </div>
                    <Card className="bg-muted/30 border-dashed">
                        <CardHeader className="text-center">
                            <CardTitle className="flex justify-center flex-col items-center gap-4">
                                <FileText className="w-12 h-12 text-primary/50" />
                                Vista Previa
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center overflow-auto bg-slate-100/50 p-8 rounded-xl">
                            <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl scale-[0.6] origin-top border border-slate-200">
                                <InvestmentSnapshotReport ref={basicReportRef} portfolio={portfolio} reportDate={reportDate} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeTab === "analysis" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {!aiReportMarkdown ? (
                        <div className="max-w-4xl mx-auto py-8">
                            <PortfolioAnalysisForm onGenerate={handleGenerateAiReport} loading={aiLoading} />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                                <Button variant="outline" onClick={() => setAiReportMarkdown(null)} className="gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Nuevo Informe
                                </Button>
                                <Button onClick={() => handlePrintAi && handlePrintAi()} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                                    <Printer className="w-5 h-5" />
                                    Descargar PDF Profesional
                                </Button>
                            </div>

                            <Card className="bg-muted/30 border-dashed">
                                <CardContent className="flex justify-center overflow-auto bg-slate-200/50 p-8 rounded-xl">
                                    {/* Preview Wrapper */}
                                    <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl scale-[0.85] origin-top border border-slate-200">
                                        <PortfolioAnalysisReport
                                            ref={aiReportRef}
                                            markdown={aiReportMarkdown}
                                            reportDate={new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
