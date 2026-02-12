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
        // Use gemini-2.0-flash
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [{ googleSearch: {} } as any]
        });

        const today = new Date();
        const endDateStr = today.toISOString().split('T')[0];
        // Calculate start date (24 months ago)
        const startDate = new Date();
        startDate.setMonth(today.getMonth() - 24);
        const startDateStr = startDate.toISOString().split('T')[0];

        // --- HYBRID MERGE PROMPT ---
        const prompt = `Busca el historial detallado del valor liquidativo en Investing.com o Morningstar del fondo ${isin} - ${name} y crea una tabla con los valores de fin de cada mes desde ${startDateStr} hasta hoy (${endDateStr}).

INSTRUCCIONES CLAVE:
1.  INTENTA PRIMERO OBTENER LA TABLA COMPLETA DE PRECIOS HISTÓRICOS.
    Formato: Fecha ; Valor Liquidativo ; Divisa
    (Usa PUNTO para decimales. PROHIBIDO usar separador de miles. Ej: 1234.56)

2.  LUEGO, OBLIGATORIAMENTE, BUSCA LA RENTABILIDAD ANUAL ("Rentabilidad anual", "YTD", "1 año") Y GENERA SIEMPRE ESTE JSON AL FINAL DE TU RESPUESTA:

### JSON_START ###
{
  "current": { "nav": 1234.56, "date": "${endDateStr}", "currency": "EUR" },
  "annual_performance": { "ytd": 2.5, "2025": 10.5, "2024": 8.0 }
}
### JSON_END ###
`;

        // RETRY LOGIC
        let result;
        let attempt = 0;
        const maxRetries = 3;

        while (attempt < maxRetries) {
            try {
                result = await model.generateContent(prompt);
                break; // Success
            } catch (error: any) {
                if (error.status === 429) {
                    attempt++;
                    await sleep(attempt * 2000);
                } else {
                    throw error;
                }
            }
        }

        if (!result) throw new Error("Max retries exceeded");

        const response = await result.response;
        const text = response.text();
        console.log(`[DEBUG_GEMINI_RAW_START]${text}[DEBUG_GEMINI_RAW_END]`);

        let finalHistory: any[] = [];
        let currentNavData: any = null;
        let debugLogs: string[] = [];

        // --- STRATEGY 1: PARSE REAL TABLE POINTS ---
        const potentialLines = text.split('\n');
        const realPoints: any[] = [];

        for (const line of potentialLines) {
            const cleanLine = line.replace(/^\|/, '').replace(/\|$/, '').trim();
            if (!cleanLine || cleanLine.includes('---') || cleanLine.includes('JSON_START')) continue;

            // Regex for Date
            const dateMatch = cleanLine.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})|(\d{4}[\/\-]\d{2}[\/\-]\d{2})/);
            if (!dateMatch) continue;

            let dateStr = dateMatch[0];
            const remaining = cleanLine.replace(dateStr, '');

            // Find number (allowing dot as decimal)
            const valueMatch = remaining.match(/(\d{1,5}[.]\d{1,})/);
            let valStr = "";

            if (valueMatch) {
                valStr = valueMatch[0];
            } else {
                const looseMatch = remaining.match(/(\d[\d.,]*\d)/);
                if (looseMatch) valStr = looseMatch[0];
            }

            if (!valStr) continue;

            // Normalization
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts[0].length === 2 && parts[2].length === 4) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                else if (parts[0].length === 4) dateStr = `${parts[0]}-${parts[1]}-${parts[2]}`;
            } else if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts[0].length === 2 && parts[2].length === 4) dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }

            // Clean value
            if (valStr.includes(',') && valStr.includes('.')) {
                if (valStr.indexOf(',') > valStr.indexOf('.')) {
                    valStr = valStr.replace(/\./g, '').replace(',', '.');
                } else {
                    valStr = valStr.replace(/,/g, '');
                }
            } else if (valStr.includes(',')) {
                valStr = valStr.replace(',', '.');
            }
            if ((valStr.match(/\./g) || []).length > 1) {
                valStr = valStr.replace(/\./g, '');
            }

            const nav = parseFloat(valStr);
            if (!isNaN(nav)) {
                realPoints.push({
                    date: dateStr,
                    nav: nav,
                    currency: cleanLine.toUpperCase().includes('USD') ? 'USD' : 'EUR',
                    is_synthetic: false
                });
            }
        }

        // --- STRATEGY 2: PARSE SYNTHETIC JSON ---
        let syntheticAnchors: any[] = [];
        let parsedJson: any = {};

        let jsonString = "";
        const jsonStart = text.indexOf("### JSON_START ###");
        const jsonEnd = text.indexOf("### JSON_END ###");

        if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonString = text.substring(jsonStart + "### JSON_START ###".length, jsonEnd).trim();
        } else {
            const firstOpen = text.lastIndexOf('{'); // Try last JSON object if multiple
            const lastClose = text.lastIndexOf('}');
            if (firstOpen !== -1 && lastClose !== -1) jsonString = text.substring(firstOpen, lastClose + 1);
        }

        try {
            if (jsonString) parsedJson = JSON.parse(jsonString);
        } catch (e) {
            console.error("[DEBUG] JSON Parse failed:", e);
        }

        if (parsedJson.current) {
            currentNavData = parsedJson.current;
            const annualPerf = parsedJson.annual_performance || {};
            const currentYear = new Date().getFullYear();

            // Generate Synthetic Anchors
            if (currentNavData?.nav && Object.keys(annualPerf).length > 0) {
                const currentNav = parseFloat(currentNavData.nav);

                const addAnchor = (dateStr: string, navVal: number) => {
                    syntheticAnchors.push({ date: dateStr, nav: parseFloat(navVal.toFixed(2)), is_synthetic: true });
                };

                const shortTermPeriods = [
                    { key: '1m', days: 30 },
                    { key: '3m', days: 90 },
                    { key: '6m', days: 180 },
                    { key: '1y', days: 365 },
                    { key: '1 año', days: 365 },
                    { key: '3y', days: 365 * 3 }
                ];

                shortTermPeriods.forEach(period => {
                    const key = Object.keys(annualPerf).find(k => k.toLowerCase().includes(period.key));
                    if (key && !isNaN(parseFloat(annualPerf[key]))) {
                        const retVal = parseFloat(annualPerf[key]);
                        const pastDate = new Date();
                        pastDate.setDate(pastDate.getDate() - period.days);
                        const past = currentNav / (1 + retVal / 100);
                        addAnchor(pastDate.toISOString().split('T')[0], past);
                    }
                });

                // Yearly
                let rollingNav = currentNav;
                const ytdKey = Object.keys(annualPerf).find(k => k.toLowerCase().includes('ytd'));
                if (ytdKey) {
                    const ret = parseFloat(annualPerf[ytdKey]);
                    rollingNav = currentNav / (1 + ret / 100);
                    addAnchor(`${currentYear - 1}-12-31`, rollingNav);
                }

                for (let y = currentYear - 1; y >= currentYear - 3; y--) {
                    let key = Object.keys(annualPerf).find(k => k.includes(String(y)) && !k.toLowerCase().includes('ytd'));
                    if (key) {
                        const ret = parseFloat(annualPerf[key]);
                        rollingNav = rollingNav / (1 + ret / 100);
                        addAnchor(`${y - 1}-12-31`, rollingNav);
                    }
                }
            }
        }

        // --- MERGE & INTERPOLATION ---
        // 1. Combine Real + Synthetic Anchors
        let combined = [...realPoints, ...syntheticAnchors];

        // 2. Add Current NAV as anchor
        if (currentNavData) {
            combined.push({
                date: currentNavData.date,
                nav: parseFloat(currentNavData.nav),
                currency: currentNavData.currency,
                is_synthetic: false
            });
        }

        // 3. Sort by Date Asc
        combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 4. SANITY CHECK (Outlier Drop Strategy)
        if (combined.length > 0) {
            let refNav = currentNavData ? parseFloat(currentNavData.nav) : 0;
            if (!refNav && combined.length > 0) {
                const sortedNavs = combined.map(p => p.nav).sort((a, b) => a - b);
                refNav = sortedNavs[Math.floor(sortedNavs.length / 2)];
            }

            if (refNav > 0) {
                const filtered = [];
                for (const p of combined) {
                    if (p.nav >= refNav * 0.2 && p.nav <= refNav * 5.0) {
                        filtered.push(p);
                    } else {
                        debugLogs.push(`Dropped Outlier: ${p.date} (${p.nav}) vs Ref (${refNav})`);
                    }
                }
                combined = filtered;
            }
        }

        // 5. Dedupe
        const uniquePoints: any[] = [];
        const seenMonths = new Set();

        // Iterate backwards from newest
        for (let i = combined.length - 1; i >= 0; i--) {
            const p = combined[i];
            const d = new Date(p.date);
            const k = `${d.getFullYear()}-${d.getMonth()}`;
            if (!seenMonths.has(k)) {
                seenMonths.add(k);
                uniquePoints.unshift(p);
            } else {
                // Prefer Real
                const existingIndex = uniquePoints.findIndex(up => {
                    const ud = new Date(up.date);
                    return `${ud.getFullYear()}-${ud.getMonth()}` === k;
                });
                if (existingIndex !== -1 && !p.is_synthetic && uniquePoints[existingIndex].is_synthetic) {
                    uniquePoints[existingIndex] = p;
                }
            }
        }

        // 6. Interpolation (Bug Fix: Last Day of Month)
        finalHistory = [];
        uniquePoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort Asc for interpolation

        if (uniquePoints.length > 1) {
            for (let i = 0; i < uniquePoints.length - 1; i++) {
                const p1 = uniquePoints[i];
                const p2 = uniquePoints[i + 1];

                finalHistory.push(p1);

                const d1 = new Date(p1.date);
                const d2 = new Date(p2.date);

                // Start iterating from next month
                // Use robust "Last Day of Month" targeting
                // Start month index
                let currentMonthIndex = d1.getMonth() + 1; // Month AFTER p1
                let currentYear = d1.getFullYear();

                // Loop until we hit d2's month
                while (true) {
                    // Calculate "Last Day" of current target month
                    // new Date(y, m+1, 0) gives last day of month 'm'
                    const nextTargetDate = new Date(currentYear, currentMonthIndex + 1, 0);

                    // Stop if we've reached or passed d2's month
                    // Check if Target Year > d2 Year OR (Same Year AND Target Month >= d2 Month)
                    if (nextTargetDate >= d2) break; // Should be strictly less if we want points BETWEEN p1 and p2?

                    // Check if nextTargetDate is strictly less than d2. 
                    // AND strictly greater than d1 (which it is by calc)
                    if (nextTargetDate < d2) {
                        const totalTime = d2.getTime() - d1.getTime();
                        const currentTime = nextTargetDate.getTime() - d1.getTime();
                        const ratio = currentTime / totalTime;

                        const interpolatedNav = p1.nav + (p2.nav - p1.nav) * ratio;

                        finalHistory.push({
                            date: nextTargetDate.toISOString().split('T')[0],
                            nav: parseFloat(interpolatedNav.toFixed(2)),
                            is_synthetic: true
                        });
                    }

                    // Advance month
                    currentMonthIndex++;
                    if (currentMonthIndex > 11) {
                        currentMonthIndex = 0;
                        currentYear++;
                    }
                }
            }
            finalHistory.push(uniquePoints[uniquePoints.length - 1]);
        } else {
            finalHistory = uniquePoints;
        }

        finalHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const debugString = `Pts: ${finalHistory.length} (Real: ${realPoints.length}, SynAnchors: ${syntheticAnchors.length}). ` + debugLogs.join(' | ');

        return NextResponse.json({
            nav: currentNavData?.nav || null,
            date: currentNavData?.date || endDateStr,
            currency: currentNavData?.currency || "EUR",
            is_real_time: false,
            history: finalHistory.slice(0, 36),
            debug: debugString
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({
            nav: null,
            history: [],
            error: "Failed to fetch data",
            debug: error.message
        }, { status: 200 });
    }
}
