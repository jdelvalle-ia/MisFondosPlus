import { IFondo } from "@/types";

/**
 * Helper to safely parse NAV values that might be strings with commas or currency symbols.
 */
function parseNavValue(val: any): number | null {
    if (typeof val === 'number') return val;
    if (!val) return null;

    // Convert to string and clean up
    let s = String(val).trim();

    // Remove currency symbols and common non-numeric chars except . and ,
    // Keep digits, dots, commas, headers
    s = s.replace(/[^\d.,-]/g, '');

    // Handle comma as decimal separator if it looks like European format (e.g. "1.234,56" or just "123,45")
    // If there is a comma and NO dot, or the comma is after the dot, treat comma as decimal.
    if (s.includes(',') && (!s.includes('.') || s.indexOf(',') > s.indexOf('.'))) {
        // Remove dots (thousands separators)
        s = s.replace(/\./g, '');
        // Replace comma with dot
        s = s.replace(',', '.');
    } else {
        // Standard format, just remove commas if they are thousands separators
        s = s.replace(/,/g, '');
    }

    const num = Number(s);
    return isNaN(num) ? null : num;
}

/**
 * Updates a fund object with data received from the /api/nav endpoint.
 * Handles NAV update, date normalization, and history merging/limiting.
 * 
 * @param fondo The existing fund object to update (will be mutated)
 * @param apiData The data returned by the API
 * @returns Object with success status and a stats message for logging
 */
export function updateFundWithApiData(fondo: IFondo, apiData: any): { success: boolean; stats?: string } {
    if (!apiData || !apiData.nav) return { success: false };

    // 1. Update Current NAV
    const currentNav = parseNavValue(apiData.nav);
    if (currentNav !== null) {
        fondo.NAV_actual = currentNav;
        fondo.fecha_NAV = apiData.date || new Date().toISOString().split('T')[0];
        fondo.is_real_time = apiData.is_real_time;
        fondo.last_updated_source = "Google/Gemini";
    }

    let historyValidAdded = 0;
    let historyTotalFromApi = 0;

    // 2. Process History
    if (apiData.history && Array.isArray(apiData.history) && apiData.history.length > 0) {
        if (!fondo.historial) fondo.historial = [];

        historyTotalFromApi = apiData.history.length;

        // Map and normalize API history points
        const validNewPoints: { fecha: string; valor: number }[] = [];

        apiData.history.forEach((h: any) => {
            const rawVal = h.nav || h.value || h.close || h.price;
            const val = parseNavValue(rawVal);

            if (val === null) {
                return;
            }

            const hDate = new Date(h.date);
            const now = new Date();
            const isCurrentMonth = hDate.getMonth() === now.getMonth() && hDate.getFullYear() === now.getFullYear();

            let dateStr = h.date;

            // Normalize past dates to End of Month if not already
            if (!isCurrentMonth) {
                const endOfHMonth = new Date(hDate.getFullYear(), hDate.getMonth() + 1, 0);
                endOfHMonth.setHours(12, 0, 0, 0);
                dateStr = endOfHMonth.toISOString().split('T')[0]; // Use YYYY-MM-DD
            }

            validNewPoints.push({
                fecha: dateStr,
                valor: val * fondo.participaciones
            });
        });

        // Merge Strategy: Key by FULL DATE (YYYY-MM-DD) to support intra-year points
        const contentMap = new Map<string, any>();

        // 1. Load existing history into map
        if (fondo.historial) {
            fondo.historial.forEach(h => {
                const d = h.fecha.split('T')[0];
                contentMap.set(d, h);
            });
        }

        // 2. Overwrite/Add with API history
        validNewPoints.forEach((p) => {
            const d = p.fecha.split('T')[0];
            // Update or Add
            contentMap.set(d, p);
            historyValidAdded++;
        });

        // 3. Convert back to array
        let mergedHistory = Array.from(contentMap.values());

        // 4. Sort Ascending (Old -> New)
        mergedHistory.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        // 5. Slice to max 36 (increased from 24 to allow denser history)
        if (mergedHistory.length > 36) {
            fondo.historial = mergedHistory.slice(-36);
        } else {
            fondo.historial = mergedHistory;
        }
    }

    // 3. Ensure Current NAV is represented in History
    if (fondo.NAV_actual && fondo.fecha_NAV) {
        if (!fondo.historial) fondo.historial = [];

        const latestDate = fondo.fecha_NAV.split('T')[0];
        const existingIdx = fondo.historial.findIndex(h => h.fecha.startsWith(latestDate));
        const currentVal = fondo.NAV_actual * fondo.participaciones;

        if (existingIdx >= 0) {
            fondo.historial[existingIdx] = { fecha: fondo.fecha_NAV, valor: currentVal };
        } else {
            fondo.historial.push({ fecha: fondo.fecha_NAV, valor: currentVal });
        }

        // Re-sort and re-slice just in case
        fondo.historial.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        if (fondo.historial.length > 36) fondo.historial = fondo.historial.slice(-36);
    }

    return {
        success: true,
        stats: `NAV: ${fondo.NAV_actual} (${fondo.fecha_NAV}) | Hist: ${fondo.historial?.length || 0} pts (API: ${historyValidAdded} valid / ${historyTotalFromApi} raw)`
    };
}
