"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ICartera } from '@/types';
import { formatCurrency } from '@/lib/utils';

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
        addLog(`Portfolio updated: ${data.info_cartera.nombre}`);
    };

    const refreshPortfolio = async () => {
        if (!portfolio || loading) return; // Prevent concurrent updates
        setLoading(true);
        const startTime = Date.now();
        addLog(`Iniciando actualización REAL de valores para ${portfolio.fondos.length} fondos...`);

        // Deep clone to safely mutate
        const updatedFondos = JSON.parse(JSON.stringify(portfolio.fondos)) as typeof portfolio.fondos;
        const total = updatedFondos.length;

        // Sequential update to avoid rate limits
        for (let i = 0; i < total; i++) {
            const fondo = updatedFondos[i];
            const remaining = total - 1 - i;

            setRefreshStatus({ current: fondo.denominacion, remaining, total });
            addLog(`Buscando datos en Google para [${i + 1}/${total}]: ${fondo.denominacion}...`);

            const fundStartTime = performance.now();

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

                // Update Fund Data with Real Values
                if (data.nav) {
                    fondo.NAV_actual = data.nav;
                    fondo.fecha_NAV = data.date || new Date().toISOString();
                    fondo.is_real_time = data.is_real_time;
                    fondo.last_updated_source = "Google/Gemini";

                    if (data.currency && data.currency !== fondo.moneda) {
                        addLog(`⚠️ Moneda diferente detectada para ${fondo.denominacion}: ${data.currency} vs ${fondo.moneda}`);
                        // Optional: update currency if desired, or just warn
                    }

                    addLog(`✓ Actualizado ${fondo.denominacion}: ${formatCurrency(data.nav)} (${data.date})${data.is_real_time === false ? ' [Dato antiguo]' : ''}`);
                    if (data.debug) addLog(`  ℹ Debug: ${data.debug}`);

                    // --- PROCESS HISTORY FROM API ---
                    if (data.history && Array.isArray(data.history) && data.history.length > 0) {
                        // Init history if needed
                        if (!fondo.historial) fondo.historial = [];

                        addLog(`  ↳ Recibidos ${data.history.length} puntos históricos.`);

                        data.history.forEach((hPoint: any) => {
                            if (!hPoint.nav || !hPoint.date) return;

                            // Normalize to End of Month, BUT keep exact date if it's the current month (don't project to future)
                            const hDate = new Date(hPoint.date);
                            const now = new Date();
                            const isCurrentMonth = hDate.getMonth() === now.getMonth() && hDate.getFullYear() === now.getFullYear();

                            let dateStr;
                            if (isCurrentMonth) {
                                // Use exact date for current month
                                dateStr = hPoint.date;
                            } else {
                                // For past months, normalize to end of month for cleaner chart
                                const endOfHMonth = new Date(hDate.getFullYear(), hDate.getMonth() + 1, 0);
                                endOfHMonth.setHours(12, 0, 0, 0);
                                dateStr = endOfHMonth.toISOString();
                            }

                            // Check if we already have this month-year
                            const existingIndex = fondo.historial!.findIndex(h => {
                                const exDate = new Date(h.fecha);
                                return exDate.getFullYear() === hDate.getFullYear() &&
                                    exDate.getMonth() === hDate.getMonth();
                            });

                            const valTotal = Number(hPoint.nav) * fondo.participaciones;

                            if (existingIndex >= 0) {
                                // Update existing (User prefers keeping data, but updating value if found is safe)
                                fondo.historial![existingIndex] = { fecha: dateStr, valor: valTotal };
                            } else {
                                // Insert new
                                fondo.historial!.push({ fecha: dateStr, valor: valTotal });
                            }
                        });

                        // Sort by date ascending (old -> new)
                        fondo.historial!.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

                        // Keep only last 24 months (newest)
                        if (fondo.historial!.length > 24) {
                            fondo.historial = fondo.historial!.slice(-24);
                        }
                    }
                }

            } catch (err) {
                // console.error(`Error updating fund ${fondo.ISIN}:`, err);
                addLog(`⚠ Error al actualizar ${fondo.denominacion}: ${err instanceof Error ? err.message : String(err)}`);
            }

            // --- CURRENT MONTH UPDATE LOGIC ---
            // Create history array if missing
            if (!fondo.historial) {
                fondo.historial = [];
            }

            const now = new Date();
            const currentVal = fondo.participaciones * fondo.NAV_actual;
            // Use the actual NAV date for the history entry if it's the current month
            const useDate = fondo.fecha_NAV || now.toISOString();

            // fondo.historial is guaranteed to be array here
            const lastEntry = fondo.historial!.length > 0 ? fondo.historial![fondo.historial!.length - 1] : null;

            let shouldPush = true;
            if (lastEntry) {
                const lastDate = new Date(lastEntry.fecha);
                // Check if same month and year
                if (lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear()) {
                    // Same month: Update existing entry with LATEST exact date
                    fondo.historial![fondo.historial!.length - 1] = {
                        fecha: useDate,
                        valor: currentVal
                    };
                    shouldPush = false;
                }
            }

            if (shouldPush) {
                fondo.historial!.push({
                    fecha: useDate,
                    valor: currentVal
                });
            }

            // Keep only last 24 months
            if (fondo.historial.length > 24) {
                fondo.historial = fondo.historial.slice(-24);
            }

            // --- RATE LIMITING DELAY ---
            // Wait 5 seconds before next request to avoid Gemini 429 errors (1 requests per 5s = 12 RPM, safe for 15 RPM limit)
            if (i < total - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // Save updated history to state
        const updatedPortfolio = {
            ...portfolio,
            fondos: updatedFondos,
            info_cartera: {
                ...portfolio.info_cartera,
                ultima_actualizacion: new Date().toISOString()
            }
        };
        setPortfolio(updatedPortfolio);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const now = new Date();
        setRefreshStatus(null);
        setLastSyncTime(now);
        localStorage.setItem('misFondos_lastSync', now.toISOString());
        setLoading(false);
        addLog(`✅ Sincronización finalizada en ${duration}s.`);
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
                fondo.NAV_actual = data.nav;
                fondo.fecha_NAV = data.date || new Date().toISOString();
                addLog(`✓ Actualizado ${fondo.denominacion}: ${formatCurrency(data.nav)} (${data.date})`);
                if (data.debug) addLog(`  ℹ Debug: ${data.debug}`);

                // --- PROCESS HISTORY FROM API ---
                if (data.history && Array.isArray(data.history) && data.history.length > 0) {
                    if (!fondo.historial) fondo.historial = [];

                    data.history.forEach((hPoint: any) => {
                        if (!hPoint.nav || !hPoint.date) return;

                        // Normalize to End of Month, BUT keep exact date if it's the current month
                        const hDate = new Date(hPoint.date);
                        const now = new Date();
                        const isCurrentMonth = hDate.getMonth() === now.getMonth() && hDate.getFullYear() === now.getFullYear();

                        let dateStr;
                        if (isCurrentMonth) {
                            dateStr = hPoint.date;
                        } else {
                            const endOfHMonth = new Date(hDate.getFullYear(), hDate.getMonth() + 1, 0);
                            endOfHMonth.setHours(12, 0, 0, 0);
                            dateStr = endOfHMonth.toISOString();
                        }

                        const existingIndex = fondo.historial!.findIndex(h => {
                            const exDate = new Date(h.fecha);
                            // Compare with hDate which is always defined
                            return exDate.getFullYear() === hDate.getFullYear() &&
                                exDate.getMonth() === hDate.getMonth();
                        });

                        const valTotal = Number(hPoint.nav) * fondo.participaciones;

                        if (existingIndex >= 0) {
                            fondo.historial![existingIndex] = { fecha: dateStr as string, valor: valTotal };
                        } else {
                            fondo.historial!.push({ fecha: dateStr as string, valor: valTotal });
                        }
                    });

                    fondo.historial.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                }
            }
        } catch (err) {
            addLog(`⚠ Error al actualizar ${fondo.denominacion}: ${err instanceof Error ? err.message : String(err)}`);
        }

        // Logic History Update Single
        if (!fondo.historial) fondo.historial = [];
        const now = new Date();
        const currentVal = fondo.participaciones * fondo.NAV_actual;
        const useDate = fondo.fecha_NAV || now.toISOString();

        const lastEntry = fondo.historial!.length > 0 ? fondo.historial![fondo.historial!.length - 1] : null;
        let shouldPush = true;

        if (lastEntry) {
            const lastDate = new Date(lastEntry.fecha);
            if (lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear()) {
                fondo.historial![fondo.historial!.length - 1] = { fecha: useDate, valor: currentVal };
                shouldPush = false;
            }
        }
        if (shouldPush) fondo.historial!.push({ fecha: useDate, valor: currentVal });

        // Sort and Slice
        fondo.historial.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        if (fondo.historial!.length > 24) fondo.historial = fondo.historial!.slice(-24);

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
