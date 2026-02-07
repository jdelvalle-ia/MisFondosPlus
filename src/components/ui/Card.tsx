import { cn } from "@/lib/utils";
import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: "default" | "glass" | "outline";
}

export const Card = ({ children, className, variant = "default", ...props }: CardProps) => {
    return (
        <div
            className={cn(
                "rounded-2xl p-6 transition-all duration-300",
                variant === "default" && "bg-card text-card-foreground shadow-sm border border-border/50",
                variant === "glass" && "bg-background/60 backdrop-blur-xl border border-white/10 shadow-lg",
                variant === "outline" && "bg-transparent border border-dashed border-border text-muted-foreground",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight text-foreground/90", className)} {...props}>
        {children}
    </h3>
);

export const CardDescription = ({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
        {children}
    </p>
);

export const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("", className)} {...props}>
        {children}
    </div>
);
