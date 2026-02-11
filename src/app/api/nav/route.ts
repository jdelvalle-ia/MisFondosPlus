import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper for backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { isin, name } = body;

        const geminiKey = process.env.GOOGLE_GEMINI_API_KEY;

        if (!geminiKey) {
            return NextResponse.json({ error: "Missing GOOGLE_GEMINI_API_KEY" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(geminiKey);
        // Use gemini-1.5-flash for potentially better stability/quota, or stick to 2.0-flash-exp if needed
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Keeping 2.0 for best reasoning, but adding retries
            tools: [{ googleSearch: {} } as any]
        });

        const today = new Date().toISOString().split('T')[0];
        const year = new Date().getFullYear();
        const validDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        // Generate list of last 24 month-end dates to help Gemini focus
        const targetDates = [];
        for (let i = 0; i < 24; i++) {
            const d = new Date(year, new Date().getMonth() - i, 0); // Last day of previous months
            targetDates.push(d.toISOString().split('T')[0]);
        }
        const targetDatesStr = targetDates.slice(0, 6).join(", "); // Show first 6 as examples

        const prompt = `Eres un experto en reconstrucción de datos financieros. Hoy es: ${today}.
OBJETIVO: Obtener historial de precios para "${name}" (${isin}).

ESTRATEGIA 1: BÚSQUEDA DIRECTA Y PRECISA
Busca "tabla valores liquidativos ${name}", "historical data ${isin}", "cotización cierre 2024 ${name}".
Si encuentras datos mensuales reales de los últimos 24 meses, ÚSALOS.

ESTRATEGIA 2: RECUPERACIÓN DE RENTABILIDAD (Plan B - ESENCIAL)
Si no hay tablas, busca: "Rentabilidad anual ${name}" y "Rentabilidad 1 mes ${name}", "Rentabilidad 3 meses ${name}".
*   Necesito la rentabilidad acumulada de este año (YTD 2026) y la de los años completos 2025, 2024, 2023.
*   TAMBIÉN busca rentabilidades cortas: "1 Mes", "3 Meses", "6 Meses" para rellenar huecos recientes.
*   DEVUELVELAS en el campo 'annual_performance'.

IMPORTANTE: Responde con el JSON dentro de estos marcadores:
### JSON_START ###
{
  "current": { "nav": 123.45, "date": "YYYY-MM-DD", "currency": "EUR" },
  "history": [
      { "date": "2025-12-31", "nav": 123.45 }
  ],
  "annual_performance": {
      "ytd_2026": 2.5,
      "1m": 0.5,
      "3m": 1.2,
      "6m": 3.4,
      "2025": 12.5,
      "2024": 8.2,
      "2023": -4.1
  },
  "debug_reason": "Encontré rentabilidad YTD y anuales en Morningstar"
}
### JSON_END ###
`;

        // RETRY LOGIC FOR GOOGLE 429
        let result;
        let attempt = 0;
        const maxRetries = 3;

        while (attempt < maxRetries) {
            try {
                result = await model.generateContent(prompt);
                break; // Success
            } catch (error: any) {
                if (error.message?.includes('429') || error.status === 429) {
                    attempt++;
                    console.warn(`Gemini 429 Error (Attempt ${attempt}/${maxRetries}). Retrying in ${attempt * 2}s...`);
                    if (attempt >= maxRetries) throw error; // Give up
                    await sleep(attempt * 2000); // Backoff: 2s, 4s, 6s...
                } else {
                    throw error; // Other errors: fail immediately
                }
            }
        }

        if (!result) throw new Error("Max retries exceeded");

        const response = await result.response;
        const text = response.text();
        console.log("Raw Gemini response:", text);

        // Robust JSON extraction using delimiters
        let jsonString = "";
        const startMarker = "### JSON_START ###";
        const endMarker = "### JSON_END ###";
        const startIndex = text.indexOf(startMarker);
        const endIndex = text.indexOf(endMarker);

        if (startIndex !== -1 && endIndex !== -1) {
            jsonString = text.substring(startIndex + startMarker.length, endIndex).trim();
        } else {
            // Fallback to finding braces if markers are missing
            const firstOpen = text.indexOf('{');
            const lastClose = text.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) {
                jsonString = text.substring(firstOpen, lastClose + 1);
            }
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse:", jsonString);
            // Fallback: don't crash, just return empty
            return NextResponse.json({
                nav: null,
                date: new Date().toISOString().split('T')[0],
                currency: "EUR",
                history: [],
                debug: "Failed to parse AI response: " + text.substring(0, 100)
            });
        }

        // --- POST-PROCESSING: Calculate Synthetic History if Needed ---
        let finalHistory = Array.isArray(parsed.history) ? parsed.history : [];
        const annualPerf = parsed.annual_performance || {};
        const currentYear = new Date().getFullYear();

        // If history is sparse using tables, try to synthesize points from returns
        if (finalHistory.length <= 4 && parsed.current?.nav && Object.keys(annualPerf).length > 0) {
            const currentNav = parseFloat(parsed.current.nav);

            // 0. Calculate Short Term History (1m, 3m, 6m)
            const shortTermPeriods = [
                { key: '1m', days: 30 },
                { key: '3m', days: 90 },
                { key: '6m', days: 180 }
            ];

            shortTermPeriods.forEach(period => {
                // Try to find key like "1m", "1_mes", "1month"
                const key = Object.keys(annualPerf).find(k => k.toLowerCase().includes(period.key));
                if (key && !isNaN(parseFloat(annualPerf[key]))) {
                    const retVal = parseFloat(annualPerf[key]);
                    const pastDate = new Date();
                    pastDate.setDate(pastDate.getDate() - period.days);
                    const pastDateStr = pastDate.toISOString().split('T')[0];

                    // Calculate Price: Current / (1 + Return)
                    const pastNav = currentNav / (1 + retVal / 100);

                    if (!finalHistory.find((h: any) => h.date === pastDateStr)) {
                        finalHistory.push({
                            date: pastDateStr,
                            nav: parseFloat(pastNav.toFixed(2)),
                            is_synthetic: true
                        });
                        console.log(`Synthesized ${period.key} NAV: ${pastNav} (${pastDateStr}) from ${retVal}%`);
                    }
                }
            });

            // 1. Calculate Start of Current Year (End of Previous Year) using YTD (if available)
            const ytdKey = Object.keys(annualPerf).find(k => k.toLowerCase().includes('ytd'));
            let lastYearEndNav = null;

            if (ytdKey && !isNaN(parseFloat(annualPerf[ytdKey]))) {
                const ytdVal = parseFloat(annualPerf[ytdKey]);
                lastYearEndNav = currentNav / (1 + ytdVal / 100);

                // Add Dec 31 of last year (e.g., 2025-12-31)
                if (!finalHistory.find((h: any) => h.date === `${currentYear - 1}-12-31`)) {
                    finalHistory.push({
                        date: `${currentYear - 1}-12-31`,
                        nav: parseFloat(lastYearEndNav.toFixed(2)),
                        is_synthetic: true
                    });
                }
                console.log(`Synthesized End of ${currentYear - 1} NAV: ${lastYearEndNav} from YTD ${ytdVal}%`);
            }

            // 2. Chain backwards for previous years (2025 -> 2024 -> 2023)
            if (!lastYearEndNav) {
                // Try to find "End of Last Year" in existing history
                const existingPoint = finalHistory.find((h: any) => h.date === `${currentYear - 1}-12-31`);
                if (existingPoint) lastYearEndNav = existingPoint.nav;
            }

            // Loop back 3 years
            let rollingNav = lastYearEndNav;
            let rollingYear = currentYear - 1;

            if (rollingNav) {
                for (let y = rollingYear; y >= currentYear - 3; y--) {
                    // To get End of (y-1), we need Return of (y)
                    const returnKey = Object.keys(annualPerf).find(k => k.includes(String(y)) && !k.toLowerCase().includes('ytd'));

                    if (returnKey && !isNaN(parseFloat(annualPerf[returnKey]))) {
                        const retVal = parseFloat(annualPerf[returnKey]);
                        const prevYearEndNav = rollingNav / (1 + retVal / 100);

                        if (!finalHistory.find((h: any) => h.date === `${y - 1}-12-31`)) {
                            finalHistory.push({
                                date: `${y - 1}-12-31`,
                                nav: parseFloat(prevYearEndNav.toFixed(2)),
                                is_synthetic: true
                            });
                        }
                        rollingNav = prevYearEndNav;
                        console.log(`Synthesized End of ${y - 1} NAV: ${prevYearEndNav} from ${y} return ${retVal}%`);
                    } else {
                        break; // Broken chain
                    }
                }
            }
        }

        // --- STANDARD VALIDATION ---

        // 1. Normalize and Filter (Same as before)
        finalHistory = finalHistory.map((h: any) => {
            let val = h.nav;
            if (typeof val === 'string') {
                val = parseFloat(val.replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
            }
            return { ...h, nav: val };
        }).filter((h: any) => {
            if (!h.date || !validDateRegex.test(h.date)) return false;
            // Allow synthetic flag to pass
            if (typeof h.nav !== 'number' || isNaN(h.nav)) return false;
            return h.date <= today;
        });

        // 2. Sort descending
        finalHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 3. Deduplicate
        const seenMonths = new Set();
        const dedupedHistory: any[] = [];
        for (const h of finalHistory) {
            const monthKey = h.date.substring(0, 7);
            if (!seenMonths.has(monthKey)) {
                seenMonths.add(monthKey);
                dedupedHistory.push(h);
            }
        }

        // 5. Slice
        const slicedHistory = dedupedHistory.slice(0, 24);

        console.log(`Processed History: ${slicedHistory.length} items found.`);

        return NextResponse.json({
            nav: parsed.current?.nav,
            date: parsed.current?.date || new Date().toISOString().split('T')[0],
            currency: parsed.current?.currency,
            is_real_time: parsed.current?.is_real_time,
            history: slicedHistory,
            debug: `Found ${slicedHistory.length} points. AI Debug: ${parsed.debug_reason}`
        });

    } catch (error: any) {
        console.error("API Error:", error);
        // Return safe error
        return NextResponse.json({
            nav: null,
            history: [],
            error: "Failed to fetch data",
            debug: error.message
        }, { status: 200 }); // Return 200 to avoiding crashing UI with red box, just show empty
    }
}
