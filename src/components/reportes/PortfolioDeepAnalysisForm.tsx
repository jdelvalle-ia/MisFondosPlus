import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Loader2, TrendingUp, Calendar } from "lucide-react";

interface PortfolioDeepAnalysisFormProps {
    onGenerate: () => void;
    loading: boolean;
}

export const PortfolioDeepAnalysisForm: React.FC<PortfolioDeepAnalysisFormProps> = ({ onGenerate, loading }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate();
    };

    return (
        <Card className="max-w-2xl mx-auto shadow-xl border border-border/50 bg-card text-card-foreground">
            <CardHeader className="border-b border-border/50 pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    Análisis de la Cartera (IA)
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                    Análisis de la cartera actual y su contraste con los informes de estrategia publicados por las primeras firmas de gestión de patrimonios.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                        <p className="text-sm text-foreground/80 leading-relaxed italic">
                            "Este informe avanzado utiliza inteligencia artificial para auditar su distribución actual, contrastándola con las últimas tesis de inversión de la banca privada."
                        </p>
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
                                    Ejecutando Deep Research...
                                </>
                            ) : "Ejecutar Deep Research"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};
