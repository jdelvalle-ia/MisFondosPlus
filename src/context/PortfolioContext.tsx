"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ICartera } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { updateFundWithApiData } from '@/lib/fund-utils';

interface PortfolioContextType {
    portfolio: ICartera | null;
    setPortfolio: (data: ICartera) => void;
    loading: boolean;
    refreshPortfolio: () => Promise<void>;
    logs: string[];
    addLog: (msg: string) => void;
    isConsoleOpen: boolean;
    toggleConsole: () => void;
    moveFund: (fromIndex: number, toIndex: number) => void;
    renamePortfolio: (name: string) => void;
    refreshStatus: { current: string; remaining: number; total: number } | null;
    refreshFund: (isin: string) => Promise<void>;
    lastSyncTime: Date | null;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
    const [portfolio, setPortfolioState] = useState<ICartera | null>(null);
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<string[]>([]);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [refreshStatus, setRefreshStatus] = useState<{ current: string; remaining: number; total: number } | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const toggleConsole = () => setIsConsoleOpen(prev => !prev);

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
    };

    // Load from local storage on mount
    useEffect(() => {
        const loadPortfolio = () => {
            try {
                const stored = localStorage.getItem('misFondos_portfolio');
                if (stored) {
                    setPortfolioState(JSON.parse(stored));
                    addLog("Portfolio loaded from local storage");
                } else {
                    addLog("No portfolio found in local storage");
                }

                const storedSync = localStorage.getItem('misFondos_lastSync');
                if (storedSync) {
                    setLastSyncTime(new Date(storedSync));
                }
            } catch (error) {
                console.error("Failed to load portfolio from storage", error);
                addLog(`Error loading portfolio: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                setLoading(false);
            }
        };
        loadPortfolio();
    }, []);

    const setPortfolio = (data: ICartera) => {
        setPortfolioState(data);
        localStorage.setItem('misFondos_portfolio', JSON.stringify(data));
        // addLog(`Portfolio updated: ${data.info_cartera.nombre}`); // Redundant
    };

    const refreshPortfolio = async () => {
        if (!portfolio || loading) return; // Prevent concurrent updates
        setLoading(true);
        const startTime = Date.now();
        const total = portfolio.fondos.length;

        addLog(`=== INICIANDO SINCRONIZACIÓN MASIVA DE ${total} FONDOS ===`);
        addLog(`Hora de inicio: ${new Date().toLocaleTimeString()}`);

        // We will mutate a clone of the funds array to keep track, 
        // but we will ALSO update the state incrementally.
        let currentFunds = [...portfolio.fondos];

        // Sequential update to avoid rate limits
        for (let i = 0; i < total; i++) {
            // Always get the latest state/clone to ensure we don't overwrite previous loop updates if state changed elsewhere (unlikely during blocking load, but good practice)
            const fondo = currentFunds[i];
            const remaining = total - 1 - i;

            setRefreshStatus({ current: fondo.denominacion, remaining, total });
            addLog(`[${i + 1}/${total}] Solicitando datos para: ${fondo.denominacion}...`);

            try {
                // Call our server-side API which searches Google + Gemini
                const response = await fetch('/api/nav', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isin: fondo.ISIN, name: fondo.denominacion })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || response.statusText);
                }

                const data = await response.json();

                // Unified update logic
                const { success, stats } = updateFundWithApiData(fondo, data);

                if (success) {
                    addLog(`✓ Actualizado: ${stats}`);
                    if (data.debug && data.debug.includes("Delayed")) addLog(`  ℹ Nota: ${data.debug}`);

                    // --- INCREMENTAL SAVE START ---
                    // Create a new portfolio object with the updated funds array
                    // We need to clone the array deeply enough or just trust the mutation check above? 
                    // `updateFundWithApiData` mutated `fondo` which is a reference inside `currentFunds`.
                    // So `currentFunds` is already updated. We just need to trigger state update.
                    const updatedPortfolioState = {
                        ...portfolio,
                        fondos: [...currentFunds], // Create new array ref
                        info_cartera: {
                            ...portfolio.info_cartera,
                            ultima_actualizacion: new Date().toISOString()
                        }
                    };

                    // Update State & LocalStorage IMMEDIATELY
                    setPortfolio(updatedPortfolioState);
                    localStorage.setItem('misFondos_lastSync', new Date().toISOString());
                    // --- INCREMENTAL SAVE END ---

                } else {
                    addLog(`⚠ ${fondo.denominacion}: Sin cambios significativos.`);
                }
            } catch (err) {
                addLog(`✖ Error en ${fondo.denominacion}: ${err instanceof Error ? err.message : String(err)}`);
            }

            // --- RATE LIMITING DELAY ---
            // Wait 5 seconds before next request to avoid Gemini 429 errors
            if (i < total - 1) {
                // addLog(`  ... Esperando 5s para siguiente petición ...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const now = new Date();
        setRefreshStatus(null);
        setLastSyncTime(now);
        setLoading(false);
        addLog(`=== SINCRONIZACIÓN FINALIZADA EN ${duration}s ===`);
    };

    const moveFund = (fromIndex: number, toIndex: number) => {
        if (!portfolio) return;
        const newFunds = [...portfolio.fondos];
        const [movedFund] = newFunds.splice(fromIndex, 1);
        newFunds.splice(toIndex, 0, movedFund);
        setPortfolio({ ...portfolio, fondos: newFunds });
        addLog(`Fund reordered: ${movedFund.ISIN}`);
    };

    const renamePortfolio = (name: string) => {
        if (!portfolio) return;
        const updated = { ...portfolio, info_cartera: { ...portfolio.info_cartera, nombre: name } };
        setPortfolio(updated);
        addLog(`Portfolio renamed to: ${name}`);
    };

    const refreshFund = async (isin: string) => {
        if (!portfolio) return;
        const updatedFondos = JSON.parse(JSON.stringify(portfolio.fondos)) as typeof portfolio.fondos;
        const fundIndex = updatedFondos.findIndex((f: any) => f.ISIN === isin);
        if (fundIndex === -1) return;

        const fondo = updatedFondos[fundIndex];

        addLog(`Actualizando fondo individual: ${fondo.denominacion} (${isin})...`);
        const startTime = performance.now();

        try {
            // Call API
            const response = await fetch('/api/nav', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isin: fondo.ISIN, name: fondo.denominacion })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || response.statusText);
            }

            const data = await response.json();

            if (data.nav) {
                const { success, stats } = updateFundWithApiData(fondo, data);
                if (success) {
                    addLog(`✓ Actualizado ${fondo.denominacion}: ${stats}`);
                    if (data.debug) addLog(`  ℹ Debug: ${data.debug}`);
                }
            } else {
                addLog(`⚠ No se encontraron datos para ${fondo.denominacion}`);
                if (data.debug) addLog(`  ℹ Debug: ${data.debug}`);
            }

            // Update state with new data (even if no change, triggers re-render)
            const newPortfolio = { ...portfolio, fondos: updatedFondos };
            setPortfolio(newPortfolio);
            // Save to local storage
            localStorage.setItem('portfolio_v2', JSON.stringify(newPortfolio));

        } catch (err) {
            addLog(`⚠ Error al actualizar ${fondo.denominacion}: ${err instanceof Error ? err.message : String(err)}`);
        }


        const updatedPortfolio = {
            ...portfolio,
            fondos: updatedFondos,
            info_cartera: {
                ...portfolio.info_cartera,
                ultima_actualizacion: new Date().toISOString()
            }
        };
        setPortfolio(updatedPortfolio);
    };

    return (
        <PortfolioContext.Provider value={{ portfolio, setPortfolio, loading, refreshPortfolio, logs, addLog, isConsoleOpen, toggleConsole, moveFund, renamePortfolio, refreshStatus, refreshFund, lastSyncTime }}>
            {children}
        </PortfolioContext.Provider>
    );
};

export const usePortfolio = () => {
    const context = useContext(PortfolioContext);
    if (context === undefined) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
};
