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

        const prompt = `You are a financial data assistant. I need the NAV (Net Asset Value) and HISTORICAL PRICES for:
        ISIN: ${isin}
        Name: ${cleanName}
        
        STEP 1: Find the CURRENT NAV and date.
        STEP 2: Search specifically for "historical data", "precios históricos", "valor liquidativo histórico" or "historical performance" for this fund.
        Focus on finding monthly closing prices for years ${twoYearsAgo}, ${lastYear}, and ${year}.
        
        Look for data from reliable sources like Morningstar, Financial Times, Yahoo Finance, QueFondos, or similar.
        
        I need 1 data point per month for the last 24 months.
        
        Return JSON format:
        {
            "nav": <number>,
            "date": "YYYY-MM-DD",
            "history": [
                {"date": "YYYY-MM-DD", "nav": <number>},
                ...
            ]
        }
        
        CRITICAL: 
        - If you cannot find a full table, try to find at least the NAV from 1 year ago and 6 months ago.
        - If you find a chart, estimate the values.
        - "history" array MUST NOT be empty if any data is found.
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
            nav: typeof parsed.nav === 'string' ? parseFloat(parsed.nav.replace(',', '.')) : parsed.nav,
            date: parsed.date || new Date().toISOString().split('T')[0],
            history: Array.isArray(parsed.history) ? parsed.history : [],
            debug: `Found ${parsed.history?.length || 0} history points. Raw length: ${text.length}`
        });

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
