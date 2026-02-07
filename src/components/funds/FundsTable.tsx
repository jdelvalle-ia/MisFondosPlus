"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Edit, Trash2, TrendingUp, TrendingDown, ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { IFondo } from "@/types";
import { SimpleTooltip } from "@/components/ui/SimpleTooltip";
import { useState } from "react";

interface FundsTableProps {
    onEdit: (fondo: IFondo) => void;
}

export const FundsTable = ({ onEdit }: FundsTableProps) => {
    const { portfolio, setPortfolio, moveFund, refreshFund } = usePortfolio();
    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    if (!portfolio || portfolio.fondos.length === 0) {
        return <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border mt-6">
            No hay fondos en la cartera. Añade uno nuevo o importa un JSON.
        </div>;
    }

    const handleDelete = (isin: string) => {
        if (confirm(`¿Estás seguro de eliminar el fondo con ISIN ${isin}?`)) {
            const newFunds = portfolio.fondos.filter(f => f.ISIN !== isin);
            setPortfolio({ ...portfolio, fondos: newFunds });
        }
    };

    const handleRefresh = async (isin: string) => {
        setRefreshingId(isin);
        await refreshFund(isin);
        setRefreshingId(null);
    };

    return (
        <div className="overflow-x-auto rounded-xl border border-border mt-6 bg-card/50 backdrop-blur-sm">
            <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground">
                    <tr>
                        <th className="px-6 py-4 font-medium">Fondo / ISIN</th>
                        <th className="px-6 py-4 font-medium">Categoría</th>
                        <th className="px-6 py-4 font-medium text-right">Inversión</th>
                        <th className="px-6 py-4 font-medium text-right">Valor Actual</th>
                        <th className="px-6 py-4 font-medium text-right">Rentabilidad</th>
                        <th className="px-6 py-4 font-medium text-center">Orden</th>
                        <th className="px-6 py-4 font-medium text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {portfolio.fondos.map((fondo, index) => {
                        const valorCompra = fondo.importe;
                        const valorActual = fondo.participaciones * fondo.NAV_actual;
                        const rentabilidad = valorActual - valorCompra;
                        const rentabilidadPct = ((rentabilidad) / valorCompra) * 100;
                        const isPositive = rentabilidad >= 0;
                        const isRefreshing = refreshingId === fondo.ISIN;

                        return (
                            <tr key={fondo.ISIN} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4">
                                    <Link href={`/fondos/${encodeURIComponent(fondo.ISIN)}`} className="block group">
                                        <div className="font-medium text-foreground group-hover:text-primary transition-colors underline decoration-dotted decoration-border/50 group-hover:decoration-primary">{fondo.denominacion}</div>
                                        <div className="text-xs text-muted-foreground font-mono mt-1">{fondo.ISIN}</div>
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                        {fondo.categoria}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-muted-foreground">
                                    {formatCurrency(valorCompra)}
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-medium">
                                    <div>{formatCurrency(valorActual)}</div>
                                    <div className="text-xs text-muted-foreground mt-1">({formatDate(fondo.fecha_NAV)})</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className={`flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                        <span className="font-bold">{rentabilidadPct.toFixed(2)}%</span>
                                    </div>
                                    <div className={`text-xs ${isPositive ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                        {rentabilidad > 0 ? '+' : ''}{formatCurrency(rentabilidad)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex flex-col gap-1 items-center">
                                        <SimpleTooltip content="Mover arriba">
                                            <button
                                                onClick={() => moveFund(index, index - 1)}
                                                disabled={index === 0}
                                                className="p-1 hover:bg-muted rounded disabled:opacity-30 transition-colors"
                                            >
                                                <ArrowUp className="w-3 h-3" />
                                            </button>
                                        </SimpleTooltip>
                                        <SimpleTooltip content="Mover abajo">
                                            <button
                                                onClick={() => moveFund(index, index + 1)}
                                                disabled={index === portfolio.fondos.length - 1}
                                                className="p-1 hover:bg-muted rounded disabled:opacity-30 transition-colors"
                                            >
                                                <ArrowDown className="w-3 h-3" />
                                            </button>
                                        </SimpleTooltip>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <SimpleTooltip content="Actualizar Valor Liquidativo">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className={`h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 ${isRefreshing ? 'animate-spin' : ''}`}
                                                onClick={() => handleRefresh(fondo.ISIN)}
                                                disabled={isRefreshing}
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </Button>
                                        </SimpleTooltip>

                                        <SimpleTooltip content="Editar posición">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20" onClick={() => onEdit(fondo)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        </SimpleTooltip>

                                        <SimpleTooltip content="Eliminar fondo">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-900/20" onClick={() => handleDelete(fondo.ISIN)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </SimpleTooltip>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
