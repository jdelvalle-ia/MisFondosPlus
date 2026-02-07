"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Wallet,
    LineChart,
    Settings,
    PieChart,
    Menu,
    X,
    TrendingUp,
    Terminal,
    Sun,
    Moon
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { usePortfolio } from "@/context/PortfolioContext";

const menuItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Cartera", href: "/fondos", icon: Wallet },
    { name: "Análisis", href: "/analisis", icon: LineChart },
    { name: "Reportes", href: "/reportes", icon: PieChart },
    { name: "Configuración", href: "/configuracion", icon: Settings },
];

export const Sidebar = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const { toggleConsole, isConsoleOpen } = usePortfolio();
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Sync local state w/ actual class
        setIsDark(document.documentElement.classList.contains("dark"));
    }, []);

    const toggleTheme = () => {
        const root = document.documentElement;
        if (root.classList.contains("dark")) {
            root.classList.remove("dark");
            setIsDark(false);
        } else {
            root.classList.add("dark");
            setIsDark(true);
        }
    };

    return (
        <>
            {/* Mobile Trigger */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <Button variant="outline" size="icon" onClick={() => setIsOpen(!isOpen)} className="bg-background/80 backdrop-blur">
                    {isOpen ? <X /> : <Menu />}
                </Button>
            </div>

            {/* Sidebar Container */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col p-6">
                    <div className="flex items-center gap-3 mb-10 px-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-primary/20">
                            <TrendingUp className="text-primary-foreground w-5 h-5" />
                        </div>
                        <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            MisFondos+
                        </span>
                    </div>

                    <nav className="space-y-2 flex-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                                        isActive
                                            ? "bg-primary/10 text-primary shadow-sm"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                    )} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-auto space-y-4">
                        {/* Controls */}
                        <div className="flex gap-2 justify-center">
                            <Button
                                variant={isConsoleOpen ? "default" : "outline"}
                                size="sm"
                                className="w-full text-xs gap-2 justify-center"
                                onClick={toggleConsole}
                            >
                                <Terminal className="w-3 h-3" />
                                Consola sistema
                            </Button>
                        </div>

                        <div className="flex justify-center">
                            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground w-full flex gap-2 justify-center px-4">
                                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                <span className="text-sm font-medium">{isDark ? "Modo Claro" : "Modo Oscuro"}</span>
                            </Button>
                        </div>

                        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-4 rounded-xl border border-primary/10 text-center">
                            <p className="text-xs font-medium text-primary mb-1">Status: Premium</p>
                            <p className="text-[10px] text-muted-foreground">Sistema actualizado - v1.0.5</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
};
