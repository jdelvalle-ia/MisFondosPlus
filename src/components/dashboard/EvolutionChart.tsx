"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePortfolio } from "@/context/PortfolioContext";
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
import { Line } from 'react-chartjs-2';
import { formatDate } from "@/lib/utils";

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

export const EvolutionChart = () => {
    const { portfolio } = usePortfolio();
    const [chartData, setChartData] = useState<any>(null);

    useEffect(() => {
        if (!portfolio || portfolio.fondos.length === 0) {
            setChartData(null);
            return;
        }

        // Use a fixed 'today' inside effect to ensure consistency during this render cycle
        const today = new Date();
        const oldestDateStr = portfolio.fondos.reduce((min, p) => p.fecha_compra < min ? p.fecha_compra : min, new Date().toISOString());
        const oldestDate = new Date(oldestDateStr);

        const monthsDiff = (today.getFullYear() - oldestDate.getFullYear()) * 12 + (today.getMonth() - oldestDate.getMonth());
        const totalMonths = Math.max(monthsDiff, 1); // At least 1 month

        const aggregatedHistory = Array.from({ length: totalMonths + 1 }, (_, i) => {
            const currentDate = new Date(today.getFullYear(), today.getMonth() - (totalMonths - i), 1);

            let totalValue = 0;

            portfolio.fondos.forEach(fondo => {
                const purchase = new Date(fondo.fecha_compra);
                if (purchase <= currentDate) {
                    // Fund is active. Simulate its value growth.
                    // We don't have real history, so we linear interpolate from Purchase Cost to Current Value
                    // based on time elapsed vs total duration held.

                    const holdingMonths = (today.getFullYear() - purchase.getFullYear()) * 12 + (today.getMonth() - purchase.getMonth());
                    const currentElapsed = (currentDate.getFullYear() - purchase.getFullYear()) * 12 + (currentDate.getMonth() - purchase.getMonth());

                    const progress = Math.max(0, Math.min(1, currentElapsed / Math.max(1, holdingMonths)));

                    const initialValue = fondo.importe;
                    const currentValue = fondo.participaciones * fondo.NAV_actual;

                    const estimatedValue = initialValue + (currentValue - initialValue) * progress;
                    totalValue += estimatedValue;
                }
            });

            return {
                fecha: currentDate.toISOString(),
                valor: totalValue
            };
        });

        const data = {
            labels: aggregatedHistory.map(h => formatDate(h.fecha)),
            datasets: [
                {
                    label: 'Evolución Patrimonio',
                    data: aggregatedHistory.map(h => h.valor),
                    fill: true,
                    backgroundColor: (context: any) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.5)'); // Blue 500
                        gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');
                        return gradient;
                    },
                    borderColor: 'rgba(59, 130, 246, 1)',
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                },
            ],
        };
        setChartData(data);
    }, [portfolio]);

    if (!chartData) return null;

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: 'rgba(24, 24, 27, 0.9)',
                titleColor: '#fff',
                bodyColor: '#a1a1aa',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                        }
                        return label;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    drawBorder: false,
                },
                ticks: {
                    color: '#71717a',
                    maxTicksLimit: 12 // Avoid overcrowding if history is long
                }
            },
            y: {
                grid: {
                    color: 'rgba(39, 39, 42, 0.5)',
                    drawBorder: false,
                },
                ticks: {
                    color: '#71717a',
                    callback: function (value: any) {
                        return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(value) + ' €';
                    }
                }
            },
        },
        interaction: {
            mode: 'nearest' as const,
            axis: 'x' as const,
            intersect: false
        }
    };

    return (
        <Card className="h-[400px]">
            <CardHeader>
                <CardTitle>Evolución Patrimonial (Total Histórico)</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
                <Line options={options} data={chartData} />
            </CardContent>
        </Card>
    );
};
