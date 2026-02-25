"use client";

import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { usePortfolio } from "@/context/PortfolioContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { Printer, FileText, BarChart3, BrainCircuit, ArrowLeft, Sparkles } from "lucide-react";
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
import { PortfolioDeepAnalysisForm } from "@/components/reportes/PortfolioDeepAnalysisForm";
import { PortfolioDeepAnalysisReport } from "@/components/reportes/PortfolioDeepAnalysisReport";
import { InvestmentSnapshotReport } from "@/components/reportes/InvestmentSnapshotReport";
import { Modal } from "@/components/ui/Modal";

ChartJS.register(CategoryScale, LinearScale, ArcElement, Tooltip, Legend);

export default function ReportsPage() {
    const { portfolio, loading } = usePortfolio();

    // Feature States
    const [activeTab, setActiveTab] = useState<"basic" | "deep_analysis" | "analysis">("basic");
    const [aiReportMarkdown, setAiReportMarkdown] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const [aiDeepReportMarkdown, setAiDeepReportMarkdown] = useState<string | null>(null);
    const [aiDeepLoading, setAiDeepLoading] = useState(false);
    const [showDeepConfirm, setShowDeepConfirm] = useState(false);
    const [pendingDeepFormData, setPendingDeepFormData] = useState<any>(null);

    // Refs for printing
    const basicReportRef = useRef<HTMLDivElement>(null);
    const aiReportRef = useRef<HTMLDivElement>(null);
    const aiDeepReportRef = useRef<HTMLDivElement>(null);
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

    const handlePrintAiDeep = useReactToPrint({
        contentRef: aiDeepReportRef,
        documentTitle: `Analisis_Cartera_IA_${new Date().toISOString().split('T')[0]}`,
    });

    const handleGenerateAiDeepReport = async () => {
        setShowDeepConfirm(true);
    };

    const confirmAndExecuteDeepReport = async () => {
        setShowDeepConfirm(false);
        if (!portfolio) return;

        setAiDeepLoading(true);
        try {
            const today = new Date();
            const prevYear = today.getFullYear() - 1;
            const startDateObj = new Date(prevYear, 11, 31);
            const endDateObj = today;

            const fundsWithBalances = portfolio.fondos.map((fund: any) => {
                const history = fund.historial ? [...fund.historial].sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) : [];

                const startPoint = history.find((h: any) => new Date(h.fecha) <= startDateObj) || history[history.length - 1];
                const endPoint = history.find((h: any) => new Date(h.fecha) <= endDateObj) || history[0];

                let startBalance = startPoint ? Number(startPoint.valor) : (fund.importe || 0);

                let endBalance = endPoint ? Number(endPoint.valor) : 0;
                let endPointDate = endPoint ? new Date(endPoint.fecha) : null;

                if (fund.NAV_actual && fund.fecha_NAV) {
                    const navDate = new Date(fund.fecha_NAV);
                    if (!endPointDate || navDate > endPointDate) {
                        if (navDate <= endDateObj || endDateObj.getTime() > (Date.now() - 24 * 60 * 60 * 1000)) {
                            endBalance = Number(fund.NAV_actual * fund.participaciones);
                        }
                    }
                }

                if (isNaN(startBalance)) startBalance = 0;
                if (isNaN(endBalance)) endBalance = 0;

                return {
                    ...fund,
                    startBalance,
                    endBalance
                };
            });

            const totalEndBalance = fundsWithBalances.reduce((acc: number, f: any) => acc + f.endBalance, 0);

            const enrichedPortfolio = {
                ...portfolio,
                fondos: fundsWithBalances.map((fund: any) => {
                    const weightPct = totalEndBalance > 0 ? (fund.endBalance / totalEndBalance) * 100 : 0;
                    const formatPct = (val: number) => new Intl.NumberFormat('es-ES', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val / 100);

                    return {
                        ...fund,
                        reportData: {
                            pesoPct: formatPct(weightPct)
                        }
                    };
                })
            };

            const response = await fetch('/api/reports/portfolio-deep-analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    portfolioData: enrichedPortfolio
                })
            });

            const data = await response.json();
            if (data.report) {
                setAiDeepReportMarkdown(data.report);
            } else {
                console.error("Error generando el informe profundo:", data.error);
                alert("Error generando el informe: " + (data.error || "Error desconocido"));
            }
        } catch (error) {
            console.error("Fetch error:", error);
            alert("Error de conexión al generar el informe.");
        } finally {
            setAiDeepLoading(false);
            // Move back to top of screen when generated
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

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

                // Determine Unit Values -> NOW DETERMINING TOTAL BALANCES DIRECTLY
                // fund.historial contains TOTAL VALUES (NAV * Shares), not unit NAVs.
                let startBalance = startPoint ? Number(startPoint.valor) : (fund.importe || 0);
                let startPointDate = startPoint ? new Date(startPoint.fecha) : null;

                // For End Value
                let endBalance = endPoint ? Number(endPoint.valor) : 0;
                let endPointDate = endPoint ? new Date(endPoint.fecha) : null;

                // Propuesta de cambio para respetar la fecha solicitada si existe en el historial
                if (fund.NAV_actual && fund.fecha_NAV) {
                    const navDate = new Date(fund.fecha_NAV);
                    const navDateStr = navDate.toISOString().split('T')[0];

                    const endDateStr = endDateObj.toISOString().split('T')[0];
                    const endPointDateStr = endPointDate ? endPointDate.toISOString().split('T')[0] : '';

                    // LOGIC: Use Current NAV ONLY if:
                    // 1. We don't have a valid history point (endPointDate is null)
                    // 2. OR The requested Report End Date IS "Today" or "Future" (implied by isReportCurrent AND gap) 
                    //    AND the history point we found is STALE (older than requested date).
                    // 3. CRITICAL: If we found a history point that EXACTLY matches the requested End Date, KEEP IT.

                    const isExactMatch = endPointDateStr === endDateStr;

                    // If we have an exact match for the requested date in history, we should probably keep it
                    // UNLESS the user is asking for "Today" and current NAV is fresher than the "Today" history (unlikely).

                    if (!isExactMatch) {
                        // If we don't have an exact match, we might want to default to Current NAV if it's "better"
                        // e.g. Report End Date = Today (Feb 12), History only goes to Jan 31. 
                        // Then we MUST use Current NAV.

                        // If Report End Date = Jan 31. History has Jan 31. isExactMatch = true. We keep History.

                        // If Report End Date = Feb 12. History has Jan 31. isExactMatch = false.
                        // We check if NAV_actual (Feb 12) is closer/better.

                        if (!endPointDate || navDate > endPointDate) {
                            // Only use NAV if it doesn't exceed the requested report scope excessively 
                            // (e.g. don't use Feb data for a Dec report)
                            // But here we are handling the case where we WANT the latest status.

                            if (navDate <= endDateObj || endDateObj.getTime() > (Date.now() - 24 * 60 * 60 * 1000)) {
                                // If NAV date is within range OR report is for "Now"
                                endBalance = Number(fund.NAV_actual * fund.participaciones); // NAV_actual is UNIT value
                                endPointDate = navDate;
                            }
                        }
                    }
                }

                if (isNaN(startBalance)) startBalance = 0;
                if (isNaN(endBalance)) endBalance = 0;

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
                    const formatMoney = (val: number) => new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                        useGrouping: true
                    }).format(val);
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
        <>
            <main className="min-h-screen p-8 md:p-12 space-y-8 pb-20">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Reportes</h1>
                        <p className="text-muted-foreground mt-2">Descarga y visualiza informes detallados.</p>
                    </div>
                </div>

                {/* Tab Selection */}
                <div className="flex gap-4 border-b border-border pb-1 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab("basic")}
                        className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "basic"
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
                        onClick={() => setActiveTab("deep_analysis")}
                        className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "deep_analysis"
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Análisis de la Cartera (IA)
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("analysis")}
                        className={`pb-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "analysis"
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

                {activeTab === "deep_analysis" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {!aiDeepReportMarkdown ? (
                            <div className="max-w-4xl mx-auto py-8">
                                <PortfolioDeepAnalysisForm onGenerate={handleGenerateAiDeepReport} loading={aiDeepLoading} />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                                    <Button variant="outline" onClick={() => setAiDeepReportMarkdown(null)} className="gap-2">
                                        <ArrowLeft className="w-4 h-4" />
                                        Nuevo Análisis
                                    </Button>
                                    <Button onClick={() => handlePrintAiDeep && handlePrintAiDeep()} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                                        <Printer className="w-5 h-5" />
                                        Descargar PDF Profesional
                                    </Button>
                                </div>

                                <Card className="bg-muted/30 border-dashed">
                                    <CardContent className="flex justify-center overflow-auto bg-slate-200/50 p-8 rounded-xl">
                                        {/* Preview Wrapper */}
                                        <div className="w-[210mm] min-h-[297mm] bg-white shadow-2xl scale-[0.85] origin-top border border-slate-200">
                                            <PortfolioDeepAnalysisReport
                                                ref={aiDeepReportRef}
                                                markdown={aiDeepReportMarkdown}
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
            <Modal isOpen={showDeepConfirm} onClose={() => setShowDeepConfirm(false)} title="Atención: Análisis Profundo">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Este proceso utiliza Deep Research y cruzará grandes cantidades de datos con fuentes macroeconómicas para generar un informe extenso y profundo.
                    </p>
                    <p className="text-sm text-foreground font-medium">
                        El proceso puede tardar un minuto en completarse.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowDeepConfirm(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={confirmAndExecuteDeepReport}>
                            Sí, continuar
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
