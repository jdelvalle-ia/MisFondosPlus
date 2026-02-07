"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { usePortfolio } from "@/context/PortfolioContext";
import { IFondo } from "@/types";

interface FundFormProps {
    onClose: () => void;
    initialData?: IFondo | null;
}

export const FundForm = ({ onClose, initialData }: FundFormProps) => {
    const { portfolio, setPortfolio } = usePortfolio();

    const [formData, setFormData] = useState<Partial<IFondo>>(initialData || {
        ISIN: '',
        denominacion: '',
        categoria: 'Renta Variable',
        gestora: '',
        fecha_compra: new Date().toISOString().split('T')[0],
        importe: 0,
        moneda: 'EUR',
        participaciones: 0,
        comisiones: 0,
        NAV_actual: 0,
        fecha_NAV: new Date().toISOString().split('T')[0]
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'importe' || name === 'participaciones' || name === 'comisiones' || name === 'NAV_actual'
                ? parseFloat(value)
                : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!portfolio) return;

        const newFondo = formData as IFondo; // Basic casting, validtion needed in real app

        let newFunds = [...portfolio.fondos];
        if (initialData) {
            // Edit mode
            newFunds = newFunds.map(f => f.ISIN === initialData.ISIN ? newFondo : f);
        } else {
            // Add mode
            newFunds.push(newFondo);
        }

        setPortfolio({ ...portfolio, fondos: newFunds });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">ISIN</label>
                    <input name="ISIN" required value={formData.ISIN} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" placeholder="ES..." />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Gestora</label>
                    <input name="gestora" required value={formData.gestora} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Denominación</label>
                <input name="denominacion" required value={formData.denominacion} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Categoría</label>
                    <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none">
                        <option>Renta Variable</option>
                        <option>Renta Fija</option>
                        <option>Mixto</option>
                        <option>Materias Primas</option>
                        <option>Índice</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha Compra</label>
                    <input type="date" name="fecha_compra" required value={formData.fecha_compra} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Inversión (€)</label>
                    <input type="number" step="0.01" name="importe" required value={formData.importe} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Moneda</label>
                    <select name="moneda" value={formData.moneda} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none">
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="JPY">JPY</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Participaciones</label>
                    <input type="number" step="0.0001" name="participaciones" required value={formData.participaciones} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Comisiones (€)</label>
                    <input type="number" step="0.01" name="comisiones" required value={formData.comisiones} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">NAV Actual</label>
                    <input type="number" step="0.0001" name="NAV_actual" required value={formData.NAV_actual} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha NAV</label>
                    <input type="date" name="fecha_NAV" required value={formData.fecha_NAV} onChange={handleChange} className="w-full p-2 rounded-md bg-secondary border border-border focus:ring-2 focus:ring-primary outline-none" />
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">Guardar Fondo</Button>
            </div>
        </form>
    );
};
