
import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Loader2, TrendingUp, Calendar, Target, User } from "lucide-react";

interface PortfolioAnalysisFormProps {
    onGenerate: (data: any) => void;
    loading: boolean;
}

export const PortfolioAnalysisForm: React.FC<PortfolioAnalysisFormProps> = ({ onGenerate, loading }) => {
    const [formData, setFormData] = useState(() => {
        const today = new Date();
        const prevYear = today.getFullYear() - 1;

        // Start Date: Dec 31st of previous year
        const startDate = new Date(prevYear, 11, 31).toISOString().split('T')[0];

        // End Date: Last day of previous month
        // new Date(year, month, 0) gives the last day of the *previous* month (if month is 0-indexed current month)
        // Actually new Date(year, month, 0) gives last day of previous month.
        // If today is Feb (month 1), we want Jan 31st.
        // new Date(2024, 1, 0) -> Jan 31st 2024.
        const lastDayPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const endDate = lastDayPrevMonth.toISOString().split('T')[0];

        return {
            profile: "Moderado",
            horizon: "3 años",
            objective: "Generar rentas",
            startDate,
            endDate
        };
    });

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(formData);
    };

    return (
        <Card className="max-w-2xl mx-auto shadow-xl border border-border/50 bg-card text-card-foreground">
            <CardHeader className="border-b border-border/50 pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    Informe de Estrategia y Seguimiento
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                    Configure los parámetros para el análisis de su cartera por IA.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" />
                                Perfil del Inversor
                            </label>
                            <select
                                name="profile"
                                value={formData.profile}
                                onChange={handleChange}
                                className="w-full p-3 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                            >
                                <option value="Conservador">Conservador</option>
                                <option value="Moderado">Moderado</option>
                                <option value="Dinámico">Dinámico</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                Horizonte Temporal
                            </label>
                            <select
                                name="horizon"
                                value={formData.horizon}
                                onChange={handleChange}
                                className="w-full p-3 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                            >
                                <option value="1 año">1 año</option>
                                <option value="2 años">2 años</option>
                                <option value="3 años">3 años</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary" />
                                Objetivo de la Cartera
                            </label>
                            <select
                                name="objective"
                                value={formData.objective}
                                onChange={handleChange}
                                className="w-full p-3 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all"
                            >
                                <option value="Preservar capital">Preservar capital</option>
                                <option value="Generar rentas">Generar rentas</option>
                                <option value="Crecimiento agresivo">Crecimiento agresivo</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                Rango de Fechas
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="relative">
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="w-full py-2 px-3 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all placeholder:text-muted-foreground text-sm min-w-[140px] appearance-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        className="w-full py-2 px-3 rounded-lg border border-input bg-background/50 text-foreground focus:ring-2 focus:ring-ring focus:border-input outline-none transition-all placeholder:text-muted-foreground text-sm min-w-[140px] appearance-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-3 [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 cursor-pointer [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-border/50 flex justify-end">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 text-base shadow-lg shadow-primary/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Generando Informe Completo...
                                </>
                            ) : "Generar Informe Profesional"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
