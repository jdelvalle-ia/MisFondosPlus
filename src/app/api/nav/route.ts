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

        const prompt = `Eres un analista de datos financieros experto. Tu prioridad es localizar el ÚLTIMO Valor Liquidativo (NAV) disponible, sea cual sea su fecha.

INSTRUCCIÓN:
Busca y extrae el NAV más reciente publicado para este fondo:
Nombre: ${cleanName}
ISIN: ${isin}

REGLAS DE BÚSQUEDA:
1. PRIORIDAD: Busca primero datos de hoy o ayer. Si no existen, retrocede hasta encontrar el último cierre oficial disponible.
2. VALIDACIÓN: Asegúrate de que el dato corresponde a este ISIN específico.
3. MONEDA: Detecta la divisa del NAV (EUR, USD, etc.).
4. HISTORIAL: Genera una serie de los últimos 24 meses (1 punto por mes).

SALIDA JSON:
{
  "current": { 
      "nav": number, 
      "date": "YYYY-MM-DD",     // Fecha del dato encontrado
      "currency": "ISO_CODE",   // Moneda detectada
      "is_real_time": boolean   // true si la fecha es hoy/ayer, false si es más antiguo
  },
  "history": [ 
      { "date": "YYYY-MM-DD", "nav": number },
      ...
  ]
}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown
        let jsonString = text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonString = jsonMatch[0];

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
            debug: `Found ${parsed.history?.length || 0} history points. Real-time: ${parsed.current?.is_real_time}`
        });

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
