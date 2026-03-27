import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { marketContext } from "@/data/marketContext";

export async function POST(req: Request) {
    try {
        const {
            portfolioData
        } = await req.json();

        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
        const notebookId = process.env.NOTEBOOK_ID;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Falta la API Key de Google Gemini" },
                { status: 500 }
            );
        }

        if (!portfolioData) {
            return NextResponse.json(
                { error: "Faltan datos obligatorios para el informe" },
                { status: 400 }
            );
        }

        // Initialize Gemini.
        // gemini-2.0-flash is capable of deep reporting and follows instructions well.
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Extraer específicamente los datos requeridos por el usuario: nombre del fondo, ISIN, valor actual y %
        const compactPortfolioData = portfolioData.fondos.map((fund: { denominacion: string, ISIN: string, endBalance: number, reportData?: { pesoPct: string } }) => ({
            "Nombre del fondo": fund.denominacion,
            "ISIN": fund.ISIN,
            "Valor actual": (new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(fund.endBalance)),
            "% en la cartera": fund.reportData?.pesoPct || "0%"
        }));

        // Construct the Prompt requested by the user
        const promptParts = [
            `Rol: Actúa como un Senior Wealth Manager de una entidad de Banca Privada de primer nivel (Estilo Goldman Sachs o Bankinter Wealth Management).`,
            `Instrucción CRÍTICA de privacidad y formato: NO incluyas campos como "Cliente", "Fecha" (ya se incluye en la cabecera del sistema), ni "Elaborado por" o "Asesor". El informe debe ser un documento de análisis directo y profesional.`,
            `Instrucción CRÍTICA de contenido: DEVUELVE ÚNICAMENTE el contenido del informe en formato Markdown profesional. NO incluyas introducciones ni despedidas.`,
            `Calidad del Contenido: NO generes un "borrador". Genera el INFORME FINAL COMPLETO.`,
            `Contexto y Fuentes:`,
            `Analiza la cartera cruzando los datos con los informes estratégicos adjuntos de NotebookLM:`,
            `- Bankinter - Cartera modelo fondos Bankinter (para comparativa táctica).`,
            `- Estrategia de Inversión y Rentas: Informe Ejecutivo CIO (Para el marco macro).`,
            `- Resumen de Perspectivas Financieras Views: BlackRock/J.P. Morgan (Para la visión de mercado).`,
            ``,
            `**DATOS DE LA CARTERA DEL CLIENTE:**`,
            `${JSON.stringify(compactPortfolioData, null, 2)}`,
            ``,
            `**CONTEXTO DE MERCADO ACTUAL (Simulación NotebookLM):**`,
            `*   **ID de la Fuente de Contexto:** ${notebookId || 'N/A'}`,
            `${marketContext}`,
            ``,
            `Instrucciones de Análisis (Obligatorio - Sé exhaustivo):`,
            `1. Diagnóstico de Rentas (Income Focus): Calcula el yield estimado de la cartera. Determina si el 'carry' es suficiente para batir la inflación esperada del 3%.`,
            `2. Duelo de Titanes (vs S&P 500): Compara la beta y el estilo de la cartera contra el S&P 500. Evalúa el riesgo de concentración tecnológico.`,
            `3. Auditoría de Costes (TER > 1.5%): Identifica fondos específicos donde el TER supere el 1,5% e indica si se justifica.`,
            `4. Matriz de Riesgo 3 Años: Evalúa volatilidad y liquidez.`,
            ``,
            `Recomendaciones Tácticas y Hoja de Ruta:`,
            `- Bajas: Propón la salida de fondos con bajo rendimiento o costes excesivos.`,
            `- Altas: Sugiere la entrada en Activos Reales e Infraestructuras.` +
            ` **LIMITACIÓN CRÍTICA**: Los fondos que recomiendes DEBEN estar denominados siempre en EUROS (EUR) y estar disponibles en la plataforma de Morningstar y/o Bankinter.`,
            `- **CRÍTICO - Hoja de Ruta punto 3**: Al proponer investigar y seleccionar fondos de "bonos corporativos, High Yield, REITs de Data Centers e infraestructuras", DEBES sugerir nombres de fondos reales e ISINs específicos que sean líderes en estas categorías (ej. de gestoras como PIMCO, BlackRock, J.P. Morgan, DWS, etc.). RECUERDA: Solo fondos en moneda EURO y disponibles en Morningstar/Bankinter.`,
            ``,
            `**POLÍTICA DE TOLERANCIA CERO CON LA INVENCIÓN (HALLUCINATION):**`,
            `1. **NO TE INVENTES NADA**: Si recomiendas un fondo, debe ser un fondo real con un ISIN real.`,
            `2. **VERIFICACIÓN DE ISIN**: Si no tienes la certeza absoluta del 100% del ISIN exacto para la clase en EUROS de un fondo, **NO LO ESCRIBAS**. En su lugar, escribe exactamente: "[VERIFICAR ISIN EN BANKINTER]". Es preferible el nombre correcto sin ISIN que un ISIN inventado.`,
            `3. **VERIFICACIÓN DE CLASE**: Asegúrate de que los ISINs que proporciones corresponden a la clase acumulativa (Acc) y en EUROS (EUR) del fondo siempre que sea posible.`,
            `4. **REQUISITO DE MONEDA Y PLATAFORMA**: Verifica mentalmente que el fondo se comercializa en España vía Bankinter o está listado en Morningstar España en EUR.`,
            ``,
            `Estructura del Informe (Formato para renderizar a PDF):`,
            `- Portada y Resumen Ejecutivo: Visión directa de la salud financiera.`,
            `- Tabla de KPIs Críticos: (Yield, TER Medio, Concentración Sectorial, Beta vs Benchmark).`,
            `- Análisis por Bloques: (Renta Variable, Renta Fija, Alternativos).`,
            `- Conclusiones Críticas: Los 3 mayores riesgos actuales.`,
            `- Hoja de Ruta (Próximas 48 horas): Pasos concretos de ejecución, incluyendo los nombres e ISINs de fondos sugeridos en el punto de investigación.`,
            `- **TABLA RESUMEN DE RECOMENDACIONES**: Incluye una tabla con las columnas: | Fondo | ISIN | Acción Recomendada | Motivo |. En "Acción Recomendada" usa iconos: 🟢 Mantener, 🔴 Vender, 🟡 Traspasar / Bajo Vigilancia.`,
            ``,
            `Tono: Profesional, directo, analítico y con profundidad técnica de "Banca Privada".`,
            `Extensión: Contenido extremadamente detallado de unas 15 páginas. No resumas.`,
            `IMPORTANTE: Empieza directamente con el título "# INFORME DE REVISIÓN Y OPTIMIZACIÓN DE CARTERA".`
        ];

        const prompt = promptParts.join('\n');

        // Generate Content
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        // Limpiar posibles bloques de código Markdown que envuelvan la respuesta (causan problemas de renderizado)
        if (responseText.trim().startsWith("```markdown")) {
            responseText = responseText.trim().replace(/^```markdown\n?/, "").replace(/\n?```$/, "");
        } else if (responseText.trim().startsWith("```")) {
            responseText = responseText.trim().replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
        }

        return NextResponse.json({ report: responseText });

    } catch (error: unknown) {
        console.error("Error generando el informe profundo:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Error interno al ejecutar Deep Research" },
            { status: 500 }
        );
    }
}
