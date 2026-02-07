"use client";

import { FundsTable } from "@/components/funds/FundsTable";
import { Button } from "@/components/ui/Button";
import { Plus, RefreshCw, PenLine } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { FundForm } from "@/components/funds/FundForm";
import { usePortfolio } from "@/context/PortfolioContext";
import { IFondo } from "@/types";

export default function FundsPage() {
    const { portfolio, renamePortfolio, refreshPortfolio, loading, refreshStatus } = usePortfolio();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFund, setSelectedFund] = useState<IFondo | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState("");

    useEffect(() => {
        if (portfolio) setTempName(portfolio.info_cartera.nombre);
    }, [portfolio]);

    const handleSaveName = () => {
        renamePortfolio(tempName);
        setIsEditingName(false);
    };

    const handleEditFund = (fund: IFondo) => {
        setSelectedFund(fund);
        setIsModalOpen(true);
    };

    const handleNewFund = () => {
        setSelectedFund(null);
        setIsModalOpen(true);
    };

    return (
        <main className="min-h-screen p-8 md:p-12 space-y-8 bg-background pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 group">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="text-3xl font-bold bg-transparent border-b border-primary outline-none min-w-[300px]"
                                    autoFocus
                                    onBlur={handleSaveName}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <h1 className="text-4xl font-bold tracking-tight text-foreground select-none" onDoubleClick={() => setIsEditingName(true)}>
                                    {portfolio?.info_cartera.nombre || "Mi Cartera"}
                                </h1>
                                <button onClick={() => setIsEditingName(true)} className="text-muted-foreground hover:text-primary p-2">
                                    <PenLine className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-muted-foreground pl-1">
                        Gestión detallada de posiciones y actualización de valores.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={refreshPortfolio} disabled={loading} className="gap-2 min-w-[180px]">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading && refreshStatus
                            ? `Actualizando: ${refreshStatus.remaining} restantes...`
                            : "Actualizar Valores"}
                    </Button>
                    <Button onClick={handleNewFund} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Fondo
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <FundsTable onEdit={handleEditFund} />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedFund ? "Editar Fondo" : "Añadir Nuevo Fondo"}>
                <FundForm onClose={() => setIsModalOpen(false)} initialData={selectedFund} />
            </Modal>
        </main>
    );
}
