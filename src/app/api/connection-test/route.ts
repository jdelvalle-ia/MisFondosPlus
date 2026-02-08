import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST() {
    try {
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Falta la variable de entorno GOOGLE_GEMINI_API_KEY" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Minimal generation to test connectivity and quota
        try {
            const result = await model.generateContent("Ping");
            await result.response;
        } catch (apiError: any) {
            console.error("Gemini API Verification Error:", apiError);
            return NextResponse.json(
                { error: `Error conectando con Google AI: ${apiError.message || "Unknown error"}` },
                { status: 502 }
            );
        }

        return NextResponse.json({ status: "ok", message: "Conexión exitosa" });

    } catch (error: any) {
        console.error("Connection Test Internal Error:", error);
        return NextResponse.json(
            { error: error.message || "Error interno del servidor" },
            { status: 500 }
        );
    }
}
