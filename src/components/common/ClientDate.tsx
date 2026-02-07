"use client";

import { useEffect, useState } from "react";

export const ClientDate = ({ date }: { date?: string }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return <span>-</span>;
    if (!date) return <span>-</span>;

    return <span>{new Date(date).toLocaleDateString()}</span>;
};
