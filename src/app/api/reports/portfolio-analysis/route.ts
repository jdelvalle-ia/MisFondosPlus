import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
// import { marketContext } from "@/data/marketContext"; // Ensure this path is correct

// Use a dynamic import or fetch logic if we want to support real-time updates later
// For now, importing the static placeholder
import { marketContext } from "@/data/marketContext";

export async function POST(req: Request) {
    try {
        const {
            portfolioData,
            profile,       // "Conservador", "Moderado", "Dinámico"
            horizon,       // "1 año", "2 años", "3 años"
            objective,     // "Preservar capital", "Generar rentas", "Crecimiento agresivo"
            startDate,
            endDate,
            portfolioStats // Receive pre-calculated stats
        } = await req.json();

        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        const notebookId = process.env.NOTEBOOK_ID;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Falta la API Key de Google Gemini" },
                { status: 500 }
            );
        }

        if (!portfolioData || !profile || !horizon || !objective) {
            return NextResponse.json(
                { error: "Faltan datos obligatorios para el informe" },
                { status: 400 }
            );
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Construct the Prompt
        const promptParts = [
            `Actúa como un **Gestor de Patrimonios Senior** en una firma de Banca Privada de primer nivel. Estás redactando un **Informe de Estrategia de Inversión** para un cliente VIP.`,
            ``,
            `**IMPORTANTE: ANONIMIZACIÓN**`,
            `*   **NO uses el nombre del cliente** en el cuerpo del texto. Refiérete únicamente a "la Cartera" o "el Cliente". Solo se permite el nombre en el título principal.`,
            ``,
            `**Perfil del Cliente:**`,
            `*   **Perfil:** ${profile}`,
            `*   **Objetivo:** ${objective}`,
            `*   **Horizonte Temporal:** ${horizon}`,
            ``,
            `**datos PRE-CALCULADOS de la Cartera (USA ESTOS VALORES EXACTOS):**`,
            `*   **Valor Inicial:** ${portfolioStats?.totalStartValue || 'N/A'}`,
            `*   **Valor Final:** ${portfolioStats?.totalEndValue || 'N/A'}`,
            `*   **Rentabilidad Absoluta:** ${portfolioStats?.absoluteReturn || 'N/A'}`,
            `*   **Rentabilidad %:** ${portfolioStats?.pctReturn || 'N/A'}`,
            ``,
            `**Contexto del Informe:**`,
            `*   **Fecha Inicio Análisis:** ${startDate}`,
            `*   **Fecha Fin Análisis:** ${endDate}`,
            `*   **Fuente de Contexto de Mercado:** NotebookLM (ID: ${notebookId || 'N/A'})`,
            ``,
            `**Datos de la Cartera (Detalle):**`,
            `${JSON.stringify(portfolioData, null, 2)}`,
            ``,
            `**Contexto de Mercado Actual:**`,
            `${marketContext}`,
            ``,
            `**INSTRUCCIONES DE GENERACIÓN:**`,
            `Genera un informe **EXTENSO, PROFUNDO Y DETALLADO** (longitud objetivo: equivalente a 10-12 páginas A4 estándar).`,
            `El tono debe ser **altamente profesional, sofisticado y analítico**, propio de un informe de banca privada para un cliente de alto patrimonio.`,
            `Usa terminología financiera precisa. Evita generalidades; sé específico con los datos proporcionados.`,
            ``,
            `**ESTRUCTURA OBLIGATORIA DEL INFORME:**`,
            ``,
            `# 1. Portada y Presentación`,
            `(Título del informe: "Informe de Estrategia de Inversión - ${portfolioData.info_cartera.nombre}", fechas del periodo analizado y un breve párrafo introductorio formal sin nombre de cliente).`,
            ``,
            `# 2. Resumen Ejecutivo (Executive Summary)`,
            `*   **Visión Global:** Resumen de alto nivel del rendimiento de la cartera y su alineación con el objetivo de **${objective}**.`,
            `*   **Datos Clave:**`,
            `    *   Valor Final: **${portfolioStats?.totalEndValue}**`,
            `    *   Rentabilidad Absoluta: **${portfolioStats?.absoluteReturn}**`,
            `    *   Rentabilidad %: **${portfolioStats?.pctReturn}**`,
            `    *   Volatilidad Estimada: (Analiza la composición para estimar: Baja/Media/Alta).`,
            `*   **Conclusión Principal:** ¿Va la cartera por buen camino? (Respuesta directa y justificada).`,
            ``,
            `# 3. Contexto Macrceconómico y de Mercado`,
            `(Utiliza el contexto proporcionado para escribir un análisis profundo de la situación actual).`,
            `*   **Entorno Macro:** Crecimiento, inflación y políticas de bancos centrales.`,
            `*   **Renta Variable:** Análisis de situación del S&P 500 y mercados principales.`,
            `*   **Renta Fija:** Perspectivas de tipos y curvas de deuda.`,
            `*   **Impacto en la Cartera:** Cómo este entorno específico afecta a la composición actual de la cartera del cliente.`,
            ``,
            `# 4. Análisis Detallado de la Cartera`,
            `*   **Evolución Patrimonial:** Análisis del crecimiento del capital entre ${startDate} y ${endDate}.`,
            `*   **Generación de Rentas (Yield):** Dado que el cliente busca **${objective}**, analiza en profundidad los flujos de caja (dividendos/cupones) implícitos en los fondos.`,
            `*   **Desglose por Activos:** Comentario detallado sobre la asignación (Renta Variable vs Renta Fija vs Liquidez). ¿Es adecuada para un perfil **${profile}**?`,
            ``,
            `# 5. Análisis de Rentabilidad y Riesgo`,
            `*   **Comparativa con Benchmark (S&P 500 / Global Mix):** ¿Ha batido la cartera al mercado? Si no, ¿por qué? (Ej. sesgo defensivo, costes, selección de activos).`,
            `*   **Análisis de Volatilidad:** Evaluación del riesgo asumido. ¿Ha habido Drawdowns significativos?`,
            `*   **Ratio de Eficiencia:** Comentario sobre el Binomio Rentabilidad/Riesgo.`,
            ``,
            `# 6. Eficiencia de Costes y Arquitectura Abierta`,
            `*   **Análisis de TER:** Identifica y lista explícitamente cualquier fondo con costes totales superiores al 1.5%.`,
            `*   **Evaluación de Valor:** ¿Justifican estos fondos caros su coste mediante Alpha (rentabilidad extra)?`,
            `*   **Impacto en Rentas:** Calcula o estima cuánto drenan las comisiones de la rentabilidad neta.`,
            ``,
            `# 7. Recomendaciones Estratégicas y Tácticas (La sección más importante)`,
            `*   **Diagnóstico:** "Semáforo" de la cartera (Verde/Amarillo/Rojo) con justificación.`,
            `*   **Recomendaciones de Compra/Venta:**`,
            `    *   *Funds to Watch:* Fondos en vigilancia por bajo desempeño.`,
            `    *   *Alternativas:* Sugiere tipos de activos o fondos (genéricos o específicos si los conoces) para mejorar el perfil Rentabilidad/Riesgo.`,
            `*   **Ajuste al Horizonte (${horizon}):** ¿Es necesario rebalancear para reducir riesgo o aumentar potencial de aquí a ${horizon}?`,
            ``,
            `# 8. Anexo Estadístico`,
            `*   Tabla completa desglosada con las siguientes columnas OBLIGATORIAS.`,
            `*   **IMPORTANTE:** Para esta tabla, USA LOS DATOS PRE-CALCULADOS que se envían en el campo reportData de cada fondo:`,
            `    *   **Nombre del Fondo**`,
            `    *   **ISIN**`,
            `    *   **Saldo a ${startDate}** (Usa fund.reportData.saldoInicial)`,
            `    *   **Saldo a ${endDate}** (Usa fund.reportData.saldoFinal)`,
            `    *   **% Crecimiento** (Usa fund.reportData.crecimientoPct)`,
            `    *   **% Peso** (Usa fund.reportData.pesoPct)`,
            ``,
            `**Formato de Salida:**`,
            `*   Usa Markdown estricto.`,
            `*   Utiliza **Negritas** para resaltar cifras y conceptos clave.`,
            `*   Usa tablas Markdown para los datos numéricos.`,
            `*   Separa las secciones claramente.`,
            `*   Extiéndete en los comentarios: evita frases cortas; usa párrafos explicativos completos.`,
            ``,
            `Genera el informe ahora.`
        ];

        const prompt = promptParts.join('\n');

        // Generate Content
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({ report: responseText });

    } catch (error: any) {
        console.error("Error generando el informe:", error);
        return NextResponse.json(
            { error: error.message || "Error interno al generar el informe" },
            { status: 500 }
        );
    }
}
