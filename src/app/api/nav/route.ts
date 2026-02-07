import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
    try {
        const { isin, name } = await request.json();

        // Use ONLY the Gemini API Key
        const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

        if (!geminiKey) {
            return NextResponse.json({ error: "Missing GOOGLE_GEMINI_API_KEY" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(geminiKey);

        // Use gemini-1.5-flash with Google Search tool enabled
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Using the latest flash model for best performance/cost ratio
            tools: [{ googleSearch: {} } as any]
        });

        console.log(`Using Gemini Grounding to find NAV for: ${isin} (${name})`);

        // Clean name to remove confusing currency symbols like ($)
        const cleanName = name.replace(/\(\$\)/g, '').replace(/\(€\)/g, '').trim();

        const year = new Date().getFullYear();
        const lastYear = year - 1;
        const twoYearsAgo = year - 2;

        const today = new Date().toISOString().split('T')[0];
        const prompt = `Eres un analista de datos financieros experto. Hoy es ${today}. Tu objetivo es encontrar el NAV actual y CUALQUIER dato histórico disponible.

INSTRUCCIÓN:
1. BUSCA EN GOOGLE:
   - "${isin} valores liquidativos historicos"
   - "${isin} historical net asset value"
   - "${isin} cierre mensual"
   - "site:bankinter.com ${isin}"
2. IMPORTANTE: Tu meta es reconstruir el HISTORIAL MENSUAL. Busca específicamente los valores de "Fin de Mes" (30/31) de los últimos 2 a 3 años.

REGLAS DE EXTACCIÓN:
- ACTUAL: El más reciente encontrado (hoy/ayer).
- HISTORIAL: Prioriza sacar 1 dato por mes (el último disponible de ese mes). TODOS los meses posibles de los últimos 24.
- Si encuentras una tabla con datos diarios, saca solo el último de cada mes y el actual.

SALIDA JSON ESTRICTA:
{
  "current": { 
      "nav": number, 
      "date": "YYYY-MM-DD",
      "currency": "ISO_CODE",
      "is_real_time": boolean
  },
  "history": [ 
      { "date": "YYYY-MM-DD", "nav": number }
      // SOLO incluir días con datos encontrados. NO generar entradas con null.
  ]
}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Raw Gemini response:", text);

        // Clean up markdown
        let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Find the first '{' and the last '}' to extract the JSON object
        const firstOpen = jsonString.indexOf('{');
        const lastClose = jsonString.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1) {
            jsonString = jsonString.substring(firstOpen, lastClose + 1);
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse:", jsonString);
            return NextResponse.json({
                error: "Invalid response from AI",
                debug: text.substring(0, 200)
            }, { status: 422 });
        }

        return NextResponse.json({
            nav: parsed.current?.nav,
            date: parsed.current?.date || new Date().toISOString().split('T')[0],
            currency: parsed.current?.currency,
            is_real_time: parsed.current?.is_real_time,
            history: Array.isArray(parsed.history) ? parsed.history : [],
            debug: `Datapoint: ${parsed.current?.date} (${parsed.current?.is_real_time ? 'Live' : 'Delayed'}). History: ${parsed.history?.length || 0} pts`
        });

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
