export interface IFondo {
    ISIN: string;
    denominacion: string;
    categoria: string;
    gestora: string;
    fecha_compra: string; // ISO Date
    importe: number;
    moneda: string;
    participaciones: number;
    comisiones: number;
    NAV_actual: number;
    fecha_NAV: string; // ISO Date
    historial?: { fecha: string; valor: number }[]; // 24-month history (end of month)
    is_real_time?: boolean;
    last_updated_source?: string;
}

export interface IHistorico {
    fecha: string; // ISO Date
    valor: number;
}

export interface ICartera {
    info_cartera: {
        nombre: string;
        ultima_actualizacion: string; // ISO Date
    };
    fondos: IFondo[];
    historico_24m: IHistorico[];
}

export interface IPortfolioContext {
    portfolio: ICartera | null;
    setPortfolio: (data: ICartera) => void;
    loading: boolean;
    refreshPortfolio: () => Promise<void>;
}
