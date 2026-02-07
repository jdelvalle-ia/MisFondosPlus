import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Use Inter for clean detailed financial UI
import "./globals.css";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { AuditConsole } from "@/components/common/AuditConsole";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MisFondos+ | Gestión de Carteras",
  description: "Plataforma profesional de gestión de activos y análisis de inversiones.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary flex`}>
        <PortfolioProvider>
          <Sidebar />
          <main className="flex-1 md:ml-64 min-h-screen transition-all duration-300">
            {children}
          </main>
          <AuditConsole />
        </PortfolioProvider>
      </body>
    </html>
  );
}
