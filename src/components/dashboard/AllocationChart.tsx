"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { usePortfolio } from "@/context/PortfolioContext";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export const AllocationChart = () => {
    const { portfolio } = usePortfolio();

    if (!portfolio) return null;

    // Group by category
    const allocation = portfolio.fondos.reduce((acc, curr) => {
        const value = curr.participaciones * curr.NAV_actual;
        acc[curr.categoria] = (acc[curr.categoria] || 0) + value;
        return acc;
    }, {} as Record<string, number>);

    const labels = Object.keys(allocation);
    const dataValues = Object.values(allocation);

    const data = {
        labels: labels,
        datasets: [
            {
                data: dataValues,
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)', // Blue
                    'rgba(16, 185, 129, 0.8)', // Emerald
                    'rgba(249, 115, 22, 0.8)', // Orange
                    'rgba(139, 92, 246, 0.8)', // Violet
                    'rgba(236, 72, 153, 0.8)', // Pink
                    'rgba(100, 116, 139, 0.8)', // Slate
                ],
                borderColor: 'rgba(24, 24, 27, 0.8)',
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: '#a1a1aa',
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const value = context.raw;
                        const total = context.chart._metasets[context.datasetIndex].total;
                        const percentage = ((value / total) * 100).toFixed(1) + "%";
                        return label + new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value) + ' (' + percentage + ')';
                    }
                }
            }
        },
        cutout: '60%',
    };

    return (
        <Card className="h-[400px]">
            <CardHeader>
                <CardTitle>Diversificación por Categoría</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <Doughnut data={data} options={options} />
            </CardContent>
        </Card>
    );
};
