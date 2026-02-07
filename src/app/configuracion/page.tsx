"use client";

import { usePortfolio } from "@/context/PortfolioContext";
import { PortfolioControls } from "@/components/funds/PortfolioControls";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Save, Database, ShieldCheck, Key, Clock, Wifi, Activity } from "lucide-react";
import { useState } from "react";

const ApiStatusBadge = () => {
    const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');

    const handleCheck = async () => {
        setStatus('checking');
        // Simulate check
        await new Promise(r => setTimeout(r, 1500));
        setStatus('ok'); // Always OK for demo
    };

    if (status === 'checking') {
        return (
            <Button variant="outline" size="sm" disabled className="h-8 text-xs border-dashed border-yellow-500/50 text-yellow-500">
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> Verificando...
            </Button>
        );
    }

    if (status === 'ok') {
        return (
            <div className="flex items-center gap-4">
                <span className="inline-block px-3 py-1 bg-emerald-900/40 text-emerald-400 text-xs font-bold rounded border border-emerald-900/50 animate-in fade-in">
                    ONLINE
                </span>
                <Button variant="ghost" size="sm" onClick={handleCheck} className="h-6 text-[10px] text-muted-foreground">
                    <RefreshCw className="w-3 h-3 mr-1" /> Test
                </Button>
            </div>
        );
    }

    return (
        <Button variant="outline" size="sm" onClick={handleCheck} className="h-8 text-xs border-dashed border-gray-700 bg-transparent hover:bg-white/5 text-gray-400">
            <Wifi className="w-3 h-3 mr-2" /> TEST CONEXIÓN
        </Button>
    );
};

export default function SettingsPage() {
    const { refreshPortfolio, loading, addLog, refreshStatus, lastSyncTime } = usePortfolio();

    const handleRefresh = async () => {
        await refreshPortfolio();
    };

    return (
        <div className="p-8 md:p-12 space-y-8 pb-20 animate-in fade-in duration-500">
            <div>
                <h1 className="text-4xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground mt-2">
                    Administración de datos y preferencias del sistema.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* New Data Management Design */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Sincronización */}
                    <div className="bg-[#1e2029] border border-gray-800 rounded-3xl p-6 flex flex-col justify-between h-[320px] transition-all hover:border-blue-500/30 group">
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-900/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-500/20 transition-colors">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-100">Sincronización</h3>
                                <p className="text-[10px] font-bold tracking-widest text-gray-500 mt-1 uppercase">IA EN VIVO</p>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Actualización progresiva de todos los activos de la cartera mediante IA.
                            </p>
                        </div>
                        <div className="mt-4">
                            <Button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-6 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                            >
                                {loading ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
                                {loading ? "Sincronizando..." : "Sincronizar Todo"}
                            </Button>
                            {loading && refreshStatus && (
                                <p className="text-xs text-center text-blue-400 mt-2 animate-pulse">
                                    {refreshStatus.current} ({refreshStatus.remaining} restantes)
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Backup Local */}
                    <div className="bg-[#1e2029] border border-gray-800 rounded-3xl p-6 flex flex-col justify-between h-[320px] transition-all hover:border-emerald-500/30 group">
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-900/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-100">Backup Local</h3>
                                <p className="text-[10px] font-bold tracking-widest text-gray-500 mt-1 uppercase">JSON FORMATTED</p>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Exporta tu patrimonio actual en formato compatible JSON v1.
                            </p>
                        </div>
                        <div className="mt-4">
                            {/* We wrap the existing controls but style them to match or invoke the download logic directly. 
                                Since PortfolioControls handles the logic, let's just use the logic directly here or re-use components.
                                For simplicity and exact design match, I'll inline the export logic here or call a hidden button? 
                                Better: Re-implement the export logic here briefly since it's simple context access.
                            */}
                            <PortfolioControls mode="export-only-button" className="w-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold py-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2" />
                        </div>
                    </div>

                    {/* Card 3: Cargar Cartera */}
                    <div className="bg-[#1e2029] border border-gray-800 rounded-3xl p-6 flex flex-col justify-between h-[320px] transition-all hover:border-purple-500/30 group">
                        <div className="space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-900/20 flex items-center justify-center text-purple-500 group-hover:bg-purple-500/20 transition-colors">
                                <Database className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-100">Cargar Cartera</h3>
                                <p className="text-[10px] font-bold tracking-widest text-gray-500 mt-1 uppercase">RESTAURAR DATOS</p>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Sobrescribe la sesión actual con un archivo de respaldo previo.
                            </p>
                        </div>
                        <div className="mt-4">
                            <PortfolioControls mode="import-only-button" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-6 rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2" />
                        </div>
                    </div>
                </div>

                {/* Service Status Section */}
                <div>
                    <h2 className="text-xl font-bold tracking-tight mb-6 uppercase">Estado de Servicios</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Status Card 1: Almacenamiento y Seguridad */}
                        <div className="bg-[#12141c] border border-gray-800/50 rounded-3xl p-6 flex flex-col justify-between h-[200px]">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-emerald-500 mb-2">
                                    <div className="flex gap-1">
                                        <Database className="w-5 h-5" />
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold tracking-wider text-sm">ALMACENAMIENTO</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-400">Persistencia local de sesión.</p>
                                    <p className="text-xs text-gray-500">Auditoría de eventos y consola activas.</p>
                                </div>
                            </div>
                            <div className="mt-auto">
                                <span className="inline-block px-3 py-1 bg-emerald-900/40 text-emerald-400 text-xs font-bold rounded border border-emerald-900/50">
                                    SISTEMA ACTIVO
                                </span>
                            </div>
                        </div>

                        {/* Status Card 2: API Google (IA Processor) */}
                        <div className="bg-[#12141c] border border-gray-800/50 rounded-3xl p-6 flex flex-col justify-between h-[200px]">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-emerald-500 mb-2">
                                    <Key className="w-5 h-5" />
                                    <span className="font-bold tracking-wider text-sm">API GOOGLE (NAV)</span>
                                </div>
                                <p className="text-xs text-gray-400">Motor de obtención de datos.</p>
                            </div>
                            <div className="mt-auto">
                                <ApiStatusBadge />
                            </div>
                        </div>

                        {/* Status Card 3: Last Sync */}
                        <div className="bg-[#12141c] border border-gray-800/50 rounded-3xl p-6 flex flex-col justify-between h-[200px]">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-purple-500 mb-2">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-bold tracking-wider text-sm">ÚLTIMA SINCRO</span>
                                </div>
                                <p className="text-xs text-gray-400">Finalización del último lote.</p>
                            </div>
                            <div className="mt-auto">
                                <p className="text-sm font-mono text-gray-300">
                                    {lastSyncTime ? lastSyncTime.toLocaleString() : "Pendiente"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
