import { FundDetailContent } from "@/components/funds/FundDetailContent";
import { use } from "react";

export default function FundDetailPage({ params }: { params: Promise<{ isin: string }> }) {
    // Unwrapping the Promise for safe usage in production Next.js 14+
    const { isin } = use(params);

    return (
        <main className="min-h-screen p-8 md:p-12 pb-20">
            <FundDetailContent isin={decodeURIComponent(isin)} />
        </main>
    )
}
