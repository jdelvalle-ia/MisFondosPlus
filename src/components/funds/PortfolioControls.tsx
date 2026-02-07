import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { usePortfolio } from "@/context/PortfolioContext";
import { ICartera } from "@/types";
import { Button } from "@/components/ui/Button";

interface PortfolioControlsProps {
    mode?: 'all' | 'import-only-button' | 'export-only-button';
    className?: string;
}

export const PortfolioControls = ({ mode = 'all', className }: PortfolioControlsProps) => {
    const { portfolio, setPortfolio, addLog } = usePortfolio();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        if (!portfolio) {
            alert('No hay datos en la cartera para exportar.');
            return;
        }
        const dataStr = JSON.stringify(portfolio, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const cleanName = portfolio.info_cartera.nombre.replace(/\s+/g, '_');
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `Cartera_${cleanName}_${dateStr}.json`;
        a.click();
        addLog("Cartera exportada a JSON.");
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string) as ICartera;
                if (json.fondos && json.info_cartera) {
                    setPortfolio(json);
                    addLog(`Cartera cargada exitosamente: ${json.info_cartera.nombre}`);
                } else {
                    const msg = "Error: El archivo JSON no tiene el formato esperado (faltan fondos o info_cartera).";
                    addLog(msg);
                    alert("Formato de JSON inválido");
                }
            } catch (err) {
                console.error(err);
                const msg = `Error al leer el archivo JSON: ${err instanceof Error ? err.message : String(err)}`;
                addLog(msg);
                alert("Error al leer el archivo JSON");
            }
        };
        reader.readAsText(file);
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    if (mode === 'export-only-button') {
        return (
            <button onClick={handleExport} className={className}>
                <Download className="w-5 h-5" />
                Descargar Copia
            </button>
        );
    }

    if (mode === 'import-only-button') {
        return (
            <>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImport}
                    className="hidden"
                    accept=".json"
                />
                <button onClick={triggerFileInput} className={className}>
                    <Upload className="w-5 h-5" />
                    Seleccionar Archivo
                </button>
            </>
        );
    }

    return (
        <div className="flex gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
            />
            <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className="w-4 h-4 mr-2" /> Importar JSON
            </Button>
            <Button
                onClick={handleExport}
            >
                <Download className="w-4 h-4 mr-2" /> Exportar JSON
            </Button>
        </div>
    );
};
