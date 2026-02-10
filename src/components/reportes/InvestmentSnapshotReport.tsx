import React, { forwardRef } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend);

interface InvestmentSnapshotReportProps {
    portfolio: any;
    reportDate: string;
}

export const InvestmentSnapshotReport = forwardRef<HTMLDivElement, InvestmentSnapshotReportProps>(
    ({ portfolio, reportDate }, ref) => {
        // --- CALCULATION LOGIC ---
        const funds = portfolio.fondos || [];
        const totalInvested = funds.reduce((acc: number, f: any) => acc + f.importe, 0);
        const totalValue = funds.reduce((acc: number, f: any) => acc + (f.participaciones * f.NAV_actual), 0);
        const absReturn = totalValue - totalInvested;
        const pctReturn = totalInvested > 0 ? (absReturn / totalInvested) * 100 : 0;

        // Group by Category for Chart
        const allocation = funds.reduce((acc: any, f: any) => {
            const val = f.participaciones * f.NAV_actual;
            acc[f.categoria] = (acc[f.categoria] || 0) + val;
            return acc;
        }, {});

        const chartData = {
            labels: Object.keys(allocation),
            datasets: [{
                data: Object.values(allocation),
                backgroundColor: [
                    '#0ea5e9', // Sky 500
                    '#3b82f6', // Blue 500
                    '#6366f1', // Indigo 500
                    '#8b5cf6', // Violet 500
                    '#d946ef', // Fuchsia 500
                    '#f43f5e', // Rose 500
                    '#10b981', // Emerald 500
                    '#f59e0b', // Amber 500
                ],
                borderWidth: 0,
            }]
        };

        const chartOptions = {
            plugins: {
                legend: {
                    position: 'right' as const,
                    labels: {
                        font: {
                            family: 'ui-sans-serif, system-ui, sans-serif',
                            size: 10
                        },
                        boxWidth: 12,
                        padding: 15
                    }
                }
            },
            cutout: '65%',
            responsive: true,
            maintainAspectRatio: false
        };

        return (
            <div className="w-full bg-slate-100/50 p-8 flex justify-center print:p-0 print:bg-white">
                <style type="text/css" media="print">
                    {`
                        @page { 
                            margin: 25mm !important; 
                            size: A4;
                        }
                        body { 
                            print-color-adjust: exact; 
                            -webkit-print-color-adjust: exact; 
                        }
                        .page-break { 
                            page-break-before: always; 
                        }
                    `}
                </style>

                <div ref={ref} className="bg-white text-slate-900 w-[210mm] shadow-xl print:shadow-none print:w-full mx-auto">

                    {/* --- PAGE 1: DASHBOARD --- */}
                    <div className="p-[25mm] print:p-0 min-h-[297mm] print:min-h-0 print:h-[240mm] print:overflow-hidden relative flex flex-col">

                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-10">
                            <div>
                                <h1 className="text-3xl font-sans font-bold text-slate-900 uppercase tracking-tight leading-none">
                                    Informe de <br /> <span className="text-sky-700">Inversiones</span>
                                </h1>
                                <p className="text-slate-500 uppercase tracking-widest text-[10px] mt-3 font-semibold">
                                    MisFondos+ Global Snapshot
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-xs text-slate-500 mb-1">{formatDate(reportDate)}</p>
                                <div className="bg-slate-800 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider inline-block">
                                    {portfolio.info_cartera.nombre}
                                </div>
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-3 gap-6 mb-12">
                            <div className="bg-slate-50 p-6 border-l-4 border-slate-700 shadow-sm">
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Valor Total</p>
                                <p className="text-3xl font-bold text-slate-900 font-sans">{formatCurrency(totalValue)}</p>
                            </div>
                            <div className="bg-slate-50 p-6 border-l-4 border-sky-600 shadow-sm">
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Beneficio (P/L)</p>
                                <p className={`text-3xl font-bold font-sans ${absReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {absReturn > 0 ? '+' : ''}{formatCurrency(absReturn)}
                                </p>
                            </div>
                            <div className="bg-slate-50 p-6 border-l-4 border-emerald-500 shadow-sm">
                                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">Rentabilidad %</p>
                                <p className={`text-3xl font-bold font-sans ${pctReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {formatPercent(pctReturn)}
                                </p>
                            </div>
                        </div>

                        {/* Analysis Section */}
                        <div className="grid grid-cols-2 gap-6 mb-auto">
                            {/* Left Column: Chart */}
                            <div>
                                <h2 className="text-lg font-bold uppercase text-slate-800 mb-6 border-b border-slate-200 pb-2">
                                    Distribución de Activos
                                </h2>
                                <div className="h-[250px] w-full bg-slate-50 rounded-lg p-4 border border-slate-100 flex items-center justify-center">
                                    <div className="w-[90%] h-[90%]">
                                        <Doughnut data={chartData} options={chartOptions} />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Top/Bottom Tables */}
                            <div className="space-y-8">
                                {/* Top 5 Holdings */}
                                <div>
                                    <h2 className="text-sm font-bold uppercase text-slate-800 mb-3 border-b border-slate-200 pb-2 flex justify-between items-center">
                                        <span>Posiciones Principales (Top 5)</span>
                                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Mayor Peso</span>
                                    </h2>
                                    <table className="w-full text-xs font-sans border-collapse">
                                        <tbody className="divide-y divide-slate-100">
                                            {[...funds].sort((a: any, b: any) => (b.participaciones * b.NAV_actual) - (a.participaciones * a.NAV_actual)).slice(0, 5).map((f: any, i: number) => {
                                                const val = f.participaciones * f.NAV_actual;
                                                const weight = totalValue > 0 ? (val / totalValue) * 100 : 0;
                                                return (
                                                    <tr key={f.ISIN} className="hover:bg-slate-50">
                                                        <td className="py-2 pl-2 font-medium text-slate-700 w-1/2 truncate border-l-2 border-emerald-500 bg-slate-50/50">{f.denominacion}</td>
                                                        <td className="py-2 text-right font-mono text-slate-600">{formatCurrency(val)}</td>
                                                        <td className="py-2 pr-2 text-right font-bold text-slate-900">{formatPercent(weight)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Bottom 5 Holdings */}
                                <div>
                                    <h2 className="text-sm font-bold uppercase text-slate-800 mb-3 border-b border-slate-200 pb-2 flex justify-between items-center">
                                        <span>Posiciones Menores (Bottom 5)</span>
                                        <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Menor Peso</span>
                                    </h2>
                                    <table className="w-full text-xs font-sans border-collapse">
                                        <tbody className="divide-y divide-slate-100">
                                            {[...funds].sort((a: any, b: any) => (a.participaciones * a.NAV_actual) - (b.participaciones * b.NAV_actual)).slice(0, 5).map((f: any, i: number) => {
                                                const val = f.participaciones * f.NAV_actual;
                                                const weight = totalValue > 0 ? (val / totalValue) * 100 : 0;
                                                return (
                                                    <tr key={f.ISIN} className="hover:bg-slate-50">
                                                        <td className="py-2 pl-2 font-medium text-slate-700 w-1/2 truncate border-l-2 border-rose-500 bg-slate-50/50">{f.denominacion}</td>
                                                        <td className="py-2 text-right font-mono text-slate-600">{formatCurrency(val)}</td>
                                                        <td className="py-2 pr-2 text-right font-bold text-slate-900">{formatPercent(weight)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- PAGE 2: DETAILS --- */}
                    <div className="page-break p-[25mm] print:p-0 min-h-[297mm] flex flex-col">
                        {/* Header Page 2 */}
                        <div className="flex justify-between items-center border-b border-slate-300 pb-4 mb-8">
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Detalle de Posiciones</h1>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-xs text-slate-500">{formatDate(reportDate)}</p>
                            </div>
                        </div>

                        {/* Full Table */}
                        <div className="flex-grow">
                            <table className="w-full text-xs border-collapse border border-slate-300 font-sans shadow-sm">
                                <thead className="bg-slate-800 text-white">
                                    <tr>
                                        <th className="p-3 text-left font-bold uppercase tracking-wider border border-slate-600">Fondo / ISIN</th>
                                        <th className="p-3 text-right font-bold uppercase tracking-wider border border-slate-600">Inversión</th>
                                        <th className="p-3 text-right font-bold uppercase tracking-wider border border-slate-600">Valor Actual</th>
                                        <th className="p-3 text-right font-bold uppercase tracking-wider border border-slate-600">Rent. Abs.</th>
                                        <th className="p-3 text-right font-bold uppercase tracking-wider border border-slate-600">Rent. %</th>
                                        <th className="p-3 text-right font-bold uppercase tracking-wider border border-slate-600">Peso</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {funds.map((f: any) => {
                                        const currentVal = f.participaciones * f.NAV_actual;
                                        const fundReturnCheck = currentVal - f.importe;
                                        const fundReturnPct = f.importe > 0 ? (fundReturnCheck / f.importe) * 100 : 0;
                                        const weight = totalValue > 0 ? (currentVal / totalValue) * 100 : 0;

                                        return (
                                            <tr key={f.ISIN} className="even:bg-slate-50 hover:bg-sky-50 transition-colors">
                                                <td className="p-3 border-r border-slate-200 max-w-[250px]">
                                                    <div className="font-bold text-slate-800 mb-1">{f.denominacion}</div>
                                                    <div className="font-mono text-[10px] text-slate-500 block">{f.ISIN}</div>
                                                    <div className="text-[10px] text-sky-600 mt-1">{f.categoria}</div>
                                                </td>
                                                <td className="p-3 text-right border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                                                    {formatCurrency(f.importe)}
                                                </td>
                                                <td className="p-3 text-right border-r border-slate-200 font-mono text-slate-800 font-semibold whitespace-nowrap">
                                                    {formatCurrency(currentVal)}
                                                </td>
                                                <td className={`p-3 text-right border-r border-slate-200 font-mono font-medium whitespace-nowrap ${fundReturnCheck >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                    {fundReturnCheck > 0 ? '+' : ''}{formatCurrency(fundReturnCheck)}
                                                </td>
                                                <td className={`p-3 text-right border-r border-slate-200 font-bold whitespace-nowrap ${fundReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                    {formatPercent(fundReturnPct)}
                                                </td>
                                                <td className="p-3 text-right font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                                                    {formatPercent(weight)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer Page 2 */}
                        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end">
                            <p className="text-[10px] text-slate-400 font-medium w-full text-justify leading-tight">
                                Nota: Este informe es un documento generado automáticamente por MisFondos+ con fines informativos.
                                La rentabilidad pasada no garantiza la rentabilidad futura. Los datos de valoración pueden tener un retraso de hasta 72 horas.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        );
    }
);

InvestmentSnapshotReport.displayName = 'InvestmentSnapshotReport';
