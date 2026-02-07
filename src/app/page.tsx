"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { KPICards } from "@/components/dashboard/KPICards";
import { EvolutionChart } from "@/components/dashboard/EvolutionChart";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { FundRanking } from "@/components/dashboard/FundRanking";
import { useEffect } from "react";
import { ICartera } from "@/types";
import { ClientDate } from "@/components/common/ClientDate";

// Helper to generate consistent mock data on client side only if needed
const generateMockData = (): ICartera => {
  return {
    info_cartera: { nombre: "Cartera Demo", ultima_actualizacion: new Date().toISOString() },
    fondos: [
      { ISIN: "ES0123456789", denominacion: "Tech Giants Global A", categoria: "Renta Variable Tecnologia", gestora: "TechInvest", fecha_compra: "2024-01-15", importe: 12000, moneda: "EUR", participaciones: 150, comisiones: 20, NAV_actual: 85.50, fecha_NAV: "2024-02-01" },
      { ISIN: "US9876543210", denominacion: "S&P 500 Index Fund", categoria: "Renta Variable USA", gestora: "Vanguard", fecha_compra: "2023-06-10", importe: 25000, moneda: "USD", participaciones: 50, comisiones: 10, NAV_actual: 560.20, fecha_NAV: "2024-02-01" },
      { ISIN: "IE00B03HCZ61", denominacion: "Vanguard Global Bond", categoria: "Renta Fija Global", gestora: "Vanguard", fecha_compra: "2023-11-05", importe: 15000, moneda: "EUR", participaciones: 300, comisiones: 15, NAV_actual: 49.80, fecha_NAV: "2024-02-01" },
      { ISIN: "LU1234567890", denominacion: "BlackRock World Gold", categoria: "Materias Primas", gestora: "BlackRock", fecha_compra: "2023-08-20", importe: 8000, moneda: "EUR", participaciones: 200, comisiones: 25, NAV_actual: 38.00, fecha_NAV: "2024-02-01" },
      { ISIN: "FR0010135103", denominacion: "Carmignac Patrimoine A", categoria: "Mixto Flexible", gestora: "Carmignac", fecha_compra: "2022-03-15", importe: 20000, moneda: "EUR", participaciones: 35, comisiones: 50, NAV_actual: 610.00, fecha_NAV: "2024-02-01" },
      { ISIN: "IE0031442068", denominacion: "iShares Emerging Markets", categoria: "Renta Variable Emergente", gestora: "BlackRock", fecha_compra: "2023-01-10", importe: 10000, moneda: "USD", participaciones: 250, comisiones: 15, NAV_actual: 38.50, fecha_NAV: "2024-02-01" },
    ],
    historico_24m: Array.from({ length: 24 }, (_, i) => {
      // Use fixed logic instead of random to avoid hydration mismatch if called during render (though here it's in useEffect)
      // Moving inside useEffect guarantees client-side execution anyway.
      const baseValue = 85000;
      const growth = i * 600;
      // const volatility = (Math.random() - 0.5) * 3000; // keeping randomness is fine if only called in useEffect
      return {
        fecha: new Date(new Date().setMonth(new Date().getMonth() - (23 - i))).toISOString(),
        valor: baseValue + growth
      };
    })
  };
};

export default function Home() {
  const { portfolio, setPortfolio, loading } = usePortfolio();

  useEffect(() => {
    // If no portfolio loaded, load mock data for demonstration immediately
    if (!loading && !portfolio) {
      setPortfolio(generateMockData());
    }
  }, [loading, portfolio, setPortfolio]);

  return (
    <div className="p-8 md:p-12 space-y-8 bg-background pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Visión general de su patrimonio y rendimiento de activos.
          </p>
        </div>
        <div className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground flex items-center gap-2">
          {/* Ensure date rendering is client-safe or handle hydration */}
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Última actualización: <ClientDate date={portfolio?.info_cartera.ultima_actualizacion} />
        </div>
      </div>

      <KPICards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <EvolutionChart />
        </div>
        <div className="space-y-6">
          <AllocationChart />
        </div>
      </div>

      <FundRanking />

    </div >
  );
}
